# R5 调研：Agent 基础设施 —— MCP、沙箱、浏览器自动化、持久执行、网关

> 调研日期：2026-10-11。全部结论基于联网核实（官方文档 / GitHub / npm registry 优先），关键结论附来源 URL。
> 用途：《纯 TypeScript 的 AI 开发教程》选型与写稿依据。

---

## 1. MCP（Model Context Protocol）TypeScript SDK

### 定位
- MCP 是 Anthropic 发起的开放协议，让 LLM 应用与「工具/资源/提示」提供方（server）标准化互联。三大能力：**Resources**（可读数据）、**Tools**（模型可调用的函数）、**Prompts**（预写模板）。
  - 来源：https://modelcontextprotocol.io/quickstart/server
- 官方 TypeScript SDK 属 **Tier 1**（最高维护级别），仓库 `modelcontextprotocol/typescript-sdk`，专用文档站 ts.sdk.modelcontextprotocol.io。
  - 来源：https://modelcontextprotocol.io/docs/2026-07-28/sdk

### 包名与版本（重点：v1→v2 包名变更，教程必须写对）
- **v2（当前主线，对应 2026-07-28 版 MCP 规范）已拆分为两个包**（npm registry 实测，均发布于 2026-10-05）：
  - `@modelcontextprotocol/server` **2.3.1** —— "Model Context Protocol implementation for TypeScript - Server package"
  - `@modelcontextprotocol/client` **2.3.1** —— "... - Client package"
  - 来源：https://registry.npmjs.org/@modelcontextprotocol/server 、https://registry.npmjs.org/@modelcontextprotocol/client
- 旧单体包 `@modelcontextprotocol/sdk` 最新 **1.32.1**，仍在 `v1.x` 分支维护（承诺至少 6 个月 bug 修复）。大量旧教程/旧代码用它，教程需说明两者关系。
  - 来源：https://registry.npmjs.org/@modelcontextprotocol/sdk 、SDK v2 README（jsdelivr 镜像）：https://cdn.jsdelivr.net/gh/modelcontextprotocol/typescript-sdk@main/README.md
- v2 另有可选中间件包：`@modelcontextprotocol/node`（Node.js Streamable HTTP transport wrapper）、`@modelcontextprotocol/express`、`@modelcontextprotocol/fastify`、`@modelcontextprotocol/hono`。
  - 来源：同上 README
- **zod 是 SDK 的 peer dependency**：SDK 内部从 `zod/v4` 导入，兼容 Zod ≥3.25。
  - 来源：https://ts.sdk.modelcontextprotocol.io/

### Server 端最小示例（v2 官方 README，逐字来源）
```bash
npm install @modelcontextprotocol/server zod
```
```typescript
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const server = new McpServer({ name: 'greeting-server', version: '1.0.0' });

server.registerTool(
    'greet',
    {
        description: 'Greet someone by name',
        inputSchema: z.object({ name: z.string() })
    },
    async ({ name }) => ({
        content: [{ type: 'text', text: `Hello, ${name}!` }]
    })
);

const transport = new StdioServerTransport();
await server.connect(transport);
```
- 来源：https://github.com/modelcontextprotocol/typescript-sdk （README，经 jsdelivr 镜像核实）
- 官方 quickstart（TS 版，天气服务器完整教程）：要求 **Node.js ≥ 20**，同样安装 `@modelcontextprotocol/server zod`；**stdio server 中严禁 console.log（会破坏 JSON-RPC），日志一律走 console.error/stderr**。
  - 来源：https://modelcontextprotocol.io/quickstart/server

### Client 端最小示例（官方 client 教程核心片段）
```bash
npm install @anthropic-ai/sdk @modelcontextprotocol/client dotenv
```
```typescript
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
this.transport = new StdioClientTransport({ command, args: [serverScriptPath] });
await this.mcp.connect(this.transport);

const toolsResult = await this.mcp.listTools();
// toolsResult.tools -> [{ name, description, inputSchema }]

const result = await this.mcp.callTool({ name: toolName, arguments: toolArgs });
// result.content -> [{ type: "text", text }]
```
- 来源：https://modelcontextprotocol.io/docs/2026-07-28/develop/build-client

### 传输方式
- SDK 支持三种传输，官方推荐顺序（ts.sdk 文档原话）：
  - **Streamable HTTP**（远程 server，推荐）
  - **HTTP + SSE**（仅为向后兼容）
  - **stdio**（本地子进程集成，最简单，无需 HTTP server）
  - 来源：https://ts.sdk.modelcontextprotocol.io/
- v1 的 Streamable HTTP 服务端写法（官方示例文件 `src/examples/server/simpleStreamableHttp.ts`，v1.x 分支）：`import { StreamableHTTPServerTransport } from '.../server/streamableHttp.js'`，配置 `sessionIdGenerator: () => randomUUID()`、`eventStore`（可恢复性）、`onsessioninitialized`，然后 `await server.connect(transport); await transport.handleRequest(req, res, req.body);`。
  - 来源：https://github.com/modelcontextprotocol/typescript-sdk （v1.x 分支示例）
- v2 中 Node 场景的 Streamable HTTP 封装在 `@modelcontextprotocol/node`（基于 IncomingMessage/ServerResponse），Express/Hono 等有对应中间件包。
  - 来源：https://github.com/modelcontextprotocol/typescript-sdk （README）
- 规范层文档：https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http

### MCP Registry / 目录现状
- **registry.modelcontextprotocol.io 是官方注册中心**（"Official MCP Registry — Discover Model Context Protocol servers"）：支持搜索/按最新版本过滤/分页浏览；提供生产（registry.modelcontextprotocol.io）与预发布（staging.registry.modelcontextprotocol.io）API 端点和 `/docs` API 参考，是面向客户端工具的程序化注册中心；代码开源（`modelcontextprotocol/registry`，"Built in the open"）。浏览公开可用，发布走 API。
  - 来源：https://registry.modelcontextprotocol.io/
- 教程口径：MCP 生态发现途径 = 官方 Registry + 各客户端内置目录（如 Claude Code 的 `/mcp`）+ 社区目录（PulseMCP 等）。

### 与 Claude Desktop / Claude Code 接入
- **Claude Desktop**：把 server 写进 `claude_desktop_config.json`（Windows: `%APPDATA%\Claude\claude_desktop_config.json`；macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`）：
  ```json
  { "mcpServers": { "weather": { "command": "node", "args": ["C:\\PATH\\TO\\build\\index.js"] } } }
  ```
  保存后**完全退出并重启** Claude Desktop。来源：https://modelcontextprotocol.io/quickstart/server
- **Claude Code**（CLI 管理，来源：https://code.claude.com/docs/en/mcp ）：
  ```bash
  claude mcp add --transport http <name> <url>        # 远程 HTTP（推荐）
  claude mcp add --transport stdio my-server -- node ./build/index.js   # 本地 stdio
  claude mcp list / claude mcp get <name> / claude mcp remove <name>
  ```
  作用域 `--scope local|project|user`；`project` 生成可提交版本库的 **`.mcp.json`**（格式 `{"mcpServers": {"shared-server": {"type": "http", "url": "..."}}}`，支持 `${VAR}` 环境变量展开）。

### 教程中何时用
- Agent 篇「工具系统标准化」一章：先手写 tool calling，再引入 MCP（把同一工具暴露给 Claude Code/Claude Desktop 复用），server 用 `@modelcontextprotocol/server` v2 + zod/v4；传输先 stdio 后 Streamable HTTP。

---

## 2. E2B —— 代码执行沙箱

### 定位
- 「在云端安全隔离沙箱中运行 AI 生成代码」的开源基础设施，基于 Firecracker microVM，冷启动约 150ms；产品线：Sandbox / Code Interpreter / Desktop。
  - 来源：https://github.com/e2b-dev/code-interpreter （README）

### 包名（npm registry 实测 2026-10-11）
- `e2b` **2.55.0** —— "E2B SDK that give agents cloud environments"（通用 Sandbox SDK）
- `@e2b/code-interpreter` **2.8.3** —— "E2B Code Interpreter - Stateful code execution"（有状态代码执行：results/图表/富结果）
- 来源：https://registry.npmjs.org/e2b/latest 、https://registry.npmjs.org/@e2b/code-interpreter/latest
- 文档站（v2）：JS SDK v2.53.x / Code Interpreter JS SDK v2.7.x 文档组。来源：https://docs.e2b.dev/llms.txt

### 价格与免费层（官方定价页核实）
- **Hobby 档 $0/月：一次性 $100 使用额度**（无需信用卡），并发 20 个沙箱，单沙箱最长 1 小时；**没有永久免费层**（额度一次性，用完转按量）。
- 按量（按秒计费）：vCPU **$0.000014/vCPU·秒 ≈ $0.0504/vCPU·小时**；RAM **$0.0000045/GiB·秒 ≈ $0.0162/GiB·小时**；沙箱存储免费（Hobby 10 GiB / Pro 20 GiB）。默认配置 2 vCPU + 4 GiB ≈ $0.132/小时。
- 付费档：Pro $150/月（并发 100、单沙箱 24h、可配 1–8 vCPU / 1–8 GiB）；Pro+ $650；Pro++ $1,150；Enterprise $3,000 起。
  - 来源：https://e2b.dev/pricing

### 最小代码示例（官方文档 NodeJS 教程）
```bash
npm i @e2b/code-interpreter @anthropic-ai/sdk dotenv
```
```typescript
import { Sandbox } from '@e2b/code-interpreter';
import fs from 'node:fs';

const sbx = await Sandbox.create();
await sbx.files.write('dataset.csv', fs.readFileSync('dataset.csv')); // 上传数据
const execution = await sbx.runCode(aiGeneratedCode);                  // 执行 AI 生成的代码
if (execution.error) { /* error.name / error.value / error.traceback */ process.exit(1); }
for (const result of execution.results) {
  if (result.png) fs.writeFileSync('chart.png', result.png, { encoding: 'base64' });
}
```
- 运行：`npx tsx index.ts`。来源：https://docs.e2b.dev/code-interpreting/analyze-data-with-ai

### 教程中何时用
- Agent 篇「代码执行/数据分析 Agent」：Agent 生成代码 → 沙箱执行 → 回收结果（文本/图表/错误）。比让学生自配 Docker 更省事，且免费额度对教学绰绰有余。

---

## 3. Playwright —— 浏览器自动化（Agent 的眼睛和手）

### 定位与最小用法（官方 Library 文档）
- 既是测试框架也是自动化库；系统要求 Node 22.x/24.x/26.x。
  - 来源：https://playwright.dev/docs/intro
- **Library 模式（Agent 场景用这个，不是 @playwright/test）**：
  ```bash
  npm i -D playwright
  npx playwright install chromium firefox webkit
  ```
  ```js
  const { chromium } = require('playwright');
  (async () => {
    const browser = await chromium.launch();          // 默认无头；headless: false 显示窗口
    const page = await browser.newPage();
    await page.goto('https://playwright.dev/');
    await page.screenshot({ path: 'example.png' });
    await browser.close();
  })();
  ```
  - 来源：https://playwright.dev/docs/library
- 版本：npm `playwright` **1.64.0**（"A high-level API to automate web browsers"）。来源：https://registry.npmjs.org/playwright/latest

### 与 MCP 的关系：官方 Playwright MCP server
- **微软官方维护** `microsoft/playwright-mcp`，npm 包 `@playwright/mcp` **0.0.83**（"Playwright Tools for MCP"）。
  - 来源：https://github.com/microsoft/playwright-mcp 、https://registry.npmjs.org/@playwright/mcp/latest
- 特性：LLM 通过**结构化无障碍树快照**与页面交互（不必依赖截图/视觉模型），工具如 `browser_navigate / browser_click / browser_type / browser_fill_form / browser_snapshot / browser_take_screenshot / browser_evaluate / browser_tabs` 等。
- 运行与接入：
  ```bash
  npx @playwright/mcp@latest                      # 标准 JSON: {"mcpServers":{"playwright":{"command":"npx","args":["@playwright/mcp@latest"]}}}
  claude mcp add playwright npx @playwright/mcp@latest          # Claude Code
  code --add-mcp '{"name":"playwright","command":"npx","args":["@playwright/mcp@latest"]}'  # VS Code
  npx @playwright/mcp@latest --port 8931          # 独立服务
  ```
- 关键选项：**默认有头，`--headless` 开无头**；`--browser chrome|firefox|webkit|msedge`；`--caps vision,pdf,devtools`；`--isolated`、`--storage-state`、`--cdp-endpoint`（接管真实浏览器）等。支持 Docker（仅无头 Chromium）。
  - 来源：https://github.com/microsoft/playwright-mcp （README）

### 教程中何时用
- Agent 篇「浏览器 Agent」两条路线：① 直接在 TS 代码里用 `playwright` 库做工具（可控、可测试）；② 零代码路线——给 Claude Code/Cursor 挂 `@playwright/mcp`。两条都值得写，①为主②为辅。

---

## 4. Inngest —— TS 原生持久执行（durable functions）

### 定位
- "Inngest is the reliability layer for modern applications"（npm 描述）：事件驱动的持久执行平台，`step.run` 内置重试/记忆化/断点恢复；**开源可自托管**。
- **AgentKit**（`@inngest/agent-kit`，当前 **0.13.2**）：Inngest 的 AI Agent 框架——`createAgent`（名称/system/模型/工具）+ `createNetwork`（多 Agent + Router + 共享 State），模型工厂为 AI SDK 风格（`openai({ model: "gpt-4o" })`、`anthropic("claude-3-5-haiku-latest")`），支持 MCP 工具，配合 Inngest Dev Server 有本地实时 trace。
  - 来源：https://agentkit.inngest.com/ 、https://registry.npmjs.org/@inngest/agent-kit/latest
- npm 主包 `inngest` **4.23.0**。来源：https://registry.npmjs.org/inngest/latest

### 最小代码示例（官方 SDK README）
```bash
npm install inngest
```
```typescript
import { Inngest } from "inngest";
const inngest = new Inngest({ id: "my-app" });

export default inngest.createFunction(
  { id: "user-onboarding-communication", triggers: [{ event: "app/user.signup" }] },
  async ({ event, step }) => {
    await step.run("Send welcome email", async () => {
      await sendEmail({ email: event.data.email, template: "welcome" });
    });
  }
);
```
- 触发：`inngest.send("app/user.signup", { data: {...} })`；函数经框架适配器（如 `inngest/next`）serve。
  - 来源：https://github.com/inngest/inngest-js （packages/inngest/README.md，经 jsdelivr 核实）
- 与 Vercel AI SDK 生态整合良好，Vercel 官方提供 Inngest starter 模板。来源：https://vercel.com/templates/inngest-starter

### 免费层（官方定价页核实）
- **Free：$0/月，50k 执行/月**、5 seats、5 并发 step、3 workers、500k events/月、24 小时 trace 历史、无需信用卡；超限暂停（升级恢复）。
- Pro **$99/月**起（1M 执行）；Business **$499/月**起；Enterprise 定制。自托管免费（开源，约 7.1k stars）。
  - 来源：https://www.inngest.com/pricing

### 教程中何时用
- 工程化篇「可靠性与长任务」主线：把 Agent 循环/批处理包进 `step.run`，演示崩溃后从断点续跑。

---

## 5. Trigger.dev —— Inngest 的主要对位

### 定位与 v4 现状
- 官网定位："The open source platform for durable AI agents"，**开源 Apache 2.0、可自托管**；TypeScript-first，长任务 + 重试 + 队列 + AI 可观测性 + 弹性伸缩。
- 当前大版本 **v4**（2026-10-06 更新至 v4.7.3）；npm `@trigger.dev/sdk` **4.7.3**。
  - 来源：https://trigger.dev/ 、https://registry.npmjs.org/@trigger.dev/sdk/latest
- CLI 工作流：
  ```bash
  npx trigger.dev@latest init   # 建 /trigger 目录 + trigger.config.ts + 示例任务
  npx trigger.dev@latest dev    # 本地 dev server，热注册任务
  ```
  - 来源：https://trigger.dev/docs/quick-start
- 首页展示的 v4 新形态：`chat.agent({ id, tools })` 持久聊天 Agent（"survives refreshes, redeploys, and crashes"）、`needsApproval: true` 人工审批、`task({ retry: { maxAttempts: 3, ... } })`。
  - 来源：https://trigger.dev/

### 免费层（官方定价页核实）
- **Free：$0/月，含 $5/月使用额度**、20 并发 run、1 天日志保留、5 成员、10 schedules。
- Hobby **$10/月**（$10 额度、50 并发、7 天日志）；Pro **$50/月**（$50 额度、200+ 并发、30 天日志）；Enterprise 定制。
  - 来源：https://trigger.dev/pricing

### 与 Inngest 对比（教程口径）
| 维度 | Inngest | Trigger.dev |
|---|---|---|
| 免费层 | 50k 执行/月（无额度概念） | $5/月额度 + 20 并发 |
| 心智模型 | 事件驱动 + 显式 step | 任务队列 + io.runTask / 新版 chat.agent |
| Agent 支持 | AgentKit（createAgent/Network） | 内置 durable chat agent、AI observability |
| 自托管 | 开源可自托管 | 开源（Apache 2.0）可自托管 |
- 两者都 TS 一流、都能覆盖教程需求；选一个做主线、另一个做一节对比即可。

---

## 6. Cloudflare Workers / Durable Objects + AI Gateway

（Agents SDK / Durable Objects 细节由另一份调研覆盖，此处只补部署入口与 AI Gateway。）

### Workers 上部署 AI 应用
```bash
npm create cloudflare@latest -- my-first-worker
cd my-first-worker
npx wrangler dev      # 本地 http://localhost:8787
npx wrangler deploy   # 上线 <name>.<subdomain>.workers.dev
```
- 来源：https://developers.cloudflare.com/workers/get-started/guide/

### AI Gateway 免费功能（官方文档核实）
- 定位：位于应用与 AI 提供商（Workers AI / OpenAI / Anthropic / Gemini / Replicate 等）之间的观测与控制代理，"Available on all plans"，官方称一行代码（改 base URL）接入。
  - 来源：https://developers.cloudflare.com/ai-gateway/
- **免费核心功能：分析（dashboard analytics）、缓存（caching）、限流（rate limiting）**；另有日志（logs）、重试/fallback、Guardrails（按 Workers AI token 计费）、统一计费（充值收 5% 手续费）。
- 端点格式：
  ```
  https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/{provider}
  ```
- 日志上限：旧版 Legacy Logs——Workers Free 全部网关合计 100,000 条、Paid 每网关 10,000,000 条；**2026-09-24 之后创建首个网关的新客户改按 Workers Logs 定价**。
  - 来源：https://developers.cloudflare.com/ai-gateway/reference/pricing/
- OpenAI SDK 兼容端点（可把 `baseURL` 直接指过来）：`https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1`，模型名用 `provider/model`（如 `openai/gpt-4.1-mini`）。
  - 来源：https://developers.cloudflare.com/ai-gateway/get-started/connecting-applications/

### 教程中何时用
- 工程化篇「上线」：Worker 部署 + AI Gateway 免费获得请求日志/成本分析/缓存/限流，作为可观测性的最省事方案。

---

## 7. 模型网关：one-api / new-api（自部署）

### one-api（songquanpeng/one-api，MIT）
- 定位：LLM API 管理与分发系统，**用标准 OpenAI API 格式访问所有大模型**；单可执行文件 + 官方 Docker 镜像，开箱即用。
- 支持渠道：OpenAI（含 Azure）、Anthropic Claude（含 AWS）、Google Gemini/PaLM、Mistral，国内（豆包/文心/通义/星火/智谱/混元/Moonshot/百川/MINIMAX/零一/阶跃/Coze/DeepSeek/硅基流动），以及 Groq、Ollama、Cohere、Cloudflare Workers AI、xAI 等。
- 功能：多渠道负载均衡、流式、令牌管理（额度/过期/IP/模型限制）、兑换码、用户与渠道分组倍率、模型映射、失败自动重试、Redis 缓存、多种登录。
  - 来源：https://github.com/songquanpeng/one-api （README）
- **Docker 部署**（SQLite 版，端口 3000，初始账号 root/123456）：
  ```bash
  docker run --name one-api -d --restart always -p 3000:3000 \
    -e TZ=Asia/Shanghai -v /home/ubuntu/data/one-api:/data justsong/one-api
  ```
  使用：客户端 `OPENAI_API_BASE="https://<HOST>:<PORT>/v1"` + one-api 生成的令牌。
  - 来源：同上 README

### new-api（QuantumNous/new-api，AGPLv3 + 署名条款）
- 定位：基于 one-api 二次开发的增强版，"An AI gateway for models, applications, and agents"。
- 相比 one-api 的新增：多协议（OpenAI Chat/Responses、**Anthropic Messages**、Gemini、WebSocket 实时）；RelayKit 四种文本协议互转；渠道优先级/权重/亲和/多上游 key；配额/订阅/表达式计费；OAuth/OIDC/passkey/2FA；JS 任务插件与插件市场；独立日志库（ClickHouse）；Electron 桌面端。
  - 来源：https://github.com/QuantumNous/new-api （README）
- **Docker 部署**（SQLite 单实例）：
  ```bash
  docker run --name new-api -d --restart unless-stopped \
    -p 127.0.0.1:3000:3000 -e TZ=Asia/Shanghai \
    -v "$(pwd)/data:/data" calciumion/new-api:latest
  ```
  或仓库内 `docker compose up -d`（默认 New API + PostgreSQL + Redis）。
  - 来源：同上 README

### 教程中何时用
- 选修/附录：国内多模型统一接入、团队内分发 key 与额度管控的场景。教程主线仍用官方 SDK + 官方 API（或 Cloudflare AI Gateway）。

---

## 8. Zod —— schema 与结构化输出的通用语言

### 当前大版本
- npm `zod` 当前 **4.6.5**（"TypeScript-first schema declaration and validation library with static type inference"）。来源：https://registry.npmjs.org/zod/latest
- 时间线：2025-05 在 `zod@3.25.x` 内以 `"zod/v4"` 子路径首发（稳定可用）→ **2025-07-08 `zod@4.0.0` 正式发布**，包根默认导出 v4。今天 `npm install zod` 得到的就是 v4。
  - 来源：https://zod.dev （Versioning 页）、https://www.npmjs.com/package/zod
- v4 要点：更快的新核心、新错误定制 API、`z.json()` 生成 JSON Schema、可 tree-shake 入口。

### 在 AI 技术栈中的角色（三处实证）
1. **MCP SDK 的 peer dependency**：SDK 内部从 `zod/v4` 导入，要求兼容 Zod ≥3.25；`server.registerTool` 的 `inputSchema` 就是 `z.object({...})`。来源：https://ts.sdk.modelcontextprotocol.io/ 、https://modelcontextprotocol.io/quickstart/server
2. **Vercel AI SDK 的工具定义**（官方文档原话："`inputSchema`: A Zod schema or a JSON schema that defines the input parameters"）：
   ```ts
   import { tool } from 'ai';
   import { z } from 'zod';
   export const weatherTool = tool({
     description: 'Get the weather in a location',
     inputSchema: z.object({ location: z.string().describe('The location to get the weather for') }),
     execute: async ({ location }) => ({ location, temperature: 72 }),
   });
   ```
   来源：https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
3. **结构化输出**：同一 schema 既能生成给模型看的 JSON Schema，又能校验模型返回（AI SDK `generateObject` / MCP 输入校验同思路）。

### 教程中何时用
- 地基篇就引入（早于任何 AI 内容），Agent 篇反复复用：一份 `z.object` 同时服务「提示词里的格式约束 + 运行时校验 + TS 类型推导」。

---

## 9. Upstash Redis —— serverless 会话/状态存储

### 定位与免费层（官方定价页核实）
- 按命令计费（per-command billing）的 serverless Redis，走 HTTP REST API，适合边缘/Serverless/短连接场景，空闲不收费。
- **Free 档：$0/月 —— 250MB 数据、500K 命令/月、10GB 带宽/月、最高 10,000 命令/秒、1 个数据库（单区域）**。
- 付费：Pay-as-you-go **$0.2/100K 命令**（存储 $0.25/GB·月，首 1GB 免费；带宽前 200GB/月免费）；Fixed 套餐 **$10/月** 起。
  - 来源：https://upstash.com/pricing/redis

### 包与最小示例
- npm `@upstash/redis` 当前 **1.39.0**（"An HTTP/REST based Redis client built on top of Upstash REST API"）。来源：https://registry.npmjs.org/@upstash/redis/latest
- 官方 README：
  ```bash
  npm install @upstash/redis
  ```
  ```ts
  const redis = new Redis({
    url: <UPSTASH_REDIS_REST_URL>,
    token: <UPSTASH_REDIS_REST_TOKEN>,
  });
  await redis.set('key', 'value');
  let data = await redis.get('key');
  ```
  - 来源：https://github.com/upstash/upstash-redis （README）

### 教程中何时用
- Agent 篇「记忆与会话」：多轮会话历史、Agent 状态、限流计数器的默认存储；免费层 500K 命令/月对教学项目完全够用。HTTP 协议意味着在 Workers/边缘函数里也能直连。

---

## 教程选型建议

1. **持久执行（可靠性章节）：主线 Inngest，对比 Trigger.dev**
   - 理由：Inngest 免费层 50k 执行/月（无额度焦虑），`step.run` 心智模型简单且直接对应「持久执行」概念；AgentKit 与 Vercel AI SDK 风格模型工厂一致，衔接顺滑；可自托管。Trigger.dev v4 免费层是 $5/月额度，更适合以一节「另一种选择」呈现（它家的 durable chat agent 与 Dashboard 也值得认识）。Temporal/自建队列不进教程。

2. **沙箱：教程正文用 E2B，进阶附录提 Docker**
   - E2B 的 TS SDK 一流、`$100` 一次性免费额度 + 按秒计费，教学零成本起步；`@e2b/code-interpreter` 返回结构化 results/图表，非常适合「数据分析 Agent」一章。Docker 自建沙箱作为进阶附录（本地开发、网络隔离要点），不做主线（Windows 学生环境差异大）。

3. **网关：MCP 必学，AI Gateway 推荐，one-api/new-api 选修**
   - **MCP 是必学**：已是工具生态事实标准（Claude Code/Desktop、VS Code、Cursor 都原生支持），且 TS SDK 是 Tier 1；教程用 v2 新包名 `@modelcontextprotocol/server` / `@modelcontextprotocol/client`，同时交代旧包 `@modelcontextprotocol/sdk` 的存在（学生查旧资料时会遇到）。
   - Cloudflare AI Gateway：免费的可观测/缓存/限流层，一行改 baseURL 即用，工程化篇默认推荐。
   - one-api/new-api：定位为「自部署统一网关」选修章节（多模型聚合、团队 key 管控、国内渠道场景）；不作为教程运行的前提。

4. **贯穿件**：Zod v4（地基篇）+ Upstash Redis（会话/状态默认存储，免费层够用）+ Playwright（浏览器 Agent：库模式为主、`@playwright/mcp` 为辅）。

5. **写作时的版本口径（2026-10-11 核实）**：`@modelcontextprotocol/server`/`client` 2.3.1、`@modelcontextprotocol/sdk` 1.32.1（旧）、`e2b` 2.55.0、`@e2b/code-interpreter` 2.8.3、`playwright` 1.64.0、`@playwright/mcp` 0.0.83、`inngest` 4.23.0、`@inngest/agent-kit` 0.13.2、`@trigger.dev/sdk` 4.7.3、`zod` 4.6.5、`@upstash/redis` 1.39.0。写稿时建议再次 `npm view <pkg> version` 复核。

---

## 附：本次核实使用的主要来源索引

| 主题 | 来源 |
|---|---|
| MCP quickstart/server | https://modelcontextprotocol.io/quickstart/server |
| MCP client 教程 | https://modelcontextprotocol.io/docs/2026-07-28/develop/build-client |
| MCP SDK 概览与 Tier | https://modelcontextprotocol.io/docs/2026-07-28/sdk 、https://ts.sdk.modelcontextprotocol.io/ |
| TS SDK 源码/README | https://github.com/modelcontextprotocol/typescript-sdk |
| npm registry（版本） | registry.npmjs.org（@modelcontextprotocol/server、/client、/sdk、e2b、@e2b/code-interpreter、playwright、@playwright/mcp、inngest、@inngest/agent-kit、@trigger.dev/sdk、zod、@upstash/redis） |
| MCP Registry | https://registry.modelcontextprotocol.io/ |
| Claude Code MCP 文档 | https://code.claude.com/docs/en/mcp |
| E2B | https://e2b.dev/pricing 、https://docs.e2b.dev/code-interpreting/analyze-data-with-ai 、https://github.com/e2b-dev/code-interpreter |
| Playwright | https://playwright.dev/docs/intro 、https://playwright.dev/docs/library 、https://github.com/microsoft/playwright-mcp |
| Inngest | https://www.inngest.com/pricing 、https://agentkit.inngest.com/ 、https://github.com/inngest/inngest-js 、https://vercel.com/templates/inngest-starter |
| Trigger.dev | https://trigger.dev/ 、https://trigger.dev/pricing 、https://trigger.dev/docs/quick-start |
| Cloudflare | https://developers.cloudflare.com/workers/get-started/guide/ 、https://developers.cloudflare.com/ai-gateway/ 、https://developers.cloudflare.com/ai-gateway/reference/pricing/ 、https://developers.cloudflare.com/ai-gateway/get-started/connecting-applications/ |
| one-api / new-api | https://github.com/songquanpeng/one-api 、https://github.com/QuantumNous/new-api |
| Zod | https://zod.dev 、https://www.npmjs.com/package/zod 、https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling |
| Upstash | https://upstash.com/pricing/redis 、https://github.com/upstash/upstash-redis |
