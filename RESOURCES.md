# TypeScript AI 应用 / Agent 开发 Resources

> 只收一手、高可信的资料。各章「🔗 延伸阅读」是按章细分的版本；这里是全课程的核心书架。最近核对：2026-11-13。

## Knowledge

- [Docs: Vercel AI SDK](https://ai-sdk.dev/docs)
  本课程主力框架的官方文档，含 v6→v7 迁移指南。Use for: 第 05、10、20 章的 `streamText` / `useChat` / `ToolLoopAgent` / 生成式 UI。
- [Docs: OpenAI API（developers.openai.com）](https://developers.openai.com/)
  Chat Completions 与 Responses API、工具调用、模型与弃用时间表。Use for: 第 02、07 章的消息格式与工具调用规则；换用 GPT-6 系列前必读（工具调用只走 Responses API）。
- [Docs: Claude API（platform.claude.com）](https://platform.claude.com/docs)
  Claude 模型、工具调用、Prompt 缓存、OpenAI 兼容端点的限制。Use for: 第 07、17 章，以及写工具描述的官方建议。
- [Article: "Building Effective Agents" by Anthropic](https://www.anthropic.com/engineering/building-effective-agents)
  工作流与 Agent 的边界、常见编排模式。Use for: 第 08、11 章「什么时候不该用 Agent」。
- [Spec: Model Context Protocol](https://modelcontextprotocol.io/)
  MCP 规范与 TypeScript SDK。Use for: 第 09 章；规范版本更新时先看 changelog。
- [Paper: ReAct（arXiv:2210.03629）](https://arxiv.org/abs/2210.03629)
  一切 Agent 循环的源头。Use for: 第 08 章；面试讲 Agent 原理时引用。
- [Docs: LangGraph.js](https://docs.langchain.com/oss/javascript/langgraph/overview)
  持久化图编排、`interrupt()` / `Command` 人工审批、checkpointer。Use for: 第 10、22 章。
- [Docs: Zod](https://zod.dev/)
  运行时校验与 `z.toJSONSchema()`。Use for: 第 04、07 章的「输出契约」。
- [Docs: promptfoo](https://www.promptfoo.dev/docs/intro/)
  评测、RAG 断言、红队测试。Use for: 第 13、15、18 章；也是 OpenAI 官方给出的 Evals 迁移路径。
- [Docs: Langfuse](https://langfuse.com/docs)
  LLM 可观测性与自部署。Use for: 第 16 章；注意 OTel 版本锁定。
- [Standard: OWASP GenAI Security Project](https://genai.owasp.org/)
  LLM Top 10（2025）与 Agentic Applications Top 10（2026）。Use for: 第 18 章威胁建模与上线前安全清单。
- [Article: "Contextual Retrieval" by Anthropic](https://www.anthropic.com/news/contextual-retrieval)
  上下文化切块 + BM25 + 重排对检索失败率的影响。Use for: 第 13 章 RAG 优化路线。
- [Docs: DeepSeek API](https://api-docs.deepseek.com/zh-cn/)
  课程默认练习模型的接口与分时价格。Use for: 第 02 章环境配置与成本控制。
- [Docs: LanceDB](https://lancedb.com/docs/)
  嵌入式向量库（TS SDK）。Use for: 第 12 章。

## Wisdom (Communities)

- [GitHub Discussions: vercel/ai](https://github.com/vercel/ai/discussions)
  AI SDK 维护者会直接回答。Use for: 流式 UI、工具调用、版本迁移的具体问题。
- [GitHub Discussions: modelcontextprotocol](https://github.com/orgs/modelcontextprotocol/discussions)
  MCP 规范与 SDK 的官方讨论区。Use for: 规范细节、SDK 用法、提案动向。
- [V2EX](https://www.v2ex.com/)
  中文开发者社区，活跃的 AI / 求职讨论。Use for: 作品集反馈、岗位与面试信息、踩坑交流。
- 你自己的 GitHub 仓库 + 一篇踩坑博客
  每个项目公开代码和评测报告，就是最直接的外部反馈渠道。Use for: 让同行和面试官检验你的作品。

## Gaps

- OWASP Agentic Top 10（2026）各条目的官方原文只以 PDF 提供，课程里的条目名称需要对照 PDF 核实。
- 中文的高质量、强管理的 AI 工程社区较少；如果你找到一个好的，补充到这里。
