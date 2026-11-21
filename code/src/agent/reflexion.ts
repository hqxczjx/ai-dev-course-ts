// agent/reflexion.ts —— 失败 → 写下教训 → 带着教训重跑（默认最多 3 轮）
import { z } from "zod";
import type { ToolDef } from "../lib/ai";
import { structured, type ChatFn } from "../lib/extract";
import type { ChatModel } from "../lib/model";
import { runAgent } from "./loop";

const Lesson = z.object({
  lesson: z.string().describe("这一轮失败的根本原因"),
  avoid: z.string().describe("下一轮必须避免的具体做法"),
});

export interface ReflexionDeps {
  model?: ChatModel;      // 执行用的模型
  reflectChat?: ChatFn;   // 反思用的 chat 函数
}

export async function reflexion(task: string, tools: ToolDef<any>[], deps: ReflexionDeps = {}, maxRounds = 3) {
  const lessons: string[] = [];
  for (let round = 1; ; round++) {
    const r = await runAgent({
      goal: task + (lessons.length ? `\n\n【之前失败的教训，务必避免】\n${lessons.join("\n")}` : ""),
      tools, model: deps.model, maxSteps: 8,
    });
    if (r.status === "done" || round >= maxRounds) return { result: r, rounds: round, lessons };

    // 反思：不带工具，只看轨迹，输出结构化的教训（轨迹可能很长，截断控制成本）
    const { lesson, avoid } = await structured(Lesson, [
      { role: "user", content: `任务：${task}\n结束状态：${r.status}\n执行轨迹：${JSON.stringify(r.trajectory).slice(0, 6000)}\n请分析失败原因。` },
    ], deps.reflectChat ? { chatFn: deps.reflectChat } : {});
    lessons.push(`第 ${round} 轮：${lesson}；下次避免：${avoid}`);
  }
}
