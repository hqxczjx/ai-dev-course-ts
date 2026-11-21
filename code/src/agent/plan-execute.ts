// agent/plan-execute.ts —— 两段式：planner（一次结构化调用）+ executor（每步一个小 runAgent）
import { z } from "zod";
import type { ToolDef } from "../lib/ai";
import { structured, type ChatFn } from "../lib/extract";
import type { ChatModel } from "../lib/model";
import { runAgent } from "./loop";

const Plan = z.object({
  steps: z.array(z.object({
    id: z.number().int(),
    description: z.string().describe("这一步要完成什么，写成可以独立执行的小目标"),
    tool: z.string().describe("预计使用的工具名"),
  })).min(1).max(6),
});
export type Plan = z.infer<typeof Plan>;

export interface PlanExecuteDeps {
  model?: ChatModel;   // 执行用的模型（测试时注入 FakeModel）
  planChat?: ChatFn;   // 规划用的 chat 函数（测试时注入假的）
}

export async function planAndExecute(goal: string, tools: ToolDef<any>[], deps: PlanExecuteDeps = {}) {
  // ① 规划：一次结构化调用（第 04 章 structured），不需要循环
  const toolList = tools.map((t) => `- ${t.name}：${t.description}`).join("\n");
  const plan = await structured(Plan, [
    { role: "system", content: `你是任务规划器。可用工具：\n${toolList}\n把目标拆成 1-6 个按顺序执行的步骤。` },
    { role: "user", content: goal },
  ], deps.planChat ? { chatFn: deps.planChat } : {});

  // ② 执行：每步一个小 Agent，前面步骤的结果作为上下文传下去
  const done: string[] = [];
  for (const s of plan.steps) {
    const r = await runAgent({
      goal: `总目标：${goal}\n已完成：\n${done.join("\n") || "（无）"}\n现在只执行第 ${s.id} 步：${s.description}。完成后调用 finish 汇报这一步的结果。`,
      tools, model: deps.model, maxSteps: 4,
    });
    // ③ 某步失败：最简单的策略是停下并如实报告（进阶：重新规划剩余步骤，见练习 4）
    if (r.status !== "done") return { status: "failed" as const, failedStep: s.id, reason: r.status, plan, done };
    done.push(`第 ${s.id} 步：${r.answer}`);
  }
  return { status: "done" as const, plan, done };
}
