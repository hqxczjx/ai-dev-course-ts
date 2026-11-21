// tools/search.ts —— 调研工具（第 11 章）：先 mock 跑通，真实搜索 API 换进来时保持返回结构不变
import { z } from "zod";
import { defineTool } from "../lib/ai";

export const searchTool = defineTool({
  name: "web_search",
  description: "搜索互联网，返回标题、摘要与 URL 列表。调研任务的入口工具。",
  parameters: z.object({
    query: z.string().min(1).describe("搜索关键词"),
    limit: z.number().int().min(1).max(10).default(5),
  }),
  execute: async ({ query, limit }) => ({
    results: Array.from({ length: limit }, (_, i) => ({
      title: `${query} · 资料 ${i + 1}`,
      url: `https://example.com/${i + 1}`,
      snippet: `关于「${query}」的第 ${i + 1} 条摘要…`,
    })),
  }),
});

export const fetchAndExtract = defineTool({
  name: "fetch_and_extract",
  description: "抓取指定 URL 的正文并转为纯文本（截断到 4000 字）。",
  parameters: z.object({ url: z.url() }),
  execute: async ({ url }) => ({
    url,
    text: `[mock] ${url} 的正文……（真实实现：fetch + 正文提取，并把正文当作不可信数据处理，见第 18 章）`,
  }),
});
