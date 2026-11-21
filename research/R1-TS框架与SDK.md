# R1 调研：TS/JS 生态的 LLM 应用开发 SDK 与 Agent 框架

> 调研日期：2026-10-11。全部结论经联网核实（官方文档、GitHub API、npm registry 优先），不代表训练记忆。
> 核实方法：官方文档站（WebFetch）、npm registry 版本接口（registry.npmjs.org/<pkg>/latest）、GitHub API 仓库元数据。
> 注意：npm 版本号随时间变化快，文中版本号为 2026-10-11 当天快照。

---

## 0. 总览表（截至 2026-10-11 核实）

| 框架 | npm 包 | 当前版本 | License | 状态 | 一句话定位 |
|---|---|---|---|---|---|
| Vercel AI SDK | `ai` | 7.0.137 | Apache-2.0 | 活跃（仓库 2026-10-10 仍有推送，27,228 stars） | TS 生态事实标准的 LLM 统一调用层 |
| OpenAI Agents SDK (JS/TS) | `@openai/agents` | 0.20.0 | MIT | 活跃（未到 1.0） | OpenAI 官方多 Agent 编排框架的 TS 版 |
| LangChain.js | `langchain` | 1.5.16 | MIT | 活跃（1.0 已发） | 轻量可配的 Agent 框架（createAgent） |
| LangGraph.js | `@langchain/langgraph` | 1.4.21 | MIT | 活跃（1.0 已发） | 低层状态图编排运行时（LangChain 1.0 的底座） |
| Mastra | `mastra` / `@mastra/core` | 1.33.0 / 1.75.0 | Apache-2.0 | 活跃 | TS 原生全功能 Agent 应用框架 |
| Claude Agent SDK (TS) | `@anthropic-ai/claude-agent-sdk` | 0.3.296 | 见 README | 活跃（0.x 快速迭代） | 把 Claude Code 当编程引擎嵌入应用 |
| LlamaIndex.TS | `llamaindex` | 0.12.1（2025-12-02 发布） | MIT | **停滞（GitHub 仓库已归档）** | RAG / 上下文工程框架 |
| Cloudflare Agents SDK | `agents` | 0.28.0 | MIT | 活跃（未到 1.0） | 基于 Durable Objects 的有状态 Agent 运行时 |

来源：各包 `https://registry.npmjs.org/<pkg>/latest`；stars/推送时间为 `https://api.github.com/repos/vercel/ai` 等。

---

## 1. Vercel AI SDK

- **定位**：官方自述 "The AI Toolkit for TypeScript. From the creators of Next.js, the AI SDK is a free open-source library for building AI-powered applications and agents"（GitHub 仓库描述）。免费开源，npm license 为 Apache-2.0。
- **包名/版本**：`ai`，7.0.137（来源：https://registry.npmjs.org/ai/latest）。**当前大版本为 v7**。
- **仓库**：https://github.com/vercel/ai（27,228 stars，2026-10-10 仍在推送，未归档）。
- **文档**：https://ai-sdk.dev/docs/introduction （旧域名 sdk.vercel.ai 已指向此处）

### 1.1 三大模块（v7 文档结构，与 v4 时代差异很大）

来源：https://ai-sdk.dev/docs/introduction

1. **AI SDK Core**：统一 API 生成文本、结构化对象、工具调用、构建 agent。
2. **AI SDK UI**：框架无关的 chat/生成式 UI hooks。
3. **AI SDK Harnesses**（v7 新板块）：统一 API 运行既有成熟 agent harness（Claude Code、Codex、Pi、Cursor、Cline 等），核心类 `HarnessAgent`。（来源：https://ai-sdk.dev/docs/agents/overview 及 sitemap 中 `/docs/ai-sdk-harnesses/*`）

### 1.2 核心 API 清单

来源：https://ai-sdk.dev/docs/ai-sdk-core/overview 、https://ai-sdk.dev/docs/agents/overview 、https://ai-sdk.dev/docs/ai-sdk-ui/overview

- `generateText({ model, prompt })`：一次性生成文本与工具调用。
- `streamText({ model, messages })`：流式输出（`result.textStream`）。
- **结构化输出已并入 `output` 属性**：`generateText/streamText` 通过 `output: Output.object() / Output.array()` 生成经 Zod schema 校验的类型化数据。**注意：v4 时代的独立函数 `generateObject` / `streamObject` 已不再出现在当前 Core 文档的主线中**——教学应改用 `output` 属性写法（截至 2026-10 核实）。
- `tool({ description, inputSchema, execute })`：工具定义。**注意：参数名是 `inputSchema`（Zod），不是 v4 的 `parameters`**；多步循环用 `stopWhen: isStepCount(5)` + `onStepEnd` 控制。
- **Agent 抽象**：
  - `ToolLoopAgent`（主推）：官方推荐的 Agent 类，封装 "LLM + tools + loop"；需要逐步显式控制时退回 `generateText`/`streamText`。文档定义 Agent = "LLMs that use tools in a loop to accomplish tasks"。
  - `HarnessAgent`：运行预置 harness（Claude Code、Codex、Pi 等）。
- **UI hooks**：`useChat` / `useCompletion` / `useObject`，按框架分包：`@ai-sdk/react`、`@ai-sdk/vue`、`@ai-sdk/svelte`、`@ai-sdk/angular`（SolidJS 为社区包）。注意不再是 `ai/react` 子路径。
- 相关状态/上下文：`runtimeContext`（跨步骤共享运行时状态）、`toolsContext`（每工具独立 context）。

### 1.3 Provider 体系

来源：https://ai-sdk.dev/docs/getting-started/choosing-a-provider

- **默认全局 provider 是 Vercel AI Gateway**（`@ai-sdk/gateway`）：配 `AI_GATEWAY_API_KEY` 后可直接用字符串模型名，如 `model: 'anthropic/claude-sonnet-5.5'`。Gateway 支持 OpenAI、Anthropic、Google 等，是"最快上手"路径，但**不是必须**。
- **直连 provider**：安装 `@ai-sdk/openai`、`@ai-sdk/anthropic` 等官方包后 `import { anthropic } from '@ai-sdk/anthropic'; model: anthropic('claude-sonnet-5-5')`。
- 可通过 provider management 更改全局默认；也支持自定义 provider（Language Model Specification）。

### 1.4 MCP 支持

来源：https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools

- 通过 `@ai-sdk/mcp` 包的 `createMCPClient()` 连接 MCP 服务器，取工具 `await mcpClient.tools()`，支持资源读写、prompt、elicitation、工具漂移检测。
- transport：`http`（StreamableHTTP，**生产推荐**）、`sse`、`stdio`（仅本地开发）、自定义 `MCPTransport` 接口。

```ts
import { createMCPClient } from '@ai-sdk/mcp';
const mcpClient = await createMCPClient({
  transport: { type: 'http', url: 'https://your-server.com/mcp',
               headers: { Authorization: 'Bearer my-api-key' } },
});
const tools = await mcpClient.tools();
```

### 1.5 官方最小示例（Node.js Quickstart，摘自 https://ai-sdk.dev/docs/getting-started/nodejs）

```bash
pnpm add ai zod dotenv
pnpm add -D @types/node tsx typescript
# .env: AI_GATEWAY_API_KEY=xxxxxxxxx
```

```ts
import { ModelMessage, streamText } from 'ai';
import 'dotenv/config';
import * as readline from 'node:readline/promises';

const messages: ModelMessage[] = [];
const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });

async function main() {
  while (true) {
    const userInput = await terminal.question('You: ');
    messages.push({ role: 'user', content: userInput });
    const result = streamText({ model: 'anthropic/claude-sonnet-5.5', messages });
    let fullResponse = '';
    process.stdout.write('\nAssistant: ');
    for await (const delta of result.textStream) {
      fullResponse += delta;
      process.stdout.write(delta);
    }
    messages.push({ role: 'assistant', content: fullResponse });
  }
}
main().catch(console.error);
```

前置条件：Node.js 22+。ToolLoopAgent 官方示例（摘自 https://ai-sdk.dev/docs/agents/overview）：

```ts
import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

const weatherAgent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-5.5',
  tools: {
    weather: tool({
      description: 'Get the weather in a location (in Fahrenheit)',
      inputSchema: z.object({ location: z.string().describe('The location to get the weather for') }),
      execute: async ({ location }) => ({ location, temperature: 72 + Math.floor(Math.random() * 21) - 10 }),
    }),
  },
});
const result = await weatherAgent.generate({ prompt: 'What is the weather in San Francisco in celsius?' });
```

---

## 2. OpenAI Agents SDK（JavaScript/TypeScript 版）

- **定位**：存在且为一等公民项目。README 自述 "a lightweight yet powerful framework for building multi-agent workflows"，provider-agnostic（不绑定 OpenAI）。
- **包名/版本**：`@openai/agents` 0.20.0（MIT）。分包：`@openai/agents-core`、`@openai/agents-openai`、`@openai/agents-realtime`（来源：https://registry.npmjs.org/@openai/agents/latest 与文档站 API Reference）。
- **运行时要求**：Node.js 22+、Deno、Bun；Cloudflare Workers 实验性（需 `nodejs_compat`）。
- **文档**：https://openai.github.io/openai-agents-js/ ；源码 https://github.com/openai/openai-agents-js （经 GitHub API README 核实）
- **核心概念**（与 Python 版同名对齐）：
  - `Agent`（instructions + tools + guardrails + handoffs 配置）
  - `run(agent, input)` / Runner / RunResult / StreamedRunResult
  - `handoff()` / `Handoff`：任务委派给其他 agent；agents-as-tools 多 agent 编排
  - Guardrails：`InputGuardrail` / `OutputGuardrail` / `defineToolInputGuardrail`
  - Sessions（跨运行历史）、Tracing（可视化调试）、MCP、Streaming、Human-in-the-loop
  - JS 版特有形态：`SandboxAgent`（文件系统工作区沙箱，Windows 需 `DockerSandboxClient`）、`RealtimeAgent`（WebRTC 语音）
- **与 Python 版的差异**：无官方对比/迁移页（guides 索引中无 "migrating from python"）。差异主要在工程形态：JS 按运行环境分包（core/openai/realtime），且有 Sandbox Agent 等新实验；概念模型（Agent/Runner/Handoff/Guardrail/Tracing）与 Python 版一致。

### 官方最小示例（摘自 GitHub README，https://github.com/openai/openai-agents-js）

```bash
npm install @openai/agents zod
```

```js
import { Agent, run } from '@openai/agents';

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant.',
});
const result = await run(agent, 'Write a haiku about recursion in programming.');
console.log(result.finalOutput);
```

---

## 3. LangChain.js 与 LangGraph.js

**重大变化（必须注意）**：两个旧文档站均已 308 永久重定向到统一新站 docs.langchain.com：
- `js.langchain.com/docs/introduction` → `https://docs.langchain.com/oss/javascript/langchain/overview`
- `langchain-ai.github.io/langgraphjs` → `https://docs.langchain.com/oss/javascript/langgraph/overview`
教程中的引用链接一律用新地址（截至 2026-10 核实）。

### 3.1 LangChain.js

- **定位**：官方自述 "Agent = Model + Harness"，LangChain 是 "a highly customizable harness"（模型循环周围的一切：prompt、tools、middleware）。
- **包名/版本**：`langchain` 1.5.16（MIT，来源：https://registry.npmjs.org/langchain/latest）。**1.0 已发布**：`langchain` 1.x 直接依赖 `@langchain/langgraph`（^1.4.18）——官方文档明确 "LangChain's agents are built on top of LangGraph"。
- **分层产品**：Deep Agents（batteries-included：自动上下文压缩、虚拟文件系统、子 agent 生成）> LangChain `createAgent`（可定制 harness）> LangGraph（低层编排）> LangSmith（追踪/评估）。来源：https://docs.langchain.com/oss/javascript/langchain/overview
- **核心 API**：`createAgent`、`tool`（注意：1.x 的 tool 参数是 `schema` 而非旧版 `zodSchema`）、middleware。
- **官方最小示例**（摘自 https://docs.langchain.com/oss/javascript/langchain/overview）：

```ts
// npm install langchain zod @langchain/openai
import { createAgent, tool } from "langchain";
import * as z from "zod";

const getWeather = tool((input) => `It's always sunny in ${input.city}!`, {
  name: "get_weather",
  description: "Get the weather for a given city",
  schema: z.object({ city: z.string().describe("The city to get the weather for") }),
});

const agent = createAgent({ model: "gpt-5.5", tools: [getWeather] });
console.log(await agent.invoke({
  messages: [{ role: "user", content: "What's the weather in San Francisco?" }],
}));
```

（注意：旧版 `AgentExecutor` + prompt template 链式写法已不是 1.x 主线。）

### 3.2 LangGraph.js

- **定位**：官方自述 "a low-level orchestration framework and runtime for building, managing, and deploying long-running, stateful agents"，可在同一张图里混合确定性步骤与 LLM agentic 步骤。
- **包名/版本**：`@langchain/langgraph` 1.4.21（MIT，来源：https://registry.npmjs.org/@langchain/langgraph/latest），需同装 `@langchain/core`。
- **核心 API**：
  - 图构建：`StateGraph`、`StateSchema`（如 `{ messages: MessagesValue }`）、`GraphNode`、`addNode`、`addEdge`、`START`/`END`、`compile()`
  - 持久化：`compile({ checkpointer: new MemorySaver() })` + `configurable.thread_id`（生产换数据库后端 checkpointer）
  - **Human-in-the-loop**：节点内 `interrupt(payload)` 暂停（结果出现在 `__interrupt__` 字段），`new Command({ resume: value })` 恢复；支持 `responseSchema`（Zod）校验恢复值（需 >= 1.4.16）。规则：interrupt 不能包 try/catch、必须严格按索引顺序、传 JSON 可序列化值。来源：https://docs.langchain.com/oss/javascript/langgraph/interrupts
- **官方最小示例**（摘自 https://docs.langchain.com/oss/javascript/langgraph/overview）：

```ts
import { StateSchema, MessagesValue, type GraphNode, StateGraph, START, END } from "@langchain/langgraph";

const State = new StateSchema({ messages: MessagesValue });
const mockLlm: GraphNode<typeof State> = (state) => {
  return { messages: [{ role: "ai", content: "hello world" }] };
};
const graph = new StateGraph(State)
  .addNode("mock_llm", mockLlm)
  .addEdge(START, "mock_llm")
  .addEdge("mock_llm", END)
  .compile();
await graph.invoke({ messages: [{ role: "user", content: "hi!" }] });
```

HITL 最小用法（摘自 interrupts 文档）：

```ts
import { interrupt, Command, MemorySaver } from "@langchain/langgraph";
const graph = builder.compile({ checkpointer: new MemorySaver() });
const config = { configurable: { thread_id: "thread-1" } };
// 节点内：const approved = interrupt("Do you approve this action?");
await graph.invoke(new Command({ resume: true }), config);
```

---

## 4. Mastra

- **定位**：官方自述 "Mastra is a TypeScript framework for building AI agents and applications"——TS 原生的全功能 Agent 框架。
- **包名/版本**：CLI/工具包 `mastra` 1.33.0，核心 `@mastra/core` 1.75.0（均 Apache-2.0；来源：https://registry.npmjs.org/mastra/latest 、https://registry.npmjs.org/@mastra/core/latest）。
- **文档**：https://mastra.ai/docs （有 llms.txt 索引：https://mastra.ai/llms.txt）
- **脚手架**：`npm create mastra@latest`；依赖安装 `npm install @mastra/core@latest zod@latest typescript@latest @types/node@latest mastra@latest`。
- **核心模块**（来源：docs 首页与 llms.txt 索引）：
  - **Agent**：`new Agent({ id, name, instructions, model, tools })`，model 用字符串 `'openai/gpt-5.6-sol'`（Mastra model router，`OPENAI_API_KEY` 等环境变量自动鉴权；model 也可传对象或函数）。
  - **Tools**：`createTool({ id, description, inputSchema, execute })`（Zod；execute 签名 `execute(inputData, context)`）。
  - **Memory**（`@mastra/memory`）：消息历史、观察式记忆（后台压缩旧消息）、工作记忆（结构化用户数据）、语义回忆（向量检索）、多用户线程、记忆处理器；存储默认示例用 LibSQL（`@mastra/libsql`）。来源：https://mastra.ai/docs/memory/overview
  - **Workflows**：`createStep`（inputSchema/outputSchema/execute）+ `createWorkflow`，`.then()` 串联、`.commit()` 定稿；suspend/resume（human-in-the-loop）、快照、time-travel、定时工作流。来源：https://mastra.ai/docs/workflows/overview
  - **Evals**：内置 scorers（answer-relevancy、faithfulness、hallucination、toxicity 等）、自定义 scorer、数据集/实验、Vitest 集成、CI 中运行。
  - **RAG**：chunking/embedding、向量库（pg、Pinecone、Qdrant 等）、rerank、Graph RAG、`createVectorQueryTool` / `createGraphRAGTool`。
- **与 Vercel AI SDK 的关系**：`@mastra/core` 的 npm dependencies 直接依赖 `@ai-sdk/provider`（同时兼容 v5/v6/v7：`@ai-sdk/provider-v5/v6/v7` 别名指向对应 npm 包）和 `@ai-sdk/provider-utils`（来源：registry.npmjs.org/@mastra/core/latest 的依赖清单）。即 **Mastra 建立在 Vercel AI SDK 的 provider 协议体系之上**；Mastra 文档同时提示 "Don't install any AI SDK package unless Mastra's documentation says otherwise"（模型路由由 Mastra 托管）。
- **官方最小示例**（摘自 https://mastra.ai/docs）：

```ts
// src/mastra/agents/weather-agent.ts
import { Agent } from '@mastra/core/agent';
import { weatherTool } from '../tools/weather-tool.ts';

export const weatherAgent = new Agent({
  id: 'weather-agent',
  name: 'Weather Agent',
  instructions: `You are a helpful weather assistant...`,
  model: 'openai/gpt-5.6-sol',
  tools: { weatherTool },
});
```

```ts
import { mastra } from './src/mastra/index.ts';
const agent = mastra.getAgentById('weather-agent');
const response = await agent.generate('Weather in SF');
console.log(response.text);
```

Memory 配置示例（摘自 https://mastra.ai/docs/memory/overview）：

```ts
export const memoryAgent = new Agent({
  id: 'memory-agent', name: 'Memory Agent',
  memory: new Memory({ options: { lastMessages: 20 } }),
});
```

---

## 5. Claude Agent SDK（TypeScript 版）

- **定位**：以编程方式把 Claude Code 当作 agent 引擎嵌入 TS 应用——文档为 "Complete API reference for the TypeScript Agent SDK"。**SDK 内嵌原生 Claude Code 二进制**（"The SDK bundles a native Claude Code binary for your platform as an optional dependency"；SDK v0.3.191 bundles Claude Code v2.1.191，版本号同步）。这与"用 API 拼 agent"是不同范式：相当于复用 Claude Code 的全套工具/权限/harness。
- **包名/版本**：`@anthropic-ai/claude-agent-sdk` 0.3.296（来源：https://registry.npmjs.org/@anthropic-ai/claude-agent-sdk/latest）。peerDeps：`zod ^4`、`@anthropic-ai/sdk >=0.93.0`、`@modelcontextprotocol/sdk ^1.29.0`，各平台二进制为 optionalDependencies（Windows 有 win32-x64）。
- **文档**：https://code.claude.com/docs/en/agent-sdk/typescript （注意：docs.claude.com 与 platform.claude.com 的旧链接会多次重定向到此处，截至 2026-10 核实）
- **核心概念**：
  - `query({ prompt, options })`：主入口，返回 `AsyncGenerator<SDKMessage>` 流式消息；支持 `interrupt()`、`setModel()` 等方法。
  - `startup()` / `prewarm()`：预热子进程降低首查询延迟。
  - Sessions：`listSessions()`、`resume`、`forkSession()`、`renameSession()`/`tagSession()`。
  - 权限：`permissionMode`（`"default" | "acceptEdits" | "bypassPermissions" | "plan" | "dontAsk" | "auto"`），配合 `allowedTools`/`disallowedTools`、`canUseTool` 回调。
  - MCP：`mcpServers` 配置 stdio/SSE/HTTP 服务器；`createSdkMcpServer()` 创建与宿主同进程的 MCP 服务器；`tool()` 定义类型安全工具。
- **官方最小示例**（摘自文档 TypeScript API reference）：

```bash
npm install @anthropic-ai/claude-agent-sdk
```

```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Hello",
  options: { pathToClaudeCodeExecutable: cliPath },
})) {
  console.log(message);
}
```

（`pathToClaudeCodeExecutable` 仅在包管理器跳过 optional deps、找不到内嵌二进制时需要。）

---

## 6. LlamaIndex.TS

- **定位**：官方自述 "the leading framework for utilizing context engineering to build LLM applications in JavaScript and TypeScript"，主打 RAG（数据摄取、索引、检索）+ agents + 事件驱动 workflows + 结构化抽取；支持 Node.js、Deno、Bun、Cloudflare Workers。
- **包名/版本**：`llamaindex` 0.12.1（MIT；依赖 `@llamaindex/core` 0.6.22、`@llamaindex/workflow` 1.1.24 等；来源：https://registry.npmjs.org/llamaindex/latest）。
- **文档**：https://developers.llamaindex.ai/typescript/framework （旧域名 **ts.llamaindex.ai 已 308 重定向**至此，截至 2026-10 核实）。安装：`npm i llamaindex @llamaindex/openai @llamaindex/workflow`；脚手架 `create-llama`；运行 `npx tsx example.ts`。
- **核心能力**：数据 connectors（API/文件/SQL）、向量索引与检索（RAG）、query/chat engine、多 agent 工作流（`@llamaindex/workflow`）、可观测性；性能提示：Node 下装 `gpt-tokenizer` 可获得约 60 倍分词加速。（来源：安装指南 https://developers.llamaindex.ai/typescript/framework/getting_started/installation）
- **维护状态（重要风险提示，截至 2026-10 核实）**：
  - 源码仓库 **run-llama/LlamaIndexTS 已归档**（GitHub API `archived: true`，最后推送 2026-03-11，3,082 stars；来源：https://api.github.com/repos/run-llama/LlamaIndexTS）。
  - 最后一次 npm 发布：`llamaindex` 0.12.1，约 2025-12-02（来源：registry.npmjs.org/llamaindex/0.12.1 内部时间戳）。
  - run-llama/llama_index 主仓库是纯 Python monorepo，顶层无 TS 目录（来源：GitHub contents API）。
  - 结论：**LlamaIndex.TS 处于停滞/低维护状态（仓库已归档、半年以上未发版），但文档站仍在线、包仍可安装**。教程若引用，必须明确标注此状态；RAG 教学建议改用其他途径（如 Vercel AI SDK embeddings + 向量库，或 Mastra RAG）。

---

## 7. Cloudflare Agents SDK

- **定位**：构建**有状态** AI agent 的运行时：官方自述 "Durable identity, state, connections, scheduling, and recovery"（每个会话持久身份、本地 SQL 存储、实时 WebSocket 连接、定时任务、可恢复执行）。
- **与 Durable Objects 的关系**：**"agents are Durable Objects"**（官方文档原话）。类层次：`DurableObject → Server（partyserver 包）→ Agent → AIChatAgent`。来源：https://developers.cloudflare.com/agents/runtime/lifecycle/agent-class/ 。wrangler.jsonc 需注册 Durable Object 绑定 + `new_sqlite_classes` 迁移 + `nodejs_compat`。
- **包名/版本**：`agents` 0.28.0（MIT；来源：https://registry.npmjs.org/agents/latest）。peerDeps 值得注意：`ai ^6.0.0 || ^7.0.0`、`@ai-sdk/react ^3 || ^4`、`zod ^4`——**与 Vercel AI SDK 深度集成**（`agentTool()`（agents/agent-tools）"converts a Think or AIChatAgent subclass into an AI SDK tool definition"；`wrapAISDK()` 用于 tracing）。AI 聊天基类 `AIChatAgent` 来自 `@cloudflare/ai-chat` 包。
- **文档**：https://developers.cloudflare.com/agents/ ；源码开源在 GitHub（cloudflare/agents）。
- **脚手架**：`npm create cloudflare@latest -- --template cloudflare/agents-starter`，默认用 Workers AI，"No API keys required"。
- **核心 API**：`Agent<Env, State>` 类（`this.state`/`setState()`、`this.sql`、`@callable()` RPC、`schedule` 定时、MCP 客户端）；客户端 `useAgent`（agents/react，类型化 RPC `agent.stub.method()`）、`useAgentChat`（React 聊天 hook）、`AgentClient`（原生 JS）；工具生态：Browser、Sandbox、AI Search、MCP、Payments、Code Mode；harness（Pi、Think）。
- **官方最小示例**（摘自 https://developers.cloudflare.com/agents/getting-started/quick-start/）：

```ts
import { Agent, routeAgentRequest, callable } from "agents";

export class CounterAgent extends Agent<Env, CounterState> {
  initialState: CounterState = { count: 0 };

  @callable()
  increment() {
    this.setState({ count: this.state.count + 1 });
    return this.state.count;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return (await routeAgentRequest(request, env)) ?? new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
```

React 客户端：`useAgent<CounterAgent, CounterState>({ agent: "CounterAgent", onStateUpdate })` 后 `agent.stub.increment()`。状态自动持久化到 SQLite 并广播给所有连接的客户端；无连接时 agent 休眠不计费。
- **教程价值判断**：适合作为"部署/运行时"章节（有状态、多端同步、定时、休眠计费模型是独有价值），但其抽象绑定 Cloudflare 平台，不宜作为框架主线。

---

## 8. 对教程编排的建议

### 8.1 推荐教学顺序

1. **第 0 章：裸 Agent Loop（不教框架）**——直接用 `openai`（当前 7.x，为 `@openai/agents` 依赖所证）或 `@anthropic-ai/sdk` 原生 SDK 手写 while 循环：调 chat API → 解析 tool_calls → 执行本地函数 → 回填结果 → 直到无工具调用。理由：Vercel AI SDK 官方对 Agent 的定义就是 "LLMs that use tools in a loop"（https://ai-sdk.dev/docs/agents/overview），手写一遍后所有框架的抽象（stopWhen、steps、HITL）都有了参照物。
2. **第 1 阶段：Vercel AI SDK（主线，篇幅最大）**——理由：(a) TS 生态事实标准（27k stars、日更）；(b) 它的 provider 协议是整个生态的地基——Mastra 依赖 `@ai-sdk/provider`，Cloudflare Agents 的 peerDeps 直接声明 `ai ^6 || ^7`；(c) 文档质量高且分层清晰（Core/UI/Harnesses）。教：generateText/streamText → tool + inputSchema → 结构化输出（注意教 `output: Output.object()` 新写法，不教 v4 的 generateObject）→ ToolLoopAgent → useChat 聊天界面 → @ai-sdk/mcp 接 MCP。可直接用 Gateway 字符串模型名起步（一把 key 多家模型），再教直连 @ai-sdk/openai/@ai-sdk/anthropic。
3. **第 2 阶段：LangGraph.js（编排与持久化深度）**——教 StateGraph/StateSchema/addNode/addEdge、checkpointer + thread_id、interrupt/Command 实现 HITL。理由：LangChain 1.x 的 agent 就构建在它之上，且"确定性步骤 + agentic 步骤混合"与 HITL 是其它框架没有讲透的维度。LangChain.js（createAgent）只需带过一节作为"高层封装"。
4. **第 3 阶段：Mastra（产品级全功能框架）**——教 Agent + Memory（观察式记忆/工作记忆/语义回忆）+ Workflows（suspend/resume）+ Evals（vitest 集成）+ RAG。理由：TS 原生全家桶，正好承接前两阶段概念并展示工程化（存储、评估、部署）。
5. **Demo 级了解（每框架 1 节以内）**：
   - **OpenAI Agents SDK JS**：跑通 README 六行示例，讲 handoff/guardrails 概念即可；若教程主用非 OpenAI 模型可降为附录。
   - **Claude Agent SDK**：演示 query() 跑通内嵌 Claude Code 二进制，讲"把成品 coding agent 当引擎"的新范式与权限模式；注意它绑定 Claude 订阅/API 计费体系。
   - **Cloudflare Agents SDK**：演示 CounterAgent + useAgent 的有状态实时同步，放"部署与运行时"章节；不深入。
   - **LlamaIndex.TS**：**不建议作为教学主线**（仓库已归档、npm 半年未更新）；RAG 教学改用 Mastra RAG 或 Vercel AI SDK embedding + 向量库（pgvector/Qdrant 等），文中可加"历史注记"说明其状态。

### 8.2 编写时需特别注意的"记忆陷阱"（与 2024-2025 旧资料差异）

- Vercel AI SDK 已到 **v7**；`generateObject/streamObject` 主线让位于 `output` 属性；tool 用 `inputSchema` 而非 `parameters`；Agent 主推 `ToolLoopAgent`；新增 Harnesses 板块（HarnessAgent 可驱动 Claude Code/Codex 等）。
- LangChain/LangGraph 文档统一迁到 **docs.langchain.com**；两者均已 1.0：LangChain 主 API 是 `createAgent`（旧 AgentExecutor 非主线），LangGraph 1.x 用 `StateSchema`/`MessagesValue`（旧 `Annotation.Root` 写法勿再用）。
- Claude Agent SDK 文档现居 **code.claude.com**（旧链接多重定向）；SDK 与 Claude Code 版本号同步、内嵌原生二进制。
- LlamaIndex.TS 域名迁到 developers.llamaindex.ai 且**仓库已归档**。
- Cloudflare Agents 的 AI 聊天基类是 `@cloudflare/ai-chat` 的 `AIChatAgent`（主包 `agents` 提供 Agent/useAgent/useAgentChat/AgentClient）。

### 8.3 版本与链接核对清单（撰写各章时复核）

| 项目 | 核对点 | 查询地址 |
|---|---|---|
| ai / @ai-sdk/react | 最新大版本与 API 形态 | https://registry.npmjs.org/ai/latest ；https://ai-sdk.dev/docs/introduction |
| @openai/agents | 是否到 1.0 | https://registry.npmjs.org/@openai/agents/latest |
| langchain / @langchain/langgraph | 1.x 版本、StateSchema API | https://registry.npmjs.org/langchain/latest ；https://docs.langchain.com/oss/javascript/langgraph/overview |
| mastra / @mastra/core | 版本、@ai-sdk 依赖 | https://registry.npmjs.org/@mastra/core/latest |
| @anthropic-ai/claude-agent-sdk | 0.x 版本、捆绑的 Claude Code 版本 | https://code.claude.com/docs/en/agent-sdk/typescript |
| llamaindex | 是否恢复维护 | https://api.github.com/repos/run-llama/LlamaIndexTS |
| agents (Cloudflare) | 0.x 版本、ai peer 范围 | https://registry.npmjs.org/agents/latest |

---

## 附：本报告全部来源索引

- Vercel AI SDK：ai-sdk.dev（/docs/introduction、/docs/ai-sdk-core/overview、/docs/agents/overview、/docs/getting-started/nodejs、/docs/getting-started/choosing-a-provider、/docs/ai-sdk-core/mcp-tools、/docs/ai-sdk-ui/overview、/sitemap.xml）；registry.npmjs.org/ai/latest；api.github.com/repos/vercel/ai
- OpenAI Agents JS：openai.github.io/openai-agents-js/（首页与 guides 索引）；api.github.com/repos/openai/openai-agents-js/readme；registry.npmjs.org/@openai/agents/latest
- LangChain/LangGraph：docs.langchain.com/oss/javascript/langchain/overview、/oss/javascript/langgraph/overview、/oss/javascript/langgraph/interrupts；registry.npmjs.org/langchain/latest、/langgraph/latest；旧站重定向实测（js.langchain.com、langchain-ai.github.io/langgraphjs）
- Mastra：mastra.ai/docs、/docs/memory/overview、/docs/workflows/overview.md、/models/providers/openai.md、/llms.txt；registry.npmjs.org/mastra/latest、/@mastra/core/latest
- Claude Agent SDK：code.claude.com/docs/en/agent-sdk/typescript（含 docs.claude.com→platform.claude.com→code.claude.com 重定向链实测）；registry.npmjs.org/@anthropic-ai/claude-agent-sdk/latest
- LlamaIndex.TS：developers.llamaindex.ai/typescript/framework（/、/getting_started/installation、/tutorials/rag）；ts.llamaindex.ai 重定向实测；registry.npmjs.org/llamaindex/latest、/llamaindex/0.12.1；api.github.com/repos/run-llama/LlamaIndexTS、/repos/run-llama/llama_index/contents/、/orgs/run-llama/repos
- Cloudflare Agents：developers.cloudflare.com/agents/（首页、/getting-started/quick-start/、/api-reference/agents-api/、/runtime/lifecycle/agent-class/、/llms.txt）；registry.npmjs.org/agents/latest
