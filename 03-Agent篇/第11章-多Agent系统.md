# 第 11 章 · 多 Agent 系统

> 📋 **本章目标**
> 1. 能回答架构题「什么时候才需要多 Agent」（先想清楚再拆，是最大的加分点）
> 2. 掌握主流编排模式：主从式（Orchestrator-Workers）、流水线、辩论/评审式
> 3. 手写一个主从式多 Agent 系统：任务分发、上下文隔离、结果聚合、失败传播
> 4. 实现 Human-in-the-loop：Agent 请求人工审批的挂起与恢复
> 5. 说清 A2A 等跨 Agent 协作的趋势与取舍
>
> 前置知识：第 08 章（runAgent、FakeModel）、第 04 章（结构化输出）｜预计用时：8-12 小时
>
> **配套代码**：`code/src/tools/search.ts`、`code/src/multi/orchestrator.ts`，离线测试 `code/test/orchestrator.test.ts`。
>
> **岗位依据**：「多 Agent 协同」在 BOSS 45+ 岗位出现；小米（Multi-Agent 任务分解/上下文传递/消息通信）、淘天、字节 Aime 等高薪岗均把多 Agent 写进核心职责。第 22 章毕业项目（多 Agent 工作流平台）的架构就是本章产出。

---

## 11.1 先回答：什么时候才需要多 Agent？

多 Agent 不是越多越强，而是**复杂度与收益的交换**。拆分的四个正当理由（面试按这个顺序答）：

1. **上下文隔离**：单 Agent 塞下所有职责的说明/工具/历史，上下文互相污染、遵循率下降。拆开后每个子 Agent 上下文干净（调研的读网页，写作的只看素材）。
2. **并行**：子任务独立（同时查三个数据源），多 Agent 并发跑，延迟从「相加」变「取最大」。
3. **权限隔离**：不同 Agent 挂不同工具集（安全边界更小——第 18 章权限矩阵按 Agent 粒度收权）。
4. **专业化**：不同模型/参数各司其职（规划用旗舰、执行用便宜模型——模型路由的载体）。

**不该拆的信号**：任务本身线性且短（拆了纯增加协调成本）；子任务间需要高频交换大量中间状态（协调开销吞掉收益）；为了简历好看而拆（面试官一眼看穿——「你这个系统三个 Agent 各干什么？不拆会怎样？」答不上就出局）。

**经验法则**：从单 Agent + 好工具开始，遇到 ①上下文过载 ②需要并行 ③权限边界 三者之一再拆。**面试先答「什么时候不拆」，永远是亮点。**

## 11.2 三种编排模式

### 模式一：主从式（Orchestrator-Workers）——80% 场景的选择

```
                 ┌────────────┐
        ┌──────▶│ Worker A    │──────┐
 Planner/        ├────────────┤      │   ┌──────────┐
 Orchestrator ──▶│ Worker B    │─────▶──▶│ Aggregator │──▶ 最终结果
 (主控Agent)     ├────────────┤      │   └──────────┘
        └──────▶│ Worker C    │──────┘
                 └────────────┘
```

主控（Orchestrator）负责：理解任务 → 拆解 → 分发（带各自的「任务简报」）→ 收结果 → 聚合（或仲裁冲突）→ 必要时再分发。Worker 只对自己的子任务负责，**互相不知道彼此存在**（解耦是稳定性的来源）。

### 模式二：流水线（Pipeline）

按阶段串行：调研 Agent → 写作 Agent → 审核 Agent，各阶段产物是下一阶段输入。适合**产物有明确中间形态**的流程（先出大纲再写正文再质检）。本质是第 8.6 节 Plan-and-Execute 的「执行者专业化」版本——每个阶段都换不同的 system/工具/模型。

### 模式三：辩论/评审式（Debate / Critic）

生成者产出 → 批评者挑刺（带着评分标准）→ 生成者修改，循环 N 轮或达到质量线。适合**质量优先、成本不敏感**的任务（重要文案、代码审查）。Reflexion（第 8.6）的双 Agent 版：批评者可以是另一个独立上下文的模型，避免「自己查自己」的盲区。

> 生产系统常见组合：**流水线为骨架，其中某个环节内部是主从式，末端挂一个评审 Agent**。第 22 章毕业项目就是：规划 → [检索(主从并行) → 写作] → 审核（评审式）。

## 11.3 手写主从式多 Agent（本章核心代码）

用第 8 章的 `runAgent` 当积木，搭一个「调研报告生成器」的骨架（这是第 22 章毕业项目的原型，值得反复打磨）。

编排代码要 import 两个本章才用到的检索工具——第 7 章只给了 `getTimeTool/calcTool/queryOrderTool`，这里补齐。先 mock 跑通；以后换成 Tavily、Brave Search 等真实搜索 API 时保持返回结构不变，researcher 的提示词和下游代码都不用改：

```ts
// tools/search.ts —— 调研工具（第 11 章）：先 mock 跑通，真实搜索 API 换进来时保持返回结构不变
import { z } from "zod";
import { defineTool } from "../lib/ai";

export const searchTool = defineTool({
  name: "web_search",
  description: "搜索互联网，返回标题、摘要与 URL 列表。调研任务的入口工具。",
  parameters: z.object({
    query: z.string().min(1).describe("搜索关键词"),
    limit: z.number().int().min(1).max(10).default(5),
  }),
  execute: async ({ query, limit }) => ({
    results: Array.from({ length: limit }, (_, i) => ({
      title: `${query} · 资料 ${i + 1}`,
      url: `https://example.com/${i + 1}`,
      snippet: `关于「${query}」的第 ${i + 1} 条摘要…`,
    })),
  }),
});

export const fetchAndExtract = defineTool({
  name: "fetch_and_extract",
  description: "抓取指定 URL 的正文并转为纯文本（截断到 4000 字）。",
  parameters: z.object({ url: z.url() }),
  execute: async ({ url }) => ({
    url,
    text: `[mock] ${url} 的正文……（真实实现：fetch + 正文提取，并把正文当作不可信数据处理，见第 18 章）`,
  }),
});
```

完整代码：`code/src/tools/search.ts`

```ts
// multi/orchestrator.ts —— 主从式多 Agent 编排（第 11 章 11.3）
import { z } from "zod";
import { runAgent } from "../agent/loop";
import type { ToolDef } from "../lib/ai";
import { structured, type ChatFn } from "../lib/extract";
import { openAIModel, type ChatModel } from "../lib/model";
import { calcTool } from "../tools";
import { fetchAndExtract, searchTool } from "../tools/search";

// 主控的规划产物：结构化任务简报（主控与 Worker 之间的接口契约）
export const Plan = z.object({
  subtasks: z.array(z.object({
    id: z.string(),
    goal: z.string().describe("给子 Agent 的完整任务简报：目标、输出格式、约束"),
    worker: z.enum(["researcher", "analyst", "writer"]),
  })).min(2).max(6),
  aggregation: z.string().describe("如何聚合各子任务结果（如：合并要点、按主题分组）"),
});
export type Plan = z.infer<typeof Plan>;
export type WorkerName = Plan["subtasks"][number]["worker"];

// Worker 三隔离：system（职责）、tools（权限）、model（成本）
export const WORKERS: Record<WorkerName, { system: string; tools: ToolDef<any>[]; model: string | undefined }> = {
  researcher: {
    system: "你是调研员。只负责搜集与核实信息，逐条注明来源 URL。不做主观评价。",
    tools: [searchTool, fetchAndExtract],
    model: process.env.MODEL_CHEAP,           // 执行用便宜模型
  },
  analyst: {
    system: "你是分析师。基于给定材料提炼要点与结论，标注每个结论的依据。",
    tools: [calcTool],
    model: process.env.MODEL_CHEAP,
  },
  writer: {
    system: "你是技术作者。把给定素材写成结构清晰的中文报告，保留引用编号。",
    tools: [],                                // 写作不需要工具
    model: process.env.MODEL_GOOD,            // 最终产出用强模型（模型路由）
  },
};

export interface PipelineDeps {
  /** 每个 Worker 用哪个模型；默认按 WORKERS[name].model 创建真实模型，测试时注入 FakeModel */
  modelFor?: (worker: WorkerName) => ChatModel;
  /** 规划器使用的 chat 函数；测试时注入假的 */
  planChat?: ChatFn;
}

export async function runPipeline(topic: string, deps: PipelineDeps = {}) {
  const modelFor = deps.modelFor ?? ((w: WorkerName) => openAIModel(WORKERS[w].model));

  // ① 规划：一次结构化调用，不需要循环
  const plan = await structured(Plan, [
    { role: "system", content: `你是任务规划器。把用户的调研需求拆成 2-6 个子任务，
分给 researcher（需要联网查的）、analyst（需要计算/提炼的）、writer（最后成文的，至多 1 个）。` },
    { role: "user", content: topic },
  ], deps.planChat ? { chatFn: deps.planChat } : {});

  // ② 执行：researcher/analyst 并行，writer 等它们完成
  const parallel = plan.subtasks.filter((t) => t.worker !== "writer");
  const writerTasks = plan.subtasks.filter((t) => t.worker === "writer");

  const settled = await Promise.allSettled(          // allSettled：一个失败不拖垮全局
    parallel.map(async (t) => {
      const w = WORKERS[t.worker];
      const r = await runAgent({
        goal: `${w.system}\n任务简报：${t.goal}`,
        tools: w.tools, model: modelFor(t.worker), maxSteps: 5,
      });
      if (r.status === "done") return [t.id, r.answer] as const;
      throw new Error(`子任务 ${t.id} 失败: ${r.status}`);
    }),
  );

  const results = new Map<string, string>();
  const failures: string[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") results.set(s.value[0], s.value[1]);
    else failures.push(s.reason instanceof Error ? s.reason.message : String(s.reason));
  }

  // ③ 聚合 + 降级：失败的子任务不阻断整体，缺席信息在报告中标明（静默失败是最恶劣的 bug）
  const material = [...results.entries()].map(([id, text]) => `## 子任务 ${id}\n${text}`).join("\n\n");
  const failureNote = failures.length ? `\n\n⚠️ 有 ${failures.length} 个子任务失败：${failures.join("；")}` : "";
  if (writerTasks.length === 0) return { report: material + failureNote, plan, failures };

  const w = WORKERS.writer;
  const final = await runAgent({
    goal: `${w.system}\n素材：\n${material}\n${failureNote}\n\n请按「${plan.aggregation}」写成完整报告。`,
    tools: w.tools, model: modelFor("writer"), maxSteps: 2,
  });
  const report = final.status === "done"
    ? final.answer
    : material + failureNote + "\n\n（成文阶段失败，返回原始素材）";
  return { report, plan, failures };
}
```

完整代码：`code/src/multi/orchestrator.ts`

**逐个拆讲解设计点**（面试就是问这些）：

1. **任务简报是结构化的**（Plan schema）：主控与 Worker 之间的「接口契约」（第 4 章思想在架构层的应用）。goal 字段要求写「完整简报」——分发质量决定执行质量，主控最重要的职责。
2. **Worker 三隔离**：system（职责）、tools（权限）、model（成本）。「上下文隔离」由 runAgent 每次全新 messages 天然保证——子 Agent 看不到主任务全貌，只看简报。**这是特性不是缺陷**：污染少、prompt 短、遵循率高。注意 `WORKERS` 的类型是显式写出的 `Record<WorkerName, { system; tools: ToolDef<any>[]; model }>`，而不是在对象末尾加 `as const`：`as const` 会把 `tools` 变成只读元组，传给 `runAgent` 的 `tools: ToolDef<any>[]` 时编译失败（本课程早期版本就踩过）。显式类型还有一个好处：`Plan` 里的 `worker` 枚举一改，`WORKERS` 少写一个键会立刻报错。
3. **`Promise.allSettled` 而非 `all`**：并行子任务一个失败不拖垮全局——部分失败降级为「标注缺席」继续成文（第 17 章可靠性思想）。
4. **模型路由已就位**：`MODEL_CHEAP` / `MODEL_GOOD` 环境变量分流（第 17 章展开成完整策略）。没配 `MODEL_CHEAP` 时 `openAIModel(undefined)` 回落到默认的 `MODEL`（deepseek-flash）；`MODEL_GOOD` 建议配 `deepseek-v4-pro`。
5. **失败显式传播**：failures 数组既写进 writer 的素材（报告里标明缺了什么），也作为返回值 `{ report, plan, failures }` 交给调用方——「静默失败」是多 Agent 系统最恶劣的 bug。
6. **依赖注入，离线可测**：`runPipeline(topic, { modelFor, planChat })`。`modelFor` 决定每个 Worker 用哪个 `ChatModel`，默认按 `WORKERS[name].model` 创建真实模型；`planChat` 替换规划器用的 chat 函数。测试里两者都换成假的，整条「规划 → 并行 → 部分失败 → 成文」流水线不花一分钱就能验证：

```ts
// test/orchestrator.test.ts —— 主从式编排的离线测试（规划 → 并行执行 → 部分失败降级 → 成文）
import { test } from "node:test";
import assert from "node:assert/strict";
import { runPipeline, type WorkerName } from "../src/multi/orchestrator";
import { FakeModel, callTools, say } from "../src/lib/model";

const plan = {
  subtasks: [
    { id: "r1", goal: "查 X 的现状", worker: "researcher" },
    { id: "a1", goal: "算 X 的增长率", worker: "analyst" },
    { id: "w1", goal: "成文", worker: "writer" },
  ],
  aggregation: "按主题分组",
};

test("一个子任务失败时，报告照常生成并显式标注失败", async () => {
  const fakes: Record<WorkerName, FakeModel> = {
    researcher: new FakeModel([
      callTools({ name: "web_search", args: { query: "X 现状", limit: 2 } }),
      callTools({ name: "finish", args: { status: "done", answer: "X 正在增长 [1]" } }),
    ]),
    analyst: new FakeModel([say("我不想用工具"), say("还是不想")]), // → no_progress → 失败
    writer: new FakeModel([callTools({ name: "finish", args: { status: "done", answer: "最终报告：X 正在增长 [1]（增长率缺失）" } })]),
  };
  const out = await runPipeline("调研 X", {
    planChat: async () => ({ text: JSON.stringify(plan) }),
    modelFor: (w) => fakes[w],
  });
  assert.deepEqual(out.failures, ["子任务 a1 失败: no_progress"]);
  assert.match(out.report, /最终报告/);
  // writer 拿到的素材里带着失败说明
  assert.match(JSON.stringify(fakes.writer.requests[0]!.messages), /有 1 个子任务失败/);
  // 工具隔离：researcher 看得到 web_search，writer 看不到
  assert.ok(fakes.researcher.requests[0]!.tools!.some((t) => t.type === "function" && t.function.name === "web_search"));
  assert.ok(!fakes.writer.requests[0]!.tools!.some((t) => t.type === "function" && t.function.name === "web_search"));
});
```

完整代码：`code/test/orchestrator.test.ts`（在 `code/` 里 `pnpm test`）。这条测试同时钉住三件事：analyst 连续两次不调工具 → `no_progress` → 失败被收集；writer 拿到的素材里带着失败说明；researcher 看得到 `web_search`、writer 看不到（工具隔离）。

## 11.4 成本与延迟：多 Agent 的账

多 Agent 的隐性代价必须在设计时算（第 1 章成本算术的多 Agent 版）：

```
单 Agent 任务：  1 次系统提示（每次都发）+ N 步工具循环
三 Agent 流水线：3 份系统提示 + 各自循环 + 任务简报传递（重复内容多次计费）
                 token 总量 ≈ 单 Agent 的 1.5-3 倍
```

对策：
- **Worker 的 system 精简**（子任务职责单一，说明不需要长）
- **简报传递用摘要不用全文**（调研结果 2000 字 → 传给 writer 时提炼为要点，或让它落盘文件、传路径——「文件系统当上下文外存」是多 Agent 的标准技巧）
- **并行是延迟的救命稻草**：3 个串行子任务各 30s = 90s；并行 = 30s
- **便宜的先跑**：规划器一次结构化调用（便宜模型）往往比「主控 Agent 循环」省 80%

## 11.5 Human-in-the-loop：审批流的最小实现

多 Agent 系统的高危动作（发邮件、对外发布、花钱）需要人工点头。你手里其实已经有三块现成的积木，审批流就是把它们接起来：

1. **拦下**：第 8 章 `runAgent` 的 `authorize` 钩子。第 18 章的 `authorize()` 对 `critical` 级工具返回 `{ allowed: false, needConfirm: true }`，循环把它变成工具结果 `{ error: "NEEDS_APPROVAL" }`，工具**没有执行**，模型按 system 规则调用 `finish(blocked)`。
2. **挂起**：把被拦下的那一笔（工具名 + 参数）写进持久化的审批表，进程可以退出。
3. **批准后执行**：由**代码**直接执行这一笔已批准的操作，并且必须**幂等**——用第 17 章 `reliability/ledger.ts` 的 `runIdempotent()`。

```ts
// multi/hitl.ts —— 人工审批：权限层「拦下」→ 持久化「挂起」→ 人工「裁决」→ 幂等「执行」
// ⚠️ 接口示意：ApprovalStore 只给接口（实现见第 22 章项目 3 的 approvals 表）；其余部件都是真实代码：
//    runAgent 的 authorize 钩子（code/src/agent/loop.ts）、authorize()（code/src/security/permissions.ts，第 18 章）、
//    idempotencyKey/runIdempotent（code/src/reliability/ledger.ts，第 17 章）。
import { runAgent } from "../agent/loop";
import type { ToolDef } from "../lib/ai";
import type { ChatModel } from "../lib/model";
import { idempotencyKey, runIdempotent, type Ledger } from "../reliability/ledger";
import { authorize, type SessionContext } from "../security/permissions";

export interface Approval {
  id: string;
  taskId: string;
  tool: string;
  args: unknown;
  status: "waiting" | "approved" | "rejected";
  note?: string;
}
export interface ApprovalStore {   // 必须持久化：审批人可能一小时后才来，进程早已重启
  create(a: Omit<Approval, "id" | "status">): Promise<Approval>;
  get(id: string): Promise<Approval | undefined>;
  update(id: string, patch: Partial<Approval>): Promise<void>;
}

// ① Agent 侧：高危工具被权限层拦下 → 工具结果是 NEEDS_APPROVAL → 模型按 system 规则 finish(blocked)
export async function runWithApproval(
  taskId: string, goal: string, tools: ToolDef<any>[], ctx: SessionContext, store: ApprovalStore, model?: ChatModel,
) {
  const result = await runAgent({ goal, tools, model, authorize: (name, args) => authorize(name, args, ctx) });
  const pending = result.trajectory.filter(
    (s) => (s.result as { error?: string } | null)?.error === "NEEDS_APPROVAL",
  );
  // 审批粒度是「这一笔操作」：每个被拦下的调用一条记录
  const approvals = await Promise.all(pending.map((s) => store.create({ taskId, tool: s.action, args: s.args })));
  return { result, approvals };   // 前端（第 20 章）把 approvals 渲染成审批卡
}

// ② 审批人裁决：批准后由「代码」直接执行这一笔，而不是让 Agent 重跑一遍、赌它再调一次
export async function resolveApproval(
  id: string, decision: "approved" | "rejected",
  deps: { store: ApprovalStore; ledger: Ledger; tools: ToolDef<any>[] },
  note?: string,
) {
  const a = await deps.store.get(id);
  if (!a || a.status !== "waiting") throw new Error(`审批 ${id} 不存在或已处理`);
  await deps.store.update(id, { status: decision, note });
  if (decision === "rejected") return { status: "rejected" as const };

  const tool = deps.tools.find((t) => t.name === a.tool);
  if (!tool) throw new Error(`未注册的工具: ${a.tool}`);
  const valid = tool.parameters.parse(a.args);   // 轨迹里存的是原始参数，执行前再校验一次
  // ③ 幂等执行：审批人连点两次、或执行到一半进程崩了再来，都不会重复发信/重复扣款（第 17 章）
  const key = idempotencyKey(a.taskId, a.tool, valid);
  return runIdempotent(deps.ledger, { key, tool: a.tool, args: valid }, () => tool.execute(valid));
  // 结果是 executed / replayed / needs_reconcile；再把它作为新信息交给 Agent 续跑剩余任务
}
```

完整代码：`code/src/multi/hitl.ts`，离线测试 `code/test/hitl.test.ts` 验证了「被拦下 → 记一条审批 → 批准后只执行一次 → 重复批准被拒」。`ApprovalStore` 只定义了接口（测试里用内存 Map 实现），生产要换成数据库表，所以这里仍标为接口示意。恢复执行有两种接法：像上面这样代码直接执行 + 把结果写进新 goal 让 Agent 续跑剩余任务；或者用第 10 章 LangGraph 的 `interrupt()` + `Command({ resume })` 让整张图从断点继续（跨进程要配持久化 checkpointer）。第 22 章项目 3 的 `approvals` 表（22.1.2）就是 `ApprovalStore` 的落地版。

三个工程要点：

- **审批粒度是「这一笔操作」而不是「整个任务」**（任务可继续跑其他步骤）。
- **审批状态必须持久化**：审批人可能一小时后才来，内存里的挂起会随进程死掉——这是第 17 章持久执行要解决的真问题。
- **批准后不要让 Agent「重新跑一遍、赌它再调一次」**：模型这次未必还调同一个工具、同样的参数。由代码执行已批准的那一笔，并用幂等键兜住重复点击和崩溃重试——`runIdempotent` 返回 `replayed` 表示之前已成功、直接复用结果；返回 `needs_reconcile` 表示上次执行到一半崩了，先去业务系统核对，不许盲目重试。

面试讲清这三点，「Human-in-the-loop」才算真做过。

## 11.6 跨 Agent 协作的趋势：A2A 与 MCP 的位置

- **MCP**（第 9 章）：Agent ↔ 工具/数据 的标准协议（垂直连接：Agent 怎么用工具）
- **A2A**（Agent-to-Agent）：Agent ↔ Agent 的开放协作协议（水平连接：不同厂商/框架的 Agent 互相发现、委派任务、交换结果）——2025 年由 Google 联合 50+ 家推出，2026-03 发布 v1.0（最新补丁 v1.0.1，2026-05），2026-08 作为托管项目加入 Linux Foundation 旗下的 Agentic AI Foundation（AAIF），与 MCP、AGENTS.md、Agent Skills 同属一个中立基金会；现有 150+ 组织支持，提供 JSON-RPC / gRPC / HTTP+JSON 三种绑定，Google Cloud、AWS Bedrock AgentCore、Azure AI Foundry 已原生支持（2026-11 复核）。官方 JS SDK 是 `@a2a-js/sdk`。
- **AG-UI**：Agent ↔ 用户界面的事件协议（第 20 章），起源于 CopilotKit 与 LangChain、CrewAI 的合作，**不是 AAIF 项目**。官方把三者定位为互补的三层：AG-UI 连用户、MCP 连工具、A2A 连 Agent。
- 现状判断（2026-10）：MCP 已是事实标准且岗位硬要求；A2A 已进入生产采用期（供应链、金融、移动平台有落地），但岗位要求仍远少于 MCP。**对求职者：吃透 MCP，能用 Agent Card + 任务委派讲清 A2A 即可**（面试能说清「MCP 连工具、A2A 连 Agent」这层区别已经领先大多数候选人）。

另一个值得了解的模式：**Agents as Tools**——把子 Agent 本身注册成主 Agent 的一个工具（`callResearcher(topic)`）。这是主从式的另一种实现风格（框架里很常见，如 OpenAI Agents SDK 的 handoff/agent-as-tool），优点是主控逻辑完全交给模型自主决策，缺点是可控性低于显式编排。**编排在代码（本章 11.3）vs 编排在模型（agent-as-tool）的取舍**，是「工作流 vs Agent」边界问题（第 8.1）在多 Agent 层的再现。

---

## ⚠️ 常见坑

1. **为了多而多**：三个 Agent 各说一句话完成的任务，别建流水线。先用单 Agent 跑，痛了再拆。
2. **主控简报太薄**：`goal: "调研一下AI趋势"` 这种简报，Worker 只能自由发挥——结果质量方差巨大。简报要有：目标、范围、输出格式、约束、验收标准。
3. **中间产物全靠上下文传递**：长材料（整篇调研原文）在 Agent 间传来传去，token 翻倍。落盘传路径。
4. **一个 Worker 失败全部重来**：没有 allSettled 与降级逻辑，多 Agent 系统的可用性 = 各 Worker 可用性的乘积（3 个 95% = 86%）。
5. **审批做成「全局暂停」**：等一个人审一笔小钱，整个流水线卡死。粒度到操作。
6. **多 Agent 全用旗舰模型**：成本爆炸。执行层永远便宜模型（11.3 的 WORKERS 已经体现）。
7. **给 Worker 注册表加 `as const`**：`tools` 变成只读元组，传给 `runAgent` 编译失败。用显式的 `Record<WorkerName, …>` 类型（11.3）。
8. **审批通过后让 Agent 重跑来「顺便」执行**：模型未必再调同一个工具，审批人点两次还可能执行两次。代码直接执行已批准的那一笔，并走幂等执行（11.5）。

## ✍️ 动手练习

**基础**：
1. 先在 `code/` 里跑 `pnpm test`，读懂 `orchestrator.test.ts`；再用真实模型跑通 11.3 主从式编排（工具全用 mock 即可）。观察：规划器怎么拆任务、简报长什么样、writer 怎么聚合。
2. **先写测试**：仿照 `orchestrator.test.ts` 再写一条——两个 researcher 子任务里一个成功、一个达到 `max_steps`，断言 `failures` 只有一条、报告里带「有 1 个子任务失败」。再用真实模型复现同样的降级路径（比如把某个 researcher 的 `maxSteps` 调到 1）。

**进阶**：
3. 把并行策略升级为**依赖图**：Plan schema 加 `dependsOn: string[]`，拓扑排序后分层执行（无依赖层内并行）。先用假 `planChat` 写一条测试断言执行顺序，再对比「全串行 vs 全并行 vs 依赖图」三种策略在同一任务上的总延迟。
4. 实现 11.5 审批流完整版：用 JSON 文件实现 `ApprovalStore`（参照 `ledger.ts` 的 `JsonFileLedger`），账本用 `JsonFileLedger`。**先写测试**：FakeModel 请求一个 `critical` 工具（如 `sendEmail`）→ 断言审批表多了一条 `waiting`、工具没执行；批准两次 → 断言工具只执行一次。再用两个终端模拟：终端 A 跑 Agent 产生待审批记录后退出，终端 B 批准并执行。
5. （挑战）实现 agent-as-tool 版本：把 researcher 包成主 Agent 的一个工具，同一个任务对比「显式编排 vs 模型自主编排」的 token 成本与结果质量——这就是 11.6 结尾那个取舍题的实测数据。

## 🧠 自测清单

1. 拆多 Agent 的四个正当理由？不该拆的三个信号？
2. 三种编排模式各自的适用场景？生产系统常见的组合方式？
3. 主从式里主控的职责是什么？「任务简报」为什么必须结构化且写满？
4. Worker 的三隔离是什么？「上下文隔离」为什么是特性而非缺陷？
5. `Promise.allSettled` + 失败标注，解决多 Agent 的什么问题？
6. 多 Agent 的 token 账怎么算？三个省 token 的手段？
7. 审批流的三个工程要点？为什么审批状态必须持久化？批准之后为什么要由代码幂等执行，而不是让 Agent 重跑？
8. `runPipeline` 的 `modelFor`/`planChat` 注入解决什么问题？`WORKERS` 为什么不用 `as const`？
9. MCP、A2A、AG-UI 各连什么？agent-as-tool 与显式编排的取舍？

## 🔗 延伸阅读

- Anthropic《Building Effective Agents》中 multi-agent 编排模式一节（“orchestrator-workers” 官方表述）：https://www.anthropic.com/engineering/building-effective-agents
- Anthropic 工程博客《How we built our multi-agent research system》（研究型多 Agent 的真实生产数据：并行子 Agent 提效 90%+ 的来源）：https://www.anthropic.com/engineering/multi-agent-research-system
- A2A 协议官网（了解趋势）：https://a2a-protocol.org
- AAIF 托管项目一览（A2A、MCP、AGENTS.md 等）：https://aaif.io/projects

---

➡️ 下一章进入 RAG 篇：[第 12 章 · Embedding 与向量数据库](../04-RAG篇/第12章-Embedding与向量数据库.md)
