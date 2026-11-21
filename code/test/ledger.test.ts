// 第 17 章：幂等执行与崩溃后核对的离线测试
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { JsonFileLedger, MemoryLedger, idempotencyKey, reconcile, runIdempotent } from "../src/reliability/ledger";

/** 模拟外部工单系统：按幂等键去重 */
function ticketSystem() {
  const tickets = new Map<string, { id: string; title: string }>();
  return {
    tickets,
    async create(key: string, title: string) {
      const existing = tickets.get(key);
      if (existing) return existing;
      const t = { id: `T${tickets.size + 1}`, title };
      tickets.set(key, t);
      return t;
    },
    async lookup(key: string) { return tickets.get(key); },
  };
}

test("参数顺序不同，幂等键相同", () => {
  assert.equal(idempotencyKey("task1", "createTicket", { a: 1, b: 2 }), idempotencyKey("task1", "createTicket", { b: 2, a: 1 }));
});

test("同一意图重复调用：第二次直接返回上次结果，不产生第二张工单", async () => {
  const ledger = new MemoryLedger();
  const sys = ticketSystem();
  const args = { title: "电脑维修" };
  const key = idempotencyKey("task1", "createTicket", args);
  const first = await runIdempotent(ledger, { key, tool: "createTicket", args }, (k) => sys.create(k, args.title));
  const second = await runIdempotent(ledger, { key, tool: "createTicket", args }, (k) => sys.create(k, args.title));
  assert.equal(first.status, "executed");
  assert.equal(second.status, "replayed");
  assert.equal(sys.tickets.size, 1);
});

test("崩溃恢复：停在 started 的写操作不许盲目重试，先按幂等键去业务系统核对", async () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "ledger-")), "ledger.json");
  const sys = ticketSystem();
  const args = { title: "电脑维修" };
  const key = idempotencyKey("task1", "createTicket", args);

  // 第一次运行：工单其实已经建好，但在记 succeeded 之前进程崩了（这里用「超时」模拟状态未知）
  const before = new JsonFileLedger(file);
  await assert.rejects(runIdempotent(before, { key, tool: "createTicket", args }, async (k) => {
    await sys.create(k, args.title);
    throw new Error("socket hang up");
  }));

  // 重启：新进程读同一个文件
  const after = new JsonFileLedger(file);
  const retry = await runIdempotent(after, { key, tool: "createTicket", args }, (k) => sys.create(k, args.title));
  assert.equal(retry.status, "needs_reconcile");          // 不重试，等核对

  const r = await reconcile(after, (k) => sys.lookup(k));
  assert.deepEqual(r.confirmed, [key]);                   // 核对发现已执行 → 补记成功
  assert.equal(sys.tickets.size, 1);                      // 始终只有一张工单
  assert.equal((await runIdempotent(after, { key, tool: "createTicket", args }, (k) => sys.create(k, args.title))).status, "replayed");
});
