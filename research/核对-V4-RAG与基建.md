# 核对 V4 · RAG 篇（12/13 章）+ 上下文/记忆章（14 章）+ 可靠性章（17 章）

- **核对日期**：2026-10-11
- **方法**：WebFetch 官方一手来源（文档站 / npm registry / GitHub 源码 / 官方 API）；部分被墙或反爬站点（platform.openai.com、platform.claude.com、ai.google.dev）在本环境不可达，相关项已标注。
- **当前 npm 版本快照**（registry.npmjs.org，2026-10-11）：`inngest@4.23.0`、`marked@18.1.0`、`@lancedb/lancedb@0.40.0`、`pdf-parse@2.4.5`、`minisearch@7.2.0`、`@langchain/textsplitters@1.0.2`、`@qdrant/js-client-rest@1.19.0`、`@upstash/redis@1.39.0`、`cheerio@1.2.0`、`@mastra/rag@2.6.6`。

---

## 一、第 12 章 · Embedding 与向量数据库

### 1.1 硅基流动 Embedding API（12.2）

> 教程原文：「`client.embeddings.create({ model: EMBED_MODEL, input: batch })`」「硅基流动 `BAAI/bge-m3`｜1024 维｜**免费**（限速）｜8192 token 输入」

**✅ 端点与请求体**：`POST https://api.siliconflow.cn/v1/embeddings`，必填 `model`、`input`（string 或数组）。文档另有可选参数 `encoding_format`（float/base64）、`user`、`truncate`（left/right）；`dimensions` 参数**仅 Qwen/Qwen3 系支持**——bge-m3 不支持传 dimensions，固定输出原生 1024 维（教程未传，正确）。
**✅ 8192 输入**：官方文档模型上限表列明「BAAI/bge-m3, Pro/BAAI/bge-m3: 8192」。
**✅ 1024 维**：BAAI/bge-m3 模型仓库 config.json `hidden_size: 1024`（xlm-roberta 架构）。
**⚠️ 「免费」未获官方文档直证**：docs.siliconflow.cn 的 API 文档页不含定价信息，模型广场（cloud.siliconflow.cn/models?types=embeddings）为 JS 应用本轮无法抓取。R3 已核实过，建议人工复核一次并在教程注明「以模型广场标注为准」。
- 来源：https://docs.siliconflow.cn/docs/api/embeddings-post ｜ https://huggingface.co/BAAI/bge-m3/raw/main/config.json

### 1.2 OpenAI embeddings（12.2 表）

> 教程原文：「`text-embedding-3-small`｜1536｜$0.02/1M」「`text-embedding-3-large`｜3072｜$0.13/1M」

**✅ 维度/上限/参数**（Microsoft Learn 官方模型表，一手来源）：
| 模型 | Max request (tokens) | 输出维度 |
|---|---|---|
| text-embedding-3-small | 8,192 | 1,536 |
| text-embedding-3-large | 8,192 | 3,072 |

`dimensions` 降维参数（MRL）官方支持 ✅。教程写「8191 token 上限」：OpenAI 官方文档口径为 8,191，Azure 表写 8,192（口径差 1，均可接受，教程与 OpenAI 主站一致）。
**⚠️ 价格数字本轮未能直连复核**：platform.openai.com 返回 403、Azure 定价页价格为 JS 渲染占位（"$-"）。$0.02/$0.13 与 2024-01 官方公告及 R2 核实一致，建议人工在 platform.openai.com/docs/pricing 再确认一次。
- 来源：https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models（Embeddings 节）｜ https://platform.openai.com/docs/guides/embeddings（403，待人工）

### 1.3 LanceDB（12.4）

> 教程原文：`import * as lancedb from "@lancedb/lancedb"`、`await lancedb.connect(path)`、`db.createTable("chunks", data, { mode: "overwrite" })`、`table.search(qv).select(["id","text","source","_distance"]).limit(topK).toArray()`、`.where()`、peer 依赖 apache-arrow、「内置全文检索（BM25）与混合检索」

**全部 ✅**：
- `import * as lancedb from "@lancedb/lancedb"` 与 `await lancedb.connect(uri)`（本地目录 / `s3://` / `gs://` / `az://`）——quickstart 原文一致；
- `db.createTable("characters", data, { mode: "overwrite" })` ✅；
- `table.search(queryVector).select(["name","role","description","_distance"]).limit(2).toArray()` ✅，`_distance` 为可投影计算列 ✅；
- `.where("stats.magic >= 4")` 元数据过滤 ✅；
- **apache-arrow 确为 peerDependency**（package.json：`"apache-arrow": ">=15.0.0 <=18.1.0"`，另有 `@types/node >= 22`）——教程显式 `pnpm add @lancedb/lancedb apache-arrow` 正确且必要 ✅；
- 内置 FTS：官方文档「LanceDB provides support for Full-Text Search via Lance, allowing you to incorporate keyword-based search (based on BM25)」；TS 写法：`await tbl.createIndex("text", { config: lancedb.Index.fts() })` + `tbl.search("puppy", "fts")`（注意第二个参数是 `"fts"`，不是 `queryType("fts")`）✅；hybrid search 有专页 ✅。
- 来源：https://docs.lancedb.com/quickstart.md ｜ https://docs.lancedb.com/search/full-text-search.md ｜ https://registry.npmjs.org/@lancedb%2Flancedb/latest

### 1.4 Drizzle + pgvector（12.5）

> 教程原文：`vector("embedding", { dimensions: 1024 })`、`index("embeddingIdx").using("hnsw", t.embedding.op("vector_cosine_ops"))`、`sql`模板 + `cosineDistance`、`gt(similarity, 0.5)`、「`CREATE EXTENSION vector;` 要手写迁移——Drizzle 不代建」

**全部 ✅**（与官方指南逐项一致）：官方指南用 `dimensions: 1536`（教程 1024 对应 bge-m3，属正确换用）；索引官方示例名 `embeddingIndex`、教程 `embeddingIdx`（无碍）；`sql<number>\`1 - (${cosineDistance(t.embedding, qv)})\`` 原式一致；扩展创建官方原文「Drizzle doesn't create extension automatically」→ `npx drizzle-kit generate --custom` 生成空迁移后手写 `CREATE EXTENSION vector;` ✅。
- 来源：https://orm.drizzle.team/learn/guides/vector-similarity-search

### 1.5 Qdrant（12.6）

> 教程原文：`@qdrant/js-client-rest`、`new QdrantClient({ host, port: 6333 })`、`client.query("chunks", { prefetch: [...], query: { rrf: {} }, limit: 10 })`、「稀疏向量可由 bge-m3 的 sparse 输出提供」

**全部 ✅**：
- 包名与 `new QdrantClient({ host: '127.0.0.1', port: 6333 })`（或 `{url}`）——README 原文一致；
- `query(collection_name, { prefetch, query, using, limit, filter, ... })`、`createCollection(collection_name, {...})`、`upsert(collection_name, {...})`——1.19.0 类型定义逐一确认；
- 混合检索 REST/TS 形态：`prefetch` 数组（`"using": "sparse"` / `"using": "dense"` 各带 `limit`）+ 顶层 `query: { "rrf": {} }` + 最终 `limit`——官方文档一致；
- BGE-M3 官方仓库：「Multi-Functionality(dense retrieval, sparse retrieval, multi-vector(colbert))」——sparse 输出说法成立 ✅。
- 来源：https://cdn.jsdelivr.net/npm/@qdrant/js-client-rest@1.19.0/dist/types/qdrant-client.d.ts ｜ https://qdrant.tech/documentation/concepts/hybrid-queries/ ｜ https://raw.githubusercontent.com/FlagOpen/FlagEmbedding/master/README.md

### 1.6 MiniSearch（12.常见坑1 / 13.4）

> 教程原文：「BM25 用 minisearch（**类 BM25 打分**）」「`new MiniSearch({fields, storeFields})`、`addAll`、`search()` 返回含 id/score」

**✅（且比教程表述更「名副其实」）**：README 不自述算法（只说 "Modern search result ranking algorithm"），但 v7.2.0 源码实证使用 **BM25 变体**（`calcBM25Score`）：
```js
const defaultBM25params = { k: 1.2, b: 0.7, d: 0.5 };
// invDocFreq = Math.log(1 + (totalCount - matchingCount + 0.5) / (matchingCount + 0.5))
// score = invDocFreq * (d + tf*(k+1)/(tf + k*(1 - b + b*fieldLength/avgFieldLength)))
```
即 BM25 主体 + BM25L 式 `d` 偏移、`b=0.7`（非教科书 0.75）——教程「类 BM25 而非教科书 BM25」**准确**。构造器/addAll/结果含 `id`/`score`（及 storeFields、match）均与 README 一致 ✅。
- 来源：https://cdn.jsdelivr.net/npm/minisearch/dist/es/index.js ｜ README（jsdelivr 镜像）

### 1.7 RRF 公式与 k 值（13.4，与 Qdrant 对齐）

> 教程原文：「每榜按名次贡献 1/(k+rank)」「`rrf(rankLists, k = 60, topN = 10)`」「与 Qdrant 服务端同一公式」

**✅ 公式与零基名次**：Qdrant 文档公式 `score(d) = Σ 1/(k + r_d)`，并明确「zero-based rank positions; the top result has r_d = 0」——教程 `list.forEach((id, rank) => 1/(k+rank))` 索引从 0 起，**完全一致**。
**⚠️ k 的默认值**：Qdrant 服务端 RRF **默认 k = 2**（文档原文「$k$ is a constant (set to 2 by default)」）；k=60 出现在 Qdrant 文档的**示例**（`"rrf": {"k": 60}`，v1.16.0 起可参数化），也是 RRF 原论文（Cormack 2009）与 Elasticsearch 的经典值。教程自定函数默认 k=60 没问题，「同一公式」的说法成立，但建议加一句注：「Qdrant 服务端默认 k=2（可用 rrf:{k} 覆盖）；60 是原论文/ES 经典值」——防止读者误以为 Qdrant 默认就是 60。
- 来源：https://qdrant.tech/documentation/concepts/hybrid-queries/

### 1.8 Upstash Vector / Chroma（12.6 表）

> 教程原文：「Upstash Vector｜serverless｜元数据过滤｜免费层 10K 请求/天」「Chroma JS 无嵌入式（Python 独占）」

**✅ Upstash Vector 免费层**："10K" daily query/update、1 GB 数据、1536 维上限——官方定价页一致。
**⚠️ Chroma**：JS 客户端仅 HTTP server 模式、嵌入式为 Python 独占——与官方文档长期一致，本轮未在线复核（常识项，建议保留并补官方链接）。
- 来源：https://upstash.com/pricing/vector

### 1.9 阿里百炼 text-embedding-v4 ¥0.5/1M（12.2 表）

**未核对**（不在任务清单；help.aliyun.com 本轮未抓取）。标注：此行为 R3 遗留数据，建议下一轮补核。

---

## 二、第 13 章 · RAG 全链路实战

### 2.1 pdf-parse v2（13.2）

> 教程原文：`import { PDFParse } from "pdf-parse"`（v2 类 API）、`new PDFParse({ data: buffer })`、`await parser.getText()`→`result.pages` 每页 `{text, num}`、`await parser.destroy()`、「Node ≥ 20.16」

**全部 ✅**（v2.4.5）：
- 导入与构造：README 原文 `import { PDFParse } from 'pdf-parse'`、`new PDFParse({ data: buffer })`；
- **`.pages` 结构经类型定义实证**：`TextResult { pages: Array<PageTextResult>; text: string; total: number; getPageText(num) }`，其中 `interface PageTextResult { num: number; text: string }` ——教程 `result.pages.map((p) => p.text)` 正确（README 正文只展示了 `.text`，`.pages` 是合法字段）；
- `destroy()`：README「Always call destroy() to free memory」✅；
- Node 版本：package.json `engines: ">=20.16.0 <21 || >=22.3.0"` ——「Node ≥ 20.16」✅（注意 20.x 需 ≥20.16，21.x 不支持）。
- 来源：https://unpkg.com/pdf-parse/README.md ｜ https://cdn.jsdelivr.net/npm/pdf-parse@2.4.5/dist/pdf-parse/esm/TextResult.d.ts ｜ https://unpkg.com/pdf-parse/package.json

### 2.2 marked.parse 的同步/异步 ❌（本章唯一硬伤）

> 教程原文：`return marked.parse(raw).then(async (html) => (await import("cheerio")).load(html).text())`

**❌ 运行时必然崩溃**：marked 的 `async` 选项默认 `false`，`marked.parse(raw)` 不传选项时**同步返回 HTML 字符串**（string 无 `.then`，直接 TypeError）。TS 层面也过不了：当前 marked（v18.1.0）`.d.ts` 三重载——`async:true` → `Promise<string>`；`async:false` → `string`；不传 → `string | Promise<string>`（联合类型上调用 `.then` 报错）。
**正确写法（二选一）**：
```ts
// A. 显式异步
return marked.parse(raw, { async: true })
  .then(async (html) => (await import("cheerio")).load(html).text());
// B. 同步（更简单，marked 默认就是同步）
const html = marked.parse(raw) as string;
return (await import("cheerio")).load(html).text();
```
- 来源：https://marked.js.org/using_advanced（"If true ... marked.parse will return a promise"；默认 false） ｜ https://unpkg.com/marked/lib/marked.d.ts

### 2.3 @langchain/textsplitters（13.3）

> 教程原文：`new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 })`、`await splitter.splitText(cleanText)`、「LangChain.js 的 textsplitters 包没有 SemanticChunker——那是 Python 生态的能力」

**全部 ✅**：包（npm 1.0.2）导出且仅导出 6 个类：`TextSplitter`、`CharacterTextSplitter`、`RecursiveCharacterTextSplitter`、`TokenTextSplitter`、`MarkdownTextSplitter`、`LatexTextSplitter` —— **确无 SemanticChunker**（Python 侧在 langchain-experimental）。参数名 `chunkSize`/`chunkOverlap` 与 `splitText` 方法正确。
- 来源：https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-textsplitters/src/text_splitter.ts ｜ https://registry.npmjs.org/@langchain%2Ftextsplitters/latest

### 2.4 Rerank 三家（13.5）

> 教程原文：请求体 `{ model: "BAAI/bge-reranker-v2-m3", query, documents, top_n, return_documents: true }`；表：硅基流动免费｜Cohere rerank-v3.5 ~$2/千次搜索（另有 4.0 系）｜Voyage rerank-3 $0.05/1M tokens

- **硅基流动 ✅（免费标注除外）**：端点 `POST https://api.siliconflow.cn/v1/rerank`；文本模式请求体 `model`（示例即 "BAAI/bge-reranker-v2-m3"）、`query`、`documents`、`top_n`、`return_documents`（默认 false）全对；另有 `max_chunks_per_doc`（默认 1024，适用 bge-reranker）等可选参。响应 `results[{index, relevance_score, ...}]` 与教程解构一致。「免费」同 1.1 的 ⚠️（模型广场复核）。来源：https://docs.siliconflow.cn/docs/api/rerank-post
- **Cohere ⚠️**：Rerank 4 系（Fast/Pro）与 3.5 并存——教程「另有 4.0 系」✅；「search unit = 一次查询 + 最多 100 文档」的计费单位官方定义属实；但 **~$2/千次 的单价当前官方 pricing 页已不直接列出**（页面只给 Model Vault 专属实例价 $5/hour 起）。建议把「~$2/千次」改为「按 search unit 计费（1 unit = 1 query + ≤100 docs），serverless 单价以官网为准」。来源：https://cohere.com/pricing
- **Voyage ✅**：rerank-3 **$0.05/1M tokens**（官方定价页原文，并给出估算 ~$0.0025/请求）；顺带核实 12.2 表 voyage-4-lite **$0.02/1M** ✅、「200M token 免费额度」✅（"The first 200 million tokens"）。来源：https://docs.voyageai.com/docs/pricing

### 2.5 promptfoo 断言（13.8）

> 教程原文：`type: contains` / `type: context-recall` / `type: context-faithfulness`

**✅**：官方断言文档确有 `context-recall`（ground truth 出现在上下文）、`context-faithfulness`（输出忠实于上下文），另有 `context-relevance`；默认阈值 0.5。教程 YAML 用法成立。
- 来源：https://www.promptfoo.dev/docs/configuration/expected-outputs/

### 2.6 其余（13.1/13.6/13.7/13.9）

自写代码与概念（RRF 手写见 1.7；注入模板/进阶路线为通用知识），无外部 API 事实，未发现错误。13.8 表中「忠实度 0.71→0.83」等教程已自标「示例格式」，无事实问题。

---

## 三、第 14 章 · 上下文工程与记忆系统

### 3.1 MemGPT（14.5）

> 教程原文：「**MemGPT**（arXiv:2310.08560，Letta 前身）……把上下文窗口当作操作系统的虚拟内存」

**✅**：arXiv:2310.08560 存在，论文《MemGPT: Towards LLMs as Operating Systems》，作者 Charles Packer, Sarah Wooders, Kevin Lin, Vivian Fang, Shishir G. Patil, Ion Stoica, Joseph E. Gonzalez；主旨即「LLM 作为操作系统 / 上下文=虚拟内存」。
- 来源：https://arxiv.org/abs/2310.08560

### 3.2 Anthropic 工程博客（延伸阅读）

> 教程原文：「Anthropic《Effective context engineering for AI agents》（官方长文……）」

**✅**：文章存在，2025-09-29 发布于 anthropic.com/engineering，标题一字不差，开篇「Context is a critical but finite resource for AI agents...」。
- 来源：https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

### 3.3 Mastra Memory（14.5）

> 教程原文：「`new Memory({ options: { lastMessages: 20 } })` 起步，内置观察式记忆/工作记忆/语义回忆」

**未核对**（不在任务清单；本轮未抓 mastra.ai）。标注待下一轮（@mastra/rag 2.6.6 在 npm 存在已确认）。

其余为自写代码与 JD/概念引用，无外部 API 事实。

---

## 四、第 17 章 · 可靠性与成本工程

### 4.1 Inngest（17.2）

> 教程原文：`new Inngest({ id: "ai-app" })`；`inngest.createFunction({ id, retries: 2 }, { event: "app/research.requested" }, handler)`；`step.run("plan", fn)`；`await step.sleep("1h")`；「免费层 5 万次执行/月、开源可自托管」

- **`new Inngest({ id })` ✅**：v4 官方参考原文同款（推荐单例导出）。
- **`inngest.createFunction` ⚠️（版本敏感，需处理）**：教程三参写法 `(options, trigger, handler)` 与 **v3 SDK** 参考完全一致 ✅；但 **npm latest 已是 4.23.0（v4）**，v4 签名改为 `createFunction(configuration, handler)` **两参**，`triggers: { event: ... }` 移入 configuration（retries 仍在 configuration，默认 4、0-20）。按教程直接 `npm i inngest` 装到 v4 时代码不匹配。**修改二选一**：① 教程注明使用 `inngest@^3`；② 改为 v4 写法 `inngest.createFunction({ id: "...", triggers: { event: "app/research.requested" }, retries: 2 }, handler)`。
- **`step.sleep("1h")` ❌**：v3 与 v4 均要求 **两参 `(id, duration)`**——官方示例 `await step.sleep("wait-with-string", "30m")`。单参 `step.sleep("30m")` 是 **v2 旧语法**。正确写法：`await step.sleep("wait", "1h")`。
- **`step.run(name, fn)` ✅**：v3/v4 一致；「自动重试/记忆化/断点恢复」三件套与官方 durable execution 文档一致 ✅。
- **`inngest.send()` ✅**：`await inngest.send({ name: "app/post.created", data: {...} })`（支持数组），返回 `{ ids }`。
- **免费层 ✅（注意计量口径）**：Free 档 "50k executions" / 月、5 并发 step、500k 事件、30 天最长 run。官方 FAQ 明确「execution 按 function run + 每个 step 各计 1 次」（5 个 step 的函数跑一次 = 6 executions）——教程「5 万次执行」措辞正确，但建议加注计量口径，避免读者以为 5 万次函数调用。
- **「开源可自托管」⚠️**：官方仓库 README：server/CLI 为 **SSPL + 延迟开源（DOSP，Apache 2.0）**，SDK 为 Apache 2.0；生产自托管受支持（"Self-hosting the Inngest server is possible and easy to get started with"）。更准确表述：「源码可得（SSPL/延迟 Apache-2.0）、支持生产自托管；SDK Apache-2.0」。
- 来源：https://www.inngest.com/pricing ｜ https://www.inngest.com/docs-markdown/reference/typescript/v3/functions/create ｜ https://www.inngest.com/docs-markdown/reference/typescript/v3/functions/step-sleep ｜ https://www.inngest.com/docs-markdown/reference/typescript/v4/functions/create ｜ https://www.inngest.com/docs-markdown/reference/typescript/v4/client/create ｜ https://www.inngest.com/docs-markdown/reference/typescript/v4/events/send ｜ https://raw.githubusercontent.com/inngest/inngest/main/README.md ｜ https://registry.npmjs.org/inngest/latest

### 4.2 Trigger.dev（17.2）

> 教程原文：「Trigger.dev（v4）是对位选项（免费层 $5/月额度；内置 durable chat agent）」

**✅**：当前大版本 v4（changelog 最新 v4.7.3）；Free 档 "$5 / month free credits"（Hobby 档 $10/月）；durable execution 官方文案（"Tasks have no timeouts and survive crashes via durable execution"）。「内置 durable chat agent」对应其 AI agent 原语（chat/durable AI），方向属实，未逐字核对。
- 来源：https://trigger.dev/pricing

### 4.3 DeepSeek 价格（17.2 CHAIN / 17.3 开头与板斧二）

> 教程原文：「DeepSeek flash 输入 ¥1/输出 ¥2，缓存命中输入 ¥0.02」「DeepSeek 命中输入 ¥0.02/M（未命中 ¥1）」「deepseek-flash ¥1/¥2：日常对话主力」

**❌ 输出价写错，其余 ✅**。官方中文定价页（每百万 token，人民币）：
| 模型 | 输入·命中 | 输入·未命中 | 输出 |
|---|---|---|---|
| deepseek-flash（=V4.1-Flash） | ¥0.02（错峰）/¥0.04（高峰） | ¥1 / ¥2 | **¥4 / ¥8** |
| deepseek-v4-pro | ¥0.15 / ¥0.30 | ¥4.5 / ¥9.0 | ¥13.5 / ¥27.0 |

- 缓存命中 **¥0.02** ✅（错峰值）；未命中 **¥1** ✅（错峰值）；**输出 ¥2 ❌ —— 实际 ¥4（错峰）/¥8（高峰）**。教程的「¥2」疑似与「高峰未命中输入 ¥2」混淆。17.2 降级链表「deepseek-flash 便宜快速」与 17.3 路由表「¥1/¥2」中的输出价均需改。建议统一标注错峰/高峰口径（错峰=高峰半价；高峰为北京时间工作日 9:00-12:00、14:00-18:00）。
- 模型名 ✅：现行 API 模型就是 `deepseek-flash` 与 `deepseek-v4-pro`（deepseek-chat/reasoner 已不在列，旧名 deepseek-v4-flash 仍被接受）。教程用的两个名字都对。
- 来源：https://api-docs.deepseek.com/zh-cn/quick_start/pricing ｜ https://api-docs.deepseek.com/quick_start/pricing（USD 对照）

### 4.4 GLM-4.7-Flash 免费（17.2 降级链 / 路由表）

> 教程原文：`glm-4.7-flash`「降级：免费兜底」「免费：分类杀鸡不用牛刀」

**✅**：智谱官方文档模型总览列 GLM-4.7-Flash 为「免费文本模型 延续 GLM-4.7 基座的通用能力」（同页还有 GLM-4.5-Flash、GLM-4-Flash-250414 等免费模型）。
- 来源：https://docs.bigmodel.cn/cn/guide/start/model-overview

### 4.5 GPT-5.2 $1.75/$14、Claude Sonnet 5 $2/$10、Gemini 3.8 Flash 促销 $0.75/$3.75

**本轮未能复核（网络受限）**：platform.openai.com 403、platform.claude.com 307 区域重定向、ai.google.dev 连接超时。任务说明这三个为 R2 已核实项、抽查即可——本轮抽查落在 DeepSeek（发现 1 处错误，见 4.3）、GLM（通过）、Cohere/Voyage（通过）。这三个价格维持 R2 结论，建议下轮网络恢复后补一次抽查。
- 待复核：https://platform.openai.com/docs/pricing ｜ https://platform.claude.com/docs/en/about-claude/pricing ｜ https://ai.google.dev/gemini-api/docs/pricing

### 4.6 Upstash Redis（任务清单项）

> 任务单事实：`new Redis({url, token})`、免费层 250MB / 500K 命令每月

**✅ 事实正确**：README 原文 `const redis = new Redis({ url: <UPSTASH_REDIS_REST_URL>, token: <UPSTASH_REDIS_REST_TOKEN> })`，示例 `await redis.set('key','value')` / `redis.get`；官方定价页 Free 档：**250 MB** 数据、**500K commands/月**（1 万 cmd/s 上限）、10 GB 带宽/月。
**注**：本四章正文未出现 Upstash Redis 代码（12 章表中的是 Upstash Vector，见 1.8）——该事实供其他章节复用。
- 来源：https://raw.githubusercontent.com/upstash/upstash-redis/master/README.md ｜ https://upstash.com/pricing/redis

### 4.7 Cloudflare AI Gateway（17.3 板斧四）

> 教程原文：「直接用 Cloudflare AI Gateway 的免费响应缓存」

- **OpenAI 兼容端点 ✅**：官方格式 `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/{provider}`（例：`/v1/abc123/default/openai`，保留原厂 API schema）；另有 OpenAI-SDK 兼容 REST：`https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions`。
- **「免费」⚠️**：overview 页只写 "Available on all plans"，未在本轮抓到的页面中明示「分析/缓存/限流免费」；教程如强调「免费响应缓存」，建议人工复核 caching / rate-limiting 子页的计费说明后再定措辞（或改为「各计划可用的响应缓存」）。
- 来源：https://developers.cloudflare.com/ai-gateway/ ｜ https://developers.cloudflare.com/ai-gateway/get-started/connecting-applications/

### 4.8 withTimeout / 幂等（17.1）

按任务单跳过（通用知识，Promise.race 模式与幂等键概念无误）。

### 4.9 Batch API「普遍五折」（17.3 板斧四）

**未核对**（OpenAI/Anthropic Batch 半价为长期事实，不在任务清单）。标注：R2 已含，本轮未复核。

### 4.10 chatWithFallback 代码（17.1）

> `return await chat({ ...opts, messages: opts.messages }); // 实际实现需支持按项换 model`

教程已自注未传 `model`——非事实错误，但作为可运行教程建议补 `model`（或给出最终版实现）。

---

## 五、需修改清单（按优先级）

| # | 位置 | 问题 | 修改建议 |
|---|---|---|---|
| 1 | 13.2 parseMarkdown | ❌ `marked.parse(raw).then(...)` 运行时崩溃（默认同步返回 string，`.then` 不存在） | 改 `marked.parse(raw, { async: true }).then(...)` 或按同步处理：`const html = marked.parse(raw) as string` |
| 2 | 17.2 Inngest 示例 | ❌ `await step.sleep("1h")` 单参是 v2 旧语法，v3/v4 均要求 `(id, duration)` | 改 `await step.sleep("wait", "1h")` |
| 3 | 17.2 Inngest 示例 | ⚠️ `createFunction(fnOptions, trigger, handler)` 三参是 v3 写法；npm latest 已是 v4（4.23.0，两参、triggers 入 config） | 二选一：注明/锁定 `inngest@^3`；或改 v4 写法 `createFunction({ id, triggers: { event }, retries }, handler)` |
| 4 | 17.2 CHAIN 注释、17.3 路由表与开头 | ❌ DeepSeek flash「输出 ¥2」——官方输出为 ¥4（错峰）/¥8（高峰）；¥2 是高峰未命中输入价 | 输出改 ¥4（建议统一标注错峰口径：错峰=高峰半价） |
| 5 | 12.6 / 13.4 | ⚠️ RRF「与 Qdrant 同一公式」成立，但 Qdrant 服务端默认 **k=2**（60 是文档示例/原论文经典值） | 13.4 加注：「Qdrant 默认 k=2，可 `rrf:{k}` 覆盖；本文 k=60 取原论文/ES 经典值」 |
| 6 | 17.2 | ⚠️「开源可自托管」不够精确（server/CLI 为 SSPL + 延迟 Apache-2.0/DOSP） | 改「源码可得（SSPL，逐步转 Apache-2.0），支持生产自托管；SDK Apache-2.0」 |
| 7 | 17.3 板斧四 | ⚠️「Cloudflare AI Gateway 的免费响应缓存」——overview 仅 "Available on all plans" | 人工复核 caching 子页后定措辞；暂改「AI Gateway 的响应缓存（各计划可用）」并给出兼容端点格式 |
| 8 | 12.2 / 13.5 表 | ⚠️ 硅基流动 bge-m3、bge-reranker-v2-m3「免费」无官方文档直证（API 文档不含定价） | 注明来源为模型广场（cloud.siliconflow.cn），建议人工复核一次 |
| 9 | 13.5 表 | ⚠️ Cohere「~$2/千次搜索」当前官方 pricing 页已不列按次单价（只有 Model Vault 实例价） | 改「按 search unit 计费（1 unit = 1 query ≤100 docs），单价以官网为准」 |
| 10 | 12.2 表 | ⚠️ OpenAI embedding $0.02/$0.13 本轮 403 未直核（维度/token/dimensions 已由 Microsoft Learn 核实） | 人工在 platform.openai.com/docs/pricing 复核一次 |
| 11 | 17.2 免费层 | 补注 Inngest 计量口径：execution = 函数运行 + 每个 step 各计 1 | 一句话即可 |
| 12 | 17.1 chatWithFallback | 代码未传 `model`（教程已自注） | 补上 `model` 参数成为可运行版 |

**未核对/待下轮**：GPT-5.2、Claude Sonnet 5、Gemini 3.8 Flash 价格（R2 已核，本轮网络不可达）；阿里百炼 text-embedding-v4 ¥0.5/1M；Mastra Memory 构造器与三种记忆；Batch API 半价；Chroma JS 仅 HTTP 模式（常识正确，补官方链接即可）。

**整体结论**：四章的事实密度很高，绝大部分包名、API 形态、端点、请求体、免费层额度与官方一手来源逐字吻合（LanceDB/Drizzle/Qdrant/pdf-parse/textsplitters/MiniSearch/promptfoo/Upstash/Voyage/GLM/Anthropic 博文/MemGPT 全部通过）。硬错误 2 处（marked `.then()`、`step.sleep` 单参）、价格错误 1 处（DeepSeek 输出价）、版本敏感 1 处（Inngest v3→v4 签名迁移），均已在清单中给出改法。
