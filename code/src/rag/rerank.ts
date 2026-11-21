// rag/rerank.ts —— Rerank 适配器（第 13 章 13.5）
//
// 各家 rerank API「形似而不同构」：路径、参数名、响应字段都不一样（2026-11 复核）：
//   硅基流动 / Jina：POST …/v1/rerank，参数 top_n，响应 results[{ index, relevance_score }]
//   Cohere v2      ：POST …/v2/rerank，参数 top_n（v2 没有 return_documents），响应 results[…]
//   Voyage         ：POST …/v1/rerank，参数 top_k，响应 data[{ index, relevance_score }]
// 所以每家一个小适配器，统一成 { index, score }。fetch 可注入，离线测试不花钱。

export interface RerankResult {
  index: number; // 指回传入的 documents 下标
  score: number; // 相关度，越大越相关（不同厂商的分数不可互相比较）
}

/** 下游只依赖这个函数类型；测试或「不重排」时可以传一个假的 */
export type Reranker = (query: string, documents: string[], topN: number) => Promise<RerankResult[]>;

export type RerankProvider = "siliconflow" | "jina" | "cohere" | "voyage";

interface ProviderSpec {
  url: string;
  model: string;
  body: (model: string, query: string, documents: string[], topN: number) => Record<string, unknown>;
  hits: (json: unknown) => unknown;
}

const resultsField = (json: unknown) => (json as { results?: unknown }).results;

export const RERANK_PROVIDERS: Record<RerankProvider, ProviderSpec> = {
  siliconflow: {
    url: "https://api.siliconflow.cn/v1/rerank",
    model: "BAAI/bge-reranker-v2-m3", // 免费（以模型广场标注为准）
    body: (model, query, documents, topN) => ({ model, query, documents, top_n: topN, return_documents: false }),
    hits: resultsField,
  },
  jina: {
    url: "https://api.jina.ai/v1/rerank",
    model: "jina-reranker-v3",
    body: (model, query, documents, topN) => ({ model, query, documents, top_n: topN, return_documents: false }),
    hits: resultsField,
  },
  cohere: {
    url: "https://api.cohere.com/v2/rerank",
    model: "rerank-v5.0-fast",
    body: (model, query, documents, topN) => ({ model, query, documents, top_n: topN }), // v2 无 return_documents
    hits: resultsField,
  },
  voyage: {
    url: "https://api.voyageai.com/v1/rerank",
    model: "rerank-3",
    body: (model, query, documents, topN) => ({ model, query, documents, top_k: topN }), // 参数叫 top_k
    hits: (json) => (json as { data?: unknown }).data,                                  // 响应叫 data
  },
};

export interface HttpRerankerOptions {
  provider?: RerankProvider;
  apiKey?: string;
  model?: string;
  url?: string;           // 覆盖默认地址（代理、私有部署）
  fetch?: typeof fetch;   // 测试时注入
}

export function httpReranker(opts: HttpRerankerOptions = {}): Reranker {
  const provider = opts.provider ?? ((process.env.RERANK_PROVIDER ?? "siliconflow") as RerankProvider);
  const spec = RERANK_PROVIDERS[provider];
  if (!spec) throw new Error(`未知的 RERANK_PROVIDER：${provider}`);
  const doFetch = opts.fetch ?? fetch;

  return async (query, documents, topN) => {
    if (documents.length === 0) return [];
    const apiKey = opts.apiKey ?? process.env.RERANK_API_KEY;
    if (!apiKey) throw new Error("缺少 RERANK_API_KEY");
    const model = opts.model ?? process.env.RERANK_MODEL ?? spec.model;
    const res = await doFetch(opts.url ?? spec.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(spec.body(model, query, documents, Math.min(topN, documents.length))),
    });
    // 限流 / 鉴权失败时把状态码和响应体带出来，而不是在解构 results 时报一个看不懂的 undefined
    if (!res.ok) throw new Error(`rerank(${provider}) ${res.status}: ${await res.text()}`);
    return normalize(spec.hits(await res.json()), documents.length, provider).slice(0, topN);
  };
}

/** 校验并统一响应：下标越界、字段缺失都直接报错，按分数降序返回 */
export function normalize(raw: unknown, docCount: number, provider: string): RerankResult[] {
  if (!Array.isArray(raw)) throw new Error(`rerank(${provider}) 响应格式不符：找不到结果数组`);
  return raw
    .map((h: { index?: unknown; relevance_score?: unknown }) => {
      const index = h.index;
      const score = h.relevance_score;
      if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= docCount || typeof score !== "number") {
        throw new Error(`rerank(${provider}) 返回了无效结果：${JSON.stringify(h)}`);
      }
      return { index, score };
    })
    .sort((a, b) => b.score - a.score);
}

/** 不重排：保持融合后的顺序（基线对照实验、或没配 rerank key 时用） */
export const noRerank: Reranker = async (_query, documents, topN) =>
  documents.slice(0, topN).map((_, i) => ({ index: i, score: 1 - i / Math.max(documents.length, 1) }));
