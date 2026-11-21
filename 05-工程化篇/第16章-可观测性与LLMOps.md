# 第 16 章 · 可观测性与 LLMOps

> 📋 **本章目标**
> 1. 建立 LLM 应用的可观测性模型：Trace / Span / Generation / Session 四概念
> 2. **自部署 Langfuse**（docker compose），给项目 1/2 接上全链路追踪
> 3. 理解 OpenTelemetry GenAI 语义约定——AI 调用可观测的行业标准（`gen_ai.*`）
> 4. 用观测数据做四件事：调试定位、成本看板、延迟优化、Bad Case 回流
> 5. 知道轻量替代（Cloudflare AI Gateway）与商业选项（LangSmith/Braintrust/Phoenix）
> 6. 清楚「默认记录了什么」：AI SDK 7 遥测默认记录输入输出，用户 prompt 会进 trace——隐私与脱敏要一起设计
>
> 前置知识：第 05 章（项目 1）、第 15 章（评测）｜预计用时：6-10 小时
>
> **岗位依据**：Langfuse/Ragas/DeepEval/Phoenix 出现在两源 JD 的高频工具清单里；「执行日志追踪、可观测性」是绿联、影析等深水区 JD 的原文要求。**观测与评测是搭档**：评测回答「好不好」，观测回答「为什么、贵不贵、谁在用」。

---

## 16.1 为什么 AI 应用特别需要观测

传统服务你看得见内部（函数栈、SQL、缓存命中）；LLM 应用多了三个黑盒：

1. **模型黑盒**：为什么这个回答？(prompt + 参数 + 版本变了没？)
2. **成本黑盒**：这个功能这个月花了多少钱？哪个用户/哪类请求烧的？
3. **链路黑盒**：多 Agent / RAG 一次请求串了 8 次调用，慢在哪、错在哪环？

三个黑盒对应观测的四大用途：**调试定位、成本核算、延迟优化、（第 15 章的）bad case 回流**。没有观测的 AI 应用上线两周后，你会陷入「用户说不好用，但你不知道哪坏了」的境地。

## 16.2 概念模型：四个词讲完

（Langfuse 术语，全行业通用——面试可当标准词汇用）

```
Session（会话）── 用户的一次多轮对话
  └── Trace（追踪）── 一次完整请求（如「回答用户这一问」）
        ├── Span（跨度）── 一个工作单元（如"检索知识库"，可嵌套）
        │     └── Generation（生成）── 一次模型调用：prompt/completion/token/成本/延迟
        └── Tool Execution（工具执行）── 一次工具调用
```

一句话记：**Session 装多轮，Trace 装一次，Span 装步骤，Generation 装模型调用**。每个层级都可挂 metadata（userId、版本号、实验组）——这些维度决定了你后面能不能按「用户/版本/功能」切成本和成功率。

## 16.3 自部署 Langfuse（十分钟）

Langfuse 是开源（MIT 核心）可自部署的 LLM 观测平台，本课程主线（数据不出门 + 无额度焦虑；云版 Hobby 免费层 50k units/月也可当零安装备选）：

```bash
git clone https://github.com/langfuse/langfuse.git
cd langfuse
# 编辑 docker-compose.yml：改所有标了 # CHANGEME 的密钥（SALT/ENCRYPTION_KEY 等）
docker compose up
# 2-3 分钟后访问 http://localhost:3000，首次注册即建账号
# 架构：langfuse(Web/UI/API) + worker(异步处理) + PostgreSQL + ClickHouse + Redis + S3
```

（2026-11 复核：官方 compose 还带一个 beta 的 `langfuse-ai-gateway` 容器；compose 方案官方明确不含高可用与备份，生产用 K8s/Helm。服务端 v4.77 起不再对未上报 token 数的 generation 自动分词计数——用 `observeOpenAI` / AI SDK 集成会从 API 响应里带 usage，不受影响；手写 generation 时记得自己传 usage，否则看板上没有成本。）

（Windows 无 Docker Desktop 的同学：先装 Docker Desktop，或本章用 Langfuse Cloud 免费层完成练习，部署知识留到第 19 章补。）

## 16.4 接入：三种姿势（按项目类型选）

> ⚠️ 版本注意（2026-11 复核）：Langfuse TS SDK 已是 **v6**（`@langfuse/*` 6.1.1，2026-11-03；v6.0.0 2026-10-14）。v6 要求 **Node.js ≥22** 与 **自部署 Langfuse ≥4.59.0**（本课程 Node 24/26 + 最新 docker compose 已满足；服务端 2026-11 已到 v4.79）。网上旧教程的 `@langfuse/nodejs` + `langfuse.trace()` 是 **v3 废弃写法**；v6 的新写法仍全部基于 OpenTelemetry，本节的 `LangfuseSpanProcessor` / `observeOpenAI` / `LangfuseVercelAiSdkIntegration` / `startActiveObservation` 用法不变。

**先一次性装齐依赖**（版本必须锁，原因见下）：

```bash
# Langfuse 6.1.1 + OpenTelemetry 2.x（2.x 维护线：core 2.12.1 / sdk 0.223.2，npm dist-tag: latest-2）
pnpm add @langfuse/otel@6.1.1 @langfuse/openai@6.1.1 @langfuse/tracing@6.1.1 \
  @langfuse/vercel-ai-sdk@6.1.1 \
  @opentelemetry/sdk-node@0.223.2 @opentelemetry/api@1.9.1 \
  @opentelemetry/exporter-trace-otlp-http@0.223.2 \
  @opentelemetry/otlp-exporter-base@0.223.2

# pnpm 12 必需：批准 protobufjs 的构建脚本，否则上一条命令会以 ERR_PNPM_IGNORED_BUILDS 退出
pnpm approve-builds protobufjs
```

> **为什么锁 OTel 2.x**（2026-11 复核）：Langfuse 6.1.1 的 `@langfuse/otel` peer 仍要求 `@opentelemetry/core ^2.0.1`、`sdk-trace-base ^2.0.1`，并在 6.1.1 把 OTLP exporter peer 收紧到 `<0.300.0`（官方 release：stay on the OpenTelemetry SDK 2.x line）；而 OTel JS 3.x（`sdk-node@0.300+`，2026-10-20 起）要求 `@opentelemetry/api >=1.10.0 <1.11.0` 与 Node ≥22.15。不锁版本时 npm 直接 ERESOLVE。OTel 官方仍在维护 2.x 线（2026-11-09 发布 2.12.1 / 0.223.2，npm dist-tag `latest-2`），锁这条线的最新补丁即可；`sdk-node` 不是 Langfuse 的 peer，**必须手动锁**——这是照抄最容易出事的一行。等 Langfuse 宣布支持 OTel 3 后再整体升级。
>
> **为什么单独装 `@langfuse/openai` 和 `@langfuse/tracing`**：它们不是 `@langfuse/otel` 的依赖（后者只提供 `LangfuseSpanProcessor`）。pnpm 的 isolated node_modules 不会把传递依赖暴露到项目顶层，不显式安装就是 `ERR_MODULE_NOT_FOUND`。

**姿势一：裸 OpenAI SDK（`hello-llm` 的 `lib/ai.ts`、第 7-8 章的 Agent）**——一行包装，自动记录每次调用的延迟/流式首 token/错误/token 成本：

```ts
// instrumentation.ts —— 进程启动时注册一次（入口文件第一行 import "./instrumentation"）
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";   // 依赖见本节开头的一次性安装（已锁 OTel 2.x）

// 凭据走环境变量：LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_BASE_URL（自部署地址）
export const sdk = new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] });
sdk.start();
```

`lib/ai.ts` 里的客户端是 `getClient()` 懒加载出来的，不对外导出——所以在**建客户端的那一行**包上 `observeOpenAI` 即可，`chat()` 和第 08 章的 `openAIModel()` 都走 `getClient()`，一处改动全链路生效：

```ts
// lib/ai.ts（节选：只改 getClient() 里建客户端的那一行）
import OpenAI from "openai";
import { observeOpenAI } from "@langfuse/openai";

let _client: OpenAI | undefined;
export function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.API_KEY) throw new Error("缺少 API_KEY：复制 .env.example 为 .env 并填写");
    _client = observeOpenAI(
      new OpenAI({ apiKey: process.env.API_KEY, baseURL: process.env.BASE_URL, maxRetries: 0 }),
      { generationMetadata: { function: "chat", app: "hello-llm" } },   // 成本看板按 function 分组靠它
    );
  }
  return _client;
}
```

（完整的 `getClient()` / `chat()` 见 `code/src/lib/ai.ts`，这里只多了 `observeOpenAI(…)` 这一层。）

要按**用户**下钻成本（16.6、练习 2），在请求处理函数里按用户再包一层——`observeOpenAI` 返回的是同一个客户端的代理，开销很小：

```ts
// 按用户下钻：在请求处理函数里包一层，带上 userId / sessionId
import OpenAI from "openai";
import { observeOpenAI } from "@langfuse/openai";

const base = new OpenAI({ apiKey: process.env.API_KEY, baseURL: process.env.BASE_URL, maxRetries: 0 });

export async function chatForUser(userId: string, sessionId: string, question: string) {
  const client = observeOpenAI(base, { userId, sessionId, generationMetadata: { function: "chat" } });
  const res = await client.chat.completions.create({
    model: process.env.MODEL ?? "deepseek-flash",
    messages: [{ role: "user", content: question }],
  });
  return res.choices[0]?.message.content ?? "";
}
```

**姿势二：Vercel AI SDK 7（第 5/10 章的项目）**——注意三处 v7 的变化：集成通过 `ai` 包自己的 `registerTelemetry()` 注册（Langfuse 集成内部用 Vercel 的 `@ai-sdk/otel` 生成 span，作为它的依赖自动安装，不用单独装）；调用上的遥测选项叫 `telemetry`（v6 及以前是 `experimental_telemetry`），里面**没有** `metadata` 字段；userId / sessionId / 业务维度这类 trace 级属性用 `@langfuse/tracing` 的 `propagateAttributes` 包住调用：

```ts
// telemetry-demo.ts —— 依赖见本节开头的一次性安装（@langfuse/vercel-ai-sdk 已含在内），另需 ai、@ai-sdk/openai
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { propagateAttributes } from "@langfuse/tracing";
import { generateText, registerTelemetry } from "ai";        // registerTelemetry 来自 ai 包本身
import { createOpenAI } from "@ai-sdk/openai";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";

// ① 先启动 NodeSDK（与姿势一同构）——导出 span 的底座
const sdk = new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] });
sdk.start();
// ② 再注册 AI SDK 集成（注意类名是 LangfuseVercelAiSdkIntegration）
registerTelemetry(new LangfuseVercelAiSdkIntegration());   // 注册后 AI SDK 调用默认发遥测（v7 行为）

// ③ 挂维度：userId / sessionId / metadata 用 propagateAttributes 包住调用（trace 级属性）；
//    functionId 写在调用自己的 telemetry 里。看板能不能按功能、按用户下钻全靠它们
const provider = createOpenAI({ apiKey: process.env.API_KEY, baseURL: process.env.BASE_URL });
const { text } = await propagateAttributes(
  { userId: "u_123", sessionId: "s_456", metadata: { function: "chat" } },
  () =>
    generateText({
      model: provider.chat(process.env.MODEL ?? "deepseek-flash"),
      prompt: "你好",
      telemetry: {
        functionId: "chat",
        recordInputs: false,   // ⚠️ AI SDK 7 默认把 prompt 和回答原样记进 trace，含用户隐私的功能显式关掉
        recordOutputs: false,
      },
    }),
);
console.log(text);
await sdk.shutdown();          // 脚本结束前必须 flush，否则 trace 丢失（见下方坑规）
```

**姿势三：手写 Span（RAG 检索、自定义流程段）**——包住第 13 章的混合检索（节选：`retriever` 是你第 13 章 13.4 建好的混合检索实例，`retrieve()` 返回命中的 id 列表）：

```ts
// rag/traced.ts（节选）
import { startActiveObservation } from "@langfuse/tracing";

export async function tracedRetrieve(query: string): Promise<string[]> {
  return startActiveObservation("rag-retrieve", async (span) => {
    span.update({ input: { query }, metadata: { topEach: 20, hybrid: true } });
    const ids = await retriever.retrieve(query);       // 第 13 章 13.4 的混合检索
    span.update({ output: ids });
    return ids;
  });
}
```

**一条必守的坑规**：短生命周期进程（脚本、serverless 函数）结束前必须 `sdk.shutdown()`（或 `forceFlush()`），否则缓冲区里的 trace 直接丢失——Langfuse 官方 FAQ 最高频问题没有之一。脚本里的写法：`main().finally(() => sdk.shutdown())`。

## 16.5 标准：OTel GenAI 语义约定

上面的一切底层都是 **OpenTelemetry**，而 GenAI 的 OTel 约定（`gen_ai.*` 属性）是 AI SDK 与 Langfuse 能互通的原因（约定已独立成仓 open-telemetry/semantic-conventions-genai，**成熟度仍为 Development 状态**——一个月内就改过 span 类型名和内容采集开关，知道即可）：

- span 名：`chat {model}`、`embeddings {model}`、`execute_tool {toolName}`
- 关键属性：`gen_ai.request.model`、`gen_ai.usage.input_tokens`（含缓存 token）、`gen_ai.response.finish_reasons`；工具调用参数/结果 `gen_ai.tool.call.arguments` / `gen_ai.tool.call.result` 挂在 `execute_tool` span 上，属于 **Opt-In**（敏感内容）属性（2026-11 复核）
- **规范层面内容默认不采集**（隐私设计）：2026-10 起规范统一用环境变量 `OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT`，取值 `NO_CONTENT`（默认）/ `SPAN_ONLY` / `EVENT_ONLY` / `SPAN_AND_EVENT`；早期一些 instrumentation 用过的 `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` 是旧名，以你所用 SDK 的文档为准
- ⚠️ **但具体 SDK 可以有自己的默认**：AI SDK 7 的遥测**默认记录输入与输出**（`recordInputs` / `recordOutputs` 默认为开），接 Langfuse 后用户 prompt 和模型回答会原样进 trace。含个人信息的功能要么在调用上关掉（姿势二的写法），要么在进 trace 前脱敏（第 18 章 `screenOutput`）——这是合规问题，不只是技术问题

对你的意义：学的是**行业标准而非某家私有 API**——换观测后端（Langfuse↔Phoenix↔商业平台）概念全部通用；「我在项目里按 OTel GenAI 约定接了追踪」这句话，面试官知道你懂标准。

## 16.6 用观测做什么：四个仪表盘故事

接入后在 Langfuse UI 里依次做这四件事（每件都是面试素材）：

1. **调试一个 Bad Trace**：找一条低分/用户点踩的 trace，展开层级看：prompt 长什么样？检索召回了什么？工具返回了什么？——**「对着 trace 调试」是 AI 应用排障与 Web 应用的最大区别**，传统应用看日志栈，AI 应用看 trace 树。
2. **成本看板**：按 `metadata.function`（功能，16.4 姿势一/二里挂的那个字段）与 `model` 分组统计 token 与折算成本，按 `userId` 下钻到人——你会发现 80% 成本来自 20% 的请求类型，这就是第 17 章模型路由的靶子。
3. **延迟瀑布**：看一条慢 trace 的时间轴——首 token 慢（模型/网络）还是中间步骤多（链路设计）？延迟优化先有数据再动手。
4. **Bad Case 回流**（与第 15 章闭环）：Langfuse 里给 trace 打分/评论 → 导出进评测集 → 改进后回归。**观测（线上）与评测（线下）在这里合成一个飞轮。**

## 16.7 Langfuse 的数据集与实验（评测的另一面）

Langfuse 不只观测，还有评测面：**Dataset**（测试用例集，含 input/expected）→ **Experiment run**（对全数据集跑一次你的任务）→ 多 run 对比决定上线。配合第 15 章理解分工：promptfoo 适合 **prompt/模型矩阵的本地回归**；Langfuse 适合**线上 trace 直接转数据集**（真实分布）+ UI 上协作看结果。两个都用过，你才能回答「你的评测流程是什么」这类开放题。

## 16.8 轻量与商业选项

- **Cloudflare AI Gateway**：如果只想要「成本分析 + 缓存 + 限流」三件套，把 baseURL 一改指到网关即可（分析/缓存/限流全计划免费）——**一行代码的最省事观测层**，小项目完全够用（第 17 章还会用到它的缓存）
- **Arize Phoenix**：开源观测（可自部署），Langfuse 的开源对位
- **LangSmith**（npm `langsmith`）：LangChain 家平台，TS SDK 成熟（`wrapOpenAI`/`traceable`），闭源商用——大厂生态常见，面试「还知道什么」的答案
- **Braintrust**：观测+评测一体（第 15 章已介绍），TS 一等公民

选型话术：「教学与个人项目我自部署 Langfuse（数据可控、免费）；知道 LangSmith/Braintrust 的商业定位；只要成本/限流用 Cloudflare AI Gateway 一行接入」——有主见、有理由、有备选。

---

## ⚠️ 常见坑

1. **`@langfuse/nodejs` + `trace()` 旧写法**（v3 废弃）——照 2024 年的博客抄必踩。新写法：`@langfuse/otel` + `@langfuse/tracing` 或集成包。
2. **忘了 shutdown/forceFlush** → trace 丢了以为没接上。脚本和 serverless 尤其注意。
3. **观测内容含敏感信息**：prompt/输出里的用户 PII 会被记录——**AI SDK 7 的遥测默认就记录输入输出**，`observeOpenAI` 也会记录 prompt 与回答。内容采集开关（16.5 的 `recordInputs`/`recordOutputs`）与脱敏（第 18 章）要一起考虑，这是合规问题不只是技术问题。
4. **只记成功不记错误**：错误 trace 才是最值钱的观测数据（错误率、错误聚类、失败归因都靠它）。包装层要连异常一起记。
5. **metadata 不打维度**：没挂 userId/功能名/版本号，成本看板只能看总量不能下钻——接入第一天就想好维度设计（这正是 16.2 说的「metadata 决定分析能力」）。
6. **OTel 不锁版本**：`pnpm add @opentelemetry/sdk-node` 会装到 3.x，与 Langfuse 6 的 2.x peer 冲突（npm 直接 ERESOLVE，pnpm 装上了也属于未支持的混装）。照 16.4 的命令锁 `0.223.2` / `api@1.9.1`。

## ✍️ 动手练习

**基础**：
1. 自部署 Langfuse，给项目 1 接入（姿势一或二），跑 20 轮对话后：找到最贵的一条 trace，截图其层级展开。
2. 给项目 1 的调用挂 `userId` 与 `function: chat`（AI SDK 用 `propagateAttributes({ userId, metadata })` 包住调用 + `telemetry.functionId`，裸 SDK 用 `observeOpenAI(client, { userId, generationMetadata })`），在 UI 里按用户维度看成本；再对比 `recordInputs: false` 前后 trace 里能看到什么。

**进阶**：
3. 给第 13 章的 RAG 接入手写 Span（姿势三）：检索 span 记录 topK/命中文档 id，生成 span 记录忠实度打分——做出一张「检索质量-回答质量」联动的 trace。
4. 做 Bad Case 闭环全流程：UI 里标注 3 条差 trace → 导出为 Langfuse 数据集 → 改 system prompt → 跑 experiment 对比前后——截图整条链路放进项目 README。
5. （对比实验）给项目 1 再挂 Cloudflare AI Gateway（改 baseURL），对比它与 Langfuse 各自能看到什么，写 150 字「什么时候用哪个」。

## 🧠 自测清单

1. LLM 应用的三个黑盒与观测四大用途？
2. Session/Trace/Span/Generation 的层级关系？metadata 为什么决定分析能力？
3. 三种接入姿势分别适用什么项目？shutdown 坑的成因？
4. OTel GenAI 约定的两个关键属性？`gen_ai.tool.call.arguments` 挂在哪？规范层面消息内容默认采不采集？AI SDK 7 呢？
5. 观测与评测怎么合成飞轮（bad case 回流路径）？
6. promptfoo 与 Langfuse 数据集的分工？Cloudflare AI Gateway 的定位？
7. Langfuse v3 与 v6 的 API 差异（为什么旧教程会坑人）？

## 🔗 延伸阅读

- Langfuse 文档（SDK 总览/自部署/概念表）：https://langfuse.com/docs
- OTel GenAI 语义约定（Development 状态）：https://github.com/open-telemetry/semantic-conventions-genai
- Vercel AI SDK Telemetry 文档：https://ai-sdk.dev/docs/ai-sdk-core/telemetry
- Cloudflare AI Gateway：https://developers.cloudflare.com/ai-gateway/

---

➡️ 下一章：[第 17 章 · 可靠性与成本工程](第17章-可靠性与成本工程.md)——让它又稳又便宜。
