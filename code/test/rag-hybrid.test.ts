// 第 13 章：RRF、混合检索、权限过滤、入库幂等与整条管道的离线测试
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChatFn } from "../src/lib/extract";
import type { ChunkRecord, SearchFilter } from "../src/lib/vectorstore";
import { ask } from "../src/rag/ask";
import { NO_EVIDENCE } from "../src/rag/answer";
import { HybridRetriever, rrf, type Searcher } from "../src/rag/hybrid";
import { ingestDir } from "../src/rag/ingest";
import { openKnowledgeBase } from "../src/rag/kb";

const DOCS_DIR = join(import.meta.dirname, "..", "fixtures", "docs");

test("rrf：名次从 1 起、k=60；两路都靠前的胜出，只在一路出现的排后", () => {
  const scores = rrf([
    ["a", "b", "c"], // 语义榜
    ["c", "a", "d"], // 关键词榜
  ]);
  assert.deepEqual([...scores.keys()], ["a", "c", "b", "d"]);
  assert.equal(scores.get("a"), 1 / 61 + 1 / 62);
  assert.equal(scores.get("d"), 1 / 63);
});

test("rrf：只看名次不看分值——一路分数再高也压不过两路一致靠前", () => {
  const scores = rrf([["x", "y"], ["y", "z"]], 60);
  assert.equal([...scores.keys()][0], "y");
});

/** 只返回固定结果的假检索器，并记录收到的过滤条件 */
function fakeSearcher(results: ChunkRecord[]) {
  const filters: SearchFilter[] = [];
  const s: Searcher = {
    search: (_q, topK, filter) => {
      filters.push(filter);
      return results.filter((r) => !filter.roles || r.visibleTo.includes("public") || r.visibleTo.some((v) => filter.roles!.includes(v))).slice(0, topK);
    },
  };
  return { s, filters };
}

const rec = (id: string, visibleTo = ["public"]): ChunkRecord => ({ id, text: id, source: `${id}.md`, visibleTo });

test("HybridRetriever：用户角色传给每一路检索（检索前过滤），并标出各路名次", async () => {
  const sem = fakeSearcher([rec("a"), rec("b"), rec("secret", ["hr"])]);
  const kw = fakeSearcher([rec("b"), rec("c")]);
  const hits = await new HybridRetriever(sem.s, kw.s).retrieve("q", { id: "u1", roles: ["employee"] });
  assert.deepEqual(sem.filters, [{ roles: ["employee"] }]);
  assert.deepEqual(kw.filters, [{ roles: ["employee"] }]);
  assert.deepEqual(hits.map((h) => h.id), ["b", "a", "c"]);
  assert.deepEqual(hits[0]!.ranks, { semantic: 2, keyword: 1 });
});

test("纵深防御：某一路忘了过滤、返回了无权内容 → 直接报错，绝不交给下游", async () => {
  const leaky: Searcher = { search: () => [rec("secret", ["hr"])] };
  const ok = fakeSearcher([]);
  await assert.rejects(new HybridRetriever(leaky, ok.s).retrieve("q", { id: "u1", roles: ["employee"] }), /权限过滤失效/);
});

// ───────── 用示例语料跑真实的 LanceDB + MiniSearch（fakeEmbedder，临时目录） ─────────

async function withKb(fn: (kb: Awaited<ReturnType<typeof openKnowledgeBase>>, dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "rag-kb-"));
  try {
    await fn(await openKnowledgeBase({ dataDir: dir, offline: true }), dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("入库幂等：同一目录跑两遍，chunk 数不变；可疑注入文档被隔离", () =>
  withKb(async (kb, dir) => {
    const first = await ingestDir(DOCS_DIR, kb);
    const n1 = await kb.store.count();
    assert.ok(n1 > 0 && n1 === first.chunks);
    assert.deepEqual(first.quarantined.map((q) => q.source), ["商品详情-智能音箱.md"]);

    await kb.saveKeywords();
    const second = await ingestDir(DOCS_DIR, kb);
    assert.equal(await kb.store.count(), n1);
    assert.equal(kb.keywords.size, n1);
    assert.equal(second.chunks, first.chunks);

    // 换一个进程（重新打开）也看得到同样的数据：关键词索引已落盘
    const reopened = await openKnowledgeBase({ dataDir: dir, offline: true });
    assert.equal(reopened.keywords.size, n1);
  }));

test("中文查询经混合检索命中正确来源（关键词一路功不可没）", () =>
  withKb(async (kb) => {
    await ingestDir(DOCS_DIR, kb);
    const user = { id: "u", roles: ["employee"] };
    const top = async (q: string) => (await kb.retriever.retrieve(q, user, { topN: 3 })).map((h) => h.source);
    assert.ok((await top("E4302 是什么错误")).includes("错误码手册.md"));
    assert.ok((await top("积分有效期多久")).includes("会员积分.md"));
    assert.ok((await top("退货政策是什么")).includes("退货政策.md"));
  }));

test("权限：普通员工检索不到 HR 文档，HR 可以；采购流程只对员工可见", () =>
  withKb(async (kb) => {
    await ingestDir(DOCS_DIR, kb);
    const sources = async (roles: string[], q: string) =>
      new Set((await kb.retriever.retrieve(q, { id: "u", roles }, { topEach: 50, topN: 50 })).map((h) => h.source));
    assert.equal((await sources(["employee"], "员工工资每月几号发")).has("员工薪酬制度.md"), false);
    assert.equal((await sources(["hr"], "员工工资每月几号发")).has("员工薪酬制度.md"), true);
    assert.equal((await sources(["customer"], "采购审批")).has("采购审批流程.md"), false);
  }));

test("整条管道：越权问题 → 检索不到证据 → 不调模型直接拒答", () =>
  withKb(async (kb) => {
    await ingestDir(DOCS_DIR, kb);
    let called = 0;
    const chatFn: ChatFn = async () => {
      called++;
      return { text: "不该被调用" };
    };
    // rerank 分数阈值：低于阈值视为不相关。这里用一个只认「薪」字的假 reranker 模拟
    const reranker = async (_q: string, docs: string[], topN: number) =>
      docs.map((d, index) => ({ index, score: d.includes("薪") || d.includes("工资") ? 0.9 : 0.01 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);
    const r = await ask("员工工资每月几号发？", { id: "u", roles: ["employee"] }, { retriever: kb.retriever, reranker, chatFn, minScore: 0.5 });
    assert.equal(r.status, "no_evidence");
    assert.equal(r.answer, NO_EVIDENCE);
    assert.equal(called, 0);

    const asHr = await ask("员工工资每月几号发？", { id: "u", roles: ["hr"] }, {
      retriever: kb.retriever,
      reranker,
      minScore: 0.5,
      chatFn: async () => ({ text: "工资每月 10 日发放[1]。" }),
    });
    assert.equal(asHr.status, "answered");
    assert.equal(asHr.citations[0]!.source, "员工薪酬制度.md");
  }));
