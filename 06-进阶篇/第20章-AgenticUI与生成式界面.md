# 第 20 章 · Agentic UI 与生成式界面（前端的主场）

> 📋 **本章目标**
> 1. 吃透 AI 消息流的数据模型：不只是文本——工具调用、步骤状态都是流上的结构化部件
> 2. 实现「工具调用过程可视化」：Agent 每一步的执行卡片（这是八爪鱼、腾讯、华为云 JD 的原文要求）
> 3. 实现**生成式 UI（Generative UI）**：模型输出组件意图 → 白名单渲染——带安全边界的动态界面
> 4. Human-in-the-loop 的界面面：审批流 UI（AI SDK 原生工具审批；跨会话审批接第 11 章挂起-恢复）
> 5. 流式渲染性能优化（把第 5 章练习 3 的数据变成方案）
>
> 前置知识：第 05 章（useChat/SSE）、第 07-08 章（工具调用与 Agent）、第 11 章（HITL）｜预计用时：10-14 小时
>
> **岗位依据**：华为云 JD 原话——「传统前端是页面+表单+CRUD，AI 时代的前端正在从**操作界面**变成 **AI 与人的协作界面**」。八爪鱼岗位点名「生成式 UI 引擎、Agent 多步执行状态流转、流式渲染性能」。**这一章是 JD 密度最高的「前端×AI」交叉带，也是你相对后端工程师的绝对主场。**

---

## 20.1 心智转变：UI 从「渲染状态」到「渲染事件流」

传统前端的 UI = 应用状态的函数（`UI = f(state)`）。Agentic UI 的核心新对象是**事件流**：Agent 的执行是一个持续到达的事件序列，UI 是**对流做 fold（reduce）得到的状态**：

```
事件流（AI SDK 的 UI message stream，事件名为示意）：
  text-delta              "正在查询订单…"     ─┐
  tool-input-available    queryOrder {orderId}  │ 每个事件到达 → 状态机转移 → UI 更新
  tool-output-available   {status:"运输中"}     │
  text-delta              "您的订单运输中…"    ─┘
```

AI SDK 的消息模型已经为此设计好：`message.parts[]`——一条消息是**部件数组**（text / reasoning / file / `tool-${toolName}` / dynamic-tool / step-start / data-* …），`useChat` 边收流边更新。你写 UI 的方式从「拿到完整响应渲染」变成「**按部件类型分发渲染器**」：

```tsx
// components/agentic.tsx —— 按部件类型分发渲染器（ToolCard 见 20.2、ApprovalCard 见 20.4，都放在这个文件）
"use client";
import type { ChatAddToolApproveResponseFunction, UIMessage } from "ai";
import { Markdown } from "@/app/components";          // 第 05 章 app/components.tsx 的最小展示组件

type Respond = ChatAddToolApproveResponseFunction;    // 就是 useChat 返回的 addToolApprovalResponse（20.4）

export function MessageView({ message, respond }: { message: UIMessage; respond: Respond }) {
  return (
    <div className="msg">
      {message.parts.map((part, i) => {
        switch (part.type) {
          case "text":            return <Markdown key={i} content={part.text} />;
          case "tool-queryOrder":                               // 具名工具部件：类型 = tool-${工具名}（第 07 章的 queryOrder）
            return <ToolCard key={i} part={part} respond={respond} />;          // ← 20.2
          case "dynamic-tool":    return <ToolCard key={i} part={part} respond={respond} />;  // 运行时才注册的工具（如 MCP 工具）
          case "data-update":     return <Progress key={i} data={part.data} />;  // 自定义 data-* 部件
          default:                return null;
        }
      })}
    </div>
  );
}

// 自定义进度部件的最小实现（服务端往 UI 流里写 { type: "data-update", data } 即可）
const Progress = ({ data }: { data: unknown }) => (
  <div className="text-xs text-gray-500">⏳ {JSON.stringify(data)}</div>
);
```

> 类型小贴士：上面用的是不带泛型的 `UIMessage`，所以 `part.input`/`part.output`/`part.data` 都是 `unknown`。想要精确类型，用 `UIMessage<元数据, 自定义data部件, InferUITools<typeof tools>>` 把服务端的工具集类型传进来（官方文档「Chatbot Tool Usage」）。

### 20.1.1 协议层：AG-UI 1.0（Agent ↔ 前端的标准）

你在本章手搓的「事件流 → 状态机 → UI」，业界已有开放协议在标准化：**AG-UI（Agent–User Interaction Protocol）**。它把 run/step 生命周期、文本增量、工具调用、推理过程、状态快照、子 Agent 等事件，通过 HTTP+SSE 或 HTTP+Protobuf 推给前端；官方把自己定位为与 MCP（Agent↔工具）、A2A（Agent↔Agent）并列的「AI 协议栈第三条腿」。现行是 1.0 版规范；仓库按日期滚动发布各语言 SDK，2026-11 仍在持续更新，TS 包 `@ag-ui/core` / `@ag-ui/client` 为 1.0.x（2026-11 复核）。

- 规范：https://docs.ag-ui.com/spec/1.0 ｜ 三协议关系：https://docs.ag-ui.com/agentic-protocols（旧地址 ag-ui.com/... 会自动跳转）
- 与你已学内容的关系：AI SDK 的 UI message stream 是**框架内**的流协议；AG-UI 是**跨框架**的标准。理解了本章的 parts/事件模型，AG-UI 只是换了一套事件名——面试问「Agent 前端怎么标准化」时答得出这三层（MCP/A2A/AG-UI）就是加分项。

## 20.2 工具调用可视化：Agent 的「执行时间线」

这是 Agent 产品（与面试作品集）的标配界面。设计一张「执行卡片」——核心是**单个工具部件自带状态机**（`part.state`），不需要你拼接 call/result 两个部件：

```tsx
// components/agentic.tsx（续）—— 工具执行卡片。依赖：pnpm add ai @ai-sdk/react
import { getToolName, type DynamicToolUIPart, type ToolUIPart } from "ai";

// 工具部件的状态机（官方定义，值得背下来）：
// input-streaming → input-available → output-available
//                                  ↘ output-error / output-denied
//                                  ↘ approval-requested → approval-responded（工具审批，见 20.4）
function ToolCard({ part, respond }: { part: ToolUIPart | DynamicToolUIPart; respond: Respond }) {
  if (part.state === "approval-requested") return <ApprovalCard part={part} respond={respond} />; // 20.4
  const state =
    part.state === "output-available" ? "done"
    : part.state === "output-error" || part.state === "output-denied" ? "failed"
    : "running";                                   // input-streaming / input-available / approval-responded
  return (
    <div className="rounded border p-2 text-sm">
      <div className="flex items-center gap-2">
        {state === "running" ? <Spinner /> : state === "done" ? <CheckIcon /> : <XIcon />}
        {/* getToolName 同时兼容具名部件 tool-xxx 与 dynamic-tool（只有后者带 toolName 字段） */}
        <code className="font-mono">{getToolName(part)}</code>
      </div>
      <details>                                    {/* 参数与结果默认折叠——降噪，细节可查 */}
        <summary className="text-gray-400 cursor-pointer">参数 / 结果</summary>
        <pre className="text-xs overflow-auto">{JSON.stringify(part.input, null, 2)}</pre>
        {part.state === "output-available" && <pre className="text-xs">{summarize(part.output)}</pre>}
        {/* errorText 是否为原文取决于服务端：路由里要设 redactToolErrors: true 或 onError（见 20.4） */}
        {part.state === "output-error" && <pre className="text-xs text-red-500">{part.errorText}</pre>}
      </details>
    </div>
  );
}
```

三个辅助件的最小实现（同一文件，避免你为图标卡住）：

```tsx
// components/agentic.tsx（续）
const Spinner = () => <span className="animate-spin">◌</span>;
const CheckIcon = () => <span className="text-green-600">✓</span>;
const XIcon = () => <span className="text-red-600">✕</span>;
const summarize = (output: unknown) => {
  const s = typeof output === "string" ? output : JSON.stringify(output);
  return s.length > 300 ? `${s.slice(0, 300)}…` : s;
};
```

> 耗时展示说明：官方部件没有 `durationMs` 字段——要显示每步耗时，在服务端 `onToolExecutionEnd` 回调里自行测量并写入 data part / metadata。这也是「官方模型没给的，自己扩展」的一个小练习。

三条体验设计原则（从八爪鱼/腾讯 JD 的表述反推，也是用户研究的共识）：

1. **过程可见，细节可折**：并行/串行步骤的时间线让用户看到「它在干活」；参数细节默认折叠防信息过载
2. **可交互的控制**：`stop`（中断生成）、失败步骤的「重试此步」、审批卡片的「同意/拒绝」（20.4）——**Agentic UI 的一半是控制面**
3. **诚实的状态**：「检索失败，已重试」比静默重试好；「等待人工审核中」带预计时间比无限转圈好

## 20.3 生成式 UI：模型输出「界面意图」

> 阅读约定：本节的 `OrderSummaryProps`/`ChartProps`（各组件的 Zod props schema）、`OrderSummary`/`Chart`/`FallbackCard`（组件本身）是**你自备的业务组件**，约定放在 `components/business.tsx`（用项目 1 的组件库即可）；给模型看的「组件说明书」字符串也由你自备。教程焦点是「注册表 + 白名单 + 二次校验」这个模式，不是替你写 UI 库。

**Generative UI = 让模型按需组装 UI，而不是渲染预设页面**。支付宝「一句话生成网页」、八爪鱼「生成式 UI 引擎」指的都是这个。安全且工程化的实现路径：**模型输出结构化的「组件意图」→ 前端按白名单渲染**：

```
用户：「帮我看看这个月的订单情况」
模型输出（output: Output.object）：{
  "component": "OrderSummary",        // 白名单里的组件名
  "props": { "total": 12, "refund": 1, "trend": "up" }
}
前端：<OrderSummary {...props} />     // Zod 校验过的 props 渲染
```

```ts
// lib/generative.ts —— 服务端：组件意图 schema（第 4 章输出契约的直接复用）
import { generateText, Output } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai-sdk";                   // 第 05 章的 AI SDK 模型实例

export const intentSchema = z.object({
  component: z.enum(["OrderSummary", "Chart", "InfoList", "ConfirmDialog"]),  // 白名单！
  props: z.record(z.string(), z.unknown()),            // props 结构由各组件自己的 schema 二次校验
  explanation: z.string().max(100),
});
export type Intent = z.infer<typeof intentSchema>;

// componentDocs：给模型看的「组件说明书」（每个组件一行：名字 + 用途 + props 形状），你自备
export async function renderUI(query: string, componentDocs: string): Promise<Intent> {
  const { output } = await generateText({
    model,
    prompt: `根据用户请求选择最合适的组件并设计 props。可用组件文档：\n${componentDocs}\n\n用户：${query}`,
    output: Output.object({ schema: intentSchema }),
  });
  return output;
}
```

```tsx
// components/generative.tsx —— 前端：注册表 + 二次校验——双保险
import type { ComponentType } from "react";
import type { z } from "zod";
import type { Intent } from "@/lib/generative";
import { Chart, ChartProps, FallbackCard, OrderSummary, OrderSummaryProps } from "@/components/business"; // 自备

// 类型本身就是白名单：键只能是 Intent["component"] 里的值；Partial = 允许还没做完的组件缺席
const REGISTRY: Partial<Record<Intent["component"],
  { schema: z.ZodType<Record<string, unknown>>; Component: ComponentType<any> }>> = {
  OrderSummary: { schema: OrderSummaryProps, Component: OrderSummary },
  Chart:        { schema: ChartProps,        Component: Chart },
  // InfoList / ConfirmDialog 还没做：运行时走 FallbackCard
};

export function GenerativeUI({ intent }: { intent: Intent }) {
  const entry = REGISTRY[intent.component];            // ① 白名单：不在表里直接拒绝
  if (!entry) return <FallbackCard text={intent.explanation} />;
  const parsed = entry.schema.safeParse(intent.props);  // ② props 校验：Zod 拦截
  if (!parsed.success) return <FallbackCard text={intent.explanation} />;
  return <entry.Component {...parsed.data} />;          // ③ 校验过的 props 才渲染
}
```

> 为什么 `REGISTRY` 要写成 `Partial<Record<Intent["component"], …>>`：不写类型时 TS 推断出的对象只有 2 个键，而 `intent.component` 有 4 个可能值，strict 模式下 `REGISTRY[intent.component]` 直接报 TS7053。把枚举类型写进键，「白名单」就从注释变成了编译器检查。

**安全红线**（面试必问）：生成式 UI **绝不让模型输出任意 HTML/JSX**（那是 XSS 直通车，第 18 章 LLM05）——白名单组件 + Zod props 校验是底线；组件文档进 prompt（模型只能选你给的乐高积木）。「生成式 UI 的安全边界在组件白名单」这句话，是前端工程师在 AI 安全面试里最漂亮的答案。

## 20.4 审批流 UI（Human-in-the-loop 的界面面）

审批有两条路线，先分清再写代码：

| 路线 | 适用 | 状态存在哪 |
|---|---|---|
| **A. AI SDK 原生工具审批**（本节主线） | 审批人就是正在对话的用户、当场就批（「确认退款 99 元？」） | 消息流里：工具部件进入 `approval-requested` 状态 |
| **B. 自建审批表 + 挂起-恢复**（扩展） | 审批人是别人、可能几小时后才批、要审计留痕（项目 3） | 数据库 `approvals` 表 + LangGraph `interrupt()`（第 11 章、第 22 章） |

**路线 A 的三处代码**。① 服务端在调用层声明哪些工具要人批：

```ts
// app/api/chat/route.ts（节选：只看与审批有关的部分）
import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream, tool, type UIMessage } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai-sdk";

const refundOrder = tool({
  description: "为订单发起退款（会动钱，必须人工确认）",
  inputSchema: z.object({ orderId: z.string(), amount: z.number().positive() }),
  execute: async ({ orderId, amount }) => ({ ok: true, orderId, amount }), // 真实版：调退款服务 + 幂等键（第 17 章）
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),   // 审批回执在 assistant 消息的工具部件里，要一起带回
    tools: { refundOrder },
    toolApproval: { refundOrder: "user-approval" },     // ① v7：在调用层声明哪些工具要人批（tool() 上的 needsApproval 已弃用）
  });
  // redactToolErrors：自 ai 7.0.171 起工具执行错误默认把原文发给前端（可能含数据库报错、内部路径），这里改回通用提示
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream, redactToolErrors: true }) });
}
```

> 和项目 1 的差别：第 05 章的路由只发最后一条消息、历史以数据库为准。审批场景里，被批的那条 assistant 消息带着审批回执，必须送回服务端——最省事的做法是像上面这样发完整 `messages`；坚持「只发最后一条」的话，要保证这条带回执的消息也被持久化并拼进历史。

② 审批卡片（`ToolCard` 遇到 `approval-requested` 时渲染它）：

```tsx
// components/agentic.tsx（续）—— 审批卡片：出现在执行时间线中，Agent 停在这里等人的决定
import { useState } from "react";

type ApprovalPart = Extract<ToolUIPart | DynamicToolUIPart, { state: "approval-requested" }>;

function ApprovalCard({ part, respond }: { part: ApprovalPart; respond: Respond }) {
  const [reason, setReason] = useState("");
  const id = part.approval.id;
  return (
    <div className="border-amber-400 border rounded p-3 my-2">
      <div>⚠️ {getToolName(part)} 需要人工确认 {part.approval.requestReason}</div>
      <pre className="text-xs">{JSON.stringify(part.input, null, 2)}</pre>  {/* 批的是这笔参数原文 */}
      <input value={reason} onChange={(e) => setReason(e.target.value)}
             placeholder="拒绝原因（会作为工具结果回传给 Agent）" className="border px-2 text-sm w-full" />
      <div className="flex gap-2 mt-2">
        <button onClick={() => respond({ id, approved: true })}
                className="bg-amber-600 text-white px-3 py-1 rounded">同意执行</button>
        <button onClick={() => respond({ id, approved: false, reason: reason || "审批人拒绝" })}
                className="border px-3 py-1 rounded">拒绝</button>
      </div>
    </div>
  );
}
```

③ 页面把 `addToolApprovalResponse` 传下去，并让 useChat 在「所有审批都有回执」时自动续发：

```tsx
// app/agent/page.tsx（节选）
"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { MessageView } from "@/components/agentic";

export default function AgentPage() {
  const { messages, sendMessage, addToolApprovalResponse } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses, // ② 批完自动把回执发回服务端
    throttle: 50,                                                               // 20.5：官方内置的批量 flush
  });
  return (
    <main className="mx-auto max-w-2xl p-4">
      {messages.map((m) => <MessageView key={m.id} message={m} respond={addToolApprovalResponse} />)}
      <button onClick={() => sendMessage({ text: "订单 A1001 退款 99 元" })}>试一下</button>
    </main>
  );
}
```

（本节 4 段 TSX/TS 按上面的文件路径放好、补上第 05 章的 `lib/ai-sdk.ts` 与 `app/components.tsx`、自备 `components/business.tsx` 后，在 `ai@7.0.x` + `@ai-sdk/react@4.0.x` 下 `tsc --noEmit` 通过，2026-11 复核。）

**路线 B**（跨会话/异步审批）：卡片 UI 照用，只是 `respond` 换成 `POST /api/approvals/:id`，后端写 `approvals` 表并用 `Command({ resume })` 唤醒挂起的图——完整做法见第 22 章项目 3。

工程细节（两条路线通用）：审批状态实时到达（消息流或 SSE）；卡片**展示将要执行的参数原文**（用户批的是这笔操作，不是一句描述）；拒绝时让审批人填一句原因——它会作为工具结果回传给 Agent（第 7 章「错误也是信息」）。

## 20.5 流式渲染性能（前端基本功的 AI 场景版）

第 5 章练习 3 让你测过「每 token 一次 setState」的代价。成体系的优化清单（按收益排序）：

1. **批量 flush**：token 事件进缓冲，`requestAnimationFrame` 或 50-100ms 定时器合并刷新——渲染次数从 ~50/s 降到 ~12/s，肉眼无差别。useChat 已内置这个能力：`useChat({ throttle: 50 })`（v7 已是稳定选项，旧名 `experimental_throttle`，2026-11 复核）——先用它做基线，再和手写 rAF 合并对比
2. **增量 Markdown 渲染**：流式中的未闭合代码块/表格是老大难——用支持增量的渲染器（如 streaming-markdown 类库），或「流式期间纯文本、完成后再格式化」的降级
3. **长列表虚拟化**：会话几百条消息后，只渲染视口内（react-window 等）
4. **打字机节流**：一次到 5 个 token 也别 5 次渲染；按「字/秒」匀速放出比真实到达速率更顺滑（**故意加的延迟换感知质量**，工程直觉题）
5. **SSR/骨架**：首屏对话历史服务端渲染，流式部分客户端接管

本节的每个优化都建议**先量化再优化**（Performance 面板录 before/after）——「我把长对话场景的渲染主线程占用降了 70%，数据在这里」是面试里极具说服力的一句话。

---

## ⚠️ 常见坑

1. **把工具卡片渲染成「最终回复的装饰」**——它是消息流里的独立部件（`tool-${toolName}` 类型、`part.state` 驱动），与文本部件交错；按 `part.state` 状态机渲染，而不是等「工具结果部件」（v7 没有独立的 tool-result 部件）。取工具名用 `getToolName(part)`：具名部件 `ToolUIPart` 上**没有** `toolName` 字段，只有 `dynamic-tool` 有，直接读会编译失败。
2. **生成式 UI 直接 `dangerouslySetInnerHTML` 模型输出**——最严重的安全错误（LLM05 + 注入=存储型 XSS）。白名单+校验，没有例外。
3. **审批卡片没展示参数原文**——用户「同意」的和他以为的不是一回事；审计时也说不清。
4. **`status` 状态机漏态**：useChat 的 status 四态（submitted/streaming/ready/error）之外，Agent 场景还有 waiting-approval/paused/failed-step——自己补全状态机再写 UI，别用布尔值硬拼。
5. **中断（stop）只断了前端**——流断了但服务端还在烧钱跑完。中断要传到服务端（AbortSignal 贯通到模型调用）。
6. **性能优化凭感觉**——先录制基线。AI 场景的卡顿经常来自「同步的 Markdown 解析」而不是 React 渲染。
7. **照抄旧教程的 `needsApproval`**——v7 起工具审批在调用层用 `toolApproval` 声明，`tool()` 上的 `needsApproval` 已弃用（仍能跑但会告警）。同理，给自定义 `data-*` 部件配了 `dataPartSchemas` 后，`ai@7.0.160` 起会真的校验，不合 schema 直接抛 `TypeValidationError`（2026-11 复核）。

## ✍️ 动手练习

**基础**：
1. 给项目 1 的消息流加工具卡片渲染（接一个真实工具如时间/计算器），观察 text 与 tool-call 部件交错到达的顺序。
2. 实现生成式 UI 最小版：白名单 3 个组件（摘要卡/列表/确认框），模型选组件，前端二次校验渲染。

**进阶**：
3. **执行时间线完整版**（项目 3 的 UI 基础）：并行步骤分组、耗时条、失败步骤单步重试、整体 stop 贯通到服务端。
4. 性能报告：500 条消息的会话 + 流式输出场景，用 Performance 面板量化「批量 flush + 虚拟化 + 增量渲染」三件套的收益，写进博客（这就是 JD 要的「流式渲染性能优化」证据）。
5. （挑战）**Agentic 表单**：用户说需求 → 模型生成结构化表单意图（字段/类型/校验）→ 白名单表单组件渲染 → 用户填完交回 Agent 继续任务——把生成式 UI 与 HITL 串成一个完整闭环。

## 🧠 自测清单

1. 「UI = f(state)」在 Agentic 场景怎么升级？消息 parts 模型与按部件分发渲染？
2. 工具卡片的三个体验设计原则？为什么参数要折叠？
3. 生成式 UI 的安全实现三步（白名单/二次校验/类型渲染）？为什么绝不能渲染模型输出的 HTML？
4. 审批卡的工程细节？拒绝的原因去哪了？什么时候用 AI SDK 原生审批、什么时候要自建审批表？
5. 流式性能五板斧按收益排序？「故意加延迟」的工程逻辑？
6. 中断为什么必须贯通到服务端？

## 🔗 延伸阅读

- Vercel AI SDK UI 文档（useChat/messages/parts/streaming UI）：https://ai-sdk.dev/docs/ai-sdk-ui/overview
- AI SDK 工具部件与审批（Chatbot Tool Usage）：https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage ｜ 生成式 UI：https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces
- AG-UI 规范 1.0：https://docs.ag-ui.com/spec/1.0
- MDN SSE（事件流协议基础）：https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events
- Anthropic 关于 agent 交互设计的思考（流式/透明度/HITL 体验）：https://www.anthropic.com/engineering/building-effective-agents

---

➡️ 下一章：[第 21 章 · 多模态与选修专题](第21章-多模态与选修专题.md)
