// multi/hitl.ts —— 人工审批：权限层「拦下」→ 持久化「挂起」→ 人工「裁决」→ 幂等「执行」
// ⚠️ 接口示意：ApprovalStore 只给接口（实现见第 22 章项目 3 的 approvals 表）；其余部件都是真实代码：
//    runAgent 的 authorize 钩子（code/src/agent/loop.ts）、authorize()（code/src/security/permissions.ts，第 18 章）、
//    idempotencyKey/runIdempotent（code/src/reliability/ledger.ts，第 17 章）。
import { runAgent } from "../agent/loop";
import type { ToolDef } from "../lib/ai";
import type { ChatModel } from "../lib/model";
import { idempotencyKey, runIdempotent, type Ledger } from "../reliability/ledger";
import { authorize, type SessionContext } from "../security/permissions";

export interface Approval {
  id: string;
  taskId: string;
  tool: string;
  args: unknown;
  status: "waiting" | "approved" | "rejected";
  note?: string;
}
export interface ApprovalStore {   // 必须持久化：审批人可能一小时后才来，进程早已重启
  create(a: Omit<Approval, "id" | "status">): Promise<Approval>;
  get(id: string): Promise<Approval | undefined>;
  update(id: string, patch: Partial<Approval>): Promise<void>;
}

// ① Agent 侧：高危工具被权限层拦下 → 工具结果是 NEEDS_APPROVAL → 模型按 system 规则 finish(blocked)
export async function runWithApproval(
  taskId: string, goal: string, tools: ToolDef<any>[], ctx: SessionContext, store: ApprovalStore, model?: ChatModel,
) {
  const result = await runAgent({ goal, tools, model, authorize: (name, args) => authorize(name, args, ctx) });
  const pending = result.trajectory.filter(
    (s) => (s.result as { error?: string } | null)?.error === "NEEDS_APPROVAL",
  );
  // 审批粒度是「这一笔操作」：每个被拦下的调用一条记录
  const approvals = await Promise.all(pending.map((s) => store.create({ taskId, tool: s.action, args: s.args })));
  return { result, approvals };   // 前端（第 20 章）把 approvals 渲染成审批卡
}

// ② 审批人裁决：批准后由「代码」直接执行这一笔，而不是让 Agent 重跑一遍、赌它再调一次
export async function resolveApproval(
  id: string, decision: "approved" | "rejected",
  deps: { store: ApprovalStore; ledger: Ledger; tools: ToolDef<any>[] },
  note?: string,
) {
  const a = await deps.store.get(id);
  if (!a || a.status !== "waiting") throw new Error(`审批 ${id} 不存在或已处理`);
  await deps.store.update(id, { status: decision, note });
  if (decision === "rejected") return { status: "rejected" as const };

  const tool = deps.tools.find((t) => t.name === a.tool);
  if (!tool) throw new Error(`未注册的工具: ${a.tool}`);
  const valid = tool.parameters.parse(a.args);   // 轨迹里存的是原始参数，执行前再校验一次
  // ③ 幂等执行：审批人连点两次、或执行到一半进程崩了再来，都不会重复发信/重复扣款（第 17 章）
  const key = idempotencyKey(a.taskId, a.tool, valid);
  return runIdempotent(deps.ledger, { key, tool: a.tool, args: valid }, () => tool.execute(valid));
  // 结果是 executed / replayed / needs_reconcile；再把它作为新信息交给 Agent 续跑剩余任务
}
