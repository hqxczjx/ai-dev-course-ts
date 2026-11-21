// 第 12 章：embedding 封装的离线测试
import { test } from "node:test";
import assert from "node:assert/strict";
import { cosineSim, fakeEmbedder, openAIEmbedder } from "../src/lib/embed";

test("cosineSim：同向为 1、正交为 0、反向为 -1；维度不一致直接报错", () => {
  assert.ok(Math.abs(cosineSim([1, 2], [2, 4]) - 1) < 1e-12); // 浮点误差：0.9999999999999998
  assert.equal(cosineSim([1, 0], [0, 1]), 0);
  assert.equal(cosineSim([1, 0], [-1, 0]), -1);
  assert.throws(() => cosineSim([1, 2, 3], [1, 2]), /维度不一致/);
});

test("fakeEmbedder：确定性 + 共享字词越多越接近", async () => {
  const embed = fakeEmbedder(128);
  const [a, b, c, a2] = await embed(["支持 7 天无理由退货", "退货政策是什么", "默认使用顺丰快递", "支持 7 天无理由退货"]);
  assert.deepEqual(a, a2);
  assert.equal(a!.length, 128);
  assert.ok(cosineSim(a!, b!) > cosineSim(a!, c!), "「退货」两句应比「快递」那句更近");
});

test("openAIEmbedder：按 EMBED_BATCH 分批（百炼 v4 单次最多 10 条），并按 index 排回原顺序", async () => {
  const batches: string[][] = [];
  const fakeFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { input: string[] };
    batches.push(body.input);
    // 故意倒序返回：调用方必须按 index 排序，不能假设 data 与 input 同序
    const data = body.input.map((t, index) => ({ object: "embedding", index, embedding: [Number(t)] })).reverse();
    return new Response(JSON.stringify({ object: "list", data, model: "m", usage: { prompt_tokens: 1, total_tokens: 1 } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  const embed = openAIEmbedder({ apiKey: "test", baseURL: "http://fake.local/v1", batchSize: 10, fetch: fakeFetch });
  const texts = Array.from({ length: 25 }, (_, i) => String(i));
  const vectors = await embed(texts);
  assert.deepEqual(batches.map((b) => b.length), [10, 10, 5]);
  assert.deepEqual(vectors.map((v) => v[0]), texts.map(Number));
});

test("openAIEmbedder：没配 EMBED_API_KEY 时在调用时报清楚的错（而不是 import 时就崩）", async () => {
  const saved = process.env.EMBED_API_KEY;
  delete process.env.EMBED_API_KEY;
  try {
    const embed = openAIEmbedder();
    await assert.rejects(embed(["x"]), /EMBED_API_KEY/);
  } finally {
    if (saved !== undefined) process.env.EMBED_API_KEY = saved;
  }
});
