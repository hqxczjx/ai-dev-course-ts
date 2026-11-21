# 第 07 章 · 工具调用（Function Calling）

> 📋 **本章目标**
> 1. 说清并实现工具调用的完整六步流程——「模型决策，代码执行」的铁律
> 2. 会把业务能力封装成高质量工具（描述、参数、返回值都有讲究）
> 3. 掌握失败处理：参数校验、错误回传、重试与放弃
> 4. 建立「工具即权限」的安全意识（第 18 章的前置）
> 5. 完成一个带 3 个工具的对话程序（练习 2 加第 4 个）——这就是 Agent 的雏形
>
> 前置知识：第 02 章（lib/ai.ts）、第 04 章（Zod）｜预计用时：8-12 小时
>
> **配套代码**：`code/src/lib/ai.ts`（工具类型）、`code/src/tools/index.ts`、`code/src/agent/tool-loop.ts`，离线测试 `code/test/tool-loop.test.ts`。正文代码与这些文件一一对应。
>
> **岗位依据**：Function Calling / Tool Use 在两源 JD 中出现 40+ 次（BOSS）/ ~28%（V2EX），是所有 Agent 岗的地基。面试标准题「Function Calling 完整流程；调用失败怎么办」就是本章 7.2 与 7.6（附录 A 第 2 题）。

---

## 7.1 从「会说」到「会做」

第 1 章讲过模型的硬伤：不知道实时信息、算不准数、碰不到你的数据库和内部系统。工具调用（Tool Calling / Function Calling）补上这只「手」：

```
没有工具：  用户问「我的订单到哪了？」→ 模型只能编（幻觉）
有了工具：  模型说「我要调用 queryOrder(orderId="12345")」
            → 你的代码执行查询 → 结果回传 → 模型基于事实回答
```

一个必须刻进脑子的事实：**模型从不执行任何函数**。它只做两件事——决定「调什么、传什么参数」，以及事后「读懂结果继续对话」。**执行永远发生在你的代码里**（第 18 章安全设计的根基：模型没有能力越过你的权限边界，除非你的代码替它越）。

工具调用是 JD 高频词「Agent 开发」的技术内核：第 8 章的 Agent 循环 = 工具调用 + 循环；第 9 章 MCP = 工具的标准化协议；第 10 章各框架的 tool 抽象 = 本章代码的封装升级版。**本章吃透原生格式，后面所有框架都只是语法糖。**

## 7.2 完整流程：六步走

```
① 你把工具清单（JSON Schema 描述）随消息一起发给模型
② 模型判断需要用工具 → 返回 tool_calls（函数名 + JSON 字符串形式的参数）
   （此时它不生成最终回答，finish_reason 为 "tool_calls"）
③ 你的代码解析参数 → Zod 校验 → 执行真正的函数
④ 把执行结果作为 role:"tool" 消息回传（带上 tool_call_id 对应关系）
⑤ 模型读取结果 → 生成回答，或发起新一轮 tool_calls（转 ③）
⑥ 循环直到 finish_reason 为 "stop"（模型认为任务完成）
```

还有一条贯穿全章的硬规则：**模型一次可能请求多个工具（并行调用），assistant 消息里的每个 `tool_call.id` 都必须有且只有一条对应的 `role: "tool"` 回执**，少一条，下一次请求就会被 API 以 400 拒绝。OpenAI 官方可以用请求参数 `parallel_tool_calls: false` 关掉并行，但兼容厂商不一定支持这个参数，所以代码要能处理多个调用（2026-11 复核）。

> ⚠️ **API 选择：Chat Completions 还是 Responses（2026-11 复核）**
> 本章用 **Chat Completions** 格式（`client.chat.completions.create` + `tool_calls` + `role: "tool"`），因为它是 DeepSeek、Kimi、通义等国内厂商共同兼容的标准，课程主线（`BASE_URL=https://api.deepseek.com`）走的就是它。但要知道边界：
> - **OpenAI GPT-6 系列（如 GPT-6 Astra、GPT-6.1 Sol）的工具调用只能走 Responses API**（`client.responses.create`），而且会拒绝 `temperature` 参数。Responses 里模型返回 `type: "function_call"` 项（带 `call_id`），你回传 `{ type: "function_call_output", call_id, output }`。规则和本章同构：**每个调用 id 必须有且只有一条对应结果**。
> - Chat Completions 默认不是 strict 模式；Responses 会尽量把 schema 归一化成 strict（所有字段都列进 `required`、`additionalProperties: false`）。
> - Anthropic 新版 API 拒绝 `temperature`/`top_p`/`top_k`，它提供 OpenAI 兼容端点，但有限制。
>
> 结论：把 `MODEL` 换成 GPT-6 系列时，本章的循环不能原样用，要改写成 Responses 格式（或者用第 10 章的 Vercel AI SDK，它的 `openai(id)` 默认就走 Responses）。

下面是一个最小可运行例子（三个本地工具：时间、精确计算、订单查询，零外部依赖，直接能跑）。

## 7.3 实战：给 `lib/ai.ts` 加上工具支持

工具定义 = 描述（给模型看）+ 参数 schema（给模型看，也给代码校验）+ 实现。把下面这段**追加到第 02 章 `lib/ai.ts` 的末尾**。文件顶部已经有 `import OpenAI from "openai";`，不要重复导入；如果还没有 `import { z } from "zod";`，在顶部补这一行。

```ts
// lib/ai.ts（节选）—— 追加到文件末尾：工具类型
/** 工具 = 描述（给模型看）+ 参数 schema（给模型看 + 给代码校验）+ 实现 */
export interface ToolDef<T extends z.ZodType = z.ZodType> {
  name: string;
  description: string;   // 模型选不选它、参数给得对不对，七成看这里
  parameters: T;
  execute: (args: z.infer<T>) => Promise<unknown>;
}

export function defineTool<T extends z.ZodType>(t: ToolDef<T>): ToolDef<T> {
  return t;
}
```

完整代码：`code/src/lib/ai.ts`（第 86 行之后是本章内容）。

`defineTool` 什么也不做，只是让 TypeScript 从 `parameters` 推断出 `execute` 的参数类型：写 `execute: async ({ orderId }) => …` 时 `orderId` 自动是 `string`。

三个示例工具（注意 description 的写法——这是写给模型看的「API 文档」）：

```ts
// tools/index.ts —— 第 07 章示例工具集（零外部依赖，直接能跑）
import { z } from "zod";
import { defineTool } from "../lib/ai";

// 工具1：当前时间（解决「模型不知道现在几点」）
export const getTimeTool = defineTool({
  name: "getCurrentTime",
  description: "获取当前日期时间。当用户问题涉及「现在/今天/几点」等时间信息时使用。无需参数。",
  parameters: z.object({}),
  execute: async () => ({ iso: new Date().toISOString(), timezone: "Asia/Shanghai" }),
});

// 工具2：精确计算（解决「模型算不准数」）
export const calcTool = defineTool({
  name: "calculate",
  description:
    "精确计算四则运算表达式。凡涉及金额、折扣、数量乘加的运算必须用本工具，禁止心算。表达式用 JS 语法，如 '(120*0.85+15)'。",
  parameters: z.object({
    expression: z.string().max(200).describe("JS 语法的数学表达式，仅允许数字和 + - * / ( ) ."),
  }),
  execute: async ({ expression }) => {
    // 白名单校验：只允许数字与运算符，绝不能把任意输入交给 Function/eval（第 18 章）
    if (!/^[\d+\-*/().\s]+$/.test(expression)) throw new Error("表达式含非法字符，只允许数字和 + - * / ( ) .");
    const result = Function(`"use strict"; return (${expression})`)() as unknown;
    if (typeof result !== "number" || !Number.isFinite(result)) throw new Error("表达式结果不是有限数字");
    return { expression, result };
  },
});

// 工具3：订单查询（mock 一个内存「数据库」，模拟接入业务系统）
export const ORDERS: Record<string, { status: string; eta: string; items: string[] }> = {
  A001: { status: "运输中", eta: "明天 18:00 前", items: ["机械键盘"] },
  A002: { status: "已签收", eta: "-", items: ["显示器支架"] },
};

export const queryOrderTool = defineTool({
  name: "queryOrder",
  description:
    "按订单号查询订单状态与预计送达时间。用户询问订单进度/物流/到货时间时使用。找不到订单时返回 notFound。",
  parameters: z.object({ orderId: z.string().describe("订单号，如 A001") }),
  execute: async ({ orderId }) => ORDERS[orderId.toUpperCase()] ?? { notFound: true, orderId },
});

export const defaultTools = [getTimeTool, calcTool, queryOrderTool];
```

完整代码：`code/src/tools/index.ts`

**工具设计第一课已经藏在上面**：三个 description 都写了「**什么时候用**」（当用户问时间时/凡涉及金额时/询问订单时）。模型选择工具靠的是对 description 的理解——描述含糊，模型就不调或乱调。

## 7.4 工具调用循环（本章核心代码）

把六步流程落成代码，分三小步。

**第一步：把工具清单转换成 API 要的格式。** 继续追加到 `lib/ai.ts` 末尾：

```ts
// lib/ai.ts（节选）—— 追加到文件末尾：Zod schema → OpenAI tools 格式
/** Zod schema → OpenAI tools 格式。Zod 4 内置 z.toJSONSchema()，不再需要 zod-to-json-schema。 */
export function toOpenAITools(tools: ToolDef<any>[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: z.toJSONSchema(t.parameters) as Record<string, unknown>,
    },
  }));
}
```

完整代码：`code/src/lib/ai.ts`

两个说明：

- 旧教程里的 `zod-to-json-schema` 库仓库已归档、不支持 Zod 4 的 schema，不要再用；Zod 4 内置的 `z.toJSONSchema()` 就够了。
- **openai 7.x 的类型变化**（2026-11 复核）：`ChatCompletionTool` 现在是 `function | custom` 两种工具的联合类型，assistant 消息里的 `tool_calls[i]` 也是 `function | custom` 联合。custom 那一支没有 `function` 字段，所以旧写法 `ChatCompletionTool["function"]["parameters"]`、直接访问 `call.function.name` 都会编译失败。构造时我们只造 function 工具；读取时先用 `call.type === "function"` 收窄（见下面的循环）。

**第二步：把「调模型」收窄成一个接口。** 循环只需要「发消息 + 工具清单，拿回一条 assistant 消息和用量」这一件事。把它抽成 `ChatModel` 接口，循环就不再关心背后是 DeepSeek、OpenAI 还是一个按脚本回复的假模型——第 08 章 8.4.1 会用这个接缝写离线测试。新建 `lib/model.ts`：

```ts
// lib/model.ts（节选）—— 模型端口：循环只依赖 complete() 这一个方法
import type OpenAI from "openai";
import { getClient, MODEL } from "./ai";

export type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
export type AssistantMsg = OpenAI.Chat.Completions.ChatCompletionMessage;
export type ToolSpec = OpenAI.Chat.Completions.ChatCompletionTool;

export interface ModelRequest {
  messages: Msg[];
  tools?: ToolSpec[];
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ModelResponse {
  message: AssistantMsg;
  usage: { input: number; output: number; total: number };
}

export interface ChatModel {
  complete(req: ModelRequest): Promise<ModelResponse>;
}

/** 真实模型：任何 OpenAI 兼容端点（DeepSeek / Qwen / OpenAI …）。 */
export function openAIModel(model: string = MODEL): ChatModel {
  return {
    async complete(req) {
      const res = await getClient().chat.completions.create(
        {
          model,
          messages: req.messages,
          ...(req.tools?.length ? { tools: req.tools } : {}),
          max_tokens: req.maxTokens ?? 1024,
        },
        { signal: req.signal },
      );
      const message = res.choices[0]?.message;
      if (!message) throw new Error("模型返回了空 choices");
      const input = res.usage?.prompt_tokens ?? 0;
      const output = res.usage?.completion_tokens ?? 0;
      return { message, usage: { input, output, total: res.usage?.total_tokens ?? input + output } };
    },
  };
}
```

完整代码：`code/src/lib/model.ts`（后半部分的 `FakeModel` 第 08 章再讲）。`getClient()` 是第 02 章 `lib/ai.ts` 里懒加载、`maxRetries: 0` 的客户端。

**第三步：主循环。** 执行单个工具调用的逻辑单独抽成 `executeToolCall`，方便测试：

```ts
// agent/tool-loop.ts —— 工具调用循环（第 07 章 7.4）
import { toOpenAITools, type ToolDef } from "../lib/ai";
import { openAIModel, type ChatModel, type Msg } from "../lib/model";
import { defaultTools } from "../tools";

export interface ToolLoopResult {
  status: "answered" | "max_steps";
  answer?: string;
  messages: Msg[];
}

/** 执行一次工具调用：解析 → 校验 → 执行；任何失败都转成结构化错误（错误也是给模型的信息） */
export async function executeToolCall(
  registry: Map<string, ToolDef<any>>,
  name: string,
  rawArguments: string,
): Promise<unknown> {
  try {
    const tool = registry.get(name);
    if (!tool) throw new Error(`未注册的工具: ${name}`);
    const rawArgs: unknown = JSON.parse(rawArguments || "{}"); // 坏 JSON 也在 try 里接住
    const args = tool.parameters.parse(rawArgs);                // 模型给的参数也是「模型输出」，必须校验
    return await tool.execute(args);
  } catch (err) {
    return { error: true, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function runToolLoop(
  question: string,
  { model = openAIModel(), tools = defaultTools as ToolDef<any>[], maxSteps = 6 }:
    { model?: ChatModel; tools?: ToolDef<any>[]; maxSteps?: number } = {},
): Promise<ToolLoopResult> {
  const registry = new Map(tools.map((t) => [t.name, t]));
  const messages: Msg[] = [
    { role: "system", content: "你是电商客服助手。能用工具获取的事实就不要凭记忆回答。" },
    { role: "user", content: question },
  ];

  for (let step = 0; step < maxSteps; step++) {
    const { message } = await model.complete({ messages, tools: toOpenAITools(tools), maxTokens: 800 });

    if (message.tool_calls?.length) {
      // ② 先把这条 assistant 消息（含全部 tool_calls）存入历史
      messages.push(message);
      // ③-⑤ 每一个 tool_call 都必须有一条 role:"tool" 回执，tool_call_id 严格对应
      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        const result = await executeToolCall(registry, call.function.name, call.function.arguments);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
      continue;
    }

    // ⑥ 没有工具调用 → 最终回答
    messages.push(message);
    return { status: "answered", answer: message.content ?? "", messages };
  }
  return { status: "max_steps", messages };
}
```

完整代码：`code/src/agent/tool-loop.ts`

逐段看四个关键点：

1. **`JSON.parse` 放在 try 里面**。模型给的 `arguments` 是一段字符串，可能根本不是合法 JSON（截断、少引号）。放在 try 外面，一次坏输出就让整个程序崩掉；放在里面，它变成一条结构化错误回给模型，模型通常下一轮就会改正。
2. **`call.type !== "function"` 收窄**。这是 openai 7.x 的要求，收窄之后才能读 `call.function`。我们只注册了 function 工具，兼容端点只会返回 function 调用，custom 分支不会出现。
3. **先 push assistant 消息，再为每个 `call.id` push 一条 tool 消息**。顺序反了或少回一条，下一轮都是 400。
4. **`model` 是参数，有默认值**。平时用 `openAIModel()` 调真实模型；测试时传一个假模型进来，循环代码一行不改。

最后写一个演示脚本：

```ts
// demos/ch07-tool-loop.ts —— 工具调用循环（需要 .env）
import { runToolLoop } from "../agent/tool-loop";

const r = await runToolLoop("我的订单 A001 到哪了？还有，它原价 399 打 85 折再加 15 元运费，一共多少钱？");
for (const m of r.messages) {
  if (m.role === "tool") console.log(`🔧 ${m.tool_call_id} → ${m.content}`);
}
console.log(r.status === "answered" ? `🤖 ${r.answer}` : "⚠️ 达到步数上限（生产中应转人工）");
```

完整代码：`code/src/demos/ch07-tool-loop.ts`。在自己的项目里运行 `pnpm exec tsx demos/ch07-tool-loop.ts`；在配套 `code/` 目录里是 `pnpm ch07`（先 `cp .env.example .env` 并填 key）。

跑它，然后在终端观察两个现象：

1. 这个问题触发了**两次**工具调用（queryOrder + calculate）——模型自己决定用哪个手
2. 最终回答里的事实（状态、金额）全部来自工具结果——**幻觉被工程手段消灭**

## 7.5 工具返回值的设计：你在花模型的 token

工具结果会进入上下文（占 token、且影响模型理解），所以返回值要**精简、结构化、可读**：

```ts
// ⚠️ 接口示意：db 代表你项目里的 ORM 实例（如 Drizzle），这里只对比两种 execute 的返回值
// ❌ 把整个 ORM 对象/一坨 HTML 扔回去（几百 token 的噪音）
const executeBad = async ({ orderId }: { orderId: string }) =>
  await db.orders.findFirst({ where: { orderId } });

// ✅ 只回模型需要决策的字段
const executeGood = async ({ orderId }: { orderId: string }) => {
  const o = await db.orders.findFirst({ where: { orderId } });
  return o ? { status: o.status, eta: o.eta, items: o.items.map((i) => i.name) } : { notFound: true };
};
```

- 大结果分页/截断（查询结果 > 20 条就返回 `{ tooMany: true, total: 357, hint: "请加筛选条件" }` 让模型自己细化——这也是一种「工具引导模型」）
- 错误返回结构化信息而非异常字符串堆栈：`{ error: true, code: "NOT_FOUND", message: "订单不存在" }`——模型能据此决定下一步（换个参数重试？还是告诉用户？）

## 7.6 失败处理的三层设计（面试高频）

| 层 | 拦什么 | 怎么做 |
|---|---|---|
| **参数层** | 模型给的参数不合法（坏 JSON、缺字段、类型不对） | `JSON.parse` + `tool.parameters.parse()`（Zod），两者都在 try 里。校验失败**不要抛给用户**——把错误作为 tool 结果回传，模型会自修正（7.4 的 `executeToolCall` 已实现） |
| **执行层** | 工具自身出错（网络/超时/业务异常） | 可重试错误（超时/5xx）先在 execute 内部重试 1 次；仍失败则结构化错误回传，让模型决策 |
| **会话层** | 模型反复失败、死循环 | 全局步数上限（7.4 的 `maxSteps = 6`）；连续 N 次工具错误后熔断：停止循环、向用户坦诚失败并转人工。「模型解决不了的问题硬让它试」只会烧钱 |

一个容易忽略的点：**错误信息也是提示词**。`{ error: "Invalid date format" }` 不如 `{ error: "日期格式应为 YYYY-MM-DD，你传的是 2026/10/11" }`——告诉模型错在哪、怎么改，修复率天差地别。

## 7.7 工具设计七原则（从 JD 与实战提炼）

1. **原子性**：一个工具做一件事。`manageUser(action: "create"|"delete"...)` 是坏味道——create 和 delete 的权限等级完全不同（第 18 章），混在一起没法收权。
2. **描述三要素**：干什么 + 什么时候用 + 什么时候**不用**（「本工具不含运费信息，运费请用 getShippingFee」——负向指引能防止工具误用）。
3. **参数从简**：能推导的不要让模型传（传 `userId` 让模型猜 ID 是坑；从会话上下文注入）。
4. **返回精简**（7.5）。
5. **幂等标注**：查询类天然幂等；写操作（下单/发邮件）在描述里写明副作用，让模型（和你的权限层，第 18 章）慎重。
6. **数量适度**：单次提供的工具 5-10 个为宜；几十个工具会稀释模型的选择准确率——分类多时用「工具路由」（先让模型选目录再展开，第 11 章多 Agent 的另一种用途）。
7. **危险分级**：只读 → 低危写 → 高危写（钱/删除/外发），为第 18 章的确认机制预留元数据。

## 7.8 「模型 + 代码」混合系统的威力

本章工具都很小，但组合起来已经解决第 1 章列出的全部模型硬伤：实时性（时间工具）、精确计算（计算器）、私有数据（订单查询）。**这个模式的名字叫「模型做大脑，代码做手脚」**——后面三章不断放大它：

- 第 8 章：把 7.4 的循环交给**模型自主规划**（它自己决定先查什么再算什么，而不是一问一答）
- 第 9 章：把工具从「进程内函数」升级为「跨进程标准协议」（MCP）
- 第 10 章：框架把这个循环产品化（重试/并发/观测全内置）

---

## ⚠️ 常见坑

1. **忘把带 tool_calls 的 assistant 消息 push 进历史**——下次请求模型看不到自己调过什么，直接报错或重复调用。7.4 的 `messages.push(message)` 不能省。
2. **`tool_call_id` 对不上或少回一条**——assistant 消息里有几个 `tool_call`，后面就要有几条 `role: "tool"`，id 严格用 `call.id` 原值。只处理第一个调用、其余不回，下一轮 API 直接 400（第 08 章常见坑会再遇到它）。
3. **`JSON.parse` 放在 try 外面，或解析完不校验就用**——模型给的参数同样是概率输出：可能不是合法 JSON，也可能字段缺失、类型滑动。解析和 Zod 校验都放进 try（第 4 章的肌肉记忆）。
4. **照抄旧教程的 `call.function.name`，升级 openai 7.x 后编译报错**——`tool_calls` 已是 `function | custom` 联合类型，先 `call.type === "function"` 收窄（2026-11 复核）。同理，`max_tokens` 在 OpenAI 官方类型里已标弃用：调 OpenAI 官方推理模型改用 `max_completion_tokens`，DeepSeek 等兼容厂商以其文档为准。
5. **把工具结果给用户看**——用户要看的是模型的自然语言总结，不是原始 JSON。区分「给模型的中间结果」和「给用户的最终回答」。
6. **无限循环没有熔断**——模型反复调用同一工具不收敛。步数上限 + 「连续相同调用检测」双保险（第 8 章实现）。
7. **description 用中文担心模型不理解**——主流模型对中文工具描述的理解没有问题；关键是用模型服务的语言风格写清楚边界，语言本身不是障碍。

## ✍️ 动手练习

**基础**：
1. 跑通 7.4 完整代码（`pnpm exec tsx demos/ch07-tool-loop.ts`）；然后做压力测试：问 10 个问题（5 个该用工具的、5 个不该用的），统计工具误用率（该调不调/不该调乱调）。把误用的 case 记下来，**改 description 修复**——体会「调工具的不是你的代码，是你写的描述」。
2. 加第 4 个工具 `getShippingFee(city: string)`（mock 数据），验证模型能组合三个工具（订单+运费+计算器）回答复合问题。先跑一遍配套的离线测试 `code/test/tool-loop.test.ts`（在 `code/` 里 `pnpm test`），照着它给新工具补一条 `executeToolCall` 的测试：城市不存在时返回什么？

**进阶**：
3. **网页摘要工具**：`fetchAndExtract(url)` 用 `fetch` + 正则剥 HTML 标签（或用 `cheerio`），返回正文前 2000 字。让模型回答「总结 xxx 网页要点」——你已经造出了迷你版「联网搜索」。
4. 把工具执行改成**并发**（`Promise.all` 处理同一轮的多个 tool_calls，注意 tool 消息仍要一一对应 `call.id`），并用 `model.complete()` 返回的 `usage` 累计一次对话的总 token——为多工具场景测量「单次问答成本」。

## 🧠 自测清单

1. 六步流程完整复述。「模型从不执行函数」意味着什么（安全视角）？
2. `finish_reason` 为 `"tool_calls"` 和 `"stop"` 分别代表什么？
3. 工具 description 的三要素？参数为什么必须过 Zod？
4. 失败处理的三层各拦什么？「错误也是提示词」怎么理解？
5. 工具返回值设计的核心原则？大结果集怎么处理？
6. 工具设计七原则能说出几个？「原子性」与安全有什么关系？
7. 并行 tool_calls 是什么？回传时最容易犯的错是什么？
8. openai 7.x 里为什么要先写 `call.type === "function"`？把模型换成 GPT-6 系列时，本章的循环要改成什么 API？

## 🔗 延伸阅读

- OpenAI Function Calling 官方指南（格式标准出处；含 `parallel_tool_calls`、strict 模式与 Responses API 的说明）：https://developers.openai.com/api/docs/guides/function-calling
- Anthropic Tool Use 文档（含「如何写好工具描述」的官方建议，与本章七原则互证）：https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- DeepSeek Function Calling（中文，兼容格式实测说明）：https://api-docs.deepseek.com/

---

➡️ 下一章：[第 08 章 · 手写 Agent 循环（ReAct）](第08章-手写Agent循环ReAct.md)——把这颗心脏装进完整的躯体。
