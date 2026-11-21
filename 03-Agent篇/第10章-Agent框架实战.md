# 第 10 章 · Agent 框架实战

> 📋 **本章目标**
> 1. 建立 TS Agent 框架的完整地图与选型逻辑（面试必问「为什么用 X 不用 Y」）
> 2. 用 **Vercel AI SDK 的 ToolLoopAgent** 重写你的手写 Agent（主力框架，篇幅最大）
> 3. 用 **LangGraph.js（1.7）** 实现状态图编排 + 检查点恢复 + 人工介入
> 4. 认识 **Mastra**（TS 原生全家桶）与三个 demo 级框架（OpenAI Agents JS / Claude Agent SDK / Cloudflare Agents）
> 5. 知道哪些「名框架」已经掉队（LlamaIndex.TS 已停滞），会自己判断框架健康度
>
> 前置知识：第 07-09 章（手写工具循环/Agent/MCP）｜预计用时：10-16 小时
>
> 本章代码放在 `frameworks/` 目录，复用第 07 章的 `tools/index.ts`；各段都已按本课程 tsconfig 通过类型检查（不在 `code/` 里）。
>
> **岗位依据**：JD 常写「LangChain/LangGraph/Vercel AI SDK/…至少熟练一种（部分要求两种）」。你已经手写过裸 Agent——**框架对你不是黑盒，是「你写过的东西的封装」**。这是本章教你的方式，也是你面试的底气。

---

## 10.1 框架地图（2026-11 复核）

| 框架 | 包名@版本 | 定位 | 本课程定位 |
|---|---|---|---|
| **Vercel AI SDK** | `ai` 7.x（2026-11 为 7.0.172） | TS 生态事实标准：统一调用层 + Agent + UI hooks | **主力**（生态地基：Mastra/Cloudflare 都建在它的 provider 协议上） |
| **LangGraph.js** | `@langchain/langgraph` 1.7.x | 低层状态图编排运行时（JD 提及最多的名字） | **必学第二框架**（编排/持久化/HITL 深度） |
| LangChain.js | `langchain` 1.6.x | 建在 LangGraph 上的高层封装（`createAgent`） | 带过一节 |
| **Mastra** | `mastra` 1.39 / `@mastra/core` 1.83（Node ≥ 22.13） | TS 原生全功能：Agent+Memory+Workflows+Evals+RAG | **必学第三**（产品级全家桶） |
| OpenAI Agents SDK (JS) | `@openai/agents` 0.22 | OpenAI 官方多 Agent：handoffs/guardrails | demo 级了解 |
| Claude Agent SDK | `@anthropic-ai/claude-agent-sdk` 0.3 | 把 Claude Code 当引擎嵌入应用 | demo 级了解（新范式） |
| Cloudflare Agents | `agents` 0.33 | Durable Objects 有状态 Agent 运行时 | 部署章节了解 |
| ~~LlamaIndex.TS~~ | `llamaindex` 0.12.1 | RAG 框架 | **仓库已归档、停更半年+**——历史注记，不学（RAG 用第 12-13 章方案） |

**学习顺序的逻辑**（也是你回答「框架怎么选」的骨架）：裸 SDK 手写（已学）→ **AI SDK**（调用层统一，工具/流式/UI 一把抓）→ **LangGraph**（把「流程」显式化为图，补上持久化与人工介入）→ **Mastra**（全家桶承接产品化）。每个框架解决前一层的痛点，学完三个你就有了「按需组装」的眼光。

## 10.2 主力框架：Vercel AI SDK 的 Agent

第 8 章手写循环的每一个要件，AI SDK 都有对应物——对照着学最快：

| 你手写的 | AI SDK 的对应物 |
|---|---|
| `for (step < maxSteps)` 步数上限 | `stopWhen: isStepCount(8)` |
| finish 工具 | 循环自动终止（无工具调用即停），无需 hack |
| tool_calls 解析 + Zod + 执行 | `tool({ inputSchema, execute })` 全自动 |
| trajectory 数组 | `toUIMessageStream({ stream })` 顶层调用事件化（第 20 章可视化直接吃） |
| 预算熔断/循环检测 | 自己加（框架不管的，恰是你手写过的价值；7.0.154 起 `ToolLoopAgent` 提供 `onStepError`/`onError`/`onAbort` 回调可以挂钩，2026-11 复核） |

```ts
// frameworks/agent-aisdk.ts —— 用 AI SDK 重写第 8 章的任务 Agent
// 依赖：pnpm add ai @ai-sdk/openai zod dotenv
import "dotenv/config";
import { createOpenAI } from "@ai-sdk/openai";
import { ToolLoopAgent, tool, isStepCount } from "ai";
import { queryOrderTool, calcTool, getTimeTool } from "../tools";   // 第 7 章的导出（带 Tool 后缀）

// AI SDK 的模型实例：写法同第 05 章；lib/model.ts 是 ChatModel 端口，与 AI SDK 模型实例不同，所以就地创建
const provider = createOpenAI({ apiKey: process.env.API_KEY, baseURL: process.env.BASE_URL });
const model = provider.chat(process.env.MODEL ?? "deepseek-flash");   // .chat() = Chat Completions（兼容厂商都支持）

const agent = new ToolLoopAgent({
  model,
  instructions: "你是电商客服助手。能用工具获取的事实就不要凭记忆回答。",  // v7：system 已改名 instructions
  tools: {
    // 适配层：第 7 章的 ToolDef（parameters + execute）包进 v7 的 tool({ inputSchema, execute })
    queryOrder: tool({ description: queryOrderTool.description, inputSchema: queryOrderTool.parameters, execute: queryOrderTool.execute }),
    calculate: tool({ description: calcTool.description, inputSchema: calcTool.parameters, execute: calcTool.execute }),
    getCurrentTime: tool({ description: getTimeTool.description, inputSchema: getTimeTool.parameters, execute: getTimeTool.execute }),
  },
  stopWhen: isStepCount(8),   // 步数上限——v7 函数名 isStepCount（旧资料里的 stepCountIs 是 v5/v6 写法）
});

const result = await agent.generate({           // v7：generate 接收 { prompt } 对象，不是裸字符串
  prompt: "订单 A001 到哪了？399 打 85 折加 15 运费多少钱？",
});
console.log(result.text);
```

两点说明：

- **模型实例就地创建**。写法和第 05 章 Next.js 项目里的 `lib/ai-sdk.ts` 相同（`createOpenAI` + `.chat()` 走 Chat Completions，DeepSeek 等兼容厂商都能用）。本项目的 `lib/model.ts` 是 `ChatModel` 端口（第 07 章引入），和 AI SDK 的模型实例是两回事，所以这里就地创建。注意 `@ai-sdk/openai` 的 `openai(id)` 默认走 Responses API，对兼容厂商要用 `.chat(id)`（2026-11 复核）。
- **适配层只有三行**：第 7 章的 `ToolDef` 本来就是 description + Zod + execute，换成 `tool({ description, inputSchema, execute })` 即可。

想和第 8 章手写版对比，手写版这样调用：`runAgent({ goal, tools: defaultTools, model: openAIModel("deepseek-flash") })`——`model` 参数是 `ChatModel`，不是模型名字符串。

何时用它、何时退回 `generateText`（官方定位）：`ToolLoopAgent` 管「LLM+工具+循环」的标准 Agent；**需要逐步显式控制（自定义终止、注入中间步骤、非标准循环）时退回 `generateText`/`streamText` 手搓**——你在第 8 章练的正是后者，两头都会。

## 10.3 第二框架：LangGraph.js（编排与持久化）

LangGraph 的世界观：**Agent 是一张状态图**——节点是步骤（LLM 调用或普通代码），边是转移（可条件分支），状态在图里流动。它补上 AI SDK 不管的两件事：**把流程显式建模**（确定性步骤与 LLM 步骤混排）与**生产级持久化**（checkpointer 断点恢复）。

```ts
// frameworks/agent-langgraph.ts —— 状态图版：客服 Agent（审核节点 + HITL + 检查点恢复）
// 依赖：pnpm add @langchain/langgraph@^1.7 @langchain/openai @langchain/core dotenv
import "dotenv/config";
import { StateGraph, StateSchema, MessagesValue, START, END, MemorySaver, interrupt, Command } from "@langchain/langgraph";
import { RemoveMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";   // 也支持自定义 baseURL（兼容厂商）

const State = new StateSchema({ messages: MessagesValue });
type S = typeof State.State;
const llm = new ChatOpenAI({ model: process.env.MODEL ?? "deepseek-flash", configuration: { baseURL: process.env.BASE_URL, apiKey: process.env.API_KEY } });
const system = { role: "system", content: "你是电商客服助手。涉及退款/投诉的回复必须先过审核。" } as const;

const agentNode = async (state: S) => ({
  messages: [await llm.invoke([system, ...state.messages])],
});

// 「高风险输出审核」节点：人工介入的标准写法
const reviewNode = async (state: S) => {
  const last = state.messages.at(-1);
  // interrupt() 让整张图在此暂停并存档；payload 要带上「要审的内容」，否则审批人不知道在批什么
  const { approved } = interrupt({ question: "这条回复涉及退款/投诉，是否放行？", content: String(last?.content ?? "") }) as { approved: boolean };
  if (approved) return {};
  return {   // 驳回：把有风险的原回复从状态里删掉，换成兜底话术
    messages: [
      ...(last?.id ? [new RemoveMessage({ id: last.id })] : []),
      { role: "ai", content: "（人工驳回，改为兜底话术：已为您转接人工客服）" },
    ],
  };
};

// 条件边的判定函数：看模型最后一句话是否触碰高风险词（代码决定，不是模型决定）
const routeByRisk = (state: S): "safe" | "risky" => {
  const last = String(state.messages.at(-1)?.content ?? "");
  return /退款|投诉/.test(last) ? "risky" : "safe";
};

const graph = new StateGraph(State)
  .addNode("agent", agentNode)
  .addNode("review", reviewNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", routeByRisk, { safe: END, risky: "review" })  // 条件边：代码决定，不是模型
  .addEdge("review", END)
  .compile({ checkpointer: new MemorySaver() });   // 纯内存：只能同一进程内恢复；跨进程换持久化 checkpointer

// 运行：thread_id 是「会话」的单位——同一 thread 重入即恢复
const config = { configurable: { thread_id: "user-42-thread-1" } };
await graph.invoke({ messages: [{ role: "user", content: "我要退款" }] }, config);
const snapshot = await graph.getState(config);
console.log("暂停在：", snapshot.next);   // 回复触碰了高风险词时是 ["review"]；否则图已经结束，是 []
if (snapshot.next.length > 0) {
  // 审批人做出决定后，用同一个 thread_id 注入决定，图从断点继续（同一进程内）
  const final = await graph.invoke(new Command({ resume: { approved: true } }), config);
  console.log(final.messages.at(-1)?.content);
}
```

（审批放行与驳回两条路径已用假 LLM 节点在 `@langchain/langgraph` 1.7.4 上实测：放行保留原回复；驳回用 `RemoveMessage` 删掉原回复并换成兜底话术。）

三处需要留意的写法：

- **`interrupt` 的 payload 带上要审的内容**（`content: last.content`），审批人才知道自己在批什么。
- **恢复值用对象 `{ approved: boolean }`，不用裸布尔**。`@langchain/langgraph` 1.7.0 之前，`Command({ resume: false })` 这类假值会抛 `EmptyInputError`，驳回路径根本走不到；1.7.0 起假值才能正常传进 `interrupt()`。对象写法在新旧版本都安全，依赖也锁到 `^1.7`（2026-11 复核）。
- **要让图里的 LLM 用第 7 章的工具**，`llm.bindTools()` 不认识我们的 `ToolDef`。做法是用 `@langchain/core/tools` 的 `tool(fn, { name, description, schema })` 包一层，再 `bindTools`，并在图里加一个 `ToolNode` 节点和 `toolsCondition` 条件边（`agent →(有工具调用)→ tools → agent`），这几个 API 都从 `@langchain/langgraph/prebuilt` 导入。

三个核心概念吃透（面试 LangGraph 就问这三个）：

1. **Checkpointer + thread_id**：每个超步（superstep）后自动存档状态，thread_id 是「会话」的寻址单位。注意 **MemorySaver 是纯内存版，仅开发演示用**——只能在同一个进程里挂起再恢复，进程一退出检查点就没了；真正的「崩了重启从断点续跑」要换持久化 checkpointer：本地用 `@langchain/langgraph-checkpoint-sqlite` 的 `SqliteSaver.fromConnString("./checkpoints.db")`，生产用 Postgres 版。这正是第 8 章手写版**没有**的能力，这里是框架级机制。
2. **interrupt() / Command**：HITL 的标准姿势——节点里 `interrupt(payload)` 抛出暂停，图冻结在检查点；外部 `new Command({ resume })` 注入人的决定。注意四条规矩：不能 try/catch 包住 interrupt、同节点多个 interrupt 必须按索引顺序恢复、payload 要 JSON 可序列化、**interrupt 之前已产生的副作用必须幂等**（恢复机制靠重放执行路径）。1.7 起每个 interrupt 有独立 id，可以用 `{ [id]: value }` 映射一次恢复多个（2026-11 复核）。
3. **图的价值**：确定性步骤（if 风险 → 审核）与 agentic 步骤（LLM 节点）在同一张图里显式混排——这就是第 8.1 节「工作流为骨、Agent 为肉」的工程化表达。

> LangChain.js（1.x）一段话带过：`createAgent({ model, tools })` 是构建于 LangGraph 之上的高层封装（看依赖清单即知：`langchain` 1.x 的 dependencies 里直接有 `@langchain/langgraph`），面试提到「LangChain 1.x 主 API 是 createAgent，旧 AgentExecutor 已非主线；LangGraph 的 `createReactAgent` 也已弃用，迁到 `import { createAgent } from "langchain"`」即可证明你跟得上版本。

## 10.4 第三框架：Mastra（TS 原生全家桶）

前两个是「库」，Mastra 是「应用框架」——像 Next.js 之于 React，它把 Agent 产品要的全套都给了：

```ts
// frameworks/mastra.ts —— Mastra 的样子：Agent + 工具 + 记忆（Memory 必须配 storage）
// 依赖：pnpm add @mastra/core @mastra/memory @mastra/libsql zod   （Node ≥ 22.13）
import "dotenv/config";
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { queryOrderTool } from "../tools";

// Mastra 的工具必须用 createTool 包装（裸对象工具会静默不执行）；schema 直接复用第 7 章的 Zod
const queryOrder = createTool({
  id: "queryOrder",
  description: queryOrderTool.description,
  inputSchema: queryOrderTool.parameters,
  execute: async (input) => queryOrderTool.execute(input),
});

export const assistant = new Agent({
  id: "assistant",
  name: "客服助手",
  instructions: "你是电商客服助手。能用工具获取的事实就不要凭记忆回答。",
  // 课程三件套：带 url 的配置对象走 OpenAI 兼容端点（Chat Completions）
  model: { providerId: "deepseek", modelId: process.env.MODEL ?? "deepseek-flash", url: process.env.BASE_URL, apiKey: process.env.API_KEY },
  tools: { queryOrder },
  memory: new Memory({ options: { lastMessages: 20 } }),   // ← 内置记忆！第 14 章的对照物
});

export const mastra = new Mastra({
  agents: { assistant },
  // Memory 必须有 storage：这里注册在 Mastra 实例上。":memory:" 是演示用内存库，持久化换成文件 URL
  storage: new LibSQLStore({ id: "mastra-storage", url: ":memory:" }),
});
```

三个要点（2026-11 复核）：

- **Memory 必须配 storage**。官方原话是 Memory「requires a storage provider」，只 `new Memory()` 不配存储，记忆不会按预期工作。上面用 `@mastra/libsql` 的 `LibSQLStore` 注册在 `Mastra` 实例上。
- **模型用三件套**。带 `url` 的配置对象会走 OpenAI 兼容端点（Mastra 内部用 `createOpenAICompatible` 创建模型），`BASE_URL`/`API_KEY`/`MODEL` 原样复用。也可以直接写 `"openai/gpt-6-luna"` 这类字符串，但那要配 OpenAI 的 key。实测直接传一个 `@ai-sdk/openai` v7 的模型实例，在 `@mastra/core` 1.83 下类型检查不通过（它内置的 provider 类型版本不同），所以这里用配置对象。
- **工具必须用 `createTool` 包装**，裸对象工具会静默不执行。

四件套对应你学过的概念：**Memory**（第 14 章：消息历史/工作记忆/语义回忆；「观察式记忆」Observational Memory 会在后台把旧消息压缩成观察日志，但要在 `options` 里显式开启 `observationalMemory: true`，开启后 `lastMessages` 不再生效）→ **Workflows**（`createStep`+`.then()` 串联，suspend/resume 即 HITL；读取前序步骤结果用 `getStepResultAsync`，1.82 起 `getStepResult` 已弃用）→ **Evals**（内置 faithfulness/hallucination 等 scorers，Vitest 集成——第 15 章对照）→ **RAG**（chunking/向量库/rerank——第 13 章对照）。**它建在 Vercel AI SDK 的 provider 协议上**——你 10.2 学的模型接入知识直接复用。课程里没有用 Mastra 搭的项目；学第 14 章记忆、第 15 章评测时，可以把它当对照物。

## 10.5 三个 demo 级框架（各一节，知道「什么时候想到它」）

**OpenAI Agents SDK（JS）**——OpenAI 官方的多 Agent 编排，概念与 Python 版对齐：

```ts
// frameworks/openai-agents.ts
import { Agent, run } from "@openai/agents";
const agent = new Agent({ name: "助手", instructions: "You are helpful." });
const result = await run(agent, "写一首关于递归的俳句");
console.log(result.finalOutput);
```

独有概念值得记名字：**handoffs**（Agent 间转接）、**guardrails**（输入/输出护栏，独立小模型校验）、**agents-as-tools**（第 11.6 会讲）。0.22 版（2026-11-12 发布）仍未到 1.0，API 可能变动，生产使用需锁版本。它默认调 OpenAI 官方模型、读 `OPENAI_API_KEY`；接兼容厂商要另配模型提供方（文档里的 `OpenAIChatCompletionsModel`、`setDefaultModelProvider`）。

**Claude Agent SDK（TS）**——新范式代表：**把 Claude Code 本身当引擎**。SDK 内嵌 Claude Code 原生二进制，`query()` 返回异步消息流，你复用它的整套工具（文件/shell/搜索）与权限系统（`permissionMode`、`canUseTool` 回调、`allowedTools`）。适合「我要一个能干活的编程 Agent 产品」——相当于把第 9 章「接入 Claude Code」反转为「以库的方式拥有它」。绑定 Claude 计费体系，选型时算清账。

**Cloudflare Agents SDK**——「agents are Durable Objects」：每个会话一个持久对象（本地 SQLite 状态、WebSocket 长连、定时任务、休眠不计费）。适合**有状态、多端实时同步**的 Agent 产品（如长期陪伴型助手）。0.31 起 MCP 相关包改为可选 peer 依赖，要用它的 MCP 能力需自行安装 `@modelcontextprotocol/server`（2026-11 复核）。放第 19 章部署语境里再体会。

## 10.6 框架健康度：自己会判断（比背清单重要）

LlamaIndex.TS 的教训（2026-03 起仓库归档、停更）：名框架也会死。三步体检法（五分钟）：

1. `registry.npmjs.org/<pkg>/latest`——最近发布日期（>6 个月警惕）
2. GitHub 仓库 `archived` 标志与最近 push
3. 文档站是否活跃（changelog）

同样体检你简历上写的每个库——面试官会问「为什么用它」，**「因为它是 2024 年的教程用的」是最差答案，「我查过维护状态与生态位」是最好答案**。

## 10.7 选型决策树（面试直接用）

```
需求是什么？
├─ 只要统一调模型 + 流式 + 工具 + 聊天 UI → Vercel AI SDK（地基，几乎总是它）
├─ 流程复杂：确定性分支 + LLM 步骤混排、要断点恢复/HITL → + LangGraph.js
├─ 要记忆/评测/RAG/工作流全家桶、快速产品化 → + Mastra
├─ 深度绑定 OpenAI 生态的多 Agent（handoffs/guardrails）→ @openai/agents
├─ 要一个「能编程干活的」Agent 产品 → Claude Agent SDK
└─ 长期有状态 + 实时多端 → Cloudflare Agents（运行时层面）
```

组合是常态：**AI SDK 做地基 + LangGraph 管流程 + Mastra 的某个模块按需取用**，不冲突。

---

## ⚠️ 常见坑

1. **拿 v4-v6 时代的 AI SDK 教程写 v7 代码**：v5 之前的写法（`parameters`、`maxSteps`、`ai/react`）会直接报错；`generateObject` 自 v6 起弃用。v6→v7 的改名——`system`→`instructions`、`onFinish`→`onEnd`、`stepCountIs`→`isStepCount`——旧名仍能跑但已弃用、会告警，新代码用新名；`agent.generate` 只收 `{ prompt }` 对象。useChat 的 `api`/`body` 收进 `DefaultChatTransport` 是 v5 起的变化（第 5 章已按新名写）（2026-11 复核）。
2. **新旧 State 写法混用**：1.x 文档主推 `StateSchema`/`MessagesValue`；`Annotation.Root` 仍然导出、仍能运行，但已不是文档主线，新代码不要两种写法混着用。文档统一在 docs.langchain.com（旧站已重定向）。
3. **interrupt() 包在 try/catch 里**：恢复机制直接失效（它靠抛特殊异常暂停图）。同节点多个 interrupt 的恢复必须按顺序。
4. **用裸布尔恢复：`new Command({ resume: false })`**：`@langchain/langgraph` 1.7.0 之前会抛 `EmptyInputError`，驳回分支永远走不到。锁 `^1.7`，并用对象 payload `{ approved: false }`。
5. **以为 MemorySaver 能跨进程恢复**：新进程里 `invoke(new Command({ resume }))` 不报错，但拿到的是空状态，什么也没恢复。跨进程（两个终端、重启后续跑）必须用 `SqliteSaver`/Postgres 这类持久化 checkpointer。
6. **Mastra 的 Memory 不配 storage**：记忆不会按预期持久化。在 `Mastra` 实例（或 Agent）上配置 storage，如 `@mastra/libsql`。
7. **以为上了框架就不用懂原理**：面试和排障都会把你打回原形。框架坏时（重试逻辑不符合预期、步骤计数对不上），没有第 8 章的手写经验就是睁眼瞎。
8. **同时学五个框架**：主线三个（AI SDK/LangGraph/Mastra）已经覆盖 JD 全部关键词，其余 demo 级即可。

## ✍️ 动手练习

**基础**：
1. 用 ToolLoopAgent 重写第 8 章的三个任务，对比手写版（`runAgent({ goal, tools: defaultTools, model: openAIModel("deepseek-flash") })`）的总步数与 token（预期：差不多——框架的收益在工程件不在效果）。
2. 跑通 LangGraph 的 agent→review→END 图，**在同一个进程里**体验 interrupt 暂停与 Command 恢复，放行、驳回各跑一次。想用两个终端模拟「Agent 挂起 / 审批人恢复」，先把 `MemorySaver` 换成 `SqliteSaver.fromConnString("./checkpoints.db")`（`pnpm add @langchain/langgraph-checkpoint-sqlite`；pnpm 12 需要 `pnpm approve-builds` 放行 better-sqlite3），再把「启动」和「恢复」拆成两条命令。

**进阶**：
3. （**学完第 11 章再做**）用 LangGraph 重做第 11 章的主从式调研流水线（规划/执行/写作各为节点，用 `SqliteSaver` 持久化——`MemorySaver` 做不到跨进程），中途 kill 进程再重启，验证从断点续跑——**「断点恢复」从此是你真正做过的功能，不是背的概念**。
4. 用 Mastra 重建项目 1 的对话（带 Memory，记得配 storage；`LibSQLStore` 换成文件 URL 才能在重启后保留），对比它内置记忆与你手写「截断 20 轮」的差别，写 200 字结论。
5. 对 `@openai/agents`、`agents`（Cloudflare）、`llamaindex` 各做一次 10.6 的健康度体检，把结果记入学习笔记。

## 🧠 自测清单

1. 教学顺序「手写→AI SDK→LangGraph→Mastra」的理由链？
2. 手写循环的五个要件在 AI SDK 里的对应物？框架不管什么（恰需你手写经验的）？
3. LangGraph 三核心（checkpointer/interrupt/图混排）各自解决什么？interrupt 的四条规矩？为什么 MemorySaver 做不到跨进程恢复？
4. Mastra 四件套与教程哪些章节一一对应？Memory 少配了什么会出问题？
5. 三个 demo 级框架各自「什么时候想到它」？
6. 框架健康度体检三步？LlamaIndex.TS 的现状说明什么？

## 🔗 延伸阅读

- Vercel AI SDK Agents 文档（ToolLoopAgent/HarnessAgent）：https://ai-sdk.dev/docs/agents/overview
- LangGraph JS 文档（新站）：https://docs.langchain.com/oss/javascript/langgraph/overview （interrupts 专页：…/langgraph/interrupts）
- Mastra 文档：https://mastra.ai/docs
- OpenAI Agents JS：https://openai.github.io/openai-agents-js/
- Claude Agent SDK（TS）：https://code.claude.com/docs/en/agent-sdk/typescript

---

➡️ 下一章：[第 11 章 · 多 Agent 系统](第11章-多Agent系统.md)——从单兵作战到团队协作。
