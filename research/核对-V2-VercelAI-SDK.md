# 核对报告 V2：Vercel AI SDK（v7）相关代码逐字核对

> 核对日期：2026-10-11
> 核对对象：第05章、第10章、第20章全部 AI SDK 代码；第13章 AI SDK 片段（实际情况见 8.0）；另核对第16章 `registerTelemetry`（仅 SDK 侧签名）。
> 核对基准：https://ai-sdk.dev 官方文档（含 v6→v7 迁移指南，全部页面于 2026-10-11 抓取）。
> 结论速览：**8 处 ❌（必须改）、6 处 ⚠️（能跑但非 v7 写法/易踩坑）、其余 ✅**。最严重的三个：`stepCountIs` 在 v7 已改名 `isStepCount`；`useChat({api, body})` 顶层选项已不存在（须走 transport）；`system` 参数在 v7 已改名 `instructions`。

---

## 1. streamText：参数名、onFinish 回调、usage 字段、textStream

### 1.1 `maxOutputTokens` 参数名

- 教程原文（第05章 5.3）：`const result = streamText({ model, messages, maxOutputTokens: 1024 });`
- 判定：**✅**
- 官方依据：settings 页参数表明确为 `maxOutputTokens`（"Maximum number of tokens to generate"，可在 `prepareStep` 中逐步覆盖），不是 `maxTokens`。streamText reference 同名。
- 来源：https://ai-sdk.dev/docs/ai-sdk-core/settings 、https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text

### 1.2 `onFinish` 回调（v7 已改名 `onEnd`，onFinish 保留为弃用别名）

- 教程原文（第05章 5.4 route.ts）：
  ```ts
  onFinish: async ({ text, usage }) => { ... }
  ```
- 判定：**⚠️（能编译运行，但已弃用；v7 正确写法是 `onEnd`）**
- 官方依据：
  - v7 迁移指南原话："The final lifecycle callback for `generateText`, `streamText`, and agents has been renamed from `onFinish` to `onEnd`."（旧名保留为 deprecated fallback，两者同传时 `onEnd` 优先）；同批改名还有 `onStepFinish` → `onStepEnd`。
  - streamText reference 原话："`onFinish?` — Deprecated alias for onEnd."
  - `OnEndResult` 字段包含 `text`、`usage`、`totalUsage`、`finishReason`、`steps`、`finalStep`、`response` 等——教程解构 `{ text, usage }` 字段存在。
- 正确代码（可直接替换）：
  ```ts
  onEnd: async ({ text, usage }) => {
    // 持久化 + 记账
  },
  ```
- 来源：https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0 、https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text 、https://ai-sdk.dev/docs/ai-sdk-core/generating-text

### 1.3 usage 字段名：inputTokens / outputTokens / totalTokens

- 教程原文（第05章 5.4）：注释 `usage.totalTokens`；日志 `` `[usage] ${usage.inputTokens}+${usage.outputTokens}` ``
- 判定：**✅**
- 官方依据：generating-text 页 usage 形态为 `inputTokens`、`outputTokens`、`totalTokens`（另有 `inputTokenDetails: { cacheReadTokens, cacheWriteTokens, noCacheTokens }`、`outputTokenDetails: { reasoningTokens, textTokens }`）。不存在 `promptTokens`/`completionTokens`（那是 v3 时代字段）。
- 附注：v7 中 `totalUsage` 已弃用——"usage now totals all steps"（`usage` 本身即全步骤累计，末步用量看 `finalStep.usage`）。教程只用了 `usage.*`，无碍。
- 来源：https://ai-sdk.dev/docs/ai-sdk-core/generating-text 、https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0

### 1.4 `result.textStream` 异步迭代

- 教程原文（第05章 5.3）：`for await (const delta of result.textStream) { ... }`
- 判定：**✅**
- 官方依据：streamText reference："`textStream` — A text stream that returns only the generated text deltas. It can be used as either an AsyncIterable or a ReadableStream."（注意：错误不会从 textStream 抛出，须用 `onError` 或 `stream`。）
- 来源：https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text

### 1.5 `system` 参数（v7 已改名 `instructions`，且默认拒绝 messages 里的 system 角色）❌

- 教程原文（第05章 5.4 route.ts）：
  ```ts
  system: process.env.SYSTEM_PROMPT ?? "你是一个简洁的中文助手。",
  ```
- 判定：**❌（v7 breaking change）**
- 官方依据：
  - v7 迁移指南："`system` → `instructions`"；且 "System messages in `prompt` or `messages` are rejected unless `allowSystemInMessages: true`"（默认拒收，开了还有提示注入风险警告）。
  - foundations/prompts 原话："You can set system prompts using the `instructions` property."
  - 官方 Next.js chat 路由示例逐字：`instructions: 'You are a helpful assistant.',`
- 正确代码（可直接替换）：
  ```ts
  instructions: process.env.SYSTEM_PROMPT ?? "你是一个简洁的中文助手。",
  ```
- 来源：https://ai-sdk.dev/docs/foundations/prompts 、https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0 、https://ai-sdk.dev/cookbook/next/stream-text-with-chat-prompt

---

## 2. generateText + `output: Output.object({ schema })`

- 教程原文（第05章 5.3；第20章 20.3 同型）：
  ```ts
  import { streamText, generateText, tool, Output } from "ai";
  const { output } = await generateText({
    model, prompt: "分析这句话的情感",
    output: Output.object({ schema: z.object({ score: z.number().min(-1).max(1) }) }),
  });
  ```
- 判定：**✅（全部逐字正确）**
- 官方依据（generating-structured-data 页逐字）：
  - 导入：`import { generateText, Output } from 'ai';`（`Output` 确实从 `ai` 包导出）
  - 调用属性名就是 `output`：`output: Output.object({` / `Output.text()` / `Output.array({` / `Output.choice({` / `Output.json()`
  - 解构就是 `{ output }`：`const { output } = await generateText({`
  - 流式对应 `partialOutputStream` / `elementStream`
- 附注：v7 迁移指南确认 `generateObject`/`streamObject` **并未被删除**（仍存在），只是主线让位于 `output` 属性（v6→v7 移除的是 `experimental_output` 别名）。教程第05章 "generateObject 已不是主线" 的表述 ✅ 准确；第05章常见坑 3 的说法也成立。
- 来源：https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data 、https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0

---

## 3. `tool({ description, inputSchema, execute })`

- 教程原文（第05章 5.3、第10章 10.2）：
  ```ts
  const t = tool({
    description: "...",
    inputSchema: z.object({ q: z.string() }),
    execute: async ({ q }) => { /* … */ },
  });
  ```
- 判定：**✅**
- 官方依据（tools-and-tool-calling 页逐字）：
  - 导入：`import { generateText, tool, isStepCount } from 'ai';` —— `tool` 从 `ai` 导入 ✅
  - 属性名：`description`、`inputSchema`、`execute`（另有可选 `strict`、`inputExamples`）——"not `parameters`" ✅
  - execute 签名：`execute: async ({ location }) => ({...})`，第二参数为 options（含 `toolCallId`、`messages`、`abortSignal`、`context` 等）✅
  - v7 迁移指南同时确认："`tool()`/`inputSchema` itself is unchanged"
- 来源：https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling 、https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0

---

## 4. ToolLoopAgent（第10章 10.2）——本章问题最多的代码块

### 4.1 类名与导入源

- 教程原文：`import { ToolLoopAgent, tool } from "ai";`
- 判定：**✅**
- 官方依据（agents/overview 逐字）：`import { ToolLoopAgent, tool } from 'ai';`
- 来源：https://ai-sdk.dev/docs/agents/overview

### 4.2 `stopWhen: stepCountIs(8)` ❌ —— v7 函数名是 `isStepCount`

- 教程原文（第10章，两处：10.2 对照表 + 代码块）：
  ```
  | `for (step < maxSteps)` 步数上限 | `stopWhen: stepCountIs(8)` |
  stopWhen: stepCountIs(8),        // 步数上限——你手写过的安全阀，一行落地
  ```
- 判定：**❌（v7 改名；`stepCountIs` 是 v5/v6 写法）**
- 官方依据：
  - v7 迁移指南逐字 before/after：`stopWhen: stepCountIs(3); // before` → `stopWhen: isStepCount(3); // after`
  - tools-and-tool-calling 页逐字：`import { generateText, tool, isStepCount } from 'ai';` + `stopWhen: isStepCount(5)`
  - agents/loop-control 页逐字：`import { ToolLoopAgent, isStepCount } from 'ai';` + `stopWhen: isStepCount(50)`（注释：将 ToolLoopAgent 默认上限 20 提到 50）
  - 其它内置条件：`hasToolCall(...toolNames)`、`isLoopFinished()`；也可传数组或自定义 `StopCondition`
- 正确代码（可直接替换）：
  ```ts
  import { ToolLoopAgent, tool, isStepCount } from "ai";
  // ...
  stopWhen: isStepCount(8),
  ```
- **附带问题：教程第10章代码用了 `stepCountIs(8)` 但 `import { ToolLoopAgent, tool } from "ai"` 根本没导入它**——即便函数名写对也会编译报错。改名为 `isStepCount` 后必须同时补进导入。
- 交叉印证：教程 research/R1-TS框架与SDK.md 第 48 行写的就是 `stopWhen: isStepCount(5)`（对），但第10章正文写成了 `stepCountIs(8)`——研究稿与正文不一致，正文错。
- 来源：https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0 、https://ai-sdk.dev/docs/agents/loop-control 、https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
- **勘误任务描述**：任务书称"第5章写了 `stopWhen: stepCountIs(8)`"——经全文检索，第05章并无 stopWhen 字样，该写法只出现在第10章（两处）。

### 4.3 `agent.generate("字符串")` ❌ —— v7 是 `generate({ prompt })` 对象

- 教程原文（第10章 10.2）：
  ```ts
  const result = await agent.generate("订单 A001 到哪了？399 打 85 折加 15 运费多少钱？");
  console.log(result.text);
  ```
- 判定：**❌（调用签名）+ ✅（`result.text`）**
- 官方依据（agents/overview 逐字）：
  ```ts
  const result = await weatherAgent.generate({
    prompt: 'What is the weather in San Francisco in celsius?',
  });
  console.log(result.text); // agent's final answer
  console.log(result.steps); // steps taken by the agent
  ```
  文档所有示例均为 `{ prompt }` 对象，未出现裸字符串形态；loop-control 页示例同为 `await agent.generate({ prompt: '...' })`。`result.text` / `result.steps` 字段 ✅。
- 正确代码（可直接替换）：
  ```ts
  const result = await agent.generate({
    prompt: "订单 A001 到哪了？399 打 85 折加 15 运费多少钱？",
  });
  console.log(result.text);
  ```
- 来源：https://ai-sdk.dev/docs/agents/overview 、https://ai-sdk.dev/docs/agents/loop-control

### 4.4 ToolLoopAgent 构造参数 `system` ⚠️ —— v7 全局改名 `instructions`

- 教程原文（第10章 10.2）：`system: "你是电商客服助手。能用工具获取的事实就不要凭记忆回答。"`
- 判定：**⚠️（v7 迁移指南将 `system` → `instructions` 列为 generateText/streamText/agents 的统一改名；agents 文档示例未直接展示该参数，稳妥起见按 v7 全局改名处理）**
- 正确代码（可直接替换）：
  ```ts
  const agent = new ToolLoopAgent({
    model,
    instructions: "你是电商客服助手。能用工具获取的事实就不要凭记忆回答。",
    tools: { /* ... */ },
    stopWhen: isStepCount(8),
  });
  ```
- 来源：https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0 （"`system` → `instructions`"，适用范围含 agents）、https://ai-sdk.dev/docs/agents/overview

### 4.5 `toUIMessageStream()`（第10章对照表）

- 教程原文：`| trajectory 数组 | toUIMessageStream() 每步事件化 |`
- 判定：**⚠️（函数存在，但 v7 推荐顶层无状态调用并传 `stream`；agent 结果上直接调 `.toUIMessageStream()` 属弃用路径）**
- 官方依据：v7 迁移指南："Stream helpers deprecated on the result; use top-level stateless helpers"，示例：
  ```ts
  const uiStream = toUIMessageStream({ stream: result.stream, ... });
  return createUIMessageStreamResponse({ stream: uiStream });
  ```
- 来源：https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0

---

## 5. useChat（`@ai-sdk/react`）

### 5.1 初始化 `{ api, body }` ❌ —— v5 起须走 transport

- 教程原文（第05章 5.4 page.tsx）：
  ```tsx
  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    api: "/api/chat",
    body: { conversationId },      // 随请求带上会话 id
  });
  ```
- 判定：**❌（v7 编译不过/不生效；`api`、`body` 已不是 useChat 顶层选项——这正是教程自己警告的"v4 时代写法"）**
- 官方依据（use-chat reference 逐字）：
  - useChat 参数列表：`chat?`、`transport?`、`id?`、`messages?`、`messageMetadataSchema?`、`dataPartSchemas?`、`generateId?`、`onToolCall?`、`sendAutomaticallyWhen?`、`onFinish?`、`onError?`、`onData?`、`throttle?`、`resume?`——**无 `api`/`body`/`initialMessages`**
  - "The transport to use for sending messages. Defaults to DefaultChatTransport with `/api/chat` endpoint."；`DefaultChatTransport` 接受 `api`、`credentials`、`headers`、`body`、`fetch`、`prepareSendMessagesRequest`、`prepareReconnectToStreamRequest`
  - chatbot 页示例：
    ```tsx
    useChat({
      id: 'my-chat',
      transport: new DefaultChatTransport({
        api: '/api/custom-chat',
        headers: { Authorization: 'your_token' },
        body: { user_id: '123' },
      }),
    })
    ```
- 正确代码（可直接替换）：
  ```tsx
  "use client";
  import { useChat } from "@ai-sdk/react";
  import { DefaultChatTransport } from "ai";

  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { conversationId },      // 随请求带上会话 id
    }),
  });
  ```
- 来源：https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat 、https://ai-sdk.dev/docs/ai-sdk-ui/chatbot

### 5.2 `sendMessage` 签名

- 教程原文：`<Composer disabled={status !== "ready"} onSend={sendMessage} />`
- 判定：**⚠️（方法存在 ✅；但 v7 的 sendMessage 不接受裸字符串——Composer 内部若调 `onSend(textString)` 会类型报错）**
- 官方依据（use-chat reference）：
  - 签名：`(message?: { text: string; files?: FileList | FileUIPart[]; metadata?; messageId?: string } | CreateUIMessage, options?: ChatRequestOptions) => Promise<void>`——**plain string 不在签名内**；无参调用 = 重发当前消息（工具补结果场景）
  - 带额外 body 的机制是第二参数：`sendMessage({ text: input }, { headers: {...}, body: { temperature: 0.7, user_id: '123' }, metadata: {...} })`（chatbot 页示例）
- 正确代码（可直接替换，明确 Composer 回调形状）：
  ```tsx
  <Composer disabled={status !== "ready"} onSend={(text) => sendMessage({ text })} />
  ```
- 来源：https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat 、https://ai-sdk.dev/docs/ai-sdk-ui/chatbot

### 5.3 `status` 取值

- 教程原文：第05章用 `status === "streaming"`、`status !== "ready"`；第20章常见坑 4 写 "useChat 的 status（ready/streaming/error）"
- 判定：第05章用法 **✅**；第20章列举 **⚠️（漏了 `submitted`）**
- 官方依据（四态，逐字）：
  - `submitted`: The message has been sent to the API and we're awaiting the start of the response stream.
  - `streaming`: The response is actively streaming in from the API.
  - `ready`: The full response has been received and processed; a new message can be submitted.
  - `error`: An error occurred during the API request.
- 修改建议（第20章常见坑 4）：改为 "useChat 的 status 四态（submitted/streaming/ready/error）之外，Agent 场景还有 waiting-approval/paused/failed-step——自己补全…"
- 来源：https://ai-sdk.dev/docs/ai-sdk-ui/chatbot 、https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat

### 5.4 `messages` 的 parts 模型（第05章 + 第20章）❌ —— 工具部件类型不是 `tool-call`/`tool-result`

- 教程原文（第05章 5.4）：
  ```tsx
  <Markdown content={m.parts.map(p => p.type === "text" ? p.text : "").join("")} />
  ```
  判定：**✅**（`part.type === "text"` 且取 `part.text`，与官方一致）
- 教程原文（第20章 20.1 MessageView + 20.2 ToolCallCard）：
  ```tsx
  case "text":         return <Markdown key={i} content={part.text} />;
  case "tool-call":    return <ToolCallCard key={i} call={part} />;
  case "tool-result":  return <ToolResultCard key={i} result={part} />;
  case "data-update":  return <Progress key={i} data={part.data} />;
  ```
  以及 `function ToolCallCard({ call, result }: { call: ToolCallPart; result?: ToolResultPart })`，内部用 `call.toolName`、`call.input`、`result?.durationMs`、`result.output`。
- 判定：**❌（`tool-call` / `tool-result` 不是 v7 UIMessage 的部件类型；`durationMs` 不是官方部件字段）**
- 官方依据（chatbot-tool-usage 页）：
  - 具名工具部件类型是 **`tool-${toolName}`**（文档示例：`tool-askForConfirmation`、`tool-getLocation`、`tool-getWeatherInformation`）；动态工具是 **`dynamic-tool`** 类型（此时才有 `part.toolName` 字段）
  - 字段：`part.toolCallId`、`part.input`、`part.output`、`part.state`、`part.errorText`
  - 状态机（`part.state`）：`'input-streaming'` / `'input-available'` / `'output-available'` / `'output-error'` / `'output-denied'` / `'approval-requested'` / `'approval-responded'`——"有结果→完成；无→转圈"应改用 `part.state === 'output-available'` 判断，而非依赖独立的 result 部件
  - 另有 `step-start` 部件；chatbot 页其余类型：`text`（`part.text`）、`reasoning`（`part.text`）、`file`（`part.mediaType`/`part.url`/`part.filename`）、`source-url`、`source-document`
  - `data-*` 自定义部件：`case "data-update"` 的形态（`data-` 前缀 + `part.data`）与 v5+ 的 data part 机制一致，convert-to-model-messages reference 亦提到 `convertDataPart` 处理自定义 data parts，可保留 **⚠️**
- 正确代码（可直接替换，第20章 20.1）：
  ```tsx
  function MessageView({ message }: { message: UIMessage }) {
    return (
      <div className="msg">
        {message.parts.map((part, i) => {
          switch (part.type) {
            case "text":
              return <Markdown key={i} content={part.text} />;
            case "tool-getOrderStatus":            // 具名工具部件：tool-${toolName}
              return <ToolCard key={i} part={part} />;
            case "dynamic-tool":                   // 动态工具部件才有 toolName 字段
              return <ToolCard key={i} part={part} />;
            case "data-update":                    // 自定义 data-* 部件
              return <Progress key={i} data={part.data} />;
            default:
              return null;
          }
        })}
      </div>
    );
  }
  ```
- 正确代码（可直接替换，第20章 20.2 执行卡片——以 part.state 驱动状态）：
  ```tsx
  function ToolCard({ part }: { part: ToolUIPart }) {
    const state =
      part.state === "output-available" ? "done"
      : part.state === "output-error" ? "failed"
      : "running";                                  // input-streaming / input-available
    return (
      <div className="rounded border p-2 text-sm">
        <div className="flex items-center gap-2">
          {state === "running" ? <Spinner /> : state === "done" ? <CheckIcon /> : <XIcon />}
          <code className="font-mono">{part.toolName ?? part.type.slice("tool-".length)}</code>
        </div>
        <details>
          <summary className="text-gray-400 cursor-pointer">参数 / 结果</summary>
          <pre className="text-xs overflow-auto">{JSON.stringify(part.input, null, 2)}</pre>
          {part.state === "output-available" && (
            <pre className="text-xs">{summarize(part.output)}</pre>
          )}
          {part.state === "output-error" && (
            <pre className="text-xs text-red-500">{part.errorText}</pre>
          )}
        </details>
      </div>
    );
  }
  ```
  （耗时 `durationMs`：官方部件无此字段。若要展示耗时，需服务端在 `onToolExecutionEnd` 里自行写入 data part 或 metadata，教程应删除该字段或注明"自行测量"。）
- 同步修改第20章 20.1 的文字描述 "一条消息是部件数组（text / tool-call / tool-result / step / data…）" → "（text / reasoning / file / `tool-${toolName}` / dynamic-tool / step-start / data-* …）"。20.1 的事件流示意 `tool-input`/`tool-output` 与真实 UIMessageStream 事件名（`tool-input-available`、`tool-output-available` 等）不完全一致，属示意可接受，建议顺手对齐。
- 来源：https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage 、https://ai-sdk.dev/docs/ai-sdk-ui/chatbot

### 5.5 `stop` / `regenerate` / `initialMessages`

- 教程原文：解构 `stop, regenerate`；5.5 节 "initialMessages 喂给 useChat"
- 判定：`stop`/`regenerate` **✅**（返回值列表：`id`、`messages`、`status`、`error`、`sendMessage`、`regenerate`、`stop`、`clearError`、`resumeStream`、`addToolOutput`、`addToolApprovalResponse`、`setMessages` 等；stop 禁用条件 `!(status === 'streaming' || status === 'submitted')`，regenerate 在 `ready || error` 时可用）；`initialMessages` **❌（v7 选项名是 `messages`）**
- 官方依据（use-chat reference 逐字）："`messages?` (`UIMessage[]`): Initial chat messages to populate the conversation with."（v5 重设计后 useChat "no longer manages input state internally"，`initialMessages`/`sendAutomatically` 分别变为 `messages`/`sendAutomaticallyWhen`）
- 正确代码（可直接替换，第05章 5.5 的会话恢复）：
  ```tsx
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat", body: { conversationId } }),
    messages: initialMessages,   // 历史会话恢复（v5+ 选项名）
  });
  ```
- 来源：https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat

---

## 6. convertToModelMessages 与 toUIMessageStreamResponse

### 6.1 `convertToModelMessages`

- 教程原文（第05章 5.4）：
  ```ts
  import { streamText, convertToModelMessages } from "ai";
  // ...
  messages: convertToModelMessages([...history, ...messages]),
  ```
- 判定：函数名 **✅**（v7 存在）、导入源 **✅**（`from "ai"`）；**❌ 漏了 `await`（该函数返回 Promise）**
- 官方依据（convert-to-model-messages reference + 官方 Next.js 路由示例逐字）：
  - "returns a Promise that resolves to an array of ModelMessage objects"
  - 官方示例：`messages: await convertToModelMessages(messages),`
  - 选项：`tools`（多模态工具输出）、`ignoreIncompleteToolCalls`、`convertDataPart`
- 正确代码（可直接替换）：
  ```ts
  messages: await convertToModelMessages([...history, ...messages]),
  ```
- 来源：https://ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages 、https://ai-sdk.dev/cookbook/next/stream-text-with-chat-prompt
- 附注（边界说明）：教程把 history（库里存的 ModelMessage 形态）与 UI messages 拼在一起整体转换，属于自有持久化设计，官方无此组合示例；若 history 已是 ModelMessage，正确做法是先 `await convertToModelMessages(messages)` 再与 history 数组拼接——建议按此微调。

### 6.2 `result.toUIMessageStreamResponse()`

- 教程原文：`return result.toUIMessageStreamResponse();   // AI SDK 的 UI 流协议响应`
- 判定：**⚠️（方法仍存在于 result 上，但 v7 已弃用 result 上的流式助手，官方推荐顶层无状态函数组合）**
- 官方依据：v7 迁移指南 "Stream helpers deprecated on the result"，推荐写法（官方 Next.js 示例逐字）：
  ```ts
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
  ```
  （imports：`streamText, convertToModelMessages, createUIMessageStreamResponse, toUIMessageStream` 均来自 `'ai'`。）
- 来源：https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0 、https://ai-sdk.dev/cookbook/next/stream-text-with-chat-prompt

### 6.3 onFinish 里 `text` 手动构造 `{type:"text", text}`

- 教程原文（第05章 5.4）：`{ role: "assistant", content: JSON.stringify([{ type: "text", text }]) }`
- 判定：**✅（自有存储格式，`{type:"text", text}` 恰与 UIMessage 文本部件形状一致，恢复时可安全喂回；无官方冲突）**。唯一注意点是回调名（见 1.2，v7 用 `onEnd`）。
- 来源：https://ai-sdk.dev/docs/ai-sdk-ui/chatbot （UIMessage parts 形态）

---

## 7. `@ai-sdk/openai`：createOpenAI 与兼容端点（DeepSeek）

### 7.1 `createOpenAI({ apiKey, baseURL })` 与 `provider(modelId)`

- 教程原文（第05章 5.3）：
  ```ts
  import { createOpenAI } from "@ai-sdk/openai";
  const provider = createOpenAI({
    apiKey: process.env.API_KEY,
    baseURL: process.env.BASE_URL,    // DeepSeek/GLM/Kimi…
  });
  export const model = provider(process.env.MODEL ?? "deepseek-flash");
  ```
- 判定：`createOpenAI` 函数名/`apiKey`/`baseURL` 选项 **✅**；`provider(modelId)` 调用形态 **✅（存在）**——但**用于 DeepSeek 等 OpenAI 兼容端点是 ❌（实质性运行时问题）**
- 官方依据（openai provider 页逐字）：
  - `apiKey`（默认 `OPENAI_API_KEY` 环境变量）、`baseURL`（默认 `OPENAI_BASE_URL` → `https://api.openai.com/v1`）、`name` 等
  - 模型实例：`const model = openai('gpt-6-astra');`（默认工厂）；`.responses` / `.chat` / `.completion` 显式选择
  - **关键警告逐字**："If your custom base URL only supports the Chat Completions API, create chat models with `openai.chat('model-id')` instead, or use the OpenAI-compatible provider."（"since AI SDK 5 the Responses API is used"——默认工厂打 `/responses` 端点，DeepSeek 兼容端点没有）
- 正确代码（可直接替换，教程三件套语境下最小改动）：
  ```ts
  export const model = provider.chat(process.env.MODEL ?? "deepseek-flash");  // 兼容端点必须 .chat()
  ```
- 来源：https://ai-sdk.dev/providers/ai-sdk-providers/openai

### 7.2 OpenAI 兼容端点的官方推荐包

- 判定：**官方确有专门的 `@ai-sdk/openai-compatible` 包**（教程未提及，建议在 5.3 加一句注明）。
- 官方代码（openai-compatible-providers 页逐字要点）：
  ```bash
  pnpm add @ai-sdk/openai-compatible
  ```
  ```ts
  import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
  const provider = createOpenAICompatible({
    name: 'providerName',
    apiKey: process.env.PROVIDER_API_KEY,
    baseURL: 'https://api.provider.com/v1',
  });
  const { text } = await generateText({ model: provider('model-id'), prompt: '...' });
  ```
- 取舍注记（供教程措辞）：两者皆可——`@ai-sdk/openai` + `provider.chat(modelId)` 能用（官方明确此路径）；针对第三方 OpenAI 兼容厂商（LM Studio/NIM 等）官方专设 `@ai-sdk/openai-compatible`，并提供 `includeUsage`、`transformRequestBody`、`metadataExtractor` 等兼容特有选项。**对 DeepSeek 这类"只有 Chat Completions"的端点，写法上二选一都行，但直接 `provider(modelId)`（默认 Responses API）不行。**
- 来源：https://ai-sdk.dev/providers/openai-compatible-providers 、https://ai-sdk.dev/providers/ai-sdk-providers/openai

---

## 8. registerTelemetry（第16章 16.4 姿势二；Langfuse 侧由另一代理核对）

- 教程原文（第16章 81-83 行）：
  ```ts
  import { registerTelemetry } from "ai";
  import { LangfuseTelemetry } from "@langfuse/vercel-ai-sdk";
  registerTelemetry(new LangfuseTelemetry());   // 注册后 AI SDK 调用默认发遥测（v7 行为）
  ```
- 判定：**✅（SDK 侧逐字正确）**
- 官方依据（telemetry 页逐字）：
  - 导入：`import { registerTelemetry } from 'ai';`
  - 签名：直接传 integration 实例——`registerTelemetry(new OpenTelemetry())`（可传多个：`registerTelemetry(new OpenTelemetry(), DevToolsTelemetry())`）；自定义 tracer 时 tracer 放进 integration 构造器：`new OpenTelemetry({ tracer: ... })`
  - "supported AI SDK calls emit telemetry events by default"（注册即默认全量发遥测，无需逐调用开启）——教程注释"（v7 行为）"✅ 与官方一致；逐调用 `telemetry` 选项只用于 `functionId`、过滤或 `isEnabled: false`
  - v7 迁移指南：telemetry 移至 `@ai-sdk/otel`（`OpenTelemetry`/`LegacyOpenTelemetry`），`experimental_telemetry` → `telemetry`
- 遗留：`LangfuseTelemetry` 是否为合法 integration、包名与构造参数，归 Langfuse 核对代理。
- 来源：https://ai-sdk.dev/docs/ai-sdk-core/telemetry 、https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0

### 8.0 第13章实际情况勘误

- 任务书要求核对第13章的 "generateText + output: Output.object" 片段——**经逐行核查，第13章不存在任何 AI SDK 代码**（grep `Output.object|generateText|streamText|useChat|createOpenAI` 在 13 章零命中）。13.6 的 `chat({ temperature, maxTokens, messages })` 是第02章自定义的 lib/ai.ts 三件套封装（直连 OpenAI SDK），`maxTokens` 是该自定义函数/OpenAI 原生参数，与 AI SDK 的 `maxOutputTokens` 无关，不在本次核对范围。**结论：第13章无需为 AI SDK 做任何修改。**

---

## 附：其它顺手核到的小点（不在任务清单但同属 AI SDK）

1. 第05章 5.3 `generateText({ model, prompt })` 解构 `{ text, usage, finishReason }` ✅（三个结果属性官方均存在）。
2. 第05章 5.7 表格 "`abortSignal` 传入 streamText" ✅（settings 页有 `abortSignal` 选项；v7 另有结构化 `timeout` 选项 `totalMs/firstChunkMs/...` 可提一句）。
3. 第05章 5.3 提到 "AI Gateway 模型名字符串" ✅（getting-started/nodejs 确认默认 Gateway 模式：`model: "anthropic/claude-sonnet-5.5"` 或 `gateway(...)`）。
4. 第20章 20.3 `z.record(z.string(), z.unknown())` 为 Zod 写法，不属 AI SDK 核对范围（Zod 3/4 双参签名正确）。
5. v7 环境要求：Node 22+、全包 ESM-only（迁移指南）——教程若在部署章有 require/CJS 假设需留意（不在本任务四文件内）。

---

# 需修改清单（按优先级）

## ❌ 必须改（v7 下编译报错或运行时打错端点）

| # | 文件 | 位置 | 现文 | 改为 |
|---|---|---|---|---|
| 1 | 第10章 | 10.2 代码块 + 对照表（两处） | `stopWhen: stepCountIs(8)` | `stopWhen: isStepCount(8)`（v7 改名） |
| 2 | 第10章 | 10.2 导入行 | `import { ToolLoopAgent, tool } from "ai";` | `import { ToolLoopAgent, tool, isStepCount } from "ai";` |
| 3 | 第10章 | 10.2 generate 调用 | `await agent.generate("订单 A001…")` | `await agent.generate({ prompt: "订单 A001…" })` |
| 4 | 第05章 | 5.4 route.ts | `system: process.env.SYSTEM_PROMPT ?? …` | `instructions: process.env.SYSTEM_PROMPT ?? …` |
| 5 | 第05章 | 5.4 route.ts | `messages: convertToModelMessages([...])` | `messages: await convertToModelMessages([...])`（返回 Promise） |
| 6 | 第05章 | 5.4 page.tsx | `useChat({ api: "/api/chat", body: { conversationId } })` | `useChat({ transport: new DefaultChatTransport({ api: "/api/chat", body: { conversationId } }) })`，并补 `import { DefaultChatTransport } from "ai"` |
| 7 | 第05章 | 5.5 | `initialMessages` 喂给 useChat | `messages` 选项 |
| 8 | 第05章 | 5.3 lib/model.ts | `provider(process.env.MODEL ?? "deepseek-flash")` | `provider.chat(process.env.MODEL ?? "deepseek-flash")`（兼容端点默认走 Responses API 会 404；或改用 `createOpenAICompatible`） |
| 9 | 第20章 | 20.1 MessageView | `case "tool-call":` / `case "tool-result":` | `case "tool-getOrderStatus":`（`tool-${toolName}`）/ `case "dynamic-tool":`，按 `part.state` 渲染 |
| 10 | 第20章 | 20.2 ToolCallCard | `ToolCallPart`/`ToolResultPart` 双部件模型、`result.durationMs` | 单部件 `ToolUIPart` + `part.state`（input-streaming/input-available/output-available/output-error/…）；删 `durationMs`（非官方字段，需自行测量） |
| 11 | 第20章 | 20.1 文字 | "部件数组（text / tool-call / tool-result / step / data…）" | "（text / reasoning / file / `tool-${toolName}` / dynamic-tool / step-start / data-* …）" |

## ⚠️ 建议改（能跑但已弃用/不准确，改了更符合 v7 主线）

| # | 文件 | 位置 | 建议 |
|---|---|---|---|
| 12 | 第05章 | 5.4 route.ts | `onFinish:` → `onEnd:`（v7 改名，旧名为弃用别名；解构 `{ text, usage }` 不变） |
| 13 | 第05章 | 5.4 route.ts | `return result.toUIMessageStreamResponse();` → `return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });`（result 上的流助手 v7 已弃用） |
| 14 | 第05章 | 5.4 page.tsx | Composer 回调写明 `onSend={(text) => sendMessage({ text })}`（sendMessage 不接受裸字符串） |
| 15 | 第20章 | 常见坑 4 | "status（ready/streaming/error）" → "status 四态（submitted/streaming/ready/error）" |
| 16 | 第10章 | 10.2 ToolLoopAgent 构造 | `system:` → `instructions:`（v7 全局改名，适用 agents） |
| 17 | 第05章 | 5.3 | 加一句注明：OpenAI 兼容厂商官方专设 `@ai-sdk/openai-compatible`（`createOpenAICompatible({name, apiKey, baseURL})`），与 `provider.chat()` 皆可 |
| 18 | 第10章 | 10.2 对照表 | `toUIMessageStream()` 注明 v7 推荐顶层调用 `toUIMessageStream({ stream: result.stream })` |
| 19 | 第20章 | 20.1 事件流示意 | `tool-input`/`tool-output` 对齐真实事件名（`tool-input-available`/`tool-output-available` 等），或标注"示意" |

## 无需改（已核对正确）

- 第05章：`maxOutputTokens`、`result.textStream`、`usage.inputTokens/outputTokens/totalTokens`、`generateText` 解构 `{text, usage, finishReason}`、`output: Output.object({schema})` + `const { output }`、`Output` 从 `ai` 导入、`tool({description, inputSchema, execute})`、`convertToModelMessages`/`toUIMessageStreamResponse` 函数名与 `ai` 导入源、`abortSignal`、onFinish 内 `{type:"text",text}` 存储格式、`generateObject 已不是主线` 的表述。
- 第10章：`ToolLoopAgent` 类名与 `ai` 导入、`tool({inputSchema, execute})`、`result.text`、10.2 末段"何时退回 generateText/streamText"的官方定位表述。
- 第20章：`part.type === "text"` + `part.text`、`data-update` 自定义部件形态（data-* + part.data）。
- 第16章：`registerTelemetry(new LangfuseTelemetry())` 的 SDK 侧签名与"默认发遥测"注释。
- 第13章：**不含任何 AI SDK 代码，无需修改**（任务书所述片段不存在）。

## 主要来源

- v6→v7 迁移指南（本次核对最权威依据）：https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- Core：/docs/ai-sdk-core/generating-text 、/docs/ai-sdk-core/generating-structured-data 、/docs/ai-sdk-core/tools-and-tool-calling 、/docs/ai-sdk-core/settings 、/docs/ai-sdk-core/telemetry 、/docs/foundations/prompts
- Reference：/docs/reference/ai-sdk-core/stream-text 、/docs/reference/ai-sdk-ui/use-chat 、/docs/reference/ai-sdk-ui/convert-to-model-messages
- Agents：/docs/agents/overview 、/docs/agents/loop-control
- UI：/docs/ai-sdk-ui/chatbot 、/docs/ai-sdk-ui/chatbot-tool-usage
- Providers：/providers/ai-sdk-providers/openai 、/providers/openai-compatible-providers
- Cookbook：/cookbook/next/stream-text-with-chat-prompt 、/docs/getting-started/nodejs
