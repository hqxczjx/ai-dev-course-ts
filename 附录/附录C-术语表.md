# 附录 C · 术语表（AI 开发中英对照）

> 学习途中随查。共 189 个术语（11 个分组；Prompt Injection 在「Prompt 工程」与「安全」两组各列一次，表格共 190 行；2026-11 复核时补充了离线回归、幂等键、意图日志、AGENTS.md、Responses API、OWASP Agentic Top 10、MRTR 等课程新用到的术语）。术语按主题分组；**加粗**的词表示它本身也是本表中的一个条目。首次遇到陌生术语先来这里查，再回去读正文。

## 基础概念

| 术语 | 中文 | 一句话解释 |
|---|---|---|
| LLM (Large Language Model) | 大语言模型 | 用海量文本训练的下一个词预测模型，AI 应用的能力核心 |
| Token | 词元 | 模型处理文本的最小单位；计费、窗口、速度的统一度量衡 |
| Tokenizer | 分词器 | 把文本切成 token 序列的组件 |
| Context Window | 上下文窗口 | 单次请求中模型能看见的全部 token 上限 |
| Temperature | 温度 | 采样随机性参数：低=稳定确定，高=多样发散 |
| Top-p / Nucleus Sampling | 核采样 | 只从累计概率前 p 的候选词中采样 |
| Max Tokens | 最大输出长度 | 单次响应输出 token 上限，防止失控的成本保险丝 |
| System Prompt | 系统提示 | 定义模型角色/规则/约束的最高优先级指令 |
| Inference | 推理 | 模型生成输出的过程（区别于训练） |
| Prompt | 提示词 | 发给模型的全部输入内容 |
| Completion | 补全 | 模型生成的输出 |
| Hallucination | 幻觉 | 模型一本正经地编造事实 |
| Multimodal | 多模态 | 模型同时处理文本/图像/音频等多种输入 |
| Reasoning Model | 推理模型 | 回答前生成较长内部思考链的模型，擅长复杂问题但更贵更慢 |
| Context Caching / Prompt Caching | 提示缓存 | 相同请求前缀的 KV 计算结果复用，命中部分大幅降价提速 |
| KV Cache | KV 缓存 | 注意力计算中 Key/Value 矩阵的缓存，推理加速的底层机制 |
| Lost in the Middle | 中间迷失 | 模型对上下文首尾注意力强、中间弱的现象 |
| Fine-tuning / SFT | 微调/监督微调 | 用领域数据继续训练模型以改变其行为（应用岗多为加分项） |
| LoRA / QLoRA | 低秩适配 | 只训练少量附加参数的轻量微调技术 |
| RLHF | 人类反馈强化学习 | 用人类偏好训练模型「讨人喜欢」的对齐阶段 |
| Benchmark | 基准测试 | 标准化的能力评测集（如 MMLU、SWE-bench） |
| OpenAI-compatible | OpenAI 兼容格式 | 事实上的 API 标准格式，多数厂商提供兼容端点，可一套 SDK 调多家模型 |

## API 与消息

| 术语 | 中文 | 一句话解释 |
|---|---|---|
| Chat Completions API | 对话补全接口 | 以 messages 数组为输入的对话 API 事实标准；国内厂商兼容端点都用它（本课程主线） |
| Messages | 消息列表 | role(system/user/assistant/tool) + content 组成的对话历史 |
| Streaming / SSE | 流式输出/服务器推送事件 | 逐 token 推送给客户端的响应方式，打字机效果的来源 |
| Last-Event-ID | 最后事件 ID | SSE 断线重连时浏览器自动带上的请求头，服务端据此补发之后的事件 |
| UI Message Stream | UI 消息流协议 | AI SDK v5 起的前后端流协议（旧称 Data Stream Protocol），在 SSE 上传文本/工具/审批/自定义 data 部件 |
| UIMessage / Parts | UI 消息/部件 | AI SDK 的前端消息模型：一条消息是 text、`tool-${名字}`、dynamic-tool、`data-*` 等部件的数组 |
| WebSocket | 双向长连接 | 全双工实时通信协议，双向对话场景的 SSE 替代 |
| Tool Calling / Function Calling | 工具调用/函数调用 | 模型决定调用哪个函数并生成参数的机制，Agent 的手 |
| Parallel Tool Calls | 并行工具调用 | 模型一次返回多个 tool_calls；assistant 消息里每个 `tool_call.id` 都必须有一条 `role:"tool"` 回执，否则下一轮请求 400 |
| tool_call_id | 工具调用 ID | 把工具结果与对应调用配对的 ID（Responses API 里叫 `call_id`） |
| Responses API | 响应接口 | OpenAI 推荐新项目使用的接口（`client.responses.create`）；GPT-6 系的工具调用只走它，调用项 `function_call` 与结果 `function_call_output` 按 `call_id` 配对 |
| Structured Output | 结构化输出 | 用 JSON Schema 约束模型输出格式，保证可程序解析 |
| JSON Mode | JSON 模式 | 仅保证输出是合法 JSON（不保证字段结构）的轻量约束 |
| Strict Mode | 严格模式 | `json_schema` 或工具参数上的 `strict: true`：要求 `additionalProperties: false` 且字段全列入 required，输出保证符合 schema |
| Rate Limit | 限流 | API 每分钟请求数/token 数上限（RPM/TPM） |
| Backoff / Retry | 退避重试 | 请求失败后指数间隔地重试 |
| Idempotency | 幂等 | 同一操作执行多次效果相同，重试安全的前提 |
| Fallback | 降级回退 | 主方案失败时切换备用方案（如换便宜模型） |
| Idempotency Key | 幂等键 | 业务意图的指纹（任务 + 工具 + 参数）；同一个键只产生一次副作用，重放时直接返回上次结果 |
| Intent Log | 意图日志 | 写操作执行前先记 started、成功后记 succeeded；崩溃重启后据此判断能不能重试 |
| Reconcile | 核对 | 重启后把停在 started 的写操作拿幂等键去业务系统查一遍，查到补记成功，查不到才允许重试 |
| Token Usage | 用量统计 | API 返回的输入/输出/缓存 token 计数，成本核算依据 |
| Embedding | 嵌入/向量化 | 把文本映射为高维向量，语义相近则向量相近 |
| Rerank | 重排 | 用专门模型对候选文档按与查询的相关度精排 |
| Grounding | 有据生成 | 让回答基于给定资料，抑制幻觉的技术总称 |

## Prompt 工程

| 术语 | 中文 | 一句话解释 |
|---|---|---|
| Zero-shot | 零样本 | 不给示例直接要求模型完成任务 |
| Few-shot | 少样本 | 在提示中给几个输入→输出示例引导格式与风格 |
| CoT (Chain-of-Thought) | 思维链 | 让模型「一步步想」再作答，提升复杂推理 |
| Self-consistency | 自洽性 | 多次采样取多数答案的提升技巧 |
| ReAct | 推理+行动 | 思考→调工具→观察→再思考的循环，Agent 的基本范式 |
| Reflexion | 反思 | 失败后用自然语言自我总结并存入记忆，下轮改进 |
| Plan-and-Execute | 规划-执行分离 | 先生成完整计划再逐步执行的两段式架构 |
| Prompt Injection | 提示注入 | 用户输入中夹带指令劫持模型行为的攻击 |
| System Prompt Injection | 系统提示注入 | 攻击者诱导模型泄露/覆盖系统提示 |
| Prompt Template | 提示模板 | 带变量槽位的可复用提示，便于版本管理 |
| Prompt Versioning | 提示版本管理 | 像代码一样管理提示的变更与回归 |

## RAG（检索增强生成）

| 术语 | 中文 | 一句话解释 |
|---|---|---|
| RAG (Retrieval-Augmented Generation) | 检索增强生成 | 先检索资料再生成回答的应用架构 |
| Chunking | 切片/分块 | 把长文档切成适合检索的小段 |
| Semantic Chunking | 语义切片 | 按语义边界（而非固定长度）切片 |
| Vector Database | 向量数据库 | 存向量并支持相似度检索的数据库 |
| pgvector | — | PostgreSQL 的向量扩展；已有 PostgreSQL 时的首选 |
| LanceDB | — | 嵌入式向量库（无需单独起服务、Windows 可用），本课程 RAG 入门主线 |
| HNSW | 分层可导航小世界图 | 主流向量近似最近邻索引算法 |
| Cosine Similarity | 余弦相似度 | 常用的向量相似度度量 |
| Hybrid Search | 混合检索 | 向量检索 + 关键词检索（BM25）双路召回 |
| BM25 | — | 经典关键词相关性打分算法，补充向量检索的精确匹配能力 |
| RRF (Reciprocal Rank Fusion) | 倒数排名融合 | 合并多路检索结果排名的标准方法 |
| Recall / Precision | 召回率/精确率 | 检索质量的两面：找全 vs 找准 |
| Citation / Attribution | 引用溯源 | 回答标注来源片段，可验证性的关键 |
| Query Rewriting | 查询改写 | 把用户口语化问题改写成适合检索的查询 |
| HyDE | 假设性文档嵌入 | 让模型先生成假设答案再拿去做向量检索的技巧 |
| GraphRAG | 图谱检索增强 | 用知识图谱组织检索，擅长多跳关系问题 |
| Agentic RAG | 智能体化 RAG | 让 Agent 自主决定检索策略与轮次的架构 |
| Top-k | 前k个 | 检索返回最相似的前 k 条结果 |
| Index | 索引 | 向量库中可供检索的数据集合 |

## Agent 与编排

| 术语 | 中文 | 一句话解释 |
|---|---|---|
| Agent | 智能体 | LLM + 工具 + 循环，能自主多步完成任务的系统 |
| Agent Loop | 智能体循环 | 「模型思考→调用工具→喂回结果→继续」直到完成的循环 |
| Harness | 缰绳/执行框架 | 模型外围的工程设施（上下文管理/工具/循环/安全）的总称 |
| Tool Schema | 工具定义 | 用 JSON Schema 描述工具名、用途、参数，供模型选择 |
| MCP (Model Context Protocol) | 模型上下文协议 | Anthropic 发起的模型连接外部工具/数据的开放协议，现由 Linux 基金会旗下 AAIF 托管；2026-07-28 版规范改为无状态 |
| MCP Server / Client | MCP 服务端/客户端 | 提供工具方 / 消费工具方 |
| Stdio / Streamable HTTP | MCP 传输方式 | 本地子进程通信 / 远程 HTTP 流两种 MCP 传输（旧的 HTTP+SSE 传输已弃用） |
| server/discover | MCP 能力发现 | 2026-07-28 规范要求服务端实现的方法；取代旧的 initialize 握手，每个请求自带协议版本 |
| MRTR | — | MCP 2026-07-28 规范里服务器向客户端要输入的新方式：不再主动发 sampling/elicitation 请求，而是返回 `input_required` 结果，由客户端带上输入重试 |
| A2A (Agent-to-Agent) | 智能体互联协议 | 跨厂商 Agent 间通信的开放协议（v1.0，AAIF 托管） |
| AG-UI | Agent-用户交互协议 | Agent ↔ 前端的开放事件协议（1.0）；与 MCP（连工具）、A2A（连 Agent）并称三层 |
| Multi-Agent | 多智能体 | 多个分工 Agent 协作的架构 |
| Orchestrator | 编排者 | 负责任务分发与结果聚合的主控 Agent |
| Sub-agent | 子智能体 | 被主 Agent 调起、负责子任务的 Agent |
| Handoff | 移交 | Agent 之间转移对话/任务控制权的机制 |
| Planning | 规划 | 把大目标拆解为可执行步骤的能力 |
| Human-in-the-loop | 人工介入 | 关键决策点交人工审批的流程设计 |
| Tool Approval | 工具审批 | AI SDK v7 在调用层用 `toolApproval` 声明哪些工具要人批，前端用 `addToolApprovalResponse` 回执；`tool()` 上的 `needsApproval` 已弃用 |
| Guardrails | 护栏 | 输入输出侧的校验与安全拦截 |
| Workflow vs Agent | 工作流 vs 智能体 | 固定流程编排 vs 模型自主决策，适用边界是高频面试题 |
| State Machine / Graph | 状态机/图 | LangGraph 等框架的编排建模方式 |
| Checkpointer | 检查点存储 | LangGraph 的持久化机制，支持断点恢复与时间旅行；MemorySaver 只在内存（换进程即丢），真恢复要用 SqliteSaver/PostgresSaver |
| Thread ID | 线程 ID | LangGraph 一条检查点线的标识；项目 3 里一个任务一个 thread_id |
| Interrupt / Resume | 挂起/恢复 | LangGraph 节点内 `interrupt()` 暂停等人，`new Command({ resume })` 带着决定恢复；恢复时整个节点从头重放 |
| Sandbox | 沙箱 | 隔离执行不可信代码/操作的安全环境 |
| Computer Use | 计算机操作 | 让 Agent 操作屏幕/键鼠或浏览器完成任务 |
| Browser Automation | 浏览器自动化 | 用 Playwright/Puppeteer 等程序化控制浏览器 |
| Dead Loop Detection | 死循环检测 | 检测 Agent 重复无效动作并中断的机制 |
| Termination Condition | 终止条件 | Agent 循环的退出判定（完成/超步数/超时/预算耗尽） |
| Finish Tool | 显式终止工具 | 让模型用一次 finish 工具调用宣布完成并提交结构化答案，比猜 finish_reason 可控 |
| Model Port (ChatModel) | 模型端口 | Agent 循环只依赖的窄接口 `complete()`：运行时注入真实模型，测试时注入 FakeModel |
| Generative UI | 生成式界面 | 模型输出「组件意图」，前端按白名单 + Zod 校验渲染受控组件，绝不渲染模型给的 HTML |

## 记忆与上下文工程

| 术语 | 中文 | 一句话解释 |
|---|---|---|
| Context Engineering | 上下文工程 | 设计「每次请求给模型看什么」的系统方法 |
| Context Assembly | 上下文组装 | 按预算与相关性拼装系统提示/历史/检索内容 |
| Context Compression | 上下文压缩 | 对话历史摘要化以释放窗口空间 |
| Sliding Window | 滑动窗口 | 只保留最近 N 轮对话的简单历史管理 |
| Memory | 记忆 | 跨请求持久化并在未来对话中检索注入的信息体系 |
| Short-term Memory | 短期记忆 | 当前会话内的上下文本身 |
| Long-term Memory | 长期记忆 | 跨会话持久保存的用户/事实信息 |
| Episodic Memory | 情景记忆 | 过往交互经历的记录（「上次我们做过什么」） |
| Semantic Memory | 语义记忆 | 提炼出的事实知识（「用户偏好简洁风格」） |
| Working Memory | 工作记忆 | 单次推理步骤中实际可见的上下文子集 |
| Consolidation | 记忆整理 | 定期从对话中抽取/去重/归档记忆的后台过程 |
| MemGPT | — | 把上下文类比为操作系统虚拟内存的经典论文，Letta 前身 |
| Scratchpad | 草稿区 | 模型/Agent 存放中间推理状态的临时空间 |

## 评测与可观测

| 术语 | 中文 | 一句话解释 |
|---|---|---|
| Eval / Evaluation | 评测 | 用样本集+指标系统地衡量 AI 系统效果 |
| Eval Set / Golden Set | 评测集 | 预先准备的问题+期望答案集合 |
| LLM-as-Judge | 模型评审 | 用强模型给输出打分代替人工评判 |
| Faithfulness | 忠实度 | 回答是否严格基于给定资料（RAG 核心指标） |
| Answer Relevancy | 回答相关性 | 回答与问题的相关程度 |
| Context Precision / Recall | 上下文精确率/召回率 | 检索片段的找准/找全程度 |
| Task Completion Rate | 任务完成率 | Agent 任务评测的第一指标 |
| Trajectory Analysis | 执行轨迹分析 | 复盘 Agent 每步决策以定位失败原因 |
| Failure Attribution | 失败归因 | 判定失败源于模型/上下文/工具/执行系统哪一层 |
| Bad Case | 坏案例 | 系统出错的典型样本，改进与回归的依据 |
| Regression Testing | 回归测试 | 改动后重跑评测集确认没有变差 |
| FakeModel | 假模型 | 按脚本返回预设回复的模型替身，能确定地复现并行调用、坏参数、死循环等失败路径 |
| Offline Regression | 离线回归 | 用 FakeModel 跑、不调真实模型的测试：验证程序逻辑，零成本、可进 CI；效果好坏仍靠真实评测 |
| Baseline | 基线 | 改进前的效果参照，证明提升的依据 |
| A/B Testing | A/B 测试 | 线上分流对比两个版本效果 |
| Trace / Span | 追踪/跨度 | 一次请求全链路的记录及其子步骤 |
| LLM Ops / LLMOps | 大模型运维 | AI 应用的日志、追踪、监控、成本观测体系 |
| Observability | 可观测性 | 从外部输出推断系统内部状态的能力 |
| OTel (OpenTelemetry) | 开放遥测 | 可观测性数据标准，GenAI 语义约定覆盖 LLM 调用 |
| Red Teaming | 红队测试 | 主动攻击自己的 AI 系统找安全漏洞 |

## 工程与部署

| 术语 | 中文 | 一句话解释 |
|---|---|---|
| Model Routing | 模型路由 | 按任务难度/成本把请求分给不同模型 |
| Model Gateway | 模型网关 | 统一接入多家模型的中间层（鉴权/限流/审计/缓存） |
| Token Budget | Token 预算 | 单任务/单用户的 token 花费上限 |
| Batch API | 批处理接口 | 异步批量调用，通常五折 |
| Speculative Decoding | 投机解码 | 小模型打草稿大模型验证的推理加速技术（了解即可） |
| Quantization | 量化 | 降低模型数值精度以省显存（本地部署概念） |
| vLLM | — | 主流开源推理服务框架（部署自托管模型用，了解即可） |
| Docker | 容器 | 应用及其依赖的标准化打包运行 |
| Docker Compose | 编排工具 | 一条命令起多个容器（如 Langfuse + PG + Redis） |
| CI/CD | 持续集成/部署 | 代码合并自动测试、自动发布 |
| Serverless | 无服务器 | 按调用计费的托管执行（Vercel/Cloudflare Functions） |
| Durable Execution | 持久执行 | 步骤级持久化的工作流，天然支持重试与断点恢复 |
| Circuit Breaker | 熔断 | 连续失败或超出预算时停止调用、转降级或人工 |
| Runbook | 运行手册 | 部署、迁移、回滚、密钥轮换与事故处置的操作文档（项目 3 的交付证据之一） |
| Rollback | 回滚 | 新版本出问题时退回上一版（镜像 + 数据库迁移都要有退路） |
| approve-builds | 构建审批 | pnpm 12 默认拦截依赖的构建脚本；`pnpm approve-builds` 把放行记录写进 `pnpm-workspace.yaml`（要提交入库） |
| Environment Variables | 环境变量 | 存放 API Key 等敏感配置的标准方式（`.env` 只在本机/部署平台配置，绝不提交入库） |
| CORS | 跨源资源共享 | 浏览器跨域请求的许可机制 |
| Zod | — | TS 生态的运行时 schema 校验库，结构化输出核心搭档 |

## 安全

| 术语 | 中文 | 一句话解释 |
|---|---|---|
| OWASP LLM Top 10 | — | LLM 应用十大风险清单（2025 版），安全章节的目录 |
| OWASP Agentic Top 10 | — | 2025-12-09 发布的「2026 版 Agent 应用十大风险」（ASI01-ASI10），针对会调工具、带委托权限行动的 Agent |
| Prompt Injection | 提示注入 | 见「Prompt 工程」组；LLM 安全第一风险 |
| Indirect Prompt Injection | 间接注入 | 藏在网页/文档/邮件内容中的注入攻击 |
| Data Leakage / Exfiltration | 数据泄露 | 模型把敏感信息（含系统提示）输出给不当对象 |
| Excessive Agency | 过度代理 | 给了模型超出需要的权限/工具导致风险放大 |
| Least Privilege | 最小权限 | 工具与凭证只授予完成任务所需的最小权限 |
| Default Deny | 默认拒绝 | 没登记权限策略的工具一律拒绝；授权只看代码与会话上下文，不看模型说了什么 |
| Path Traversal | 路径穿越 | 用 `./data/../.env` 这类路径绕过前缀检查；要先 resolve 再判断是否在允许目录内 |
| Threat Model | 威胁模型 | 资产 → 攻击面 → 防线 → 测试用例的一页分析，上线前先写 |
| PII | 个人身份信息 | 需要脱敏处理的敏感个人数据 |
| Allowlist / Denylist | 白名单/黑名单 | 工具调用与输出内容的准入控制 |
| Output Filtering | 输出过滤 | 在返回用户/执行前校验模型输出的关卡 |

## AI 编程工具

| 术语 | 中文 | 一句话解释 |
|---|---|---|
| AI Coding Tools | AI 编程工具 | Claude Code / Cursor / Copilot 等编程助手 |
| Vibe Coding | 氛围编程 | 高度信任 AI 快速原型的开发方式（Andrej Karpathy 2025-02 提出），适合探索不适合生产 |
| Spec-Driven Development (SDD) | 规格驱动开发 | 先写 spec 让 AI 按规格生成并校验的开发方式 |
| Rules | 规则文件 | 给 AI 编程工具的项目级规范（CLAUDE.md/.cursor/rules） |
| Skills (SKILL.md) | 技能文件 | 带元数据说明的可复用指令/脚本包；遵循 Agent Skills 开放标准，启动时只加载描述、用到才加载正文 |
| AGENTS.md | — | 跨工具通用的项目说明文件（AAIF 托管项目）；Cursor、Codex CLI 直接读，Claude Code 在没有 CLAUDE.md 时读 |
| Hooks | 钩子 | Claude Code 里确定性执行的规则（不靠模型判断）；口诀「建议写进 CLAUDE.md，强制交给 hook」 |
| Subagents | 子代理 | 在独立上下文里跑调研/审查等大任务，结果再交回主会话 |
| Progressive Disclosure | 渐进式披露 | Skills 只在需要时加载细节的设计原则 |
| Context Poisoning | 上下文污染 | 无关/错误信息混入上下文导致 AI 产出劣化 |
| Human Review Loop | 人机审查闭环 | AI 生成、人审查验证的交付流程 |

## 岗位与角色（来自 215 岗调研）

| 术语 | 中文 | 一句话解释 |
|---|---|---|
| AI 应用工程师 | — | 把大模型能力做成产品功能的工程师（本教程目标岗位） |
| Agent Runtime / Harness Engineer | 智能体运行时工程师 | 开发 Agent 执行引擎/工具链的岗位，TS 主场 |
| AI Native / Vibe Coder | AI 原生工程师 | 全流程用 AI 交付的工程师文化/岗位 |
| FDE (Forward Deployed Engineer) | 前置部署工程师 | 驻场为客户快速搭建 AI 方案的岗位 |
| AI 效能工程师 | — | 把团队 AI 工作流与工具链做成生产力的岗位 |

---

*本表随教程更新。发现正文有未收录的术语，欢迎补充。*
