# 第 09 章 · MCP 协议（Model Context Protocol）

> 📋 **本章目标**
> 1. 说清 MCP 解决什么问题、三大原语与两种传输（面试新热点，14-20% 岗位要求且快速上升）
> 2. 用官方 TS SDK（v2 新包）写一个 MCP Server 并**接入 Claude Code 实际使用**
> 3. 写一个 MCP Client，把任意 MCP Server 的工具接进你第 8 章的 Agent
> 4. 了解远程部署（Streamable HTTP）、官方 Registry 与生态（Playwright MCP 实战）
>
> 前置知识：第 07-08 章（工具调用与 Agent 循环）｜预计用时：6-10 小时
>
> **岗位依据**：MCP 出现在 BOSS 20+ 岗、V2EX ~14% 帖且快速上升（观麦「为模型定制开发 MCP Server」、绿联、沃尔玛 JD 均点名）。**工具协议正在标准化，这是前端工程师的顺风口**——TS SDK 是官方 Tier 1 支持。
>
> ⚠️ **版本提示（2026-11 复核）**：MCP TS SDK 当前主线是 **v2 拆分包**：`@modelcontextprotocol/server` 与 `@modelcontextprotocol/client`（2.4.0，2026-10-23）。网上大量旧教程用的单体包 `@modelcontextprotocol/sdk`（1.32.2，v1 维护线）仍在维护但属旧版——查资料时注意区分（本章代码全部用 v2 新包）。当前规范版本是 **2026-07-28**，改动很大：v2 SDK 两代协议都能说，但**要你在代码里选**（见 9.1 末尾的规范提示）。

---

## 9.1 MCP 解决什么问题：AI 工具的「USB-C」

第 7 章你给 Agent 写了三个工具——它们是「进程内函数」，只有你的代码能用。现实需求是：

- 同一组工具（查订单、查天气、操作浏览器），**想给 Claude Code、Cursor、Claude Desktop、你自己的 Agent 同时用**——每个宿主的工具接入方式都不同
- 团队/社区想**发布和复用**工具包（就像 npm 之于 JS）

MCP = Anthropic 发起的开放协议，把「模型 ↔ 工具/数据」的连接标准化：**写一次 Server，所有支持 MCP 的宿主都能用**（Claude Code/Desktop、Cursor、VS Code 等已原生支持）。类比：工具是外设，MCP 是 USB-C 接口标准。

**MCP 三大原语**：

| 原语 | 是什么 | 例子 |
|---|---|---|
| **Tools** | 模型可调用的函数（本章主角） | `queryOrder(orderId)` |
| **Resources** | 可读取的数据（模型/用户可以看） | 文件内容、数据库 schema |
| **Prompts** | 预写的提示模板 | `/analyze-order` 斜杠命令 |

**两种传输**（官方推荐顺序）：

- **stdio**：Server 作为宿主的子进程，标准输入输出通信——本地开发最简单
- **Streamable HTTP**：Server 是远程 HTTP 服务——生产/团队共享推荐

旧的 HTTP+SSE 传输已被规范列为 Deprecated，新项目不要再用（2026-11 复核）。

> **规范提示（2026-07-28 版，当前版本；2026-11 复核）**：MCP 已改为**无状态**：
> - 取消 `initialize` 握手，每个请求在 `_meta`（`io.modelcontextprotocol/protocolVersion`、`…/clientCapabilities`）中自带协议版本与客户端能力；服务端**必须**实现 `server/discover`，客户端可以先调用它了解服务端支持的版本。
> - Streamable HTTP 的每个 POST 必须带 `MCP-Protocol-Version`、`Mcp-Method`、`Mcp-Name` 请求头，值须与请求体一致。
> - 移除了协议级会话（`Mcp-Session-Id`）、HTTP GET 推送流（`resources/subscribe` 改为 `subscriptions/listen`）和 SSE 断点续传（`Last-Event-ID`）；也移除了 `ping` 与 `logging/setLevel`。
> - 服务器→客户端的 sampling/elicitation/roots 请求改为 MRTR：服务端返回 `InputRequiredResult`，由客户端补齐输入后重试。
> - **Roots、Sampling、Logging 已列为 Deprecated**；HTTP+SSE 传输同样 Deprecated。
>
> **v2 SDK 两代协议都能说，但需要你选**：服务端用 `serveStdio(工厂函数)` 才能同时服务新旧客户端——手写 `server.connect(new StdioServerTransport())` 仍能编译，但官方明确说这样启动的 Server 只服务 2025 时代的客户端；客户端 `Client` 的 `versionNegotiation` 默认是 `'legacy'`，要用新协议必须传 `{ versionNegotiation: { mode: "auto" } }`（先探测 `server/discover`，失败再回退到 2025 的握手）。本章代码按这个写法给出。面试被问「MCP 新规范有什么变化」，答「无状态 + 每请求版本协商 + server/discover + MRTR」是加分项。规范变更清单：https://modelcontextprotocol.io/specification/2026-07-28/changelog

## 9.2 第一个 MCP Server（v2 官方写法）

```bash
# 新目录先 pnpm init（pnpm 12 会写入 "type": "module"，顶层 await 才能用），已有项目跳过
pnpm add @modelcontextprotocol/server zod
```

把第 7 章的订单查询工具变成 MCP Server。mock 数据单独放一个文件，9.6 的 HTTP 版 Server 也要用：

```ts
// order-server/orders.ts —— stdio 与 HTTP 两个 Server 共用的 mock 订单数据
export const ORDERS: Record<string, { status: string; eta: string; items: string[] }> = {
  A001: { status: "运输中", eta: "明天 18:00 前", items: ["机械键盘"] },
  A002: { status: "已签收", eta: "-", items: ["显示器支架"] },
};
```

```ts
// order-server/index.ts —— stdio MCP Server（v2 官方写法：serveStdio + 工厂函数，新旧客户端都能连）
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { ORDERS } from "./orders";

// serveStdio 可能多次调用工厂（含一次 server/discover 探测），所以每次都返回新实例
function createServer() {
  const server = new McpServer({ name: "order-server", version: "1.0.0" });

  // 注意与第 7 章 ToolDef 的同构性：name + description + Zod schema + 实现，只是换了一层协议皮
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
console.error("order-server running on stdio"); // 日志一律走 stderr
```

（以上两个文件不在 `code/` 里，已按本课程 tsconfig 通过类型检查，并实测可被 9.4 的客户端连上调用。）

**三条 v2 的规矩**（踩过的人都知道）：

1. **stdio Server 里严禁 `console.log`**——stdout 是 JSON-RPC 通道，一行日志就污染协议导致宿主解析失败。调试日志一律走 `console.error`（stderr）。
2. **zod 必须用 v4**：v2 SDK 直接依赖 `zod ^4.2.0`，Zod 3 已不受支持（官方迁移指南明确说明）。项目里 `pnpm add zod@^4.2`，导入统一写 `import { z } from "zod"`（Zod 4 根导入就是 v4 API；网上常见的 `import * as z from "zod/v4"` 是过渡期写法，效果相同）；混入 v3 会类型冲突。
3. **用 `serveStdio(createServer)` 启动，不要手写 `server.connect(new StdioServerTransport())`**。后者仍能编译，但只服务 2025 时代的客户端；`serveStdio` 会按每个连接协商协议版本，所以要传**工厂函数**，每次返回一个新的 `McpServer`（2026-11 复核）。

## 9.3 接入 Claude Code：让工具真正被用起来

写 Server 的最大动力：**Claude Code 直接可用**。两种接入方式（官方文档 code.claude.com/docs/en/mcp）：

```bash
# 方式一：命令行添加（stdio 本地进程）。-- 后面是启动 Server 的完整命令
claude mcp add order-server -- npx -y tsx /你的项目绝对路径/order-server/index.ts

# 远程 HTTP Server（生产推荐）：
# claude mcp add --transport http order-server https://your-host/mcp

claude mcp list      # 查看；/mcp 命令在会话内查看状态
```

路径写**绝对路径**最稳：宿主（Claude Code）启动子进程时的工作目录不一定是你的项目目录，相对路径可能找不到文件。用 `tsx` 跑而不是 `node x.ts`：Node 24 虽然能直接剥离类型运行 `.ts`，但本课程的相对导入不写扩展名（`./orders`），Node 原生的模块解析认不出来。

方式二：项目根放 **`.mcp.json`**（`--scope project` 生成，可提交进仓库与团队共享；没有 `type` 字段的条目按 stdio 处理）：

```json
{ "mcpServers": { "order-server": { "command": "npx", "args": ["-y", "tsx", "/你的项目绝对路径/order-server/index.ts"] } } }
```

要提交给团队时，每个人的绝对路径不同，可以用 Claude Code 支持的 `${VAR}` 环境变量展开（如 `${HOME}`）代替写死的路径。

接入后在 Claude Code 里直接问「订单 A001 到哪了」——它会调用你的 `queryOrder` 并组织回答。**做一次这个实验**：你会直观看到「宿主（Claude Code）通过协议发现了你的工具」——这就是 MCP 的全部魔法，没有更多了。

（Claude Desktop 同理：把 server 配置写进 `claude_desktop_config.json` 后完全重启应用。）

## 9.4 写 MCP Client：把生态工具接进你的 Agent

反方向同样重要：**你的 runAgent 可以把任何 MCP Server 的工具挂进来**——这就把「自研工具」升级为「全生态工具」：

```bash
pnpm add @modelcontextprotocol/client zod
```

```ts
// mcp/client.ts —— 通用 MCP 工具桥接器：把任意 stdio MCP Server 的工具转成第 7 章的 ToolDef
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { z } from "zod";
import { defineTool, type ToolDef } from "../lib/ai";

export interface McpToolset {
  tools: ToolDef<any>[];
  close: () => Promise<void>;   // 用完记得关：stdio Server 是一个子进程
}

export async function loadMcpTools(command: string, args: string[]): Promise<McpToolset> {
  const client = new Client(
    { name: "my-agent", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } },   // 默认是 'legacy'（只走 2025 的 initialize 握手）
  );
  await client.connect(new StdioClientTransport({ command, args }));

  const { tools } = await client.listTools();   // 协议层「发现」：server 自己声明了哪些工具
  return {
    tools: tools.map((t) =>
      defineTool({
        name: t.name,
        description: t.description ?? "",
        // 关键：把 server 声明的 JSON Schema 转回 Zod，toOpenAITools 才能把参数名、类型、必填项原样告诉模型；
        // 顺带在本地先校验一遍参数。（z.fromJSONSchema 在 Zod 4 中标注为 semi-experimental）
        parameters: z.fromJSONSchema(t.inputSchema as Parameters<typeof z.fromJSONSchema>[0]),
        execute: async (input) => {
          const result = await client.callTool({ name: t.name, arguments: input as Record<string, unknown> });
          const text = result.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
          return result.isError ? { error: true, message: text } : text;   // 工具失败不抛异常，看 isError
        },
      }),
    ),
    close: () => client.close(),
  };
}
```

用法放在单独的脚本里——库文件里不要写顶层调用，否则任何 import 它的地方都会顺带启动一个浏览器：

```ts
// mcp/demo.ts —— 把 Playwright MCP 的浏览器工具挂进第 8 章的 runAgent（需要 .env）
import { runAgent } from "../agent/loop";
import { defaultTools } from "../tools";
import { loadMcpTools } from "./client";

const browser = await loadMcpTools("npx", ["-y", "@playwright/mcp@latest", "--headless"]);
try {
  const result = await runAgent({
    goal: "打开 https://playwright.dev ，读出首页主标题，用一句话总结这个网站是做什么的。",
    tools: [...defaultTools, ...browser.tools],
    maxSteps: 10,
  });
  console.log(result.status, "answer" in result ? result.answer : "（未提交答案，查 trajectory）");
} finally {
  await browser.close();   // 关掉子进程，否则脚本不会退出
}
```

（两个文件不在 `code/` 里，已通过类型检查；`loadMcpTools` 已实测连上 9.2 的 stdio Server 并调用成功。`demo.ts` 会真实调用模型，需要 `.env`。）

三个细节：

1. **参数 schema 不能丢**。本课程早期版本的桥接器把每个 MCP 工具的参数写死成「空对象、任意字段」，经 `toOpenAITools` 发给模型的 schema 里一个参数名都没有——模型看不到 `browser_navigate` 要一个 `url`，只能瞎猜。现在用 `z.fromJSONSchema()` 把 server 声明的 JSON Schema 转回 Zod，再由 `toOpenAITools` 转出去，参数名、类型、必填项都原样到达模型（实测：9.2 的 `queryOrder` 转出来是 `"properties":{"orderId":{"type":"string",…}},"required":["orderId"]`）。`z.fromJSONSchema` 在 Zod 4 里标注为 semi-experimental：遇到它转不了的复杂 schema，退路是把参数写成 `z.looseObject({})` 并在 description 里写清参数（模型看不到结构，效果会差）。
2. **`versionNegotiation: { mode: "auto" }`**：默认的 `'legacy'` 只会用 2025 的 `initialize` 握手；`auto` 先探测 `server/discover`，失败再回退，新旧 Server 都能连。
3. **`callTool` 失败不抛异常**，而是在结果上设 `isError`。桥接器把它转成第 7 章约定的 `{ error: true, message }`，模型才知道这次调用失败了。

注意 `listTools()` 这一步——**发现是双向的、声明式的**：Server 自描述工具清单，Client 无需硬编码。这是协议相对「进程内工具」的本质增量。

## 9.5 实战：给 Agent 装上浏览器（Playwright MCP）

微软官方维护的 `@playwright/mcp`（0.0.85，2026-11 复核）把整个浏览器变成 MCP 工具集——不用写一行浏览器代码：

```bash
# Claude Code 一条命令接入：
claude mcp add playwright -- npx @playwright/mcp@latest   # 注意 -- 分隔符；默认有头模式，--headless 无头
```

它的工具包括 `browser_navigate / browser_click / browser_type / browser_fill_form / browser_snapshot / browser_take_screenshot` 等，基于**无障碍树快照**与页面交互（不是截图+视觉模型，又快又稳）。两条使用路线：

- **路线 A（零代码）**：直接在 Claude Code 里用——「帮我打开某网站，填表，截图」
- **路线 B（进你的 Agent）**：用 9.4 的 `loadMcpTools` 桥接，你的调研 Agent 从此能真的上网

浏览器是 Agent 的「眼睛和手」，也是**间接注入攻击面**（第 18 章：网页内容里藏指令）——给它配工具时记得权限矩阵。

## 9.6 远程部署：Streamable HTTP（生产形态）

stdio 只能本地。生产/团队场景用 **Streamable HTTP**：Server 是常驻 HTTP 服务，支持鉴权、可被多个客户端共享。v2 提供了框架适配包（`@modelcontextprotocol/node`/`express`/`fastify`/`hono` 四个）：

```bash
pnpm add @modelcontextprotocol/server @modelcontextprotocol/hono hono @hono/node-server
```

```ts
// order-server/http.ts —— 远程 MCP Server（Hono + Streamable HTTP），官方挂载写法
// 依赖：pnpm add @modelcontextprotocol/server @modelcontextprotocol/hono hono @hono/node-server
import { serve } from "@hono/node-server";
import { createMcpHonoApp } from "@modelcontextprotocol/hono";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import type { Context } from "hono";
import { z } from "zod";
import { ORDERS } from "./orders";

// createMcpHandler 接收「工厂函数」：每请求新建 server 实例，transport 构建已被封装
const handler = createMcpHandler(() => {
  const server = new McpServer({ name: "order-server", version: "1.0.0" });
  server.registerTool(
    "queryOrder",
    { description: "按订单号查询订单状态与预计送达时间", inputSchema: z.object({ orderId: z.string() }) },
    async ({ orderId }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(ORDERS[orderId.toUpperCase()] ?? { notFound: true, orderId }) }],
    }),
  );
  return server;
});

// createMcpHonoApp 预装 JSON body 解析与 Host/Origin 校验（防 DNS rebinding）
const app = createMcpHonoApp();
app.all("/mcp", (c: Context) => handler.fetch(c.req.raw, { parsedBody: c.get("parsedBody") }));

// Node 上要交给 @hono/node-server 才会监听端口（只写 export default app 不会启动）
serve({ fetch: app.fetch, port: 8787 });
console.error("order-server (HTTP) on http://localhost:8787/mcp");
```

（不在 `code/` 里；已通过类型检查，并实测可用 v2 `Client` + `StreamableHTTPClientTransport` 连上调用。）

远程化带来的三个生产话题（都能进面试）：**鉴权**（官方姿势是在 `handler.fetch` 第二参数透传 `authInfo`：`handler.fetch(c.req.raw, { authInfo: await verifyToken(c.req.raw), parsedBody })`，而非只靠前置中间件）、**多租户**（工具执行时用谁的凭证——回到第 18 章「以用户上下文执行」）、**审计**（谁在什么时候调了什么——第 16 章观测）。另一个安全细节：绑定 `0.0.0.0` 时需显式传 `allowedHosts`（`createMcpHonoApp({ host: "0.0.0.0", allowedHosts: [...] })`），否则默认只校验 localhost。还有一个运维上的便利：2026-07-28 规范要求每个 POST 都带 `Mcp-Method`、`Mcp-Name` 头，网关或反向代理想按方法、按工具名做日志和限流时，不用解析请求体就能拿到。

## 9.7 生态与判断：MCP 的现状坐标

- **官方 Registry**（registry.modelcontextprotocol.io）：程序化的 Server 注册中心，可搜索/按版本过滤——「工具的 npm」正在成形
- 各宿主内置目录（Claude Code `/mcp`、Cursor/VS Code 的扩展市场）+ 社区目录（PulseMCP 等）构成发现体系
- **A2A**（第 11 章）是姊妹协议：MCP 连「Agent↔工具」，A2A 连「Agent↔Agent」

**什么时候用 MCP vs 进程内工具**（决策树）：

```
工具只被自己的一个 Agent 用？ → 第 7 章 ToolDef 就够（简单、无协议开销）
想让工具被 Claude Code/Cursor/多项目复用？ → MCP stdio
要跨机器/团队共享、需要鉴权审计？ → MCP Streamable HTTP
```

**诚实的另一面**：MCP 不是银弹——每个工具调用多一层协议序列化、进程/网络开销；进程内工具仍是最高性能形态。MCP 的价值在**标准化与复用**，不在性能。面试聊到这层取舍，说明你真用过。

---

## ⚠️ 常见坑

1. **stdio Server 里 `console.log`** → 协议污染，宿主直接报解析错误。日志走 `console.error`。
2. **旧包名混用**：网上资料大多是 `@modelcontextprotocol/sdk`（v1 单体包）。v2 拆成 `server`/`client` 两个包，API 也有变化（如 `server.registerTool`）。遇到报错先查包名与版本。
3. **照抄旧写法 `server.connect(new StdioServerTransport())`、`new Client({...})` 不传协商选项**——能编译、能连上 Claude Code，但两头都停留在 2025 的协议。服务端用 `serveStdio(工厂)`，客户端传 `versionNegotiation: { mode: "auto" }`。
4. **桥接 MCP 工具时把参数 schema 写成空对象**——模型看不到参数名，只能瞎猜。保留 server 声明的 JSON Schema（9.4 的 `z.fromJSONSchema`）。
5. **Windows 路径**：`.mcp.json`/配置里的路径用正斜杠或双反斜杠；命令用 `node`/`npx` 全名（宿主不一定继承你的 shell 环境）。
6. **改了 Server 不重启**：宿主在会话开始时连接，修改 Server 代码后要重启宿主（或 `/mcp` 里重连）才生效。
7. **给 Agent 挂了一堆 MCP 工具却不筛选**：工具过多稀释选择准确率（第 7 章原则 6 在协议层同样成立）。按任务装载需要的 server。
8. **远程 Server 裸奔上线**：没有鉴权的 HTTP MCP Server = 把你的工具开放给全网。上线前检查项是鉴权：校验 token 后通过 `handler.fetch` 的 `authInfo` 把调用者身份传进工具（9.6），工具按这个身份做权限判断。

## ✍️ 动手练习

**基础**：
1. 跑通 9.2-9.3：订单 Server 接入 Claude Code，完成一次真实调用（截图进学习笔记——这是面试里「我开发过 MCP Server」的证据链）。
2. 用 9.4 的桥接器把 Playwright MCP 挂进你的 runAgent，完成「打开网页并总结」任务。先打印一次 `toOpenAITools(browser.tools)`，确认 `browser_navigate` 的 `url` 参数真的出现在 schema 里；再故意把 `parameters` 换成 `z.looseObject({})` 跑一次，对比模型的调用成功率。

**进阶**：
3. 把第 7 章的全部工具（时间/计算器/订单）迁移成一个 `biz-tools` MCP Server，再写 `.mcp.json` 让团队（或你的另一台电脑）复用——体会「写一次处处用」。
4. 用 Streamable HTTP 把订单 Server 部署到本地网络（9.6 的 Hono 版 + Bearer 鉴权：token 不对直接返回 401，对的话通过 `handler.fetch(c.req.raw, { authInfo, parsedBody })` 把身份传给工具），Claude Code 用 `--transport http` 连接；再故意输错 token 验证 401。
5. （调研题）逛一遍 registry.modelcontextprotocol.io，挑一个 Star 高的 Server 阅读 README：它暴露了哪些工具？工具描述怎么写的？有什么值得抄的？

## 🧠 自测清单

1. MCP 解决什么问题？「写一次、处处用」的前提是什么？
2. 三大原语是什么？两种传输各自的适用场景？
3. v1/v2 包名的区别？stdio Server 为什么禁止 console.log？为什么要用 `serveStdio(工厂)` 而不是 `server.connect(...)`？
4. 2026-07-28 规范的主要变化（至少说出四条）？客户端怎样才会用上新协议？
5. Client 端「发现工具」的关键调用是什么？桥接时为什么必须保留工具的参数 schema？
6. Playwright MCP 的交互基于什么（不是截图视觉）？两条使用路线？
7. 什么时候用进程内工具、什么时候上 MCP？MCP 的代价是什么？
8. 远程 MCP Server 的三个生产话题？

## 🔗 延伸阅读

- MCP 官方文档与 TS Server 教程（官方 Quickstart，`serveStdio` 写法出处）：https://modelcontextprotocol.io/docs/2026-07-28/develop/build-server
- MCP 官方 Client 教程（`versionNegotiation` 写法出处）：https://modelcontextprotocol.io/docs/2026-07-28/develop/build-client
- 2026-07-28 规范变更清单：https://modelcontextprotocol.io/specification/2026-07-28/changelog
- TS SDK 专属文档站：https://ts.sdk.modelcontextprotocol.io/
- MCP 官方 Registry：https://registry.modelcontextprotocol.io/
- Claude Code 的 MCP 接入文档：https://code.claude.com/docs/en/mcp
- Playwright MCP：https://github.com/microsoft/playwright-mcp

---

➡️ 下一章：[第 10 章 · Agent 框架实战](第10章-Agent框架实战.md)——用手写的眼光看穿所有框架。
