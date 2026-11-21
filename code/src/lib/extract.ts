// lib/extract.ts —— 结构化输出：JSON 剥壳 + Zod 校验 + 修复循环（第 04 章 4.4 / 4.4.1）
import { z } from "zod";
import { chat, type ChatOptions, type ChatResult } from "./ai";

/** 防御性解析：剥掉模型可能加的 ```json 围栏和前后废话 */
export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

type SimpleMsg = { role: "system" | "user" | "assistant"; content: string };
/** 依赖注入点：默认用真实的 chat()，测试时传一个假的 */
export type ChatFn = (opts: ChatOptions) => Promise<Pick<ChatResult, "text">>;

export interface StructuredOptions {
  maxRepair?: number;    // 修复次数上限：每次修复都是一次新的 API 调用（花钱！）
  temperature?: number;  // 支持温度的模型（如 DeepSeek）抽取任务建议传 0
  maxTokens?: number;
  json?: boolean;        // 默认 true：打开 JSON mode；端点不支持时传 false，靠剥壳 + 校验兜底
  chatFn?: ChatFn;
}

/** 通用结构化函数：schema 进，类型安全的 T 出（第 08/11/14/17 章复用） */
export async function structured<T>(
  schema: z.ZodType<T>,
  messages: SimpleMsg[],
  opts: StructuredOptions = {},
): Promise<T> {
  const { maxRepair = 2, temperature, maxTokens = 800, json = true, chatFn = chat } = opts;
  const schemaDesc = `只输出 JSON，符合此 JSON Schema：\n${JSON.stringify(z.toJSONSchema(schema))}`;
  let msgs: SimpleMsg[] = [{ role: "system", content: schemaDesc }, ...messages];

  for (let attempt = 0; attempt <= maxRepair; attempt++) {
    const { text } = await chatFn({ messages: msgs, temperature, maxTokens, json });
    let issues: string;
    try {
      // JSON.parse 本身也会抛（截断、脏围栏），必须和校验放在同一个 try 里
      const parsed = schema.safeParse(JSON.parse(extractJson(text)));
      if (parsed.success) return parsed.data;
      issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (err) {
      issues = `输出不是合法 JSON（${String(err)}）`;
    }
    msgs = [
      ...msgs,
      { role: "assistant", content: text },
      { role: "user", content: `不符合要求：${issues}。请重新输出，只输出 JSON。` },
    ];
  }
  throw new Error(`structured: ${maxRepair + 1} 次尝试后仍不合格`);
}
