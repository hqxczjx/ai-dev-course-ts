# 核对报告 V1 · 底层 SDK 与 Zod（第 02/03/04 章）

> 核对日期：2026-10-11
> 核对对象：`01-地基篇/第02章-环境搭建与第一个AI程序.md`、`02-核心技能篇/第03章-Prompt工程.md`、`02-核心技能篇/第04章-结构化输出与Zod.md`
> 方法：逐条对照官方一手来源（厂商官方文档、SDK 官方仓库源码/README、unpkg 实测包产物、本机 winget 实测）。判定分级：✅正确 / ❌错误（附正确写法）/ ⚠️部分正确（附限定条件）。
>
> **网络限制声明**（影响判定可信度，阅读时注意）：
> 1. Google 域（ai.google.dev、generativelanguage.googleapis.com）与 platform.openai.com 在本核对环境双向不可达（WebFetch 超时 ×3、本机 curl 连接失败）。凡涉及这两个域的条目，均改用 openai-node 官方源码（GitHub raw，可达）佐证，或标注「未能一手核实」。
> 2. npmjs.com 页面返回 403，zod 版本与导出改用 unpkg 实测包产物核实（更权威，即 npm 实际分发内容）。
> 3. WebSearch / webReader 工具配额耗尽，全部改用官方站点直接抓取。

---

## 一、第 02 章 · 环境搭建与第一个 AI 程序

### 1.1 安装与环境（2.2 节）

**2-01** 原文：「`winget install OpenJS.NodeJS.LTS` # Node.js 22 LTS」「`node -v # 应输出 v22.x.x`」「`npm -v # 10.x`」
→ ⚠️ **部分正确**：包 ID 正确（本机 `winget show OpenJS.NodeJS.LTS` 实测：已找到「Node.js (LTS) [OpenJS.NodeJS.LTS]」，当前版本 **24.20.0**，2026-08-26 发布）。但版本注释过时：2026-10 时 Active LTS 是 Node 24（2025-10-28 进入，2026-10-20 转 Maintenance），Node 22 自 2025-10-21 起已处于 **Maintenance LTS**（至 2027-04-30）。用该 winget 命令装出来的是 v24.x（内置 npm 11.x），`node -v` 不会输出 v22.x.x。建议注释改为「Node.js 24 LTS（若需锁定 22，用 nvm-windows）」或直接接受 24。
→ 来源：本机 winget 实测；https://raw.githubusercontent.com/nodejs/release/master/schedule.json

**2-02** 原文：「`npm install -g pnpm`」「`pnpm -v` # 任意 9/10.x」
→ ⚠️ **部分正确**：命令本身仍可执行（pnpm 仍发布在 npm 上），但 pnpm 官方安装文档的 npm 方式现已改为 `npx get-pnpm`，不再列出 `npm install -g pnpm`；且当前主线版本已是 **pnpm 12**（原生可执行，npm 安装方式要求 Node 22.13+）。「9/10.x」预期过时。
→ 来源：https://pnpm.io/installation

**2-03** 原文：「如果 PowerShell 报『禁止运行脚本』，执行：`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`」
→ ✅ **正确**：`-ExecutionPolicy` 是位置参数（位置 0），`RemoteSigned` 为合法策略值，`-Scope CurrentUser` 合法（且免管理员权限，是给当前用户解锁脚本的正确姿势）。
→ 来源：https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/set-executionpolicy

**2-04** 原文：「`pnpm exec tsc --init --strict`」
→ ✅ **正确**（附注）：`tsc --init` 官方定义为 "Initializes a TypeScript project and creates a tsconfig.json file"，命令行传入的编译器选项（如 `--strict`）会被写入生成的 tsconfig.json（`"strict": true`）。此组合行为自 TypeScript 2.x 起长期稳定，但官方 release notes / handbook 未单列文档化（handbook 只示例裸 `tsc --init`），属「实现保证」而非「文档承诺」，教程使用无风险。
→ 来源：https://www.typescriptlang.org/docs/handbook/compiler-options.html ；编译器内嵌帮助文本（cdn.jsdelivr.net/npm/typescript/lib/typescript.js 实测含 "Initializes a TypeScript project and creates a tsconfig.json file"）

**2-05** 原文：「运行 TS 脚本用 `tsx`（免编译直跑）」「`pnpm exec tsx 01-basic.ts`」
→ ✅ **正确**：tsx 官方文档示例 `npx tsx ./script.ts`、`pnpm tsx ./file.ts`（`pnpm exec tsx` 等价）；前提仅需装好 Node.js。
→ 来源：https://tsx.hirok.io/getting-started

**2-06** 原文：「AI 编程工具：Claude Code（终端：`npm install -g @anthropic-ai/claude-code`）」
→ ⚠️ **部分正确**：该命令仍列于官方 README，但已标注 **"Installation via npm is deprecated"**；官方现推荐原生安装器，Windows 为 `irm https://claude.ai/install.ps1 | iex` 或 `winget install Anthropic.ClaudeCode`。建议教程改为原生安装命令（或注明 npm 方式已弃用）。
→ 来源：https://github.com/anthropics/claude-code （README）

### 1.2 openai SDK 调用写法（2.5–2.7 节）

**2-07** 原文：`client.chat.completions.create({ model, messages, temperature, max_tokens })`
→ ⚠️ **部分正确**：所有参数名在 openai SDK 中均真实存在且拼写正确。但 `max_tokens` 在 SDK 类型定义中已标 **`@deprecated`**："This value is now deprecated in favor of `max_completion_tokens`, and is not compatible with o-series models"。限定条件：对教程实际使用的 DeepSeek / 智谱 / Kimi / OpenRouter（OpenAI 兼容端），`max_tokens` 仍是标准参数、行为不变；仅当直连 OpenAI 官方端点调用新模型（o 系列 / GPT-5 系）时必须换 `max_completion_tokens`。建议在 2.5 加一行脚注说明，以免读者切到 OpenAI 原生端时踩坑。
→ 来源：https://github.com/openai/openai-node/blob/master/src/resources/chat/completions/completions.ts （L2415–2433，实测下载核对）

**2-08** 原文：`temperature: 0.2`、实验 A `temperature: 1.6`
→ ✅ **正确**：官方定义为 "between 0 and 2"，1.6 合法。
→ 来源：同上 completions.ts（temperature 注释）

**2-09** 原文：`res.choices[0].message.content`、`res.usage.prompt_tokens / completion_tokens`（`res.usage!`）
→ ✅ **正确**：与 SDK 官方 README 示例（`completion.choices[0].message.content`）及类型定义一致；`CompletionUsage` 含 `prompt_tokens`/`completion_tokens`，非流式响应恒返回 usage，`!` 断言可用。
→ 来源：https://github.com/openai/openai-node （README）

**2-10** 原文：`stream: true, stream_options: { include_usage: true }`；`chunk.choices[0]?.delta?.content ?? ""`
→ ✅ **正确**：`ChatCompletionStreamOptions.include_usage` 存在。官方注释确认行为：开启后**每个** chunk 都带 `usage: null`，**最后一个** chunk 带全请求 token 统计，且该 chunk 的 `choices` **恒为空数组**——教程用可选链 `chunk.choices[0]?.delta?.content` 正好正确防御了这一点（不加 `?.` 会在末 chunk 崩溃）。另注意官方提示：流被中断时可能收不到 usage chunk。
→ 来源：同上 completions.ts（L1105–1125、L2150–2165）

**2-11** 原文：「`stream_options: { include_usage: true }` // 流式也要拿用量（**多数兼容端支持**）」
→ ⚠️ **部分正确**：OpenAI 官方端点确凿支持。但 DeepSeek / 智谱 / Kimi 的官方文档页面本次均未见对 `stream_options` 的明确承诺（智谱 OpenAI 兼容文档罗列的特性清单未包含它），「多数兼容端支持」是经验性说法而非文档保证。建议措辞保留，但可加「以各家文档为准」。
→ 来源：https://github.com/openai/openai-node （OpenAI 侧）；https://docs.bigmodel.cn/cn/guide/develop/openai/introduction.md （智谱侧未列）

**2-12** 原文：`catch (err) { const apiErr = err as OpenAI.APIError; apiErr?.status === 429 || (apiErr?.status ?? 0) >= 500`
→ ✅ **正确**：`OpenAI.APIError` 存在且 `.status` 属性真实存在。官方 README error handling 示例：`err.status`（如 400）、`err.requestID`、`err.headers`、`err instanceof OpenAI.BadRequestError`。按 429/5xx 分类重试的前提成立。
→ 来源：https://github.com/openai/openai-node （README "Error Handling" 节）

**2-13** 原文：「`finish_reason` 取值 stop / length / tool_calls」（第 4 章 4.5 引用，源头在第 2 章封装）
→ ✅ **正确**：SDK 定义为 `'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call'`（流式可为 null）。教程称「三种典型值」措辞准确，未提的 content_filter 不影响结论。
→ 来源：同上 completions.ts（L654、L1147）

### 1.3 三件套、baseURL 与模型名（2.3 节）

**2-14** 原文：DeepSeek `BASE_URL=https://api.deepseek.com`，可用 OpenAI SDK
→ ✅ **正确**：官方文档明确 base_url 为 `https://api.deepseek.com`（另提供 `https://api.deepseek.com/anthropic` 给 Anthropic 格式），并提供 OpenAI SDK 的 Node.js 示例代码。
→ 来源：https://api-docs.deepseek.com/

**2-15** 原文：智谱 `https://open.bigmodel.cn/api/paas/v4/`，模型名 `glm-4.7-flash`，**完全免费（200K 上下文）**
→ ✅ **正确**：官方 OpenAI 兼容文档所有示例均用 `https://open.bigmodel.cn/api/paas/v4/`；官方价格页明确列出 **GLM-4.7-Flash：200K 上下文、输入/输出均免费、缓存命中亦免费**。补充背景：GLM 系已迭代到 5.3（glm-5.3 / glm-5.3-flash，1M 上下文、收费），但 glm-4.7-flash 仍在售且免费，教程说法成立（若想更前沿可提示 glm-5.3-flash 为 1M 上下文收费档）。
→ 来源：https://docs.bigmodel.cn/cn/guide/develop/openai/introduction.md ；https://docs.bigmodel.cn/cn/guide/start/pricing.md

**2-16** 原文：Kimi `https://api.moonshot.cn/v1`（模型名如 `kimi-k2.6`）
→ ✅ **正确**：官方文档（platform.moonshot.cn 已 301 迁移至 **platform.kimi.com**，API 端点未变）：生产服务器 `https://api.moonshot.cn`，端点 `POST /v1/chat/completions`，即 baseURL `https://api.moonshot.cn/v1`；当前模型列表含 `kimi-k3`、`kimi-k2.6`、`kimi-k2.7-code`、`kimi-k2.7-code-highspeed`——`kimi-k2.6` 存在。
→ 来源：https://platform.kimi.com/docs/api/chat

**2-17** 原文：Gemini 兼容层 `https://generativelanguage.googleapis.com/v1beta/openai/`
→ ⚠️ **未能一手核实**：ai.google.dev 与 generativelanguage.googleapis.com 在本核对环境不可达（超时/连接失败）。该 URL 与 Google 官方文档长期公开的格式一致，未发现任何反证；教程可保留，但本次无法给出官方页直接背书。
→ 来源：无（网络不可达；官方页 https://ai.google.dev/gemini-api/docs/openai ）

**2-18** 原文：OpenRouter `https://openrouter.ai/api/v1`（模型名如 `openai/gpt-5.2`）
→ ✅ **正确**：官方文档确认 baseURL `https://openrouter.ai/api/v1`、OpenAI SDK 可作 drop-in；模型 slug 为 vendor/model 格式；`openai/gpt-5.2`（"OpenAI: GPT-5.2"）在 OpenRouter 实际存在。
→ 来源：https://openrouter.ai/docs ；https://openrouter.ai/openai/gpt-5.2

**2-19** 原文：「OpenRouter 充 $10（支持支付宝，手续费 5.5%）」「与厂商直连同价」
→ ✅ **正确**：官方 FAQ：经 Stripe 充值手续费 **5.5%**（最低 $0.80），接受信用卡、**AliPay**、USDC；推理定价本身无加价（同价）。
→ 来源：https://openrouter.ai/docs/faq

**2-20** 原文：DeepSeek deepseek-flash「输入 ¥1/输出 ¥2 每百万 token；缓存命中输入 ¥0.02」（2.3 表格）
→ ❌ **错误**：官方定价页（2026-10 实抓）为**美元峰谷制**，无人民币标价：deepseek-flash（DeepSeek-V4.1-Flash）输入（缓存未命中）**$0.15**（谷）/ **$0.30**（峰）、输出 **$0.60** / **$1.20**、缓存命中 **$0.003** / **$0.006**（每百万 token）。「¥1/¥2」对不上任何一档（输出侧差距最大：$0.60 ≈ ¥4.3）；「缓存命中 ¥0.02」仅与谷时 $0.003 的汇率折算巧合接近。建议改为官方美元价（或注明折算口径与时点）。
→ 来源：https://api-docs.deepseek.com/quick_start/pricing

**2-21** 原文：「模型名写死且过期（如 `deepseek-chat` 已于 2026-07 弃用）」（常见坑 4）
→ ⚠️ **部分正确**：官方文档当前模型列表确实已无 deepseek-chat（仅 deepseek-flash、deepseek-v4-pro；deepseek-v4-flash 等旧名「仍接受但由 V4.1-Flash 服务」），「会过期、别写死」的教训成立；但「2026-07 弃用」这一具体日期在官方页面**查无出处**，未能证实。建议删去具体日期或改为「已被新命名取代（当前为 deepseek-flash / deepseek-v4-pro）」。
→ 来源：https://api-docs.deepseek.com/ ；https://api-docs.deepseek.com/quick_start/pricing

**2-22** 原文：「白嫖多模态：Google Gemini Flash 系免费层，限速免费」
→ ⚠️ **未能一手核实**：同 2-17，Google 域不可达。Gemini API 存在免费层是长期公开事实，但「Flash 系免费层」的当前限额本次无法验证。
→ 来源：无（官方页 https://ai.google.dev/gemini-api/docs/pricing 不可达）

**2-23** 原文（延伸阅读）：「OpenRouter 文档（聚合网关）：https://openrouter.ai/docs/api/overview」
→ ⚠️ **部分正确**：该路径本次实抓返回 **404**（文档站结构已调整）。入口改为 https://openrouter.ai/docs （API 参考散布于 /docs/api/... 子路径，如 /docs/api/api-reference/models/list-all-models-and-their-properties）。
→ 来源：https://openrouter.ai/docs/api/overview （404）；https://openrouter.ai/docs

**2-24** 原文（延伸阅读）：DeepSeek 文档 https://api-docs.deepseek.com/ ；智谱兼容文档 https://docs.bigmodel.cn/cn/guide/develop/openai/introduction.md ；OpenAI JS SDK https://github.com/openai/openai-node
→ ✅ **正确**：三个 URL 均实测可达且内容对口。
→ 来源：本次逐一直接抓取验证

---

## 二、第 03 章 · Prompt 工程

> 本章主体是方法论（技巧、模板、防注入意识），可机器核对的 API 事实集中在消息结构与 3.5 代码。方法论部分与 Anthropic 官方指南精神一致，未逐条展开。

**3-01** 原文：messages 数组三种角色 `system` / `user` / `assistant`，assistant 消息可作「预填的引导」
→ ✅ **正确**：与 openai SDK 的 `ChatCompletionMessageParam` 类型一致；「预填/替模型说话」在 Anthropic 官方教程第 5 章 "Formatting Output & Speaking for Claude" 有官方背书。
→ 来源：https://github.com/openai/openai-node （类型定义）；https://github.com/anthropics/prompt-eng-interactive-tutorial

**3-02** 原文：「模型没有会话记忆，多轮对话是应用每次全量重发 messages」
→ ✅ **正确**：Chat Completions 为无状态请求，历史由调用方维护——这是 OpenAI 及各兼容厂商 API 的共同模型（各官方文档的多轮对话示例均为重发完整 messages）。
→ 来源：https://platform.kimi.com/docs/api/chat （多轮示例重发全部历史）；https://api-docs.deepseek.com/

**3-03** 原文：「XML 风格标签（`<doc>`，Anthropic 官方推荐，模型识别很稳）」
→ ✅ **正确**：Anthropic 官方交互式教程贯穿使用 XML 标签组织 prompt（第 4 章 "Separating Data from Instructions"、第 5 章格式化输出等），官方文档亦有专门 use-xml 页面（该页在本环境被区域封锁重定向，无法直接引用原文，以官方教程仓库佐证）。
→ 来源：https://github.com/anthropics/prompt-eng-interactive-tutorial ；（官方文档页 https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml ，区域封锁未直引）

**3-04** 原文（延伸阅读）：「Anthropic 官方 Prompt Engineering 交互式教程（9 章可运行练习）」https://github.com/anthropics/prompt-eng-interactive-tutorial
→ ✅ **正确**：README 确认 9 章（初级 1–3、中级 4–7、高级 8–9）+ 附录（Chaining/Tool Use/Search & Retrieval）。
→ 来源：同上 README 实抓

**3-05** 原文（延伸阅读）：「Prompt Engineering Guide（最全知识库，有中文版）https://www.promptingguide.ai/zh」
→ ✅ **正确**：/zh 中文版实际存在，DAIR.AI 维护，内容覆盖技术/应用/风险/研究等板块。
→ 来源：https://www.promptingguide.ai/zh

**3-06** 原文（3.5 代码）：`import z from "zod";`（默认导入）
→ ✅ **正确**：zod 4.6.5（当前 npm 实际分发版本，unpkg 实测）ESM 入口明确保留默认导出：`export { z, z as default }`（并注释说明刻意保持 default 为 live binding）。第 3 章默认导入、第 4 章命名导入两种写法均可用；官方文档示例风格为 `import { z } from "zod"`。
→ 来源：https://unpkg.com/zod/index.js （实抓：`export { z, z as default }`）；https://unpkg.com/zod/package.json （version 4.6.5）

**3-07** 原文（3.5 代码）：`z.object({ feedback: z.string().min(1), maxLength: z.number().default(50) })`、`z.infer<typeof ...>`
→ ✅ **正确**：均为 Zod 4 核心不变 API（对象/字符串长度/数值默认值/类型推导）。
→ 来源：https://zod.dev/

---

## 三、第 04 章 · 结构化输出与 Zod

### 3.1 Zod API（4.2 节）

**4-01** 原文：`import { z } from "zod";`（npm install zod）
→ ✅ **正确**：zod 当前版本 **4.6.5**（unpkg 实测），根入口即 Zod 4（zod.dev："Zod 4 is stable"，最新发布 4.6）。`zod/v4`、`zod/v3` 子路径也在 exports 中定义（`./v4`、`./v3` 等），`import { z } from "zod/v4"` 亦有效。
→ 来源：https://unpkg.com/zod/package.json ；https://zod.dev/

**4-02** 原文：`z.enum(["complaint", "question", "praise"])`
→ ✅ **正确**：Zod 4 文档基础用法即字符串字面量数组 `z.enum(["Salmon","Tuna","Trout"])`。注意官方提示：数组先赋值给变量会丢失字面量推断（需 `as const` 或内联传入）——教程均为内联，无此问题。
→ 来源：https://zod.dev/api?id=enums

**4-03** 原文：`z.coerce.number().int().min(1)`
→ ✅ **正确**：Zod 4 文档明确 `z.coerce.number()` 即 `Number(input)`，是官方文档化的类型收编方式。
→ 来源：https://zod.dev/api?id=strings

**4-04** 原文：`z.string().datetime().optional()`
→ ⚠️ **部分正确**：**Zod 4 已弃用**字符串方法形式（`.datetime()` 等），官方迁移到顶层命名空间 `z.iso.datetime()`；迁移指南原文："The method forms still exist and work as before, but are now deprecated"——**仍可运行**，但教程作为「面向 2026 的新教程」建议直接写 `z.iso.datetime()`。
→ 来源：https://zod.dev/v4/changelog

**4-05** 原文：`.describe("相关性得分，1 最相关")`
→ ✅ **正确**：`.describe()` 在 v4 无变化，仍是给 schema 加描述的标准方式（JSON Schema 转换时会带出）。
→ 来源：https://zod.dev/ ；https://zod.dev/json-schema

**4-06** 原文（4.2 预告框）：「Zod 的 `describe` 与 `z.toJSONSchema()`（或社区工具）会把 schema 转成 JSON Schema」
→ ⚠️ **部分正确**：`z.toJSONSchema()` 名称**正确**（确切 API 名，Zod 4 内置，如 `z.toJSONSchema(schema, { target: "draft-07" })`；注：底稿 R5 曾提的 `z.json()` 并不存在，教程未采用该错误名称，好）。但「或社区工具」一项过时：`zod-to-json-schema` **不支持 Zod 4 schema**（仅 v3；其包 v3.25 起仅允许把 zod@4 作为 peer dependency 但必须传 v3 schema），且 README 声明 **"As of November 2025, this project will no longer be actively maintained"**，并指引用户改用 Zod 4 内置生成。建议删去「或社区工具」。
→ 来源：https://zod.dev/json-schema ；https://github.com/StefanTerdell/zod-to-json-schema （README 实抓）

**4-07** 原文：`Feedback.safeParse(...)`、`result.error.issues`、`z.infer<typeof Feedback>`
→ ✅ **正确**：safeParse/`.issues`/z.infer 均为 v3→v4 不变 API。
→ 来源：https://zod.dev/

**4-08**（核对清单追加项）`z.record` 签名
→ ⚠️ **注意**：Zod 4 已**移除单参数形式**，`z.record()` 必须写两个参数：`z.record(z.string(), z.unknown())`（迁移指南："Before, z.record() could be used with a single argument. This is no longer supported."）。第 4 章正文未直接用 z.record（练习 3 用的是 TS 映射类型 `{ [skill: string]: number }`），但读者实现练习时若用 `z.record(z.number())` 会直接报错——建议练习提示里注明双参数写法。
→ 来源：https://zod.dev/api?id=records ；https://zod.dev/v4/changelog

### 3.2 JSON mode 跨厂商支持（4.3 节）

**4-09** 原文：`response_format: { type: "json_object" }` // JSON mode（OpenAI/DeepSeek/GLM/Kimi 均支持）
→ ✅ **正确**：四家逐一核实——OpenAI：SDK 类型 `ResponseFormatJSONObject` 存在；DeepSeek：官方 JSON Output 指南明确 `response_format={'type': 'json_object'}`；智谱：官方结构化输出文档明确 `response_format={"type": "json_object"}`；Kimi：官方 API 文档 response_format 支持 `{"type":"json_object"}`（且另有 `json_schema`）。
→ 来源：https://api-docs.deepseek.com/guides/json_mode ；https://docs.bigmodel.cn/cn/guide/capabilities/struct-output.md ；https://platform.kimi.com/docs/api/chat ；https://github.com/openai/openai-node

**4-10** 原文：铁律 2「『JSON』这个词必须出现在提示里（多数实现的硬要求）」
→ ⚠️ **部分正确**：OpenAI（json_object 模式官方硬要求）与 DeepSeek（官方原文要求 prompt 含 "json" 一词并附格式示例）确为硬要求；Kimi 的官方要求是「在提示中描述期望的 JSON 字段」（未强调字面 "JSON" 一词）；智谱官方只要求「在系统消息中定义期望的 JSON 结构和字段要求」。「多数实现的硬要求」基本成立，教程示例提示均含「以 JSON 输出」，实操无碍；可把括号改成「OpenAI/DeepSeek 为硬性要求」。
→ 来源：同 4-09 四家文档

**4-11** 原文：「部分厂商支持更强的是 `json_schema` 严格模式……支持度参差不一」
→ ✅ **正确**：实测参差：OpenAI 有 json_schema 严格模式；Kimi 支持 `{"type":"json_schema"}`；智谱文档只提供 `json_object`（无 json_schema）；DeepSeek 文档亦无。「教通用三板斧」的取舍成立。
→ 来源：同 4-09；https://platform.openai.com/docs/guides/structured-outputs （该域不可达，依 SDK 类型与各家文档交叉判断）

**4-12** 原文：`temperature: 0`（结构化任务压温度）
→ ✅ **正确**：0 在合法区间 [0,2] 内；各兼容端均接受 0。（个别 reasoning 模型温度固定不可调，超出本章范围。）
→ 来源：同 2-08

**4-13** 原文：「`finish_reason: "length"` = 被 max_tokens 掐断；stop 正常；tool_calls 想调工具」
→ ✅ **正确**：与 SDK 枚举一致（见 2-13）。
→ 来源：https://github.com/openai/openai-node/blob/master/src/resources/chat/completions/completions.ts

### 3.3 修复循环与暗坑（4.4–4.5 节）

**4-14** 原文（4.5 表第 3 行）：「Zod 的 `.strict()` 可拒绝多余字段」
→ ⚠️ **部分正确**：功能描述正确，但 `.strict()` 在 Zod 4 已标**弃用**（仍可用、官方承诺不移除："still available for backwards compatibility, and they will not be removed"），现行 API 为 `z.strictObject({...})`。同族：`.passthrough()` → `z.looseObject()`（正文未用，列出备查）。建议教程改用 `z.strictObject()`。
→ 来源：https://zod.dev/v4/changelog ；https://zod.dev/api?id=objects

**4-15** 原文（4.4 代码）：`const parsed = Feedback.safeParse(JSON.parse(extractJson(text)));`
→ ⚠️ **代码写法隐患**（非事实错误）：`JSON.parse` 在字符串不合法时直接抛异常且**未被捕获**，会击穿整个修复循环——恰是 4.1 列出的暗坑 1/2/3 的组合场景（围栏剥不净、截断）。修复循环的意图是「格式错也走修复」，应改为先 try/catch（或把「JSON.parse 失败」也转成一条喂回模型的错误信息）再 safeParse。与本章「防御性解析」的自我要求不一致。
→ 来源：依据 4.1 自述场景与 JS 标准行为（JSON.parse 语义）判断；DeepSeek 官方亦警告 JSON mode「可能返回空 content」：https://api-docs.deepseek.com/guides/json_mode

**4-16** 原文（延伸阅读）：https://zod.dev 、https://platform.openai.com/docs/guides/structured-outputs 、https://api-docs.deepseek.com/
→ ✅ zod.dev 实测可达；DeepSeek 文档实测可达（含 JSON Output 章节）。⚠️ platform.openai.com 本环境不可达未能验证（URL 为 OpenAI 官方长期路径，无反证）。
→ 来源：本次直接抓取

---

## 四、需修改清单（全部 ❌ 与 ⚠️ 汇总）

| # | 位置 | 问题 | 建议 |
|---|---|---|---|
| ❌1 | 第 2 章 2.3 表格 | DeepSeek 价格「输入 ¥1/输出 ¥2；缓存命中 ¥0.02」与官方 2026-10 美元峰谷定价不符（输入 $0.15/$0.30、输出 $0.60/$1.20、缓存命中 $0.003/$0.006） | 改为官方美元价或注明汇率折算口径与时点 |
| ⚠️2 | 第 2 章 2.2 | `winget ... LTS` 注释与预期输出写 v22/npm 10，实际该包当前装 24.20.0（npm 11）；Node 22 已是 Maintenance LTS | 注释改为 Node 24 LTS，或说明 22/24 均可、锁定 22 用 nvm |
| ⚠️3 | 第 2 章 2.2 | `npm install -g pnpm` 非官方当前推荐（文档改为 `npx get-pnpm`）；「pnpm 9/10.x」过时（当前 12） | 改为 `npx get-pnpm` 或保留命令但更新版本预期；`pnpm -v` 注释去掉具体大版本 |
| ⚠️4 | 第 2 章 2.2 | Claude Code 的 npm 安装命令已被官方标 deprecated | Windows 改为 `winget install Anthropic.ClaudeCode` 或 `irm https://claude.ai/install.ps1 \| iex` |
| ⚠️5 | 第 2 章 2.5/2.6/2.7 | `max_tokens` 在 openai SDK 已 @deprecated（OpenAI 端新模型要 `max_completion_tokens`）；兼容厂商仍正常 | 加一行脚注：直连 OpenAI 新模型时改用 `max_completion_tokens`，本教程三家兼容端不受影响 |
| ⚠️6 | 第 2 章 2.6 注释 | 「多数兼容端支持」stream_options.include_usage 属经验说法，智谱/Kimi/DeepSeek 文档未明确承诺 | 措辞加「以各家文档为准」 |
| ⚠️7 | 第 2 章 2.3/延伸阅读 | Gemini 兼容层 URL 与「Flash 免费层」本次无法一手核实（Google 域不可达） | 保留，后续有条件时复核；URL 本身无反证 |
| ⚠️8 | 第 2 章 常见坑 4 | 「deepseek-chat 已于 2026-07 弃用」日期无官方出处（模型确已不在列表） | 删具体日期，改「已被新命名取代（现役 deepseek-flash / deepseek-v4-pro）」 |
| ⚠️9 | 第 2 章 延伸阅读 | `https://openrouter.ai/docs/api/overview` 已 404 | 改为 `https://openrouter.ai/docs` |
| ⚠️10 | 第 4 章 4.2 | `z.string().datetime()` 为 Zod 4 弃用 API（仍可用） | 改用 `z.iso.datetime()` |
| ⚠️11 | 第 4 章 4.2 预告框 | 「或社区工具」（zod-to-json-schema）已停止维护且不支持 Zod 4 | 删去，只留内置 `z.toJSONSchema()` |
| ⚠️12 | 第 4 章 4.5 表 | `.strict()` 为 Zod 4 弃用 API（仍可用） | 改用 `z.strictObject()` |
| ⚠️13 | 第 4 章 练习 3 提示 | 读者若用 `z.record` 实现，v4 必须双参数 `z.record(z.string(), z.number())`，单参数已移除 | 练习提示补一句双参数写法 |
| ⚠️14 | 第 4 章 4.3 铁律 2 | 「『JSON』一词必须出现」仅 OpenAI/DeepSeek 是硬性要求，Kimi/智谱要求的是描述字段结构 | 括号限定为「OpenAI/DeepSeek 硬性要求」 |
| ⚠️15 | 第 4 章 4.4 代码 | `JSON.parse` 未捕获会击穿修复循环（截断/脏围栏场景恰是它要防的） | try/catch 包裹，解析失败也走「喂回错误」分支 |
| ⚠️16 | 第 4 章 延伸阅读 | platform.openai.com 链接本环境不可达未验证（无反证） | 保留，后续有条件时复核 |

## 五、核对方法附记（供后续核对者复用）

- **一手来源优先级**：厂商官方文档 > SDK 官方仓库源码/README（GitHub raw 在本环境稳定可达）> unpkg/jsdelivr 实测 npm 分发产物 > 本机命令实测（winget）。
- **已知不可达域**（本环境，2026-10-11）：`ai.google.dev`、`generativelanguage.googleapis.com`、`platform.openai.com`（超时/封锁）；`npmjs.com`（403，用 unpkg 替代）；`docs.claude.com`（307 区域封锁，用官方 GitHub 仓库替代）；`github.com` HTML 页（超时，但 `raw.githubusercontent.com` 可达）。
- **意外收获**：`platform.moonshot.cn` 已 301 → `platform.kimi.com`（API 端点 `api.moonshot.cn/v1` 未变）；智谱文档已全面切换 GLM-5.x 叙事，但价格页仍保留 glm-4.7-flash 免费条目；DeepSeek 现役模型仅 `deepseek-flash` / `deepseek-v4-pro` 两个。
