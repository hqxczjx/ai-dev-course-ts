# 核对报告 V3 —— MCP 与框架章节（第 09-11 章）

- 核对对象：`03-Agent篇/第09章-MCP协议.md`、`第10章-Agent框架实战.md`、`第11章-多Agent系统.md`
- 核对日期：2026-10-11
- 核对方式：全部对照官方一手来源（modelcontextprotocol.io、ts.sdk.modelcontextprotocol.io、npm registry、github.com/modelcontextprotocol、code.claude.com、docs.langchain.com、mastra.ai、openai.github.io、a2a-protocol.org、arxiv.org）
- 总结论：**46 项核对中 40 项 ✅、4 项 ⚠️（措辞级）、1 项 ❌（toFetchHandler 写法不存在）、1 项版本速查补充**。三个包的版本号（server/client 2.3.1、sdk 1.32.1、playwright/mcp 0.0.83、@openai/agents 0.20.0）与 npm latest 精确一致；LangGraph/Mastra/OpenAI Agents 的全部 API 写法逐字核对通过。唯一的硬错误是 9.6 节的 `toFetchHandler` 导入。

---

## 第一部分：第 09 章 MCP 协议

### 1. v2 包名与版本

> 教程原文：「MCP TS SDK 当前主线是 **v2 拆分包**：`@modelcontextprotocol/server` 与 `@modelcontextprotocol/client`（2.3.1）。网上大量旧教程用的单体包 `@modelcontextprotocol/sdk`（1.32.1）仍在维护但属旧版」

**✅ 全部准确（三个版本号与 npm latest 逐一比对通过）**

- `@modelcontextprotocol/server` → npm latest = **2.3.1**
- `@modelcontextprotocol/client` → npm latest = **2.3.1**
- `@modelcontextprotocol/sdk` → npm latest = **1.32.1**

官方文档站确认：v2 是 "current stable release, which ships as separate packages"（即上述两个拆分包）；v1.x 单体包是 "the maintenance line"，将持续收到 bug 修复与安全更新 "at least six months after the v2 release (2026-07-27)"——即至少维护到 2027 年 1 月底。教程"仍在维护但属旧版"的描述准确。

- 来源：https://registry.npmjs.org/@modelcontextprotocol/server/latest 、https://registry.npmjs.org/@modelcontextprotocol/client/latest 、https://registry.npmjs.org/@modelcontextprotocol/sdk/latest 、https://ts.sdk.modelcontextprotocol.io/

### 2. Server 最小示例逐字核对

> 教程原文（9.2）：
> `import { McpServer } from "@modelcontextprotocol/server";`
> `import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";`
> `import * as z from "zod/v4";`
> `const server = new McpServer({ name: "order-server", version: "1.0.0" });`
> `server.registerTool("queryOrder", { description: ..., inputSchema: z.object({...}) }, async ({ orderId }) => ({ content: [{ type: "text" as const, text: ... }] }));`
> `const transport = new StdioServerTransport(); await server.connect(transport);`

**✅ 逐项与官方一致**

官方 SDK README 最小示例（原文摘录）：

```ts
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const server = new McpServer({ name: 'greeting-server', version: '1.0.0' });

server.registerTool(
    'greet',
    { description: 'Greet someone by name', inputSchema: z.object({ name: z.string() }) },
    async ({ name }) => ({ content: [{ type: 'text', text: `Hello, ${name}!` }] })
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
```

教程的导入路径、构造参数、registerTool 三段式签名、handler 返回 `{content:[{type:"text", text}]}`、transport 创建与 connect 全部与 README 逐字对应。官方 quickstart（modelcontextprotocol.io，TS 标签页）同样使用 `new McpServer({name, version})` + `registerTool(name, {description, inputSchema: z.object({...})}, handler)` + `new StdioServerTransport()` + `await server.connect(transport)`。

安装命令 `pnpm add @modelcontextprotocol/server zod` 与官方 quickstart 的 `npm install @modelcontextprotocol/server zod` 一致。

- 来源：https://github.com/modelcontextprotocol/typescript-sdk（README）、https://modelcontextprotocol.io/quickstart/server

### 3. stdio 禁 console.log；zod 为 peer dependency

> 教程原文：「**stdio Server 里严禁 `console.log`**——stdout 是 JSON-RPC 通道……调试日志一律走 `console.error`（stderr）」
> 「zod 从 `zod/v4` 子路径导入（SDK 的 peer 依赖要求，兼容 Zod ≥3.25）」

**禁 console.log：✅**。官方 quickstart（TypeScript 标签页）原话："**For STDIO-based servers:** Never use `console.log()`, as it writes to standard output (stdout) by default. Writing to stdout will corrupt the JSON-RPC messages and break your server."，最佳实践一节原话："Use `console.error()` which writes to stderr"。教程表述与官方完全一致。

**zod/v4：⚠️ 措辞需微调**。两个事实分立：

- "zod 是 SDK 的 peer dependency、兼容 Zod ≥3.25"——**✅** 官方文档站确认：zod 是 required peer dependency，SDK 内部从 `zod/v4` 导入，兼容 Zod v3.25+。
- "从 `zod/v4` 子路径导入是 peer 依赖的**要求**"——**不准确**。SDK README 示例确实用 `import * as z from 'zod/v4'`（教程与之一致），但官方 quickstart 用的是 `import { z } from "zod"`，且文档明说可以在自己的代码里从 `zod/v3` 或 `zod/v4` 任选导入。`zod/v4` 是**推荐/主线写法**，不是强制要求。另注：SDK v2 支持 Standard Schema（Zod v4 / Valibot / ArkType 均可）。

建议改为：「zod 是 SDK 的 peer 依赖（需 ≥3.25）；SDK 文档示例统一从 `zod/v4` 导入（也支持 `zod` 根导入与 Valibot/ArkType）」。

- 来源：https://modelcontextprotocol.io/quickstart/server 、https://ts.sdk.modelcontextprotocol.io/ 、https://github.com/modelcontextprotocol/typescript-sdk

### 4. Client 示例

> 教程原文（9.4）：`new Client({ name, version })`、`new StdioClientTransport({ command, args })`、`await client.connect(transport)`、`const { tools } = await client.listTools()`、`await client.callTool({ name, arguments })`，content 过滤 `type === "text"`。

**✅ 全部与官方 client 教程一致**（`docs/get-started/first-client.md` 原文摘录）：

```ts
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const client = new Client({ name: 'my-first-client', version: '1.0.0' });
const transport = new StdioClientTransport({ command: 'npx', args: ['tsx', 'src/index.ts'] });
await client.connect(transport);

const { tools } = await client.listTools();   // 每项含 name、description（及 inputSchema）
const result = await client.callTool({ name: 'get-alerts', arguments: { state: 'CA' } });
for (const block of result.content) { if (block.type === 'text') console.log(block.text); }
```

`listTools()` 返回 `{tools: [{name, description, inputSchema}]}` 中 inputSchema 字段由协议规范保证：server-concepts 文档的 Tool 定义示例即含 `name / description / inputSchema`（JSON Schema），`tools/list` "Returns: Array of tool definitions with schemas"。教程 9.4 注释「MCP server 给的是 JSON Schema」正确。

- 来源：https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/docs/get-started/first-client.md 、https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts

### 5. Claude Code 接入

> 教程原文（9.3）：
> `claude mcp add order-server -- node ./order-server/index.ts`
> `claude mcp add --transport http order-server https://your-host/mcp`
> `.mcp.json`：`{ "mcpServers": { "order-server": { "command": "node", "args": [...] } } }`
> 「`--scope project` 生成，可提交进仓库」「scope local/project/user」「`claude mcp list`；`/mcp`」

**✅ 全部正确**

- 官方语法：`claude mcp add [options] <name> -- <command> [args...]`，双横线 `--` 用于分隔 Claude 自身选项与服务器启动命令，文档明确提示"若不带 `--`，服务器自身的参数（如 `--port`）会被 Claude Code 当作自己的选项解析"。
- HTTP：`claude mcp add --transport http <name> <url>`，官方示例 `claude mcp add --transport http notion https://mcp.notion.com/mcp`。
- `.mcp.json` stdio 格式（顶层 `mcpServers` → name → `command`/`args`）与官方一致；HTTP 格式 `{"type":"http","url":...}` 一致（官方还注明 `streamable-http` 是 `http` 的别名，只有 `url` 没有 `type` 是配置错误）。
- scope 三种 local（默认，存 `~/.claude.json`）/ project（`.mcp.json`，随仓库共享）/ user（所有项目），优先级 local > project > user。教程「`--scope project` 生成 `.mcp.json`」与官方行为一致。
- `claude mcp list` 与会话内 `/mcp` 均存在。
- 9.3 末尾「Claude Desktop 写进 `claude_desktop_config.json` 后完全重启」也与官方 quickstart 一致（配置路径与"完全退出应用重启"的警告均见 quickstart）。

- 来源：https://code.claude.com/docs/en/mcp 、https://modelcontextprotocol.io/quickstart/server

### 6. @playwright/mcp

> 教程原文（9.5）：「`@playwright/mcp`（0.0.83，2026-10 核实）」「`claude mcp add playwright npx @playwright/mcp@latest` # 默认有头模式；--headless 无头」「基于**无障碍树快照**……不是截图+视觉模型」

**版本与事实：✅；接入命令：⚠️ 缺 `--`**

- npm latest = **0.0.83**，精确吻合；微软维护、Apache-2.0。
- README 确认默认有头：`--headless` 选项描述为 "run browser in headless mode, **headed by default**"。
- 无障碍树说法与 README 原话一致："This server enables LLMs to interact with web pages through **structured accessibility snapshots**"、"Uses Playwright's **accessibility tree**, not pixel-based input"、"No vision models needed, operates purely on structured data"。
- 教程列举的工具名 `browser_navigate / browser_click / browser_type / browser_fill_form / browser_snapshot / browser_take_screenshot` 全部存在（另有 browser_press_key、browser_evaluate、browser_tabs 等；vision 坐标点击属可选 `--caps`）。
- ⚠️ `claude mcp add playwright npx @playwright/mcp@latest` 少了 `--` 分隔符，与本章 9.3 自己强调的官方语法不一致。建议统一为：`claude mcp add playwright -- npx @playwright/mcp@latest`。
- 9.4 用例 `loadMcpTools("npx", ["-y", "@playwright/mcp@latest", "--headless"])` 作为 StdioClientTransport 参数没有问题（`--` 只是 claude mcp add 的 CLI 语法，不适用于通用 client）。

- 来源：https://registry.npmjs.org/@playwright/mcp/latest 、https://raw.githubusercontent.com/microsoft/playwright-mcp/main/README.md

### 7. 远程传输包 @modelcontextprotocol/hono 与 toFetchHandler

> 教程原文（9.6）：「v2 提供了框架中间件包（Hono/Express/Fastify）」
> `import { toFetchHandler } from "@modelcontextprotocol/hono";  // 中间件适配层（以官方文档示例为准）`
> 「具体挂载 API 以 ts.sdk.modelcontextprotocol.io 当前示例为准」

**包存在：✅（npm 2.0.2，peer 依赖 hono ^4.11.4 与 @modelcontextprotocol/server ^2.3.0；v2 适配包共四个：`node` / `express` / `fastify` / `hono`——教程列了三个，少提了 `@modelcontextprotocol/node`，无伤大雅）**

**`toFetchHandler` 导入写法：❌ 不存在**。核对了 `@modelcontextprotocol/hono` 的源码入口（`src/index.ts` 仅 re-export `./hono`、host/origin 校验中间件），其唯一公开的挂载相关导出是 `createMcpHonoApp`；全部相关源码与文档中均无 `toFetchHandler`。官方当前推荐写法（docs/serving/hono.md 原文）：

```ts
import { createMcpHonoApp } from '@modelcontextprotocol/hono';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import type { Context } from 'hono';
import * as z from 'zod/v4';

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: 'order-server', version: '1.0.0' });
  server.registerTool('queryOrder',
    { description: '...', inputSchema: z.object({ orderId: z.string() }) },
    async ({ orderId }) => ({ content: [{ type: 'text', text: '...' }] }));
  return server;   // 工厂每请求执行一次
});

const app = createMcpHonoApp();   // 预装 JSON body 解析 + Host/Origin 校验（防 DNS rebinding）
app.all('/mcp', (c: Context) => handler.fetch(c.req.raw, { parsedBody: c.get('parsedBody') }));
export default app;
```

要点：transport 的构建被 `createMcpHandler`（来自 `@modelcontextprotocol/server`）封装，不需要手动 `new StreamableHTTPServerTransport()`；鉴权不是靠 `app.use` 挡在前面拦截（虽然加自定义中间件仍然可行），官方示例是在 `handler.fetch` 第二参数透传 `authInfo`：`handler.fetch(c.req.raw, { authInfo: await verifyToken(c.req.raw), parsedBody: c.get('parsedBody') })`。绑定 `0.0.0.0` 时需传 `allowedHosts`，否则默认 localhost 校验失效（安全细节，可入"常见坑"）。

教程此段自己标注了"以官方文档示例为准"的免责，示意代码未真正调用挂载函数，属于占位写法——但 `toFetchHandler` 这个名字是虚构的，读者照抄会得到 import 错误，应替换为上面的官方写法。

- 来源：https://registry.npmjs.org/@modelcontextprotocol/hono/latest 、https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/packages/middleware/hono/src/index.ts 、https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/packages/middleware/hono/src/hono.ts 、https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/docs/serving/hono.md

### 8. MCP Registry

> 教程原文（9.7）：「官方 Registry（registry.modelcontextprotocol.io）：程序化的 Server 注册中心，可搜索/按版本过滤」

**✅** 站点可达，为官方 MCP server 注册中心，支持搜索、分页、按"最近更新"排序、"仅显示最新版本"过滤，提供公开 API，GitHub 开源。

- 来源：https://registry.modelcontextprotocol.io/

### 9.（顺带核对）三大原语与传输

> 教程原文（9.1）：Tools「模型可调用的函数」/ Resources「可读取的数据」/ Prompts「预写的提示模板」；「stdio 本地 / Streamable HTTP 远程」

**✅** 与官方 server-concepts 一致（Tools = model-controlled 可调用函数；Resources = 只读数据源，"file contents, database schemas"；Prompts = 参数化模板、斜杠命令式调用；两种传输的定位也是官方标准表述）。

- 来源：https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts

---

## 第二部分：第 10 章 Agent 框架实战

### 10. 框架表版本号（2026-10 核实声明）

> 教程原文（10.1 表格）：`ai` 7.x ｜ `@langchain/langgraph` 1.x ｜ `langchain` 1.x ｜ `mastra` 1.x ｜ `@openai/agents` 0.20 ｜ `@anthropic-ai/claude-agent-sdk` 0.3 ｜ `agents` 0.28 ｜ `llamaindex` 0.12.1

**✅ 八项全部与 npm latest 吻合**：ai 7.0.137；@langchain/openai 1.6.2（1.x 线）；mastra 1.33.0；@openai/agents 0.20.0；@anthropic-ai/claude-agent-sdk 0.3.296；agents（Cloudflare）0.28.0；llamaindex 0.12.1（精确匹配）。

**「LlamaIndex.TS 已归档、2026-03 起、停更半年+」：✅** GitHub API 确认 `run-llama/LlamaIndexTS` 仓库 `archived: true`，最后推送 2026-03-11——距今 7 个月，与教程描述精确吻合。

- 来源：https://registry.npmjs.org/（各包 /latest）、https://api.github.com/repos/run-llama/LlamaIndexTS

### 11. LangGraph 1.x API（10.3 代码逐项）

> 教程原文：
> `import { StateGraph, StateSchema, MessagesValue, START, END, MemorySaver, interrupt, Command } from "@langchain/langgraph";`
> `const State = new StateSchema({ messages: MessagesValue });`
> `new StateGraph(State).addNode(...).addEdge(START, "agent").addConditionalEdges("agent", routeByRisk, { safe: END, risky: "review" }).addEdge("review", END).compile({ checkpointer: new MemorySaver() })`
> `const config = { configurable: { thread_id: "..." } }; graph.invoke({...}, config)`
> 节点内 `interrupt(payload)`；恢复 `graph.invoke(new Command({ resume: true }), config)`

**✅ 逐项与官方文档一致**

- 导入源与各符号：overview 页原文 `import { StateSchema, MessagesValue, type GraphNode, StateGraph, START, END } from "@langchain/langgraph"`；persistence 页原文 `import { MemorySaver, MemoryStore } from "@langchain/langgraph"`；interrupts 页原文 `import { interrupt } from "@langchain/langgraph"`、`import { Command } from "@langchain/langgraph"`。教程把七个符号都从 `@langchain/langgraph` 导入，正确。
- `new StateSchema({ messages: MessagesValue })`：overview 页逐字一致（`const State = new StateSchema({ messages: MessagesValue })`）。
- `new StateGraph(State)` / `.addNode` / `.addEdge(START, node)` / `.addEdge(node, END)`：一致。
- `.addConditionalEdges(source, routerFn, mapping)`：graph-api 页确认三参数形式，映射示例 `{ true: "nodeB", false: "nodeC" }` 与教程 `{ safe: END, risky: "review" }` 同构（映射值可以是 END）。
- `.compile({ checkpointer: new MemorySaver() })`：persistence 页原文 `const checkpointer = new MemorySaver(); const graph = builder.compile({ checkpointer, store })`。
- `graph.invoke(input, { configurable: { thread_id: "thread-1" } })`：persistence 页逐字一致。
- `interrupt(payload)` 返回值即 resume 值、`graph.invoke(new Command({ resume: true }), config)`（同 thread_id）：interrupts 页逐字一致。文档另注明 `resume` 是唯一可用于 invoke 输入的 Command 参数。

**⚠️ 一处措辞需微调（10.3 核心概念 1）**：「每个超步后自动存档状态——**进程崩了、重启后同 thread_id 从断点继续**……（MemorySaver 换成 DB 后端即可生产）」。官方 persistence 文档明确 `MemorySaver` 数据在内存、**进程重启即丢**，"跨进程恢复"需要 `PostgresSaver`/`SqliteSaver` 等 DB 后端。教程括号里的补充是对的，但前半句紧挨 MemorySaver 语境，易被读成"MemorySaver 也能跨进程恢复"。建议把"进程崩了、重启后……"移到"换 DB 后端"之后，如：「每个超步后自动存档状态；生产环境用 DB checkpointer（PostgresSaver 等）后，进程崩了、重启后同 thread_id 可从断点继续——演示用 MemorySaver 存内存，重启即丢」。

- 来源：https://docs.langchain.com/oss/javascript/langgraph/overview 、https://docs.langchain.com/oss/javascript/langgraph/persistence 、https://docs.langchain.com/oss/javascript/langgraph/interrupts 、https://docs.langchain.com/oss/javascript/langgraph/graph-api

### 12. interrupt 三条规矩（10.3 概念 2 / 常见坑 3）

> 教程原文：「不能 try/catch 包住 interrupt、同节点多个 interrupt 必须按索引顺序恢复、payload 要 JSON 可序列化」

**✅ 三条全部与官方 interrupts 文档一一对应**

- try/catch：官方专节标题 "Do not wrap `interrupt` calls in try/catch"，原话 "interrupt() pauses execution at the point of the call **is by throwing a special exception**"——包在 try/catch 会捕获该异常导致中断失效。教程「它靠抛特殊异常暂停图」的原理表述也一致。
- 按索引：官方说明匹配 "**strictly index-based**"、"the order of interrupt calls within the node is important"，要求节点每次执行时调用顺序一致、禁止条件性跳过、禁止非确定性循环内调用。
- 可序列化：官方 "Do not return complex values in `interrupt` calls"，"complex values may not be serializable (e.g. you can't serialize a function)"。

（官方另有第四条教程未提：interrupt 之前的副作用必须幂等，因为节点恢复时会从头重跑——可作为可选补充，不是错误。）

- 来源：https://docs.langchain.com/oss/javascript/langgraph/interrupts

### 13. LangChain 1.x：createAgent / tool 的 schema 参数名 / ChatOpenAI

> 教程原文（10.3 末）：「LangChain.js（1.x）……`createAgent({ model, tools })` 是 LangGraph 之上的高层封装（官方原话「LangChain 的 agents 构建在 LangGraph 之上」）……旧 AgentExecutor 已非主线」

**API 写法：✅**。官方 agents 文档：`import { createAgent } from "langchain"`、`createAgent({ model: "google:gemini-3.6-flash", tools })`，支持 `systemPrompt`、`checkpointer`、`middleware` 等参数；该页示例直接从 `@langchain/langgraph` 导入 `MemorySaver`/`StateSchema`，且全页不出现 AgentExecutor（佐证其已非主线）。

**⚠️ "官方原话"的引号用法**：当前 agents 文档页**没有**逐字出现「LangChain 的 agents 构建在 LangGraph 之上」这句话（事实方向正确——文档展示 agent 状态即 LangGraph State、复用其 checkpointer）。建议把"官方原话"改为转述，如「官方文档的 agent 执行与持久化直接基于 LangGraph（示例即用 @langchain/langgraph 的 checkpointer）」。

> 教程原文（10.2 对照 AI SDK 的 tool 与 10.3）：`tool(fn, {name, description, schema})` 的参数名是 `schema`（非 zodSchema）

**✅**。官方示例（原文）：

```ts
import { tool } from "langchain";
var search = tool(({ query }) => `Results for: ${query}`, {
  name: "search",
  description: "Search for information",
  schema: z.object({ query: z.string() }),
});
```

选项字段确为 `schema`，无 `zodSchema`。

> 教程原文（10.3）：`new ChatOpenAI({ model, configuration: { baseURL, apiKey } })` 与 `.bindTools(tools)`

**✅**。`@langchain/openai`（1.6.2）类型定义：`BaseChatOpenAIFields` 中 `configuration?: ClientOptions`（JSDoc："Optional configuration options for the OpenAI client"），`ClientOptions` 即 openai 官方 SDK 的客户端选项类型（含 `baseURL`、`apiKey`）——自定义 baseURL 走 `configuration` 的写法成立。`.bindTools()` 在 README 多处出现（如 `model.bindTools([computer])`）。

- 来源：https://docs.langchain.com/oss/javascript/langchain/agents 、https://cdn.jsdelivr.net/npm/@langchain/openai@1.6.2/dist/chat_models/base.d.ts 、https://unpkg.com/@langchain/openai/README.md

### 14. Mastra（10.4）

> 教程原文：
> `import { Agent } from "@mastra/core/agent"; import { Memory } from "@mastra/memory";`
> `new Agent({ id, name, instructions, model, tools, memory })`，`model: "openai/gpt-5-nano"`（字符串模型路由）
> `new Memory({ options: { lastMessages: 20 } })`、`agent.generate()` 返回 `.text`、`createTool({ id, description, inputSchema, execute })`

**✅ 全部一致**

- `new Agent({id, name, instructions, model, tools, memory})`：官方示例含 id/name/instructions/model/tools；memory 字段在 memory 文档的 Agent 示例中出现（`memory: new Memory({ options: { lastMessages: 20 } })` 逐字一致）。
- model 字符串：官方说明 model 为 "a string in Mastra's model router format"，格式 `provider/model`（官方示例 `'openai/gpt-5.6-sol'`）。教程的 `"openai/gpt-5-nano"` 格式正确（具体模型名为示例值）。
- `agent.generate()` 返回含 `text`（及 toolCalls、toolResults、steps、token usage）：官方 `const response = await agent.generate('...'); console.log(response.text)`。
- `createTool({id, description, inputSchema, execute})` 从 `@mastra/core/tools` 导入，inputSchema 用 Zod（也支持 Valibot/ArkType；官方还推荐 outputSchema，execute 签名为 `(inputData, context)`）。
- 「建在 Vercel AI SDK 的 provider 协议上」：Mastra 文档确认 model router 基于 AI SDK provider 体系（教程此句方向正确）。

- 来源：https://mastra.ai/docs/agents/overview 、https://mastra.ai/docs/memory/overview 、https://mastra.ai/docs/tools/overview

### 15. OpenAI Agents JS（10.5）

> 教程原文：
> `import { Agent, run } from "@openai/agents";`
> `const agent = new Agent({ name: "助手", instructions: "You are helpful." });`
> `const result = await run(agent, "写一首关于递归的俳句");`
> 「handoffs（Agent 间转接）、guardrails（输入/输出护栏，独立小模型校验）、agents-as-tools」「0.20 版未到 1.0」

**✅ 全部一致**。官方 README hello world（原文）：

```js
import { Agent, run } from '@openai/agents';
const agent = new Agent({ name: 'Assistant', instructions: 'You are a helpful assistant.' });
const result = await run(agent, 'Write a haiku about recursion in programming.');
console.log(result.finalOutput);
```

- npm latest = **0.20.0**，教程「0.20」与「未到 1.0」准确。
- 文档站存在 `guides/handoffs` 与 `guides/guardrails` 章节（InputGuardrail/OutputGuardrail 类型齐全）；guardrails 典型为独立（更小/更快）模型并行校验，教程描述方向正确。
- agents-as-tools：JS 文档的 multi-agent orchestration 章节 + `AgentTool` 覆盖该模式（Python 文档有同名专页），概念存在。
- 教程正文用了 `result.finalOutput`（10.5 代码块外文字描述未展开，11.6 提及 handoff/agent-as-tool 均正确）。

- 来源：https://raw.githubusercontent.com/openai/openai-agents-js/main/README.md 、https://openai.github.io/openai-agents-js/ 、https://registry.npmjs.org/@openai/agents/latest

---

## 第三部分：第 11 章 多 Agent 系统

### 16. A2A 协议

> 教程原文（11.6）：「A2A……2025 年由 Google 联合 50+ 家推出」「a2a-protocol.org」

**✅ 基本准确**。站点可达（"A2A Protocol — Agent2Agent Protocol"）；官网首页确认协议 "originated by Google"、现已 "donated to the Linux Foundation"。"50+ 家合作伙伴、2025 年发布"与 Google 2025-04-09 Cloud Next 公告一致（首批合作方 50+ 家，含 Salesforce、SAP、ServiceNow、Atlassian、Box 等；2025-06 捐给 Linux Foundation）。注：当前官网首页已不再展示"50+"这一数字，此数字来自发布公告。

**建议补充（可选）**：教程可加一句「2025 年中已捐赠给 Linux Foundation 基金会中立治理」——这是现状的重要一环，也是"MCP（Anthropic 主导）vs A2A（LF 治理）"对比时的准确坐标。

- 来源：https://a2a-protocol.org/

### 17. 三篇论文 arXiv 编号（第 8.6 引用，10/11 章复用）

> ReAct 2210.03629 ｜ Plan-and-Solve 2305.04091 ｜ Reflexion 2303.11366

**✅ 三个编号全部正确**（摘要页逐一核对）：

| 编号 | 标题 | 作者 | 提交 |
|---|---|---|---|
| 2210.03629 | ReAct: Synergizing Reasoning and Acting in Language Models | Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du, Izhak Shafran, Karthik Narasimhan, Yuan Cao（Princeton/Google "Brain" 团队） | 2022-10-06 |
| 2305.04091 | Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models | Lei Wang, Wanyu Xu, Yihuai Lan, Zhiqiang Hu, Yunshi Lan, Roy Ka-Wei Lee, Ee-Peng Lim | 2023-05-06 |
| 2303.11366 | Reflexion: Language Agents with Verbal Reinforcement Learning | Noah Shinn, Federico Cassano, Edward Berman, Ashwin Gopinath, Karthik Narasimhan, Shunyu Yao | 2023-03-20 |

- 来源：https://arxiv.org/abs/2210.03629 、https://arxiv.org/abs/2305.04091 、https://arxiv.org/abs/2303.11366

---

## 需修改清单

按优先级排列：

1. **【必须改】9.6 `toFetchHandler` 写法不存在（唯一硬错误）**
   - 位置：第09章 9.6 节代码块 `import { toFetchHandler } from "@modelcontextprotocol/hono";`
   - 改为官方写法：`import { createMcpHandler, McpServer } from "@modelcontextprotocol/server"; import { createMcpHonoApp } from "@modelcontextprotocol/hono";`，挂载用 `const handler = createMcpHandler(() => server); const app = createMcpHonoApp(); app.all("/mcp", (c) => handler.fetch(c.req.raw, { parsedBody: c.get("parsedBody") }));`。鉴权可保留 `app.use` 中间件思路，但官方示例是在 `handler.fetch` 第二参数透传 `authInfo`（见本报告第 7 条完整代码）。
   - 顺带：v2 适配包共四个（`node`/`express`/`fastify`/`hono`），可在正文补全。

2. **【建议改】9.5 `claude mcp add playwright npx @playwright/mcp@latest` 缺 `--`**
   - 与 9.3 强调的官方语法 `claude mcp add <name> -- <command> [args...]` 不一致（官方警告：不带 `--` 时服务器参数会被 Claude Code 当作自己的选项解析）。
   - 改为：`claude mcp add playwright -- npx @playwright/mcp@latest`。

3. **【建议改】9.2 zod/v4 的"要求"措辞**
   - 「zod 从 `zod/v4` 子路径导入（SDK 的 peer 依赖要求，兼容 Zod ≥3.25）」→ zod 作为 peer dependency（≥3.25）正确，但 `zod/v4` 子路径是 SDK 文档示例的统一写法/推荐，不是强制（官方 quickstart 即用 `import { z } from "zod"`，且支持 Valibot/ArkType）。建议改为「推荐写法」。

4. **【建议改】10.3 MemorySaver 与"进程重启恢复"的因果顺序**
   - 「每个超步后自动存档状态——进程崩了、重启后同 thread_id 从断点继续……（MemorySaver 换成 DB 后端即可生产）」：官方明确 MemorySaver 存内存、进程重启即丢；跨进程恢复需 DB checkpointer（PostgresSaver/SqliteSaver）。建议把"进程崩了重启继续"明确挂在 DB 后端上，MemorySaver 只作演示。

5. **【可选改】10.3 「官方原话『LangChain 的 agents 构建在 LangGraph 之上』」**
   - 当前 agents 文档页无此逐字原话（事实方向正确）。建议改为转述：「LangChain 1.x 的 agent 执行与持久化直接构建在 LangGraph 之上（官方文档示例即复用 @langchain/langgraph 的 checkpointer 与状态定义）」。

6. **【可选补充】11.6 A2A 现状**
   - 加一句「A2A 已于 2025 年中捐赠给 Linux Foundation」，使"MCP vs A2A"的治理对比更准确。

其余核对项（含全部版本号、MCP Server/Client 示例、Claude Code 接入语法、.mcp.json 格式、Playwright MCP 事实、Registry、LangGraph 全部 API 与 interrupt 三规矩、LangChain createAgent/tool schema/ChatOpenAI、Mastra 全部 API、OpenAI Agents JS 全部 API、三篇 arXiv 编号、LlamaIndex.TS 归档状态、框架表八个版本号）均与官方一手来源一致，无需修改。
