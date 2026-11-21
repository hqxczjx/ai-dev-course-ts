// lib/embed.ts —— Embedding 封装（第 12 章 12.2-12.3）
//
// 设计要点：
// 1. `Embedder` 只是一个函数类型：文本数组进、向量数组出。向量库、检索器都只依赖它，
//    真实运行注入 openAIEmbedder()，离线测试注入 fakeEmbedder()——和第 08 章 ChatModel 端口同一个思路。
// 2. 客户端懒加载：import 本文件不会因为没配 key 报错，只有真正调用时才检查。
// 3. 分批大小交给环境变量：各家单次请求的条数上限不同（百炼 text-embedding-v4 最多 10 条），默认 10 最稳。
import "dotenv/config";
import OpenAI from "openai";

export type Embedder = (texts: string[]) => Promise<number[][]>;

export interface OpenAIEmbedderOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  batchSize?: number;
  dimensions?: number; // 只有支持降维的模型才传（如 OpenAI 3 系、Qwen3-Embedding）；bge-m3 不支持
  fetch?: typeof fetch; // 测试时注入假的 HTTP 层，验证分批逻辑而不花钱
}

/** 真实 embedding：任何 OpenAI 兼容的 /embeddings 端点（硅基流动、百炼、OpenAI、Ollama…） */
export function openAIEmbedder(opts: OpenAIEmbedderOptions = {}): Embedder {
  const model = opts.model ?? process.env.EMBED_MODEL ?? "BAAI/bge-m3"; // 硅基流动免费模型（别选收费的 Pro/BAAI/bge-m3）
  const batchSize = opts.batchSize ?? positiveInt(process.env.EMBED_BATCH, 10);
  let client: OpenAI | undefined;

  return async (texts) => {
    if (texts.length === 0) return [];
    if (!client) {
      const apiKey = opts.apiKey ?? process.env.EMBED_API_KEY;
      if (!apiKey) throw new Error("缺少 EMBED_API_KEY：embedding 和对话模型通常不是同一家，单独配置");
      client = new OpenAI({
        apiKey,
        baseURL: opts.baseURL ?? process.env.EMBED_BASE_URL ?? "https://api.siliconflow.cn/v1",
        maxRetries: 2, // 入库是批处理，交给 SDK 自带的退避重试即可
        ...(opts.fetch ? { fetch: opts.fetch } : {}),
      });
    }
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const res = await client.embeddings.create({
        model,
        input: texts.slice(i, i + batchSize),
        ...(opts.dimensions ? { dimensions: opts.dimensions } : {}),
      });
      // 按 index 排回原顺序：协议没有承诺 data 的顺序与 input 一致
      const sorted = [...res.data].sort((a, b) => a.index - b.index);
      out.push(...sorted.map((d) => d.embedding));
    }
    return out;
  };
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** 余弦相似度：点积 / (模 × 模)，取值 [-1, 1]，越接近 1 方向越一致 */
export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error(`维度不一致：${a.length} vs ${b.length}（是不是混用了两个 embedding 模型？）`);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ───────────────────────── 离线测试替身 ─────────────────────────

/**
 * 确定性的假 embedding：把文本的单字和相邻二字（n-gram）哈希进固定维度的桶里，再归一化。
 * 共享的字/词越多，向量越接近——足够让离线测试验证「检索链路」的逻辑，
 * 但它不懂语义（「退掉」和「退货」只因为都有「退」才接近），效果评估仍要用真实模型。
 */
export function fakeEmbedder(dim = 256): Embedder {
  return async (texts) =>
    texts.map((text) => {
      const v = new Array<number>(dim).fill(0);
      const chars = [...text.toLowerCase().replace(/\s+/g, "")];
      for (let i = 0; i < chars.length; i++) {
        bump(v, chars[i]!, 1);
        if (i + 1 < chars.length) bump(v, chars[i]! + chars[i + 1]!, 2); // 二字组权重更高
      }
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
      return v.map((x) => x / norm);
    });
}

function bump(v: number[], gram: string, weight: number) {
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < gram.length; i++) h = Math.imul(h ^ gram.charCodeAt(i), 16777619);
  const idx = (h >>> 0) % v.length;
  v[idx] = (v[idx] ?? 0) + weight;
}
