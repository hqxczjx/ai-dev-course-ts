// 第 08 章：Agent Loop 的离线测试——每条对应一种真实事故
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { runAgent } from "../src/agent/loop";
import { defineTool } from "../src/lib/ai";
import { FakeModel, callTools, say } from "../src/lib/model";
import { defaultTools } from "../src/tools";

const toolMsgs = (fake: FakeModel, i: number) =>
  fake.requests[i]!.messages.filter((m) => m.role === "tool") as Array<{ tool_call_id: string; content: string }>;

test("正常路径：查订单 → 计算 → finish 提交", async () => {
  const fake = new FakeModel([
    callTools({ name: "queryOrder", args: { orderId: "A001" } }),
    callTools({ name: "calculate", args: { expression: "399*0.85+15" } }),
    callTools({ name: "finish", args: { status: "done", answer: "A001 运输中，实付 354.15 元" } }),
  ]);
  const r = await runAgent({ goal: "查订单并算账", tools: defaultTools, model: fake });
  assert.equal(r.status, "done");
  assert.ok("answer" in r && r.answer.includes("354.15"));
  assert.deepEqual(r.trajectory.map((s) => s.action), ["queryOrder", "calculate"]);
});

test("并行工具调用：一条回复里的每个 tool_call 都必须得到回执（否则真实 API 返回 400）", async () => {
  const fake = new FakeModel([
    callTools(
      { name: "queryOrder", args: { orderId: "A001" }, id: "c1" },
      { name: "calculate", args: { expression: "1+1" }, id: "c2" },
    ),
    callTools({ name: "finish", args: { status: "done", answer: "ok" } }),
  ]);
  await runAgent({ goal: "并行", tools: defaultTools, model: fake });
  assert.deepEqual(toolMsgs(fake, 1).map((m) => m.tool_call_id), ["c1", "c2"]);
});

test("坏 JSON 参数不会让循环崩溃，而是作为错误回传给模型", async () => {
  const fake = new FakeModel([
    callTools({ name: "queryOrder", args: null, rawArgs: "{orderId: A001", id: "bad" }),
    callTools({ name: "finish", args: { status: "blocked", answer: "参数有误" } }),
  ]);
  const r = await runAgent({ goal: "x", tools: defaultTools, model: fake });
  assert.equal(r.status, "blocked");
  assert.match(toolMsgs(fake, 1)[0]!.content, /INVALID_JSON/);
});

test("未注册工具被拒绝执行", async () => {
  const fake = new FakeModel([
    callTools({ name: "deleteAllOrders", args: {} }),
    callTools({ name: "finish", args: { status: "blocked", answer: "无此能力" } }),
  ]);
  await runAgent({ goal: "x", tools: defaultTools, model: fake });
  assert.match(toolMsgs(fake, 1)[0]!.content, /未注册的工具/);
});

test("重复完全相同的调用被循环检测拦下", async () => {
  const q = { name: "queryOrder", args: { orderId: "A001" } };
  const fake = new FakeModel([callTools(q), callTools(q), callTools({ name: "finish", args: { status: "done", answer: "x" } })]);
  await runAgent({ goal: "x", tools: defaultTools, model: fake });
  assert.match(toolMsgs(fake, 2).at(-1)!.content, /DUPLICATE_ACTION/);
});

test("步数上限：模型永不收敛时以 max_steps 体面结束", async () => {
  const fake = new FakeModel(
    Array.from({ length: 3 }, (_, i) => callTools({ name: "calculate", args: { expression: `${i}+1` } })),
  );
  const r = await runAgent({ goal: "x", tools: defaultTools, model: fake, maxSteps: 3 });
  assert.equal(r.status, "max_steps");
  assert.equal(r.trajectory.length, 3);
});

test("预算熔断：累计 total_tokens 超限即停", async () => {
  const fake = new FakeModel(
    Array.from({ length: 5 }, (_, i) => callTools({ name: "calculate", args: { expression: `${i}*2` } })),
    5_000,
  );
  const r = await runAgent({ goal: "x", tools: defaultTools, model: fake, maxBudgetTokens: 12_000 });
  assert.equal(r.status, "budget_exceeded");
  assert.equal(r.stepsUsed, 3);
});

test("工具超时：卡死的工具被中断，错误回传给模型", async () => {
  const hang = defineTool({
    name: "fetchSlow",
    description: "一个会卡死的工具",
    parameters: z.object({}),
    execute: () => new Promise(() => {}),
  });
  const fake = new FakeModel([
    callTools({ name: "fetchSlow", args: {} }),
    callTools({ name: "finish", args: { status: "blocked", answer: "超时" } }),
  ]);
  const r = await runAgent({ goal: "x", tools: [hang], model: fake, toolTimeoutMs: 50 });
  assert.equal(r.status, "blocked");
  assert.match(toolMsgs(fake, 1)[0]!.content, /超时/);
});

test("finish 参数不合法时不结束，而是让模型修正", async () => {
  const fake = new FakeModel([
    callTools({ name: "finish", args: { status: "ok" } }),
    callTools({ name: "finish", args: { status: "done", answer: "修正后" } }),
  ]);
  const r = await runAgent({ goal: "x", tools: defaultTools, model: fake });
  assert.equal(r.status, "done");
  assert.match(toolMsgs(fake, 1)[0]!.content, /INVALID_FINISH/);
});

test("模型连续两次不调工具：提醒一次后以 no_progress 结束", async () => {
  const fake = new FakeModel([say("我觉得差不多了"), say("真的差不多了")]);
  const r = await runAgent({ goal: "x", tools: defaultTools, model: fake });
  assert.equal(r.status, "no_progress");
});
