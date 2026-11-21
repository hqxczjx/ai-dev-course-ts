// agent/loop.ts —— 最小 Agent Loop（第 08 章 8.3）
// 五个要件：显式终止工具、步数上限、预算熔断、循环检测、轨迹记录；外加单工具超时。
import { z } from "zod";
import { toOpenAITools, type ToolDef } from "../lib/ai";
import { openAIModel, type ChatModel, type Msg } from "../lib/model";
import type { AuthDecision } from "../security/permissions";

// ── 要件①：显式终止工具 ──
// 「我认为任务完成」也是一次工具调用：比猜 finish_reason 更可控，还能强制提交结构化产物。
const FinishArgs = z.object({
  status: z.enum(["done", "blocked"]),
  answer: z.string().describe("给用户看的最终答案"),
});
export const finishTool: ToolDef<typeof FinishArgs> = {
  name: "finish",
  description:
    "任务完成时调用，提交最终答案。调用后循环结束。若信息不足也调用它，并在 status 里说明 blocked 与原因。",
  parameters: FinishArgs,
  execute: async () => ({ ok: true }), // 不真正执行，由循环拦截
};

export interface AgentConfig {
  goal: string;
  tools: ToolDef<any>[];
  model?: ChatModel;          // 默认真实模型；测试时注入 FakeModel
  maxSteps?: number;          // 要件②：步数上限（默认 8）
  maxBudgetTokens?: number;   // 要件③：预算熔断，按 total_tokens 累计（默认 60K）
  toolTimeoutMs?: number;     // 单个工具超时（默认 15s）
  signal?: AbortSignal;       // 用户取消
  /** 第 18 章权限层：schema 校验通过之后、执行之前调用；不传则不做授权（仅限只读演示） */
  authorize?: (toolName: string, validArgs: unknown) => AuthDecision | Promise<AuthDecision>;
}

export interface StepLog {    // 要件④：轨迹（每个工具调用一条）
  step: number;
  thought?: string;
  action: string;
  args: unknown;
  result: unknown;
  ms: number;
}

export type AgentResult =
  | { status: "done" | "blocked"; answer: string; trajectory: StepLog[]; stepsUsed: number; tokensUsed: number }
  | { status: "max_steps" | "budget_exceeded" | "no_progress"; trajectory: StepLog[]; stepsUsed: number; tokensUsed: number };

/** 给任意 Promise 加超时；超时后通过 AbortController 通知工具停止 */
export async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ac = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ac.abort();
      reject(new Error(`工具执行超时（>${ms}ms）`));
    }, ms);
  });
  try {
    return await Promise.race([run(ac.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM = (goal: string) => `你是一个任务执行 Agent。目标：${goal}
规则：1) 每步选择最有助于达成目标的工具；2) 工具结果不满意可以换方式重试，但禁止重复完全相同的调用；
3) 信息足够后立即调用 finish 提交答案，不要过度执行；4) 无法完成时调用 finish 并说明原因。`;

export async function runAgent(cfg: AgentConfig): Promise<AgentResult> {
  const model = cfg.model ?? openAIModel();
  const tools = [...cfg.tools, finishTool];
  const toolSpecs = toOpenAITools(tools);
  const registry = new Map(tools.map((t) => [t.name, t]));
  const maxSteps = cfg.maxSteps ?? 8;
  const maxBudget = cfg.maxBudgetTokens ?? 60_000;
  const toolTimeoutMs = cfg.toolTimeoutMs ?? 15_000;

  const trajectory: StepLog[] = [];
  const seenActions = new Set<string>();   // 要件⑤：循环检测
  let tokensUsed = 0;
  let nudged = false;
  const messages: Msg[] = [{ role: "system", content: SYSTEM(cfg.goal) }];

  for (let step = 1; step <= maxSteps; step++) {
    cfg.signal?.throwIfAborted();
    const { message: msg, usage } = await model.complete({
      messages, tools: toolSpecs, maxTokens: 1024, signal: cfg.signal,
    });
    tokensUsed += usage.total;              // 输入（含累积的工具结果）往往才是大头，所以算 total
    if (tokensUsed > maxBudget) {
      return { status: "budget_exceeded", trajectory, stepsUsed: step, tokensUsed };
    }

    const calls = (msg.tool_calls ?? []).filter((c) => c.type === "function");
    if (calls.length === 0) {
      // 模型没调工具直接说话：给一次机会拉回工作状态；再犯就体面地停下
      if (nudged) return { status: "no_progress", trajectory, stepsUsed: step, tokensUsed };
      nudged = true;
      messages.push(msg, { role: "user", content: "请继续使用工具推进任务，或调用 finish 提交。" });
      continue;
    }

    // ⚠️ 关键：这条 assistant 消息可能含「多个」tool_calls（并行调用）。
    // 历史里放了它，就必须为其中「每一个」call.id 都回一条 role:"tool" 消息，否则下一轮 API 直接 400。
    messages.push(msg);

    for (const call of calls) {
      const t0 = Date.now();
      let args: unknown;
      let result: unknown;

      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        result = { error: "INVALID_JSON", message: "参数不是合法 JSON，请重新生成。" };
      }

      if (result === undefined && call.function.name === "finish") {
        const parsed = FinishArgs.safeParse(args);
        if (parsed.success) {
          return { ...parsed.data, trajectory, stepsUsed: step, tokensUsed };
        }
        result = { error: "INVALID_FINISH", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
      }

      if (result === undefined) {
        const fingerprint = `${call.function.name}:${JSON.stringify(args)}`;
        if (seenActions.has(fingerprint)) {
          result = { error: "DUPLICATE_ACTION", hint: "你重复了完全相同的调用。请换参数、换工具，或调用 finish。" };
        } else {
          seenActions.add(fingerprint);
          try {
            const tool = registry.get(call.function.name);
            if (!tool) throw new Error(`未注册的工具: ${call.function.name}`);
            const valid = tool.parameters.parse(args);                  // ① 形状对不对
            const decision = cfg.authorize ? await cfg.authorize(tool.name, valid) : { allowed: true as const };
            if (!decision.allowed) {                                    // ② 有没有权限
              result = { error: decision.needConfirm ? "NEEDS_APPROVAL" : "FORBIDDEN", reason: decision.reason };
            } else {
              result = await withTimeout(() => tool.execute(valid), toolTimeoutMs);
            }
          } catch (err) {
            result = { error: true, message: err instanceof Error ? err.message : String(err) };
          }
        }
      }

      trajectory.push({
        step, thought: msg.content ?? undefined,
        action: call.function.name, args, result, ms: Date.now() - t0,
      });
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return { status: "max_steps", trajectory, stepsUsed: maxSteps, tokensUsed };
}
