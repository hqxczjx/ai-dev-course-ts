// rag/chunk.ts —— 切片（第 13 章 13.3）
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { ChunkInput } from "../lib/vectorstore";

// RecursiveCharacterTextSplitter 的默认分隔符是 ["\n\n", "\n", " ", ""]：段落 → 行 → 空格 → 单字符，
// 没有句子级。中文句子之间没有空格，不加句读的话，一行太长就会被从字中间硬切开。
export const ZH_SEPARATORS = ["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""];

export interface ChunkOptions {
  chunkSize?: number;    // 按「字符数」计（lengthFunction 默认是 text.length），不是 token
  chunkOverlap?: number;
}

/** 中文语料的起点参数：500/80。只是起点，最终用评测集扫参数（13.8） */
export function createSplitter({ chunkSize = 500, chunkOverlap = 80 }: ChunkOptions = {}) {
  return new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap, separators: ZH_SEPARATORS });
}

export interface SourceDoc {
  source: string;       // 文件名，也是 chunk ID 的前缀
  text: string;
  visibleTo?: string[];
}

/**
 * 一篇文档 → 一组带稳定 ID 的 chunk。
 * ID = `${source}#${序号}`：同一篇文档重新入库时 ID 不变，向量库按 ID 覆盖而不是再插一份。
 */
export async function chunkDocument(doc: SourceDoc, opts: ChunkOptions = {}): Promise<ChunkInput[]> {
  const pieces = await createSplitter(opts).splitText(doc.text);
  // keepSeparator 默认为 true，但分隔符会留在「下一块」的开头（「。下一句」）——把它挪回上一块的末尾
  const fixed: string[] = [];
  for (const p of pieces) {
    const lead = p.match(/^[。！？；，]+/)?.[0] ?? "";
    if (lead && fixed.length) fixed[fixed.length - 1] += lead;
    fixed.push(p.slice(lead.length).trim());
  }
  return fixed
    .filter((p) => p.length > 0)
    .map((text, i) => ({ id: `${doc.source}#${i}`, text, source: doc.source, visibleTo: doc.visibleTo }));
}

/** 方案 B：按 Markdown 标题切块，标题随块携带（命中后知道「这块属于哪一节」） */
export function splitByHeadings(md: string): { heading: string; text: string }[] {
  return md
    .split(/\n(?=#{1,3}\s)/)
    .map((section) => {
      const firstLine = section.split("\n", 1)[0] ?? "";
      const heading = /^#{1,3}\s/.test(firstLine) ? firstLine.replace(/^#+\s*/, "").trim() : "";
      return { heading, text: section.trim() };
    })
    .filter((s) => s.text.length > 0);
}
