// 第 13 章：解析与切片的离线测试
import { test } from "node:test";
import assert from "node:assert/strict";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { chunkDocument, splitByHeadings } from "../src/rag/chunk";
import { markdownToText, parseFrontMatter } from "../src/rag/parse";

// 一段没有换行、没有空格的中文长文本（PDF 解析出来经常就是这样）
const LONG = Array.from({ length: 30 }, (_, i) => `第${i + 1}条规定说明了退货的具体要求和例外情况。`).join("");

test("反例：默认分隔符没有中文句读，长段落会被从句子中间硬切开", async () => {
  const pieces = await new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 0 }).splitText(LONG);
  assert.ok(pieces.some((p) => !p.endsWith("。")), "至少有一块断在句子中间");
});

test("加上 。！？；， 之后：每块都在句号处断开，且不超过 chunkSize", async () => {
  const chunks = await chunkDocument({ source: "long.md", text: LONG }, { chunkSize: 100, chunkOverlap: 0 });
  assert.ok(chunks.length > 1);
  for (const c of chunks) {
    assert.ok(c.text.length <= 100, `块长 ${c.text.length}`);
    assert.ok(c.text.endsWith("。"), `块应在句末结束：${c.text.slice(-10)}`);
    assert.ok(!c.text.startsWith("。"), "分隔符不应留在下一块开头");
  }
});

test("chunk ID 稳定：同一篇文档切两次得到相同 ID（重复入库才能按 ID 覆盖）", async () => {
  const doc = { source: "a.md", text: LONG, visibleTo: ["hr"] };
  const a = await chunkDocument(doc, { chunkSize: 120 });
  const b = await chunkDocument(doc, { chunkSize: 120 });
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id));
  assert.equal(a[0]!.id, "a.md#0");
  assert.deepEqual(a[0]!.visibleTo, ["hr"]);
});

test("front matter：解析出 visibleTo 等元数据，正文不含它", () => {
  const { meta, body } = parseFrontMatter("---\ntitle: 薪酬\nvisibleTo: hr, admin\n---\n# 正文\n内容");
  assert.equal(meta.visibleTo, "hr, admin");
  assert.equal(body, "# 正文\n内容");
  assert.deepEqual(parseFrontMatter("没有 front matter").meta, {});
});

test("markdownToText：marked（async: false）+ cheerio，块之间留空行，列表里的段落不重复", () => {
  const text = markdownToText("# 标题\n\n第一段**加粗**。\n\n- 条目一\n\n- 条目二\n\n| 码 | 含义 |\n|---|---|\n| E4302 | 支付超时 |");
  assert.equal(text, "标题\n\n第一段加粗。\n\n条目一\n\n条目二\n\n码\n\n含义\n\nE4302\n\n支付超时");
});

test("splitByHeadings：按标题切块，标题随块携带", () => {
  const sections = splitByHeadings("# 退货\n7 天无理由\n## 例外\n定制商品除外");
  assert.deepEqual(sections.map((s) => s.heading), ["退货", "例外"]);
  assert.match(sections[1]!.text, /定制商品/);
});
