// rag/parse.ts —— 解析：Markdown / 纯文本 → 干净文本 + 元数据（第 13 章 13.2）
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import * as cheerio from "cheerio";
import { marked } from "marked";
import { PUBLIC } from "../lib/vectorstore";

export interface ParsedDoc {
  source: string;                // 文件名，作为引用来源与 chunk ID 前缀
  title: string;
  text: string;
  visibleTo: string[];           // 来自 front matter 的 visibleTo，缺省为公开
  meta: Record<string, string>;  // front matter 的其余字段（updated、version…）
}

/**
 * 极简 front matter：文件开头 `---` 包围的 `key: value` 行。
 * 示例语料用它声明 visibleTo（谁能看）和 updated（版本日期，冲突时判断新旧）。
 */
export function parseFrontMatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: raw.slice(m[0].length) };
}

/** Markdown → 纯文本：marked 转 HTML，cheerio 取文本。块级元素之间保留空行，切片时能按段落断开 */
export function markdownToText(md: string): string {
  const html = marked.parse(md, { async: false }); // 显式同步：返回类型就是 string，不是 string | Promise<string>
  const $ = cheerio.load(html);
  $("script, style, nav, footer").remove();         // 网页类内容先剥噪音
  const BLOCKS = "h1, h2, h3, h4, h5, h6, p, li, pre, blockquote, td, th";
  const blocks = $(BLOCKS)
    .filter((_, el) => $(el).parents(BLOCKS).length === 0) // 只取最外层，避免 <li><p> 文本重复
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 0);
  return blocks.join("\n\n");
}

export async function parseFile(path: string): Promise<ParsedDoc> {
  const raw = await readFile(path, "utf-8");
  const { meta, body } = parseFrontMatter(raw);
  const ext = extname(path).toLowerCase();
  if (ext !== ".md" && ext !== ".txt") throw new Error(`暂不支持的格式：${ext}（PDF 见第 13 章 13.2 的 parsePdf）`);
  const text = ext === ".md" ? markdownToText(body) : body.trim();
  const { visibleTo, title, ...rest } = meta;
  return {
    source: basename(path),
    title: title ?? basename(path, ext),
    text,
    visibleTo: visibleTo ? visibleTo.split(/[,，\s]+/).filter(Boolean) : [PUBLIC],
    meta: rest,
  };
}
