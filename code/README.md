# 配套代码（code/）

本目录是教程各章「核心代码」的**可运行参考实现**。正文里的代码块与这里的文件一一对应；正文为讲解会拆段，完整、能编译、有测试的版本以这里为准。

## 三条命令

```bash
pnpm install          # Node ≥ 24 + pnpm 12；构建脚本审批已写在 pnpm-workspace.yaml
pnpm check            # 类型检查 + 全部离线测试（不需要 API key，不花钱）
pnpm ch08             # 真实调用：先 cp .env.example .env 并填 key
```

> 公司电脑若配置了私有 npm 镜像而装不上依赖：`pnpm install --registry=https://registry.npmmirror.com`（国内镜像）或 `--registry=https://registry.npmjs.org`。只对这一次安装生效，不改全局配置。

## 为什么要有离线测试（FakeModel）

真实模型「什么时候犯错」不受你控制：你没法让它恰好返回坏 JSON、恰好并行调用两个工具、恰好陷入死循环。`src/lib/model.ts` 的 `FakeModel` 按脚本返回预设回复，于是每一种失败路径都能**确定地、零成本地**反复验证。

分工：

- **离线测试**：证明「程序逻辑」对——循环会停、坏参数被拦、越权被拒、重试不重复下单
- **真实调用**：证明「模型 + 提示词」好用——这部分靠第 15 章的评测集

两者缺一不可：只有离线测试，不知道真实模型效果；只有真实调用，失败路径永远测不全。

## 文件与章节对照

| 文件 | 章节 | 内容 | 测试 |
|---|---|---|---|
| `src/lib/ai.ts` | 02、07 | `chat()` 封装（重试/取消/用量）、`defineTool`、`toOpenAITools` | 间接 |
| `src/lib/extract.ts` | 04 | `extractJson`、`structured<T>()` 修复循环 | `test/extract.test.ts` |
| `src/lib/model.ts` | 08 | `ChatModel` 端口、`openAIModel()`、`FakeModel`、`callTools/say` | 全部测试都用 |
| `src/tools/index.ts` | 07 | 时间 / 计算 / 订单查询三个示例工具 | `test/tool-loop.test.ts` |
| `src/agent/tool-loop.ts` | 07 | 工具调用六步循环 | `test/tool-loop.test.ts` |
| `src/agent/loop.ts` | 08、18 | Agent Loop：finish 终止、步数/预算/循环检测/超时、并行调用、权限钩子 | `test/agent-loop.test.ts` |
| `src/agent/plan-execute.ts`、`reflexion.ts` | 08 | Plan-and-Execute 与 Reflexion | `test/ch08-papers.test.ts` |
| `src/tools/search.ts` | 11 | `web_search` / `fetch_and_extract`（mock） | `test/orchestrator.test.ts` |
| `src/multi/orchestrator.ts` | 11 | 主从式多 Agent：规划 → 并行 → 部分失败降级 → 成文 | `test/orchestrator.test.ts` |
| `src/multi/hitl.ts` | 11 | 人工审批：权限层拦下 → 挂起 → 裁决 → 幂等执行 | `test/hitl.test.ts` |
| `src/lib/embed.ts` | 12 | `Embedder`、`openAIEmbedder()`（分批）、`fakeEmbedder`、`cosineSim` | `test/rag-embed.test.ts` |
| `src/lib/vectorstore.ts` | 12 | LanceDB：幂等建表、余弦距离、按 id upsert、按角色过滤 | `test/rag-vectorstore.test.ts` |
| `src/rag/chunk.ts`、`parse.ts`、`ingest.ts` | 13 | 中文切块、解析、可重复跑的入库（隔离疑似注入文档） | `test/rag-chunk.test.ts` |
| `src/rag/keyword.ts` | 13 | MiniSearch + 中文分词（Intl.Segmenter）、持久化 | `test/rag-keyword.test.ts` |
| `src/rag/hybrid.ts` | 13 | RRF 融合 + 检索前权限过滤 | `test/rag-hybrid.test.ts` |
| `src/rag/rerank.ts` | 13 | 硅基流动 / Jina / Cohere v2 / Voyage 重排适配器 | `test/rag-rerank.test.ts` |
| `src/rag/answer.ts`、`ask.ts`、`kb.ts` | 13 | 带编号片段回答、引用校验、无证据拒答 | `test/rag-answer.test.ts` |
| `fixtures/` | 13、15 | 11 份测试文档（含冲突、注入、仅 HR 可见）与 20 条评测用例 | `test/rag-eval-cases.test.ts` |
| `src/reliability/ledger.ts` | 17 | 意图日志 + 幂等执行 + 崩溃后核对 | `test/ledger.test.ts` |
| `src/security/permissions.ts` | 18 | 工具权限矩阵、默认拒绝、路径穿越防护 | `test/security.test.ts` |
| `src/demos/*.ts` | 02、07、08、12、13 | 演示脚本（`ch12`/`ingest`/`ch13` 支持 `--offline`，不需要 key） | — |

RAG 演示：`pnpm ingest -- --offline && pnpm ch13 -- --offline` 用假向量离线跑通整条链路；配好 `.env` 里的 `EMBED_*`/`RERANK_*` 后去掉 `--offline` 走真实接口。`pnpm eval:rag` 调用 promptfoo 跑 20 条 RAG 评测（需要真实 key）。

> LanceDB 依赖平台原生包（如 `@lancedb/lancedb-darwin-arm64`）。网络不稳导致安装不完整时，会报 `Cannot find native binding`：删掉 `node_modules` 重新安装即可。

## 自己动手的方式

1. 学到某章，先读正文，再打开对应文件对照。
2. **先改坏再修好**：比如删掉 `agent/loop.ts` 里给每个 `call.id` 回执的那段，跑 `pnpm test` 看哪条测试红了、为什么。
3. 每做一道章末练习，先给它写一条 FakeModel 测试，再写实现（第 06 章「Spec 驱动」的最小版本）。
