// lib/model.ts —— 模型端口 ChatModel（第 07 章引入）与离线 FakeModel（第 08 章 8.4.1）
//
// 思路：Agent 循环只依赖一个很窄的接口 `ChatModel.complete()`，
// 真实运行时注入 openAIModel()，测试时注入 FakeModel（按脚本返回预设回复）。
// 这样「未知工具、坏参数、并行调用、死循环、预算耗尽」这些失败路径
// 都能离线、确定、零成本地反复验证——不用指望真实模型「恰好」犯错。
import type OpenAI from "openai";
import { getClient, MODEL } from "./ai";

export type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
export type AssistantMsg = OpenAI.Chat.Completions.ChatCompletionMessage;
export type ToolSpec = OpenAI.Chat.Completions.ChatCompletionTool;

export interface ModelRequest {
  messages: Msg[];
  tools?: ToolSpec[];
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ModelResponse {
  message: AssistantMsg;
  usage: { input: number; output: number; total: number };
}

export interface ChatModel {
  complete(req: ModelRequest): Promise<ModelResponse>;
}

/** 真实模型：任何 OpenAI 兼容端点（DeepSeek / Qwen / OpenAI …）。 */
export function openAIModel(model: string = MODEL): ChatModel {
  return {
    async complete(req) {
      const res = await getClient().chat.completions.create(
        {
          model,
          messages: req.messages,
          ...(req.tools?.length ? { tools: req.tools } : {}),
          max_tokens: req.maxTokens ?? 1024,
        },
        { signal: req.signal },
      );
      const message = res.choices[0]?.message;
      if (!message) throw new Error("模型返回了空 choices");
      const input = res.usage?.prompt_tokens ?? 0;
      const output = res.usage?.completion_tokens ?? 0;
      return { message, usage: { input, output, total: res.usage?.total_tokens ?? input + output } };
    },
  };
}

// ───────────────────────── 离线测试替身 ─────────────────────────

type ScriptStep = AssistantMsg | ((req: ModelRequest) => AssistantMsg | Promise<AssistantMsg>);

/**
 * 按脚本依次返回回复的假模型。
 * - `requests` 记录每次收到的请求快照，测试里用它断言「历史消息拼得对不对」。
 * - 脚本用完还被调用 → 抛错（说明循环没按预期停下）。
 */
export class FakeModel implements ChatModel {
  readonly requests: ModelRequest[] = [];
  private readonly script: ScriptStep[];

  constructor(script: ScriptStep[], private readonly tokensPerCall = 100) {
    this.script = [...script];
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    this.requests.push({ ...req, messages: [...req.messages] }); // 快照：循环之后还会继续 push
    const step = this.script.shift();
    if (!step) throw new Error("FakeModel：脚本已用完，循环没有按预期结束");
    const message = typeof step === "function" ? await step(req) : step;
    return { message, usage: { input: this.tokensPerCall, output: 0, total: this.tokensPerCall } };
  }
}

/** 构造一条「模型直接说话」的回复 */
export function say(content: string): AssistantMsg {
  return { role: "assistant", content, refusal: null };
}

let fakeId = 0;
/** 构造一条「模型请求调用工具」的回复；传多组即并行工具调用 */
export function callTools(...calls: Array<{ name: string; args: unknown; id?: string; rawArgs?: string }>): AssistantMsg {
  return {
    role: "assistant",
    content: null,
    refusal: null,
    tool_calls: calls.map((c) => ({
      id: c.id ?? `call_${++fakeId}`,
      type: "function" as const,
      function: { name: c.name, arguments: c.rawArgs ?? JSON.stringify(c.args) },
    })),
  };
}
