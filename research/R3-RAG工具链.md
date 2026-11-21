# R3 调研报告：纯 TypeScript 的 RAG 全链路工具链

> 调研日期：2026-10-11。所有结论均经联网核实（官方文档 / GitHub / npm registry 一手来源优先），每条关键结论附来源 URL。npm 周下载量与包版本号来自 registry.npmjs.org / api.npmjs.org 当日数据。
>
> 核实状态标注说明：
> - ✅ = 官方一手来源（官方文档/官方 npm registry）直接核实
> - ⚠️ = 来自第三方汇总或搜索快照，未能直连官方页面核实（原因见文末「核实方法与局限」）

---

## 0. 教程推荐路线（先给结论）

```
【入门章节】 零部署起步
  解析: unpdf 或 pdf-parse(v2) + marked/cheerio
  切片: @langchain/textsplitters 的 RecursiveCharacterTextSplitter（1000/200 起步）
  向量: OpenAI text-embedding-3-small（海外）/ 硅基流动 BAAI/bge-m3 免费（国内）
  库:   LanceDB（@lancedb/lancedb，嵌入式，npm install 即用，无需服务）
  检索: 余弦相似 topK → 直接拼 Prompt

【进阶章节】 关键词 + 混合检索
  BM25: minisearch（3.6M 周下载，零依赖）或 @orama/orama（BM25+向量一步到位）
  融合: RRF（Reciprocal Rank Fusion）—— 纯 TS 约 20 行手写，或用 Qdrant 服务端 RRF

【生产章节】 服务化部署
  库:   Qdrant（@qdrant/js-client-rest，Docker 一键起，服务端 RRF 混合检索）
  或:   pgvector + Drizzle ORM（已有 PostgreSQL 的团队）
  Rerank: Cohere rerank-v3.5（海外）/ 硅基流动 BAAI/bge-reranker-v2-m3 免费（国内）
  参考框架: LangChain.js（教程主线）、Mastra（RAG 中间件化）、LlamaIndex.TS（备选）
```

**选型理由速记：**
- 入门选 **LanceDB**：嵌入式零部署（NAPI 原生绑定，非 WASM 玩具），Node ≥ 18，Windows/macOS/Linux 全支持，`npm install @lancedb/lancedb` 后 `connect()` 即有向量检索，教程读者不需要 Docker。✅ https://docs.lancedb.com/quickstart.md
- 已有 Postgres 的读者走 **pgvector + Drizzle**：SQL 生态、事务、备份全部复用；Drizzle 对 pgvector 有官方指南级支持。✅ https://orm.drizzle.team/learn/guides/vector-similarity-search
- 生产选 **Qdrant**：唯一在 JS 客户端上完整暴露「稠密+稀疏向量 prefetch + 服务端 RRF/DBSF 融合」的独立向量库，混合检索不需要自己写融合层。✅ https://qdrant.tech/documentation/concepts/hybrid-queries/
- Rerank 选 **Cohere**（质量标杆，但按次计费 $2/千次搜索）或 **硅基流动 bge-reranker-v2-m3**（免费，国内可达，OpenAI 风格 REST）。

---

## 1. Embedding API（Node.js 直接 REST 调用）

### 1.1 OpenAI ✅

| 项 | 值 |
|---|---|
| 模型 | `text-embedding-3-small`（1536 维，$0.02/1M tokens）、`text-embedding-3-large`（3072 维，$0.13/1M tokens） |
| 维度缩减 | 支持 MRL：请求里传 `dimensions` 参数可降维（如 1536→256），价格不变 |
| 最大输入 | 8192 tokens/条 |
| API 格式 | `POST https://api.openai.com/v1/embeddings`，参数：`input`（string 或 string[]）、`model`、`dimensions`、`encoding_format`（float/base64）；与官方 `openai` npm 包 `client.embeddings.create()` 一致 |
| 免费层 | 无长期免费额度，纯按量付费 |
| 来源 | 指南：https://platform.openai.com/docs/guides/embeddings （官方指南中「$1 可嵌入 62,500 页（small）/9,615 页（large），每页 800 token」换算 = $0.02 / $0.13 per 1M，与搜索结果一致） |

### 1.2 Cohere ✅

| 项 | 值 |
|---|---|
| 模型 | `embed-v3.0`（1024 维）、`embed-v4.0`（1536 维、多模态）、`embed-v5.0-fast`（API 参考中已出现 Embed 5 家族） |
| 端点 | `POST https://api.cohere.com/v2/embed` |
| 请求体 | `model`、`input_type`（必填：`search_document` / `search_query` / `classification` / `clustering` / `image`）、`texts`（最多 96 条）、`embedding_types`（默认 `["float"]`）、`output_dimension`、`truncate` |
| 响应 | `embeddings: { float: [[...], [...]] }`，`meta.billed_units.input_tokens` |
| 价格 | ⚠️ 官方定价页现已主推 Model Vault 时薪制；第三方汇总：embed-v4 约 $0.12/1M tokens，Cohere embedding 系列起步约 $0.10/1M |
| 免费层 | ✅ Trial Key 免费，全站每月 1,000 次调用；embed 限流 trial 2000 inputs/min |
| 来源 | API 参考：https://docs.cohere.com/reference/embed ；限流/试用：https://docs.cohere.com/docs/rate-limits ；定价：https://cohere.com/pricing |

### 1.3 Voyage AI ✅

| 项 | 值 |
|---|---|
| 模型（当前代） | `voyage-4-large` $0.12/M、`voyage-4` $0.06/M、`voyage-4-lite` $0.02/M、`voyage-context-4` $0.12/M、`voyage-code-4` $0.12/M；上代 voyage-3.5 $0.06/M、voyage-3.5-lite $0.02/M |
| 维度 | 4 系列支持 `output_dimension`：2048 / 1024（默认）/ 512 / 256；`output_dtype` 支持 float/int8/uint8/binary/ubinary |
| 端点 | `POST https://api.voyageai.com/v1/embeddings`，`Authorization: Bearer $VOYAGE_API_KEY` |
| 请求体 | `input`（最多 1000 条）、`model`、`input_type`（`query`/`document`，检索场景推荐）、`truncation`、`output_dimension`、`output_dtype` |
| 单次限额 | 单请求最大 tokens：voyage-4-lite/3.5-lite 1M；voyage-4 320K；voyage-4-large 120K |
| 免费层 | ✅ voyage-4 全家族每账号 200M tokens 免费（voyage-3.5 无免费额度） |
| 来源 | 定价：https://docs.voyageai.com/docs/pricing ；Embeddings API：https://docs.voyageai.com/reference/embeddings-api |

### 1.4 Jina AI ⚠️（jina.ai 域名从本环境直连超时，以下来自搜索快照，教程引用前建议再自查一次官网）

| 项 | 值 |
|---|---|
| 模型 | `jina-embeddings-v3`（570M 参数，89 语言，8192 token 上下文，默认 1024 维，MRL 可降至 32 维）、`jina-embeddings-v4`（默认 2048 维，多模态，256–2048 可选） |
| 端点 | `POST https://api.jina.ai/v1/embeddings`（OpenAI 兼容格式，可直接用 `openai` npm 包改 baseURL 调用）；参数含 `model`、`input`、`dimensions`、`task` |
| 免费层 | ⚠️ 每个新 API Key 赠 10M tokens（全模型共享池）；付费约 $0.05/1M tokens |
| 来源 | https://jina.ai/embeddings/ 、https://jina.ai/models/jina-embeddings-v3 、https://huggingface.co/jinaai/jina-embeddings-v4 、API 文档 https://api.jina.ai/scalar |

### 1.5 阿里百炼（DashScope）✅

| 项 | 值 |
|---|---|
| 模型与维度 | `text-embedding-v4`：2048/1536/1024（默认）/768/512/256/128/64；`text-embedding-v3`：1024（默认）/768/512/256/128/64；`text-embedding-v2`/`v1`：固定 1536；新一代 `qwen3.7-text-embedding`：最高 2560 维 |
| 价格（北京地域） | v4 / v3 / qwen3.7 系列：**0.0005 元/千 token**（Batch 半价 0.00025）；v1/v2：0.0007 元/千 token。换算：0.5 元/1M tokens ≈ $0.07/1M |
| 最大输入 | v3/v4：8192 tokens/条，单请求最多 10 条；qwen3.7 系列：128,000 tokens/条，最多 20 条 |
| 免费层 | ✅ 北京地域：qwen3.7 系列各 100 万 token、v1/v2 各 50 万 token（开通后 90 天内有效）；新加坡地域 v3 有 50 万 token（v4 免费额度未在所抓表格中单列，以控制台为准） |
| 端点 | OpenAI 兼容模式：`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/embeddings`（新业务空间格式）；DashScope 原生：`.../api/v1/services/embeddings/text-embedding/text-embedding`。请求体 OpenAI 风格 + `dimension`、`text_type` 参数 |
| 来源 | 官方文档（含维度/价格/限额表）：https://help.aliyun.com/zh/model-studio/text-embedding-api ；概览：https://help.aliyun.com/zh/model-studio/embedding |

### 1.6 硅基流动 SiliconFlow ✅（国内免费路线首选）

| 项 | 值 |
|---|---|
| 端点 | `POST https://api.siliconflow.cn/v1/embeddings`，`Authorization: Bearer {API_KEY}`（OpenAI 兼容） |
| 请求参数 | `model`、`input`（string/array）、`encoding_format`（float/base64）、`dimensions`（仅 Qwen3 系列支持）、`truncate`（left/right） |
| 模型 | `BAAI/bge-m3`：**免费**（有限流），8192 tokens 输入；`Pro/BAAI/bge-m3`：¥0.07/1M tokens；`Qwen/Qwen3-Embedding-8B/4B/0.6B`：32768 tokens 输入、自定义维度（8B：64–4096）；`bge-large-zh/en-v1.5`、`bce-embedding-base_v1`：512 tokens、免费 |
| 免费层 | ✅ BAAI/bge-m3 官网标「免费」（限速），适合教程演示 |
| 来源 | API 文档：https://docs.siliconflow.cn/docs/api/embeddings-post ；价格页：https://siliconflow.cn/pricing |

### Embedding 小结（教程选型）

- **海外/通用**：OpenAI `text-embedding-3-small`（$0.02/1M，事实标准，所有向量库示例都对齐 1536 维）。
- **国内/零成本**：硅基流动 `BAAI/bge-m3`（免费、8192 上下文、OpenAI 兼容端点，代码与 OpenAI 示例只差 baseURL 和 model 名）。
- **中文质量优先**：百炼 `text-embedding-v4`（0.5 元/1M，64–2048 维可选，MTEB 中文强）。
- 注意：bge-m3（1024 维）与 text-embedding-3-small（1536 维）维度不同，教程换 provider 时要同步改向量库的建表维度。

---

## 2. Rerank API（重排序，RAG 章节关键依赖）

### 2.1 Cohere Rerank ✅（质量标杆）

| 项 | 值 |
|---|---|
| 端点 | `POST https://api.cohere.ai/v2/rerank`（官方 Rerank 概述页写法；Embed 参考页用 `api.cohere.com` 域名，两者为 Cohere 官方域） |
| 模型 | `rerank-v4.0-pro` / `rerank-v4.0-fast`（Rerank 4，多语）、`rerank-v3.5`（多语）、`rerank-english-v3.0` / `rerank-multilingual-v3.0`（3.0） |
| 请求体 | `{ "model": "rerank-v3.5", "query": "...", "documents": ["...", "..."], "top_n": 5 }` |
| 响应 | `results: [{ index: 0基文档下标, relevance_score: 0–1 }]`，按相关度降序；`meta.billed_units.search_units` |
| 计费单位 | 1 次 search = 1 个 query 对最多 100 篇文档（超 500 token 的文档按多篇计） |
| 价格 | ⚠️ 官方定价页现在展示 Model Vault 时薪（$5/hr 起）；按次价格来自第三方汇总：Rerank 3.5 **$2.00/千次搜索**，Rerank 4 Fast ~$0.002/次、Pro ~$0.0025/次 |
| 免费层 | ✅ Trial Key 免费 1,000 次调用/月；限流 trial 10 req/min → 生产 1000 req/min |
| 来源 | 概述：https://docs.cohere.com/docs/rerank-overview ；限流：https://docs.cohere.com/docs/rate-limits ；定价：https://cohere.com/pricing |

### 2.2 Voyage Rerank ✅（按 token 计费，适合长文档）

| 项 | 值 |
|---|---|
| 端点 | `POST https://api.voyageai.com/v1/rerank`，`Authorization: Bearer $VOYAGE_API_KEY` |
| 请求体 | `{ "query": "...", "documents": ["...","..."], "model": "rerank-3" }`（客户端方法参数为 `top_k`） |
| 模型 | `rerank-3`（32K 上下文，精度推荐）、`rerank-3-lite`（32K，低延迟）；旧：rerank-2（16K）、rerank-2-lite（8K） |
| 限额 | 单次最多 1000 篇文档；query 8000 tokens；总量约 600K tokens/请求 |
| 价格 | ✅ rerank-3 $0.05/1M tokens、rerank-3-lite $0.02/1M tokens |
| 免费层 | ✅ 各 200M tokens 免费 |
| 来源 | https://docs.voyageai.com/docs/reranker 、https://docs.voyageai.com/docs/pricing |

### 2.3 Jina Reranker ⚠️（同 1.4，未能直连官网）

- 端点：`POST https://api.jina.ai/v1/rerank`；请求体 OpenAI 风格：`{ model, query, documents, top_n }`；模型 `jina-reranker-m0`（多模态）、`jina-reranker-v2-base-multilingual`。
- 免费层：与 embeddings 共享每 Key 10M 免费 token；付费约 $0.05/1M。
- 来源：https://jina.ai/reranker/ 、https://api.jina.ai/scalar

### 2.4 硅基流动 Rerank ✅（国内免费 Rerank 的唯一现成方案，强烈建议写进教程）

| 项 | 值 |
|---|---|
| 端点 | `POST https://api.siliconflow.cn/v1/rerank`（官方 curl 已核实） |
| 请求体 | `{"model": "BAAI/bge-reranker-v2-m3", "query": "...", "documents": ["..."], "top_n": 4, "return_documents": true}` |
| 模型 | `BAAI/bge-reranker-v2-m3`（**免费**；Pro 版 ¥0.07/1M tokens）、`netease-youdao/bce-reranker-base_v1`、`Qwen/Qwen3-Reranker-8B/4B/0.6B`（支持 `instruction` 参数）、`Qwen3-VL-Reranker-8B`（多模态） |
| 其他参数 | `max_chunks_per_doc`（默认 1024）、`overlap_tokens`（0–80） |
| 来源 | https://docs.siliconflow.cn/docs/api/rerank-post 、https://siliconflow.cn/pricing |

### Rerank 小结

- 三家海外厂商的请求体高度一致（`query + documents + top_n`），教程可以写一个通用 `rerank()` 适配器，切换厂商只改 URL/model/key。
- 国内读者完整免费链路：硅基流动 bge-m3 embedding（免费）+ bge-reranker-v2-m3（免费）。
- Cohere/Voyage 的 trial/免费层足够教程演示，但生产按次/按 token 计费需在教程中提醒成本模型差异（Cohere 按「搜索次数」、Voyage/Jina/硅基按 token）。

---

## 3. 向量数据库（一等 JS/TS 客户端核实）

### 3.1 pgvector + Drizzle ORM ✅（推荐给已有 Postgres 的读者）

- **pgvector**（PostgreSQL 扩展，Apache-2.0）：`CREATE EXTENSION vector;` → `embedding vector(1536)` 列；距离算子：`<->` L2、`<=>` 余弦、`<#>` 内积（取负）、`<+>` L1；索引 `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`（另有 ivfflat）。来源（README 全文核实）：https://github.com/pgvector/pgvector
- **Drizzle 支持**：官方指南《Vector similarity search》，要求 `drizzle-orm@0.31.0+` / `drizzle-kit@0.22.0+`（当前最新 drizzle-orm 0.45.4 ✅）。指南地址：https://orm.drizzle.team/learn/guides/vector-similarity-search
- 扩展需手写迁移（Drizzle 不代建）：`npx drizzle-kit generate --custom` + `CREATE EXTENSION vector;`

官方指南代码（核实自上述 URL）：

```ts
// schema：向量列 + HNSW 余弦索引
import { index, pgTable, serial, text, vector } from 'drizzle-orm/pg-core';

export const guides = pgTable('guides', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  url: text('url').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
}, (table) => [
  index('embeddingIndex').using('hnsw', table.embedding.op('vector_cosine_ops')),
]);

// 查询：余弦距离 → 相似度
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
const similarity = sql<number>`1 - (${cosineDistance(guides.embedding, embedding)})`;
const rows = await db
  .select({ name: guides.title, similarity })
  .from(guides)
  .where(gt(similarity, 0.5))
  .orderBy((t) => desc(t.similarity))
  .limit(4);
```

- **Prisma 支持现状**（✅ 已核实，但注意成熟度）：Prisma 走新扩展体系，包为 `@prisma/orm-extension-pgvector`（当前 8.0.0-rc.17，**Prisma ORM 8 RC 阶段**，配套 `@prisma/orm-target-postgres`）。用法：`prisma.config.ts` 注册 `pgvector`（`@prisma/orm-extension-pgvector/control`）→ `contract.prisma` 中声明 `Embedding1536 = pgvector.Vector(1536)` → 查询用 `fns.cosineDistance(f.embedding, queryVector)` 升序排。迁移命令为 `prisma contract emit` / `prisma migration plan`（自动生成 `CREATE EXTENSION IF NOT EXISTS vector`）。来源：https://www.prisma.io/docs/orm/extensions/using-extensions 、npm：https://registry.npmjs.org/@prisma/orm-extension-pgvector
  - **教程建议**：主推 Drizzle（稳定版本 + 指南成熟）；Prisma 方案作为「ORM 8 正式发布后可切换」的备注，RC 阶段不宜作教学主线。

### 3.2 Qdrant ✅（生产路线主推）

- 官方 JS/TS REST 客户端：**`@qdrant/js-client-rest`**（当前 1.19.0，Node ≥ 18.17，CJS/ESM/浏览器三构建）。npm：https://www.npmjs.com/package/@qdrant/js-client-rest
- 快速上手文档（以下代码核实自官方 quickstart）：https://qdrant.tech/documentation/quickstart/

```ts
import { QdrantClient } from "@qdrant/js-client-rest";
const client = new QdrantClient({ host: "localhost", port: 6333 });

await client.createCollection("test_collection", {
  vectors: { size: 4, distance: "Dot" },
});

await client.upsert("test_collection", {
  wait: true,
  points: [{ id: 1, vector: [0.05, 0.61, 0.76, 0.74], payload: { city: "Berlin" } }],
});

// 向量 + 过滤检索（Query API）
const res = await client.query("test_collection", {
  query: [0.2, 0.1, 0.9, 0.7],
  filter: { must: [{ key: "city", match: { value: "London" } }] },
  with_payload: true,
  limit: 3,
});
```

- **混合检索（关键卖点）**：Query API 支持 `prefetch` + 服务端 RRF/DBSF 融合，JS 客户端直接可用（核实自官方 hybrid-queries 文档 https://qdrant.tech/documentation/concepts/hybrid-queries/ ）：

```ts
await client.query("{collection_name}", {
  prefetch: [
    { query: { values: [0.22, 0.8], indices: [1, 42] }, using: 'sparse', limit: 20 },
    { query: [0.01, 0.45, 0.67], using: 'dense', limit: 20 },
  ],
  query: { rrf: {} },   // 或 { fusion: 'dbsf' }；可带 { k: 60 } 或 weights
  limit: 10,
});
```

- 注意：稀疏向量（sparse）需要稀疏 embedding（如 bge-m3 的 sparse 输出或 SPLADE）；纯 TS 路线也可改用「客户端 minisearch + 自己 RRF」方案（见第 5 节）。

### 3.3 Chroma ✅（注意：JS 仅客户端/服务器模式）

- 官方包：**`chromadb`**（当前 3.5.0，维护者来自 trychroma.com，Apache-2.0）。npm：https://www.npmjs.com/package/chromadb
- ⚠️ **重要核实结论**：官方文档明确「JS/TS 客户端必须连接 Chroma 服务器，嵌入式（in-memory/persistent）模式仅 Python 客户端支持」。JS 路线 = `npx chroma run --path ./data` 起本地服务 + HTTP 客户端。来源：https://docs.trychroma.com/docs/run-chroma/clients
- 已核实用法（来源：https://docs.trychroma.com/docs/collections/add-data 、https://docs.trychroma.com/docs/querying-collections/query-and-get 、https://docs.trychroma.com/reference/typescript/client ）：

```ts
import { ChromaClient } from "chromadb";
const client = new ChromaClient({ path: "http://localhost:8000" });

const collection = await client.getOrCreateCollection({ name: "docs" });

await collection.add({
  ids: ["id1", "id2"],
  documents: ["lorem ipsum...", "doc2"],            // 服务端自动 embedding
  // embeddings: [[1.1, 2.3, 3.2], [4.5, 6.9, 4.4]], // 或自带向量
  metadatas: [{ chapter: 3 }, { chapter: 3 }],
});

const results = await collection.query({
  queryTexts: ["thus spake zarathustra"],  // 或 queryEmbeddings: [[...]]
  nResults: 5,
  where: { page: 10 },                       // 元数据过滤
  whereDocument: { $contains: "search string" }, // 包含式全文过滤（非 BM25 打分）
});
for (const batch of results.rows()) for (const row of batch) console.log(row.id, row.distance);
```

- 教程定位：JS 生态里不如 Qdrant/LanceDB 有区分度（需要单独起服务、混合检索能力弱），可作为「多客户端巡礼」一节。

### 3.4 LanceDB ✅（入门路线主推）

- 官方包：**`@lancedb/lancedb`**（当前 0.40.0，另有 preview 0.41.0-beta.3）。**嵌入式、无服务器**：NAPI-RS 原生绑定，Node ≥ 18，支持 macOS/Linux(gnu/musl)/Windows(x64/arm64)；peer 依赖 `apache-arrow`。npm：https://www.npmjs.com/package/@lancedb/lancedb
- 官方 quickstart 同页含 TypeScript 版（以下代码核实自 https://docs.lancedb.com/quickstart.md ）：

```ts
import * as lancedb from "@lancedb/lancedb";

const db = await lancedb.connect("/tmp/mydb");          // 目录即库
const table = await db.createTable("characters", data, { mode: "overwrite" });

const result = await table
  .search([0.2, 0.8, 0.4, 0.9])                          // 查询向量
  .select(["name", "role", "description", "_distance"])
  .limit(2)
  .toArray();
```

- 额外能力（文档目录核实）：内置 **BM25 全文检索**（https://docs.lancedb.com/search/full-text-search.md ）与 **hybrid search（向量+FTS+rerank）**（https://docs.lancedb.com/search/hybrid-search.md ）——意味着「LanceDB 一站式混合检索」可作进阶章节，不用先上 Qdrant。
- 还支持对象存储后端：`lancedb.connect("s3://your-bucket/path")`。

### 3.5 Turbopuffer ✅（serverless，注意无免费层）

- 官方包：**`@turbopuffer/turbopuffer`**（当前 2.11.0；⚠️ npm 上没有 `@turbopuffer/node`，教程勿写错包名）。npm：https://www.npmjs.com/package/@turbopuffer/turbopuffer
- 特色：schema 里配置 `embed: { model, dims }` 后**服务端代做 embedding**（"no vectors go over the wire"），并原生开 `full_text_search`。
- 官方 quickstart 代码（核实自 https://turbopuffer.com/docs/quickstart.md ）：

```ts
import { Turbopuffer } from "@turbopuffer/turbopuffer";
const tpuf = new Turbopuffer({ apiKey: process.env.TURBOPUFFER_API_KEY, region: "gcp-us-central1" });
const ns = tpuf.namespace("my-namespace");

await ns.write({
  upsert_rows: [
    { id: 1, category: ["mammal"], public: true, text: "walrus narwhal" },
    { id: 2, category: ["fish"], public: false, text: "pufferfish clownfish" },
  ],
  distance_metric: "cosine_distance",
  schema: {
    text: { type: "string", full_text_search: true,
            embed: { model: "nvidia/nemotron-3-embed-8b", dims: 1024 } },
    category: { type: "[]string", full_text_search: true },
  },
});

const result = await ns.query({
  rank_by: ["text", "ANN", ["Embed", "arctic sea mammal"]],  // "Embed" 表达式服务端向量化
  limit: 10,
  filters: ["public", "Eq", true],
});
```

- 定价：Launch 档 **$16/月起**（无免费层）；Scale $256/月。来源：https://turbopuffer.com/pricing

### 3.6 Upstash Vector ✅（serverless，有免费层）

- 官方包：**`@upstash/vector`**（当前 1.2.3，MIT，HTTP/REST 无连接、适合 Workers/Next.js）。npm/GitHub：https://github.com/upstash/vector-js
- README 核实代码（来源 unpkg 官方包内 README）：

```ts
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,      // console.upstash.com/vector 创建后获得
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

await index.upsert([{ id: "1", vector: [0.13, 0.87], metadata: { title: "LOTR" } }]);

const results = await index.query({
  vector: [/* 查询向量 */],
  topK: 5,
  includeMetadata: true,
  filter: "genre = 'fantasy'",        // 类 SQL 过滤
});
// 也支持直接传文本（服务端 embedding）：index.upsert([{ id: "tokyo", data: "Tokyo is..." }])
```

- 定价（✅ 官方）：免费层 $0 —— 10K 次 query/update/天、最大 1536 维、200M vectors×dims、1GB、10 个免费 index；Pay-as-you-go $0.40/10 万次请求 + $0.25/GB 存储。来源：https://upstash.com/pricing/vector

### 向量库对比速记

| 方案 | 包（已核实） | 部署形态 | 免费层 | 混合检索 | 教程角色 |
|---|---|---|---|---|---|
| LanceDB | `@lancedb/lancedb` 0.40.0 | 嵌入式（本地文件/S3） | 开源免费 | 内置 BM25 FTS + hybrid | **入门主推** |
| pgvector+Drizzle | `drizzle-orm` 0.45.4 | 自托管 PG | 开源免费 | 需配 PG 全文检索 | 入门备选（有 PG 的读者） |
| Qdrant | `@qdrant/js-client-rest` 1.19.0 | Docker/云 | 开源（本地免费） | **服务端 RRF/DBSF** | **生产主推** |
| Chroma | `chromadb` 3.5.0 | 本地/云 server（JS 无嵌入式） | 开源 | whereDocument 过滤式 | 巡礼 |
| Turbopuffer | `@turbopuffer/turbopuffer` 2.11.0 | serverless 云 | ✗（$16/月起） | 服务端 embedding+FTS | serverless 选项 |
| Upstash Vector | `@upstash/vector` 1.2.3 | serverless 云 | ✓ 10K 请求/天 | —（有过滤） | serverless 选项 |

---

## 4. BM25 / 关键词检索（纯 JS）

### 4.1 周下载量与维护状态核实（2026-10-08 当周，api.npmjs.org）

| 包 | 版本 | 周下载 | 结论 |
|---|---|---|---|
| `minisearch` | 7.2.0 | **3,617,655** | ✅ 零依赖、浏览器/Node 双端、 fuzzy/prefix/boost，事实上的默认选择 |
| `@orama/orama` | 3.1.18 | **1,327,401** | ✅ 显式 BM25 + `vector[1536]` 类型 + hybrid 模式，一个库同时做关键词+向量 |
| `flexsearch` | 0.8.212 | 1,030,334 | ✅ 极致性能/内存取向，API 偏底层 |
| `meilisearch` | 0.62.0 | 749,167 | ✅ Meilisearch 官方 JS 客户端（需单独跑 server） |
| `search-index` | — | 36,479 | 可用但小众 |
| `wsearch` | — | **4** | ❌ 基本无人使用，勿写进教程 |
| `bm25-index` | — | **npm 上不存在（404）** | ❌ 勿写进教程 |

### 4.2 MiniSearch（✅ README 核实，来源 https://unpkg.com/minisearch@7.2.0/README.md ）

```js
const MiniSearch = require('minisearch');
const miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  storeFields: ['title', 'category'],
  searchOptions: { boost: { title: 2 }, fuzzy: 0.2 },
});
miniSearch.addAll(documents);
const results = miniSearch.search('zen art motorcycle', { prefix: true });
// 结果含 id / score / terms / match
```

⚠️ 注意：README 自称「modern search result ranking algorithm」，**未明说 BM25**——教程表述建议写「类 BM25 的相关性打分（词频+字段加权+模糊匹配）」，不要断言它就是教科书 BM25。想要明确 BM25 的用 Orama。

### 4.3 Orama（✅ README 核实，来源 https://unpkg.com/@orama/orama/README.md ）

```js
import { create, insert, search } from '@orama/orama';

const db = create({
  schema: {
    name: 'string',
    price: 'number',
    embedding: 'vector[1536]',   // 关键词与向量同库
    meta: { rating: 'number' },
  },
});
insert(db, { name: 'Noise cancelling headphones', price: 99.99,
             embedding: [0.2432, 0.9431, 0.5322, 0.4234], meta: { rating: 4.5 } });
const results = search(db, { term: 'Best headphones' });       // BM25
// const results = search(db, { term: '...', mode: 'vector', vector: { ... } }) // 向量/hybrid
```

- README 明确宣传 BM25（Apache-2.0），类型系统含 `vector[<size>]`、`enum`、`geopoint` 等 10 种。**纯 TS 单库混合检索最省事的方案。**

### 4.4 Meilisearch（✅ 官方 JS 客户端，README 核实 https://unpkg.com/meilisearch/README.md ）

```js
import { Meilisearch } from "meilisearch";
const client = new Meilisearch({ host: "http://127.0.0.1:7700", apiKey: "masterKey" });

const index = client.index("movies");
await index.addDocuments([{ id: 1, title: "Carol", genres: ["Romance"] }]); // 返回 taskUid，异步建索引
const results = await index.search("philoudelphia");                        // 容错拼写（typo-tolerant）
```

- 定位：独立搜索引擎服务（Rust），开箱即用容错+同义词；RAG 里作「关键词召回服务」偏重，教程可作可选小节。

### 4.5 混合检索（向量 + BM25 + RRF）纯 TS 实现路径（教程核心小节）

三条已核实可行路线（按投入排序）：
1. **LanceDB hybrid**：建 FTS 索引后向量+BM25 一次查询内置 rerank 融合（文档：https://docs.lancedb.com/search/hybrid-search.md ）——零额外服务。
2. **Qdrant 服务端 RRF**：dense+sparse 两路 prefetch，`query: { rrf: {} }`（文档：https://qdrant.tech/documentation/concepts/hybrid-queries/ ）——融合逻辑在服务端，TS 只发一个请求。
3. **手写 RRF（教学价值最高）**：minisearch/Orama 出关键词榜 + 任一向量库出语义榜，客户端融合：

```ts
// RRF：k 常取 60；两榜各取前 N，按名次累加 1/(k+rank)
function rrf(rankLists: (string | number)[][], k = 60, topN = 10) {
  const scores = new Map<string | number, number>();
  for (const list of rankLists)
    list.forEach((id, rank) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank)));
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([id]) => id);
}
```
（RRF 公式与 Qdrant 文档描述一致：每榜贡献 `1/(k + r)`，k 默认 2 可调 60，来源见上方 Qdrant hybrid-queries 链接。）

---

## 5. 文档解析与切片（纯 TS）

### 5.1 PDF 解析

| 包 | 版本 | 周下载 | 说明 |
|---|---|---|---|
| `pdfjs-dist` | — | 32,119,988 | Mozilla PDF.js 本体，一切的基础 |
| `pdf-parse` | **2.4.5** | 9,115,161 | v2 重写为 `PDFParse` 类 API（✅ README 核实） |
| `unpdf` | 1.8.1 | 5,423,345 | serverless 构建（内置 PDF.js，零依赖），Node/Bun/Deno/Workers 通用 |

**pdf-parse v2**（来源 https://unpkg.com/pdf-parse/README.md ）：

```ts
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

const buffer = await readFile('reports/climate.pdf');
const parser = new PDFParse({ data: buffer });
try {
  const result = await parser.getText();      // 分页结果：result.pages 每页 { text, num }
} finally {
  await parser.destroy();                     // README 要求必须 destroy() 释放内存
}
```
⚠️ v1 的默认函数式 `pdf(buffer)` 已弃用——网上大量旧教程是 v1 写法，教程要明确标注。Node 要求 ≥ 20.16。

**unpdf**（来源 https://unpkg.com/unpdf/README.md ）：

```ts
import { extractText, getDocumentProxy } from 'unpdf';
const buffer = await fetch(url).then(r => r.arrayBuffer());
const pdf = await getDocumentProxy(new Uint8Array(buffer));
const { totalPages, text } = await extractText(pdf, { mergePages: true });
```
- 教学建议：Node CLI 场景用 pdf-parse（分页元数据好用，LangChain.js 官方教程也用它）；Edge/Workers 场景用 unpdf。

### 5.2 HTML / Markdown 解析

- `marked`：周下载 83,817,767（Markdown→HTML lexer，可拿 token 流做结构感知切片）。npm：https://www.npmjs.com/package/marked
- `cheerio`：周下载 26,630,383（jQuery 风格 HTML 解析/抽取）。npm：https://www.npmjs.com/package/cheerio
- 均为纯 JS、老牌、持续维护（下载量核实自 api.npmjs.org）。

### 5.3 切片（text splitters）

- **`@langchain/textsplitters`（当前 1.0.2）**：✅ 从包内 dist/index.d.ts 核实导出类：`RecursiveCharacterTextSplitter`、`MarkdownTextSplitter`、`TokenTextSplitter`、`CharacterTextSplitter`、`LatexTextSplitter`（+ 语言代码 `SupportedTextSplitterLanguages`）。npm：https://www.npmjs.com/package/@langchain/textsplitters
- LangChain.js 官方教程用法（✅ 核实自 https://docs.langchain.com/oss/javascript/langchain/knowledge-base.md ）：

```ts
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
const allSplits = await textSplitter.splitDocuments(docs);   // docs 为 Document[]
```
（官方教程即用 1000/200 起步——教程参数可以直接沿用。）

- **语义切片（TS 下的现实路径）**：
  - ⚠️ LangChain.js 的 `@langchain/textsplitters` 包**没有** SemanticChunker（已核实导出清单；那是 Python 生态 `langchain_experimental` 的能力）。
  - ✅ **Mastra `@mastra/rag` 内置 `semantic-markdown` 策略**（核实自 https://mastra.ai/reference/rag/chunk.md ）：`doc.chunk({ strategy: 'semantic-markdown', joinThreshold: 500 })`，基于 tiktoken 编码按语义边界合并。
  - 教学正路：先教固定窗口 + overlap，再教「句向量 + 余弦阈值合并」的手写 semantic chunking（句切分 → 逐句 embedding → 相邻相似度低于阈值处断块），最后指 Mastra 为现成实现。

---

## 6. 参考框架（RAG 能力核实）

### 6.1 LangChain.js（✅，教程主线推荐）

- 文档新家：https://docs.langchain.com/oss/javascript/langchain/overview （旧 js.langchain.com 已 308 重定向至此）
- 官方 RAG 教程《Build a semantic search engine》（✅ 全文核实）：https://docs.langchain.com/oss/javascript/langchain/knowledge-base.md
  - 完整管线：`PDFParse`（pdf-parse v2）→ `RecursiveCharacterTextSplitter(1000/200)` → `OpenAIEmbeddings(text-embedding-3-large)` → `MemoryVectorStore`（`@langchain/classic`）→ `similaritySearch()` / `asRetriever({ searchType: "mmr" })`。
- 生态索引页（各集成清单，均 .md 可直读）：retrievers / splitters / embeddings / vectorstores / document_loaders / document_transformers，见 https://docs.langchain.com/oss/javascript/integrations/vectorstores/index.md 等。
- 教程定位：概念词汇（Document/Splitter/Embeddings/VectorStore/Retriever）已是行业通用语，值得作为教学骨架；但每个组件也都要教「裸 REST + 裸客户端」写法，避免框架依赖。

### 6.2 LlamaIndex.TS（✅）

- npm：`llamaindex`（当前 0.12.1，周下载 134,619）。文档：https://developers.llamaindex.ai/typescript/framework （旧 ts.llamaindex.ai 已 308 重定向）
- 官方 RAG 教程（✅ 核实）：https://developers.llamaindex.ai/typescript/framework/tutorials/rag —— 安装 `npm i llamaindex`，流程为 SimpleDirectoryReader 加载 → `VectorStoreIndex.fromDocuments(docs)`（自动 OpenAI embedding）→ `index.asQueryEngine().query({ query })`；官方教程页引用的示例文件为仓库 `examples/index/vectorIndex.ts`：

```ts
import { SimpleDirectoryReader, VectorStoreIndex } from "llamaindex";
const documents = await new SimpleDirectoryReader().loadData({ directoryPath: "./data" });
const index = await VectorStoreIndex.fromDocuments(documents);
const response = await index.asQueryEngine().query({ query: "What did the author do in college?" });
```
- 卖点：跑在 Node/Deno/Bun/Cloudflare Workers；`create-llama` 脚手架。教学定位：与 LangChain.js 二选一作「框架化 RAG」章节，篇幅有限时优先 LangChain.js（生态文档更全）。

### 6.3 Mastra（✅，国内团队主导、增长最快）

- npm：`mastra`（周下载 865,053）、RAG 子包 `@mastra/rag`（当前 2.6.6）。
- RAG 文档（✅ 核实）：https://mastra.ai/reference/rag/overview.md
  - `MDocument.fromText()` → `doc.chunk({ strategy: 'recursive', size: 512, overlap: 50 })`（策略：`recursive | character | token | markdown | semantic-markdown | html | json | latex | sentence`）
  - 向量库：`@mastra/pg` 的 `PgVector` 等；官方支持 pgvector / Qdrant / Pinecone / MongoDB / OracleDB / Cloudflare Vectorize（见 https://mastra.ai/reference/rag/vector-databases.md ）
  - embedding：`ModelRouterEmbeddingModel`（`@mastra/core/llm`）+ Vercel AI SDK `embedMany`，如 `'openai/text-embedding-3-small'`
  - rerank：`@mastra/rag` 的 `rerank(results, query, model, { weights: { semantic, vector, position }, topK })`；文档注明用 Cohere `rerank-v3.5` 时自动走 Cohere 能力（https://mastra.ai/reference/rag/rerank.md ）
  - 还有 GraphRAG（https://mastra.ai/reference/rag/graph-rag.md ）
- 教学定位：TS 原生 AI 应用框架（agent + RAG + 工具），适合「进阶综合项目」章节。

---

## 7. 教程推荐路线（详细论证）

### 第 1 站 入门：LanceDB + OpenAI/硅基流动 embedding

1. **为什么 LanceDB**：嵌入式零部署是「纯 TS 教程」的硬需求——读者 `npm install` 后第一个示例就能跑通；原生绑定（非玩具 WASM）、Windows 支持齐全（国内教程读者 Windows 占比高）；后续平滑升级：同一套数据换 connect 路径即可上 S3。
2. **为什么 embedding 先用 REST 裸写**：OpenAI embeddings API 是 `fetch` 10 行的事，让读者先理解「文本→float[]」本质；随后介绍硅基流动免费替代（同构 API、国内直连），保证无海外支付手段的读者也能完成全章。
3. 切片先教 `RecursiveCharacterTextSplitter`（1000/200 官方教程参数），PDF 解析用 pdf-parse v2（注意教 v2 新 API）。
4. 风险提示：bge-m3 是 1024 维、text-embedding-3-small 是 1536 维，切 provider 要改 `createTable` 维度——这是新手最常踩的坑，值得专门一段。

### 第 2 站 进阶：混合检索

1. 先手写 RRF（20 行函数），让读者理解融合排序原理。
2. 再演示两条「现成」路线：LanceDB 内置 hybrid（BM25 FTS + 向量 + rerank）或 minisearch + LanceDB 自己 RRF。
3. 顺带讲清：MiniSearch 打分「类 BM25」、Orama 是「明牌 BM25+向量同库」。

### 第 3 站 生产：Qdrant + Rerank API

1. **为什么 Qdrant**：Docker 单容器起步；JS 客户端官方同步维护（版本随 server 1:1）；服务端 RRF/DBSF 让混合检索在生产上不依赖客户端实现；payload 过滤 + 稀疏向量是生产 RAG 刚需。
2. **为什么加 Rerank API**：召回（向量/关键词）之后、生成之前，用 cross-encoder 重排 top 50 → top 5 是质量提升最大的一步；三家 API 形态同构（query+documents+top_n），写一个适配器讲透。
3. 成本模型对比要讲：Cohere 按「搜索次数」（$2/千次）vs Voyage/硅基按 token——长文档场景 Voyage/硅基更划算，短文档高频查询 Cohere 简单可预期。
4. 已有 Postgres 的团队给 pgvector+Drizzle 平行小节（SQL 生态/事务/JOIN 是真实优势），Prisma pgvector 扩展标注「ORM 8 RC，等正式版」。

### 全书贯穿

- 每个外部依赖给出「裸 REST 示例 + 官方客户端示例」双写法。
- 国内可连性贯穿：硅基流动（embedding+rerank 全免费）与百炼（中文质量）作为 OpenAI/Cohere 的对等选项出现，而非附录。

---

## 8. 核实方法与局限（诚实声明）

- **一手核实**：OpenAI 指南（platform.openai.com 经 webReader 全文）、Cohere embed/rerank/rate-limits/pricing、Voyage pricing+embeddings API+reranker、阿里百炼官方文档（维度/价格/限额表全文）、SiliconFlow 官方 API 文档与官网价格页、pgvector README、Drizzle 官方指南、Prisma 官方扩展文档+npm、Qdrant quickstart+hybrid-queries、Chroma 官方文档（clients/add-data/query/client 参考）、LanceDB quickstart、Turbopuffer quickstart+pricing、Upstash README+pricing、Meilisearch/MiniSearch/Orama/pdf-parse/unpdf 的包内 README（unpkg）、@langchain/textsplitters 的 dist 导出、LangChain.js 官方教程、LlamaIndex.TS 官方教程、Mastra 官方 reference（overview/chunk/rerank）。所有 npm 包名/版本/周下载量来自 registry.npmjs.org 与 api.npmjs.org（2026-10-11 查询）。
- **未能直连官方页面**：jina.ai 与 api.jina.ai 从本环境持续连接超时，Jina 的维度/免费额度/端点格式来自搜索结果快照（标注 ⚠️）；建议成稿前在可访问网络复核 https://jina.ai/embeddings/ 与 https://api.jina.ai/scalar 。
- **第三方定价**：Cohere rerank 按次价格（$2/千次）与 Jina ~$0.05/M 来自第三方汇总（官方页现主推 Vault 时薪制/需登录），已标注 ⚠️。
- **搜索后端配额**：调研中途 web_search 配额耗尽（11 月重置），后半程全部改为直连官方源核实，未依赖模型记忆下结论。
- 百炼 text-embedding-v4 的免费额度未在所抓官方表格中单列（表格只明确了 qwen3.7 系列与 v1/v2），成稿时以百炼控制台「模型广场」实时显示为准。
