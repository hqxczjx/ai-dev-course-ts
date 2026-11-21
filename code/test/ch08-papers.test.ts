import { test } from "node:test";
import assert from "node:assert/strict";
import { planAndExecute } from "../src/agent/plan-execute";
import { reflexion } from "../src/agent/reflexion";
import { FakeModel, callTools, say } from "../src/lib/model";
import { defaultTools } from "../src/tools";

test("plan-and-execute: step 2 fails -> failed, failedStep 2", async () => {
  const plan = { steps: [{ id: 1, description: "查订单", tool: "queryOrder" }, { id: 2, description: "算钱", tool: "calculate" }, { id: 3, description: "汇总", tool: "finish" }] };
  const fake = new FakeModel([
    callTools({ name: "queryOrder", args: { orderId: "A001" } }),
    callTools({ name: "finish", args: { status: "done", answer: "运输中" } }),
    say("不想干"), say("真不想干"),
  ]);
  const r = await planAndExecute("x", defaultTools, { model: fake, planChat: async () => ({ text: JSON.stringify(plan) }) });
  assert.equal(r.status, "failed");
  assert.ok(r.status === "failed" && r.failedStep === 2 && r.reason === "no_progress");
});

test("reflexion: fails once then succeeds with lesson", async () => {
  const fake = new FakeModel([
    say("a"), say("b"),
    callTools({ name: "finish", args: { status: "done", answer: "ok" } }),
  ]);
  const r = await reflexion("x", defaultTools, { model: fake, reflectChat: async () => ({ text: JSON.stringify({ lesson: "没用工具", avoid: "别空谈" }) }) });
  assert.equal(r.result.status, "done");
  assert.equal(r.rounds, 2);
  assert.match(JSON.stringify(fake.requests[2]!.messages[0]), /没用工具/);
});
