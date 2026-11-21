# Agent 框架 / 工具调用格式 / MCP·A2A 协议 / AI 编程工具：时效核查（截至 2026-11-13）

> 核查范围：附录 B（B2/B5/B6/B9）、`research/R7`、`research/R5`、CHANGELOG，第 06/07/08/09/10/11/14/22 章，外加第 02 章第 76-77 行（Claude Code 安装）。
> 课程上次复核：2026-10-22。本文所有来源的访问日期均为 **2026-11-13**。
> 方法：npm registry（`registry.npmjs.org` 的 `/latest` 与完整 packument 中的 `time` 字段）、jsDelivr 上的已发布 `.d.ts`（只读取，未安装），以及官方规范、文档和 CHANGELOG。本轮**没有运行**任何课程代码。下文"TS 报错"的结论来自对已发布类型定义的静态阅读。
> 判定：✅ 仍正确 / ⚠️ 需要更新（过时或不精确）/ ❌ 错误（照抄会出错，或与官方事实相反）。标注 **[10-22 后变化]** 的条目，是在课程上次复核之后才发生的变化。

---

## Q0 总览：必须改的条目（按优先级）

### Takeaway
最严重的问题有三处。第一处在第 7/8 章：手写工具循环与当前 `openai` 7.x 类型不兼容，第 8 章还会因并行工具调用触发 400。第二处在第 9 章：课程说"v2 SDK 已封装 2026-07-28 新规范，代码无需改动"，这与官方文档相反。第三处在第 22 章：用 MemorySaver 却要求"kill 进程后恢复"，验收无法通过。其余主要是版本号漂移和叙述更新。

### Cited Findings
**P0（照抄会报错，或验收必然失败）**
1. ❌ 第 7 章第 129/135/176-177 行、第 8 章第 130/136/140/146/159/168 行：`openai` 7.55.0 中 `ChatCompletionMessageToolCall = ChatCompletionMessageFunctionToolCall | ChatCompletionMessageCustomToolCall`，`ChatCompletionTool = ChatCompletionFunctionTool | ChatCompletionCustomTool`。custom 成员只有 `custom` 字段，没有 `function` 字段。因此直接写 `call.function.name` 或 `ChatCompletionTool["function"]["parameters"]` 会在 strict TS 下报 TS2339 — [openai@7.55.0 completions.d.ts 第 1388-1392、1154-1157、1461、1628 行](https://cdn.jsdelivr.net/npm/openai@7.55.0/resources/chat/completions/completions.d.ts)。
2. ❌ 第 8 章第 130 行只处理 `msg.tool_calls?.[0]`，第 148/172 行却把含**全部** tool_calls 的 assistant 消息 push 进历史，而且只回一条 tool 消息。模型一旦并行调用多个工具（OpenAI 默认允许，见下文 Q5），下一轮请求就会因 tool_call_id 缺少响应而 400。官方要求每个调用都必须有对应输出 — [OpenAI Function calling](https://developers.openai.com/api/docs/guides/function-calling)；[Anthropic Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)。
3. ❌ 第 9 章第 39 行写"v2 SDK 已封装这些细节，本章代码无需改动"，与官方相反。官方原话是："Wiring the server by hand with `server.connect(new StdioServerTransport())` still compiles, but a server started that way only serves 2025-era clients."，新写法是 `serveStdio(createServer)` — [MCP Build a server (2026-07-28)](https://modelcontextprotocol.io/docs/2026-07-28/develop/build-server)。客户端方面，`Client` 的 `versionNegotiation` 默认是 `'legacy'`，要走 2026-07-28 协议必须显式传 `{ versionNegotiation: { mode: "auto" } }` — [MCP Build a client](https://modelcontextprotocol.io/docs/2026-07-28/develop/build-client)；[@modelcontextprotocol/client@2.4.0 client-BTIWJvaF.d.mts（`@default 'legacy'`）](https://cdn.jsdelivr.net/npm/@modelcontextprotocol/client@2.4.0/dist/client-BTIWJvaF.d.mts)。
4. ❌ 第 22 章第 130 行用 `MemorySaver`，第 142 行的验收却是"kill 进程 → 重跑用 Command 恢复成功"。MemorySaver 是纯内存实现，进程退出后检查点就丢了，这与课程自己第 10 章第 129 行、第 22 章第 274 行的说法矛盾 — [LangGraph interrupts 文档（生产需持久化 checkpointer）](https://docs.langchain.com/oss/javascript/langgraph/interrupts)。

**P1（版本或叙述过时，或部分错误）**：MCP server/client 2.3.1→**2.4.0** [10-22 后变化]；LangGraph 1.5.x→**1.7.3** [10-22 后变化]；Mastra 1.35/1.79→**1.38.0/1.82.0** [10-22 后变化]；CF `agents` 0.29→**0.33.0** [10-22 后变化]；GPT-6 Astra / GPT-6.1 Sol 的工具调用必须走 Responses API，第 7/8 章需加警示；Mastra Memory 必须配 storage；mem0/Zep/Letta 都有官方 TS SDK；Cursor 规则类型已改名；Skill 的"5,000 token 预算"是误读；`/doctor` 的说法应改为 `/doctor prompt-audit`；Claude Code npm 安装"已 deprecated"的说法错误；A2A 的"Growth Stage"在一手来源中找不到依据；课程没有提到 AGENTS.md（Claude Code / Cursor / Codex 均已原生读取）。详见各节。

### Inferences
- 第 7/8 章的 P0 问题对 DeepSeek 等 OpenAI 兼容厂商同样成立，因为它来自 `openai` npm 包的类型，与服务端是谁无关。
- 第 9 章代码目前"能用"，是因为 Claude Code 等宿主会回退到 2025 握手。所以这是"概念错误加未来兼容风险"，不是"立即报错"。我把它列为 P0，是因为正文给读者的判断（无需改动）与官方原文相反，而且面试里会被追问。

### Gaps
- 本轮未在本机执行 `tsc` 复现 TS2339（本机没有全局 tsc，按约束也没有安装依赖）。结论基于已发布 `.d.ts` 的联合类型定义，可信度高，但建议维护者用课程的 tsconfig 实测一次。

---

## Q1 包版本：本章群涉及的 npm 包最新版本（2026-11-13）

### Takeaway
相比 10-22，MCP v2、LangGraph/LangChain、Mastra、Cloudflare `agents`、Playwright MCP 都有新版本。`@openai/agents`、`llamaindex`、`zod` 没有变化。

### Cited Findings
数据来源均为 npm registry（`https://registry.npmjs.org/<pkg>`，取 `dist-tags.latest` 与 `time`），访问日期 2026-11-13。

| 包 | 课程写法（位置） | 最新 latest（发布日） | 判定 | 建议替换 |
|---|---|---|---|---|
| `@modelcontextprotocol/server` / `client` | 2.3.1（第 9 章第 13 行；B5 第 72 行；B9 第 129 行"2.3.x"） | **2.4.0**（2026-10-23）[10-22 后变化] | ⚠️ | "2.4.0（2026-10-23）"；B9 写"2.4.x" |
| `@modelcontextprotocol/sdk`（v1 单体） | 1.32.1（第 9 章第 13 行；B5 第 72 行）/ 1.32.x（B9） | **1.32.2**（2026-10-23） | ⚠️（小版本） | "1.32.2，v1 维护线" |
| `@modelcontextprotocol/node` / `hono` / `express` / `fastify` | 第 9 章第 180 行只列包名 | 2.1.2（10-23）/ 2.0.2 / 2.0.2 / 2.0.1 | ✅ | — |
| `@langchain/langgraph` | 1.x（第 10 章第 21 行）/ 1.5.x（B9）/ "LangGraph 1.5 API"（第 22 章第 71 行） | **1.7.3**（2026-11-10）；1.5.3→1.6.0（10-30）→1.7.0（11-05）[10-22 后变化] | ⚠️ | B9 写"1.7.x"；第 22 章写"LangGraph 1.7 API" |
| `@langchain/core` | 未写 | 1.4.0（2026-11-11），依赖 `zod ^4.6.6` | 信息 | — |
| `@langchain/openai` | 未写版本（第 10 章第 85 行安装） | 1.8.4（2026-11-11） | 信息 | — |
| `langchain` | 1.x / 1.5.x（B9） | **1.6.5**（2026-11-11；1.6.0 于 10-28）[10-22 后变化] | ⚠️ | B9 写"1.6.x" |
| `@langchain/langgraph-checkpoint-postgres` / `-sqlite` | 课程只提 PostgresSaver | 1.1.2（10-21）/ 1.1.0（10-12） | 信息 | 见 Q3 |
| `mastra` / `@mastra/core` | 1.35 / 1.79（B9 第 127 行） | **1.38.0**（2026-11-03）/ **1.82.0**；`@mastra/core` 要求 `node >=22.13.0` [10-22 后变化] | ⚠️ | "mastra 1.38 / @mastra/core 1.82" |
| `@mastra/memory` | 未写 | 1.41.0（11-12 有更新），依赖 `zod ^4.6.7` | 信息 | — |
| `@mastra/libsql` | 未提 | 1.29.0 | 需新增（见 Q4） | — |
| `@openai/agents` | 0.21（第 10 章第 24 行；B2；B9） | **0.21.0**（2026-10-20），之后无新版 | ✅ | — |
| `@anthropic-ai/claude-agent-sdk` | 0.3（第 10 章第 25 行） | 0.3.322（2026-11-10） | ✅ | — |
| `agents`（Cloudflare） | 0.29（第 10 章第 26 行；B9 第 134 行） | **0.33.0**（2026-11-03）；0.30.0（10-22）、0.31.0（10-27）、0.32.0（10-29）[10-22 后变化] | ⚠️ | "agents 0.33" |
| `llamaindex` | 0.12.1（第 10 章第 27 行；B9） | 0.12.1（registry modified 2025-12-31） | ✅ | — |
| `@playwright/mcp` | 0.0.83（第 9 章第 164 行；B9） | **0.0.85**（2026-11-09；0.0.84 于 10-31）[10-22 后变化] | ⚠️ | "0.0.85" |
| `ai`（Vercel AI SDK） | 7.0.x（B9） | 7.0.170（2026-11-11），`node >=22` | ✅ | — |
| `openai` | 7.42.x（B9） | **7.55.0**（2026-11-10），`node >=22.0.0` | ⚠️ | "openai 7.55.x" |
| `zod` | 4.6.7（B5/B9） | 4.6.7 | ✅ | — |
| `@a2a-js/sdk` | 未提 | 1.3.0（2026-09-29） | 可选补充 | — |
| `@ag-ui/core` / `@ag-ui/client` | 未在本章群出现 | 1.0.4（2026-11-05） | 信息 | — |
| `mem0ai` / `@getzep/zep-cloud` / `@letta-ai/letta-client` | 第 14 章只提名字 | 3.3.1 / 4.1.0 / 1.12.1 | 见 Q8 | — |
| `@anthropic-ai/claude-code` | 第 2 章第 77 行称"deprecated" | 2.1.322（2026-11-10），registry 中**未标** deprecated | ❌（见 Q7） | — |
| `@openai/codex` | 未提 | 0.167.2 | 可选补充 | — |
| `@fission-ai/openspec` | B6 第 97 行"npm 安装" | **2.0.0**（2026-11-11，大版本）[10-22 后变化] | ⚠️（提示即可） | — |
| GitHub Spec Kit | B6 第 96 行 | v1.4.0（2026-11-10），仓库未归档 — [GitHub API](https://api.github.com/repos/github/spec-kit/releases/latest) | ✅ | — |

### Inferences
- 依赖链有一处值得提示：`@langchain/core` 1.4 依赖 `zod ^4.6.6`，与课程的 zod 4.6.7 兼容。`mem0ai` 3.3.1 仍依赖 `zod ^3.24.1`，与课程的 Zod 4 项目混装时会出现两份 zod，第 14 章若引入它需要提示。

### Gaps
- `@mastra/core` 与 `@openai/codex` 的完整 packument 太大，没能取到逐版本发布日。版本号以 `/latest` 为准，"11-12 有更新"取自 registry 的 `modified` 字段。

---

## Q2 MCP：规范版本、TS SDK API、传输与宿主接入

### Takeaway
2026-07-28 仍是当前（Current）规范。课程对"无状态、每请求版本协商、server/discover"的概括正确，但遗漏了几项重大变化：会话、GET 流和 SSE 断点续传都已移除；Roots/Sampling/Logging 已进入 Deprecated；服务器→客户端请求改为 MRTR。课程"代码无需改动"的结论是错的，服务端应改用 `serveStdio`，客户端应显式开启 `versionNegotiation: "auto"`。宿主接入写法（`claude mcp add`、`.mcp.json`、`claude_desktop_config.json`）仍然正确。

### Cited Findings
**规范事实**
- 当前协议版本是 **2026-07-28**（Current），之前的修订是 2025-11-25 — [MCP Versioning](https://modelcontextprotocol.io/specification/versioning)。
- 2026-07-28 的主要变化（逐条见 changelog）— [MCP 2026-07-28 Key Changes](https://modelcontextprotocol.io/specification/2026-07-28/changelog)：
  - 移除 `initialize`/`notifications/initialized` 握手。每个请求在 `_meta` 中携带 `io.modelcontextprotocol/protocolVersion` 与 `io.modelcontextprotocol/clientCapabilities`，版本不匹配时返回 `UnsupportedProtocolVersionError`（SEP-2575）。
  - 新增 `server/discover`，服务端 **MUST** 实现，客户端 **MAY** 先调用。
  - 移除协议级会话和 `Mcp-Session-Id`（SEP-2567）。移除 HTTP GET 流和 `resources/subscribe`，改用 `subscriptions/listen`。
  - 移除 `ping`、`logging/setLevel`；日志级别改为在每个请求的 `_meta` 中携带。
  - tasks 从核心协议移到官方扩展 `io.modelcontextprotocol/tasks`。
  - 引入 MRTR：服务器不再主动发 `sampling/createMessage`、`elicitation/create`、`roots/list` 请求，而是返回 `InputRequiredResult`（`resultType: "input_required"`），由客户端带 `inputResponses` 重试。
  - 所有结果新增必填字段 `resultType`。
  - 移除 SSE 断点续传（`Last-Event-ID`）。
  - **Deprecated**：Roots、Sampling、Logging（SEP-2577）；HTTP+SSE 传输；OAuth DCR（建议改用 Client ID Metadata Documents）。
- HTTP 版本头：课程第 9 章第 39 行说"HTTP 还会把版本镜像到 `MCP-Protocol-Version` 头"✅。规范原文："Every POST request to the MCP endpoint **MUST** include an `MCP-Protocol-Version` header"，且该值必须与 `_meta` 中的版本一致，不一致返回 400 `HeaderMismatch`（-32020）。另外新增了必填头 `Mcp-Method` 和 `Mcp-Name` — [Streamable HTTP (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)。

**SDK 事实**
- `@modelcontextprotocol/server` 2.4.0 依赖 `zod ^4.2.0` 与 `@modelcontextprotocol/core` 2.4.0，`engines.node >=20`；`./stdio` 子路径同时导出 `serveStdio` 与 `StdioServerTransport`（后者未标 deprecated）— [server@2.4.0 package.json](https://cdn.jsdelivr.net/npm/@modelcontextprotocol/server@2.4.0/package.json)；[server@2.4.0 dist/stdio.d.mts](https://cdn.jsdelivr.net/npm/@modelcontextprotocol/server@2.4.0/dist/stdio.d.mts)。
- 2.4.0（2026-10-23）的破坏性变化：在 2026-07-28 下，给 `number` 参数加 `x-mcp-header` 会被拒绝；2025-11-25 连接下的 `outputSchema` 不再包 `{ result }`；Ajv 拒绝非法 URI scheme 的 `$id`/`$ref`。新增 Skills over MCP（SEP-2640，`loadSkills`/`skills.attach`，后者为实验特性）和客户端 `SkillsClient` — [typescript-sdk Releases](https://github.com/modelcontextprotocol/typescript-sdk/releases)。课程代码不受这些破坏性变化影响。
- 官方 TS quickstart 现在的写法是 `import { serveStdio } from "@modelcontextprotocol/server/stdio"`，用 `serveStdio(createServer, { onerror })` 启动，工厂每次调用返回一个新的 `McpServer`。官方原话："`serveStdio` negotiates the protocol revision with each client, so the same server answers both 2026-07-28 clients and clients that still open with the 2025-era `initialize` handshake… Wiring the server by hand with `server.connect(new StdioServerTransport())` still compiles, but a server started that way only serves 2025-era clients." 同一页要求 Node.js ≥20 — [MCP Build a server](https://modelcontextprotocol.io/docs/2026-07-28/develop/build-server)；[TS SDK v2 首页与 first-server](https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-server.html)。
- 官方客户端教程的写法是 `new Client({...}, { versionNegotiation: { mode: "auto" } })`；`auto` 会先探测 `server/discover`，失败再回退到 2025-11-25 的 `initialize`。**SDK 默认是 `legacy`**。`callTool` 失败时不抛异常，而是设置 `result.isError` — [MCP Build a client](https://modelcontextprotocol.io/docs/2026-07-28/develop/build-client)；类型注释原文"**The default is `'legacy'`**" — [client@2.4.0 d.mts](https://cdn.jsdelivr.net/npm/@modelcontextprotocol/client@2.4.0/dist/client-BTIWJvaF.d.mts)。
- Hono 远程写法：官方 `docs/serving/hono.md` 中的 `createMcpHonoApp()` + `createMcpHandler(factory)` + `handler.fetch(c.req.raw, { parsedBody: c.get('parsedBody') })`、`authInfo` 透传，以及 `createMcpHonoApp({ host: '0.0.0.0', allowedHosts: [...] })`，与课程第 9 章第 186-210 行**一致** ✅。官方补充说：在 Node 上运行需要把 `app` 交给 `@hono/node-server` 的 `serve` — [typescript-sdk docs/serving/hono.md](https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/docs/serving/hono.md)。

**宿主接入**
- Claude Code：本地 stdio 用 `claude mcp add [options] <name> -- <command> [args...]`，远程用 `claude mcp add --transport http <name> <url>`。SSE 传输已 deprecated。作用域分 local/project/user，project 级写入 `.mcp.json`；没有 `type` 字段的条目按 stdio 处理；支持 `${VAR}` 与 `${VAR:-default}`。MCP tasks 为公测，需要 v2.1.304+。v2 客户端运行时在 v2.1.274+ 部分会话中默认启用，支持 2026-07-28 — [Claude Code MCP 文档](https://code.claude.com/docs/en/mcp)。
- Claude Desktop：仍然写 `claude_desktop_config.json`（macOS `~/Library/Application Support/Claude/`，Windows `$env:AppData\Claude\`），格式为 `{"mcpServers":{"weather":{"command":"node","args":[...]}}}` — [MCP Build a server](https://modelcontextprotocol.io/docs/2026-07-28/develop/build-server)。

**逐条核对**

| 课程位置 | 课程说法 | 最新事实 | 判定 | 建议替换 |
|---|---|---|---|---|
| 第 9 章第 13 行 | v2 拆分包 2.3.1；v1 `sdk` 1.32.1 | 2.4.0 / 1.32.2（10-23） | ⚠️ | "`@modelcontextprotocol/server` 与 `client`（2.4.0，2026-10-23）……单体包 `@modelcontextprotocol/sdk`（1.32.2，v1 维护线）" |
| 第 9 章第 34-37 行 | 两种传输：stdio、Streamable HTTP | 正确；HTTP+SSE 已在规范中列为 Deprecated | ✅ | 可补一句："旧 HTTP+SSE 传输已被规范列为 Deprecated" |
| 第 9 章第 39 行 | "无状态 + 每请求版本协商 + server/discover"；"v2 SDK 已封装这些细节，本章代码无需改动" | 前半句 ✅；后半句 ❌（见上方官方原文） | ❌ | 见下方替换 A |
| 第 9 章第 44、49-84 行 | `new StdioServerTransport()` + `server.connect()` | 仍能编译，但只服务 2025 时代客户端；官方改用 `serveStdio(factory)` | ⚠️（接近 ❌） | 见下方替换 B |
| 第 9 章第 89 行 | zod 必须 v4（`^4.2.0`） | `zod ^4.2.0` 为直接依赖 | ✅ | — |
| 第 9 章第 88 行 | stdio 中禁止 `console.log` | 官方："Never use `console.log()`…" | ✅ | — |
| 第 9 章第 97-98、109 行 | `claude mcp add order-server -- node ./order-server/index.ts`；`.mcp.json` 不写 type | 语法正确；无 type 即 stdio | ✅ | 可选补充："`node x.ts` 依赖 Node 24 默认的类型剥离；官方 quickstart 是先 `tsc` 编译再 `node build/index.js`" |
| 第 9 章第 114 行 | Claude Desktop 写 `claude_desktop_config.json` 并完全重启 | 仍正确 | ✅ | — |
| 第 9 章第 133-150 行 | `new Client({name,version})`；只取 text、忽略错误 | 默认 legacy 协商；官方示例检查 `isError` | ⚠️ | 见下方替换 C |
| 第 9 章第 164 行 | Playwright MCP 0.0.83 | 0.0.85（11-09） | ⚠️ | "0.0.85，2026-11 核实" |
| 第 9 章第 180-210 行 | Hono 写法、authInfo 透传、`allowedHosts` | 与官方 hono.md 一致 | ✅ | 可补一句："Node 上用 `@hono/node-server` 的 `serve(app)`" |
| B5 第 71-74 行 | 各链接与包名 | 链接有效，版本见 Q1 | ⚠️（版本号） | — |

**替换 A（第 9 章第 39 行整段）**
> **规范提示（2026-07-28，当前版本）**：MCP 已改为**无状态**：取消 `initialize` 握手，每个请求在 `_meta`（`io.modelcontextprotocol/protocolVersion`、`…/clientCapabilities`）中自带协议版本与客户端能力；Streamable HTTP 还必须带 `MCP-Protocol-Version`、`Mcp-Method`、`Mcp-Name` 请求头，值须与请求体一致。服务端必须实现 `server/discover`。同时移除了协议级会话（`Mcp-Session-Id`）、HTTP GET 推送流与 SSE 断点续传；服务器→客户端的 sampling/elicitation/roots 改为 MRTR（返回 `InputRequiredResult`，由客户端重试）；Roots、Sampling、Logging 已列为 Deprecated。**v2 SDK 两种协议时代都能说，但需要你选**：服务端用 `serveStdio(工厂函数)` 才能同时服务新旧客户端（手写 `server.connect(new StdioServerTransport())` 仍能编译，但只服务 2025 时代客户端）；客户端 `Client` 默认 `versionNegotiation: 'legacy'`，要用新协议须传 `{ versionNegotiation: { mode: "auto" } }`。面试答「无状态 + 每请求版本协商 + server/discover + MRTR」是加分项。

**替换 B（第 9 章 9.2 节 Server，代码尾部）**
```ts
// order-server/index.ts —— v2 官方写法（2026-07-28 新旧客户端都能连）
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const ORDERS: Record<string, { status: string; eta: string; items: string[] }> = { /* 同上 */ };

// serveStdio 可能多次调用工厂（含一次 server/discover 探测），所以每次都返回新实例
function createServer() {
  const server = new McpServer({ name: "order-server", version: "1.0.0" });
  server.registerTool(
    "queryOrder",
    {
      description: "按订单号查询订单状态与预计送达时间。找不到订单时返回 notFound。",
      inputSchema: z.object({ orderId: z.string().describe("订单号，如 A001") }),
    },
    async ({ orderId }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(ORDERS[orderId.toUpperCase()] ?? { notFound: true, orderId }) }],
    }),
  );
  return server;
}

serveStdio(createServer, { onerror: (e) => console.error("order-server error:", e) });
console.error("order-server running on stdio"); // 日志走 stderr
```
（来源：上面引用的官方 quickstart。本轮未在本机运行。）

**替换 C（第 9 章 9.4 节 Client 两处）**
```ts
const client = new Client(
  { name: "my-agent", version: "1.0.0" },
  { versionNegotiation: { mode: "auto" } },   // 默认是 'legacy'（只走 2025 的 initialize）
);
// …
const result = await client.callTool({ name: t.name, arguments: args as Record<string, unknown> });
const text = result.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
return result.isError ? { error: true, message: text } : text;   // 工具失败不抛异常，看 isError
```

### Inferences
- 9.6 节的 `createMcpHandler` 是"每请求工厂"模型，SDK 同时导出 `legacyStatelessFallback`/`isLegacyRequest`，可以推断 HTTP 侧也能兼容新旧两代协议。但我没有找到明确的官方原文，所以没有写进替换文本。
- 2.4.0 新增的 Skills over MCP 与第 6 章 Skills 内容相关，可作为第 9 章的一句"生态动态"。它目前是实验特性，不建议写进正文代码。

### Gaps
- 没有核实 registry.modelcontextprotocol.io 目前的条目数和 API 状态（第 9 章第 214 行）。
- 没有找到 `createMcpHandler` 默认是否兼容 2025 时代客户端的官方明文。

---

## Q3 LangGraph.js：StateSchema、interrupt/Command、checkpointer、预置 Agent

### Takeaway
课程用的 API（`StateSchema`、`MessagesValue`、`interrupt`、`Command({ resume })`、`MemorySaver`、`addConditionalEdges`）在 1.7.3 中仍然有效，需要更新的是版本号。另有三处要改：1.7.0 起 falsy 的 resume 值才能被正常传入；"Annotation.Root 跑不通"的说法过度；第 22 章的验收用 MemorySaver 无法实现"kill 后恢复"。

### Cited Findings
- 1.6.0（2026-10-30）：`messages`/`tools` 流事件的 namespace 语义改变，影响 `streamMode: "messages"` 与 `subgraphs`（课程未使用）。1.7.0（2026-11-05）：每个 `interrupt()` 有独立 id；新增 strict resume 模式；子图并行 interrupt 全部保留；**"`Command({ resume: false })` and other falsy resume values now reach `interrupt()` instead of throwing `EmptyInputError`."** 1.7.2/1.7.3 为补丁（`getState` 显示被中断任务的 result；`for await` 中 break 会停止运行）— [langgraph-core CHANGELOG](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/libs/langgraph-core/CHANGELOG.md)。
- 官方当前的 state 写法是 `new StateSchema({ foo: z.number(), bar: new ReducedValue(z.array(z.string()).default(() => []), { reducer }) })`；`MessagesValue` 是预置的消息 reducer；没有 reducer 的字段直接覆盖 — [LangGraph Graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api)。
- interrupt 规则（不要用裸 try/catch 包住、顺序固定、payload 可 JSON 序列化、interrupt 前的副作用要幂等）、`new Command({ resume })`、同一 `thread_id` 恢复；示例用 `MemorySaver`，并注明生产应换持久化 checkpointer — [LangGraph interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)。
- `Annotation` 在 1.7.3 中仍然导出（`dist/graph/annotation.d.ts` 第 115 行 `declare const Annotation`），只有其中的 `value` 选项标了 `@deprecated Use reducer instead` — [langgraph@1.7.3 annotation.d.ts](https://cdn.jsdelivr.net/npm/@langchain/langgraph@1.7.3/dist/graph/annotation.d.ts)。
- `createReactAgent` 在 LangGraph v1 中已弃用，由 `langchain` 包的 `createAgent` 取代 — [LangGraph v1 release notes](https://docs.langchain.com/oss/javascript/releases/langgraph-v1)；[LangChain v1 migration](https://docs.langchain.com/oss/javascript/migrate/langchain-v1)。
- `@langchain/langgraph-checkpoint-sqlite` 1.1.0 导出 `SqliteSaver.fromConnString(connStringOrLocalPath)`，依赖 `better-sqlite3 ^12.10.0`（原生模块） — [checkpoint-sqlite@1.1.0 index.d.ts](https://cdn.jsdelivr.net/npm/@langchain/langgraph-checkpoint-sqlite@1.1.0/dist/index.d.ts)；[registry](https://registry.npmjs.org/@langchain%2Flanggraph-checkpoint-sqlite/1.1.0)。

| 课程位置 | 课程说法 | 最新事实 | 判定 | 建议替换 |
|---|---|---|---|---|
| 第 10 章第 21 行；B2 第 28 行；B9 第 127 行 | `@langchain/langgraph` 1.x / 1.5.x | 1.7.3（11-10） | ⚠️ | "1.7.x（2026-11）" |
| 第 10 章第 86-118 行 | StateSchema/MessagesValue/MemorySaver/interrupt/Command | 仍然有效 | ✅ | — |
| 第 10 章第 101-103、124 行 | `interrupt()` 返回布尔，驳回路径依赖 resume=false | 1.7.0 之前 `Command({ resume: false })` 会抛 `EmptyInputError` | ⚠️ | 依赖改为 `pnpm add @langchain/langgraph@^1.7 @langchain/openai`；或改用对象 payload：`const { approved } = interrupt({...}) as { approved: boolean }` 与 `new Command({ resume: { approved: true } })`（与第 22 章一致，跨版本安全） |
| 第 10 章第 130 行 | interrupt 四条规矩 | 与官方一致 | ✅ | 可补："1.7 起每个 interrupt 有独立 id，可用 `{ [id]: value }` 映射同时恢复多个" |
| 第 10 章第 133 行 | LangChain 1.x 主 API 是 `createAgent`，AgentExecutor 已非主线 | 正确；`createReactAgent` 也已弃用 | ✅ | 可补："LangGraph 的 `createReactAgent` 已弃用，迁到 `import { createAgent } from "langchain"`" |
| 第 10 章第 202 行 | "旧 `Annotation.Root` 写法……照抄会跑不通" | `Annotation` 仍导出、未整体弃用；文档只讲 StateSchema | ⚠️（过度） | "1.x 文档主推 `StateSchema`/`MessagesValue`；`Annotation.Root` 仍可运行但已非文档主线，新代码不要混用两种写法" |
| 第 22 章第 71 行 | "LangGraph 1.5 API" | 1.7.x | ⚠️ | "LangGraph 1.7 API" |
| 第 22 章第 81-85 行 | `z.array(z.string()).default([])` | 官方用工厂形式 `.default(() => [])` | ⚠️（P2） | 改为 `.default(() => [])`，与官方一致 |
| 第 22 章第 130、133-140、142 行 | MemorySaver + 同一进程里连续两次 invoke；验收是"kill 进程 → 重跑恢复" | 内存 checkpointer 无法跨进程恢复，与第 274 行自相矛盾 | ❌ | 见下方替换 D |
| 第 22 章第 133 行 | `import.meta.url === \`file://${process.argv[1]}\`` | Windows 路径（`file:///C:/...`）不相等，判断永远为 false（静态推断） | ⚠️ | `import { pathToFileURL } from "node:url"; if (import.meta.url === pathToFileURL(process.argv[1]).href) {…}` |

**替换 D（第 22 章 22.1.1：第 1 周就用 SQLite 持久化，并把"挂起"和"恢复"拆成两条命令）**
```ts
// pnpm add @langchain/langgraph@^1.7 @langchain/langgraph-checkpoint-sqlite zod
// （pnpm 12 需 approve-builds better-sqlite3）
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
// …节点定义不变…
export const graph = new StateGraph(ResearchState)
  /* …同上… */
  .compile({ checkpointer: SqliteSaver.fromConnString("./checkpoints.db") }); // 进程重启后仍可恢复

// 运行：npx tsx graph.ts start   → 挂起在 review；此时可以 kill 进程
//       npx tsx graph.ts resume  → 新进程从 SQLite 读回检查点继续
const config = { configurable: { thread_id: "demo-1" } };
if (process.argv[2] === "start") {
  await graph.invoke({ topic: "AI Agent 工程" }, config);
  console.log("已挂起，等待审批：现在可以 kill 进程，再运行 resume");
} else if (process.argv[2] === "resume") {
  const final = await graph.invoke(new Command({ resume: { approved: true } }), config);
  console.log(final.draft);
}
```
第 142 行验收改为：
> 运行 `start` 看到挂起 → kill 进程 → 运行 `resume` 恢复成功（SqliteSaver 落盘；第 3 周换 PostgresSaver 用于多实例部署）。

（本轮未在本机运行。）

### Inferences
- 如果课程坚持 MemorySaver，验收就只能写"同一进程内挂起和恢复"，不能写"kill 后恢复"。

### Gaps
- `SqliteSaver` 在 Windows 加 pnpm 12 下的原生构建体验没有实测。
- LangGraph 1.6.0 的流事件 namespace 变化是否影响第 20 章（不在本次范围）的 `useStream`，没有核查。

---

## Q4 Mastra：Agent / Memory / Workflow 当前 API 与 1.x 变更

### Takeaway
`new Agent({ id, name, instructions, model, tools, memory })` 和 `new Memory({ options: { lastMessages: 20 } })` 仍然有效。但官方明确说 Memory **必须**配 storage，课程示例没有配。"观察式记忆"真实存在，但需要显式开启（`observationalMemory: true`），开启后 `lastMessages` 不再生效。1.80-1.82 没有影响课程代码的破坏性变化。

### Cited Findings
- Agent 从 `@mastra/core/agent` 导入，构造参数为 `{ id, name, instructions, model }`；`model` 用 `'provider/model-name'` 字符串；工具用 `@mastra/core/tools` 的 `createTool`（字段 `id`、`description`、`inputSchema`、`execute(inputData, context)`），官方警告"Plain object tool definitions silently fail to execute." — [Mastra Agents overview](https://mastra.ai/docs/agents/overview)。
- Memory："Memory **requires** a storage provider to persist message history"。quickstart 用 `@mastra/libsql` 的 `new LibSQLStore({ id: 'mastra-storage', url: ':memory:' })`，并强调要加 `id`。Observational Memory 通过 `options` 中的 `observationalMemory: true` 开启（官方推荐），开启后"`lastMessages` has no effect"，thread 作用域要求每次调用带 `threadId`，`recall` 工具需 `retrieval: true` — [Mastra Memory overview](https://mastra.ai/docs/memory/overview)。
- `@mastra/core` 1.82.0：workflow 的 `getStepResult` 标为 deprecated（改用 `getStepResultAsync`）；移除实验特性 `experimental_subconscious` 和 Memory 的 `knowledge` 选项（改为在 Agent 上挂 Knowledge）。其余主要是 Knowledge 新功能 — [@mastra/core CHANGELOG](https://raw.githubusercontent.com/mastra-ai/mastra/main/packages/core/CHANGELOG.md)。
- `@mastra/core` 1.82.0 `engines.node >=22.13.0` — [registry](https://registry.npmjs.org/@mastra%2Fcore/latest)。

| 课程位置 | 课程说法 | 最新事实 | 判定 | 建议替换 |
|---|---|---|---|---|
| B9 第 127 行 | mastra 1.35 / @mastra/core 1.79 | 1.38.0 / 1.82.0 | ⚠️ | "mastra 1.38 / @mastra/core 1.82（Node ≥22.13）" |
| 第 10 章第 141-152 行 | `Agent` + `Memory({ options: { lastMessages: 20 } })`，未配 storage | 必须配 storage | ⚠️ | 见下方替换 E |
| 第 10 章第 155 行；第 14 章第 164 行 | "内置观察式记忆=后台自动压缩旧消息" | 真实存在，但需 `observationalMemory: true` 显式开启，且会让 `lastMessages` 失效 | ⚠️ | "观察式记忆（Observational Memory，需在 `options` 中开启 `observationalMemory: true`，开启后 `lastMessages` 不再生效）" |
| 第 10 章第 155 行 | Workflows `createStep` + `.then()`、suspend/resume | 仍然成立；1.82 起 `getStepResult` 已弃用 | ✅（可选补一句） | "读取前序步骤结果用 `getStepResultAsync`（1.82 起 `getStepResult` 已弃用）" |
| 第 10 章第 150 行 | `tools: { queryOrder }` 用 `createTool` | 正确；裸对象工具会静默失效 | ✅ | 可补："必须用 `createTool` 包装，裸对象会静默不执行" |

**替换 E（第 10 章 10.4 节代码）**
```ts
// 依赖：pnpm add @mastra/core @mastra/memory @mastra/libsql   （Node ≥ 22.13）
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

export const assistant = new Agent({
  id: "assistant",
  name: "客服助手",
  instructions: "你是电商客服…",
  model: "openai/gpt-6-luna",
  tools: { queryOrder },                                   // createTool 定义
  memory: new Memory({ options: { lastMessages: 20 } }),   // Memory 必须有 storage（下方注册在 Mastra 实例上）
});

export const mastra = new Mastra({
  agents: { assistant },
  storage: new LibSQLStore({ id: "mastra-storage", url: ":memory:" }), // 演示用内存库；持久化换文件 URL，以官方 LibSQLStore 文档为准
});
```

### Inferences
- 读者如果按课程原样单独 `new Agent` 并调用 `generate`，记忆要么不生效，要么报错，具体取决于版本。可以确定的是，"Memory 必须配 storage"是官方明文。

### Gaps
- 没有实测"Memory 无 storage 时是抛错还是静默不持久化"。

---

## Q5 工具调用格式：Chat Completions vs Responses、并行与 strict、Anthropic 规则、历史一致性

### Takeaway
"每个 tool_call id 都必须有匹配的工具结果"是 OpenAI 和 Anthropic 共同的硬规则。第 7 章遵守了，第 8 章违反了。OpenAI 方面有两处变化影响课程：`openai` 7.x 的类型已改为 function/custom 联合；GPT-6 Astra/Sol 做工具调用必须走 Responses API。

### Cited Findings
- OpenAI 的说法："The model may choose to call multiple functions in a single turn. You can prevent this by setting `parallel_tool_calls` to `false`, which ensures exactly zero or one tool is called."；"Chat Completions requests remain non-strict by default"；Responses 会"attempt to normalize your schema into strict mode when possible"；strict 要求 `additionalProperties: false` 且所有字段都列入 `required`（可选字段用 `null` 联合表示）；Responses 中调用项为 `function_call`（含 `call_id`），回传 `function_call_output` 时引用同一个 `call_id`；**"GPT-6 Astra and GPT-6.1 Sol require the Responses API for tool calling."** — [OpenAI Function calling 指南](https://developers.openai.com/api/docs/guides/function-calling)。
- `openai` 7.55.0 类型：`max_tokens` 标 `@deprecated`（"deprecated in favor of `max_completion_tokens`, and is not compatible with o-series models"）；`parallel_tool_calls?: boolean`；tool_call 与 tool 都是 function|custom 联合 — [completions.d.ts](https://cdn.jsdelivr.net/npm/openai@7.55.0/resources/chat/completions/completions.d.ts)。
- Anthropic 的规则：`stop_reason` 为 `tool_use`；结果放在下一条 `role: "user"` 消息的 `tool_result` 块中，`tool_use_id` 必须对应；"Tool result blocks must immediately follow their corresponding tool use blocks… the `tool_result` blocks must come FIRST in the content array"；违反时报"tool_use ids were found without tool_result blocks immediately after"；错误用 `is_error: true` 表示；`strict: true` 保证输入符合 schema — [Anthropic Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)。另外，Opus 5.5 / Sonnet 5.5 等模型不支持强制工具（`tool_choice` 为 `any`/`tool` 时返回 400），官方建议改用 `auto` 配合 strict — [Anthropic Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)。

| 课程位置 | 课程说法 / 代码 | 最新事实 | 判定 | 建议替换 |
|---|---|---|---|---|
| 第 7 章第 129-137 行 | `toOpenAITools(): OpenAI.Chat.ChatCompletionTool[]`，参数类型用 `ChatCompletionTool["function"]["parameters"]` | 联合类型中 custom 成员没有 `function`，索引访问会报 TS2339 | ❌ | 见下方替换 F |
| 第 7 章第 176-177 行 | `for (const call of msg.tool_calls) registry.get(call.function.name)` | 需先按 `call.type === "function"` 收窄 | ❌ | 见下方替换 F |
| 第 7 章第 172-195 行 | assistant 消息先 push；每个 call 都回一条 tool 消息（异常也回） | 符合"每个 id 都有响应"规则 | ✅ | — |
| 第 7 章第 33-39 行 | 六步流程；`finish_reason` 为 `"tool_calls"`/`"stop"` | Chat Completions 中仍然成立 | ✅ | 加注（见替换 G） |
| 第 7 章第 167 行；第 8 章第 121 行 | `max_tokens` | 类型中已 deprecated；兼容厂商（DeepSeek）可用 | ⚠️ | 注释："调 OpenAI 官方推理模型时改用 `max_completion_tokens`；DeepSeek 等兼容厂商以其文档为准" |
| 第 7 章第 175 行；第 7 章练习 4 | "模型可能一次请求多个工具调用——并行调用" | 正确；OpenAI 可用 `parallel_tool_calls: false` 关闭 | ✅ | 可补这个参数 |
| 第 7 章第 265 行 | "并行多个调用时 id 错位，API 直接 400" | 正确 | ✅ | — |
| 第 8 章第 130、148、172 行 | 只执行 `tool_calls[0]`，但 push 了含全部 calls 的消息、只回一条 | 违反"每个 id 都要有结果"，下一轮 400 | ❌ | 见下方替换 H |
| 第 7 章第 294 行 | Anthropic Tool Use 文档链接 | 有效（overview 页） | ✅ | — |
| 第 7 章（全章） | 没有提 Responses API | GPT-6 Astra / GPT-6.1 Sol 的工具调用必须走 Responses | ⚠️ | 加警示框（见替换 G） |

**替换 F（第 7 章 `toOpenAITools` 与主循环）**
```ts
export function toOpenAITools(tools: ToolDef<any>[]): OpenAI.Chat.ChatCompletionFunctionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: z.toJSONSchema(t.parameters) as OpenAI.Chat.ChatCompletionFunctionTool["function"]["parameters"],
    },
  }));
}
```
```ts
for (const call of msg.tool_calls) {
  // openai ≥5.12（含 7.x）：tool_calls 是 function | custom 联合类型，先收窄；
  // 非 function 调用也必须回一条 tool 消息，否则下一轮 400
  if (call.type !== "function") {
    messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: true, message: "不支持的工具类型" }) });
    continue;
  }
  const tool = registry.get(call.function.name);
  // …其余不变…
}
```

**替换 G（第 7 章 7.2 节后加警示框）**
> ⚠️ **API 选择（2026-11）**：本章用 Chat Completions 格式，因为它是国内厂商（DeepSeek/Kimi/通义等）的兼容标准。但 OpenAI 官方文档写明 **GPT-6 Astra 与 GPT-6.1 Sol 的工具调用必须走 Responses API**（`client.responses.create`）。Responses 中模型返回 `type: "function_call"` 项（带 `call_id`），你回传 `{ type: "function_call_output", call_id, output }`，规则与本章完全同构：**每个调用 id 必须有且只有一条对应结果**。另外，Chat Completions 默认非 strict；Responses 会尽量把 schema 归一化为 strict（要求所有字段都列入 `required` 且 `additionalProperties: false`）。

**替换 H（第 8 章第 129-175 行的处理顺序）**
```ts
const msg = res.choices[0].message;
const calls = msg.tool_calls ?? [];
if (calls.length === 0) { /* 原逻辑不变 */ }

messages.push(msg);                        // 含全部 tool_calls 的 assistant 消息，只 push 一次
const [call, ...rest] = calls;
// 铁律：每个 tool_call id 都必须有一条 tool 消息。本 Agent 每步只执行一个，其余明确告知"跳过"
for (const extra of rest) {
  messages.push({ role: "tool", tool_call_id: extra.id,
    content: JSON.stringify({ error: "SKIPPED", hint: "每步只执行一个工具，请在下一步重新调用" }) });
}
if (call.type !== "function") {
  messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: "UNSUPPORTED_TOOL_TYPE" }) });
  continue;
}
const args = JSON.parse(call.function.arguments || "{}");
// …终止判定 / 循环检测 / 执行逻辑不变，但下面两处只 push tool 消息（去掉其中的 msg）：
// messages.push({ role: "tool", tool_call_id: call.id, content: … });
```
另一种更简单的做法：在请求中加 `parallel_tool_calls: false`（OpenAI 官方参数）。但兼容厂商不一定支持，所以仍建议保留上面的兜底代码。（本轮未运行。）

### Inferences
- 第 8 章常见坑中可以加一条："只执行第一个 tool_call 却把整条 assistant 消息写入历史 → 下一轮 400"，正好对应任务说明中的"history rule"。

### Gaps
- DeepSeek 等兼容厂商是否支持 `parallel_tool_calls`、是否会返回多个 tool_calls，本轮没有核查（属于其他研究员的模型/厂商范围）。
- 替换 F/H 没有在本机 `tsc --noEmit` 实测。

---

## Q6 OpenAI Agents SDK（JS）、Claude Agent SDK、Cloudflare Agents、LlamaIndex.TS

### Takeaway
`@openai/agents` 仍是 0.21.0，课程正确。Claude Agent SDK 的描述正确。Cloudflare `agents` 升到 0.33，0.31 起 MCP 包改为可选 peer 依赖。课程只做了概念介绍，所以只需改版本号。LlamaIndex.TS 仍然停更。

### Cited Findings
- `@openai/agents` 最新 0.21.0（2026-10-20），之后没有新版 — [registry](https://registry.npmjs.org/@openai%2Fagents)。文档站侧边栏有 Handoffs、Guardrails、Sessions、Tracing、Agent Orchestration、Sandbox agents 等指南；API 参考同时有 `OpenAIResponsesModel` 和 `OpenAIChatCompletionsModel`，并有 `setDefaultModelProvider` — [OpenAI Agents JS 文档](https://openai.github.io/openai-agents-js/)。
- Claude Agent SDK：安装命令 `npm install @anthropic-ai/claude-agent-sdk`，主函数 `query()`；"The SDK bundles a native Claude Code binary for your platform as an optional dependency"；选项包括 `permissionMode`、`canUseTool`、`allowedTools`、`mcpServers`、`agents`、`skills`、`hooks` — [Agent SDK TypeScript](https://code.claude.com/docs/en/agent-sdk/typescript)。最新 0.3.322（2026-11-10）。
- Cloudflare：官方说法是"Each agent is a Durable Object"，带本地 SQL 存储、WebSockets、Scheduler，并提供 MCP 客户端（`MCPClientManager`） — [Cloudflare Agents](https://developers.cloudflare.com/agents/)。0.31.0（10-27）把 `@modelcontextprotocol/sdk`/`server` 改为可选 peer 依赖，提供 MCP 服务的项目需要自行安装；0.32.0（10-29）的 `agents/skills` 有破坏性变化（`SkillRegistry` 被 `loadSkillCatalog()`/`createSkillTools()` 取代），并把 MCP 依赖升到 2.4.0；0.33.0（11-03）支持 Pi 1.5 harness — [cloudflare/agents CHANGELOG](https://raw.githubusercontent.com/cloudflare/agents/main/packages/agents/CHANGELOG.md)。
- `llamaindex` 0.12.1 未变 — [registry](https://registry.npmjs.org/llamaindex/latest)。

| 课程位置 | 说法 | 事实 | 判定 | 建议 |
|---|---|---|---|---|
| 第 10 章第 24、167 行；B2 第 31 行 | `@openai/agents` 0.21，未到 1.0 | 0.21.0 | ✅ | — |
| 第 10 章第 162-164 行 | `new Agent({ name, instructions })` + `run(agent, "...")` | 0.21 中仍然成立（R7 实测，本轮版本未变） | ✅ | — |
| 第 10 章第 25、169 行 | 0.3；内嵌原生二进制；`query()`；`permissionMode`/`canUseTool`/`allowedTools` | 一致 | ✅ | — |
| 第 10 章第 26、171 行；B9 第 134 行 | `agents` 0.29；"agents are Durable Objects"；SQLite、WebSocket、定时、休眠不计费 | 0.33.0；DO、SQL 存储、WebSocket、Scheduler 均得到证实；"休眠"在首页没有提到 | ⚠️ | 版本改为 0.33；可补："0.31 起 MCP 包是可选 peer 依赖，用 `McpAgent`/`createMcpHandler` 需自行安装 `@modelcontextprotocol/server`" |
| 第 10 章第 27、175 行 | LlamaIndex.TS 0.12.1 停更 | npm 未变 | ✅ | — |

### Inferences
- `@openai/agents` 自 10-20 后 3 周没有新版。考虑到它此前的发布节奏（0.19 于 10-05，0.20 于 10-08），节奏有所放缓，但这不说明它会停更。

### Gaps
- 没有核查 GitHub 仓库 `run-llama/LlamaIndexTS` 的 `archived` 标志（R7 于 10-22 已核实）。
- Cloudflare 的"休眠不计费"说法没有在本轮访问的页面中找到原文。

---

## Q7 AI 编程工具（第 6 章、B6、第 2 章安装）：Claude Code、Skills、Cursor、Codex、SDD

### Takeaway
第 6 章的方法论仍然成立，但有四处事实需要更新。一是 Claude Code 自 v2.1.277（2026-09-18）起原生读取 AGENTS.md，Cursor 和 Codex 也都支持，课程完全没有提到。二是 Skill 的"5,000 token 预算"是误读，官方的指引是 SKILL.md 控制在 500 行以内。三是 Cursor 规则类型已改名。四是 `/doctor` 的写法应改为 `/doctor prompt-audit`。第 2 章称 npm 安装"官方已标注 deprecated"，与官方文档不符。10-22 之后 Claude Code 的更新多为修复和小功能（MCP tasks 支持、`permissions.denyInsteadOfPrompting` 等），没有让第 6 章失效的变化。

### Cited Findings
- **安装**：官方推荐原生安装（`curl -fsSL https://claude.ai/install.sh | bash`、`irm https://claude.ai/install.ps1 | iex`），另外支持 Homebrew（`brew install --cask claude-code`）、WinGet（`winget install Anthropic.ClaudeCode`）、apt/dnf/apk。**npm 仍是受支持的方式**："You can also install Claude Code as a global npm package. The npm package requires Node.js 22 or later… installs the same native binary as the standalone installer." — [Claude Code Advanced setup](https://code.claude.com/docs/en/setup)。npm 上 `@anthropic-ai/claude-code` 2.1.322 没有 deprecated 标记 — [registry](https://registry.npmjs.org/@anthropic-ai%2Fclaude-code/latest)。
- **CLAUDE.md**：官方原话"target under 200 lines per CLAUDE.md file"；`/init` 生成初版（设置 `CLAUDE_CODE_NEW_INIT=1` 后会走交互式多阶段流程，可一并生成 skills/hooks）；`/doctor prompt-audit` 审计过时或冲突的指令（需 v2.1.283+）；`.claude/rules/*.md` 可用 `paths` frontmatter 按路径加载；`@path` 导入最多 4 层；Claude 也会读取 AGENTS.md（v2.1.277+，在没有 CLAUDE.md 时才读）；要强制阻止某个动作应该用 PreToolUse hook，不能靠 CLAUDE.md — [How Claude remembers your project](https://code.claude.com/docs/en/memory)。版本日期：2.1.277 = 2026-09-18，2.1.283 = 2026-09-25 — [registry time](https://registry.npmjs.org/@anthropic-ai%2Fclaude-code)。
- **Skills**：所有 frontmatter 字段都可选，推荐写 `description`；存放位置为 `.claude/skills/<name>/SKILL.md` 和 `~/.claude/skills/`；"Keep `SKILL.md` under 500 lines"；`description`+`when_to_use` 在列表中超过 1,536 字符会被截断；**5,000 token** 是压缩后重新附加每个已调用 skill 的保留量（合计上限 25,000），不是写作预算；启动时只加载描述，调用时才加载正文，附属文件按需读取；遵循 [Agent Skills](https://agentskills.io) 开放标准，在 Claude Code 之外只接受 6 个字段；"Custom commands have been merged into skills" — [Claude Code Skills](https://code.claude.com/docs/en/skills)。Agent Skills 已是 AAIF 托管项目 — [AAIF Projects](https://aaif.io/projects)。
- **扩展机制全景**：官方把 CLAUDE.md、Skills、subagents、hooks、MCP、plugins 并列为六种扩展方式，另有 agent teams、dynamic workflows、scheduled tasks（原 routines）等 — [Claude Code docs index (llms.txt)](https://code.claude.com/docs/llms.txt)；[Extend Claude Code](https://code.claude.com/docs/en/features-overview.md)。
- **10-22 之后的变化**：2.1.319 新增 MCP tasks 终端支持和 `permissions.denyInsteadOfPrompting`；2.1.321 包含大量 hooks/plugins/subagent 修复，并调整了嵌套 skill 的加载规则 — [Claude Code CHANGELOG](https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md)。
- **Cursor**：原文"Project rules live in `.cursor/rules` as `.mdc` files"，"Project rules must use the `.mdc` extension"；四种类型现名为 "Always Apply / Apply Intelligently / Apply to Specific Files / Apply Manually"（对应 frontmatter 中的 `description`/`globs`/`alwaysApply`）；"Cursor supports AGENTS.md in the project root and subdirectories"；另有 User Rules 和 Team Rules — [Cursor Rules](https://cursor.com/docs/rules)。
- **Codex CLI**：独立安装命令为 `curl -fsSL https://chatgpt.com/codex/install.sh | sh`（另有 npm/Homebrew/Windows 方式）；`/init` 生成 AGENTS.md；支持 skills、plugins、`codex mcp`、subagents — [Codex CLI 文档](https://learn.chatgpt.com/docs/codex/cli)。npm `@openai/codex` 版本为 0.167.2。
- **SDD 工具**：Spec Kit v1.4.0（2026-11-10）；OpenSpec 2.0.0（2026-11-11）— [GitHub API](https://api.github.com/repos/github/spec-kit/releases/latest)；[registry](https://registry.npmjs.org/@fission-ai%2Fopenspec)。

| 课程位置 | 课程说法 | 最新事实 | 判定 | 建议替换 |
|---|---|---|---|---|
| 第 2 章第 77 行；CHANGELOG 第 39 行 | "官方已标注 npm 安装方式为 deprecated" | 官方文档把 npm 列为受支持的方式（需 Node 22+，安装的是同一个原生二进制）；registry 没有 deprecated 标记 | ❌ | "`npm install -g @anthropic-ai/claude-code` 仍受支持（需 Node 22+，安装的是同一原生二进制，勿用 sudo）；官方首推原生安装器（会自动更新），其次是 WinGet/Homebrew（需手动 upgrade）" |
| 第 6 章第 34 行 | Claude Code 也有桌面/IDE 集成 | 正确 | ✅ | — |
| 第 6 章第 36 行 | "Copilot / 其他 —— IDE 插件 —— 补全" | Codex CLI 等终端 Agent 已成主流竞品 | ⚠️（P2） | 加一行："OpenAI Codex CLI ｜ 终端 Agent ｜ AGENTS.md / skills / MCP / subagents ｜ OpenAI 生态" |
| 第 6 章第 61 行 | CLAUDE.md 放在项目根，AI 每次自动读取 | 正确；也可放 `./.claude/CLAUDE.md`；没有 CLAUDE.md 时读 AGENTS.md | ⚠️（缺内容） | 6.4 节末尾加段落（见替换 I） |
| 第 6 章第 95 行 | 200 行以内；"跑 `/doctor` 可获得删减建议" | 200 行 ✅；审计命令是 `/doctor prompt-audit`（v2.1.283+）；官方的删减建议是把局部规则移到 `.claude/rules/` 并用 `paths` 限定 | ⚠️ | "……跑 `/doctor prompt-audit` 可让 Claude 找出过时或冲突的指令并给出修改建议；只对部分代码生效的规则移到 `.claude/rules/`（用 `paths` frontmatter 按路径加载），不占常驻上下文" |
| 第 6 章第 97 行 | `.cursor/rules/` 必须是 `.mdc`；`.cursorrules` 是遗留方案 | `.mdc` ✅；当前文档已不再提及 `.cursorrules` | ✅ | 可补："Cursor 也直接读取根目录和子目录的 AGENTS.md" |
| 第 6 章第 99 行 | `/init` 自动生成 CLAUDE.md | 正确；已有文件时会给出改进建议而不覆盖；`CLAUDE_CODE_NEW_INIT=1` 启用交互式流程 | ✅ | 可补上述两点 |
| 第 6 章第 140、159 行 | Skill = 目录 + SKILL.md；启动时只常驻 name+description | 正确；遵循 agentskills.io 开放标准；自定义命令已并入 skills | ✅ | 可补："Skills 遵循 Agent Skills 开放标准（agentskills.io，现为 AAIF 托管项目），Codex、Cursor 等工具同样能用；`.claude/commands/` 已并入 skills" |
| 第 6 章第 160 行 | "官方给单个 Skill 的预算约 5,000 token" | 官方是"SKILL.md 控制在 500 行以内"；5,000 token 是压缩后每个已调用 skill 的保留量 | ❌ | "官方建议 SKILL.md 正文控制在 500 行以内，详细资料拆到附属文件；description 与 when_to_use 合计超过 1,536 字符会在列表中被截断" |
| 第 6 章第 250 行 | Cursor 四种模式"Always / Auto Attached / Agent Requested / Manual" | 现名为 Always Apply / Apply Intelligently / Apply to Specific Files / Apply Manually | ⚠️ | 替换为现名，并括注旧名 |
| 第 6 章 6.4-6.7 节 | 没有提 hooks/subagents/plugins | 官方并列的六种扩展机制；"强制约束用 hook，不靠 CLAUDE.md" | ⚠️（缺内容） | 见替换 I 的表格 |
| B6 第 92-97 行 | 链接 | 均有效；OpenSpec 已到 2.0.0（11-11） | ✅ | 可选："OpenSpec 2.x" |
| B6 第 95 行 | "Cursor Rules —— 四种触发模式" | 名称已更新 | ⚠️ | 同第 250 行 |

**替换 I（第 6 章 6.4 节末尾新增）**
> **跨工具的规则文件：AGENTS.md**（2026 现状）：AGENTS.md 已成为多数编码 Agent 共用的项目说明文件（AAIF 托管项目）。Cursor 与 Codex CLI 直接读取它；Claude Code 自 v2.1.277 起在项目**没有** CLAUDE.md 时读取 AGENTS.md，两者都有时只读 CLAUDE.md。想一份文件多工具共用，可以在 CLAUDE.md 中写 `@AGENTS.md` 导入。
>
> **Claude Code 扩展机制一张表**：
>
> | 机制 | 何时加载 | 用来做什么 |
> |---|---|---|
> | CLAUDE.md / `.claude/rules/` | 每次会话常驻（rules 可按 `paths` 按需加载） | 项目约定 |
> | Skills | 只常驻描述，用到才加载正文 | 可复用的方法与流程 |
> | Subagents | 独立上下文 | 隔离调研/审查等大上下文任务 |
> | Hooks | 确定性执行，不依赖模型判断 | 必须强制的规则（如禁止改某目录） |
> | MCP | 工具协议（第 9 章） | 接入外部工具 |
> | Plugins | 打包分发 | 把以上几种机制一起分发给团队 |
>
> 口诀：**建议写进 CLAUDE.md，强制交给 hook**。

### Inferences
- 第 22 章简历定位写的是"Claude Code 深度用户"。如果第 6 章补上 hooks/subagents/AGENTS.md，学员面试时能讲出与 2026 年工具现状对齐的细节。

### Gaps
- Cursor 当前文档没有说明旧 `.cursorrules` 是否仍被读取，所以无法确认"遗留方案"是指仍可用还是已失效。
- 没有找到 Codex CLI 的 npm 安装是否仍为官方推荐方式的原文（页面的 npm 标签内容未抓到）。

---

## Q8 A2A 与 AG-UI：版本、治理、关系

### Takeaway
A2A v1.0（2026-03-12）、2026-08-17 加入 AAIF、150+ 组织支持、三种绑定，这些说法都有一手来源支持。最新补丁是 v1.0.1（2026-05-28）。但 **"Growth Stage" 这个标签在 AAIF 官方公告和项目页中都找不到**，应该删掉或改写。AG-UI 不是 AAIF 项目，官方定位是 agent↔user 层，与 MCP（agent↔tools）、A2A（agent↔agent）三层互补。

### Cited Findings
- A2A 发布记录：v1.0.0 = 2026-03-12（大量破坏性变化：`tasks/list`、gRPC 多租户、ProtoJSON 枚举等）；v1.0.1 = 2026-05-28（修复）；截至 11-13 没有 v1.1 — [a2aproject/A2A Releases](https://github.com/a2aproject/A2A/releases)。
- 规范定义了 JSON-RPC（§9）、gRPC（§10）、HTTP+JSON/REST（§11）三种绑定，外加自定义绑定（§12）；"Latest Released Version 1.0.0" — [A2A Specification](https://a2a-protocol.org/latest/specification/)。
- AAIF 公告日期为 2026-08-17，A2A "joining the Agentic AI Foundation (AAIF) as a hosted project"，"backed by over 150 organizations"，并列出 Google Cloud、Microsoft Azure AI Foundry、AWS Bedrock AgentCore 原生支持；**全文没有 "Growth"、"stage"、"Impact" 字样** — [AAIF：A2A joins AAIF（md 版）](https://aaif.io/md/blog/a2a-joins-aaif)。项目页同样没有阶段标签 — [AAIF Agent2Agent 项目页](https://aaif.io/projects/agent2agent)。AAIF 目前托管 10 个项目：Agent Router、Agent Skills、A2A、AGENTS.md、agentgateway、Goose、MCP、Open Responses、OpenEnv、OpenSandbox — [AAIF Projects](https://aaif.io/projects)。
- A2A 官网的定位原文："MCP connects an agent to tools, APIs, and data. A2A connects it to other agents. Use both."；官方 JS SDK 为 `@a2a-js/sdk` — [a2a-protocol.org](https://a2a-protocol.org/latest/)。npm 最新 1.3.0（2026-09-29）。
- AG-UI 官方定义："open, lightweight, event-based protocol that standardizes how AI agents connect to user-facing applications"，起源于 CopilotKit 与 LangChain、CrewAI 的合作；官方将 AG-UI（agent↔user）、MCP（agent↔tools）、A2A（agent↔agent）列为互补的三层 — [AG-UI Introduction](https://docs.ag-ui.com/introduction)。`@ag-ui/core`/`@ag-ui/client` 1.0.4（2026-11-05）。

| 课程位置 | 课程说法 | 事实 | 判定 | 建议替换 |
|---|---|---|---|---|
| 第 11 章第 236 行 | "2026-03 发布 v1.0" | 2026-03-12 | ✅ | 可补："最新 v1.0.1（2026-05）" |
| 第 11 章第 236 行 | "2026-08 以 Growth Stage 项目加入 Linux Foundation 下的 AAIF" | 加入时间（08-17）✅；"Growth Stage"在一手来源中不存在 | ⚠️ | "2026-08 作为托管项目加入 Linux Foundation 旗下的 Agentic AI Foundation（AAIF），与 MCP、AGENTS.md、Agent Skills 同属一个中立基金会" |
| 第 11 章第 236 行 | 150+ 组织；JSON-RPC / gRPC / HTTP+JSON 三种绑定；GCP / AWS Bedrock AgentCore / Azure AI Foundry 原生支持 | 均得到证实 | ✅ | — |
| 第 11 章第 236 行 | "2025 年由 Google 联合 50+ 家推出" | 本轮未复核 | （见 Gaps） | — |
| 第 11 章第 235-237 行；第 9 章第 216 行 | MCP 连工具、A2A 连 Agent | 与 A2A 官方表述一致 | ✅ | 可补一句："面向用户界面还有 AG-UI（agent↔user，第 20 章），三者是互补的三层" |
| CHANGELOG 第 35 行 | "A2A 更新到 v1.0 + AAIF Growth Stage" | 同上 | ⚠️ | 去掉"Growth Stage" |

### Inferences
- 二手资料（如某些博客）中出现过"accepted as a Growth Stage project"的说法，课程很可能是从那里转引的。AAIF 后来公布的分级是 Sandbox→Growth→Impact，这类说法有可能是推测，但没有官方原文支持，不宜写进教材。

### Gaps
- A2A 2025 年发布时的"50+ 合作方"本轮没有找到一手来源复核（与公开记录一致，但未取证）。
- 不确定 AAIF 是否在其他页面（如 TOC 会议纪要）公布过 A2A 的阶段。

---

## Q9 记忆工具（第 14 章）：Mastra Memory、mem0、Zep、Letta、MemGPT

### Takeaway
第 14 章把 mem0/Zep/Letta 说成"Python 生态为主"，已经不准确：三者都有官方 TS SDK，mem0 还提供可在 TS 中自托管的 OSS 入口。Mastra 的观察式记忆真实存在，但需要显式开启，并且必须配 storage。MemGPT 思想部分无需修改。

### Cited Findings
- `mem0ai` 3.3.1，描述为"The Memory Layer For Your AI Apps"，`exports` 包含 `"."` 与 `"./oss"`（开源自托管实现）；依赖 `zod ^3.24.1` — [registry](https://registry.npmjs.org/mem0ai/latest)。
- `@getzep/zep-cloud` 4.1.0："The TypeScript SDK for Zep, the context layer for AI agents."（2026-11-02 有更新） — [registry](https://registry.npmjs.org/@getzep%2Fzep-cloud/latest)。
- `@letta-ai/letta-client` 1.12.1："The official TypeScript library for the Letta API"（最近一次更新在 2026-06-02） — [registry](https://registry.npmjs.org/@letta-ai%2Fletta-client/latest)。
- Mastra Observational Memory 的事实见 Q4 — [Mastra Memory overview](https://mastra.ai/docs/memory/overview)。

| 课程位置 | 课程说法 | 事实 | 判定 | 建议替换 |
|---|---|---|---|---|
| 第 14 章第 164 行 | Mastra Memory `new Memory({ options: { lastMessages: 20 } })` 起步，"内置观察式记忆=后台自动压缩旧消息" | API 正确；观察式记忆需 `observationalMemory: true` 开启；必须配 storage | ⚠️ | "……`new Memory({ options: { lastMessages: 20 } })` 起步（需在 Mastra 实例或 Agent 上配置 storage，如 `@mastra/libsql`）；可选开启观察式记忆（`observationalMemory: true`：后台 Agent 把旧消息压缩成观察日志，开启后 `lastMessages` 不再生效）……" |
| 第 14 章第 164 行 | "mem0/Zep/Letta 为独立记忆服务（Python 生态为主、有 API）" | 三者都有官方 TS SDK（`mem0ai`、`@getzep/zep-cloud`、`@letta-ai/letta-client`） | ⚠️ | "mem0/Zep/Letta 为独立记忆服务，均提供官方 TypeScript SDK（`mem0ai` 含 `mem0ai/oss` 自托管入口、`@getzep/zep-cloud`、`@letta-ai/letta-client`）；注意 `mem0ai` 3.x 仍依赖 Zod 3，会与课程的 Zod 4 并存" |
| 第 14 章第 162 行 | MemGPT（arXiv:2310.08560，Letta 前身） | 论文链接有效；"Letta 前身"本轮未取证 | ✅（未复核） | — |
| 第 14 章第 210 行 | Mastra Memory 文档链接 | 有效 | ✅ | — |

### Inferences
- 对"纯 TypeScript"课程来说，"Python 生态为主"的表述会让学员误以为不能用。改成"有官方 TS SDK"更符合课程定位。

### Gaps
- 没有核实 Letta TS 客户端自 2026-06 以来是否仍在活跃维护（npm 最近更新为 06-02），也没有核实 Letta 服务端最新版本。
- "MemGPT 是 Letta 前身"没有在本轮取得一手来源。
