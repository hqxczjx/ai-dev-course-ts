// rag/keyword.ts —— 中文可用的 BM25 关键词索引（MiniSearch 7.x；第 13 章 13.4）
//
// 三个坑都在这里处理：
// 1. MiniSearch 默认按空格和标点切词，一整句中文会变成一个「词」，中文查询几乎永远返回空——必须换分词器。
// 2. addAll() 遇到重复 id 直接抛错（"duplicate ID"）——重复入库要用 has/replace 做 upsert。
// 3. 索引只在内存里：入库脚本和问答服务是两个进程，入库后要落盘，服务启动时再加载。
import MiniSearch, { type Options } from "minisearch";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { canSee, PUBLIC, type ChunkInput, type ChunkRecord, type SearchFilter } from "../lib/vectorstore";

export interface KeywordHit extends ChunkRecord {
  score: number; // BM25 分（只在本路内部可比，不能和向量分数直接相加——所以融合用 RRF 的名次）
}

const segmenter = new Intl.Segmenter("zh", { granularity: "word" }); // Node 内置 ICU，不用装 jieba

/**
 * 中文分词：Intl.Segmenter 按词典切词；词典外的词会被切成单字（「退货」→「退」「货」），
 * 所以再把相邻的单个汉字拼成二元组补回来（「退货」「顺丰」）。查询与入库用同一个函数。
 */
export function tokenizeZh(text: string): string[] {
  const words = [...segmenter.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment);
  const out = [...words];
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i]!;
    const b = words[i + 1]!;
    if (isSingleHan(a) && isSingleHan(b)) out.push(a + b);
  }
  return out;
}

const isSingleHan = (w: string) => /^\p{Script=Han}$/u.test(w);

// 高频虚词/疑问词：几乎每篇文档都有，只会稀释 BM25 分数
const STOP_WORDS = new Set(["的", "了", "是", "吗", "呢", "吧", "啊", "和", "与", "及", "或", "在", "有", "我", "你", "们", "什么", "怎么", "如何", "哪些", "多少"]);

type StoredDoc = { id: string; text: string; source: string; visibleTo: string[] };

const OPTIONS: Options<StoredDoc> = {
  fields: ["text"],                               // 参与检索的字段（必填，否则构造时抛错）
  storeFields: ["text", "source", "visibleTo"],   // 随结果返回的字段：权限过滤和拼上下文都要用
  tokenize: tokenizeZh,                           // 检索时默认复用同一个分词器
  processTerm: (term) => (STOP_WORDS.has(term) ? null : term.toLowerCase()),
};

export class KeywordIndex {
  private constructor(private readonly mini: MiniSearch<StoredDoc>) {}

  static create(): KeywordIndex {
    return new KeywordIndex(new MiniSearch<StoredDoc>(OPTIONS));
  }

  /** 从磁盘加载（文件不存在时返回空索引）。注意 loadJSON 必须传入与建索引时相同的选项 */
  static async load(path: string): Promise<KeywordIndex> {
    let json: string;
    try {
      json = await readFile(path, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return KeywordIndex.create();
      throw err;
    }
    return new KeywordIndex(MiniSearch.loadJSON<StoredDoc>(json, OPTIONS));
  }

  async save(path: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(this.mini)); // MiniSearch 实现了 toJSON()
  }

  get size(): number {
    return this.mini.documentCount;
  }

  /** 幂等写入：已有同 id 就替换，没有就新增（addAll 遇到重复 id 会抛错） */
  upsert(chunks: ChunkInput[]): void {
    for (const c of chunks) {
      const doc: StoredDoc = { id: c.id, text: c.text, source: c.source, visibleTo: c.visibleTo ?? [PUBLIC] };
      if (this.mini.has(doc.id)) this.mini.replace(doc);
      else this.mini.add(doc);
    }
  }

  /** 整个来源文件重建：先删掉这个来源的全部旧 chunk，再写入新的 */
  replaceSource(source: string, chunks: ChunkInput[]): void {
    const old = this.mini
      .search(MiniSearch.wildcard, { filter: (r) => r.source === source })
      .map((r) => r.id);
    this.mini.discardAll(old);
    this.upsert(chunks);
  }

  search(query: string, topK = 20, filter: SearchFilter = {}): KeywordHit[] {
    const { roles, source } = filter;
    return this.mini
      .search(query, {
        // filter 在 MiniSearch 内部、截断 topK 之前执行：无权看的 chunk 不会占掉名额
        filter: (r) =>
          (roles === undefined || canSee(r.visibleTo as string[], roles)) &&
          (source === undefined || r.source === source),
      })
      .slice(0, topK)
      .map((r) => ({
        id: String(r.id),
        text: String(r.text),
        source: String(r.source),
        visibleTo: r.visibleTo as string[],
        score: r.score,
      }));
  }
}
