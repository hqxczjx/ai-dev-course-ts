// 第 13 章：中文关键词索引（MiniSearch + Intl.Segmenter）的离线测试
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import MiniSearch from "minisearch";
import { KeywordIndex, tokenizeZh } from "../src/rag/keyword";

const CHUNKS = [
  { id: "a#0", text: "本公司支持 7 天无理由退货，需保持商品完好。", source: "a.md" },
  { id: "b#0", text: "会员积分可在下单时抵扣，100 积分抵 1 元。", source: "b.md" },
  { id: "c#0", text: "默认使用顺丰快递，偏远地区 3-5 天送达。", source: "c.md" },
  { id: "d#0", text: "错误码 E4302 表示支付超时。", source: "d.md" },
  { id: "e#0", text: "工资每月 10 日发放。", source: "e.md", visibleTo: ["hr"] },
];

test("反例：MiniSearch 默认分词器对中文整句查询返回空（这就是要换分词器的原因）", () => {
  const mini = new MiniSearch<{ id: string; text: string }>({ fields: ["text"] });
  mini.addAll(CHUNKS);
  assert.equal(mini.search("退货政策是什么").length, 0);
  assert.equal(mini.search("顺丰").length, 0);
});

test("tokenizeZh：词典外的词被切成单字时，补上相邻二字组（「退货」「顺丰」）", () => {
  const tokens = tokenizeZh("退货政策是什么");
  assert.ok(tokens.includes("退货"));
  assert.ok(tokens.includes("政策"));
  assert.ok(tokenizeZh("顺丰快递几天到").includes("顺丰"));
});

test("中文查询能命中：退货 / 积分抵扣 / 顺丰 / E4302", () => {
  const idx = KeywordIndex.create();
  idx.upsert(CHUNKS);
  assert.equal(idx.search("退货政策是什么")[0]?.id, "a#0");
  assert.equal(idx.search("积分怎么抵扣")[0]?.id, "b#0");
  assert.equal(idx.search("用的是顺丰吗")[0]?.id, "c#0");
  assert.equal(idx.search("E4302")[0]?.id, "d#0");
});

test("upsert 幂等：重复写入同一批 chunk 不抛 duplicate ID，也不重复计数", () => {
  const idx = KeywordIndex.create();
  idx.upsert(CHUNKS);
  idx.upsert(CHUNKS);
  assert.equal(idx.size, CHUNKS.length);
  idx.upsert([{ id: "a#0", text: "退货期限改为 15 天。", source: "a.md" }]);
  assert.match(idx.search("退货")[0]!.text, /15 天/);
});

test("replaceSource：先删掉该来源的旧 chunk 再写入新的", () => {
  const idx = KeywordIndex.create();
  idx.upsert([...CHUNKS, { id: "a#1", text: "定制商品不支持退货。", source: "a.md" }]);
  idx.replaceSource("a.md", [{ id: "a#0", text: "新版退货政策。", source: "a.md" }]);
  assert.equal(idx.size, CHUNKS.length);
  assert.deepEqual(idx.search("退货").map((h) => h.id), ["a#0"]);
});

test("权限过滤在 MiniSearch 内部完成：employee 搜不到 HR 文档，hr 可以", () => {
  const idx = KeywordIndex.create();
  idx.upsert(CHUNKS);
  assert.equal(idx.search("工资发放", 10, { roles: ["employee"] }).length, 0);
  assert.equal(idx.search("工资发放", 10, { roles: ["hr"] })[0]?.id, "e#0");
});

test("落盘与加载：入库进程 save，问答进程 load（MiniSearch.loadJSON + 相同选项）", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rag-kw-"));
  try {
    const path = join(dir, "sub", "minisearch.json");
    const idx = KeywordIndex.create();
    idx.upsert(CHUNKS);
    await idx.save(path);
    const loaded = await KeywordIndex.load(path);
    assert.equal(loaded.size, CHUNKS.length);
    assert.equal(loaded.search("退货政策")[0]?.id, "a#0");
    assert.deepEqual(loaded.search("工资", 5, { roles: ["hr"] })[0]?.visibleTo, ["hr"]);
    assert.equal((await KeywordIndex.load(join(dir, "missing.json"))).size, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
