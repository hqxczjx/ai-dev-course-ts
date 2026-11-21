# 教学笔记（给老师/AI 助手看的工作记录）

## 学习者偏好

- 中文授课。
- 只想学**一个目录**下的课程：本目录是唯一主线。`../typescript-agent-course/` 的优点（离线 FakeModel 测试、事件日志与恢复、权限与审批、单项目渐进加固）已并入本课程，原目录保留不动，仅作来源。
- 不学 Python、算法、模型训练与微调（2026-11-13 明确表态）。

## 课程维护约定

- 所有版本、价格、API 结论都要能追溯到 `research/` 或 `research_notes/` 里的一手来源和核实日期。
- 每次时效复核都在 `CHANGELOG.md` 留痕。
- 正文代码应能编译运行；只是示意的片段必须明确标注「接口示意」。

## 2026-11-13 修订统一约定（全课程必须一致）

1. **运行环境**：Node 24 或 26 LTS 均可（26 自 2026-10-28 起为 Active LTS；24 自 2026-10-20 起为维护期 LTS，支持到 2028-04-30）。课程代码在 Node 24.22 上验证。`@types/node` 的大版本与运行时一致。
2. **包管理与 TS**：pnpm 12（`npx get-pnpm` 安装）；TypeScript 7.0；用 `tsx` 运行 TS。`package.json` 为 `"type": "module"`。tsconfig 与 `code/tsconfig.json` 一致：`"module": "ESNext"`、`"moduleResolution": "bundler"`、`"target": "ES2024"`、`strict`、`noUncheckedIndexedAccess`、`verbatimModuleSyntax`、`"types": ["node"]`、`skipLibCheck`、`noEmit`。在此配置下相对导入可以不写扩展名。
3. **pnpm 12 构建脚本审批**：`strictDepBuilds` 默认开启，tsx 依赖的 esbuild 等构建脚本未审批时安装会失败。第一次 `pnpm add -D typescript tsx @types/node` 之后执行 `pnpm approve-builds`（写入 `pnpm-workspace.yaml` 的 `allowBuilds`）。Dockerfile 需要一并 COPY `pnpm-workspace.yaml`。
4. **统一模块地图（与 `code/` 一一对应）**：
   - `lib/ai.ts`：`getClient()`（懒加载、`maxRetries: 0`）、`MODEL`、`chat()`、`ChatOptions`（`temperature` 只在传入时发送，`json` 打开 JSON mode，`signal` 取消）、`ChatResult`（含 `finishReason`）、`isRetryable()`、`ToolDef`、`defineTool`、`toOpenAITools`
   - `lib/extract.ts`：`extractJson`、`structured()`（支持注入 `chatFn`）
   - `lib/model.ts`：`ChatModel` 端口、`openAIModel()`、`FakeModel`、`say()`、`callTools()`
   - `tools/index.ts`（getCurrentTime / calculate / queryOrder）、`tools/search.ts`（web_search / fetch_and_extract）
   - `agent/tool-loop.ts`（`runToolLoop`、`executeToolCall`）、`agent/loop.ts`（`runAgent`、`withTimeout`、`finishTool`、`AgentResult`；`model` 参数是 `ChatModel` 不是字符串；`authorize` 钩子）
   - `multi/orchestrator.ts`（`runPipeline`、`Plan`、`WORKERS`、`modelFor` 注入）
   - `reliability/ledger.ts`（意图日志、`idempotencyKey`、`runIdempotent`、`reconcile`）
   - `security/permissions.ts`（`authorize(toolName, validArgs, ctx)`、`isInsideDir`、默认拒绝）
   - `lib/embed.ts`、`lib/vectorstore.ts`、`rag/*`（第 12–13 章）
5. **正文代码的标注**：完整可运行的代码块第一行写文件路径注释；其中在 `code/` 有同一份文件的，块后注明「完整代码：`code/src/...`」（不在 `code/` 的完整块也必须能通过类型检查）；节选写「（节选）」；只示意接口的写「// ⚠️ 接口示意」。
6. **默认模型**：`BASE_URL=https://api.deepseek.com`、`MODEL=deepseek-flash`、`MODEL_CHEAP=deepseek-flash`（多 Agent 执行层）、`MODEL_GOOD=deepseek-v4-pro`。
7. **openai 7.x 类型**：工具调用先用 `call.type === "function"` 收窄；不写 `err as OpenAI.APIError`，用 `isRetryable(err)` 读 `status`。并行工具调用：assistant 消息里的每个 `tool_call.id` 都必须有一条 `role: "tool"` 回执。
8. **换厂商的边界**：OpenAI GPT-6 系列的工具调用只走 Responses API，并且会拒绝 `temperature`；Anthropic 新版 API 拒绝 `temperature`/`top_p`/`top_k`，但提供 OpenAI 兼容端点（有限制）。课程主线用 Chat Completions 兼容端点（DeepSeek 等）。
9. **Zod**：统一 `import { z } from "zod"`；用 Zod 4 写法（`z.url()`、`z.strictObject()`、`z.iso.datetime()`、`z.toJSONSchema()`）。
10. **时效标注**：已核实的事实写「（2026-11 复核）」，不写 R 编号。
11. **范围**：不加 Python、算法、训练/微调相关内容；已有的简短提及可以保留。
