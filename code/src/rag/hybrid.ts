// rag/hybrid.ts —— 混合检索：向量 + BM25 + 手写 RRF，检索前按用户可见范围过滤（第 13 章 13.4）
import { canSee, type ChunkRecord, type SearchFilter } from "../lib/vectorstore";

/** 任何一路检索只要满足这个形状就能接进来：VectorStore、KeywordIndex 都满足 */
export interface Searcher {
  search(query: string, topK: number, filter: SearchFilter): Promise<ChunkRecord[]> | ChunkRecord[];
}

export interface User {
  id: string;
  roles: string[]; // 如 ["employee"]、["employee", "hr"]；公开文档对所有人可见
}

export interface FusedHit extends ChunkRecord {
  rrf: number;                                 // 融合分
  ranks: { semantic?: number; keyword?: number }; // 在各路榜单里的名次（从 1 起，调试台展示用）
}

/**
 * RRF（Reciprocal Rank Fusion）：每条榜单按名次贡献 1/(k + 名次)，累加后排序。
 * 只用名次、不用分值——向量的余弦分和 BM25 分量纲不同，不能直接相加，这正是 RRF 成为行业默认的原因。
 * 名次从 1 起、k=60，与原论文（Cormack et al., 2009）一致。
 */
export function rrf(rankLists: string[][], k = 60): Map<string, number> {
  const scores = new Map<string, number>();
  for (const list of rankLists) {
    list.forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)));
  }
  return new Map([...scores.entries()].sort((a, b) => b[1] - a[1]));
}

export interface RetrieveOptions {
  topEach?: number; // 每一路召回多少条（「别漏」）
  topN?: number;    // 融合后保留多少条交给 rerank
  k?: number;
}

export class HybridRetriever {
  constructor(
    private readonly semantic: Searcher,
    private readonly keyword: Searcher,
  ) {}

  async retrieve(query: string, user: User, opts: RetrieveOptions = {}): Promise<FusedHit[]> {
    const { topEach = 20, topN = 10, k = 60 } = opts;
    // 权限过滤在检索「之前」：把用户角色交给每一路，让它们只在可见范围里找。
    // 如果先检索再过滤：topK 名额被无权文档占掉、召回变少，而且无权内容已经进过内存/日志/缓存。
    const filter: SearchFilter = { roles: user.roles };
    const [sem, kw] = await Promise.all([
      this.semantic.search(query, topEach, filter),
      this.keyword.search(query, topEach, filter),
    ]);

    const byId = new Map<string, ChunkRecord>();
    for (const c of [...sem, ...kw]) {
      // 纵深防御：万一某一路实现忘了过滤，这里再拦一次，绝不把无权内容交给下游
      if (!canSee(c.visibleTo, user.roles)) throw new Error(`权限过滤失效：${c.id} 对 ${user.id} 不可见`);
      byId.set(c.id, c);
    }

    const semIds = sem.map((c) => c.id);
    const kwIds = kw.map((c) => c.id);
    const fused = rrf([semIds, kwIds], k);
    return [...fused.entries()].slice(0, topN).map(([id, score]) => {
      const c = byId.get(id)!;
      const s = semIds.indexOf(id);
      const w = kwIds.indexOf(id);
      return {
        id: c.id,
        text: c.text,
        source: c.source,
        visibleTo: c.visibleTo,
        rrf: score,
        ranks: { ...(s >= 0 ? { semantic: s + 1 } : {}), ...(w >= 0 ? { keyword: w + 1 } : {}) },
      };
    });
  }
}
