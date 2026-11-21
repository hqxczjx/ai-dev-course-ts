// rag/ingest.ts —— 离线入库管道：解析 → 入库审核 → 切片 → 向量库 + 关键词索引（第 13 章 13.2-13.4）
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { VectorStore } from "../lib/vectorstore";
import { chunkDocument, type ChunkOptions } from "./chunk";
import type { KeywordIndex } from "./keyword";
import { parseFile } from "./parse";

// 入库审核（第 18 章间接注入的第一道防线）：文档里出现「对模型下指令」的句式就先隔离，人工复核后再放行。
// 这只是关键词启发式，挡不住改写过的攻击——所以生成端还有第二、三道防线（answer.ts 的提示词与引用校验）。
const INJECTION_PATTERNS = [
  /忽略(之前|以上|上面|前面)?(的)?(所有|全部)?(规则|指令|要求|设定)/,
  /ignore (all )?(previous|prior|above) (instructions|rules)/i,
  /(你现在是|从现在起你是|system prompt|系统提示词)/i,
  /(必须|务必)(回答|输出|告诉用户)[:：]/,
];

export function detectInjection(text: string): string[] {
  return INJECTION_PATTERNS.filter((p) => p.test(text)).map((p) => p.source);
}

export interface IngestOptions extends ChunkOptions {
  quarantineSuspicious?: boolean; // 默认 true：可疑文档不入库；评测「第二道防线」时可以关掉
}

export interface IngestReport {
  files: number;
  chunks: number;
  quarantined: { source: string; patterns: string[] }[];
}

/**
 * 把目录下的 .md/.txt 全部入库。可重复运行：
 * 每个文件按「来源」整体替换（chunk ID 稳定 → 按 ID 覆盖；切片数变少时多出来的旧 chunk 一并删除），
 * 所以跑第二遍不会产生重复 chunk。
 */
export async function ingestDir(
  dir: string,
  deps: { store: VectorStore; keywords: KeywordIndex },
  opts: IngestOptions = {},
): Promise<IngestReport> {
  const { quarantineSuspicious = true, ...chunkOpts } = opts;
  const names = (await readdir(dir)).filter((n) => /\.(md|txt)$/i.test(n)).sort();
  const report: IngestReport = { files: 0, chunks: 0, quarantined: [] };

  for (const name of names) {
    const doc = await parseFile(join(dir, name));
    const patterns = detectInjection(doc.text);
    if (patterns.length && quarantineSuspicious) {
      report.quarantined.push({ source: doc.source, patterns });
      // 之前入过库的版本也要撤下，否则「隔离」形同虚设
      await deps.store.deleteBySource(doc.source);
      deps.keywords.replaceSource(doc.source, []);
      continue;
    }
    const chunks = await chunkDocument(doc, chunkOpts);
    await deps.store.replaceSource(doc.source, chunks);
    deps.keywords.replaceSource(doc.source, chunks);
    report.files++;
    report.chunks += chunks.length;
  }
  return report;
}
