// security/permissions.ts —— 工具权限层（第 18 章 18.4 第 4 层）
//
// 两道检查，顺序不能反：
//   ① schema 校验（Zod）：参数「形状」对不对
//   ② 授权（本文件）：这个用户「能不能」对这个资源做这件事
// schema 合法 ≠ 有权限。授权判断只依赖代码与会话上下文，绝不依赖模型说了什么。
import path from "node:path";

/** 会话上下文：从登录态/请求里构造，绝不来自模型输出 */
export interface SessionContext {
  userId: string;
  role: "user" | "admin";
  orders: string[];        // 该用户可访问的订单号（由业务系统给出）
}

export type RiskLevel = "readonly" | "write" | "critical"; // critical = 钱、删除、对外发送、不可逆

export interface ToolPolicy {
  risk: RiskLevel;
  requiresConfirmation?: boolean;
  /** 资源范围校验：入参是「已通过 schema 校验」的参数 */
  scope?: (ctx: SessionContext, args: any) => boolean;
}

/** 路径必须落在 baseDir 之内。只用 startsWith("./data/") 会被 "./data/../.env" 绕过。 */
export function isInsideDir(baseDir: string, target: string): boolean {
  const root = path.resolve(baseDir);
  const resolved = path.resolve(root, target);
  return resolved === root || resolved.startsWith(root + path.sep);
}

export const POLICIES: Record<string, ToolPolicy> = {
  queryOrder:     { risk: "readonly", scope: (c, a) => c.orders.includes(String(a.orderId).toUpperCase()) }, // 只能查自己的单
  calculate:      { risk: "readonly" },
  getCurrentTime: { risk: "readonly" },
  writeFile:      { risk: "write", scope: (_c, a) => isInsideDir("./data", String(a.path)) },
  sendEmail:      { risk: "critical", requiresConfirmation: true },
  deleteOrder:    { risk: "critical", requiresConfirmation: true, scope: (c) => c.role === "admin" },
};

export type AuthDecision =
  | { allowed: true }
  | { allowed: false; needConfirm?: boolean; reason: string };

/** 在 runAgent 的「schema 校验之后、执行之前」调用 */
export function authorize(
  toolName: string,
  validArgs: unknown,
  ctx: SessionContext,
  policies: Record<string, ToolPolicy> = POLICIES,
): AuthDecision {
  const policy = policies[toolName];
  if (!policy) return { allowed: false, reason: "未登记权限策略的工具一律拒绝（默认拒绝）" };
  if (policy.scope && !policy.scope(ctx, validArgs)) {
    return { allowed: false, reason: "越权：该资源不在当前用户范围内" }; // 注入骗到模型也没用
  }
  if (policy.risk === "critical" && policy.requiresConfirmation !== false) {
    return { allowed: false, needConfirm: true, reason: "高危操作，需人工确认" }; // → 第 11 章审批流
  }
  return { allowed: true };
}
