// lib/ai.ts —— 课程统一 LLM 调用封装（第 02 章）+ 工具类型（第 07 章）
import "dotenv/config";
import OpenAI from "openai";
import { z } from "zod";

export const MODEL = process.env.MODEL ?? "deepseek-flash";

// 懒加载客户端：只有真正发请求时才读取 API_KEY。
// 好处：离线测试 import 本文件时不会因为没配 key 而在模块加载阶段就报错。
let _client: OpenAI | undefined;
export function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.API_KEY) throw new Error("缺少 API_KEY：复制 .env.example 为 .env 并填写");
    _client = new OpenAI({
      apiKey: process.env.API_KEY,
      baseURL: process.env.BASE_URL,
      // 重试由下面的 chat() 自己做。SDK 默认还会自动重试 2 次，
      // 两层叠加会让一次失败变成 3×3=9 次请求——要么关掉 SDK 的，要么别手写。
      maxRetries: 0,
    });
  }
  return _client;
}

export interface ChatOptions {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  model?: string;        // 覆盖默认 MODEL（第 17 章降级链/模型路由用）
  temperature?: number;  // 只在传了时才发送：GPT-6 推理模型与 Anthropic 新版 API 会拒绝该参数
  maxTokens?: number;
  json?: boolean;        // 第 04 章第一层保障：打开 JSON mode（response_format: json_object）
  retries?: number;      // 429/5xx 自动重试次数（默认 3）
  signal?: AbortSignal;  // 取消：用户点「停止」时一路传到这里，避免继续花钱
}

export interface ChatResult {
  text: string;
  finishReason: string;  // stop / length / tool_calls …（第 04 章：排查 JSON 截断的第一现场）
  usage: { input: number; output: number };
  durationMs: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 是否值得重试：限流与服务端错误重试；4xx 参数/鉴权错误重试也没用。 */
export function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 429 || (status !== undefined && status >= 500);
}

export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const retries = opts.retries ?? 3;
  const start = Date.now();

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await getClient().chat.completions.create(
        {
          model: opts.model ?? MODEL,
          messages: opts.messages,
          ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
          ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
          // DeepSeek 等兼容端点用 max_tokens；OpenAI 官方已标注弃用，改用 max_completion_tokens
          max_tokens: opts.maxTokens ?? 1024,
        },
        { signal: opts.signal },
      );
      const choice = res.choices[0];
      return {
        text: choice?.message.content ?? "",
        finishReason: choice?.finish_reason ?? "unknown",
        usage: {
          input: res.usage?.prompt_tokens ?? 0,
          output: res.usage?.completion_tokens ?? 0,
        },
        durationMs: Date.now() - start,
      };
    } catch (err) {
      if (!isRetryable(err) || attempt >= retries) throw err;
      const backoff = 2 ** attempt * 500 + Math.random() * 300; // 指数退避 + 抖动
      console.warn(`[ai] 重试 ${attempt + 1}/${retries}，${Math.round(backoff)}ms 后`);
      await sleep(backoff);
    }
  }
}

// ───────────────────────── 第 07 章：工具定义 ─────────────────────────

/** 工具 = 描述（给模型看）+ 参数 schema（给模型看 + 给代码校验）+ 实现 */
export interface ToolDef<T extends z.ZodType = z.ZodType> {
  name: string;
  description: string;   // 模型选不选它、参数给得对不对，七成看这里
  parameters: T;
  execute: (args: z.infer<T>) => Promise<unknown>;
}

export function defineTool<T extends z.ZodType>(t: ToolDef<T>): ToolDef<T> {
  return t;
}

/** Zod schema → OpenAI tools 格式。Zod 4 内置 z.toJSONSchema()，不再需要 zod-to-json-schema。 */
export function toOpenAITools(tools: ToolDef<any>[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: z.toJSONSchema(t.parameters) as Record<string, unknown>,
    },
  }));
}
