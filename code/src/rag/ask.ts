// rag/ask.ts —— 在线问答管道：混合检索 → Rerank → 生成 + 引用校验（第 13 章 13.6）
import type { ChatFn } from "../lib/extract";
import { answerWithCitations, type AnswerResult } from "./answer";
import type { FusedHit, HybridRetriever, User } from "./hybrid";
import { noRerank, type Reranker } from "./rerank";

export interface AskDeps {
  retriever: HybridRetriever;
  reranker?: Reranker;  // 不传 = 不重排（基线对照）
  chatFn?: ChatFn;      // 不传 = 真实 chat()
  recall?: number;      // 融合后交给 rerank 的条数（「别漏」）
  topK?: number;        // 最终送进生成的条数（rerank 之后截断，别把 20 条全塞进 prompt）
  minScore?: number;    // rerank 分数阈值：低于它视为不相关；全部低于阈值就走「无证据」
}

export interface AskResult extends AnswerResult {
  hits: FusedHit[];     // 最终送进生成的片段（顺序 = 片段编号）
}

export async function ask(query: string, user: User, deps: AskDeps): Promise<AskResult> {
  const { retriever, reranker = noRerank, chatFn, recall = 20, topK = 5, minScore } = deps;
  const fused = await retriever.retrieve(query, user, { topEach: recall, topN: recall });
  const ranked = await reranker(query, fused.map((h) => h.text), topK);
  const hits = ranked
    .filter((r) => minScore === undefined || r.score >= minScore)
    .map((r) => fused[r.index]!)
    .slice(0, topK);
  // 组装与展示用同一份 hits：片段编号 [n] 永远指向 hits[n-1]
  const result = await answerWithCitations(query, hits, chatFn ? { chatFn } : {});
  return { ...result, hits };
}
