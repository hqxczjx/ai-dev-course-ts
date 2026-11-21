// 第 13 章：问答 + 检索调试台。先 npm run ingest，再：
//   npm run ch13 -- "退货政策是什么"                 真实链路（EMBED_* + RERANK_* + API_KEY）
//   npm run ch13 -- "员工薪资几号发" --role hr        换角色：看权限过滤的效果
//   npm run ch13 -- "退货政策是什么" --offline        不需要 key：只看两路召回与 RRF 融合，不调模型
import { openKnowledgeBase } from "../rag/kb";
import { ask } from "../rag/ask";
import { httpReranker, noRerank } from "../rag/rerank";

const args = process.argv.slice(2);
const offline = args.includes("--offline");
const roleIdx = args.indexOf("--role");
const role = roleIdx >= 0 ? (args[roleIdx + 1] ?? "employee") : "employee";
const query = args.find((a, i) => !a.startsWith("--") && (roleIdx < 0 || i !== roleIdx + 1)) ?? "退货政策是什么";
const user = { id: "demo", roles: [role] };

const kb = await openKnowledgeBase({ offline });
if ((await kb.store.count()) === 0) {
  console.error(`知识库是空的：先运行 npm run ingest${offline ? " -- --offline" : ""}`);
  process.exit(1);
}

// ① 检索调试台：两路名次 + 融合分，一眼看出是哪一路把结果捞上来的
const fused = await kb.retriever.retrieve(query, user, { topEach: 20, topN: 10 });
console.log(`\n问题：${query}（角色：${role}）\n`);
console.table(
  fused.map((h) => ({
    id: h.id,
    语义名次: h.ranks.semantic ?? "-",
    关键词名次: h.ranks.keyword ?? "-",
    RRF: h.rrf.toFixed(4),
    片段: h.text.slice(0, 30).replace(/\s+/g, " "),
  })),
);
if (offline) {
  console.log("（离线模式：fakeEmbedder 只按字面相似，语义名次不代表真实模型效果；不调用 rerank 与生成）");
  process.exit(0);
}

// ② 完整问答：rerank → 生成 → 引用校验
const reranker = process.env.RERANK_API_KEY ? httpReranker() : noRerank;
const result = await ask(query, user, { retriever: kb.retriever, reranker, topK: 5 });
console.log(`\n[${result.status}] ${result.answer}\n`);
for (const c of result.citations) console.log(`  [${c.n}] ${c.source}：${c.text.slice(0, 60).replace(/\s+/g, " ")}…`);
if (result.issues.length) console.warn("被拦下的原因：", result.issues, "\n模型原始输出：", result.raw);
