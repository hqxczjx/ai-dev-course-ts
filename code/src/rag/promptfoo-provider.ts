// rag/promptfoo-provider.ts —— 把整条 RAG 管道包成 promptfoo 的自定义 provider（第 13 章 13.8）
//
// 返回约定：
//   output   = 回答 + 末尾一行「引用：…文件名」（contains 断言可以直接检查来源）
//   metadata = { context: 送进生成的片段文本[], status, sources }
// context-faithfulness / context-recall 用 `contextTransform: context.metadata.context` 取检索片段。
// 前提：已经 npm run ingest 过（真实 embedding）；评测时读的是同一个 data 目录。
import { ask } from "./ask";
import { openKnowledgeBase, type KnowledgeBase } from "./kb";
import { httpReranker, noRerank } from "./rerank";

let kb: Promise<KnowledgeBase> | undefined;

export default class RagProvider {
  id() {
    return "rag-knowledge-base";
  }

  async callApi(prompt: string, context?: { vars?: Record<string, unknown> }) {
    try {
      kb ??= openKnowledgeBase();
      const { retriever } = await kb;
      const role = String(context?.vars?.role ?? "employee");
      const reranker = process.env.RERANK_API_KEY ? httpReranker() : noRerank;
      const r = await ask(prompt, { id: "eval", roles: [role] }, { retriever, reranker, topK: 5 });
      const sources = [...new Set(r.citations.map((c) => c.source))];
      return {
        output: sources.length ? `${r.answer}\n\n引用：${sources.join("、")}` : r.answer,
        metadata: { context: r.hits.map((h) => h.text), status: r.status, sources, issues: r.issues },
      };
    } catch (err) {
      return { error: String(err) };
    }
  }
}
