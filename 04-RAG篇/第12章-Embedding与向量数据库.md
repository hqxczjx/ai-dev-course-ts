# 第 12 章 · Embedding 与向量数据库

> 📋 **本章目标**
> 1. 理解 Embedding：文本如何变成「语义坐标」，余弦相似为什么能衡量「意思接近」
> 2. 写出统一的 embedding 封装与**纯内存语义搜索**（不用任何库，看清本质）
> 3. 上手向量数据库：**LanceDB**（嵌入式，装包即用）为主线；pgvector+Drizzle、Qdrant 平行认识
> 4. 建立「维度一致」等迁移意识（换 embedding 模型 = 重建全部向量），把入库做成可重跑
> 5. 为第 13 章的 RAG 全链路准备好「检索」这块地基
>
> 前置知识：第 01-02 章（token、`lib/ai.ts`）、第 08 章（依赖注入与离线测试的思路）｜预计用时：6-10 小时
>
> **配套代码**：`code/src/lib/embed.ts`、`code/src/lib/vectorstore.ts`、`code/src/demos/ch12-mini-search.ts`；离线测试 `code/test/rag-embed.test.ts`、`code/test/rag-vectorstore.test.ts`（`npm run check` 一起跑，不需要 key）。
>
> **岗位依据**：向量数据库（Milvus/Qdrant/pgvector/Chroma）在两源 JD 高频出现（国企数科岗直接罗列清单）；Embedding 理解深度是 RAG 面试题的第一问。**本领域网上资料包名、API 错误率极高**（有不存在的包、有 Python 独占的功能被误传为 JS 可用、有旧版 API 早已改名），本章的包版本、模型价格与 API 写法均已对照官方文档与类型定义复核（2026-11 复核）。

---

## 12.1 Embedding：把文本放进「语义地图」

Embedding 模型把一段文本映射成一个高维向量（如 1024/1536 个浮点数）。关键性质：**意思相近的文本，向量在空间中也相近**（余弦相似度高）。

```
"如何退货"          → [0.12, -0.45, 0.88, …]  ┐ 语义近 → 余弦相似度高
"退款流程是什么"     → [0.10, -0.41, 0.91, …]  ┘

"今天天气不错"       → [0.77, 0.12, -0.33, …]  ← 与上面两句相似度低
```

（数字是示意，真实值取决于模型。）三个立刻可用的推论：

1. **语义搜索的本质**：把 query 和所有文档都变成向量，找「最近」的文档——这是关键词搜索做不到的（搜「退货」找不到只写「退款」的段落）。
2. **Embedding 模型 ≠ 对话模型**：它不生成文本，只编码；没有「幻觉」概念，但有「语义盲区」（训练没见过的领域编码质量差）。
3. **不可混用**：不同模型的向量空间不同——OpenAI 的 1536 维向量和硅基流动 bge-m3 的 1024 维向量**不能比较**（连维度都对不上）。同库必须同模型（12.7 详谈）。

> 余弦相似度一句话版：衡量两个向量方向的接近程度，忽略长度，取值 [-1, 1]，越接近 1 越相似。RAG 里通常用它——但要注意，**向量库的默认距离不一定是余弦**（LanceDB 默认是 L2，12.4 会讲）。

## 12.2 第一次调用：统一的 embedding 封装

Embedding API 是全 AI 技术栈里最简单的接口（OpenAI 兼容格式，各家同构：`POST /embeddings`，文本数组进、向量数组出）。课程把它封装成一个**函数类型**——和第 08 章的 `ChatModel` 端口同一个思路：向量库、检索器只依赖这个类型，真实运行注入真实实现，测试注入假的。

```ts
// code/src/lib/embed.ts（节选）
import "dotenv/config";
import OpenAI from "openai";

export type Embedder = (texts: string[]) => Promise<number[][]>;

/** 真实 embedding：任何 OpenAI 兼容的 /embeddings 端点（硅基流动、百炼、OpenAI、Ollama…） */
export function openAIEmbedder(opts: OpenAIEmbedderOptions = {}): Embedder {
  const model = opts.model ?? process.env.EMBED_MODEL ?? "BAAI/bge-m3"; // 硅基流动免费模型（别选收费的 Pro/BAAI/bge-m3）
  const batchSize = opts.batchSize ?? positiveInt(process.env.EMBED_BATCH, 10);
  let client: OpenAI | undefined;

  return async (texts) => {
    if (texts.length === 0) return [];
    if (!client) {
      const apiKey = opts.apiKey ?? process.env.EMBED_API_KEY;
      if (!apiKey) throw new Error("缺少 EMBED_API_KEY：embedding 和对话模型通常不是同一家，单独配置");
      client = new OpenAI({
        apiKey,
        baseURL: opts.baseURL ?? process.env.EMBED_BASE_URL ?? "https://api.siliconflow.cn/v1",
        maxRetries: 2, // 入库是批处理，交给 SDK 自带的退避重试即可
        ...(opts.fetch ? { fetch: opts.fetch } : {}),
      });
    }
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const res = await client.embeddings.create({
        model,
        input: texts.slice(i, i + batchSize),
        ...(opts.dimensions ? { dimensions: opts.dimensions } : {}),
      });
      // 按 index 排回原顺序：协议没有承诺 data 的顺序与 input 一致
      const sorted = [...res.data].sort((a, b) => a.index - b.index);
      out.push(...sorted.map((d) => d.embedding));
    }
    return out;
  };
}
```

完整代码：`code/src/lib/embed.ts`（另含 `cosineSim` 与离线用的 `fakeEmbedder`）

四个设计点：

- **单独的 `EMBED_*` 配置**：课程默认的对话模型是 DeepSeek，而 DeepSeek 不提供 embedding 接口，所以不回退到 `API_KEY`，缺 key 时直接报清楚的错。
- **懒加载客户端**：import 这个文件不需要 key，只有真正调用才检查——离线测试才能 import 它。
- **分批大小可配、默认 10**：各家单次请求的条数上限不同，百炼 `text-embedding-v4` **每次最多 10 条**（`qwen3.7-text-embedding` 为 20 条），Voyage 每次最多 1000 条，硅基文档没写条数上限（2026-11 复核）。默认 10 最稳，用别家时调大 `EMBED_BATCH`。
- **`fetch` 可注入**：测试里用假的 HTTP 层验证「25 条分成 10+10+5 三批」，一分钱不花（见 `code/test/rag-embed.test.ts`）。

在 `code/.env` 里加上这几行（离线测试不需要）：

```bash
EMBED_API_KEY=sk-...                        # 硅基流动控制台创建
EMBED_BASE_URL=https://api.siliconflow.cn/v1
EMBED_MODEL=BAAI/bge-m3
EMBED_DIM=1024                              # 与模型绑定，建表时用
EMBED_BATCH=10
```

**厂商选择**（都兼容上面同一份代码，只换环境变量；2026-11 复核）：

| 厂商 | 模型 | 维度 | 价格 | 备注 |
|---|---|---|---|---|
| 硅基流动 SiliconFlow | `BAAI/bge-m3` | 1024 | **免费**（限速；`Pro/BAAI/bge-m3` 收费 ¥0.07/1M，别选错） | 国内零成本首选，单条最多 8192 token |
| OpenAI | `text-embedding-3-small` | 1536 | $0.02/1M | 事实标准 |
| OpenAI | `text-embedding-3-large` | 3072 | $0.13/1M | 更准更贵；进 pgvector 建 HNSW 索引要降维（见 12.5） |
| 阿里百炼 | `text-embedding-v4`（或新一代 `qwen3.7-text-embedding`） | 64-2048 可选（qwen3.7 最高 2560） | ¥0.5/1M（北京；新开通送 100 万 token、90 天有效；`qwen3.7-text-embedding-flash` ¥0.125/1M） | 中文质量优先；**单次最多 10 条**（qwen3.7 为 20 条） |
| Voyage | `voyage-4-lite` | 默认 1024，可选 256/512/2048 | $0.02/1M | 前 200M token 免费；单次最多 1000 条 |

更新的可选项：硅基的 `Qwen/Qwen3-Embedding-8B/4B/0.6B`（32K 输入，支持 `dimensions` 降维，价格以模型广场为准）；Jina `jina-embeddings-v5-text-small`（新 key 的免费额度**仅限非商用**）；Voyage 4 系还有开放权重的 `voyage-4-nano`。硅基的 `dimensions` 参数只对 Qwen3 系生效，bge-m3 不支持。

本教程默认 **硅基流动 bge-m3（免费）**——没有海外支付手段也能完成全部 RAG 章节。

## 12.3 纯内存语义搜索（先不用库！）

用 20 行代码实现最小语义搜索，**看清向量库到底帮你做了什么**：

```ts
// code/src/demos/ch12-mini-search.ts
import { cosineSim, fakeEmbedder, openAIEmbedder } from "../lib/embed";

const embed = process.argv.includes("--offline") ? fakeEmbedder() : openAIEmbedder();

const DOCS = [
  "本公司支持 7 天无理由退货，需保持商品完好。",
  "会员积分可在下单时抵扣，100 积分抵 1 元。",
  "默认使用顺丰快递，偏远地区 3-5 天送达。",
];

const docVecs = await embed(DOCS);                 // 离线：文档向量化（一次，存起来）
const [qVec] = await embed(["怎么退掉买的东西"]);  // 在线：查询向量化（每次）

const ranked = DOCS.map((doc, i) => ({ doc, sim: cosineSim(qVec!, docVecs[i]!) }))
  .sort((a, b) => b.sim - a.sim);                  // 每次查询都和全部文档算一遍：O(N·D)

console.table(ranked); // 「退货」那条排第一——虽然 query 里没有「退货」两个字
```

完整代码：`code/src/demos/ch12-mini-search.ts`。运行：`npm run ch12`（真实模型）；没有 key 先用 `npm run ch12 -- --offline` 看流程。

`cosineSim` 就是「点积 / (模×模)」，在 `code/src/lib/embed.ts` 里导出，第 13 章的语义切片也复用它：

```ts
// code/src/lib/embed.ts（节选）
export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error(`维度不一致：${a.length} vs ${b.length}（是不是混用了两个 embedding 模型？）`);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}
```

（`a[i]!` 的感叹号是因为 tsconfig 开了 `noUncheckedIndexedAccess`：下标访问的类型是 `number | undefined`。）

真实模型下，**query 说「退掉」，文档说「退货」，语义搜索照样命中**——这就是第 13 章 RAG 的检索原理，你已经写出来了。

> **关于 `fakeEmbedder`**：它把文本的单字和相邻二字哈希进固定维度再归一化，**共享的字越多越接近**。它是测试替身：能确定地验证「入库、过滤、排序」这些程序逻辑，但不懂语义（离线模式下「退掉」能命中「退货」只是因为都有「退」字）。效果评估必须用真实模型。

这个实现的极限也很明显：**每次查询要和全部文档算一遍相似度（O(N·D)）**。100 条文档无感，百万条就慢了——这就是向量数据库存在的理由：大规模存储、元数据过滤、混合检索，以及数据量大到一定程度后用 **ANN（近似最近邻）索引**（如 HNSW、IVF-PQ）把搜索降到亚线性。注意「数据量大到一定程度」：LanceDB 在**没建向量索引时做的就是精确暴力 kNN**（全表扫描，召回 100%），官方建议约 10 万行以内一般不需要建索引（2026-11 复核）。

## 12.4 向量数据库入门：LanceDB（嵌入式，零部署）

教程主线选 **LanceDB**（`@lancedb/lancedb`，Rust 内核 + 原生绑定，macOS/Linux/Windows 都有预编译包，Node ≥ 22）——嵌入式意味着装包后即用，不需要 Docker，数据就是本地一个目录：

```bash
pnpm add @lancedb/lancedb@^0.41 apache-arrow   # 0.41（2026-10-29）起 apache-arrow 的 peer 范围放宽到 <22，可以直接装 arrow 21
# pnpm 12 会拦截原生包的构建脚本：按提示执行 pnpm approve-builds onnxruntime-node sharp
# （这两个来自 LanceDB 的可选依赖 @huggingface/transformers，只用外部 embedding API 时可以不批准）
```

> 用 npm 安装时，如果运行报 `Cannot find native binding`，说明平台对应的原生包（如 `@lancedb/lancedb-darwin-arm64`，解压后约 260MB）没装上——npm 对可选依赖有已知问题，网络中断时也会静默跳过。重新执行一次 `npm install`，或按报错提示删掉 `node_modules` 和锁文件后重装。

下面是课程的封装。它和网上大多数旧写法有**四处不同**，都对照 0.41 的类型定义与官方文档改过（2026-11 复核）：

1. `lancedb.Table` **不是泛型**，`openTable` 也不收类型参数（写成 `Table<Chunk>` 会报 TS2315）——行类型自己声明，查询结果自己转换。
2. 建表用 `createEmptyTable` + 显式 Arrow schema + `existOk: true`：表已存在就直接打开，**不需要「种子行」**，也不会因为写了 `overwrite` 每次重启都清库。`tableNames()` 已标弃用（0.41 改用惰性迭代的 `listTables()`），这样写也就用不着它。
3. 查询用 `vectorSearch(qv).distanceType("cosine")`：LanceDB **默认距离是 L2**，不显式设成 cosine，就不能用「1 − 距离」换算余弦相似度。
4. 写入用 `mergeInsert("id")` 按 ID 覆盖：同一批文档入库两遍，库里仍然只有一份（12.7 的「可重跑」）。

```ts
// code/src/lib/vectorstore.ts（节选）
import type { Table } from "@lancedb/lancedb";
import { Field, FixedSizeList, Float32, List, Schema, Utf8 } from "apache-arrow";
import { openAIEmbedder, type Embedder } from "./embed";

export const PUBLIC = "public";

export interface ChunkRecord {
  id: string;          // 稳定 ID（如 `faq.md#3`）：重复入库时按它覆盖，而不是再插一份
  text: string;
  source: string;      // 来源文件（引用溯源、按文件重建都靠它）
  visibleTo: string[]; // 可见角色（第 13 章权限过滤）；["public"] = 所有人
}
export type ChunkInput = Omit<ChunkRecord, "visibleTo"> & { visibleTo?: string[] };

export class VectorStore {
  private table: Table | null = null; // Table 不是泛型
  private readonly embed: Embedder;
  private readonly dim: number;
  private readonly tableName: string;

  constructor(opts: VectorStoreOptions = {}) {
    this.embed = opts.embedder ?? openAIEmbedder();             // 依赖注入：测试传 fakeEmbedder
    this.dim = opts.dim ?? Number(process.env.EMBED_DIM ?? 1024); // 与模型绑定！bge-m3=1024
    this.tableName = opts.tableName ?? "chunks";
  }

  /** 幂等打开：表不存在就按 schema 建空表，存在就直接打开（重启服务不会清库） */
  async init(path = process.env.LANCEDB_PATH ?? "./data/lancedb"): Promise<this> {
    const lancedb = await import("@lancedb/lancedb"); // 原生模块按需加载
    const db = await lancedb.connect(path);           // 目录即数据库（也支持 s3:// 等对象存储）
    const schema = new Schema([
      new Field("id", new Utf8(), false),
      new Field("text", new Utf8(), false),
      new Field("source", new Utf8(), false),
      new Field("visibleTo", new List(new Field("item", new Utf8(), true)), false),
      new Field("vector", new FixedSizeList(this.dim, new Field("item", new Float32(), true)), false),
    ]);
    this.table = await db.createEmptyTable(this.tableName, schema, { mode: "create", existOk: true });
    return this;
  }

  /** 写入（按 id 覆盖）：同一批文档跑两遍，库里仍然只有一份 */
  async add(chunks: ChunkInput[]): Promise<void> {
    if (chunks.length === 0) return;
    const rows = await this.toRows(chunks); // 批量 embed + 校验维度
    await this.t().mergeInsert("id").whenMatchedUpdateAll().whenNotMatchedInsertAll().execute(rows);
  }

  async search(query: string, topK = 5, filter: SearchFilter = {}): Promise<VectorHit[]> {
    const [qv] = await this.embed([query]);
    if (!qv) throw new Error("embedder 没有返回查询向量");
    let q = this.t()
      .vectorSearch(qv)          // 未建索引 = 精确 kNN（全扫）；数据量上来再 createIndex 走 ANN
      .distanceType("cosine")    // 默认是 l2！设成 cosine 后 _distance = 1 − 余弦相似度
      .limit(topK);
    const where = whereClause(filter);
    if (where) q = q.where(where); // LanceDB 默认「先过滤再找最近邻」：过滤后仍能凑满 topK
    const rows = await q.select(["id", "text", "source", "visibleTo", "_distance"]).toArray();
    return rows.map((r: Record<string, unknown>) => {
      const distance = Number(r._distance);
      return {
        id: String(r.id), text: String(r.text), source: String(r.source),
        visibleTo: toStrings(r.visibleTo), // Arrow 的 List 列读出来是 Vector 对象，转成 string[]
        distance,
        score: 1 - distance,
      };
    });
  }
  // …… replaceSource / deleteBySource / count / toRows 见完整代码
}
```

完整代码：`code/src/lib/vectorstore.ts`；测试：`code/test/rag-vectorstore.test.ts`（临时目录 + `fakeEmbedder`，验证「二次 init 不清库」「写两遍不重复」「文档改短后旧 chunk 被删」「cosine 换算」「角色过滤不占 topK 名额」「维度不符拒绝写入」）。

使用方式：

```ts
// 用法示例（节选，第 13 章的 rag/kb.ts 就是这样装配的）
import { VectorStore } from "./lib/vectorstore";

const store = await new VectorStore().init("./data/kb/lancedb");
await store.add([{ id: "faq.md#0", text: "本公司支持 7 天无理由退货。", source: "faq.md" }]);
const hits = await store.search("怎么退货", 5);                      // [{ id, text, source, score, … }]
const hrOnly = await store.search("工资几号发", 5, { roles: ["hr"] }); // 只在 hr 可见范围内检索
```

两个细节值得说清：

- **元数据过滤**：`search` 的第三个参数会变成 LanceDB 的 SQL 过滤条件，例如 `array_has_any(\`visibleTo\`, ['public', 'hr'])`（列名有大写字母要用反引号括起来；字符串值统一经过单引号转义，避免把用户输入拼进条件时被注入）。LanceDB **默认是预过滤**：先按条件缩小范围再找最近邻，所以过滤后仍能凑满 topK；改成 `.postfilter()` 则可能返回少于 limit 条（2026-11 复核）。这就是第 13 章「检索前按用户可见范围过滤」的地基。
- **什么时候建索引**：数据量到十万行级以上、延迟不可接受时，再建 ANN 索引，查询才会走近似检索（召回可能略降）：

```ts
// ⚠️ 接口示意（未收入 code/；选项名来自 0.41 的类型定义，未实测）
await table.createIndex("vector", { config: lancedb.Index.ivfPq({ distanceType: "cosine" }) });
```

LanceDB 还内置了**全文检索（BM25）与混合检索**：`table.createIndex("text", { config: lancedb.Index.fts() })` 建全文索引，`table.query().fullTextSearch(q).nearestTo(vec).rerank(await lancedb.rerankers.RRFReranker.create()).limit(10).toArray()` 做混合检索，默认用 RRF 融合（2026-11 复核）。**但中文要换分词器**：全文索引默认的 `simple` 分词按空格和标点切，对中文基本无效；类型定义里可选 `baseTokenizer: "ngram"`（配 `ngramMinLength/ngramMaxLength`）或 `"icu"`，中文效果课程没有实测。第 13 章会**手写** MiniSearch（中文分词）+ 向量 + RRF 打通原理——前者让你面试讲得清，后者让你少写代码，两条路都给你。

## 12.5 平行路线：pgvector + Drizzle（已有 PostgreSQL 的选择）

如果你的应用已经在用 Postgres，**不引入新组件**直接把向量塞进 PG（pgvector 扩展 + Drizzle 官方指南级支持）：

```ts
// ⚠️ 接口示意（未收入 code/：需自备 PostgreSQL + pgvector 扩展，并 pnpm add drizzle-orm pg）
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { index, pgTable, serial, text, vector } from "drizzle-orm/pg-core";
import { openAIEmbedder } from "./lib/embed";

// schema：向量列 + HNSW 余弦索引（Drizzle 官方指南写法）
export const chunks = pgTable("chunks", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  source: text("source").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }),
}, (t) => [
  index("embeddingIdx").using("hnsw", t.embedding.op("vector_cosine_ops")),
]);

const db = drizzle(process.env.DATABASE_URL!);
const [queryVec] = await openAIEmbedder()(["怎么退货"]);

// 查询：cosineDistance → 相似度排序（有 HNSW 索引时走 ANN）
const similarity = sql<number>`1 - (${cosineDistance(chunks.embedding, queryVec!)})`;
const rows = await db.select({ text: chunks.text, similarity })
  .from(chunks).where(gt(similarity, 0.5))
  .orderBy(desc(similarity)).limit(5);
```

注意事项（2026-11 复核）：

- `CREATE EXTENSION vector;` 要手写迁移——Drizzle 不代建。drizzle-orm 当前为 0.45.x，1.0 仍是 beta。
- pgvector 扩展当前 0.8.7：HNSW 默认 `m=16`、`ef_construction=64`、查询时 `hnsw.ef_search=40`；**建索引的维度上限：`vector` 类型 2000 维、`halfvec` 4000 维**——3072 维的 `text-embedding-3-large` 要么传 `dimensions` 降维，要么改用 halfvec。
- 带过滤条件的向量查询（多租户、按部门）可能「过滤后不够 topK 条」，0.8 起可以开 `hnsw.iterative_scan` 解决。
- Prisma 的 pgvector 扩展仍在 ORM 8 RC 阶段（`npm i prisma` 的 latest 标签现在指向 8.0.0-rc），教程不推荐作主线。

## 12.6 生产路线：Qdrant（服务端混合检索）

规模/团队场景上 **Qdrant**（Docker 单容器，JS 客户端 `@qdrant/js-client-rest` 1.20.x，Node ≥ 22）。它的杀手锏是**服务端混合检索**：关键词（BM25）+ 语义两路召回与 RRF 融合在一个请求里完成。

旧写法要求你自己准备**稀疏向量**（如 bge-m3 的 sparse 输出）——但硅基等 OpenAI 兼容接口只返回稠密向量，TS 读者其实拿不到 sparse。**Qdrant 1.20（2026-10-22）起，服务端可以直接在全文索引上做 BM25 查询**，不用再自备稀疏向量（2026-11 复核）：

```ts
// ⚠️ 接口示意（未收入 code/：需 docker 跑 Qdrant ≥ 1.20，并 pnpm add @qdrant/js-client-rest@^1.20）
import { QdrantClient } from "@qdrant/js-client-rest";
const client = new QdrantClient({ host: "localhost", port: 6333 });

// 一次性：给 text 字段建带 BM25 打分的全文索引
await client.createPayloadIndex("chunks", {
  field_name: "text",
  field_schema: { type: "text", tokenizer: "multilingual", lowercase: true, scoring: { type: "bm25" } },
  wait: true,
});

// 混合检索：服务端 BM25（关键词）+ 稠密（语义）各取 20，服务端 RRF 融合取 10
const { points } = await client.query("chunks", {
  prefetch: [
    { query: { text: queryText }, using: "text", limit: 20 },   // 服务端 BM25，无需稀疏向量
    { query: denseVec, using: "dense", limit: 20 },
  ],
  query: { rrf: { k: 60 } },                                     // 不写 k 时 Qdrant 默认 k=2
  limit: 10,
  with_payload: true,
});
```

几点说明：qdrant-js 1.19 起删掉了旧的 `search`/`recommend`，统一用 `query`（返回 `{ points }`）；`rrf: { k }` 自 1.16 起支持。`multilingual` 分词器官方说明是能处理「无空格分隔」的语言，但**中文实际分词效果课程没有实测**，上线前用你的语料验证。纯客户端路线见第 13 章手写 RRF。

**向量库选型速查**（2026-11 复核）：

| 方案 | 包名 | 形态 | 混合检索 | 定位 |
|---|---|---|---|---|
| **LanceDB** | `@lancedb/lancedb` 0.41.x | 嵌入式 | 内置 BM25 + hybrid（中文需换分词器） | **入门/个人项目** |
| pgvector+Drizzle | `drizzle-orm` 0.45.x | 自托管 PG | 需配 PG 全文检索 | 已有 PG 的团队 |
| **Qdrant** | `@qdrant/js-client-rest` 1.20.x | Docker/云 | 服务端 BM25 + RRF（1.20+） | **生产** |
| Chroma | `chromadb` 3.5.x | server（**JS 无嵌入式**，那是 Python 独占） | 过滤式，弱 | 巡礼即可 |
| Upstash Vector | `@upstash/vector` | serverless | 元数据过滤 | 免费层每天 1 万次查询/更新、最大 1536 维 |

面试一句话：「个人与教学项目我用 LanceDB 嵌入式零部署；生产用 Qdrant（服务端混合检索+过滤）；如果团队已有 Postgres 且数据量中等，pgvector 少加一个组件。」——三个都有理由，比背「Milvus 最强」值钱。

## 12.7 最重要的一节：维度一致与换模型的代价

新手最常踩的坑（值得单独一节）：

1. **维度必须与模型绑定**：建表时写死维度（`EMBED_DIM=1024`），换了 1536 维的模型，写入直接报错——这是**保护你**（否则算出来的相似度全是垃圾）。课程的 `VectorStore` 在写入前就校验维度，给出「换模型必须全量重建」的明确错误。
2. **换 embedding 模型 = 全量重建**：向量空间不可比，旧向量全部作废，需重跑入库管道（文档→切片→embed→写库）。所以入库脚本要**可重跑**：chunk 用稳定 ID（`文件名#序号`），写入按 ID 覆盖；文档改短后用 `replaceSource(source, chunks)` 在一次事务里「覆盖新的、删掉这次没出现的旧 chunk」。第 13 章的 `npm run ingest` 连跑两次，chunk 数不变。
3. **入库与查询必须同模型**：`EMBED_MODEL`/`EMBED_BASE_URL`/`EMBED_DIM` 在入库脚本和查询服务里读的是同一份配置——把它写进部署清单。课程把真实库和离线演示库放在两个目录（`data/kb` 与 `data/offline`），就是因为两者维度不同。
4. **文本预处理影响巨大**：超长文本先截断（bge-m3 上限 8192 token，但太长稀释语义——交给第 13 章切片解决）；HTML 噪音（导航/页脚）要在入库前清洗。

---

## ⚠️ 常见坑

1. **照网上旧文写 `bm25-index`（npm 上不存在）或 `wsearch`（几乎没人用）**——BM25 用 minisearch（类 BM25 打分）或 @orama/orama（明牌 BM25），第 13 章。
2. **以为 Chroma JS 客户端能嵌入式跑**——官方明确：JS/TS 客户端必须连接 Chroma server，嵌入式是 Python 独占。
3. **拿对话模型做 embedding**（调 chat API 拿文本）——两类模型完全不同，embeddings 端点才是正道。
4. **每次查询重新 embed 文档**——文档向量是离线算好存库的，在线只 embed query。缓存意识（第 17 章）从这里开始。
5. **`_distance` 当相似度用**：`_distance` 是**距离**（越小越近），而且 LanceDB **默认是 L2**；只有 `.distanceType("cosine")` 时才满足「余弦相似度 = 1 − `_distance`」（建了量化索引后是近似值）。
6. **把 LanceDB 旧示例原样抄进 TS 项目**：`Table<Chunk>`、`openTable<Chunk>()` 编译不过；「插一行全 0 的种子行再 where 过滤」是绕远路——用 `createEmptyTable(..., { existOk: true })`。
7. **百炼批量 embed 报参数错误**：单次最多 10 条，`EMBED_BATCH` 别设大。
8. **选了 `Pro/BAAI/bge-m3`**：那是收费版，免费的是 `BAAI/bge-m3`。

## ✍️ 动手练习

**基础**：
1. 跑通 12.3 纯内存搜索：放进 20 条自己的业务文案（如你们产品的 FAQ），试 10 个口语化 query，记录命中情况与最不像话的 miss——这些 miss 就是第 13 章混合检索要解决的（留住数据）。再用 `--offline` 跑同一批 query，对比「只认字面」的 fakeEmbedder 和真实模型差在哪。
2. **精确 kNN vs ANN**：用 `VectorStore` 先塞 500 条，再用脚本生成 20 万条，分别在 `createIndex` 前后计时，并对比同一 query 的 Top10 是否一致——前者是精确 kNN 全扫，后者才是 ANN（近似，召回可能下降）。

**进阶**：
3. **维度实验**：同一批文档分别用 bge-m3（1024）与 text-embedding-3-small（1536）建两个库（两个目录、两个 `EMBED_DIM`），各跑 15 个 query，对比 Top1 命中率——「换模型=换效果+换维度」两个结论一次拿到（这就是一个小型评测实验，第 15 章预演）。
4. **再加一种元数据过滤**：给 chunk 加 `category` 字段（schema 里加一列、`SearchFilter` 里加一个条件），实现「只在某分类内搜索」，并仿照 `code/test/rag-vectorstore.test.ts` 写一条测试证明「过滤后仍能凑满 topK」——多租户 RAG（第 18 章 LLM08）的地基。

## 🧠 自测清单

1. Embedding 的关键性质？语义搜索与关键词搜索的本质差异？
2. 裸实现的三步是什么？它的复杂度瓶颈是什么？LanceDB 在没建索引时做的是精确 kNN 还是 ANN？
3. 为什么 `Embedder` 要做成函数类型？`fakeEmbedder` 能证明什么、不能证明什么？
4. 本教程的 embedding 三档选择（免费/事实标准/中文优先）？百炼的批次限制是多少？
5. 三条向量库路线（LanceDB/pgvector/Qdrant）各自的适用场景与理由？Qdrant 1.20 带来了什么变化？
6. 为什么换 embedding 模型必须全量重建？入库「可重跑」靠哪两件事（稳定 ID + 按来源整体替换）？
7. `_distance` 与余弦相似度的关系？什么前提下才能用 `1 − _distance`？

## 🔗 延伸阅读

- LanceDB 快速开始（TS 版在官方 quickstart 同页）：https://docs.lancedb.com/quickstart.md
- LanceDB 向量检索（默认 L2、无索引时精确 kNN、预过滤）：https://docs.lancedb.com/search/vector-search.md
- LanceDB 向量索引（何时需要建索引）：https://docs.lancedb.com/indexing/vector-index.md
- Drizzle 官方《Vector similarity search》指南：https://orm.drizzle.team/docs/guides/vector-similarity-search
- pgvector README（HNSW 参数、维度上限、iterative scan）：https://github.com/pgvector/pgvector/blob/master/README.md
- Qdrant 混合检索（服务端 RRF）：https://qdrant.tech/documentation/search/hybrid-queries/
- 硅基流动 Embedding API（免费 bge-m3）：https://docs.siliconflow.cn/docs/api/embeddings-post
- 阿里百炼向量模型（批次限制与价格）：https://help.aliyun.com/zh/model-studio/embedding

---

➡️ 下一章：[第 13 章 · RAG 全链路实战](第13章-RAG全链路实战.md)——组装完整管道，交付项目 2。
