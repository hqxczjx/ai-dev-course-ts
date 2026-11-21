// 第 07 章：工具调用循环的离线测试
import { test } from "node:test";
import assert from "node:assert/strict";
import { runToolLoop, executeToolCall } from "../src/agent/tool-loop";
import { FakeModel, callTools, say } from "../src/lib/model";
import { defaultTools } from "../src/tools";

const registry = new Map(defaultTools.map((t) => [t.name, t]));

test("六步流程：模型请求工具 → 代码执行 → 结果回传 → 模型回答", async () => {
  const fake = new FakeModel([
    callTools({ name: "queryOrder", args: { orderId: "a001" }, id: "c1" }),
    say("订单 A001 运输中，明天 18:00 前送达。"),
  ]);
  const r = await runToolLoop("A001 到哪了？", { model: fake });
  assert.equal(r.status, "answered");
  const second = fake.requests[1]!.messages;
  // assistant(tool_calls) 必须先于对应的 tool 消息进入历史
  const iAssistant = second.findIndex((m) => m.role === "assistant");
  const iTool = second.findIndex((m) => m.role === "tool");
  assert.ok(iAssistant >= 0 && iAssistant < iTool);
  assert.match(JSON.stringify(second[iTool]), /运输中/);
});

test("参数校验失败不抛给用户，而是作为结构化错误回传", async () => {
  const out = await executeToolCall(registry, "calculate", JSON.stringify({ expression: "process.exit()" }));
  assert.deepEqual(out, { error: true, message: "表达式含非法字符，只允许数字和 + - * / ( ) ." });
});

test("缺字段：Zod 校验拦截", async () => {
  const out = (await executeToolCall(registry, "queryOrder", "{}")) as { error: boolean };
  assert.equal(out.error, true);
});

test("计算工具给出精确结果", async () => {
  const out = await executeToolCall(registry, "calculate", JSON.stringify({ expression: "(399*0.85+15)" }));
  assert.deepEqual(out, { expression: "(399*0.85+15)", result: 354.15 });
});
