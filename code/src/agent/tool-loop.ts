// agent/tool-loop.ts —— 工具调用循环（第 07 章 7.4）
import { toOpenAITools, type ToolDef } from "../lib/ai";
import { openAIModel, type ChatModel, type Msg } from "../lib/model";
import { defaultTools } from "../tools";

export interface ToolLoopResult {
  status: "answered" | "max_steps";
  answer?: string;
  messages: Msg[];
}

/** 执行一次工具调用：解析 → 校验 → 执行；任何失败都转成结构化错误（错误也是给模型的信息） */
export async function executeToolCall(
  registry: Map<string, ToolDef<any>>,
  name: string,
  rawArguments: string,
): Promise<unknown> {
  try {
    const tool = registry.get(name);
    if (!tool) throw new Error(`未注册的工具: ${name}`);
    const rawArgs: unknown = JSON.parse(rawArguments || "{}"); // 坏 JSON 也在 try 里接住
    const args = tool.parameters.parse(rawArgs);                // 模型给的参数也是「模型输出」，必须校验
    return await tool.execute(args);
  } catch (err) {
    return { error: true, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function runToolLoop(
  question: string,
  { model = openAIModel(), tools = defaultTools as ToolDef<any>[], maxSteps = 6 }:
    { model?: ChatModel; tools?: ToolDef<any>[]; maxSteps?: number } = {},
): Promise<ToolLoopResult> {
  const registry = new Map(tools.map((t) => [t.name, t]));
  const messages: Msg[] = [
    { role: "system", content: "你是电商客服助手。能用工具获取的事实就不要凭记忆回答。" },
    { role: "user", content: question },
  ];

  for (let step = 0; step < maxSteps; step++) {
    const { message } = await model.complete({ messages, tools: toOpenAITools(tools), maxTokens: 800 });

    if (message.tool_calls?.length) {
      // ② 先把这条 assistant 消息（含全部 tool_calls）存入历史
      messages.push(message);
      // ③-⑤ 每一个 tool_call 都必须有一条 role:"tool" 回执，tool_call_id 严格对应
      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        const result = await executeToolCall(registry, call.function.name, call.function.arguments);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
      continue;
    }

    // ⑥ 没有工具调用 → 最终回答
    messages.push(message);
    return { status: "answered", answer: message.content ?? "", messages };
  }
  return { status: "max_steps", messages };
}
