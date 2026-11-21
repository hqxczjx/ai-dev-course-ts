// 第 18 章：权限层离线测试——「模型被骗是概率问题，权限校验是数学问题」
import { test } from "node:test";
import assert from "node:assert/strict";
import { runAgent } from "../src/agent/loop";
import { FakeModel, callTools } from "../src/lib/model";
import { authorize, isInsideDir, type SessionContext } from "../src/security/permissions";
import { defaultTools } from "../src/tools";

const alice: SessionContext = { userId: "alice", role: "user", orders: ["A001"] };

test("路径穿越被拦截：./data/../.env 不在 ./data 之内", () => {
  assert.equal(isInsideDir("./data", "notes/a.md"), true);
  assert.equal(isInsideDir("./data", "../.env"), false);
  assert.equal(isInsideDir("./data", "/etc/passwd"), false);
  assert.equal(authorize("writeFile", { path: "../.env" }, alice).allowed, false);
});

test("未登记策略的工具默认拒绝；高危操作需要人工确认", () => {
  assert.equal(authorize("dropDatabase", {}, alice).allowed, false);
  const d = authorize("sendEmail", { to: "x@example.com" }, alice);
  assert.ok(!d.allowed && d.needConfirm);
});

test("提示注入骗模型去查别人的订单：schema 合法，但授权层拒绝执行", async () => {
  const fake = new FakeModel([
    callTools({ name: "queryOrder", args: { orderId: "A002" } }),   // 文档里的恶意指令让模型去查 A002
    callTools({ name: "finish", args: { status: "blocked", answer: "无权查看该订单" } }),
  ]);
  const r = await runAgent({
    goal: "查我的订单",
    tools: defaultTools,
    model: fake,
    authorize: (name, args) => authorize(name, args, alice),
  });
  assert.equal(r.status, "blocked");
  const toolMsg = fake.requests[1]!.messages.find((m) => m.role === "tool");
  assert.match(JSON.stringify(toolMsg), /FORBIDDEN/);
  assert.doesNotMatch(JSON.stringify(toolMsg), /已签收/); // A002 的数据没有泄漏进上下文
});
