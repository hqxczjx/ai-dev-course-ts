// 第 11 章：主从式编排的离线测试（规划 → 并行执行 → 部分失败降级 → 成文）
import { test } from "node:test";
import assert from "node:assert/strict";
import { runPipeline, type WorkerName } from "../src/multi/orchestrator";
import { FakeModel, callTools, say } from "../src/lib/model";

const plan = {
  subtasks: [
    { id: "r1", goal: "查 X 的现状", worker: "researcher" },
    { id: "a1", goal: "算 X 的增长率", worker: "analyst" },
    { id: "w1", goal: "成文", worker: "writer" },
  ],
  aggregation: "按主题分组",
};

test("一个子任务失败时，报告照常生成并显式标注失败", async () => {
  const fakes: Record<WorkerName, FakeModel> = {
    researcher: new FakeModel([
      callTools({ name: "web_search", args: { query: "X 现状", limit: 2 } }),
      callTools({ name: "finish", args: { status: "done", answer: "X 正在增长 [1]" } }),
    ]),
    analyst: new FakeModel([say("我不想用工具"), say("还是不想")]), // → no_progress → 失败
    writer: new FakeModel([callTools({ name: "finish", args: { status: "done", answer: "最终报告：X 正在增长 [1]（增长率缺失）" } })]),
  };
  const out = await runPipeline("调研 X", {
    planChat: async () => ({ text: JSON.stringify(plan) }),
    modelFor: (w) => fakes[w],
  });
  assert.deepEqual(out.failures, ["子任务 a1 失败: no_progress"]);
  assert.match(out.report, /最终报告/);
  // writer 拿到的素材里带着失败说明
  assert.match(JSON.stringify(fakes.writer.requests[0]!.messages), /有 1 个子任务失败/);
  // 工具隔离：researcher 看得到 web_search，writer 看不到
  assert.ok(fakes.researcher.requests[0]!.tools!.some((t) => t.type === "function" && t.function.name === "web_search"));
  assert.ok(!fakes.writer.requests[0]!.tools!.some((t) => t.type === "function" && t.function.name === "web_search"));
});
