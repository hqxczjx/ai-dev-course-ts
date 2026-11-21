// 第 13 章：Rerank 适配器的离线测试——三家「形似而不同构」，各自的请求与响应形状
import { test } from "node:test";
import assert from "node:assert/strict";
import { httpReranker, noRerank, type RerankProvider } from "../src/rag/rerank";

const DOCS = ["退货政策", "积分规则", "物流说明"];

/** 记录请求、返回预设响应体的假 fetch */
function fakeFetch(body: unknown, status = 200) {
  const calls: { url: string; body: Record<string, unknown>; auth: string | null }[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body)),
      auth: new Headers(init?.headers).get("authorization"),
    });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  }) as typeof fetch;
  return { fn, calls };
}

const cases: { provider: RerankProvider; url: string; topKey: string; response: unknown }[] = [
  {
    provider: "siliconflow",
    url: "https://api.siliconflow.cn/v1/rerank",
    topKey: "top_n",
    response: { id: "x", results: [{ index: 2, relevance_score: 0.3 }, { index: 0, relevance_score: 0.9 }] },
  },
  {
    provider: "jina",
    url: "https://api.jina.ai/v1/rerank",
    topKey: "top_n",
    response: { model: "m", usage: { total_tokens: 9 }, results: [{ index: 0, relevance_score: 0.9 }, { index: 2, relevance_score: 0.3 }] },
  },
  {
    provider: "cohere",
    url: "https://api.cohere.com/v2/rerank",
    topKey: "top_n",
    response: { id: "x", results: [{ index: 0, relevance_score: 0.9 }, { index: 2, relevance_score: 0.3 }], meta: {} },
  },
  {
    provider: "voyage",
    url: "https://api.voyageai.com/v1/rerank",
    topKey: "top_k",
    response: { object: "list", data: [{ relevance_score: 0.9, index: 0 }, { relevance_score: 0.3, index: 2 }], model: "rerank-3" },
  },
];

for (const c of cases) {
  test(`${c.provider}：请求打到正确路径、用对参数名，响应统一成 { index, score } 并按分数降序`, async () => {
    const { fn, calls } = fakeFetch(c.response);
    const rerank = httpReranker({ provider: c.provider, apiKey: "k", fetch: fn });
    const out = await rerank("怎么退货", DOCS, 2);
    assert.deepEqual(out, [{ index: 0, score: 0.9 }, { index: 2, score: 0.3 }]);
    assert.equal(calls[0]!.url, c.url);
    assert.equal(calls[0]!.auth, "Bearer k");
    assert.equal(calls[0]!.body[c.topKey], 2);
    assert.deepEqual(calls[0]!.body.documents, DOCS);
    if (c.provider === "cohere") assert.equal("return_documents" in calls[0]!.body, false); // v2 没有这个参数
    if (c.provider === "voyage") assert.equal("top_n" in calls[0]!.body, false);
  });
}

test("HTTP 错误带出状态码与响应体，而不是在解构 results 时报 undefined", async () => {
  const { fn } = fakeFetch("rate limited", 429);
  const rerank = httpReranker({ provider: "siliconflow", apiKey: "k", fetch: fn });
  await assert.rejects(rerank("q", DOCS, 2), /rerank\(siliconflow\) 429: rate limited/);
});

test("响应里下标越界 / 结构不对：直接报错，绝不把错位的文档交给生成", async () => {
  const bad = httpReranker({ provider: "siliconflow", apiKey: "k", fetch: fakeFetch({ results: [{ index: 7, relevance_score: 1 }] }).fn });
  await assert.rejects(bad("q", DOCS, 2), /无效结果/);
  // 用错适配器（把 Voyage 的响应当成硅基解析）会拿不到 results
  const wrong = httpReranker({ provider: "siliconflow", apiKey: "k", fetch: fakeFetch({ data: [] }).fn });
  await assert.rejects(wrong("q", DOCS, 2), /找不到结果数组/);
});

test("空文档列表不发请求；noRerank 保持原顺序", async () => {
  const { fn, calls } = fakeFetch({ results: [] });
  assert.deepEqual(await httpReranker({ apiKey: "k", fetch: fn })("q", [], 5), []);
  assert.equal(calls.length, 0);
  assert.deepEqual((await noRerank("q", DOCS, 2)).map((r) => r.index), [0, 1]);
});
