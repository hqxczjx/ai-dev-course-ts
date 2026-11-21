// rag/kb.ts —— 装配：打开向量库 + 关键词索引，组成混合检索器（入库脚本、问答脚本、promptfoo provider 共用）
import { join } from "node:path";
import { fakeEmbedder, openAIEmbedder, type Embedder } from "../lib/embed";
import { VectorStore } from "../lib/vectorstore";
import { HybridRetriever } from "./hybrid";
import { KeywordIndex } from "./keyword";

export interface KnowledgeBase {
  store: VectorStore;
  keywords: KeywordIndex;
  retriever: HybridRetriever;
  saveKeywords(): Promise<void>; // 关键词索引在内存里：入库后必须落盘，问答进程才看得到
}

export interface OpenKbOptions {
  dataDir?: string;
  offline?: boolean; // true：用 fakeEmbedder（不需要 key，只演示链路，效果不代表真实模型）
  embedder?: Embedder;
  dim?: number;
}

export async function openKnowledgeBase(opts: OpenKbOptions = {}): Promise<KnowledgeBase> {
  const offline = opts.offline ?? false;
  // 离线库与真实库分目录：两种 embedding 维度不同，混在一张表里会直接报错（12.7）
  const dataDir = opts.dataDir ?? process.env.RAG_DATA_DIR ?? (offline ? "./data/offline" : "./data/kb");
  const embedder = opts.embedder ?? (offline ? fakeEmbedder(256) : openAIEmbedder());
  const dim = opts.dim ?? (offline ? 256 : Number(process.env.EMBED_DIM ?? 1024));

  const store = await new VectorStore({ embedder, dim }).init(join(dataDir, "lancedb"));
  const keywordPath = join(dataDir, "minisearch.json");
  const keywords = await KeywordIndex.load(keywordPath);
  return {
    store,
    keywords,
    retriever: new HybridRetriever(store, keywords),
    saveKeywords: () => keywords.save(keywordPath),
  };
}
