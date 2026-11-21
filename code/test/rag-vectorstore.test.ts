// 第 12 章：LanceDB 封装的离线测试（临时目录 + fakeEmbedder，不花钱）
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeEmbedder } from "../src/lib/embed";
import { VectorStore, canSee } from "../src/lib/vectorstore";

const DIM = 64;
const DOCS = [
  { id: "faq.md#0", text: "本公司支持 7 天无理由退货，需保持商品完好。", source: "faq.md" },
  { id: "faq.md#1", text: "会员积分可在下单时抵扣，100 积分抵 1 元。", source: "faq.md" },
  { id: "ship.md#0", text: "默认使用顺丰快递，偏远地区 3-5 天送达。", source: "ship.md" },
  { id: "hr.md#0", text: "工资每月 10 日发放。", source: "hr.md", visibleTo: ["hr"] },
];

async function withStore(fn: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "rag-vs-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const open = (dir: string) => new VectorStore({ embedder: fakeEmbedder(DIM), dim: DIM }).init(dir);

test("init 幂等：第二次打开不清库（旧写法每次 overwrite，重启就丢数据）", () =>
  withStore(async (dir) => {
    const vs = await open(dir);
    await vs.add(DOCS);
    const again = await open(dir);
    assert.equal(await again.count(), DOCS.length);
  }));

test("add 按 id 覆盖：同一批文档写两遍，库里仍然只有一份", () =>
  withStore(async (dir) => {
    const vs = await open(dir);
    await vs.add(DOCS);
    await vs.add(DOCS);
    assert.equal(await vs.count(), DOCS.length);
  }));

test("replaceSource：文档改短后重新入库，旧的尾巴 chunk 被删掉", () =>
  withStore(async (dir) => {
    const vs = await open(dir);
    await vs.add(DOCS);
    await vs.replaceSource("faq.md", [{ id: "faq.md#0", text: "退货政策已更新：7 天无理由退货。", source: "faq.md" }]);
    assert.equal(await vs.count(), DOCS.length - 1);
    const hits = await vs.search("退货", 10, { source: "faq.md" });
    assert.deepEqual(hits.map((h) => h.id), ["faq.md#0"]);
    assert.match(hits[0]!.text, /已更新/);
  }));

test("search：cosine 距离，score = 1 − distance，最相近的排第一", () =>
  withStore(async (dir) => {
    const vs = await open(dir);
    await vs.add(DOCS);
    const hits = await vs.search("无理由退货", 3);
    assert.equal(hits[0]!.id, "faq.md#0");
    for (const h of hits) assert.ok(Math.abs(h.score - (1 - h.distance)) < 1e-9);
    assert.ok(hits[0]!.score >= hits[1]!.score);
  }));

test("roles 过滤发生在检索之前：无权 chunk 既不出现，也不占 topK 名额", () =>
  withStore(async (dir) => {
    const vs = await open(dir);
    await vs.add(DOCS);
    const asEmployee = await vs.search("工资每月几号发放", 10, { roles: ["employee"] });
    assert.ok(asEmployee.every((h) => h.id !== "hr.md#0"));
    assert.equal(asEmployee.length, 3); // 公开的 3 条都在，名额没被浪费
    const asHr = await vs.search("工资每月几号发放", 1, { roles: ["hr"] });
    assert.equal(asHr[0]!.id, "hr.md#0");
    assert.deepEqual(asHr[0]!.visibleTo, ["hr"]);
  }));

test("维度与表不一致直接拒绝写入（换模型必须全量重建）", () =>
  withStore(async (dir) => {
    await open(dir);
    const wrong = await new VectorStore({ embedder: fakeEmbedder(32), dim: DIM }).init(dir);
    await assert.rejects(wrong.add(DOCS.slice(0, 1)), /维度/);
  }));

test("canSee：public 对所有人可见，否则要求角色有交集", () => {
  assert.equal(canSee(["public"], []), true);
  assert.equal(canSee(["hr"], ["employee"]), false);
  assert.equal(canSee(["hr", "admin"], ["admin"]), true);
});
