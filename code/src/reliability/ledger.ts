// reliability/ledger.ts —— 写操作的意图日志 + 幂等执行 + 崩溃后核对（第 17 章 17.1「幂等」）
//
// 核心问题：工具写操作（建工单/发邮件/下单）执行到一半进程崩了，重启后怎么办？
//   - 盲目重试 → 可能重复建单、重复扣款
//   - 当作没发生 → 可能漏单
// 正确做法：「重试之前先查状态」
//   1. 执行前先落一条意图记录（status=started，带幂等键）
//   2. 执行成功后改成 succeeded 并存结果；失败改成 failed
//   3. 同一个幂等键再来：succeeded → 直接返回上次结果；started → 状态未知，先去业务系统核对，不许重试
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export type LedgerStatus = "started" | "succeeded" | "failed";

export interface LedgerEntry {
  key: string;
  tool: string;
  args: unknown;
  status: LedgerStatus;
  result?: unknown;
  error?: string;
  updatedAt: string;
}

export interface Ledger {
  get(key: string): LedgerEntry | undefined;
  put(entry: LedgerEntry): void;
  list(): LedgerEntry[];
}

export class MemoryLedger implements Ledger {
  private readonly rows = new Map<string, LedgerEntry>();
  get(key: string) { return this.rows.get(key); }
  put(entry: LedgerEntry) { this.rows.set(entry.key, entry); }
  list() { return [...this.rows.values()]; }
}

/** 落盘版：每次写入都同步刷到文件，进程重启后仍在（生产用数据库表，唯一约束放在 key 上） */
export class JsonFileLedger implements Ledger {
  constructor(private readonly file: string) {}
  private load(): Record<string, LedgerEntry> {
    return existsSync(this.file) ? (JSON.parse(readFileSync(this.file, "utf8")) as Record<string, LedgerEntry>) : {};
  }
  get(key: string) { return this.load()[key]; }
  put(entry: LedgerEntry) {
    const all = this.load();
    all[entry.key] = entry;
    writeFileSync(this.file, JSON.stringify(all, null, 2));
  }
  list() { return Object.values(this.load()); }
}

/** 稳定序列化：对象键排序，保证 {a,b} 与 {b,a} 得到同一个幂等键 */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

/** 幂等键 = 业务意图的指纹：同一任务里「同一工具 + 同一参数」只应产生一次副作用 */
export function idempotencyKey(taskId: string, tool: string, args: unknown): string {
  return createHash("sha256").update(`${taskId}|${tool}|${stable(args)}`).digest("hex").slice(0, 32);
}

export type IdempotentOutcome =
  | { status: "executed"; result: unknown }
  | { status: "replayed"; result: unknown }      // 之前成功过：直接返回旧结果，不再产生副作用
  | { status: "needs_reconcile"; entry: LedgerEntry }; // 上次停在 started：副作用可能已发生，先核对

export async function runIdempotent(
  ledger: Ledger,
  input: { key: string; tool: string; args: unknown },
  exec: (key: string) => Promise<unknown>,   // 把 key 传给下游：下游系统也应按它去重
): Promise<IdempotentOutcome> {
  const prev = ledger.get(input.key);
  if (prev?.status === "succeeded") return { status: "replayed", result: prev.result };
  if (prev?.status === "started") return { status: "needs_reconcile", entry: prev };

  const now = () => new Date().toISOString();
  ledger.put({ ...input, status: "started", updatedAt: now() });       // ① 先记意图
  try {
    const result = await exec(input.key);                              // ② 再执行
    ledger.put({ ...input, status: "succeeded", result, updatedAt: now() }); // ③ 记结果
    return { status: "executed", result };
  } catch (err) {
    // 注意：只有「确定没执行」的错误才该记成 failed（比如参数被下游拒绝）。
    // 超时这类「不知道执行没执行」的错误，保留 started，让重启后的核对流程处理。
    if (!isAmbiguous(err)) {
      ledger.put({ ...input, status: "failed", error: String(err), updatedAt: now() });
    }
    throw err;
  }
}

function isAmbiguous(err: unknown): boolean {
  return /timeout|超时|ECONNRESET|socket hang up/i.test(String(err));
}

/**
 * 重启后调用：找出所有停在 started 的写操作，去业务系统按幂等键查一遍。
 * 查到了 → 补记 succeeded；查不到 → 标记 failed，允许安全重试。
 */
export async function reconcile(
  ledger: Ledger,
  lookup: (key: string) => Promise<unknown | undefined>,
): Promise<{ confirmed: string[]; safeToRetry: string[] }> {
  const confirmed: string[] = [];
  const safeToRetry: string[] = [];
  for (const e of ledger.list().filter((x) => x.status === "started")) {
    const found = await lookup(e.key);
    const updatedAt = new Date().toISOString();
    if (found !== undefined) {
      ledger.put({ ...e, status: "succeeded", result: found, updatedAt });
      confirmed.push(e.key);
    } else {
      ledger.put({ ...e, status: "failed", error: "核对后确认未执行", updatedAt });
      safeToRetry.push(e.key);
    }
  }
  return { confirmed, safeToRetry };
}
