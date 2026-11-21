# 时效复核记录（CHANGELOG）

> 本课程与 AI 生态同迭代。每次「版本/价格/API/链接」复核都在此留痕；核实底稿在 `research/`。

## 2026-11-13 ～ 11-17（第三轮复核 + 全课程代码审计 + 配套代码）

### 核对了什么

- 5 个方向联网核查（模型与价格、AI SDK 与工具链、Agent 框架与协议、RAG 工具链、评测/观测/安全/部署），报告见 `reports/TS课程技术时效核查 2026年11月.md`，逐条底稿见 `research_notes/`
- 全课程代码审计：把各章代码块抽出来，按当前 npm 包用 TypeScript 7 严格模式编译，并用本地假服务复现逻辑 bug，见 `research/R10-全课程错误审计-2026-11-13.md`
- 修订完成后的复查见 `research/R12-修订后复查-2026-11-17.md`

### 新增

- **`code/` 配套代码**：第 02、04、07、08、11、12–13、17、18 章核心模块的完整实现，带 77 条离线测试（FakeModel，不需要 API key）。`pnpm install && pnpm check` 一条命令验证；构建脚本审批预置在 `code/pnpm-workspace.yaml`
- **两层验证方法**（吸收自 typescript-agent-course）：离线测试证明程序逻辑，真实模型评测集证明效果。第 08 章新增 8.4.1 离线测试，第 15 章新增 15.8「两层评测」与 20 条真实模型用例（含无证据、冲突、文档注入、越权、重复请求、工具失败），报告必须公开失败用例
- **重试之前先查状态**：第 17 章新增意图日志 + 幂等键 + 崩溃后核对（`code/src/reliability/ledger.ts`）
- **检索前权限过滤与引用校验**：第 13 章（`code/src/rag/hybrid.ts`、`answer.ts`）
- 第 18 章新增 OWASP Agentic Applications Top 10（2026）映射；第 22 章新增「交付证据」清单（陌生人能跑的 README、架构图、威胁模型、公开失败项的评测报告、运行手册、演示）
- 教学工作区文件：`MISSION.md`、`NOTES.md`（含全课程统一约定）、`RESOURCES.md`

### 修了什么（P0）

- 第 08 章：Agent 循环只处理第一个 tool_call，模型并行调用时下一轮 API 返回 400 → 每个 `tool_call.id` 都回执
- 第 07/08 章：openai 7.x 工具调用改为 function | custom 联合类型，原写法编译不过 → 先收窄 `call.type`
- 第 05 章：项目 1 的 `page.tsx` 缺 import、`conversationId` 未定义 → 重写，并补上「停止」真正中断服务端生成、被截断的回答不标记为完成
- 第 09 章：「MCP v2 代码无需改动」与官方说法相反 → 改用 `serveStdio`，客户端开启 `versionNegotiation: { mode: "auto" }`，修复 MCP→工具桥发送空参数 schema 的 bug
- 第 12/13 章：LanceDB `Table<T>` 不是泛型；MiniSearch 默认分词对中文无效；rerank「三家同构」说法错误；promptfoo RAG 断言写法错误；模块路径错误
- 第 15 章：OpenAI Evals 已弃用（10-31 只读、11-30 关停），`context-precision` 断言不存在
- 第 18 章：`startsWith("./data/")` 挡不住 `./data/../.env` 路径穿越；`screenOutput` 只脱敏第一处匹配
- 第 20 章：`ToolCard` 读取 `part.toolName` 编译不过
- 第 22 章：骨架在 pnpm 12 下无法按说明运行；MemorySaver 无法满足「kill 进程后恢复」的验收 → 改用 SQLite checkpointer，拆分 start/resume 命令，并实际跑通

### 更新了什么（时效）

- 模型：Claude Fable 5.2（$8/$40）、GPT-6.1 Terra（$1/$5）、Gemini 4 Carbon（分阶段开放，文档迁到 aistudio.google.com/docs）、Kimi K2 系列年底下线（示例改为 K3.1 Pro）；OpenAI whisper-1 与 TTS 模型弃用
- 换厂商的边界：GPT-6 系列工具调用只走 Responses API 且拒绝 `temperature`；Anthropic 新版 API 拒绝 `temperature`/`top_p`/`top_k`，另有 OpenAI 兼容端点（有限制）
- 运行环境：Node 26 成为 Active LTS，24 为维护期 LTS（两者均可）
- 版本：MCP SDK 2.4.0、LangGraph 1.7、Langfuse 6.1.1 + OTel 0.223.2（2.x 维护线仍在发版）、LanceDB 0.41、promptfoo 0.125 等，见附录 B9
- 更正旧说法：Claude Code 的 npm 安装方式并未弃用；A2A「Growth Stage」找不到一手出处，已删除；「OTel 0.223.0 是 2.x 最后一版」不成立

### 11-17 复查后补修（见 `research/R12`）

- P0：第 14 章改用 `openAIEmbedder()`；第 19 章 PG 版 `lib/store.ts` 与第 05 章重写后的接口对齐（第 05 章的路由调用改为 `await`，换库时一行不用改）；第 20 章改为从 `@/lib/ai-sdk` 导入
- P1：第 05 章 `maxDuration` 改为 300；第 21 章更正「DeepSeek 没有语音接口」（11-13 起有独立 ASR/TTS/OCR，但不是 OpenAI 兼容格式）；第 20 章路由加 `redactToolErrors: true`（`ai` 7.0.171 起工具报错原文默认会发到前端）
- P2：OTel 2.x 锁定升到 0.223.2；附录 B9 同步 mastra 1.39 / core 1.83、@openai/agents 0.22、e2b 2.64、playwright 1.65；README 的里程碑、固定板块与时间规划；deepseek-chat 停用措辞；`code/` 统一为 pnpm，并预置构建脚本审批
- 验证：章节完整代码块在 5 个编译工程中 0 错误；`code/` 中 `pnpm install && pnpm check` 77/77 通过

### 已知待核实

- OWASP Agentic Top 10 的条目名称目前来自二手来源，需对照官方 PDF
- Next.js 16.4.6 对 route handler 的自动压缩是否会缓冲 SSE
- Cohere Rerank 5 的官方计费方式

### 下次复核

建议 2026-12-01 至 12-15：11-30 OpenAI Evals 关停、12-01 Gemini 4 涨价、12-11 o3 与 gpt-5 系关停、12 月底 Kimi K2 下线。

## 2026-10-22（第二轮全面复核，初版 2026-10-11）

### 核对了什么

- npm registry 直查 57 个包版本（`research/R7`）+ 官方定价页与文档抽查（`research/R8`）+ 全课程完成度审计（`research/R9`）
- 全量 Markdown 相对链接校验：0 失效

### 改了什么（相对 2026-10-11 版的真实漂移）

**版本升级**（npm latest 实测）：

| 包 | 旧 → 新 |
|---|---|
| ai（Vercel AI SDK） | 7.0.137 → 7.0.148 |
| @openai/agents | 0.20 → 0.21 |
| agents（Cloudflare） | 0.28 → 0.29 |
| @langfuse/* | 5.13.1 → **6.0.1（大版本）** |
| @langchain/langgraph | 1.4.21 → 1.5.2 |
| mastra / @mastra/core | 1.33/1.75 → 1.35/1.79 |
| @qdrant/js-client-rest | 1.19 → 1.20 |
| inngest | 4.23 → 4.25 |
| e2b | 2.55 → 2.58 |

**内容修正**（按章节）：

- 第 3 章：**概念层面更新**——岗位依据从「Prompt Engineering 提及率第一」改为「2026 岗位表述已转向 Context Engineering / Agent 工程」；新增 3.1.1「2026 年的现实：Prompt 的写作正在被 AI 替代，但验收没有」——三层划分（措辞层 AI 代劳 / 结构层人定框架 / 工程层只能人来）+ 「AI 写 prompt、人定验收」工作流，正面回应「传统 prompt 工程已被 AI 替代」的现实
- 第 1 章：旗舰模型成本倍数改「18-90 倍」
- 第 8 章：修复 Agent 循环三处 P0——tool 消息前必须 push 带 tool_calls 的 assistant 消息（两处）；`result.answer` 联合类型窄化；统一 Plan-and-Solve 论文名与 Plan-and-Execute 工程名
- 第 9 章：补 MCP 2026-07-28 规范「无状态 + 每请求版本协商 + server/discover」提示
- 第 11 章：补 searchTool/fetchAndExtract 的 mock 实现（可运行）；HITL 片段标注「接口示意」；A2A 更新到 v1.0 + AAIF Growth Stage
- 第 20 章：补 AG-UI 1.0 协议小节；补 ToolCard 辅助件最小实现；标注自备业务组件
- 第 22 章：**新增 22.1.2 可执行契约**——仓库结构、PG 五表、SSE 事件契约、四 Agent 接口、10 任务评测集、验收命令；补「常见坑」

- 第 1/2/10/15/17 章 + 附录 B：模型换代——OpenAI GPT-6 家族（Astra/Sol/Luna）替换 GPT-5.x 示例；Claude 5 家族价格与缓存倍数修正（0.025x-0.1x）；Gemini 4 Argon 与 3.x 上下文更正；DeepSeek 分时价保持
- 第 2 章：Node 主线改 24 LTS（22 已维护期）；pnpm 安装改 `npx get-pnpm`；Claude Code 安装改原生脚本/winget（npm 包已弃用）；`max_tokens` 弃用注记并补 GPT-5 系关停日期；删除无法证实的「deepseek-chat 2026-07 弃用日期」；修复未闭合代码围栏（P0）
- 第 4 章：Zod 4 弃用 API 替换（`z.iso.datetime()`、`z.strictObject()`、双参 `z.record`）；修复 JSON 修复循环里 `JSON.parse` 未捕获的崩溃路径；`zod-to-json-schema` 归档注记
- 第 5 章：`onFinish`→`onEnd` 统一；修复 useChat 全量 UI 消息与服务端历史拼装的重复 bug（改 `messages.slice(-1)`）；`onEnd` 持久化只存本轮 user+assistant
- 第 10 章：`@openai/agents` 0.21、CF agents 0.29
- 第 12/13 章：硅基免费额度与 Cohere 计费口径改「以官网/模型广场标注为准」；补 RRF k 值口径差异（Qdrant 默认 2 vs 经典 60）
- 第 16 章：Langfuse 5.13.1 → 6.0.1。写法不变（`LangfuseSpanProcessor`/`observeOpenAI`/`LangfuseVercelAiSdkIntegration`/`startActiveObservation` 均保留），但安装命令补 `@langfuse/openai`/`@langfuse/tracing` 两个直接依赖，并锁 OTel 2.x（`sdk-node@0.223.0` 等，OTel 3.0 与 Langfuse peer 冲突）；补 pnpm 12 `approve-builds protobufjs`；注明 v6 要求 Node ≥22、自部署 Langfuse ≥4.59
- 第 2 章：补 TypeScript 7 `tsc --init` 模板差异（`types: []` 与三个额外严格 flag 的处理）；补 pnpm 12 构建脚本审批说明
- 第 9 章：MCP v2 的 zod 说明改为「必须 v4（^4.2.0），v3 不支持」
- 第 12 章：LanceDB 安装补 `approve-builds onnxruntime-node sharp`
- 附录 B：Langfuse v5→v6、Zod 4.6.5→4.6.7
- 第 17 章：Inngest v4 语法（`triggers` 收进 options、`step.sleep(id, duration)`）；DeepSeek 错峰输出价 ¥4（原 ¥2 为高峰输入价之误）；Inngest 许可与计费口径注记
- 第 21 章：GLM-4.6V-Flash 等视觉模型现状核对
- 第 22 章：**新增 22.1.1 起步骨架**——可直接运行的 LangGraph 四节点图（interrupt 审批 + Command 恢复 + 重写熔断），即第 1 周交付物
- 附录 B：B9 版本快照全表更新至 2026-10-22；各条目日期与口径同步
- `research/R2`：DeepSeek 分时计价表（错峰/高峰两档）与月成本重算

### 怎么用这份记录

学某章前扫一眼上表对应行：若官方又发新版，以 `npm view <pkg> version` 与官方文档为准，并欢迎回来更新（这正是第 6 章练的能力）。
