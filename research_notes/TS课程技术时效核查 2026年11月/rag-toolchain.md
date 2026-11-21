# RAG 工具链时效核查（第 12-13 章 + 附录 B3/B9），截至 2026-11-13

> 核查日期：2026-11-13（所有来源的访问日期均为 2026-11-13，下文不再逐条重复）。课程上次复核：2026-10-22。
> 范围：Embedding、向量库、检索/融合、Rerank、文档解析与切片、RAG 评测（仅 TypeScript 生态）。
> 方法：npm registry 原始文档（本机 `npm view` 指向不可达的私有镜像会卡住，所以改用 `curl https://registry.npmjs.org/<pkg>` 读同一官方 registry 的 JSON）、jsdelivr 上的包内 `.d.ts`/源码、各厂商官方文档与定价页、GitHub releases/CHANGELOG。**没有安装或运行任何第三方包**；下文的代码改写建议是按类型定义与文档推出来的，没有实机跑过（见各节 Gaps）。
> 判定图例：✅ 仍正确｜⚠️ 需要更新或补充｜❌ 错误（编译/运行会失败，或概念讲错）。**[10-22 后变化]** 表示 2026-10-22 之后才出现的变化。

---

## 1. 包版本：哪些在 2026-10-22 之后变了？

### Takeaway
RAG 核心包大多没动（minisearch、@langchain/textsplitters、chromadb、llamaindex、pdf-parse、drizzle-orm 都和 10-22 一样）。有实际影响的变化有两个：**@lancedb/lancedb 0.41.0（2026-10-29）**，它把 apache-arrow 的 peer 范围放宽到 `<22`，`listTables()` 也改成了惰性迭代器；**Qdrant 1.20（2026-10-22）**，服务端可以直接做 BM25 文本查询。附录 B9 里 `@lancedb/lancedb 0.40.x` 和 `promptfoo 0.124.x` 两行需要改。

### Cited Findings

**npm latest（registry.npmjs.org，2026-11-13）**

| 包 | 课程写法（file:line） | 2026-11-13 latest（发布日） | 10-22 后的版本 | 判定 | 来源 |
|---|---|---|---|---|---|
| `@lancedb/lancedb` | 附录B:130「0.40.x」 | **0.41.0（2026-10-29）**；`preview` 标签 0.42.0-beta.12（11-12） | **[10-22 后变化]** 0.41.0，另有 0.42.0-beta.2…12 | ⚠️ | [registry](https://registry.npmjs.org/@lancedb%2Flancedb) · [v0.41.0 release](https://github.com/lancedb/lancedb/releases/tag/v0.41.0) |
| `@qdrant/js-client-rest` | 附录B:130「1.20.x」 | 1.20.0（2026-10-22），engines `node >=22.0.0` | 无 | ✅ | [registry](https://registry.npmjs.org/@qdrant%2Fjs-client-rest) · [qdrant-js releases](https://github.com/qdrant/qdrant-js/releases) |
| `chromadb` | 附录B:134「3.5.x」 | 3.5.0（2026-06-30） | 无 | ✅ | [registry](https://registry.npmjs.org/chromadb) |
| `minisearch` | 第13章:34/124（未锁版本） | 7.2.0（2025-09-16） | 无 | ✅ | [registry](https://registry.npmjs.org/minisearch) |
| `@langchain/textsplitters` | 第13章:34 | 1.0.2；peer `@langchain/core ^1.0.0`（core latest 1.4.0） | 无 | ✅ | [registry](https://registry.npmjs.org/@langchain%2Ftextsplitters) |
| `llamaindex` | 附录B:134「0.12.1（停更互证）」 | 0.12.1（2025-12-02），没有新版本 | 无 | ✅ | [registry](https://registry.npmjs.org/llamaindex) |
| `pdf-parse` | 第13章:34/40 | 2.4.5（2025-10-20），engines `>=20.16.0 <21 \|\| >=22.3.0` | 无 | ✅ | [registry](https://registry.npmjs.org/pdf-parse) |
| `marked` | 第13章:34/41 | **18.2.0（2026-11-09）** | **[10-22 后变化]** 18.1.2（10-26）、18.1.3（11-02）、18.2.0（11-09） | ✅（版本没锁）；类型问题见 §5 | [registry](https://registry.npmjs.org/marked) |
| `cheerio` | 第13章:34 | 1.2.0（2026-01-23） | 无 | ✅ | [registry](https://registry.npmjs.org/cheerio) |
| `unpdf`（只在 R3 底稿出现） | — | **2.1.0（2026-10-30）**；2.0.0 起 engines `node >=24`、peer `@napi-rs/canvas` | **[10-22 后变化]** 2.0.0（10-28）大版本 | ⚠️（只影响底稿） | [registry](https://registry.npmjs.org/unpdf) |
| `mammoth`（DOCX，课程没用） | — | 1.13.0（2026-09-26） | 无 | — | [registry](https://registry.npmjs.org/mammoth) |
| `drizzle-orm` / `drizzle-kit` | 附录B:130 | 0.45.4（2026-10-08）/ 0.31.11；1.0 仍只有 `1.0.0-beta.*` 标签 | 无 | ✅ | [registry](https://registry.npmjs.org/drizzle-orm) |
| `pgvector`（npm，课程没用） | — | 0.3.1（2026-11-04，新增 `postgres` 模块）；0.3.0 起只支持 ESM、Node ≥22 | **[10-22 后变化]** 0.3.1 | — | [pgvector-node CHANGELOG](https://raw.githubusercontent.com/pgvector/pgvector-node/master/CHANGELOG.md) |
| `pg` | — | 8.23.1（2026-09-30） | 无 | — | [registry](https://registry.npmjs.org/pg) |
| `postgres`（porsager） | — | **4.1.1（2026-11-11）** | **[10-22 后变化]** 4.0.0 大版本（10-29）、4.1.0、4.1.1 | —（RAG 章没用；提醒第 19 章的核查人） | [registry](https://registry.npmjs.org/postgres) |
| `@upstash/vector` | 第12章:226 | 1.2.4（2026-11-12） | **[10-22 后变化]** patch | ✅ | [registry](https://registry.npmjs.org/@upstash%2Fvector) |
| `@orama/orama` | 附录B:44 | 3.1.18 | 无 | ✅ | [registry](https://registry.npmjs.org/@orama%2Forama) |
| `@mastra/rag` | 第13章:115 | 2.7.2（2026-11-03） | **[10-22 后变化]** minor | ✅ | [registry](https://registry.npmjs.org/@mastra%2Frag) |
| `promptfoo` | 附录B:131「0.124.x」 | **0.125.1（2026-10-25）**，engines `node >=22.22.0` | **[10-22 后变化]** 0.125.0（10-23）、0.125.1 | ⚠️ | [registry](https://registry.npmjs.org/promptfoo) |
| `autoevals` | 附录B:131「0.4.x」 | 0.4.1（2026-10-21） | 无 | ✅ | [registry](https://registry.npmjs.org/autoevals) |
| `cohere-ai` / `voyageai`（官方 SDK，课程用 fetch） | — | 8.3.1（11-04）/ 0.6.0（11-09） | **[10-22 后变化]** | — | [registry](https://registry.npmjs.org/cohere-ai) · [registry](https://registry.npmjs.org/voyageai) |
| `apache-arrow` | 第12章:117 | 21.2.0（2026-07-21） | 无 | 见下 | [registry](https://registry.npmjs.org/apache-arrow) |
| `prisma` / `@prisma/orm-extension-pgvector` | 第12章:195「ORM 8 RC」 | `latest` 标签指向 **8.0.0-rc.33**（`prev` 7.10.1）；扩展 8.0.0-rc.23 | 包元数据 2026-11-10/11 有修改 | ✅ 仍在 RC 阶段（但 `npm i prisma` 现在装到的就是 RC） | [registry](https://registry.npmjs.org/prisma) |

**LanceDB 0.40 → 0.41 里会影响课程的变化**
- peer 依赖：0.39.0/0.40.0 是 `"apache-arrow": ">=15.0.0 <=18.1.0"`；**0.41.0 是 `">=15.0.0 <22.0.0"`**。engines 都是 `node >= 22`，optionalDependencies 仍包含 `openai@4.29.2` 和 `@huggingface/transformers@3.0.2`（后者就是 `onnxruntime-node`/`sharp` 构建审批的来源）— [registry](https://registry.npmjs.org/@lancedb%2Flancedb)
- apache-arrow 早在 2025-07 就到了 21.x（21.2.0 发布于 2026-07-21）— [registry](https://registry.npmjs.org/apache-arrow)
- v0.41.0 release notes：「Table and namespace listings … return lazy iterators (#4459, #4599)」（breaking）、「`createTable` accepts `exist_ok` (#4432)」、FTS 可以建在 JSON 字段上、「ANN distances are cosine-scaled (#3852)」、「`code` is accepted as a base tokenizer」— [GitHub release v0.41.0](https://github.com/lancedb/lancedb/releases/tag/v0.41.0)
- 0.41.0 的 `.d.ts`：`listTables(namespacePath?, options?): Listing<string>`（`Listing<T> implements AsyncIterableIterator<T>`，**没有 `toArray()`**）；0.40.0 是 `listTables(options?): Promise<ListTablesResponse>`。两个版本里 `tableNames` 都标了 `@deprecated Use Connection.listTables instead` — [0.41.0 connection.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.41.0/dist/connection.d.ts) · [0.41.0 listing.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.41.0/dist/listing.d.ts) · [0.40.0 connection.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.40.0/dist/connection.d.ts)
- `CreateTableOptions.mode`：0.40 是 `"create" | "overwrite"`，0.41 是 `"create" | "overwrite" | "exist_ok"`；`existOk: boolean` 两版都有 — 同上

**Qdrant**
- 服务端 v1.20.0（10-22）：「BM25 scoring runs directly on the full-text payload index」，新增 `code` tokenizer；集群上设了 API key 时，`service.enforce_internal_auth` 默认变成 `true` — [qdrant releases](https://github.com/qdrant/qdrant/releases)
- qdrant-js 1.20.0：在 `query`/`queryBatch`/`queryGroups` 里新增 `text` 查询类型（按 `using` 指定的 payload 字段排序），文本索引参数支持 `scoring`（BM25）；1.19.0（8 月）**删除了** REST 的 `search`/`searchBatch`/`recommend`/`discover*`，统一改用 `query`（返回 `{ points: [...] }`）— [qdrant-js releases](https://github.com/qdrant/qdrant-js/releases)

**pgvector 扩展**：latest 0.8.7（2026-10-01）；0.9.0 尚未发布，计划去掉 Postgres 13/14 支持 — [pgvector CHANGELOG](https://raw.githubusercontent.com/pgvector/pgvector/master/CHANGELOG.md)

### Inferences
- **附录B:130 建议改成**：`@lancedb/lancedb 0.41.x（2026-10-29；apache-arrow peer 放宽到 <22）    @qdrant/js-client-rest 1.20.x（Node ≥22）  drizzle-orm 0.45.x（drizzle-kit 0.31.x）`
- **附录B:131 建议改成**：`promptfoo 0.125.x（Node ≥22.22）  autoevals 0.4.x  …`
- **第12章:117-118 安装命令**：用 0.40.x 时，`pnpm add @lancedb/lancedb apache-arrow` 会装上 apache-arrow 21.2.0，超出 peer `<=18.1.0`，pnpm 会报 unmet peer 警告，npm 在严格解析下会报 ERESOLVE；0.41.0 起不再有这个问题。这一点是根据 peer 范围推出来的，没有实际安装验证。建议改成：
  ```bash
  pnpm add @lancedb/lancedb@^0.41 apache-arrow   # 0.41 起 arrow peer 放宽到 <22；Node ≥ 22
  # pnpm 12 会拦截原生包的构建脚本：按提示执行 pnpm approve-builds onnxruntime-node sharp
  # （这两个来自 LanceDB 的可选依赖 @huggingface/transformers，只用外部 embedding API 时可以不批准）
  ```
- 附录B:134 那一行（llamaindex 0.12.1 停更、chromadb 3.5.x）仍然成立。

### Gaps
- 本机 `npm view` 因 `~/.npmrc` 指向的私有镜像而超时（协调人说「已恢复」后重试仍然超时），所以版本数据全部取自 `curl registry.npmjs.org` 的 JSON。数据源相同，只是没能用 `npm view` 命令本身复现。
- prisma 的 `latest` 标签具体从哪天起指向 8.0.0-rc.*，没查到（缩略元数据里没有标签变更时间）。
- 没有实机执行 `pnpm add`，所以「0.40 + arrow 21 报错」属于推断。

---

## 2. Embedding 模型与价格：课程推荐的还算当前吗？有哪些更新的选项？

### Takeaway
第 12 章表格里的 5 个模型、价格和维度到 2026-11-13 都还对：硅基 bge-m3 免费、OpenAI 3-small $0.02、3-large $0.13、百炼 v4 ¥0.5/1M、voyage-4-lite $0.02。需要补充三点：百炼 v4 每次请求最多 10 条，和代码里每批 64 条冲突；百炼已上线 qwen3.7-text-embedding 系列；Jina v5 和 Cohere Embed 5 是新的可选方案。OpenAI 没有发布新的 embedding 模型。

### Cited Findings

| 课程声明（第12章） | 2026-11-13 事实 | 判定 | 来源 |
|---|---|---|---|
| :49 默认 `BAAI/bge-m3`；:68 硅基 bge-m3、1024 维、**免费**、8192 token | 硅基定价页：`BAAI/bge-m3` 标「免费」，`Pro/BAAI/bge-m3` ¥0.07/1M；API 文档：bge-m3 单条最多 8192 token；`dimensions` 参数**只支持 Qwen3 系列**。口径：硅基官网定价页（「实时价格同步」），按输入 token 计 | ✅ | [siliconflow.cn/pricing](https://siliconflow.cn/pricing) · [embeddings API](https://docs.siliconflow.cn/docs/api/embeddings-post) |
| :69 `text-embedding-3-small` 1536 维，$0.02/1M | 官方模型页：$0.02/1M input tokens，没有弃用提示，也没有更新的模型 | ✅ | [OpenAI model page（经 r.jina.ai 读取官方页）](https://r.jina.ai/https://platform.openai.com/docs/models/text-embedding-3-small) |
| :70 `text-embedding-3-large` 3072 维，$0.13/1M | 同一页面的对比栏：$0.13/1M | ✅ | 同上 |
| （无） | 没找到 OpenAI 官方 2026 年新 embedding 模型的公告；只有一个目录站提到「text-embedding-4-large」，无法证实 | — | [搜索结果](https://www.skillrank.it.com/tools/text-embedding-4-large)（不可信，不采用） |
| :71 百炼 `text-embedding-v4`，64-2048 可选维度，¥0.5/1M | 官方表（北京）：维度 2048/1536/1024（默认）/768/512/256/128/64；「0.0005元」每千 token（= ¥0.5/1M）；**免费额度「100万Token」，有效期 90 天**；**批次大小 10**，单批最多 33,000 token。新加坡地域 0.000514 元/千 token | ✅（价格）⚠️（缺批次限制和免费额度） | [help.aliyun.com 向量模型](https://help.aliyun.com/zh/model-studio/embedding) |
| （无） | 百炼新增 `qwen3.7-text-embedding`（最高 2560 维，单批 128,000 token，批次 20，0.0005 元/千 token，免费 100 万 token）和 `qwen3.7-text-embedding-flash`（0.000125 元/千 token = ¥0.125/1M，最高 1024 维） | ⚠️ 建议补上 | 同上 |
| :72 Voyage `voyage-4-lite`，256-2048 维，$0.02/1M，200M token 免费 | 定价页（2026-09-29 更新）：voyage-4-lite $0.02、voyage-4 $0.06、voyage-4-large $0.12，各自「First 200 million tokens」免费；Embeddings 文档：默认 1024 维，可选 256/512/2048，上下文 32K，每次请求最多 1,000 条；另有开放权重的 `voyage-4-nano` | ✅ | [Voyage pricing](https://docs.voyageai.com/docs/pricing) · [Voyage embeddings](https://docs.voyageai.com/docs/embeddings) |
| :52-54 每批 64 条，注释「多数 API 单请求上限 ~100 条」 | 百炼 v4 每批 **10** 条、qwen3.7 每批 20 条、Voyage 1,000 条；硅基文档**没写**条数上限 | ⚠️ 用百炼时每批 64 条会超限 | [百炼](https://help.aliyun.com/zh/model-studio/embedding) · [Voyage](https://docs.voyageai.com/docs/embeddings) · [硅基](https://docs.siliconflow.cn/docs/api/embeddings-post) |
| （无）更新的开源/国内选项 | 硅基 API 文档列出了 `Qwen/Qwen3-Embedding-8B/4B/0.6B`（单条 32768 token，`dimensions` 8B 可选 64–4096）；Qwen 官方博客（2025-06-05）称 8B 当时在 MTEB 多语言榜排第 1（70.58），embedding 和 reranker 都支持自定义 instruction | 可选补充 | [硅基 embeddings API](https://docs.siliconflow.cn/docs/api/embeddings-post) · [Qwen3 Embedding 博客](https://qwenlm.github.io/blog/qwen3-embedding/) |
| （无）Jina | 官方模型页：`jina-embeddings-v5-text-small`（2026-02-18，1024 维，32K）、`-nano`（768 维，8K）、`v5-omni-*`（2026-05-07）；定价页：新 key 送 1000 万 token（**仅限非商用 CC-BY-NC**），付费 $0.050/1M（$50/10 亿 token 档）；做文本检索推荐「Start with `jina-embeddings-v5-text-small`」；页脚为「Elastic © 2026」 | 可选补充 | [jina.ai/models](https://r.jina.ai/https://jina.ai/models) · [jina.ai/embeddings](https://r.jina.ai/https://jina.ai/embeddings/) |
| （无）Cohere | changelog 里有 Embed 5 公告（`embed-v5.0-pro`、`embed-v5.0-fast`）以及「Embed 5 and Rerank 5 on OpenRouter」；pricing 页没有列 API 单价 | 可选补充 | [Cohere changelog](https://docs.cohere.com/changelog) · [cohere.com/pricing](https://cohere.com/pricing) |
| :237 bge-m3 上限 8192 token | 同硅基文档 | ✅ | [硅基 embeddings API](https://docs.siliconflow.cn/docs/api/embeddings-post) |

### Inferences
- **第12章:52-54 改写**（批次大小交给配置，兼容百炼）：
  ```ts
  // 分批：各家单请求条数上限不同（百炼 v4=10、qwen3.7=20、Voyage=1000、OpenAI 更大），用环境变量配置
  const BATCH = Number(process.env.EMBED_BATCH ?? 10);
  const batches = [];
  for (let i = 0; i < texts.length; i += BATCH) batches.push(texts.slice(i, i + BATCH));
  ```
- **第12章:71 表格行建议改成**：`| 阿里百炼 | text-embedding-v4（或新一代 qwen3.7-text-embedding） | 64-2048 可选（qwen3.7 最高 2560） | ¥0.5/1M（北京；新开通送 100 万 token/90 天；qwen3.7-flash ¥0.125/1M） | 中文质量优先；**单次最多 10 条**（qwen3.7 为 20 条） |`
- 可以在表下加一行「更新的选择」：`硅基 Qwen/Qwen3-Embedding-8B/4B/0.6B（32K 输入、支持 dimensions 降维，价格以模型广场为准）；Jina jina-embeddings-v5-text-small（免费额度仅限非商用）；Voyage voyage-4 系（共享 embedding 空间，含开放权重的 nano）`。
- 和 pgvector 的衔接（第12章:183）：pgvector 的 `vector` 类型建 HNSW 索引最多 2000 维（`halfvec` 4000），所以 text-embedding-3-large（3072）进 pgvector 时要么传 `dimensions` 降维，要么改用 halfvec。见 §4 的来源。

### Gaps
- 硅基 Qwen3-Embedding / Qwen3-Reranker 的官方单价：定价页（[siliconflow.cn/pricing](https://siliconflow.cn/pricing)）抓到的只有 BAAI 系列，没找到一手价格。第三方 OpenRouter 标 Qwen3-Embedding-8B $0.01/M（[OpenRouter](https://openrouter.ai/qwen/qwen3-embedding-8b)），不是硅基官方口径，没有采用。
- OpenAI 页面在批量价格开关下只显示了一个数字，标准价和 Batch 价没有分开核实（R2 记录的 Batch 价是 $0.01/$0.065）。
- Cohere Embed 5 的发布日期、维度和价格没拿到一手数据。

---

## 3. Rerank：模型名、API 形状、价格

### Takeaway
硅基 `bge-reranker-v2-m3` 仍然免费，请求体也和课程一致，✅。Voyage `rerank-3` 的 $0.05/1M ✅。Cohere 在 **2026-10-21 前后发布了 Rerank 5**（`rerank-v5.0-pro`/`-fast`，32K 上下文），课程写的「rerank-v3.5（另有 4.0 系）」已经落后。另外，课程「三家 API 同构、一个适配器通吃」的说法是 **❌**：Voyage 用 `top_k`、返回 `data`；Cohere v2 的路径是 `/v2/rerank`，而且没有 `return_documents` 参数。课程代码把路径硬写成 `/v1/rerank`，并解构 `results`，这样对 Voyage 拿到的是 `undefined`。

### Cited Findings

| 课程声明（file:line） | 2026-11-13 事实 | 判定 | 来源 |
|---|---|---|---|
| 第13章:174「三家 API 同构（query+documents+top_n），一个适配器通吃」；:177 硬写 `${RERANK_BASE_URL}/v1/rerank`；:182 `top_n` + `return_documents`；:185 解构 `results` | **硅基**：`POST https://api.siliconflow.cn/v1/rerank`，参数 `top_n`、`return_documents`（默认 false），响应 `results[{index, relevance_score, document:{text}}]`。**Voyage**：`POST https://api.voyageai.com/v1/rerank`，参数是 **`top_k`**，响应数组叫 **`data`**。**Cohere**：`POST https://api.cohere.com/v2/rerank`，参数 `top_n`、`max_tokens_per_doc`（默认 4096），**v2 请求体里没有 `return_documents`**，响应 `results[{index, relevance_score}]` | ❌ | [硅基 rerank](https://docs.siliconflow.cn/docs/api/rerank-post) · [Voyage reranker API](https://docs.voyageai.com/reference/reranker-api) · [Cohere rerank v2](https://docs.cohere.com/reference/rerank) |
| :192 / 附录B:47 硅基 `BAAI/bge-reranker-v2-m3` **免费** | 定价页：`BAAI/bge-reranker-v2-m3` 标「免费」，`Pro/` 版 ¥0.07/1M；另有 `Qwen/Qwen3-Reranker-8B/4B/0.6B`（支持 `instruction`）和 `Qwen/Qwen3-VL-Reranker-8B`（多模态） | ✅ | [siliconflow.cn/pricing](https://siliconflow.cn/pricing) · [硅基 rerank](https://docs.siliconflow.cn/docs/api/rerank-post) |
| :193「Cohere `rerank-v3.5`（另有 4.0 系）｜按 search unit 计费…单价以官网为准」；附录B:48 | Cohere 官方模型表：`rerank-v5.0-pro`、`rerank-v5.0-fast`（32k，100+ 语言，重点语言含中文）、`rerank-v4.0-pro/fast`（32k）、**`rerank-v3.5` 只有 4k**；API 参考示例已改用 `rerank-v5.0-pro`。pricing 页仍然只定义「A single search unit is defined as one query with up to 100 documents」，**没给单价**。Rerank 5 官方 FAQ 提到「calibrated」分数（同一阈值可以跨 query 使用）和可选的 Context Focus（同一次调用返回最相关的段落） | ⚠️ **[10-22 后变化或同期]** | [Cohere rerank 模型表](https://docs.cohere.com/docs/rerank) · [rerank API](https://docs.cohere.com/reference/rerank) · [cohere.com/pricing](https://cohere.com/pricing) · [cohere.com/rerank](https://cohere.com/rerank) |
| （发布日期与价格） | 多个二手来源说 Rerank 5 于 **2026-10-21** 发布（也有写 10-22 的；OpenRouter 上架是 11-03/04），并报道改成**按 token 计费：Pro $0.05/1M、Fast $0.02/1M**。**这些都没有一手来源佐证** | ⚠️ 未证实 | [MarkTechPost 2026-10-22](https://www.marktechpost.com/2026/10/22/cohere-rerank-5-context-focus/) · [usagepricing.com](https://www.usagepricing.com/blueprint/activity/cohere-2026-10-23-rerank-5-per-token-pricing) · [OpenRouter](https://openrouter.ai/cohere/rerank-5-pro-20261028) |
| :194 / 附录B:49 Voyage `rerank-3` $0.05/1M tokens | 定价页：`rerank-3` $0.05、`rerank-3-lite` $0.02，各自「First 200 million tokens」免费；rerank-2.5 等归入旧模型。**页面内部有矛盾**：API 参考页仍写「recommended」`rerank-2.5`/`rerank-2.5-lite` | ✅（附说明） | [Voyage pricing](https://docs.voyageai.com/docs/pricing) · [Voyage reranker API](https://docs.voyageai.com/reference/reranker-api) |
| （Jina，课程正文未用） | `jina-reranker-v3.5`（2026-07-27，131K 上下文，0.6B）、`jina-reranker-v3`、`jina-reranker-m0`；token 价格和 embedding 共用（$0.05/1M，免费 1000 万 token 仅限非商用） | 可选补充 | [jina.ai/models](https://r.jina.ai/https://jina.ai/models) · [jina.ai/embeddings](https://r.jina.ai/https://jina.ai/embeddings/) |

### Inferences
- **第13章:173-187 建议改写**（按厂商分别适配，不再声称「同构」）：
  ```ts
  // lib/rerank.ts —— 三家「形似而不同构」：参数名、路径、响应字段各不相同
  const CFG = {
    siliconflow: { url: "https://api.siliconflow.cn/v1/rerank", model: "BAAI/bge-reranker-v2-m3", topKey: "top_n" },
    cohere:      { url: "https://api.cohere.com/v2/rerank",     model: "rerank-v5.0-fast",        topKey: "top_n" }, // v2 无 return_documents
    voyage:      { url: "https://api.voyageai.com/v1/rerank",   model: "rerank-3",                topKey: "top_k" }, // 参数叫 top_k
  } as const;
  type Provider = keyof typeof CFG;

  export async function rerank(query: string, documents: string[], topN = 5) {
    const provider = (process.env.RERANK_PROVIDER ?? "siliconflow") as Provider;
    const { url, model, topKey } = CFG[provider];
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RERANK_API_KEY}` },
      body: JSON.stringify({ model: process.env.RERANK_MODEL ?? model, query, documents, [topKey]: topN }),
    });
    if (!res.ok) throw new Error(`rerank(${provider}) ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const hits = (json.results ?? json.data) as { index: number; relevance_score: number }[]; // Voyage 返回 data
    return hits;                                                                               // 按相关度降序，index 指回 documents
  }
  ```
  同时删掉 :176 那句「约定 RERANK_BASE_URL 到厂商根路径为止…」（改用每家完整的 URL）。
- **第13章:190-194 表格建议改成**：
  ```
  | 硅基流动 | `BAAI/bge-reranker-v2-m3`（另有 Qwen/Qwen3-Reranker-8B/4B/0.6B，支持 instruction） | **免费**（Pro 版 ¥0.07/1M；以模型广场为准） | 国内零成本路线收官件 |
  | Cohere | `rerank-v5.0-pro` / `rerank-v5.0-fast`（2026-10 发布，32K；旧 `rerank-v3.5` 仅 4K） | 官方仍以 search unit 定义计费（1 unit = 1 query + ≤100 docs），API 单价以官网/控制台为准 | 分数经校准，可用一个固定阈值过滤弱相关 |
  | Voyage | `rerank-3` / `rerank-3-lite` | $0.05 / $0.02 per 1M tokens，前 200M token 免费 | 参数 `top_k`、响应字段 `data` |
  ```
- **第13章:196「高频短查询场景 Cohere 按次可预期」**：如果二手报道的「Rerank 5 改为按 token 计费」属实，这句就过时了。建议先改成中性说法：「按次（search unit）与按 token 两种计费口径都存在，选型前用你的平均文档长度 × 文档数算一遍月成本」。
- 附录B:48 备注建议改成：「质量标杆；当前一代 Rerank 5（`rerank-v5.0-pro/fast`，32K）；计费口径以官网为准」。

### Gaps
- Cohere Rerank 5 的官方 API 单价和计费单位（按 search unit 还是按 token），一手页面都没列，只有二手报道。
- Cohere `/v1/rerank` 旧端点是否还接受 Rerank 5 模型、有没有弃用时间表，没找到。
- 硅基 rerank 单次最多多少条文档，文档里没写。

---

## 4. 向量库 API：LanceDB TS / Qdrant 混合查询 / pgvector HNSW

### Takeaway
第 12 章 LanceDB 示例有**两处 TypeScript 编译错误**：`Table` 和 `openTable` 都**不是泛型**。还有**两处概念错误**：一是没建索引时 LanceDB 做的是精确暴力 kNN，不是 ANN；二是默认距离是 **L2**，不是余弦。`tableNames()` 已经弃用。Qdrant 的 `query`+`prefetch`+`rrf` 写法仍然对，但 TS 读者其实拿不到 bge-m3 的稀疏向量；Qdrant 1.20 起服务端可以直接跑 BM25 文本查询，应该改用这条路。Drizzle + pgvector 的写法 ✅。

### Cited Findings

**LanceDB（@lancedb/lancedb 0.41.0）**

| 课程（第12章 file:line） | 事实 | 判定 | 来源 |
|---|---|---|---|
| :136 `private table: lancedb.Table<Chunk> \| null` | `export declare abstract class Table {`：**不是泛型** → TS2315「Type 'Table' is not generic」 | ❌ | [table.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.41.0/dist/table.d.ts) |
| :143 `db.openTable<Chunk>("chunks")` | `openTable(name, namespacePath?, options?): Promise<Table>`：**不是泛型** → TS2558「Expected 0 type arguments」 | ❌ | [connection.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.41.0/dist/connection.d.ts) |
| :140 `await db.tableNames()` | `@deprecated Use Connection.listTables instead`（0.40、0.41 都标了）；0.41 的 `listTables()` 返回 `Listing<string>`（只能 `for await`） | ⚠️ 还能用，但已弃用 | 同上 · [listing.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.41.0/dist/listing.d.ts) |
| :144-147「LanceDB 需要第一行推断 schema」，插入全 0 的种子行，再在 :159 用 `.where("text != ''")` 过滤 | 有 `createEmptyTable(name, schema, options?)`（不需要种子行），`CreateTableOptions.existOk` 让「表已存在」时不报错；0.41 还新增了 `mode: "exist_ok"` | ⚠️ 写法绕远了 | [connection.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.41.0/dist/connection.d.ts) · [v0.41.0 release](https://github.com/lancedb/lancedb/releases/tag/v0.41.0) |
| :158 `.search(qv)  // ANN 检索（不扫全库）`；:110「ANN 索引（如 HNSW）把搜索降到亚线性」；:253 练习「search() 背后不再是全扫」 | 官方文档：没有向量索引时做「brute force search… equivalent to a k-nearest neighbours (kNN)」，即「Exact kNN (100% recall)」；索引页还说约 100K 行以内通常不需要建索引（「datasets around 100K rows or fewer」）。课程整章都没有调用 `createIndex("vector", …)` | ❌（课程代码根本没走 ANN） | [vector-search](https://docs.lancedb.com/search/vector-search.md) · [vector-index](https://docs.lancedb.com/indexing/vector-index.md) |
| :33「RAG 里一律用余弦」；:247 坑 5「`_distance`…和余弦相似度方向相反——展示前统一换算」 | 「An unindexed search uses `l2` by default」，`VectorQuery.distanceType` 的 JSDoc 写「By default "l2" is used」；只有用 cosine 时 `_distance = 1 − 余弦相似度`（建了量化索引后是近似值） | ⚠️ 不显式设 `distanceType("cosine")`，就不能按 `1 − _distance` 换算 | [vector-search](https://docs.lancedb.com/search/vector-search.md) · [query.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.41.0/dist/query.d.ts) |
| :158 用 `search(qv)` | `search()` 返回联合类型 `VectorQuery \| Query \| AutoQuery`；`vectorSearch(vector): VectorQuery` 有 `.distanceType()`。官方 quickstart 仍用 `search()` | ⚠️ 想调 distanceType 就用 `vectorSearch` | [table.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.41.0/dist/table.d.ts) · [quickstart](https://docs.lancedb.com/quickstart.md) |
| :160 `.select([... "_distance"])`、:257 `.where()` | quickstart 的 select 里同样写了 `"_distance"`；`where(predicate: string)` 正常，`filter` 已弃用 | ✅ | [quickstart](https://docs.lancedb.com/quickstart.md) · [query.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.41.0/dist/query.d.ts) |
| :167 内置 FTS（BM25）与 hybrid | TS 写法：`await table.createIndex("text", { config: lancedb.Index.fts() })`；`table.search("puppy", "fts")` 或 `table.query().fullTextSearch(q).nearestTo(vec).rerank(await lancedb.rerankers.RRFReranker.create()).limit(10).toArray()`；hybrid「Reciprocal Rank Fusion (RRF) is the default」；`RRFReranker.create(k?: number)` | ✅ | [hybrid-search](https://docs.lancedb.com/search/hybrid-search.md) · [full-text-search](https://docs.lancedb.com/search/full-text-search.md) · [rrf.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.41.0/dist/rerankers/rrf.d.ts) |
| （中文 FTS，课程未提） | `FtsOptions.baseTokenizer` 默认 `"simple"`，可选 `"whitespace" \| "raw" \| "ngram" \| "code" \| "icu" \| "icu/split" \| jieba/${string} \| lindera/${string}`，另有 `ngramMinLength/ngramMaxLength`；文档建议多语言文本用 icu，并说 jieba/lindera 要加载模型文件（文档只给了 Python 示例） | ⚠️ 中文直接用默认分词效果会很差 | [indices.d.ts](https://cdn.jsdelivr.net/npm/@lancedb/lancedb@0.41.0/dist/indices.d.ts) · [full-text-search](https://docs.lancedb.com/search/full-text-search.md) |
| :114 Windows/macOS/Linux 都支持 | optionalDependencies 有 darwin-arm64、linux-x64-gnu/musl、linux-arm64-gnu、win32-x64-msvc 等原生包；engines `node >= 22` | ✅（另补 Node ≥22） | [registry](https://registry.npmjs.org/@lancedb%2Flancedb) |

**Qdrant**

| 课程（file:line） | 事实 | 判定 | 来源 |
|---|---|---|---|
| 第12章:202-213 `new QdrantClient({host, port})` + `client.query(..., { prefetch:[sparse, dense], query:{ rrf:{} }, limit })` | 官方 TS 示例仍是 `query: { rrf: {} }`；参数化 RRF 写 `rrf: { k: 60 }`（v1.16.0 起），加权写 `rrf: { weights: [...] }`（v1.17.0 起）；DBSF 写 `{ fusion: 'dbsf' }` | ✅ | [hybrid-queries](https://qdrant.tech/documentation/search/hybrid-queries/) |
| 第13章:167「Qdrant 服务端 RRF 默认 k=2」「公式相同」 | 「$k$ … set to 2 by default」；「Qdrant uses zero-based rank positions; the top result has r_d = 0」 | ✅ | 同上 |
| 第12章:216「稀疏向量可由 bge-m3 的 sparse 输出提供」 | **[10-22 当天]** Qdrant v1.20.0 + qdrant-js 1.20.0：在建了 BM25 打分的全文 payload 索引上可以直接用 `prefetch: { query: { text: "..." }, using: "<字段名>" }` 做 BM25 查询；索引写法 `field_schema: { type: "text", tokenizer: ..., scoring: { type: "bm25" } }`（REST/部分客户端可简写 `scoring: true`），BM25 的 k/b 在每次查询时设置；tokenizer 有 `word`（默认）/`whitespace`/`prefix`/`multilingual`（「non-space delimiters」）/`code`。硅基的 embeddings 接口是 OpenAI 兼容格式，文档里没有任何返回稀疏向量的参数 | ⚠️ TS 读者实际上拿不到 sparse，应改用服务端 BM25 | [qdrant-js v1.20.0](https://github.com/qdrant/qdrant-js/releases) · [indexing](https://qdrant.tech/documentation/manage-data/indexing/) · [hybrid-queries](https://qdrant.tech/documentation/search/hybrid-queries/) · [硅基 embeddings API](https://docs.siliconflow.cn/docs/api/embeddings-post) |
| 第12章:199「JS 客户端官方同步维护」 | 1.19.0 删除了 `search/recommend/discover*`，统一用 `query` 并返回 `{points}`；课程本来就用 `query` | ✅ | [qdrant-js releases](https://github.com/qdrant/qdrant-js/releases) |

**pgvector + Drizzle（第12章:174-195）**

| 课程 | 事实 | 判定 | 来源 |
|---|---|---|---|
| `vector("embedding", { dimensions: 1024 })`、`index().using("hnsw", t.embedding.op("vector_cosine_ops"))`、`cosineDistance`、需手写 `CREATE EXTENSION vector;` | 和 Drizzle 官方指南一致（R3/V4 已逐项核过；drizzle-orm 仍是 0.45.4，没有新版本） | ✅ | [Drizzle 指南](https://orm.drizzle.team/docs/guides/vector-similarity-search) · [registry](https://registry.npmjs.org/drizzle-orm) |
| （未写 HNSW 参数） | pgvector 0.8.7：HNSW 默认 `m=16`、`ef_construction=64`、`hnsw.ef_search=40`；带过滤的查询可以开 `hnsw.iterative_scan`（strict/relaxed），`hnsw.max_scan_tuples` 默认 20,000；建索引的维度上限 `vector` 2000、`halfvec` 4000 | 可选补充 | [pgvector README](https://github.com/pgvector/pgvector/blob/master/README.md) |
| :195 Prisma pgvector「尚在 ORM 8 RC 阶段」 | `@prisma/orm-extension-pgvector` 8.0.0-rc.23、prisma 8.0.0-rc.33（被打上了 `latest` 标签） | ✅ | [registry](https://registry.npmjs.org/prisma) |
| :225 / :244 Chroma JS 没有嵌入式模式 | 「To connect with the JS/TS client, you must connect to a Chroma server.」 | ✅ | [Chroma clients](https://docs.trychroma.com/docs/run-chroma/clients) |
| :226 Upstash 免费层 10K 请求/天 | 「Daily query/update limit: 10K」、最大 1,536 维、1GB、10 个免费 index | ✅ | [Upstash pricing](https://upstash.com/pricing/vector) |

### Inferences
- **第12章:121-164 建议整体替换为**（按 0.41 的 `.d.ts` 写的，没有实机运行）：
  ```ts
  // lib/vectorstore.ts —— LanceDB 封装（@lancedb/lancedb 0.41.x）
  import * as lancedb from "@lancedb/lancedb";
  import { Field, FixedSizeList, Float32, Schema, Utf8 } from "apache-arrow";
  import { embed } from "./embed";

  const DIM = Number(process.env.EMBED_DIM ?? 1024);   // 与模型绑定！bge-m3=1024, openai-small=1536

  export interface Chunk { id: string; text: string; source: string; vector: number[] }

  const schema = new Schema([
    new Field("id", new Utf8(), false),
    new Field("text", new Utf8(), false),
    new Field("source", new Utf8(), false),
    new Field("vector", new FixedSizeList(DIM, new Field("item", new Float32(), true)), false),
  ]);

  export class VectorStore {
    private table: lancedb.Table | null = null;          // Table 不是泛型

    async init(path = "./data/lancedb") {
      const db = await lancedb.connect(path);            // 目录即数据库（也支持 s3://）
      // 幂等：已存在就直接打开（existOk），不存在才按 schema 建空表——不再需要「种子行」
      this.table = await db.createEmptyTable("chunks", schema, { mode: "create", existOk: true });
    }

    async add(chunks: Omit<Chunk, "vector">[]) {
      const vectors = await embed(chunks.map((c) => c.text));
      await this.table!.add(chunks.map((c, i) => ({ ...c, vector: vectors[i] })));
    }

    async search(query: string, topK = 5) {
      const [qv] = await embed([query]);
      const rows = await this.table!
        .vectorSearch(qv)                                // 未建索引 = 精确 kNN（全扫）；10 万行级再建索引
        .distanceType("cosine")                          // 默认是 l2！cosine 时 _distance = 1 - 余弦相似度
        .select(["id", "text", "source", "_distance"])
        .limit(topK)
        .toArray();
      return rows as (Omit<Chunk, "vector"> & { _distance: number })[];
    }
  }
  ```
  如果不想依赖 `existOk` 的语义，可以退回最稳的写法：`try { this.table = await db.openTable("chunks"); } catch { this.table = await db.createEmptyTable("chunks", schema); }`。
- **第12章:110 补一句**：「LanceDB 在**没建向量索引时做的就是精确暴力 kNN**（官方：约 10 万行以内一般不需要索引）；数据量上来后执行 `await table.createIndex("vector", { config: lancedb.Index.ivfPq({ distanceType: "cosine" }) })`，查询才走 ANN。」
- **第12章:253 练习 2 建议改成**：「换 LanceDB 重写同一应用（12.4），先塞 500 条，再用脚本生成 20 万条，分别在 `createIndex` 前后计时并对比 Top10 是否一致——前者是精确 kNN 全扫，后者才是 ANN（近似，召回可能下降）。」
- **第12章:247 坑 5 建议改成**：「`_distance` 是**距离**（越小越近），而且默认是 **L2**；只有 `.distanceType("cosine")` 时才满足 `余弦相似度 = 1 − _distance`。」
- **第12章:167 补中文提示**：「中文全文检索要换分词器：`lancedb.Index.fts({ baseTokenizer: "ngram", ngramMinLength: 2, ngramMaxLength: 3 })` 或 `baseTokenizer: "icu"`。默认 `simple` 按空格和标点切，对中文基本无效。」（选项名来自 0.41 的 `indices.d.ts`，中文效果没实测。）
- **第12章:201-216 Qdrant 示例建议改成**（1.20 起不用自备稀疏向量）：
  ```ts
  import { QdrantClient } from "@qdrant/js-client-rest";   // 1.20.x，Node ≥ 22；服务端 ≥ 1.20
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
  :216 的说明建议改成：「（Qdrant 1.20 起，可以直接对带 BM25 打分的全文索引做 `{ text }` 查询；硅基等 OpenAI 兼容接口只返回稠密向量，拿不到 bge-m3 的 sparse 输出。纯客户端路线见第 13 章手写 RRF。）」
- 第12章:224 选型表里 Qdrant 一行的「混合检索」可以改成「服务端 BM25 + RRF（1.20+）」。

### Gaps
- 没有确认 Qdrant `multilingual` tokenizer 在官方 Docker 镜像里对**中文**的实际分词效果：文档只说它能处理「non-space delimiters」，提到的 CJK 例子是日文 vaporetto。
- 0.41 的 `createEmptyTable(..., { existOk: true })` 在表已存在时是返回已有表还是另有行为，只依据 JSDoc，没跑过。
- LanceDB TS 的 `RRFReranker.create()` 默认 k 是多少，`.d.ts` 里没写。
- LanceDB embedding functions（`lancedb.embedding` 命名空间）的 TS 用法没深挖，课程也没用到。

---

## 5. MiniSearch 与文档解析/切片：按课程的用法写，API 对不对？

### Takeaway
上一轮审计指出的 `.then` 误用**已经修好**：第13章:147 用 `Promise.resolve(this.mini.search(...))`，而 `search` 确实是同步的，✅。但 MiniSearch 还有三个问题：**默认分词器对中文无效（❌，混合检索的关键词那一路实际上召回为空）**；`addAll` 遇到重复 id 会抛错，和「幂等可重跑」冲突；索引只在内存里，`pnpm ingest` 和 `pnpm dev` 是两个进程，服务进程里的索引是空的。另外：`marked.parse(raw)` 的类型是 `string | Promise<string>`，传给 `cheerio.load` 会编译失败；第13章:98 的 import 路径错了；RecursiveCharacterTextSplitter 默认没有句子级分隔符，并且按字符计长度。

### Cited Findings

| 课程（第13章 file:line） | 事实 | 判定 | 来源 |
|---|---|---|---|
| :147 `Promise.resolve(this.mini.search(query).map((r2) => String(r2.id)))`，注释「MiniSearch.search 是同步返回数组」 | 7.2.0 源码：`search(query, searchOptions = {}) {` 同步返回数组，元素是 `{ id, score, terms, queryTerms, match, ...storeFields }` | ✅（`.then` 问题已修） | [minisearch 7.2.0 源码](https://cdn.jsdelivr.net/npm/minisearch@7.2.0/dist/es/index.js) |
| :135 `MiniSearch<{id,text,source}>` 由外部注入，全章都没写 `new MiniSearch(...)` | 构造函数必须传 `fields`（否则抛出「option "fields" must be provided」）；默认 `tokenize: (text) => text.split(SPACE_OR_PUNCTUATION)`，其中 `SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}]+/u`；README 说可以用 `tokenize` 选项自定义 | ❌（缺中文分词器，也缺构造示例） | 同上 · [README](https://cdn.jsdelivr.net/npm/minisearch@7.2.0/README.md) |
| （实测默认分词器的正则，本机 Node 24.22 / ICU 78.3） | 文档「本公司支持 7 天无理由退货，需保持商品完好。」被切成 `["本公司支持","7","天无理由退货","需保持商品完好",""]`；查询「退货政策是什么」切成 `["退货政策是什么"]` → 一个词都对不上。换成 `Intl.Segmenter("zh",{granularity:"word"})` 后，文档切成 `["本公司","支持","7","天","无","理由","退","货",…]`，查询切成 `["退","货","政策","是","什么"]` → 能命中 | ❌ → 改用 `Intl.Segmenter` | 本机执行（只跑了 MiniSearch 源码里的那条正则，没有加载 minisearch 包） |
| :140-142 `index()` 里调用 `this.mini.addAll(chunks)`；:309/:322 要求「可重复跑、第二次不产生重复 chunk」 | `addAll` 逐条调用 `add`，`add` 遇到已有 id 会抛出「MiniSearch: duplicate ID」；7.2.0 有 `has`、`discard`、`discardAll`、`replace`、`toJSON`、`static loadJSON`、`static loadJSONAsync` | ⚠️ | [minisearch 源码](https://cdn.jsdelivr.net/npm/minisearch@7.2.0/dist/es/index.js) |
| :56 `const html = marked.parse(raw);` 注释「同步返回 string」 | marked 18.2.0 的类型：`marked(src, options?: MarkedOptions \| null): string \| Promise<string>`，`marked.parse` 就是 `typeof marked`；只有传 `{ async: false }` 时返回类型才是 `string`。运行时默认确实同步 | ⚠️（运行没问题，但 `cheerio.load(html)` 的参数是联合类型，严格 TS 下报 TS2345） | [marked 18.2.0 d.ts](https://cdn.jsdelivr.net/npm/marked@18.2.0/lib/marked.d.ts) |
| :40-51 pdf-parse v2 `PDFParse` / `getText()` / `result.pages` / `destroy()` | 2.4.5 没有新版本（R3/V4 已按 `.d.ts` 核过）；LangChain 官方 RAG 教程也用 `PDFParse` | ✅ | [registry](https://registry.npmjs.org/pdf-parse) · [LangChain knowledge-base](https://docs.langchain.com/oss/javascript/langchain/knowledge-base.md) |
| :72 `RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 })`「LangChain 官方教程参数」 | 官方教程仍然是 1000/200 | ✅ | [LangChain knowledge-base](https://docs.langchain.com/oss/javascript/langchain/knowledge-base.md) |
| :76「按分隔符优先级（段落→句子→字符）递归切」 | 源码默认 `separators = ["\n\n", "\n", " ", ""]`：段落→行→**空格**→单字符，**没有句子级**；`lengthFunction` 默认是 `text.length`（**按字符计**）；`keepSeparator` 默认 true | ❌（描述不准确；中文没有空格，换行之后会直接按字符硬切） | [text_splitter.ts](https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-textsplitters/src/text_splitter.ts) |
| :115「textsplitters 没有 SemanticChunker」「Mastra `@mastra/rag` 内置 `semantic-markdown`」 | 导出的类只有 TextSplitter/Character/RecursiveCharacter/Token/Markdown/Latex；Mastra 的 chunk 策略里仍有 `semantic-markdown`（参数是 `maxSize`，默认 4000，`overlap` 默认 200，不叫 `size`） | ✅ | 同上 · [Mastra chunk](https://mastra.ai/reference/rag/chunk.md) |
| :97-99 `import { embed } from "../lib/embeddings"`；`import { cosineSim } from "../lib/vec"` | 第12章:40 定义的文件是 `lib/embed.ts`；`cosineSim` 在第12章:85 只是 mini-search.ts 里的局部函数。R9 审计（2026-10-22）给出的修复是 `../lib/embed`，现文仍是 `../lib/embeddings` | ❌（模块找不到） | 课程第12章:40/85；`research/R9-教程完成度审计-2026-10-22.md:164,209` |

### Inferences
- **新增 `lib/keyword.ts`，并修改第13章:127-152**（中文分词 + 持久化 + 幂等）：
  ```ts
  // lib/keyword.ts —— 中文可用的 MiniSearch 关键词索引
  import MiniSearch from "minisearch";
  import { readFile, writeFile } from "node:fs/promises";

  export type KDoc = { id: string; text: string; source: string };
  const seg = new Intl.Segmenter("zh", { granularity: "word" });
  // MiniSearch 默认只按空格/标点切词，中文整句会变成一个「词」——必须换分词器（检索时默认复用同一个 tokenize）
  export const tokenize = (text: string) =>
    [...seg.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment);

  const OPTIONS = { fields: ["text"], storeFields: ["source"], tokenize };
  export const createKeywordIndex = () => new MiniSearch<KDoc>(OPTIONS);

  // ingest 与 dev 是两个进程：入库后落盘，服务启动时加载
  export const saveKeywordIndex = (mini: MiniSearch<KDoc>, path = "./data/minisearch.json") =>
    writeFile(path, JSON.stringify(mini));
  export const loadKeywordIndex = async (path = "./data/minisearch.json") =>
    MiniSearch.loadJSON<KDoc>(await readFile(path, "utf-8"), OPTIONS);
  ```
  `HybridRetriever.index` 里的 `this.mini.addAll(chunks);` 改成：
  ```ts
  for (const c of chunks) this.mini.has(c.id) ? this.mini.replace(c) : this.mini.add(c);   // addAll 遇重复 id 会抛错
  ```
  补充说明（推断）：在 ICU 78 下 `Intl.Segmenter` 会把「退货」切成「退」「货」两个单字，召回会偏宽；如果关键词那一路噪声太大，可以再叠加 CJK 二元组（bigram）分词。这一点值得放进练习，让读者在调试台里对比两种分词的效果。
- **第13章:56 改成**：`const html = marked.parse(raw, { async: false });   // 显式同步：返回类型就是 string`
- **第13章:72-76 建议改成**（中文语料）：
  ```ts
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,      // 按「字符」计：中文 500 字的信息量≈英文 1000+ 字符，1000/200 是英文语料的起点
    chunkOverlap: 80,
    separators: ["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""],   // 默认没有中文句读，需自己加
  });
  ```
  原理那句改成：「按分隔符优先级递归切（默认 `["\n\n", "\n", " ", ""]`：段落→行→空格→单字符，**默认没有句子级**，中文要自己加 `。！？；，`）；`chunkSize` 按**字符数**计……」。500/80 只是为中文给的起点，不是测量结论，课程 13.8 用评测集扫参数的建议照样适用。
- **第13章:98-99 改成**：`import { embed } from "../lib/embed";` 和 `import { cosineSim } from "../lib/vec";`，同时在第12章 12.3 节把 `cosineSim` 抽到 `lib/vec.ts` 并 `export`。
- 项目 2 只要求 PDF/MD/TXT。如果要扩展到 DOCX，可以用 `mammoth` 1.13.0（[registry](https://registry.npmjs.org/mammoth)）；`unpdf` 2.x 要求 Node ≥24（[registry](https://registry.npmjs.org/unpdf)），R3 底稿里「Node/Bun/Deno/Workers 通用」的描述需要加上这个前提。

### Gaps
- 没有在真实 MiniSearch 包上跑 `Intl.Segmenter` 分词后的检索效果（只验证了分词输出）；`MiniSearch.loadJSON<T>` 的泛型签名是按经验写的，没有核对 `.d.ts`。
- 没找到 Orama 中文分词器（`@orama/tokenizers`）的一手资料，所以没有把它列为替代方案。

---

## 6. 当前最佳实践：切片、RRF 混合检索、重排、引用，以及 2026 年值得补进课程的进展

### Takeaway
课程的主干是混合检索 + RRF（k=60）+ cross-encoder 重排 + 句末编号引用，这和当前主流做法一致，✅。值得补进 13.7「进阶路线图」的有四项：**Contextual Retrieval**（Anthropic，召回失败率最多降 67%）、**Late Chunking**（Jina API 已有 `late_chunking` 参数）、**Rerank 5 的分数校准**（可以用固定阈值做拒答或二次检索）、**Qdrant 1.20 服务端 BM25**。

### Cited Findings
- RRF：Qdrant 的公式是 Σ1/(k+r)，r 从 0 开始，默认 k=2；课程的 `rrf()` 用 0 基名次、k=60，和 Qdrant「同一公式」✅（第13章:157-167）— [Qdrant hybrid-queries](https://qdrant.tech/documentation/search/hybrid-queries/)。LanceDB 的 hybrid 默认也用 RRF 融合 — [LanceDB hybrid-search](https://docs.lancedb.com/search/hybrid-search.md)。原论文用 1 基名次、k=60（Cormack et al., SIGIR 2009）— [论文 PDF](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- Contextual Retrieval（2024-09-19）：用 LLM 给每个块生成 50-100 token 的「块在全文中的位置说明」，拼接后再做 embedding 和 BM25。top-20 召回失败率：Contextual Embeddings 降低 **35%**（5.7%→3.7%），再加 Contextual BM25 降低 **49%**（→2.9%），再加 rerank 降低 **67%**（→1.9%）；文章建议取 top-20；配合 prompt caching，一次性成本约 **$1.02 / 百万文档 token** — [Anthropic Engineering](https://www.anthropic.com/engineering/contextual-retrieval)
- Late Chunking：Jina Embeddings API 支持 `late_chunking` 参数，先对整篇文档做 embedding，再从 token 级表示派生每个块的向量 — [jina.ai/embeddings](https://r.jina.ai/https://jina.ai/embeddings/)
- Rerank 5：分数「mean roughly the same thing across queries, so one threshold works everywhere」；Context Focus 可以在同一次调用里返回每篇文档最相关的段落 — [cohere.com/rerank](https://cohere.com/rerank)
- 切片：Chroma 的研究（2024-07）认为 RecursiveCharacterTextSplitter 这类启发式切法「parametrized appropriately」时效果往往不错，并提出 token 级 IoU/recall/precision 作为切片评测指标 — [Chroma research](https://research.trychroma.com/evaluating-chunking)
- Qdrant 1.20：BM25 可以直接作用在全文 payload 索引上，见 §4 — [qdrant releases](https://github.com/qdrant/qdrant/releases)
- 带过滤的向量检索（课程练习 4/5 的多租户和部门过滤）：pgvector 0.8 起提供 `hnsw.iterative_scan`，解决过滤后结果不足的问题 — [pgvector README](https://github.com/pgvector/pgvector/blob/master/README.md)；LanceDB 默认 prefilter，`.postfilter()` 可能返回少于 limit 的结果 — [LanceDB vector-search](https://docs.lancedb.com/search/vector-search.md)

### Inferences
- **第13章:229-238 表格建议追加三行**：
  ```
  | Contextual Retrieval | 切片丢失上下文（「该公司」「上季度」指谁） | 入库时让 LLM 为每块写 50-100 token 的「块在全文中的位置说明」拼在块前再 embed + BM25；Anthropic 实测 top-20 召回失败率 -49%（再加 rerank -67%），一次性成本可用 prompt caching 压低 |
  | Late Chunking | 块向量缺全文语境 | 先对整篇长文档做 token 级编码，再按块边界池化成块向量（Jina API 参数 `late_chunking`；需长上下文 embedding 模型） |
  | 分数阈值拒答 | 检索结果全不相关仍硬答 | 用校准过的 rerank 分数（如 Cohere Rerank 5）设统一阈值：低于阈值直接走「资料不足」或触发二次检索 |
  ```
- 第13章:165「三条实现路线」里 Qdrant 那条可以写成「Qdrant 服务端 BM25 + RRF（1.20+，不用自备稀疏向量）」。
- 第13章:171「拿回 20-50 条…选出 top 3-5」与 Anthropic 推荐的 top-20 不冲突（他们说的是最终送进生成的块数）。可以补一句：「最终送进生成的块数也要用评测集扫（5/10/20）」。
- 生成与引用（13.6）的四个设计点没有发现过时内容。

### Gaps
- 没找到 2026 年针对**中文** RAG 切片尺寸的一手基准，所以 §5 的 500/80 只是基于字符与 token 换算的推断。
- 2026 年在 TS 生态里有没有成熟的 contextual retrieval / late chunking 现成实现（比如 Mastra、LangChain.js），没有查。

---

## 7. TypeScript 里能用的 RAG 评测工具：课程的 promptfoo 写法对不对？

### Takeaway
promptfoo 的 `context-recall`/`context-faithfulness` 断言名称 ✅，但第13章:255-260 的 YAML **跑不起来，或者测的不是想测的东西（⚠️/❌）**：`context-faithfulness` **必须**提供 `context`（写在 vars 里，或用 `contextTransform` 从 provider 输出里取），也不使用 `value`；`context-recall` 的 `value` 应该写**标准答案陈述**，不是一条指令；验收里的「≥0.8」需要写成 `threshold: 0.8`。autoevals 0.4.1 提供 RAGAS 系列的 TS scorer（`autoevals/ragas`），可以作为代码内评测的补充。

### Cited Findings
- `context-faithfulness`：「`query` - Required」「`context` - Required. Reference text (in vars or via `contextTransform`)」，默认阈值 0.5；RAG 系统可以用 `contextTransform: 'output.context'` 从输出中取上下文；文档里没有提到 `value` — [promptfoo context-faithfulness](https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/context-faithfulness/)
- `context-recall`：`value`（required）是「Expected answer/ground truth」；`context` 可选，不提供时「uses the prompt as context」；评分方式是把标准答案拆成陈述，计算能在 context 里找到出处的比例；默认阈值 0.5 — [promptfoo context-recall](https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/context-recall/)
- 每条断言都可以单独设置 `transform`（「Process the output before running the assertion」）和 `contextTransform`；RAG 相关断言有 context-recall、context-relevance、context-faithfulness、answer-relevance — [promptfoo expected-outputs](https://www.promptfoo.dev/docs/configuration/expected-outputs/)
- promptfoo latest 0.125.1（2026-10-25，**[10-22 后变化]**），engines `node >=22.22.0` — [registry](https://registry.npmjs.org/promptfoo)
- autoevals 0.4.1 的 RAG scorer：ContextRelevancy（input, output, context）、ContextRecall（expected, context）、ContextPrecision（input, expected, context）、ContextEntityRecall、Faithfulness（output, context）、AnswerRelevancy、AnswerSimilarity、AnswerCorrectness，从 `autoevals/ragas` 导入；示例 `await Faithfulness({ input, output, context: [...] })` — [autoevals SCORERS.md](https://raw.githubusercontent.com/braintrustdata/autoevals/main/SCORERS.md) · [README](https://raw.githubusercontent.com/braintrustdata/autoevals/main/README.md)

### Inferences
- **第13章:250-261 建议替换为**（provider 需要返回 `{ answer, context }`）：
  ```yaml
  # promptfooconfig-rag.yaml（节选）——RAG provider 返回 { answer: string, context: string }
  tests:
    - vars: { query: "退货政策是什么" }
      assert:
        - type: contains
          transform: output.answer            # 只在回答文本上查，别把召回片段也算进去
          value: "7 天"                        # 事实命中
        - type: context-recall                # 标准答案里的事实，能否在召回片段中找到出处
          value: "本公司支持 7 天无理由退货，商品需保持完好"   # 写「标准答案陈述」，不是指令
          contextTransform: output.context
          threshold: 0.8                      # 对应 13.9 验收「context-recall ≥ 0.8」
        - type: context-faithfulness          # 回答中的陈述是否都有片段支撑（不需要 value）
          contextTransform: output.context
          threshold: 0.8
  ```
  第13章:257 的注释「该召回的片段召回了没」可以保留，但最好补一句：它衡量的是「标准答案能否从召回内容中推出」。
- 代码内评测（第 15 章衔接）可以补一段：
  ```ts
  import { Faithfulness, ContextRecall } from "autoevals/ragas";
  const f = await Faithfulness({ input: query, output: answer, context: hits.map((h) => h.text) });
  const r = await ContextRecall({ input: query, expected: goldAnswer, context: hits.map((h) => h.text) });
  ```
  （`ContextRecall` 是否必须传 `input`，SCORERS.md 只列了 expected/context，传上无害。没有实跑。）
- 附录B:131 的 `promptfoo 0.124.x` 改成 `0.125.x`。

### Gaps
- 断言级 `transform: output.answer` 和同一断言上的 `contextTransform: output.context` 同时使用时，执行顺序和互相影响如何（`contextTransform` 拿到的是原始 output 还是 transform 之后的），文档没说清，没有实跑验证。
- 0.125.x 的变更日志没有逐条阅读，不排除 context-* 断言有细微变化（文档页面是当天抓取的，内容和上面一致）。
