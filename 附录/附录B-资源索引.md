# 附录 B · 资源索引（2026-11-13 复核版）

> **核实说明**：本索引的链接最初于 2026-10-10/11 联网核实，2026-10-22 做过一轮版本复核，**2026-11-13 又对照官方一手来源（官方文档、定价页、npm registry、GitHub）复核了模型价格、包版本与弃用信息**——标「（2026-11 复核）」的条目即本轮核实过的；其余沿用上一轮结论。完整核实记录在 `research/` 与 `research_notes/`。AI 生态迭代快，遇到失效或改版以官方最新为准。
>
> **用法**：学对应章节时回来查；工具选型争论时以「版本快照表」（文末）为起点再核实一次。

---

## B1. 大模型 API 与定价

| 资源 | 链接 | 备注 |
|---|---|---|
| OpenAI 文档+定价 | https://developers.openai.com/api/docs/pricing | GPT-6 Astra $10/$50；GPT-6.1 Sol $2/$10；GPT-6.1 Terra $1/$5（2026-10-26 新增的中档）；GPT-6 Luna $0.10/$0.50；均 1.05M 上下文 / 128K 输出；**单次输入 >272K 时整单按长上下文价（输入 2x、输出 1.5x）**。o4-mini 已于 2026-10-23 关停；o3 / gpt-5 / gpt-5-mini / gpt-5-nano 于 2026-12-11 关停，gpt-5.1 于 2027-04-01 关停；GPT-5.x 已不是现役旗舰（gpt-5.2 仍在定价页上）。GPT-6 系的工具调用只走 Responses API（2026-11 复核） |
| OpenAI 弃用与关停时间表 | https://developers.openai.com/api/docs/deprecations | 换模型前先查：whisper-1 / tts-1 / gpt-image-1、Evals 平台（2026-11-30 关停）等都在这页（2026-11 复核） |
| Anthropic 模型与定价 | https://platform.claude.com/docs/en/about-claude/pricing | Claude Fable 5.2 $8/$40（2026-11-09 发布，取代 Fable 5.1 的 $10/$50 成为最强档）；Opus 5.5 $4/$20；Sonnet 5.5 $2/$10；Haiku 5.5 $0.10/$0.50 起（单次 prompt >100K 整单 $0.50/$2.50）；均 1M 上下文 / 128K 输出；缓存读 0.025x-0.1x、写 1.25x（5 分钟）/ 2x（1 小时）；Batch 五折（2026-11 复核） |
| Gemini 定价 | https://aistudio.google.com/docs/pricing | **Gemini 文档已整体迁到 aistudio.google.com/docs**（原 ai.google.dev/gemini-api/docs 地址会 301 跳转）。Gemini 4 Carbon（2026-10-28 发布，官方称最强推理模型，**分阶段开放**，不要当成人人可调的默认模型）与 Gemini 4 Argon（高效档）同价：$2/$10（至 2026-11-30；12-01 起 $4/$20），无免费层；3.8/3.6 Flash $0.75/$3.75（至 2026-12-31；2027-01-01 起 $1.50/$7.50），有限速免费层（2026-11 复核） |
| DeepSeek 文档（中文） | https://api-docs.deepseek.com/zh-cn/quick_start/pricing | deepseek-flash **分时计价**（空闲/高峰）：输入 ¥1/¥2、输出 ¥4/¥8，缓存命中 ¥0.02/¥0.04；1M 上下文；支持图像理解（deepseek-v4-pro 不支持）；Search/Fetch 自 2026-11-01 起 ¥5/千次成功请求；旧名 deepseek-chat 官方 2026-04-24 预告停用、价格页已不再列出（2026-11 复核） |
| 智谱 GLM 定价 | https://docs.bigmodel.cn/cn/guide/start/pricing | **GLM-4.7-Flash（200K）与 GLM-4.6V-Flash 完全免费**；另有免费的 CogView-3-Flash（生图）（2026-11 复核） |
| Kimi 文档 | https://platform.kimi.com/docs/pricing/chat | 现役 K3.1 Pro（`kimi-k3.1-pro`，2026-10-24 发布，1M 上下文，¥13 入（命中 ¥1.3）/ ¥68 出）；**K2 系列（含 kimi-k2.6）2026-10-31 起不再对新注册用户开放，计划 2026 年 12 月底全部下线**；API 域名仍是 api.moonshot.cn（2026-11 复核） |
| 阿里百炼 | https://help.aliyun.com/zh/model-studio/ | qwen3.8-max ¥12/¥36、qwen3.7-plus ≤256K ¥2/¥8（限时 8 折）、qwen3.8-flash ¥0.8/¥2.7（北京地域）；新用户每模型 100 万 tokens 免费额度（仅北京地域，90 天）（2026-11 复核） |
| OpenRouter（聚合网关） | https://openrouter.ai/docs | 与厂商同价；支持支付宝（充值手续费 5.5%）（本轮未复核） |
| 硅基流动 | https://siliconflow.cn/pricing | `BAAI/bge-m3` embedding 与 `BAAI/bge-reranker-v2-m3` **免费**（注意别选收费的 `Pro/BAAI/bge-m3`）；另有免费的 `FunAudioLLM/SenseVoiceSmall`（ASR）与 `Kwai-Kolors/Kolors`（生图）（2026-11 复核） |
| 结构化输出支持情况 | 以各家官方文档为准 | 已核实：DeepSeek/GLM/Kimi/OpenAI 支持 JSON mode（`json_object`）；OpenAI 支持 `json_schema` + `strict`；Anthropic 的 OpenAI 兼容端点**只收** `json_schema` + `strict`（`json_object` 直接 400）（2026-11 复核） |

## B2. TS 框架与 SDK（第 5/10 章）

| 资源 | 链接 | 状态快照 |
|---|---|---|
| **Vercel AI SDK**（教程主力） | https://ai-sdk.dev/docs/introduction | `ai` v7；旧写法 `generateObject`（v6 起弃用）/ `parameters`（v5 起改 `inputSchema`）/ `ai/react`（已改 `@ai-sdk/react`）不要再照抄；工具审批用调用层的 `toolApproval`（`tool()` 上的 `needsApproval` 已弃用）（2026-11 复核） |
| LangGraph.js | https://docs.langchain.com/oss/javascript/langgraph/overview | `@langchain/langgraph` 1.7.x（1.7.0 起 falsy 的 resume 值也能传入 `interrupt()`）；持久化 checkpointer 用 `@langchain/langgraph-checkpoint-sqlite` / `-postgres`（第 22 章）；旧站已重定向（2026-11 复核） |
| LangChain.js | https://docs.langchain.com/oss/javascript/langchain/overview | 1.6.x；主 API 是 `createAgent`（LangGraph 的 `createReactAgent` 已弃用）（2026-11 复核） |
| Mastra | https://mastra.ai/docs | TS 全家桶（Agent/Memory/Workflows/Evals/RAG）；建于 AI SDK provider 协议上；Memory 必须配 storage（如 `@mastra/libsql`）（2026-11 复核） |
| OpenAI Agents SDK（JS） | https://openai.github.io/openai-agents-js/ | `@openai/agents` 0.21（未到 1.0） |
| Claude Agent SDK（TS） | https://code.claude.com/docs/en/agent-sdk/typescript | 内嵌 Claude Code 二进制；query() |
| Cloudflare Agents | https://developers.cloudflare.com/agents/ | `agents` 0.33；"Each agent is a Durable Object"；0.31 起 MCP 包是可选 peer 依赖（2026-11 复核） |
| ~~LlamaIndex.TS~~ | https://developers.llamaindex.ai/typescript/framework | ⚠️ 仓库已归档停更，仅作历史注记 |

## B3. RAG 工具链（第 12-13 章）

| 资源 | 链接 | 备注 |
|---|---|---|
| LanceDB 快速开始 | https://docs.lancedb.com/quickstart.md | 入门主推（嵌入式，Windows 支持）；混合检索见同站 hybrid-search |
| Drizzle × pgvector 指南 | https://orm.drizzle.team/docs/guides/vector-similarity-search | 有 PG 的选择 |
| Qdrant 混合检索 | https://qdrant.tech/documentation/search/hybrid-queries/ | 服务端 RRF；JS 客户端 `@qdrant/js-client-rest` |
| MiniSearch | https://www.npmjs.com/package/minisearch | 关键词检索（类 BM25 打分），3.6M 周下载 |
| Orama | https://www.npmjs.com/package/@orama/orama | 明牌 BM25 + 向量同库 |
| @langchain/textsplitters | https://www.npmjs.com/package/@langchain/textsplitters | RecursiveCharacterTextSplitter（1000/200 起步）；⚠️ 无 SemanticChunker |
| pdf-parse（v2 类 API） | https://www.npmjs.com/package/pdf-parse | v1 函数式已弃用；必须 destroy() |
| 硅基流动 Rerank | https://docs.siliconflow.cn/docs/api/rerank-post | `BAAI/bge-reranker-v2-m3` 免费；参数 `top_n`、响应字段 `results`（2026-11 复核） |
| Cohere Rerank | https://docs.cohere.com/docs/rerank-overview | 质量标杆；当前一代 Rerank 5（`rerank-v5.0-pro` / `-fast`，32K；旧 `rerank-v3.5` 只有 4K）；v2 端点 `/v2/rerank`；计费口径以官网为准（2026-11 复核） |
| Voyage Rerank | https://docs.voyageai.com/docs/reranker | `rerank-3` $0.05 / `rerank-3-lite` $0.02 每 1M tokens，前 200M tokens 免费；参数叫 `top_k`、响应字段叫 `data`（与另两家不同构）（2026-11 复核） |
| LangChain.js RAG 官方教程 | https://docs.langchain.com/oss/javascript/langchain/knowledge-base.md | 框架化写法对照 |

## B4. 评测与可观测（第 15-16 章）

| 资源 | 链接 | 备注 |
|---|---|---|
| **promptfoo** | https://www.promptfoo.dev/docs/getting-started/ | 0.125.x（需 Node ≥22.22）；断言大全见 /configuration/expected-outputs；2026-03 宣布被 OpenAI 收购，官方承诺继续开源（2026-11 复核） |
| promptfoo CI Action | https://github.com/promptfoo/promptfoo-action | PR 自动评测评论 |
| autoevals | https://github.com/braintrustdata/autoevals | `Factuality()` 等代码内打分器 |
| **Langfuse** 文档 | https://langfuse.com/docs | TS SDK **v6**（锁 `@langfuse/*@6.1.1`；@langfuse/tracing + @langfuse/otel；OTel 必须锁 2.x 维护线：`@opentelemetry/sdk-node` / exporter `0.223.2` + `@opentelemetry/api@1.9.1`（npm dist-tag `latest-2`），不锁会 ERESOLVE；旧 @langfuse/nodejs 已废弃；需 Node 22+/自部署 Langfuse 4.59+）（2026-11 复核） |
| Langfuse 自部署 | https://langfuse.com/self-hosting/deployment/docker-compose | docker compose（PG+ClickHouse+Redis+S3） |
| Langfuse × AI SDK 7 | https://langfuse.com/integrations/frameworks/vercel-ai-sdk | `@langfuse/vercel-ai-sdk`（类名 `LangfuseVercelAiSdkIntegration`） |
| Vercel AI SDK Telemetry | https://ai-sdk.dev/docs/ai-sdk-core/telemetry | 用 `ai` 包自带的 `registerTelemetry()` 注册集成；Langfuse 集成内部用 `@ai-sdk/otel`（1.0.x）生成 span，作为依赖自动安装、不用单独装；调用选项叫 `telemetry`（旧名 `experimental_telemetry`）；遵循 gen_ai.* 约定（第 16 章，2026-11 复核） |
| OTel GenAI 语义约定 | https://github.com/open-telemetry/semantic-conventions-genai | Development 状态 |
| DeepEval（TS 版） | https://deepeval.com/docs/getting-started | 2026 落地：Vitest 集成 + toPass()（0.x） |
| OpenAI Evals（已弃用） | https://developers.openai.com/api/docs/deprecations | 2026-10-31 起只读、2026-11-30 关停 Dashboard 与 API；官方迁移指引指向 promptfoo（2026-11 复核） |
| Braintrust / LangSmith | https://www.braintrust.dev/ ・ https://docs.smith.langchain.com | 商业平台对比项（LangSmith 包名 `langsmith`） |

## B5. Agent 基础设施（第 9/17/18/19 章）

| 资源 | 链接 | 备注 |
|---|---|---|
| **MCP 官方文档** | https://modelcontextprotocol.io/docs/2026-07-28/develop/build-server | TS Server 教程（官方 Quickstart）；当前规范 2026-07-28：无状态、每请求带协议版本、`server/discover`、MRTR（2026-11 复核） |
| MCP TS SDK 专属文档 | https://ts.sdk.modelcontextprotocol.io/ | v2 新包：`@modelcontextprotocol/server`+`client`（2.4.0，2026-10-23）；服务端用 `serveStdio(工厂函数)` 才能同时服务 2026-07-28 新协议与旧客户端，客户端要传 `versionNegotiation: { mode: "auto" }`（默认 legacy）；旧单体包 `@modelcontextprotocol/sdk` 1.32.2 维护中（2026-11 复核） |
| MCP Registry | https://registry.modelcontextprotocol.io/ | 官方注册中心 |
| Claude Code MCP 接入 | https://code.claude.com/docs/en/mcp | claude mcp add / .mcp.json |
| Playwright MCP | https://github.com/microsoft/playwright-mcp | `npx @playwright/mcp@latest`；默认有头 |
| Inngest | https://www.inngest.com/docs | 持久执行主线（4.26.x）；免费层 5 万次/月，只保留 24 小时历史（2026-11 复核） |
| Trigger.dev | https://trigger.dev | 对位选项（v4） |
| E2B 沙箱 | https://e2b.dev | `@e2b/code-interpreter`；$100 一次性免费额度 |
| Cloudflare AI Gateway | https://developers.cloudflare.com/ai-gateway/ | 缓存/限流/分析各计划可用（额度以官网为准；改 baseURL 即用） |
| one-api / new-api | https://github.com/songquanpeng/one-api ・ https://github.com/QuantumNous/new-api | 自部署模型网关（选修） |
| AG-UI 规范 1.0 | https://docs.ag-ui.com/spec/1.0 | Agent ↔ 前端的事件协议（第 20 章）；TS 包 `@ag-ui/core`/`@ag-ui/client` 1.0.x（2026-11 复核） |
| Upstash Redis/Vector | https://upstash.com | 免费层：Redis 500K 命令/月；Vector 10K 请求/天 |
| Zod | https://zod.dev | v4（4.6.7）；全课程的契约语言 |

## B6. 安全与 AI 编程方法论（第 6/18 章）

| 资源 | 链接 | 备注 |
|---|---|---|
| OWASP LLM Top 10（2025 版） | https://genai.owasp.org/llm-top-10/ | 含中文 PDF；仍是 2025 版，无 2026 版（2026-11 复核） |
| OWASP Agentic Top 10（2026 版） | https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ | ASI01-ASI10，2025-12-09 发布，专门针对会调工具、带委托权限行动的 Agent；与课程的对照见第 18 章 18.3.1（2026-11 复核；条目原文以官方 PDF 为准） |
| OWASP 注入防御速查表 | https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html | 「权限必须在工具层执行」 |
| Simon Willison 双 LLM 模式 | https://simonwillison.net/2023/Apr/25/dual-llm-pattern/ | 其博客整体值得跟随 |
| promptfoo 红队 | https://www.promptfoo.dev/docs/red-team/ | `redteam setup`（Web UI 向导）或 `redteam init --no-gui`，再 `redteam run/report`；需 Node ≥22.22；攻击生成走独立 provider（默认 OpenAI，`OPENAI_API_KEY` 可选）；插件 ID 如 `harmful:*`、`pii:*`，框架预设 `owasp:llm`（2026-11 复核） |
| Claude Code 最佳实践 | https://code.claude.com/docs/en/best-practices | CLAUDE.md 写法；「臃肿会被忽略」警告 |
| Claude Code 记忆与 AGENTS.md | https://code.claude.com/docs/en/memory | CLAUDE.md 建议 200 行以内；`/doctor prompt-audit` 审计过时指令；项目没有 CLAUDE.md 时读 AGENTS.md（v2.1.277+）；Cursor、Codex CLI 也原生读 AGENTS.md（2026-11 复核） |
| Claude Code Skills | https://code.claude.com/docs/en/skills | SKILL.md 结构；正文建议 500 行以内；遵循 Agent Skills 开放标准（agentskills.io），自定义命令已并入 skills（2026-11 复核） |
| Anthropic Skills 官方仓库 | https://github.com/anthropics/skills | 19 个真实示例 |
| Cursor Rules | https://cursor.com/docs/rules | 规则文件 `.cursor/rules/*.mdc`；四种类型现名 Always Apply / Apply Intelligently / Apply to Specific Files / Apply Manually；也读 AGENTS.md（旧域名已迁移）（2026-11 复核） |
| GitHub Spec Kit | https://github.com/github/spec-kit | SDD 六步；TS 无障碍（无专属脚手架） |
| OpenSpec | https://github.com/Fission-AI/OpenSpec | 轻量 SDD（npm 安装；2026-11-11 发布 2.0 大版本） |
| Simon Willison 对 Vibe Coding 的解读 | https://simonwillison.net/2025/Mar/19/vibe-coding/ | 区分玩具与生产：「无法解释就不提交」（这个词由 Andrej Karpathy 于 2025-02 提出） |
| Anthropic 工程博客 | https://www.anthropic.com/engineering | 《How we use Claude Code》等一手实践 |

## B7. 必读论文（第 8/11/14 章）

| 论文 | 链接 | 一句话 |
|---|---|---|
| ReAct | https://arxiv.org/abs/2210.03629 | 推理+行动交替，Agent Loop 鼻祖 |
| Plan-and-Solve | https://arxiv.org/abs/2305.04091 | 先规划后执行 |
| Reflexion | https://arxiv.org/abs/2303.11366 | 失败自省存记忆（口头 RL） |
| MemGPT | https://arxiv.org/abs/2310.08560 | 上下文=虚拟内存 |
| Toolformer | https://arxiv.org/abs/2302.04761 | 模型自学何时调 API（扩展阅读，正文未涉及） |
| Anthropic《Building Effective Agents》 | https://www.anthropic.com/engineering/building-effective-agents | workflow vs agent 官方框架（工程文非论文但必读） |

## B8. 系统课程与视频（免费）

> 视频课多用 Python 演示，只取其中的概念部分即可。

| 资源 | 链接 | 定位 |
|---|---|---|
| Anthropic Prompt 交互教程 | https://github.com/anthropics/prompt-eng-interactive-tutorial | 9 章练习，Prompt 篇配套 |
| Hugging Face Agents Course | https://huggingface.co/learn | Agent 概念补全（smolagents，带证书） |
| DeepLearning.AI 短课 | https://www.deeplearning.ai/courses/ | AI Agents in LangGraph / Advanced RAG 等 1-2 小时短课 |
| 3Blue1Brown 神经网络 | B 站搜「3Blue1Brown 神经网络」 | 第 1 章配套视频 |
| Karpathy「build GPT」 | https://www.youtube.com/@AndrejKarpathy （代码 github.com/karpathy/nanoGPT） | 第 1 章后回看，工程视角最强 |
| 李宏毅生成式 AI | B 站搜「李宏毅 生成式AI」 | 中文，跟进最新进展 |
| Prompt Engineering Guide | https://www.promptingguide.ai/zh | 中英知识库 |

## B9. 版本快照（2026-11-13 npm registry 复核；写代码前建议 `npm view <pkg> version` 再确认）

```
ai 7.0.x（AI SDK v7，2026-11 为 7.0.17x）  @langchain/langgraph 1.7.x     mastra 1.39 / @mastra/core 1.83（Node ≥22.13）
openai（npm）7.55.x+                      langchain 1.6.x                @openai/agents 0.22
zod 4.6.7                                 @modelcontextprotocol/server|client 2.4.x（旧单体包 sdk 1.32.2）
@lancedb/lancedb 0.41.x（apache-arrow peer 放宽到 <22）   @qdrant/js-client-rest 1.20.x（Node ≥22）   drizzle-orm 0.45.x（drizzle-kit 0.31.x）
promptfoo 0.125.x（Node ≥22.22）  autoevals 0.4.x   @langfuse/* 6.1.1（tracing/otel/openai/vercel-ai-sdk；OTel 锁 2.x 线 latest-2：sdk-node/exporter 0.223.2 + api 1.9.1）
inngest 4.26.x                    e2b 2.64.x        @upstash/redis 1.41.x          deepeval 0.9.x（TS 版）
@playwright/mcp 0.0.85            playwright 1.65.x
llamaindex 0.12.1（停更互证）       chromadb 3.5.x    agents（CF）0.33.x
@langchain/langgraph-checkpoint-sqlite 1.1.x / -postgres 1.1.x（第 22 章）   @ag-ui/core|client 1.0.x（第 20 章）
⚠️ @ai-sdk 伴随包版本线独立于主包：@ai-sdk/openai 4.0.x、@ai-sdk/react 4.0.x、@ai-sdk/mcp 2.0.x、@ai-sdk/openai-compatible 3.0.x、@ai-sdk/otel 1.0.x——与 ai 7.x 并行属正常
其他：next 16.4.x、hono 4.13.x（5.0 仍是 RC）、marked 18.2.x、tsx 4.23.x、TypeScript 7.0.x（7.1 Beta 中）、pnpm 12.x、better-sqlite3 13.x
Node：24 或 26 LTS 均可（26 自 2026-10-28 起为 Active LTS；24 自 2026-10-20 起为维护期 LTS，支持到 2028-04-30）；课程代码在 Node 24.22 上验证；@types/node 大版本与运行时一致
```

⚠️ **旧资料高发坑位**（教程正文均按新版写，查资料时对照）：AI SDK 旧写法 `generateObject`（v6 起弃用）/`parameters`/`ai/react`；v7 改名三件套（`system`→`instructions`、`onFinish`→`onEnd`、`stepCountIs`→`isStepCount`）+ v5 起的 useChat transport（`api/body` 收进 `DefaultChatTransport`）；工具上的 `needsApproval`（v7 改用调用层 `toolApproval`）；LangChain 旧 `AgentExecutor`、LangGraph 的 `createReactAgent`（已弃用，改用 langchain 的 `createAgent`）；`Annotation.Root` 仍能跑但已不是文档主线；LangGraph 演示里的 `MemorySaver`（换进程恢复得到空状态）；Langfuse v3 `@langfuse/nodejs` + `trace()`；MCP 旧单体包 `@modelcontextprotocol/sdk`，以及手写 `server.connect(new StdioServerTransport())`（只服务 2025 时代客户端）；OpenAI 的 whisper-1 / tts-1 / dall-e / gpt-image-1 与 OpenAI Evals（均已弃用或关停）；`zod-to-json-schema` 已归档弃用且不支持 Zod v4 schema（用内置 `z.toJSONSchema()`）；pdf-parse v1 函数式 API；marked.parse() 默认同步返回（无 `.then()`）；docs.cursor.com / js.langchain.com / ai.google.dev/gemini-api/docs（→ aistudio.google.com/docs）等已迁移旧域名；OpenAI 文档以 developers.openai.com 为准。

## B10. 关于 Python

本课程不学 Python。Agent/RAG/评测的思想跨语言通用，真有一天需要，靠第 6 章的 AI 编程工具做迁移即可。

---

*本索引与教程同维护。发现失效链接或重大版本变化，欢迎更新对应条目与 `research/` 底稿。*
