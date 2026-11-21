// 第 13 章：入库脚本。运行：npm run ingest            （真实 embedding，需要 .env 里的 EMBED_*）
//                          npm run ingest -- --offline （假 embedding，不需要 key，只演示链路）
//                          npm run ingest -- ./my-docs  （换成你自己的文档目录）
// 可以连跑两次：第二次 chunk 总数不变——入库是幂等的。
import { openKnowledgeBase } from "../rag/kb";
import { ingestDir } from "../rag/ingest";

const args = process.argv.slice(2);
const offline = args.includes("--offline");
const allowSuspicious = args.includes("--no-quarantine"); // 评测「生成端防线」时才用
const dir = args.find((a) => !a.startsWith("--")) ?? "fixtures/docs";

const kb = await openKnowledgeBase({ offline });
const before = await kb.store.count();
const report = await ingestDir(dir, kb, { quarantineSuspicious: !allowSuspicious });
await kb.saveKeywords();

console.log(`入库完成：${report.files} 个文件，${report.chunks} 个 chunk`);
console.log(`向量库 chunk 数：${before} → ${await kb.store.count()}；关键词索引：${kb.keywords.size}`);
for (const q of report.quarantined) {
  console.warn(`⚠️ 已隔离（疑似提示注入，需人工复核）：${q.source}  命中规则：${q.patterns.join(" | ")}`);
}
