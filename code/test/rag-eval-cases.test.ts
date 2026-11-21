// 第 13 章：评测集本身也要「测」——条数、类型覆盖、期望来源真实存在
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");

test("评测集：20 条，覆盖无证据 / 冲突 / 注入 / 越权等必备类型，期望来源都在语料里", async () => {
  const yaml = await readFile(join(FIXTURES, "evals", "rag-cases.yaml"), "utf-8");
  const docs = new Set(await readdir(join(FIXTURES, "docs")));

  const cases = yaml.split(/^- description: /m).slice(1);
  assert.equal(cases.length, 20);

  const tags = cases.map((c) => c.match(/tag: (\w+)/)?.[1]);
  for (const required of ["fact", "keyword", "cross_doc", "multi_hop", "colloquial", "no_evidence", "conflict", "injection", "unauthorized"]) {
    assert.ok(tags.includes(required), `缺少 ${required} 类用例`);
  }

  for (const c of cases) {
    const sources = c.match(/expected_sources: \[([^\]]*)\]/)?.[1] ?? "";
    for (const s of sources.split(",").map((x) => x.trim().replace(/"/g, "")).filter(Boolean)) {
      assert.ok(docs.has(s), `期望来源不存在：${s}`);
    }
    // 无证据类用例不能挂 context-* 断言（检索为空时 contextTransform 拿不到片段会报错）
    if (/tag: (no_evidence|unauthorized)/.test(c)) assert.doesNotMatch(c, /context-(recall|faithfulness)/);
  }
});
