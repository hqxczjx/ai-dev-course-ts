// 第 07 章：工具调用循环（需要 .env）。运行：npm run ch07
import { runToolLoop } from "../agent/tool-loop";

const r = await runToolLoop("我的订单 A001 到哪了？还有，它原价 399 打 85 折再加 15 元运费，一共多少钱？");
for (const m of r.messages) {
  if (m.role === "tool") console.log(`🔧 ${m.tool_call_id} → ${m.content}`);
}
console.log(r.status === "answered" ? `🤖 ${r.answer}` : "⚠️ 达到步数上限（生产中应转人工）");
