// lib/vectorstore.ts —— LanceDB 向量库封装（第 12 章 12.4；@lancedb/lancedb 0.41.x）
//
// 和网上旧写法的四处不同（都按 0.41 的类型定义与官方文档改过）：
// 1. `lancedb.Table` 不是泛型，`openTable` 也不收类型参数——行类型自己声明、查询结果自己转换。
// 2. 建表用 createEmptyTable + 显式 Arrow schema + existOk：表已存在就直接打开，不需要「种子行」，也不会误清库。
// 3. 查询用 vectorSearch().distanceType("cosine")：LanceDB 默认距离是 L2，不设就不能用「1 − 距离」换算余弦相似度。
// 4. 没有建向量索引时，LanceDB 做的是精确暴力 kNN（全表扫描、召回 100%）；约 10 万行以内一般不用建索引。
import type { Table } from "@lancedb/lancedb";
import { Field, FixedSizeList, Float32, List, Schema, Utf8 } from "apache-arrow";
import { openAIEmbedder, type Embedder } from "./embed";

/** 所有人可见的标记。chunk 的 visibleTo 含它时，任何角色都能检索到。 */
export const PUBLIC = "public";

export interface ChunkRecord {
  id: string;          // 稳定 ID（如 `faq.md#3`）：重复入库时按它覆盖，而不是再插一份
  text: string;
  source: string;      // 来源文件（引用溯源、按文件重建都靠它）
  visibleTo: string[]; // 可见角色（第 13 章权限过滤）；["public"] = 所有人
}

/** 入库时可以不写 visibleTo，默认所有人可见 */
export type ChunkInput = Omit<ChunkRecord, "visibleTo"> & { visibleTo?: string[] };

export interface VectorHit extends ChunkRecord {
  distance: number; // LanceDB 的 _distance：越小越近（cosine 时 = 1 − 余弦相似度）
  score: number;    // 换算后的余弦相似度：越大越像
}

export interface SearchFilter {
  roles?: string[]; // 只检索这些角色可见的 chunk（检索前过滤）；不传 = 不做权限过滤（内部工具用）
  source?: string;  // 只在某个来源里检索
}

export interface VectorStoreOptions {
  embedder?: Embedder;
  dim?: number;       // 与 embedding 模型绑定！bge-m3=1024，text-embedding-3-small=1536
  tableName?: string;
}

export class VectorStore {
  private table: Table | null = null; // Table 不是泛型
  private readonly embed: Embedder;
  private readonly dim: number;
  private readonly tableName: string;

  constructor(opts: VectorStoreOptions = {}) {
    this.embed = opts.embedder ?? openAIEmbedder();
    this.dim = opts.dim ?? Number(process.env.EMBED_DIM ?? 1024);
    this.tableName = opts.tableName ?? "chunks";
  }

  /** 幂等打开：表不存在就按 schema 建空表，存在就直接打开（重启服务不会清库） */
  async init(path = process.env.LANCEDB_PATH ?? "./data/lancedb"): Promise<this> {
    // 原生模块按需加载：只用关键词索引、canSee 或跑其他离线测试时，不必加载上百 MB 的原生库
    const lancedb = await import("@lancedb/lancedb");
    const db = await lancedb.connect(path); // 目录即数据库（也支持 s3:// 等对象存储）
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
    const rows = await this.toRows(chunks);
    await this.t().mergeInsert("id").whenMatchedUpdateAll().whenNotMatchedInsertAll().execute(rows);
  }

  /**
   * 整个来源文件重建：新 chunk 按 id 覆盖/插入，该来源下「这次没有出现」的旧 chunk 删除——一次事务完成。
   * 用于文档修改后重新入库（切片数变少时，旧的尾巴不会残留）。
   */
  async replaceSource(source: string, chunks: ChunkInput[]): Promise<void> {
    if (chunks.some((c) => c.source !== source)) throw new Error(`replaceSource：所有 chunk 的 source 必须是 ${source}`);
    if (chunks.length === 0) return this.deleteBySource(source);
    const rows = await this.toRows(chunks);
    await this.t()
      .mergeInsert("id")
      .whenMatchedUpdateAll()
      .whenNotMatchedInsertAll()
      .whenNotMatchedBySourceDelete({ where: `source = ${sqlString(source)}` })
      .execute(rows);
  }

  async deleteBySource(source: string): Promise<void> {
    await this.t().delete(`source = ${sqlString(source)}`);
  }

  async count(): Promise<number> {
    return this.t().countRows();
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
        id: String(r.id),
        text: String(r.text),
        source: String(r.source),
        visibleTo: toStrings(r.visibleTo),
        distance,
        score: 1 - distance,
      };
    });
  }

  private t(): Table {
    if (!this.table) throw new Error("VectorStore 还没 init()：先 await store.init()");
    return this.table;
  }

  private async toRows(chunks: ChunkInput[]) {
    const vectors = await this.embed(chunks.map((c) => c.text));
    return chunks.map((c, i) => {
      const vector = vectors[i];
      if (!vector || vector.length !== this.dim) {
        // 维度不一致直接拒绝：换了 embedding 模型却没重建库，算出来的相似度全是垃圾（12.7）
        throw new Error(`向量维度 ${vector?.length} ≠ 表的维度 ${this.dim}：换模型必须全量重建`);
      }
      return { id: c.id, text: c.text, source: c.source, visibleTo: c.visibleTo ?? [PUBLIC], vector };
    });
  }
}

/** 角色能否看到这个 chunk（检索之外的地方——比如测试、调试台——也用同一个判断） */
export function canSee(visibleTo: readonly string[], roles: readonly string[]): boolean {
  return visibleTo.includes(PUBLIC) || visibleTo.some((r) => roles.includes(r));
}

function whereClause({ roles, source }: SearchFilter): string | undefined {
  const parts: string[] = [];
  // 列名有大写字母，要用反引号括起来
  if (roles) parts.push(`array_has_any(\`visibleTo\`, [${[PUBLIC, ...roles].map(sqlString).join(", ")}])`);
  if (source !== undefined) parts.push(`source = ${sqlString(source)}`);
  return parts.length ? parts.join(" AND ") : undefined;
}

/** SQL 字符串字面量：单引号转义，避免把用户输入拼进过滤条件时被注入 */
function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/** Arrow 的 List 列读出来是 Vector 对象而不是数组，转成普通 string[] */
function toStrings(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (v && typeof v === "object" && Symbol.iterator in v) return Array.from(v as Iterable<unknown>, String);
  return [];
}
