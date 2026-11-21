# 第 08 章 · 手写 Agent 循环（ReAct）

> 📋 **本章目标**
> 1. 能说清 Agent 与工作流/单轮工具调用的本质区别（高频面试题）
> 2. 手写一个完整的最小 Agent Loop：目标驱动、自主决策、显式终止、轨迹记录，并正确处理并行工具调用
> 3. 掌握 Agent 的四大安全阀：步数上限、循环检测、预算熔断、超时
> 4. 用 FakeModel 写离线测试，确定、零成本地验证每一种失败路径
> 5. 理解 ReAct / Plan-and-Execute / Reflexion 三篇论文，并徒手实现后两者
> 6. 建立「执行轨迹」意识——调试与评测都靠它
>
> 前置知识：第 07 章（工具调用六步流程、`lib/model.ts` 的 `ChatModel`）、第 04 章（`structured()`）｜预计用时：10-14 小时
>
> **配套代码**：`code/src/agent/loop.ts`、`code/src/lib/model.ts`（`FakeModel`），离线测试 `code/test/agent-loop.test.ts`。
>
> **岗位依据**：易京 JD 原话「读过 ReAct / Plan-and-Execute / Reflexion 论文且能讲清楚」；DeepSeek Agent Harness 岗要求「own 完整 agentic loop」。**本章你亲手拥有（own）一个**。学完本章再看第 10 章的框架，一切魔法都会还原为「我写过这个东西的裸机版」。

---

## 8.1 Agent 到底是什么（先杀死神秘感）

行业共识公式（调研里 DeepSeek/字节 JD 的表述）：**Agent = LLM + 工具 + 循环 + 终止条件**。

对比三个层次，看清「循环」带来的质变：

```
单次调用：    用户问 → 模型答                     （一问一答）
工具调用：    用户问 → 模型调工具 → 得结果 → 答    （一问一答，中间动了手）
Agent：       用户给目标 → 模型自主决定每一步：
              查这个 → 看到结果 → 该查那个 → 算一下 → 信息够了 → 交报告
              （多少步、每步干什么，由模型在执行中决定）
```

**工作流 vs Agent 的边界**（附录 A 第 6 题的标准答案骨架）：工作流的控制流写死在代码里（`步骤A(); 步骤B(); if(x) 步骤C()`），LLM 只是某些步骤里的「智能节点」；Agent 的控制流由模型在运行中决定，代码只提供工具和边界。推论：

- 能预先画出流程图的 → 工作流（可预测、便宜、好测）
- 分支依赖执行中才知道的信息 → Agent（灵活、贵、难测）
- **生产系统的常态：工作流为骨、局部 Agent 为肉**

## 8.2 ReAct：一切 Agent 循环的源头

**ReAct**（Yao et al., 2022, [arXiv:2210.03629](https://arxiv.org/abs/2210.03629)）= **Rea**soning + **Act**ing：让模型在「思考」与「行动」间交替。

```
Thought: 用户想知道竞品 X 的定价，我需要先查它的官网
Action: fetchPage("https://x.com/pricing")
Observation: 页面显示三种套餐 $10/$29/$99
Thought: 拿到了。用户还问有没有免费层——页面没提，再搜一下
Action: search("X free tier 2026")
Observation: 有免费层，限 3 个项目
Thought: 两个信息都齐了，可以回答了
Final Answer: X 定价 $10/$29/$99 三档，另有免费层（限 3 项目）……
```

论文的洞见：**推理（想清楚为什么做）与行动（做了之后看结果）交替，比纯推理（空想）或纯行动（瞎试）都强**。你在第 7 章写的工具循环其实就是它的隐式版本；本章把它显式化并补全 Agent 的全部要件。

> 现代实现里 Thought 通常不再要求单独输出（模型在决定 tool_calls 时内部已完成推理），但「轨迹 = 思考+行动+观察 的序列」这个心智模型不变——后面所有框架的 trace 都长这样。

## 8.3 手写最小 Agent Loop（本章核心）

在第 7 章代码上加五个 Agent 要件：**显式终止工具、步数上限、预算熔断、循环检测、轨迹记录**，外加单工具超时。还有两处和第 7 章不同：模型通过 `model: ChatModel` 参数注入（第 7 章 7.4 建的接缝），以及一个可选的 `authorize` 权限钩子（第 18 章接上）。

先补一个前置文件。`runAgent` 的权限钩子要用第 18 章权限层的返回类型 `AuthDecision`，现在先只放类型，第 18 章再补全实现：

```ts
// security/permissions.ts（节选）—— 先放类型，第 18 章补全 authorize() 实现
export type AuthDecision =
  | { allowed: true }
  | { allowed: false; needConfirm?: boolean; reason: string };
```

完整代码：`code/src/security/permissions.ts`

核心循环（约 150 行，Agent 的完整骨架）：

```ts
// agent/loop.ts —— 最小 Agent Loop（第 08 章 8.3）
// 五个要件：显式终止工具、步数上限、预算熔断、循环检测、轨迹记录；外加单工具超时。
import { z } from "zod";
import { toOpenAITools, type ToolDef } from "../lib/ai";
import { openAIModel, type ChatModel, type Msg } from "../lib/model";
import type { AuthDecision } from "../security/permissions";

// ── 要件①：显式终止工具 ──
// 「我认为任务完成」也是一次工具调用：比猜 finish_reason 更可控，还能强制提交结构化产物。
const FinishArgs = z.object({
  status: z.enum(["done", "blocked"]),
  answer: z.string().describe("给用户看的最终答案"),
});
export const finishTool: ToolDef<typeof FinishArgs> = {
  name: "finish",
  description:
    "任务完成时调用，提交最终答案。调用后循环结束。若信息不足也调用它，并在 status 里说明 blocked 与原因。",
  parameters: FinishArgs,
  execute: async () => ({ ok: true }), // 不真正执行，由循环拦截
};

export interface AgentConfig {
  goal: string;
  tools: ToolDef<any>[];
  model?: ChatModel;          // 默认真实模型；测试时注入 FakeModel
  maxSteps?: number;          // 要件②：步数上限（默认 8）
  maxBudgetTokens?: number;   // 要件③：预算熔断，按 total_tokens 累计（默认 60K）
  toolTimeoutMs?: number;     // 单个工具超时（默认 15s）
  signal?: AbortSignal;       // 用户取消
  /** 第 18 章权限层：schema 校验通过之后、执行之前调用；不传则不做授权（仅限只读演示） */
  authorize?: (toolName: string, validArgs: unknown) => AuthDecision | Promise<AuthDecision>;
}

export interface StepLog {    // 要件④：轨迹（每个工具调用一条）
  step: number;
  thought?: string;
  action: string;
  args: unknown;
  result: unknown;
  ms: number;
}

export type AgentResult =
  | { status: "done" | "blocked"; answer: string; trajectory: StepLog[]; stepsUsed: number; tokensUsed: number }
  | { status: "max_steps" | "budget_exceeded" | "no_progress"; trajectory: StepLog[]; stepsUsed: number; tokensUsed: number };

/** 给任意 Promise 加超时；超时后通过 AbortController 通知工具停止 */
export async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ac = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ac.abort();
      reject(new Error(`工具执行超时（>${ms}ms）`));
    }, ms);
  });
  try {
    return await Promise.race([run(ac.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM = (goal: string) => `你是一个任务执行 Agent。目标：${goal}
规则：1) 每步选择最有助于达成目标的工具；2) 工具结果不满意可以换方式重试，但禁止重复完全相同的调用；
3) 信息足够后立即调用 finish 提交答案，不要过度执行；4) 无法完成时调用 finish 并说明原因。`;

export async function runAgent(cfg: AgentConfig): Promise<AgentResult> {
  const model = cfg.model ?? openAIModel();
  const tools = [...cfg.tools, finishTool];
  const toolSpecs = toOpenAITools(tools);
  const registry = new Map(tools.map((t) => [t.name, t]));
  const maxSteps = cfg.maxSteps ?? 8;
  const maxBudget = cfg.maxBudgetTokens ?? 60_000;
  const toolTimeoutMs = cfg.toolTimeoutMs ?? 15_000;

  const trajectory: StepLog[] = [];
  const seenActions = new Set<string>();   // 要件⑤：循环检测
  let tokensUsed = 0;
  let nudged = false;
  const messages: Msg[] = [{ role: "system", content: SYSTEM(cfg.goal) }];

  for (let step = 1; step <= maxSteps; step++) {
    cfg.signal?.throwIfAborted();
    const { message: msg, usage } = await model.complete({
      messages, tools: toolSpecs, maxTokens: 1024, signal: cfg.signal,
    });
    tokensUsed += usage.total;              // 输入（含累积的工具结果）往往才是大头，所以算 total
    if (tokensUsed > maxBudget) {
      return { status: "budget_exceeded", trajectory, stepsUsed: step, tokensUsed };
    }

    const calls = (msg.tool_calls ?? []).filter((c) => c.type === "function");
    if (calls.length === 0) {
      // 模型没调工具直接说话：给一次机会拉回工作状态；再犯就体面地停下
      if (nudged) return { status: "no_progress", trajectory, stepsUsed: step, tokensUsed };
      nudged = true;
      messages.push(msg, { role: "user", content: "请继续使用工具推进任务，或调用 finish 提交。" });
      continue;
    }

    // ⚠️ 关键：这条 assistant 消息可能含「多个」tool_calls（并行调用）。
    // 历史里放了它，就必须为其中「每一个」call.id 都回一条 role:"tool" 消息，否则下一轮 API 直接 400。
    messages.push(msg);

    for (const call of calls) {
      const t0 = Date.now();
      let args: unknown;
      let result: unknown;

      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        result = { error: "INVALID_JSON", message: "参数不是合法 JSON，请重新生成。" };
      }

      if (result === undefined && call.function.name === "finish") {
        const parsed = FinishArgs.safeParse(args);
        if (parsed.success) {
          return { ...parsed.data, trajectory, stepsUsed: step, tokensUsed };
        }
        result = { error: "INVALID_FINISH", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
      }

      if (result === undefined) {
        const fingerprint = `${call.function.name}:${JSON.stringify(args)}`;
        if (seenActions.has(fingerprint)) {
          result = { error: "DUPLICATE_ACTION", hint: "你重复了完全相同的调用。请换参数、换工具，或调用 finish。" };
        } else {
          seenActions.add(fingerprint);
          try {
            const tool = registry.get(call.function.name);
            if (!tool) throw new Error(`未注册的工具: ${call.function.name}`);
            const valid = tool.parameters.parse(args);                  // ① 形状对不对
            const decision = cfg.authorize ? await cfg.authorize(tool.name, valid) : { allowed: true as const };
            if (!decision.allowed) {                                    // ② 有没有权限
              result = { error: decision.needConfirm ? "NEEDS_APPROVAL" : "FORBIDDEN", reason: decision.reason };
            } else {
              result = await withTimeout(() => tool.execute(valid), toolTimeoutMs);
            }
          } catch (err) {
            result = { error: true, message: err instanceof Error ? err.message : String(err) };
          }
        }
      }

      trajectory.push({
        step, thought: msg.content ?? undefined,
        action: call.function.name, args, result, ms: Date.now() - t0,
      });
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return { status: "max_steps", trajectory, stepsUsed: maxSteps, tokensUsed };
}
```

完整代码：`code/src/agent/loop.ts`

**逐段讲设计点**：

1. **并行工具调用：每个 `call.id` 都要回执**。这是本章最重要的一行注释。模型可以在一条回复里同时请求 `queryOrder` 和 `calculate`（下面的演示任务恰好是两个互不依赖的子任务，最容易触发）。如果只执行 `tool_calls[0]`，却把整条 assistant 消息放进历史，第二个调用就没有回执，下一次请求直接被拒：
   ```
   400 An assistant message with 'tool_calls' must be followed by tool messages responding
   to each 'tool_call_id'. The following tool_call_ids did not have response messages: call_B
   ```
   这不是假设：本课程早期版本的 8.3 就有这个 bug，用本地假端点返回两个并行调用即可复现。OpenAI 和 Anthropic 都把「每个调用 id 都必须有对应结果」写成硬规则（2026-11 复核）。所以循环对 `calls` 逐个处理，**每条路径**（坏 JSON、坏 finish、重复调用、未注册、越权、超时、成功）最后都会走到同一句 `messages.push({ role: "tool", tool_call_id: call.id, … })`。
2. **`finish` 用 `safeParse` 校验**。模型可能给出 `{ status: "ok" }` 这种不合法的 finish。直接 `parse` 会抛异常让整个 Agent 崩掉；`safeParse` 失败时把 `INVALID_FINISH` 回给模型，让它修正后重新提交。`finishTool` 用具体的 `ToolDef<typeof FinishArgs>` 而不是 `ToolDef<any>`，所以返回值里的 `status`/`answer` 有准确类型。
3. **坏 JSON 不崩**。`JSON.parse` 包在 try 里，失败变成 `INVALID_JSON` 工具结果（第 7 章同样的原则）。
4. **返回值是可辨识联合 `AgentResult`**。只有 `done`/`blocked` 带 `answer`；`max_steps`、`budget_exceeded`、`no_progress` 不带。调用方必须先判断 `status` 才能读 `answer`，「安全阀触发了却当成功处理」在编译期就会被拦下。
5. **`no_progress`：模型连续不调工具**。第一次只说话不调工具，提醒一次；再犯就以 `no_progress` 体面结束，不会被一直「拉回」直到耗尽步数。
6. **权限钩子 `authorize`**。顺序是先 Zod 校验形状、再授权、最后执行。高危操作返回 `NEEDS_APPROVAL`，第 11 章 11.5 的审批流就从这里接入；第 18 章给出 `authorize()` 的完整实现。
7. **`model` 注入**。默认 `openAIModel()`；测试时注入 `FakeModel`（8.4.1）。

跑一个真实任务（工具用第 7 章那三个）：

```ts
// demos/ch08-agent.ts —— 最小 Agent Loop（需要 .env）
import { runAgent } from "../agent/loop";
import { defaultTools } from "../tools";

const result = await runAgent({
  goal: "查订单 A001 的状态；并计算该订单商品原价 399 打 85 折加 15 元运费的实付金额；最后把两条信息整理成一句话报告。",
  tools: defaultTools,
});
// 联合类型先窄化再取 answer：max_steps / budget_exceeded / no_progress 分支没有 answer
console.log(result.status, "answer" in result ? result.answer : "（未提交答案，查 trajectory 定位原因）");
console.table(result.trajectory.map((s) => ({ step: s.step, action: s.action, ms: s.ms })));
console.log(`总 tokens：${result.tokensUsed}`);
```

完整代码：`code/src/demos/ch08-agent.ts`（在 `code/` 里运行 `pnpm ch08`）。想换模型就显式传：`runAgent({ goal, tools: defaultTools, model: openAIModel("deepseek-v4-pro") })`。

**务必亲手跑并观察 `trajectory`**——你会看到模型自主决定了「先查订单→再算金额→finish 提交」（也可能在同一步里并行请求前两个），这个顺序你在代码里从未写死。这就是第 8.1 节说的质变。`console.table` 打出来的那张表，就是 JD 里的高频词「**执行轨迹（trajectory）**」——第 15 章评测与第 16 章观测的原材料。

## 8.4 四大安全阀（每个都对应一种真实烧钱事故）

| 安全阀 | 防的事故 | 8.3 里的实现 | 触发后 |
|---|---|---|---|
| 步数上限 | 模型陷入「再查一下」永不收敛 | `step <= maxSteps`（默认 8） | 返回 `max_steps` |
| 预算熔断 | 任务失控 token 爆炸（一晚上烧几十上百元的真实案例） | `tokensUsed += usage.total`，超过 `maxBudgetTokens`（默认 60K） | 返回 `budget_exceeded` |
| 循环检测 | 重复完全相同的调用（参数一字不差） | `seenActions` 指纹集合 | 回给模型 `DUPLICATE_ACTION`，让它换路 |
| 超时控制 | 单个工具卡死（如请求不存在的 URL） | `withTimeout(…, toolTimeoutMs)`（默认 15s） | 回给模型「工具执行超时」 |

另外两道兜底：模型连续不调工具 → `no_progress`；参数是坏 JSON 或 finish 不合法 → 作为错误回给模型，而不是让进程崩溃。

这四条是「生产级」与「Demo」的分界线，也是面试题「Agent 死循环怎么处理」的标准答案（附录 A 第 3 题）。**任何一条缺失的 Agent 都不应该上线。**

关于超时，要说清楚它的边界：`withTimeout` 到点后**循环不再等这个工具**，并把错误回给模型；但工具内部的网络请求要真正停下，得把 `AbortSignal` 传进工具。现在的 `ToolDef.execute` 只收参数，`loop.ts` 传入的函数没有使用 `withTimeout` 提供的 `signal`——练习 5 补上这一环，第 17 章展开超时与取消。

### 8.4.1 离线测试：用 FakeModel 把每个安全阀钉死

怎么证明上面每个安全阀真的有效？指望真实模型「恰好」并行调用两个工具、「恰好」给出坏 JSON、「恰好」陷入死循环，是测不全的：它什么时候犯错不受你控制，而且每跑一次都花钱。

办法是第 7 章埋下的接缝：`runAgent` 只依赖 `ChatModel.complete()`。测试时注入一个**按脚本回复的假模型**，每一种失败路径都能确定地、零成本地反复验证。`lib/model.ts` 的后半部分就是它：

```ts
// lib/model.ts（节选）—— 离线测试替身
type ScriptStep = AssistantMsg | ((req: ModelRequest) => AssistantMsg | Promise<AssistantMsg>);

/**
 * 按脚本依次返回回复的假模型。
 * - `requests` 记录每次收到的请求快照，测试里用它断言「历史消息拼得对不对」。
 * - 脚本用完还被调用 → 抛错（说明循环没按预期停下）。
 */
export class FakeModel implements ChatModel {
  readonly requests: ModelRequest[] = [];
  private readonly script: ScriptStep[];

  constructor(script: ScriptStep[], private readonly tokensPerCall = 100) {
    this.script = [...script];
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    this.requests.push({ ...req, messages: [...req.messages] }); // 快照：循环之后还会继续 push
    const step = this.script.shift();
    if (!step) throw new Error("FakeModel：脚本已用完，循环没有按预期结束");
    const message = typeof step === "function" ? await step(req) : step;
    return { message, usage: { input: this.tokensPerCall, output: 0, total: this.tokensPerCall } };
  }
}

/** 构造一条「模型直接说话」的回复 */
export function say(content: string): AssistantMsg {
  return { role: "assistant", content, refusal: null };
}

let fakeId = 0;
/** 构造一条「模型请求调用工具」的回复；传多组即并行工具调用 */
export function callTools(...calls: Array<{ name: string; args: unknown; id?: string; rawArgs?: string }>): AssistantMsg {
  return {
    role: "assistant",
    content: null,
    refusal: null,
    tool_calls: calls.map((c) => ({
      id: c.id ?? `call_${++fakeId}`,
      type: "function" as const,
      function: { name: c.name, arguments: c.rawArgs ?? JSON.stringify(c.args) },
    })),
  };
}
```

完整代码：`code/src/lib/model.ts`

测试用 Node 自带的 `node:test` + `tsx --test`，不需要额外框架。下面三条摘自配套的 `code/test/agent-loop.test.ts`，每条对应一种真实事故：

```ts
// test/agent-loop.test.ts（节选）
import { test } from "node:test";
import assert from "node:assert/strict";
import { runAgent } from "../src/agent/loop";
import { FakeModel, callTools } from "../src/lib/model";
import { defaultTools } from "../src/tools";

const toolMsgs = (fake: FakeModel, i: number) =>
  fake.requests[i]!.messages.filter((m) => m.role === "tool") as Array<{ tool_call_id: string; content: string }>;

test("并行工具调用：一条回复里的每个 tool_call 都必须得到回执（否则真实 API 返回 400）", async () => {
  const fake = new FakeModel([
    callTools(
      { name: "queryOrder", args: { orderId: "A001" }, id: "c1" },
      { name: "calculate", args: { expression: "1+1" }, id: "c2" },
    ),
    callTools({ name: "finish", args: { status: "done", answer: "ok" } }),
  ]);
  await runAgent({ goal: "并行", tools: defaultTools, model: fake });
  assert.deepEqual(toolMsgs(fake, 1).map((m) => m.tool_call_id), ["c1", "c2"]);
});

test("坏 JSON 参数不会让循环崩溃，而是作为错误回传给模型", async () => {
  const fake = new FakeModel([
    callTools({ name: "queryOrder", args: null, rawArgs: "{orderId: A001", id: "bad" }),
    callTools({ name: "finish", args: { status: "blocked", answer: "参数有误" } }),
  ]);
  const r = await runAgent({ goal: "x", tools: defaultTools, model: fake });
  assert.equal(r.status, "blocked");
  assert.match(toolMsgs(fake, 1)[0]!.content, /INVALID_JSON/);
});

test("预算熔断：累计 total_tokens 超限即停", async () => {
  const fake = new FakeModel(
    Array.from({ length: 5 }, (_, i) => callTools({ name: "calculate", args: { expression: `${i}*2` } })),
    5_000,
  );
  const r = await runAgent({ goal: "x", tools: defaultTools, model: fake, maxBudgetTokens: 12_000 });
  assert.equal(r.status, "budget_exceeded");
  assert.equal(r.stepsUsed, 3);
});
```

完整代码：`code/test/agent-loop.test.ts`（共 10 条：正常路径、并行调用、坏 JSON、未注册工具、循环检测、步数上限、预算熔断、工具超时、finish 不合法、no_progress）。

读测试的关键：`fake.requests[1]` 是**第二次**调用模型时发出去的消息快照。第一条测试断言的是「第二次请求里，c1 和 c2 都有回执」——这正是真实 API 会检查的东西。

**动手**：

```bash
cd code
pnpm install     # 构建脚本审批已写在 code/pnpm-workspace.yaml
pnpm test        # 全部离线测试，不需要 API key，不花钱
```

然后**先改坏再修好**：把 `agent/loop.ts` 里的 `for (const call of calls)` 改成只处理第一个调用（`for (const call of calls.slice(0, 1))`），再跑 `pnpm test`，看「并行工具调用」那条测试怎么变红、报错信息说了什么；改回来，变绿。再试一次：把 `FinishArgs.safeParse` 换成 `FinishArgs.parse`，看哪条测试崩。亲手把 bug 放进去、看着测试抓住它，比读十遍代码更能记住为什么那样写。

**两种验证，分工不同**：

| | 离线测试（FakeModel） | 真实模型运行 |
|---|---|---|
| 证明什么 | **程序逻辑**对：循环会停、坏参数被拦、每个 id 都有回执、预算会熔断 | **模型 + 提示词**好用：会不会选对工具、步数是否合理、答案质量 |
| 特点 | 确定、毫秒级、零成本，每次改代码都跑 | 有随机性、花钱，靠第 15 章的评测集批量跑 |

两者缺一不可：只有离线测试，不知道真实效果；只有真实运行，失败路径永远测不全。从本章起，**每道练习都先写一条 FakeModel 测试，再写实现**——这就是第 06 章「Spec 驱动」的最小版本。

## 8.5 失败模式博物馆（调试 Agent 先看这里）

手跑 20 个任务后你会集齐这些「标本」，提前认识它们：

| 失败模式 | 症状 | 对策 |
|---|---|---|
| **死循环** | 换个参数反复调同一工具 | 循环检测升级：相似度检测（不只是完全相同）；在 system 里写明重试上限 |
| **目标遗忘** | 第 5 步忘了自己为什么出发，开始干别的 | 目标写进 system 并每步复述；长任务拆阶段（Plan-and-Execute，8.6） |
| **过早放弃** | 一次工具失败就 finish(blocked) | 错误信息里给修复建议（第 7 章）；system 鼓励「失败换路」而非「失败放弃」 |
| **过度执行** | 信息早够了还在查 | system 写明「信息足够即 finish」；finish 工具描述里强调「宁早勿晚」 |
| **工具误用** | 该用 A 用了 B | description 修锅（第 7 章练习 1 的技能） |
| **幻觉参数** | 编造订单号/URL | 参数校验 + 错误回传让它自查；工具返回 notFound 引导追问用户 |

**调试方法论**：不要盯着最终答案 debug，**看轨迹**。找到第一个「出岔子的步」，问：是模型想错了（→改 system/描述）、还是工具返回的信息不行（→改返回值）、还是参数就错了（→改 schema）。这就是 JD 说的「失败归因」（第 15 章系统化）。

## 8.6 徒手实现另外两篇论文

两段代码都只用到你已有的两块积木：第 04 章 4.4.1 的 `structured()`（schema 进、类型安全的对象出）和本章的 `runAgent`。完整代码：`code/src/agent/plan-execute.ts` 与 `code/src/agent/reflexion.ts`，离线测试在 `code/test/ch08-papers.test.ts`（「第 2 步失败 → 整体 failed」「失败一次 → 带着教训重跑成功」）。两者都留了依赖注入口（`model`、`planChat`/`reflectChat`），练习 4 可以照着这两条测试的写法补你自己的用例。

### Plan-and-Execute（规划-执行分离，源自 Plan-and-Solve 论文 [arXiv:2305.04091](https://arxiv.org/abs/2305.04091)）

> 名字辨析（防糊涂）：论文正式名是 **Plan-and-Solve Prompting**；工程界把它做成 Agent 结构后习惯叫 **Plan-and-Execute**（LangChain 的同名 agent 就是这个范式的实现）。本章用工程名，延伸阅读用论文名，指的是同一思想。

ReAct 走一步看一步，长任务容易漂移。Plan-and-Execute 先出**完整计划**再逐步执行：

```ts
// agent/plan-execute.ts —— 两段式：planner（一次结构化调用）+ executor（每步一个小 runAgent）
import { z } from "zod";
import type { ToolDef } from "../lib/ai";
import { structured, type ChatFn } from "../lib/extract";
import type { ChatModel } from "../lib/model";
import { runAgent } from "./loop";

const Plan = z.object({
  steps: z.array(z.object({
    id: z.number().int(),
    description: z.string().describe("这一步要完成什么，写成可以独立执行的小目标"),
    tool: z.string().describe("预计使用的工具名"),
  })).min(1).max(6),
});
export type Plan = z.infer<typeof Plan>;

export interface PlanExecuteDeps {
  model?: ChatModel;   // 执行用的模型（测试时注入 FakeModel）
  planChat?: ChatFn;   // 规划用的 chat 函数（测试时注入假的）
}

export async function planAndExecute(goal: string, tools: ToolDef<any>[], deps: PlanExecuteDeps = {}) {
  // ① 规划：一次结构化调用（第 04 章 structured），不需要循环
  const toolList = tools.map((t) => `- ${t.name}：${t.description}`).join("\n");
  const plan = await structured(Plan, [
    { role: "system", content: `你是任务规划器。可用工具：\n${toolList}\n把目标拆成 1-6 个按顺序执行的步骤。` },
    { role: "user", content: goal },
  ], deps.planChat ? { chatFn: deps.planChat } : {});

  // ② 执行：每步一个小 Agent，前面步骤的结果作为上下文传下去
  const done: string[] = [];
  for (const s of plan.steps) {
    const r = await runAgent({
      goal: `总目标：${goal}\n已完成：\n${done.join("\n") || "（无）"}\n现在只执行第 ${s.id} 步：${s.description}。完成后调用 finish 汇报这一步的结果。`,
      tools, model: deps.model, maxSteps: 4,
    });
    // ③ 某步失败：最简单的策略是停下并如实报告（进阶：重新规划剩余步骤，见练习 4）
    if (r.status !== "done") return { status: "failed" as const, failedStep: s.id, reason: r.status, plan, done };
    done.push(`第 ${s.id} 步：${r.answer}`);
  }
  return { status: "done" as const, plan, done };
}
```

价值：计划可以被**人类审查**后再执行（高风险场景必备）；无依赖的步骤可以并行；规划用贵模型、执行用便宜模型（**模型路由**的第一次真实应用——第 17 章）。

### Reflexion（反思迭代，[arXiv:2303.11366](https://arxiv.org/abs/2303.11366)）

失败不是终点而是教材：把失败原因写下来，下一轮带着教训重跑（「口头强化学习」，不改模型参数）：

```ts
// agent/reflexion.ts —— 失败 → 写下教训 → 带着教训重跑（默认最多 3 轮）
import { z } from "zod";
import type { ToolDef } from "../lib/ai";
import { structured, type ChatFn } from "../lib/extract";
import type { ChatModel } from "../lib/model";
import { runAgent } from "./loop";

const Lesson = z.object({
  lesson: z.string().describe("这一轮失败的根本原因"),
  avoid: z.string().describe("下一轮必须避免的具体做法"),
});

export interface ReflexionDeps {
  model?: ChatModel;      // 执行用的模型
  reflectChat?: ChatFn;   // 反思用的 chat 函数
}

export async function reflexion(task: string, tools: ToolDef<any>[], deps: ReflexionDeps = {}, maxRounds = 3) {
  const lessons: string[] = [];
  for (let round = 1; ; round++) {
    const r = await runAgent({
      goal: task + (lessons.length ? `\n\n【之前失败的教训，务必避免】\n${lessons.join("\n")}` : ""),
      tools, model: deps.model, maxSteps: 8,
    });
    if (r.status === "done" || round >= maxRounds) return { result: r, rounds: round, lessons };

    // 反思：不带工具，只看轨迹，输出结构化的教训（轨迹可能很长，截断控制成本）
    const { lesson, avoid } = await structured(Lesson, [
      { role: "user", content: `任务：${task}\n结束状态：${r.status}\n执行轨迹：${JSON.stringify(r.trajectory).slice(0, 6000)}\n请分析失败原因。` },
    ], deps.reflectChat ? { chatFn: deps.reflectChat } : {});
    lessons.push(`第 ${round} 轮：${lesson}；下次避免：${avoid}`);
  }
}
```

三篇论文的关系一句话（面试可直接用）：**ReAct 是执行层范式（怎么走每一步），Plan-and-Execute 是结构层范式（先画路线图），Reflexion 是迭代层范式（错了长记性）——生产 Agent 通常是三者的组合：先规划、逐步 ReAct、失败反思重试。**

## 8.7 手写 vs 框架：现在你知道分界线了

手写约 150 行的循环加两个几十行的扩展，你已经拥有：目标驱动循环、终止工具、四大安全阀、轨迹、规划、反思，以及一套能离线验证这一切的测试。**第 10 章的框架（Vercel AI SDK / LangGraph.js / Mastra）本质上帮你做的是**：把这些手写件产品化（内置重试/并发/持久化/人审/观测钩子），换来的是「少写样板」，付出的是「理解黑盒」。先手写再上框架的意义：**框架坏的时候（一定会坏），你知道去哪看。** 另外请注意：第 8 章手写版**没有**断点恢复（进程崩了任务就丢了），这正是第 10 章 LangGraph checkpointer 与第 17 章持久执行要补的。

---

## ⚠️ 常见坑

1. **只执行第一个 tool_call，却把整条 assistant 消息放进历史**——模型一次请求了两个工具，你只回了一条 tool 消息，下一轮请求直接 400（`tool_call_ids did not have response messages`）。每个 `call.id` 都要有回执；8.4.1 的「并行工具调用」测试专门盯着这一点。
2. **`JSON.parse` 或 `finish` 的 `parse` 不在保护里**——一次坏输出就让整个 Agent 抛异常退出。解析放进 try，finish 用 `safeParse`，失败都作为工具结果回给模型。
3. **system 里没有「完成后立即 finish」**——模型会礼貌性总结再总结，白白多跑两步。
4. **maxSteps 太小**（<4）：中等任务 3 步根本不够，误判为「Agent 不行」。经验值：简单任务 6-8，复杂任务 12-15，再往上该拆任务了。
5. **预算只算输出**：输入（含累积的工具结果）往往才是大头，熔断要算 `total_tokens`。
6. **把 finish 的 answer 直接当结构化数据用**：answer 是给用户的自然语言；要结构化产物就在 finish 的 schema 里加字段（如 `report: z.object({...})`）。
7. **轨迹只在出错时看**：成功案例的轨迹同样宝贵——它是「这个任务的标准路径」，第 15 章做轨迹评测的参照系。
8. **只用真实模型测 Agent**：失败路径（并行、坏 JSON、死循环、超时）靠真实模型「恰好」触发，永远测不全，还花钱。程序逻辑用 FakeModel 测，模型效果用第 15 章评测集测。

## ✍️ 动手练习

> 规则：**每道题先写一条 FakeModel 测试，再写实现或再跑真实模型**。测试放在你项目的 `test/` 目录，`package.json` 里加 `"test": "tsx --test test/*.test.ts"`，写法照抄 8.4.1。

**基础**：
1. **先写测试**：用 FakeModel 写出你期望的「多订单对比」轨迹（`queryOrder A001` 与 `queryOrder A002` 并行 → `finish`），断言 `status === "done"`、两个订单都出现在轨迹里。**再跑真实模型**：换 5 个不同 goal（查订单/算账/多订单对比/时间相关/无解任务），记录步数分布、失败模式、总 token，和你的预期轨迹对比，做一张自己的「失败模式博物馆」收藏表。
2. **先写测试**：脚本让 FakeModel 一直调 `calculate` 不收敛，分别断言 `maxSteps: 3` 时返回 `max_steps`、`maxBudgetTokens: 8_000`（`tokensPerCall` 设 3000）时返回 `budget_exceeded`。**再用真实模型**设同样的上限，观察安全阀触发时的行为是否「体面」（有明确状态而非静默失败）。

**进阶**：
3. **调研小 Agent**：工具集 = `fetchAndExtract(url)`（第 7 章练习 3）+ `search(keyword)`（mock 一个返回 3 条 URL 的假搜索）+ `writeFile(path, content)`（只允许写 `./data/` 下，路径校验参照第 18 章的 `isInsideDir`）。**先写测试**：FakeModel 依次请求 search → fetchAndExtract → writeFile → finish，断言文件被写入；再加一条：模型请求写 `../.env` 时返回错误而不是写文件。然后用真实模型跑「调研 XX 技术的现状，写一份 300 字报告存到 data/report.md」，观察检索-阅读-写作路径。
4. **Plan-and-Execute 测试与对比**：**先写测试**：给 8.6 的 `planAndExecute` 注入 `planChat: async () => ({ text: JSON.stringify({ steps: [/* 3 步 */] }) })` 和一个 FakeModel，断言「第 2 步失败时返回 `failed` 且 `failedStep === 2`」。再加上「失败后重新规划剩余步骤」，用测试钉住它。最后用真实模型对同一个任务对比它与纯 ReAct 的总步数、总 token、结果质量。**这组对比数据是面试的黄金素材**（附录 A 第 11 题的实践版）。
5. **让超时真正停下工具**：**先写测试**：造一个工具，`execute` 等待 60 秒但会响应 `AbortSignal`，断言 `toolTimeoutMs: 50` 时它收到的 `signal.aborted === true`（现在会失败——这就是 8.4 说的边界）。然后实现：给 `ToolDef.execute` 增加可选的第二个参数 `{ signal }`，`loop.ts` 改成 `withTimeout((signal) => tool.execute(valid, { signal }), toolTimeoutMs)`，让测试变绿，并确认原有测试仍全绿。

## 🧠 自测清单

1. Agent 公式的四个成分？工作流与 Agent 的边界怎么判定？
2. ReAct 的核心思想一句话？为什么交替优于单打？
3. 显式终止工具（finish）比等待 finish_reason="stop" 好在哪？
4. 四大安全阀各自防什么事故？预算熔断为什么算 total_tokens？超时之后工具真的停了吗？
5. 模型一次返回两个 tool_calls，只执行第一个会发生什么？8.3 是怎么保证每个 id 都有回执的？
6. FakeModel 离线测试证明的是什么，真实模型运行证明的是什么？为什么两者缺一不可？
7. 六种失败模式能说出四种以上？调试 Agent 的方法论第一步是什么？
8. Plan-and-Execute 与 Reflexion 各解决 ReAct 的什么缺陷？三篇论文的关系？
9. 框架相对于你手写版，买卖各是什么？

## 🔗 延伸阅读（必读论文，读法：中文解读→原文摘要与图表→写一篇自己的总结）

- ReAct：https://arxiv.org/abs/2210.03629
- Plan-and-Solve：https://arxiv.org/abs/2305.04091
- Reflexion：https://arxiv.org/abs/2303.11366
- Anthropic《Building Effective Agents》（workflow vs agent 的官方框架，第 10 章展开）：https://www.anthropic.com/engineering/building-effective-agents
- Node.js 内置测试运行器 `node:test`（8.4.1 的测试写法）：https://nodejs.org/api/test.html

---

➡️ 下一章：[第 09 章 · MCP 协议](第09章-MCP协议.md)——把你的工具变成全行业的标准插座。
