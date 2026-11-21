// 第 04 章：结构化输出修复循环的离线测试
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { extractJson, structured, type ChatFn } from "../src/lib/extract";

const Feedback = z.object({
  category: z.enum(["complaint", "question", "praise"]),
  sentiment: z.number().min(-1).max(1),
});

/** 按顺序返回预设文本的假 chat，并记录收到的消息 */
function scripted(outputs: string[]) {
  const seen: unknown[] = [];
  const fn: ChatFn = async (opts) => {
    seen.push(opts.messages);
    const text = outputs.shift();
    if (text === undefined) throw new Error("脚本用完");
    return { text };
  };
  return { fn, seen };
}

test("extractJson 剥掉围栏和前后废话", () => {
  assert.equal(extractJson('好的，以下是结果：\n```json\n{"a":1}\n```\n希望有帮助'), '{"a":1}');
});

test("第一次输出坏 JSON、第二次越界，第三次合格：修复循环最终返回类型安全的结果", async () => {
  const { fn, seen } = scripted([
    '{"category": "complaint", "sentiment": ',          // 被截断
    '{"category": "complaint", "sentiment": -3}',        // 越界
    '```json\n{"category": "complaint", "sentiment": -0.8}\n```',
  ]);
  const out = await structured(Feedback, [{ role: "user", content: "太慢了！" }], { chatFn: fn });
  assert.deepEqual(out, { category: "complaint", sentiment: -0.8 });
  assert.equal(seen.length, 3);
  // 修复消息里带着精确到字段的错误
  assert.match(JSON.stringify(seen[2]), /sentiment/);
});

test("超过修复上限就放弃（转人工/降级），而不是无限烧钱", async () => {
  const { fn } = scripted(["不是 JSON", "还不是", "依然不是"]);
  await assert.rejects(structured(Feedback, [{ role: "user", content: "x" }], { chatFn: fn, maxRepair: 2 }), /3 次尝试后仍不合格/);
});
