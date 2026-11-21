// 第 08 章：最小 Agent Loop（需要 .env）。运行：npm run ch08
import { runAgent } from "../agent/loop";
import { defaultTools } from "../tools";

const result = await runAgent({
  goal: "查订单 A001 的状态；并计算该订单商品原价 399 打 85 折加 15 元运费的实付金额；最后把两条信息整理成一句话报告。",
  tools: defaultTools,
});
// 联合类型先窄化再取 answer：max_steps / budget_exceeded / no_progress 分支没有 answer
console.log(result.status, "answer" in result ? result.answer : "（未提交答案，查 trajectory 定位原因）");
console.table(result.trajectory.map((s) => ({ step: s.step, action: s.action, ms: s.ms })));
console.log(`总 tokens：${result.tokensUsed}`);
