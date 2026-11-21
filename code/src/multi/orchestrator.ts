// multi/orchestrator.ts —— 主从式多 Agent 编排（第 11 章 11.3）
import { z } from "zod";
import { runAgent } from "../agent/loop";
import type { ToolDef } from "../lib/ai";
import { structured, type ChatFn } from "../lib/extract";
import { openAIModel, type ChatModel } from "../lib/model";
import { calcTool } from "../tools";
import { fetchAndExtract, searchTool } from "../tools/search";

// 主控的规划产物：结构化任务简报（主控与 Worker 之间的接口契约）
export const Plan = z.object({
  subtasks: z.array(z.object({
    id: z.string(),
    goal: z.string().describe("给子 Agent 的完整任务简报：目标、输出格式、约束"),
    worker: z.enum(["researcher", "analyst", "writer"]),
  })).min(2).max(6),
  aggregation: z.string().describe("如何聚合各子任务结果（如：合并要点、按主题分组）"),
});
export type Plan = z.infer<typeof Plan>;
export type WorkerName = Plan["subtasks"][number]["worker"];

// Worker 三隔离：system（职责）、tools（权限）、model（成本）
export const WORKERS: Record<WorkerName, { system: string; tools: ToolDef<any>[]; model: string | undefined }> = {
  researcher: {
    system: "你是调研员。只负责搜集与核实信息，逐条注明来源 URL。不做主观评价。",
    tools: [searchTool, fetchAndExtract],
    model: process.env.MODEL_CHEAP,           // 执行用便宜模型
  },
  analyst: {
    system: "你是分析师。基于给定材料提炼要点与结论，标注每个结论的依据。",
    tools: [calcTool],
    model: process.env.MODEL_CHEAP,
  },
  writer: {
    system: "你是技术作者。把给定素材写成结构清晰的中文报告，保留引用编号。",
    tools: [],                                // 写作不需要工具
    model: process.env.MODEL_GOOD,            // 最终产出用强模型（模型路由）
  },
};

export interface PipelineDeps {
  /** 每个 Worker 用哪个模型；默认按 WORKERS[name].model 创建真实模型，测试时注入 FakeModel */
  modelFor?: (worker: WorkerName) => ChatModel;
  /** 规划器使用的 chat 函数；测试时注入假的 */
  planChat?: ChatFn;
}

export async function runPipeline(topic: string, deps: PipelineDeps = {}) {
  const modelFor = deps.modelFor ?? ((w: WorkerName) => openAIModel(WORKERS[w].model));

  // ① 规划：一次结构化调用，不需要循环
  const plan = await structured(Plan, [
    { role: "system", content: `你是任务规划器。把用户的调研需求拆成 2-6 个子任务，
分给 researcher（需要联网查的）、analyst（需要计算/提炼的）、writer（最后成文的，至多 1 个）。` },
    { role: "user", content: topic },
  ], deps.planChat ? { chatFn: deps.planChat } : {});

  // ② 执行：researcher/analyst 并行，writer 等它们完成
  const parallel = plan.subtasks.filter((t) => t.worker !== "writer");
  const writerTasks = plan.subtasks.filter((t) => t.worker === "writer");

  const settled = await Promise.allSettled(          // allSettled：一个失败不拖垮全局
    parallel.map(async (t) => {
      const w = WORKERS[t.worker];
      const r = await runAgent({
        goal: `${w.system}\n任务简报：${t.goal}`,
        tools: w.tools, model: modelFor(t.worker), maxSteps: 5,
      });
      if (r.status === "done") return [t.id, r.answer] as const;
      throw new Error(`子任务 ${t.id} 失败: ${r.status}`);
    }),
  );

  const results = new Map<string, string>();
  const failures: string[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") results.set(s.value[0], s.value[1]);
    else failures.push(s.reason instanceof Error ? s.reason.message : String(s.reason));
  }

  // ③ 聚合 + 降级：失败的子任务不阻断整体，缺席信息在报告中标明（静默失败是最恶劣的 bug）
  const material = [...results.entries()].map(([id, text]) => `## 子任务 ${id}\n${text}`).join("\n\n");
  const failureNote = failures.length ? `\n\n⚠️ 有 ${failures.length} 个子任务失败：${failures.join("；")}` : "";
  if (writerTasks.length === 0) return { report: material + failureNote, plan, failures };

  const w = WORKERS.writer;
  const final = await runAgent({
    goal: `${w.system}\n素材：\n${material}\n${failureNote}\n\n请按「${plan.aggregation}」写成完整报告。`,
    tools: w.tools, model: modelFor("writer"), maxSteps: 2,
  });
  const report = final.status === "done"
    ? final.answer
    : material + failureNote + "\n\n（成文阶段失败，返回原始素材）";
  return { report, plan, failures };
}
