// 第 12 章 12.3：纯内存语义搜索——全量内存 + 暴力扫描，看清向量库替你做了什么。
// 运行：npm run ch12              （真实 embedding，需要 .env 里的 EMBED_API_KEY）
//       npm run ch12 -- --offline （fakeEmbedder：不需要 key，但它只认字面，「退掉」≈「退货」只因为都有「退」）
import { cosineSim, fakeEmbedder, openAIEmbedder } from "../lib/embed";

const embed = process.argv.includes("--offline") ? fakeEmbedder() : openAIEmbedder();

const DOCS = [
  "本公司支持 7 天无理由退货，需保持商品完好。",
  "会员积分可在下单时抵扣，100 积分抵 1 元。",
  "默认使用顺丰快递，偏远地区 3-5 天送达。",
];

const docVecs = await embed(DOCS);                 // 离线：文档向量化（一次，存起来）
const [qVec] = await embed(["怎么退掉买的东西"]);  // 在线：查询向量化（每次）

const ranked = DOCS.map((doc, i) => ({ doc, sim: cosineSim(qVec!, docVecs[i]!) }))
  .sort((a, b) => b.sim - a.sim);                  // 每次查询都和全部文档算一遍：O(N·D)

console.table(ranked); // 「退货」那条排第一——虽然 query 里没有「退货」两个字
