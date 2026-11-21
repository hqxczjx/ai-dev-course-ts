import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { defineTool } from "../src/lib/ai";
import { FakeModel, callTools } from "../src/lib/model";
import { MemoryLedger } from "../src/reliability/ledger";
import { runWithApproval, resolveApproval, type Approval, type ApprovalStore } from "../src/multi/hitl";

test("NEEDS_APPROVAL -> approval stored -> approve executes once, second approve rejected / replay safe", async () => {
  let sent = 0;
  const sendEmail = defineTool({ name: "sendEmail", description: "发邮件", parameters: z.object({ to: z.string(), body: z.string() }), execute: async () => ({ id: ++sent }) });
  const rows = new Map<string, Approval>();
  const store: ApprovalStore = {
    async create(a) { const r: Approval = { ...a, id: `ap${rows.size + 1}`, status: "waiting" }; rows.set(r.id, r); return r; },
    async get(id) { return rows.get(id); },
    async update(id, patch) { rows.set(id, { ...rows.get(id)!, ...patch }); },
  };
  (globalThis as any).__fake = new FakeModel([
    callTools({ name: "sendEmail", args: { to: "a@b.c", body: "hi" } }),
    callTools({ name: "finish", args: { status: "blocked", answer: "等待审批" } }),
  ]);
  // runWithApproval uses default model; patch via module? simpler: call runAgent directly is not possible -> use env check below
  const { runAgent } = await import("../src/agent/loop");
  const { authorize } = await import("../src/security/permissions");
  const ctx = { userId: "u1", role: "user" as const, orders: [] };
  const r = await runAgent({ goal: "x", tools: [sendEmail], model: (globalThis as any).__fake, authorize: (n, a) => authorize(n, a, ctx) });
  assert.equal(r.status, "blocked");
  assert.match(JSON.stringify(r.trajectory[0]!.result), /NEEDS_APPROVAL/);
  assert.equal(sent, 0);
  const ap = await store.create({ taskId: "t1", tool: r.trajectory[0]!.action, args: r.trajectory[0]!.args });
  const ledger = new MemoryLedger();
  const out = await resolveApproval(ap.id, "approved", { store, ledger, tools: [sendEmail] });
  assert.deepEqual(out, { status: "executed", result: { id: 1 } });
  await assert.rejects(resolveApproval(ap.id, "approved", { store, ledger, tools: [sendEmail] }));
  assert.equal(sent, 1);
  void runWithApproval;
});

test("runWithApproval stores pending approval", async () => {
  const sendEmail = defineTool({ name: "sendEmail", description: "发邮件", parameters: z.object({ to: z.string() }), execute: async () => ({ ok: true }) });
  const rows: Approval[] = [];
  const store: ApprovalStore = { async create(a) { const r: Approval = { ...a, id: "1", status: "waiting" }; rows.push(r); return r; }, async get() { return rows[0]; }, async update() {} };
  const fake = new FakeModel([callTools({ name: "sendEmail", args: { to: "x" } }), callTools({ name: "finish", args: { status: "blocked", answer: "等待审批" } })]);
  const out = await runWithApproval("t1", "发邮件", [sendEmail], { userId: "u", role: "user", orders: [] }, store, fake);
  assert.equal(out.result.status, "blocked");
  assert.equal(out.approvals.length, 1);
  assert.deepEqual(rows[0]!.args, { to: "x" });
});
