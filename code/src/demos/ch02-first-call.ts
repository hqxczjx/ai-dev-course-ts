// 第 02 章：第一次真实调用（需要 .env）。运行：npm run ch02
import { chat } from "../lib/ai";

const r = await chat({
  messages: [
    { role: "system", content: "你是一个简洁的技术助手。" },
    { role: "user", content: "用一句话解释什么是 token。" },
  ],
  temperature: 0.2,
  maxTokens: 200,
});
console.log(r.text);
console.log(`\n[用量] 输入 ${r.usage.input} + 输出 ${r.usage.output} tokens · ${r.durationMs}ms · finish=${r.finishReason}`);
