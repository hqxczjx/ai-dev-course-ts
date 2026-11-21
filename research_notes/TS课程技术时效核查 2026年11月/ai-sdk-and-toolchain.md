# Vercel AI SDK, OpenAI/Anthropic TS SDKs, Zod and Node/TS toolchain: currency check (as of 2026-11-13)

Scope: the course claims in 附录B (B2/B5/B9), research/R7, CHANGELOG.md, 第02/03/04/05章, 第10章 §10.2, 第20章. The course was last re-verified 2026-10-22.
Method: npm registry metadata fetched directly (`https://registry.npmjs.org/<pkg>`, all on 2026-11-13). Official CHANGELOGs (raw GitHub). Official docs (ai-sdk.dev `.md` endpoints, developers.openai.com, platform.claude.com, zod.dev, pnpm.io, nextjs.org, nodejs/Release `schedule.json`, nodejs.org `dist/index.json`). Type checks against `ai@7.0.170` `dist/index.d.ts`, `openai@7.55.0` `.d.ts` and `zod@4.6.7` `.d.ts`, all on unpkg.
No package was installed or executed. **Every source was accessed on 2026-11-13.**
Verdict legend: ✅ current · ⚠️ needs update · ❌ wrong. **[NEW since 10-22]** marks facts that changed after the course's last check.

---

## 1. Latest versions of every package these chapters use (npm registry, 2026-11-13)

### Takeaway
No package major changed between 2026-10-22 and 2026-11-13. B9's "x-range" snapshot (`ai 7.0.x`, `@ai-sdk/* 4.0.x`, `zod 4.6.7`, `next 16.4.x`, `pnpm 12.x`, `TypeScript 7.x`, `tsx 4.23.x`) still holds. Two exact numbers are stale: `openai` (B9 says 7.42.x, now 7.55.0) and `marked` (B9 says 18.1.x, now 18.2.0). The only snapshot entry that is substantively wrong is the **Node line** (see §5).

### Cited Findings
Version table: latest = npm `dist-tags.latest`; "at 10-22" = newest stable published on or before 2026-10-22.

| Package | Latest (publish date) | At 10-22 | Course claim (file:line) | Verdict | Source |
|---|---|---|---|---|---|
| `ai` | **7.0.170** (2026-11-11) | 7.0.150 | B9 L127 `ai 7.0.x`. CHANGELOG.md L18 `7.0.137 → 7.0.148`. R7 L45/L81 `7.0.148` | ✅ B9. ⚠️ CHANGELOG/R7 exact number. **[NEW]** 48 stable patches since 10-22, all `### Patch Changes` | [registry](https://registry.npmjs.org/ai) · [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/ai/CHANGELOG.md) |
| `@ai-sdk/openai` | 4.0.115 (2026-11-11) | 4.0.101 | B9 L135 `4.0.x` | ✅ | [registry](https://registry.npmjs.org/@ai-sdk/openai) |
| `@ai-sdk/react` | 4.0.174 (2026-11-11) | 4.0.154 | B9 L135 `4.0.x` | ✅ | [registry](https://registry.npmjs.org/@ai-sdk/react) |
| `@ai-sdk/anthropic` | 4.0.102 (2026-11-10) | 4.0.87 | not used in these chapters | n/a | [registry](https://registry.npmjs.org/@ai-sdk/anthropic) |
| `@ai-sdk/deepseek` | 3.0.84 (2026-11-10) | 3.0.72 | not used (course uses `createOpenAI().chat()`) | n/a (optional route, see §2) | [registry](https://registry.npmjs.org/@ai-sdk/deepseek) |
| `@ai-sdk/openai-compatible` | 3.0.90 (2026-11-10) | 3.0.77 | B9 L135 `3.0.x`. 第05章 L151 | ✅ | [registry](https://registry.npmjs.org/@ai-sdk/openai-compatible) |
| `@ai-sdk/mcp` | 2.0.97 (2026-11-11) | 2.0.83 | B9 L135 `2.0.x` | ✅ | [registry](https://registry.npmjs.org/@ai-sdk/mcp) |
| `@ai-sdk/otel` | 1.0.170 (2026-11-11) | 1.0.150 | B4 L62 | ✅ | [registry](https://registry.npmjs.org/@ai-sdk/otel) |
| `openai` | **7.55.0** (2026-11-10) | 7.43.0 | B9 L128 `openai（npm）7.42.x` | ⚠️ → `7.55.x` (all minors additive for chat.completions, §3) | [registry](https://registry.npmjs.org/openai) · [CHANGELOG](https://github.com/openai/openai-node/blob/master/CHANGELOG.md) |
| `@anthropic-ai/sdk` | **1.8.0** (2026-11-10) | 1.1.0 | R7 L64/L88 `1.1.0` (not in B9) | ⚠️ R7 only | [registry](https://registry.npmjs.org/@anthropic-ai/sdk) · [CHANGELOG](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/CHANGELOG.md) |
| `zod` | 4.6.7 (2026-10-12) | 4.6.7 | B5 L82, B9 L129 `4.6.7` | ✅ unchanged | [registry](https://registry.npmjs.org/zod) |
| `zod-to-json-schema` | 3.25.2 (2026-03-27) | same | 第04章 L79/L223, B9 L139 "已归档" | ✅ (GitHub `archived: true`, last push 2026-03-27) | [repo API](https://api.github.com/repos/StefanTerdell/zod-to-json-schema) |
| `typescript` | 7.0.2 (2026-07-08). `beta` tag 7.1.0-beta (announced 2026-10-20). `next` tag 7.1.0-dev.20261112.1 | 7.0.2 | B9 L136 `TypeScript 7.x` | ✅. **[NEW-ish]** 7.1 Beta landed 10-20, with RC expected "about a month" later | [registry](https://registry.npmjs.org/typescript) · [7.1 Beta blog](https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/) |
| `tsx` | 4.23.15 (2026-09-20) | same | B9 L136 `tsx 4.23.x` | ✅ | [registry](https://registry.npmjs.org/tsx) |
| `pnpm` | 12.18.0 (2026-11-05). `next-12` = 12.20.0 | 12.x | 第02章 L51/L57, B9 L136 `pnpm 12.x` | ✅ | [registry](https://registry.npmjs.org/pnpm) |
| `next` | 16.4.6 (2026-11-09). canary 16.5.0-canary.48 | 16.4.2 | B9 L136 `next 16.4.x` | ✅ (see §5 for the 16.4.6 compression change) | [registry](https://registry.npmjs.org/next) · [v16.4.6 release](https://github.com/vercel/next.js/releases/tag/v16.4.6) |
| `react` / `react-dom` | 19.3.1 (2026-10-14) | 19.3.1 | not pinned | ✅. `@ai-sdk/react@4.0.174` peer `^18 \|\| ~19.0.1 \|\| ~19.1.2 \|\| ^19.2.1` covers it | [registry](https://registry.npmjs.org/react) |
| `drizzle-orm` / `drizzle-kit` | 0.45.4 (2026-10-08) / 0.31.11 (2026-09-21) | same | B9 L130 | ✅ (1.0 still only on `rc`/`beta` tags) | [registry](https://registry.npmjs.org/drizzle-orm) |
| `better-sqlite3` | **13.1.1** (2026-11-11) | 13.0.3 | 第05章 L187 (unpinned) | ✅ works. **[NEW]** 13.1.0 (same day) was flagged "NOT A VIABLE RELEASE" (Windows arm64), fixed by 13.1.1. `engines.node >=22`. `gypfile:false`, no install script, so **no pnpm 12 build approval needed** | [registry](https://registry.npmjs.org/better-sqlite3/13.1.1) · [releases](https://github.com/WiseLibs/better-sqlite3/releases) |
| `marked` | **18.2.0** (2026-11-09) | 18.1.1 | B9 L136 `marked 18.1.x` | ⚠️ → `18.2.x` (18.1.2/18.1.3/18.2.0 are bug fixes only, so `marked.parse()` stays sync by default) | [registry](https://registry.npmjs.org/marked) · [releases](https://github.com/markedjs/marked/releases) |
| `dompurify` | 3.4.17 (2026-10-12) | same | 第05章 L291 (mention only) | ✅. Note that `@types/dompurify` is a deprecated stub ("dompurify provides its own type definitions"), so don't install it | [registry](https://registry.npmjs.org/dompurify) · [@types stub](https://registry.npmjs.org/@types/dompurify) |
| `@types/node` | 26.6.6 (2026-10-28) | 26.6.5 | 第02章 L126 `pnpm add -D ... @types/node` (unpinned) | ⚠️ minor: unpinned install gives Node **26** typings even on a Node 24 runtime | [registry](https://registry.npmjs.org/@types/node) |
| `hono` | 4.13.18 (2026-11-11). `next` tag = **5.0.0-rc.1** | 4.13.13 | B9 L136 `hono 4.13.x`. 第05章 L55 | ✅ (watch item: Hono 5 RC exists) | [registry](https://registry.npmjs.org/hono) |
| `@ag-ui/core` / `@ag-ui/client` | 1.0.4 (2026-11-05) | 1.0.3 | 第20章 L51 | ✅ (see §6) | [registry](https://registry.npmjs.org/@ag-ui/core) |
| `@openai/agents` | 0.21.0 (2026-10-20) | same | 第10章 L24 | ✅ | [registry](https://registry.npmjs.org/@openai/agents) |
| `@anthropic-ai/claude-agent-sdk` | 0.3.322 (2026-11-10) | 0.3.309 | 第10章 L25 `0.3` | ✅ | [registry](https://registry.npmjs.org/@anthropic-ai/claude-agent-sdk) |

- All `ai`/`@ai-sdk/*` packages at latest declare `engines.node >=22` and peer `zod ^3.25.76 || ^4.1.8` — [registry](https://registry.npmjs.org/ai)
- `ai-v5` and `ai-v6` dist-tags still receive releases (5.0.289 / 6.0.330), so a reader who runs `npm i ai@6` gets v6, not v7 — [registry](https://registry.npmjs.org/ai)

### Inferences
- Suggested B9 replacement block (the only changes are `openai`, `marked`, the Node line and an "as of" date):
  ```
  ## B9. 版本快照（2026-11-13 npm registry 复核；写代码前建议 `npm view <pkg> version` 再确认）
  ai 7.0.x（AI SDK v7，2026-11 为 7.0.170）   openai（npm）7.55.x   zod 4.6.7
  ⚠️ @ai-sdk 伴随包版本线独立于主包：@ai-sdk/openai 4.0.x、@ai-sdk/react 4.0.x、@ai-sdk/mcp 2.0.x、@ai-sdk/openai-compatible 3.0.x——与 ai 7.x 并行属正常
  其他：next 16.4.x、hono 4.13.x（5.0 仍是 RC）、marked 18.2.x、tsx 4.23.x、TypeScript 7.0.x（7.1 Beta 中）、Node 24/26 LTS（26 为 Active LTS，24 已进入维护期）、pnpm 12.x、better-sqlite3 13.1.x
  ```
- CHANGELOG.md L18 and R7 cite `ai 7.0.148`. The registry shows 7.0.150 was already latest by the end of 2026-10-22. Harmless, but the next CHANGELOG entry should say `7.0.148 → 7.0.170`.
- 第02章 L126: suggest `pnpm add -D typescript tsx @types/node@24` (or `@26` if on Node 26) so the typings match the runtime.

### Gaps
- I did not run `pnpm create next-app` under pnpm 12. I could not verify whether its default dependencies (`sharp`, `unrs-resolver` via eslint-config-next, `@tailwindcss/oxide`) trigger `ERR_PNPM_IGNORED_BUILDS` with `strictDepBuilds: true`, or whether create-next-app pre-writes `allowBuilds`. A live run is needed.

---

## 2. Vercel AI SDK v7: is the course's API usage current?

### Takeaway
The course's v7 surface is correct and matches the official 6→7 migration guide and the `ai@7.0.170` typings: `instructions`, `onEnd`, `isStepCount`, `Output.object`, `tool({ inputSchema })`, `ToolLoopAgent`, async `convertToModelMessages`, `toUIMessageStream({ stream: result.stream })` + `createUIMessageStreamResponse`, `DefaultChatTransport`, `sendMessage({text})`, 4-state `status`, and `onToolExecutionEnd`.
Since 10-22 there are no breaking renames, only patch-level type additions: the `interrupted` finish reason, the `ping` stream part, enforced `dataPartSchemas`, `onStepError`/`onError`/`onAbort`, and `experimental_queue`.
There are two real defects in course code:
- (a) 第20章 `ToolCard` reads `part.toolName` on a `ToolUIPart`, which doesn't type-check.
- (b) 第05章 `Chat()` uses an undeclared `conversationId`.
Two wording errors are in 附录B (DefaultChatTransport is a v5 change, not v7) and 第05章 L132.

### Cited Findings

**2.1 Renames the course relies on are confirmed (all ✅)**
- `system` → `instructions`, with `system` still accepted as a deprecated fallback. Course: 第05章 L210, 第10章 L53, B9 L139 — ✅. [Migration guide 6→7, "system Renamed to instructions"](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)
- `onFinish` → `onEnd` for generateText/streamText/agents, with `onFinish` kept as a deprecated alias. Course: 第05章 L211, L331, L383 — ✅. [Migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0). `ToolLoopAgent` docs list `onFinish?` as "Deprecated alias for onEnd" — [ToolLoopAgent reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent)
- `stepCountIs` → `isStepCount`. `ai@7.0.170` still exports `isStepCount as stepCountIs` (deprecated alias). Course: 第10章 L37/L46/L68 — ✅. [CHANGELOG 7.0.0 "3debdb7"](https://github.com/vercel/ai/blob/main/packages/ai/CHANGELOG.md) · [ai@7.0.170 index.d.ts](https://unpkg.com/ai@7.0.170/dist/index.d.ts)
- The `streamText` result methods `toUIMessageStreamResponse`/`toUIMessageStream`/`pipe…`/`toTextStreamResponse` are `@deprecated`. They "still work in v7 … will be removed in the next major". Replacement: `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`. Course: 第05章 L195/L226-227, 第10章 L40 — ✅. [Migration guide "Stream Response Helpers"](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)
- `StreamTextResult.fullStream` is renamed to `stream`. Course uses `result.stream` (L227) and `textStream` (L162) — ✅. [Migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0) · d.ts L2948/L2955
- `convertToModelMessages` returns `Promise<ModelMessage[]>`. Course `await convertToModelMessages(messages.slice(-1))` (第05章 L209) — ✅. [convertToModelMessages reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages)
- Structured output: docs lead with `generateText` + `output: Output.object({schema})`. `Output.array/choice/json/text` also exist. `generateObject` is `@deprecated Use generateText with an output setting instead` (deprecated since 6.0.0, still exported in 7.0.170). Course: 第05章 L167-171, 第20章 L143-147 — ✅. [Generating structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) · d.ts L9015 · [CHANGELOG 6.0.0 "614599a: deprecate generateObject and streamObject"](https://github.com/vercel/ai/blob/main/packages/ai/CHANGELOG.md)
- `tool({ description, inputSchema, execute })` — ✅ (第05章 L174-178, 第10章 L56-66). The 7.0 migration guide also deprecates `needsApproval` on `tool()` in favour of a `toolApproval` setting on the call/agent. The course doesn't use it, but 第20章 §20.4 approval UI should name `toolApproval` if it ever shows server code. [Migration guide "Migrate Deprecated needsApproval to toolApproval"](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)
- `ToolLoopAgent({ model, instructions, tools, stopWhen })` + `agent.generate({ prompt })` — ✅. Default `stopWhen` is `isStepCount(20)`. [ToolLoopAgent reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent)
- `maxOutputTokens` and `abortSignal` remain call options — ✅ (第05章 L161, L339). d.ts L631/L709/L833
- useChat: `transport` defaults to `DefaultChatTransport` (`api`, `body`, `headers`, `prepareSendMessagesRequest`…). `messages?` holds the initial messages. `status` is `'submitted'|'streaming'|'ready'|'error'`. `sendMessage({text})`, `regenerate`, `stop` and `addToolApprovalResponse` all exist. useChat's own callback is still named `onFinish` (it was not renamed). Course 第05章 L237-256, L327, 第20章 L214 — ✅. [useChat reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- Tool UI part states: `input-streaming`, `input-available`, `approval-requested`, `approval-responded`, `output-available`, `output-error`, `output-denied`. Static parts are typed `tool-${name}`. Only `dynamic-tool` parts carry `toolName`. Course 第20章 L37-39, L64-67, L211 — ✅. [Chatbot tool usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) · d.ts L2048-2190
- `onToolExecutionStart/End` became stable names (old `experimental_onToolCallStart/Finish` are deprecated aliases). Course 第20章 L107 `onToolExecutionEnd` — ✅. [Migration guide "Tool Execution Callbacks"](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)
- In v7, `usage` (result and `onEnd`) = **all steps** (`totalUsage` is deprecated). `finalStep.usage` = last step. Course 第05章 L222 logs `usage.inputTokens/outputTokens` in `onEnd`. That is correct and is now the right number for cost accounting — ✅. [Migration guide "usage Now Includes All Steps"](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)
- v7 **rejects `role:"system"` messages inside `messages`/`prompt` by default** (opt in with `allowSystemInMessages: true`). The course's DB history stores only user/assistant (第05章 L323) — ✅. Any reader who persisted system rows would get errors. [Migration guide "System Messages … Are Rejected by Default"](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)
- v7 is ESM-only and needs Node ≥22 (tested on 22/24/26). Course: Node 24 — ✅. `pnpm init` in pnpm 12 defaults to `"type": "module"` (`--init-type` default `module`), so top-level `await` in 第10章 L71 runs under tsx — ✅. [Migration guide "Minimum Node.js Version" / "ESM Only"](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0) · [pnpm init](https://pnpm.io/cli/init)
- `@ai-sdk/openai`: the default `openai(id)` factory uses the **Responses API**. Use `openai.chat(id)` for Chat Completions (or the openai-compatible provider). Course 第05章 L148-151 — ✅. [OpenAI provider docs](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
- A dedicated `@ai-sdk/deepseek` provider exists (`createDeepSeek`, models `deepseek-flash` / `deepseek-v4-flash` / `deepseek-v4-pro`). Its docs say "DeepSeek retired the `deepseek-chat` and `deepseek-reasoner` aliases on July 24, 2026". Course 第05章 L151 mentions only openai-compatible as the alternative, so this is an optional addition. [DeepSeek provider docs](https://ai-sdk.dev/providers/ai-sdk-providers/deepseek)

**2.2 Changes after 2026-10-22 (all patch releases 7.0.149–7.0.170) that touch course code or pitfalls** — source for all: [ai CHANGELOG](https://github.com/vercel/ai/blob/main/packages/ai/CHANGELOG.md)
- **[NEW] 7.0.149** adds an `interrupted` finish reason. The CHANGELOG's own warning: "can break type checking after upgrading, even though this is a patch release. Exhaustive switches … and mappings such as `Record<FinishReason, string>` must handle the new value." `FinishReason` in 7.0.170 = `'stop'|'length'|'content-filter'|'tool-calls'|'error'|'interrupted'|'other'` (d.ts L129). The course doesn't write an exhaustive switch over AI SDK finish reasons, but 第04章 L235 teaches "finish_reason 三种典型值" (that is the OpenAI SDK field, which is fine).
- **[NEW] 7.0.154** adds `onStepError` (generateText/streamText/ToolLoopAgent) and `onError`/`onAbort` on `ToolLoopAgent`, plus experimental steering. This is relevant to 第10章's "预算熔断/循环检测 自己加" row (L41).
- **[NEW] 7.0.155** removes runtime `ModelMessage` validation of `messages` in streamText/generateText ("TypeScript types already guarantee"). Malformed history loaded from SQLite (第05章 L315-324, cast with `as Row[]`) will no longer be rejected by the SDK; it reaches the provider as-is.
- **[NEW] 7.0.160** fixes `dataPartSchemas`, which are now actually validated: "Invalid data parts now raise a `TypeValidationError`". This affects 第20章's `data-update` custom part (L40) if readers add `dataPartSchemas`.
- **[NEW] 7.0.163** adds a typed `ping` stream part. "Consumers with exhaustive stream-part switches must handle the new `ping` union variant". This affects only code switching over `result.stream`. The course uses `textStream`/UI stream, so ✅.
- **[NEW] 7.0.168/7.0.169** add `experimental_queue` to useChat (queue messages sent while streaming). [useChat reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) documents it plus a stable `throttle` option ("React and Vue only … reduce UI update frequency"). The stable `throttle` was promoted from `experimental_throttle` earlier ([@ai-sdk/react CHANGELOG "3271474"](https://github.com/vercel/ai/blob/main/packages/react/CHANGELOG.md)). This is directly relevant to 第05章 exercise 3 and 第20章 §20.5 "批量 flush".
- 7.0.0 security fix (already in place before 10-22, but the course doesn't reflect it): `toUIMessageStream`'s default `onError` no longer serializes raw server errors to the client, so the client receives a generic message. 第05章 L337 "连续失败把错误写进流，前端展示" therefore needs an explicit `onError` mapping to show "限流" text. [ai CHANGELOG 7.0.0 entry on onError default](https://github.com/vercel/ai/blob/main/packages/ai/CHANGELOG.md)

**2.3 Course code defects / wording errors**
- ❌ **第20章 L68 + L78.** `function ToolCard({ part }: { part: ToolUIPart })` then `part.toolName ?? part.type.slice(...)`. In `ai@7.0.170`, `ToolUIPart` (static, `type: \`tool-${NAME}\``) has **no `toolName` field**; only `DynamicToolUIPart` does (d.ts L2171-2190). This is a TS error, and 第20章 L39 passes a `dynamic-tool` part into the same prop type. The SDK exports `getToolName(part: ToolUIPart | DynamicToolUIPart): string` and `isToolUIPart` (d.ts L2352, L2371). Replacement:
  ```tsx
  import { getToolName, type ToolUIPart, type DynamicToolUIPart } from "ai";
  function ToolCard({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
    // …
    <code className="font-mono">{getToolName(part)}</code>
  ```
  and change the comment at L77 to `{/* getToolName 同时兼容具名部件 tool-xxx 与 dynamic-tool */}`.
- ❌ **第05章 L240-244.** `body: { conversationId }` references a `conversationId` never declared in `Chat()`. Also, a `DefaultChatTransport` created inline is rebuilt each render. Suggested replacement:
  ```tsx
  export default function Chat({ conversationId }: { conversationId: string }) {
    const { messages, sendMessage, status, error, stop, regenerate } = useChat({
      id: conversationId,
      transport: new DefaultChatTransport({
        api: "/api/chat",
        // 只把本轮最后一条发给服务端，历史以服务端数据库为准（官方持久化推荐写法）
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { conversationId, messages: messages.slice(-1) },
        }),
      }),
    });
  ```
  `prepareSendMessagesRequest` is documented on `DefaultChatTransport` — [useChat reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat). The server-side `messages.slice(-1)` in L209 then becomes redundant but harmless.
- ⚠️ **附录B L139** "v7 改名四件套（…、useChat 的 `api/body`→`DefaultChatTransport`）". The transport architecture arrived in **AI SDK 5.0**: the useChat page says "significantly updated in AI SDK 5.0. It now uses a transport-based architecture" ([useChat reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)). 第05章 L237 correctly says "v5 起". Replacement: `v7 改名三件套（system→instructions、onFinish→onEnd、stepCountIs→isStepCount）+ v5 起的 useChat transport（api/body 收进 DefaultChatTransport）`.
- ⚠️ **附录B L27 / L139, 第05章 L407** "AI SDK v4 的 generateObject…". `generateObject` was mainline through v5, deprecated in **v6.0.0**, and is still exported (deprecated) in v7. Replacement for L27: `ai v7；旧写法 generateObject（v6 起弃用）/ parameters（v5 起改 inputSchema）/ ai/react（已改 @ai-sdk/react）不要再照抄`.
- ⚠️ **第05章 L132** "（27k+ stars）". GitHub API shows `vercel/ai` at 27,891 stars on 2026-11-13, so the claim is still true (✅). "2026-10 已到 v7" can become "2026-11 为 v7（7.0.170）". [GitHub API](https://api.github.com/repos/vercel/ai)
- ⚠️ **第05章 L337** (error table) suggested replacement text: `连续失败时在 toUIMessageStream({ stream, onError: (e) => (e as any)?.statusCode === 429 ? "请求太频繁，请稍后重试" : "服务暂时不可用" }) 里把错误映射成对用户友好的文案——v7 默认只给前端一句通用错误，不会透传服务端异常细节。`
- ⚠️ **第05章 / 第20章 §20.5** (optional): `useChat({ throttle: 50, … })` 是官方内置的「批量 flush」（v7 已稳定，旧名 experimental_throttle），先用它做基线，再对比手写 rAF 合并。
- ⚠️ **第05章 L379 (pitfall 1)**. Next.js route segment `runtime` now defaults to `'nodejs'` and `'edge'` is marked **deprecated** ([route segment config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)). Suggested replacement: `Next.js 路由默认就是 Node runtime（edge 已标记弃用）；只要别手动写 runtime = "edge"，better-sqlite3 就能用。显式写 export const runtime = "nodejs" 只是防御性声明。`

### Inferences
- No course v7 API call will break against `ai@7.0.170`. The deprecations the course avoids (`system`, `onFinish`, `stepCountIs`, `result.toUIMessageStreamResponse`) still work but warn. The course's "旧写法会直接编译报错" (第05章 L381) overstates this: in v7 the renamed options are **deprecated aliases, not compile errors** (removed ones like `experimental_output`, `experimental_activeTools`, `maxSteps` and `parameters` do fail). Suggested tweak: `旧写法里 v5 之前的（parameters/maxSteps/ai/react）会直接报错；v6→v7 的改名（system/onFinish/stepCountIs/result.toUIMessageStreamResponse）仍能跑但已弃用、会告警。`
- Because 7.0.155 removed message validation, 第05章 `loadHistory` should validate rows (for example a Zod `z.enum(["user","assistant"])` on `role`) instead of the bare cast. This is optional hardening.

### Gaps
- Not verified at runtime: whether `toUIMessageStream`'s `onError` receives `APICallError` with `statusCode` for DeepSeek/GLM 429s via `@ai-sdk/openai` `.chat()`. The suggested mapping assumes it does.
- I did not check `@ai-sdk/rsc`/`streamUI`. The course doesn't use RSC generative UI (it uses `Output.object` + a whitelist), so this was out of scope.

---

## 3. OpenAI Node SDK and Anthropic TS SDK status

### Takeaway
`openai` 7.43→7.55 made only additive changes for Chat Completions. `chat.completions.create`, `choices[0].message.content`, `stream_options.include_usage`, `response_format: {type:"json_object"}` and `parallel_tool_calls` are unchanged, and `max_tokens` is still `@deprecated` in favour of `max_completion_tokens` (course ✅).
OpenAI's position is "Chat Completions remains supported, Responses is recommended for all new projects". For the **GPT-6 family**, `temperature`/`top_p` must be removed unless `reasoning_effort:"none"`, and tool calling on GPT-6 Astra / 6.1 Sol / 6.1 Terra **requires Responses**. That breaks the course's "切到 OpenAI 原生只需改 max_tokens 名" note.
On the Anthropic side, `@anthropic-ai/sdk` 1.0.0 (2026-10-21) moved to API version `2026-10-21`, where `temperature`/`top_p`/`top_k` return 400. Anthropic also has an official OpenAI-SDK compatibility endpoint, which contradicts "唯一例外是 Anthropic".

### Cited Findings
- `openai@7.55.0` typings: `max_tokens?: number | null` is marked `@deprecated … deprecated in favor of max_completion_tokens, and is not compatible with o-series models`. `max_completion_tokens` and `parallel_tool_calls?: boolean` are present. Course 第02章 L183, L196 — ✅. [completions.d.ts](https://unpkg.com/openai@7.55.0/resources/chat/completions/completions.d.ts)
- `openai@7.55.0` ships the `zodResponseFormat`, `zodTextFormat`, `zodFunction`, `zodResponsesFunction` helpers (`openai/helpers/zod`). 第04章 L103 mentions `json_schema` strict mode without them; this is an optional pointer. [helpers/zod.d.ts](https://unpkg.com/openai@7.55.0/helpers/zod.d.ts)
- openai-node 7.43.0–7.55.0 (2026-10-22 → 11-10): features are Responses/agents/realtime/images additions. Two "Breaking change in a minor release" notes (7.43.0, 7.44.0) affect only Live Decisions types, not chat.completions. 7.44.0 also notes `gpt-image-1` was shut down on 2026-10-23. [CHANGELOG](https://github.com/openai/openai-node/blob/master/CHANGELOG.md)
- OpenAI: "While Chat Completions remains supported, Responses is recommended for all new projects." — [Migrate to Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- OpenAI latest-model guide: "GPT-6 Astra, GPT-6.1 Sol, and GPT-6.1 Terra support Chat Completions, but tool calling requires Responses. GPT-6 Sol and GPT-6 Luna support function calling in Chat Completions only with `reasoning_effort: "none"`." Also: "When reasoning effort is not none, remove `temperature`, `top_p`, and `top_logprobs`. For Chat Completions, also remove `logprobs`." — [Using the latest model](https://developers.openai.com/api/docs/guides/latest-model)
- AI SDK OpenAI provider docs agree: "GPT-6 and later models do not support `temperature`, `topP`, `logprobs` … The provider removes these settings and returns a warning. Use the Responses API for GPT-6 tool calling." — [OpenAI provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
- Deprecation dates in 第02章 L196: o4-mini shutdown on **October 23, 2026** ✅. `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5-pro`, `o3`, `o3-pro` shutdown on **Dec 11, 2026** ✅. But GPT-5.1 / 5.3-Codex / 5.4-Nano are scheduled for **April 1, 2027**, so "GPT-5 系" over-generalises. The Assistants API was removed 2026-08-26. [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations)
- `@anthropic-ai/sdk` 1.0.0 (2026-10-21) "⚠ BREAKING CHANGES … add support for new API version 2026-10-21". Releases 1.2.0–1.8.0 (10-23 → 11-10) are additive (message threads, Claude Fable/Mythos 5.2 model IDs, typed error classes, admin/analytics). [Anthropic TS SDK CHANGELOG](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/CHANGELOG.md)
- API version `2026-10-21`: "a request that sends `temperature`, `top_p`, or `top_k` returns a 400 error, even at the parameter's default value". It is the default in TS SDK ≥1.0.0. [Migration guide 2026-10-21](https://platform.claude.com/docs/en/api/migration-2026-10-21) (also reflected in the Anthropic `claude-api` skill reference, cached 2026-11-03)
- Anthropic provides an **official OpenAI SDK compatibility layer**: `new OpenAI({ apiKey: ANTHROPIC_API_KEY, baseURL: "https://api.anthropic.com/v1/" })`. Limits:
  - `response_format` accepts only `json_schema` with `strict: true`; "`json_object` and `text` return a 400 error".
  - `temperature`: "On Claude 4.7 and later models … any value below 1 returns a 400 error".
  - Forced `tool_choice` returns 400 on Claude Opus 5.5 / Sonnet 5.5 / Fable 5.1/5.2.
  - Prompt caching is not supported in the compat layer.

  — [OpenAI SDK compatibility](https://platform.claude.com/docs/en/api/openai-sdk)

Course claims and verdicts:
- 第02章 L34 "唯一例外是 Anthropic（自有 Messages API…或经 OpenRouter 走兼容格式）" — ⚠️ outdated/incomplete. Replacement:
  > **为什么用 `openai` SDK**：……DeepSeek、智谱 GLM、Kimi、Gemini（官方兼容层）、OpenRouter 全部兼容。Anthropic 也有官方 OpenAI 兼容端点（`baseURL: https://api.anthropic.com/v1/`），但限制多：Claude 4.7 及以后的模型 `temperature` 小于 1 直接 400、`response_format` 只收 `json_schema`+`strict`（`json_object` 会 400）、不支持 prompt 缓存——所以 Claude 的正式用法仍是自家 Messages API（`@anthropic-ai/sdk` ≥1.0 默认 API 版本 2026-10-21，已移除 temperature/top_p/top_k），第 17 章讲缓存时单独处理。
- 第02章 L196 (`max_tokens` note) — ⚠️ incomplete for GPT-6. Replacement:
  > **参数名小注**：`max_tokens` 在 openai SDK 类型里已标记 deprecated，直连 OpenAI 新模型要改用 `max_completion_tokens`。GPT-6 系还有两处差异：推理强度不是 `none` 时必须去掉 `temperature`/`top_p`（否则报错），且 GPT-6 Astra / 6.1 Sol / 6.1 Terra 的**工具调用只在 Responses API 上可用**（Chat Completions 不行）。o4-mini 已于 2026-10-23 关停，gpt-5 / gpt-5-mini / gpt-5-nano / o3 等快照于 2026-12-11 关停（GPT-5.1 等为 2027-04-01）。本课程主线的 DeepSeek / GLM / Kimi 兼容端点仍以 `max_tokens`、`temperature` 为标准参数、行为不变；切到 OpenAI 原生端点时按上面三条改。
- 第02章 L182 / L287 and 第04章 L93/L146 (`temperature` 0 / 0.2 / 0.3 defaults in `lib/ai.ts`) — ✅ for the course's mainline vendors. ⚠️ if `BASE_URL` points to OpenAI GPT-6 (non-`none` effort) or Anthropic's compat endpoint with Claude ≥4.7. Suggest that `lib/ai.ts` only sends `temperature` when it is set (`...(opts.temperature !== undefined && { temperature: opts.temperature })`) and a note: `换到 GPT-6 / Claude 新模型时把 temperature 设为 undefined`.
- 第04章 L92 "JSON mode（OpenAI/DeepSeek/GLM/Kimi 均支持）" — ✅ as written (Anthropic is not listed). Optional addition: `（Anthropic 兼容端点不支持 json_object，只支持 json_schema strict）`.
- 第04章 L103 "附录 B 标注各家支持情况" — ❌. 附录B has no per-vendor `json_schema` support column (B1 L11-21 lists only pricing/notes). Either add the column or change the text to `各家支持情况以官方文档为准`.

### Inferences
- The course's "一套代码 + 切 baseURL" promise (第02章 L34) now holds cleanly for the Chinese vendors, Gemini-compat and OpenRouter-routed older models. It holds only partially for OpenAI's own flagship GPT-6 line (parameters + Responses-only tool calling) and for Claude via the compat layer. This matters most for 第07/08章 tool loops (outside this note's scope) if a reader sets `MODEL=gpt-6.1-sol`.
- R7 L64's "`@anthropic-ai/sdk` 1.1.0 与 claude-agent-sdk 运行时组合未实测" is now moot for this scope. `@anthropic-ai/claude-agent-sdk@0.3.322` declares peer `@anthropic-ai/sdk >=0.93.0`, which allows 1.x ([registry](https://registry.npmjs.org/@anthropic-ai/claude-agent-sdk)), but I did not test them at runtime.

### Gaps
- I did not check whether OpenRouter's `openai/gpt-6.1-sol` (第02章 L110) strips `temperature` or passes it through. OpenRouter docs were not consulted.
- The GPT-6 model/price claims themselves belong to the models-and-pricing note and were not re-verified here.

---

## 4. Zod 4: current API for what the course uses, and zod-to-json-schema status

### Takeaway
All Zod usages are current for `zod@4.6.7` (unchanged since 2026-10-12): `z.iso.datetime()`, `z.strictObject()`, two-argument `z.record()`, `z.toJSONSchema()`, `z.ZodSafeParseResult<T>` and the default import. `zod-to-json-schema` is archived and the course's "don't install it" advice is correct. Nothing changed after 10-22.

### Cited Findings
- `z.iso.date()/time()/datetime()/duration()` are the Zod 4 forms. The method forms (`z.string().email()` etc.) "still exist and work as before, but are now deprecated". Course 第04章 L71/L233 — ✅. [Zod v4 changelog](https://zod.dev/v4/changelog) · [API: z.iso.datetime()](https://zod.dev/api)
- "deprecates .strict() and .passthrough() … use the top-level z.strictObject() and z.looseObject() … still available for backwards compatibility, and they will not be removed". Course 第04章 L232 — ✅. [Zod v4 changelog](https://zod.dev/v4/changelog)
- "z.record() drops single argument usage … Zod 4 `z.record(z.string())` ❌ `z.record(z.string(), z.string())` ✅". Course 第04章 L281, 第20章 L138 — ✅. [Zod v4 changelog](https://zod.dev/v4/changelog)
- `z.toJSONSchema(schema)` is built in and documented. Course 第04章 L79/L196/L223 — ✅. [Zod JSON Schema](https://zod.dev/json-schema)
- `zod@4.6.7` root `index.d.ts`: `import * as z from "./v4/classic/external.js"; export * from …; export { z, z as default };`. So `import z from "zod"` (第03章 L206) and `import { z } from "zod"` (第04章/05章) both work. Official docs use `import * as z from "zod"`. `ZodSafeParseResult<T>` is exported (第04章 L201 ✅). `toJSONSchema`, `iso`, `fromJSONSchema` are exported. [zod@4.6.7 index.d.ts](https://unpkg.com/zod@4.6.7/index.d.ts) · [external.d.ts](https://unpkg.com/zod@4.6.7/v4/classic/external.d.ts)
- `zod-to-json-schema`: GitHub repo `archived: true`, last push 2026-03-27, npm latest 3.25.2 (2026-03-27). Course "已归档且不支持 Zod 4 schema" (第04章 L223, B9 L139) — ✅. [repo API](https://api.github.com/repos/StefanTerdell/zod-to-json-schema) · [registry](https://registry.npmjs.org/zod-to-json-schema)
- Zod is a peer of `ai@7.0.170` (`^3.25.76 || ^4.1.8`), `openai@7.55.0` (`^3.25 || ^4.0`), `@anthropic-ai/sdk@1.8.0` (`^3.25.0 || ^4.0.0`), `@ag-ui/core` (`^3.25.18 || ^4.0.0`), and `@openai/agents` / `claude-agent-sdk` (`^4.0.0`). Zod 4.6.7 satisfies all of them — [registry](https://registry.npmjs.org/ai)
- `ai` 7.0.169 now uses Zod Mini internally while "preserving the public message schemas' classic Zod methods … and compatibility with supported Zod 3 and Zod 4 versions". This doesn't affect course code. [ai CHANGELOG](https://github.com/vercel/ai/blob/main/packages/ai/CHANGELOG.md)

### Inferences
- Optional style alignment: change 第03章 L206 `import z from "zod";` to `import * as z from "zod";` (official docs form). The current form is not wrong.

### Gaps
- None material.

---

## 5. Toolchain: Node LTS, TypeScript 7, pnpm 12, Next.js 16

### Takeaway
The course is **outdated on Node**. Node 24 entered **Maintenance LTS on 2026-10-20** (so it was already out of "Active LTS" when the course was re-verified on 10-22). **Node 26 "Lithium" became Active LTS on 2026-10-28** (v26.13.0), and `winget install OpenJS.NodeJS.LTS` now installs **v26.13.x**. That makes 第02章's "应输出 v24.x.x" wrong for new installs.
TypeScript is still 7.0.2 stable, with 7.1 in beta. The course's tsconfig fix is right, but the explanation should say `types: []` is now the **compiler default**, not just a `tsc --init` template artefact.
pnpm 12 facts are confirmed: `npx get-pnpm`, `strictDepBuilds: true`, `approve-builds`/`allowBuilds`.
Next.js is 16.4.6. **[NEW]** 16.4.6 starts compressing route-handler responses under `next start` (self-hosted). The impact on SSE is unverified.

### Cited Findings
**Node.js**
- nodejs/Release `schedule.json` gives:
  - v22 Jod: maintenance 2025-10-21, end **2027-04-30**
  - v24 Krypton: LTS 2025-10-28, **maintenance 2026-10-20**, end 2028-04-30
  - v26 Lithium: start 2026-05-05, **LTS 2026-10-28**, maintenance 2027-10-20, end 2029-04-30
  - v20: end 2026-04-30

  — [schedule.json](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json)
- nodejs.org `dist/index.json`: the first v26 release with `lts: "Lithium"` is **v26.13.0 (2026-10-28)**. Latest: v26.13.1 / v24.22.3 / v22.23.5 (security releases 2026-11-10/11). v27.0.0-alpha exists. — [dist/index.json](https://nodejs.org/dist/index.json)
- winget-pkgs `OpenJS.NodeJS.LTS` manifests now top out at **26.13.0 / 26.13.1**, so the winget "LTS" package tracks Node 26. — [winget-pkgs manifests](https://github.com/microsoft/winget-pkgs/tree/master/manifests/o/OpenJS/NodeJS/LTS)
- Conflict worth noting: the AI SDK 7 migration guide says "Node.js 22 reached end-of-maintenance on April 30, 2026". That contradicts Node's own schedule (v22 ends 2027-04-30; it is v20 that ended 2026-04-30). The AI SDK doc appears to be in error. — [AI SDK migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0) vs [schedule.json](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json)
- Compatibility with Node 26: AI SDK 7 is "tested on Node.js 22, 24, and 26". pnpm 10/11/12 support Node 26. `better-sqlite3@13.1.1` uses `node-addon-api` (N-API, ABI-stable). — [AI SDK migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0) · [pnpm installation](https://pnpm.io/installation) · [registry](https://registry.npmjs.org/better-sqlite3/13.1.1)

Course claims:
- 第02章 L21 `Node.js 24 LTS` — ⚠️
- 第02章 L43 `winget install OpenJS.NodeJS.LTS  # Node.js 24 LTS（2026-10 的 Active LTS）` — ❌ (24 has been Maintenance since 10-20, and winget LTS now = 26)
- 第02章 L45 / L67 `node -v # 应输出 v24.x.x` — ❌ for new winget installs
- 第02章 L49 `nvm install 24` — ✅ still valid
- B9 L136 `Node 24 LTS` — ⚠️
- CHANGELOG L39 "Node 主线改 24 LTS（22 已维护期）" — ⚠️

Two replacement options for 第02章 L43-46:
- Option A (keep 24, minimal churn):
  ```powershell
  winget install OpenJS.NodeJS.LTS --version 24.22.3   # 锁定 Node 24（2026-10-20 起为维护期 LTS，支持到 2028-04-30）
  # 不锁版本时 winget 的 LTS 包会装 Node 26（2026-10-28 起的 Active LTS），本课程同样可用
  node -v        # v24.x.x（或 v26.x.x）
  ```
- Option B (move to 26): `winget install OpenJS.NodeJS.LTS  # Node.js 26 LTS（2026-10-28 起的 Active LTS；24 已进入维护期，仍可用到 2028-04）`, with `node -v # 应输出 v26.x.x` and `nvm install 26`.

B9 replacement: `Node 24/26 LTS（26 为 Active LTS，24 为维护期）`.

Verifying the exact winget `--version` string for 24.22.3 in winget-pkgs (only 24.21.0/24.22.0/24.22.1 were in the last-5 listing) is an open item (see Gaps).

**TypeScript**
- TS 7.0 (2026-07-08) "adopts 6.0's new defaults": `strict` true by default, `module` defaults to `esnext`, `target` = latest stable ES, `noUncheckedSideEffectImports` true, `rootDir` defaults to `./`, and "**types now defaults to []**, and the old behavior can be restored by setting it to ["*"]". — [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- TS 7.1 Beta was announced 2026-10-20. Its schedule: "followed by a Release Candidate in about a month from now, followed by a final release shortly thereafter". It adds `--target es2026`, stricter distributive-conditional checks and a new API split (`typescript/sync`, `typescript/async`…). npm `beta` = 7.1.0-beta, `next` = 7.1.0-dev.20261112.1. — [Announcing TypeScript 7.1 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/) · [registry](https://registry.npmjs.org/typescript)
- Course 第02章 L127-142: the `tsc --init --strict` "小坑" note plus the tsconfig with `"types": ["node"]` — ✅ the fix is correct. ⚠️ The explanation is imprecise: even without `tsc --init`, TS 7's **default** `types` is `[]`, so any tsconfig lacking `"types": ["node"]` breaks `process`. Suggested replacement for the first sentence of L130: `**TypeScript 7 默认值小坑**：TS 7 起 types 默认就是 []（不再自动加载 @types/*），tsc --init --strict 生成的模板还会打开 noUncheckedIndexedAccess / exactOptionalPropertyTypes / verbatimModuleSyntax……`. The rest stays. The course tsconfig (`module: NodeNext`, `target: ES2023`, `include: ["**/*.ts"]`) is compatible with the new `rootDir: ./` default.

**pnpm**
- pnpm docs: "pnpm 12 is the current release line. The latest tag on npm points at it". "The `npx get-pnpm` installer requires Node.js 22.13 or newer". `npm install -g pnpm@latest` still works (Node ≥18). pnpm 12 is a native executable. — [pnpm installation](https://pnpm.io/installation). Course 第02章 L51-57 — ✅. ⚠️ minor: L56 `npm install -g pnpm` → `npm install -g pnpm@latest` (the docs form).
- `strictDepBuilds` "Default: true … the installation will exit with a non-zero exit code if any dependencies have unreviewed build scripts". `allowBuilds` is the pnpm-workspace.yaml map. — [pnpm settings](https://pnpm.io/settings). `pnpm approve-builds <pkg>` writes `allowBuilds` (since v12.11.0 it writes into `permissions` if that key exists). — [approve-builds](https://pnpm.io/cli/approve-builds). Course 第02章 L62 — ✅.
- `pnpm init` defaults `--init-type` to `module` (writes `"type": "module"`) and pins the pnpm version via `devEngines.packageManager` + `packageManager`. — [pnpm init](https://pnpm.io/cli/init). This is good for the course (ESM-only AI SDK, top-level await). Optional note for 第02章 L124.
- `better-sqlite3@13.x` has no install script, so it needs **no** `approve-builds` (unlike v12, whose `install` was `prebuild-install || node-gyp rebuild`). — [registry 13.1.1](https://registry.npmjs.org/better-sqlite3/13.1.1) · [registry 12.0.0](https://registry.npmjs.org/better-sqlite3/12.0.0)

**Next.js**
- Latest 16.4.6 (2026-11-09). create-next-app flags `--ts`, `--app`, `--tailwind` are valid. The recommended defaults are "TypeScript, ESLint, No React Compiler, Tailwind CSS, No src/ directory, App Router, **Cache Components**, AGENTS.md". `--use-pnpm` exists. — [create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app). Course 第05章 L186 — ✅.
- Route segment config: `runtime` defaults to `'nodejs'` and `'edge'` is deprecated. `maxDuration` is still valid. With Cache Components, `dynamic`/`revalidate`/`fetchCache`/`dynamicParams` are removed (the course doesn't use them). — [route segment config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config). Course 第05章 L199 `maxDuration` — ✅. L379 — ⚠️ (wording, see §2.3).
- **[NEW]** v16.4.6: "Automatically compress route handler responses if not already compressed". The upstream PR explains that route handler responses were never compressed when self-hosted and now are, via the `compression` middleware's content-type filter. An open issue (#101465, 2026-11-09) reports a related Content-Encoding regression in 16.4.5. — [v16.4.6 release](https://github.com/vercel/next.js/releases/tag/v16.4.6) · [PR #101220](https://github.com/vercel/next.js/pull/101220) · [issue #101465](https://github.com/vercel/next.js/issues/101465)
- 16.4.6 also pins Tailwind to 4.3.3 in create-next-app. — [v16.4.6 release](https://github.com/vercel/next.js/releases/tag/v16.4.6)

### Inferences
- **SSE risk under `next start` 16.4.6.** `mime-db` has no `text/event-stream` entry ([mime-db](https://raw.githubusercontent.com/jshttp/mime-db/master/db.json)), so `compressible`'s `^text/` fallback likely treats it as compressible. Self-hosted streaming responses (第05章 L82-88 hand-written SSE, L227 `createUIMessageStreamResponse`) could therefore start being gzip-buffered.
  - Suggested defensive addition to 第05章 常见坑 2: `Next.js 16.4.6 起 next start 自托管会自动压缩 Route Handler 响应；若打字机变成一次性蹦出，在流式响应头加 "Cache-Control": "no-cache, no-transform" 并实测（compression 中间件遇 no-transform 不压缩）`.
  - The `no-transform` behaviour is a property of the expressjs `compression` package and should be confirmed against Next's vendored copy (Gap).
- Course readers following 第02章 verbatim after 2026-10-28 get Node 26 from winget. Nothing in this scope's stack breaks on 26 (AI SDK tested on 26, pnpm supports it, N-API sqlite). So the fix is about **accuracy of the stated output**, not breakage.

### Gaps
- I did not run `next start` 16.4.6 with an SSE route to confirm whether `text/event-stream` is now compressed or buffered.
- The exact winget-pkgs `--version` string for the latest 24.x (24.22.3 vs 24.22.1) was not confirmed. Only the last five manifest folders were listed: 24.21.0, 24.22.0, 24.22.1, 26.13.0, 26.13.1.
- I did not check whether `pnpm create next-app` under pnpm 12 exits with `ERR_PNPM_IGNORED_BUILDS` (sharp / unrs-resolver / @tailwindcss/oxide).

---

## 6. AG-UI protocol and generative-UI libraries

### Takeaway
第20章's AG-UI 1.0 description is still accurate (spec 1.0, HTTP+SSE / HTTP+Protobuf transports, `@ag-ui/*` 1.0.x). The only stale detail is "最新滚动发布 2026-10-21": the repo has shipped rolling releases through **2026-11-12**, and `@ag-ui/core` / `@ag-ui/client` are now 1.0.4. Both spec URLs resolve (redirecting to `docs.ag-ui.com`). The course mentions no other generative-UI library; its approach (`Output.object` intent + whitelist + Zod) matches the AI SDK's documented tool-part rendering pattern.

### Cited Findings
- `https://ag-ui.com/spec/1.0` → 200, redirects to `https://docs.ag-ui.com/spec/1.0`. `https://ag-ui.com/agentic-protocols` → 200, redirects to `https://docs.ag-ui.com/agentic-protocols`. Course 第20章 L53 links — ✅ (redirecting). [AG-UI spec 1.0](https://docs.ag-ui.com/spec/1.0)
- The spec page describes itself as "The behavioural specification for the AG-UI protocol — 1.0". It lists "HTTP + SSE" and "HTTP + Protobuf" transports plus a contract for custom bindings, and refers to "the eight event families". It names no newer version (1.1/2.0) and gives no release date. Course L51 (SSE/Protobuf, event types) — ✅. [AG-UI spec 1.0](https://docs.ag-ui.com/spec/1.0)
- GitHub rolling releases: `release/2026-11-12`, `2026-11-10`, `2026-11-09`, `2026-11-06`, `2026-11-05`, `2026-11-03` (package publish batches, for example `@ag-ui/claude-agent-sdk 0.0.9`, `@ag-ui/aws-strands 1.0.2`). Course L51 "最新滚动发布 2026-10-21" — ⚠️. [ag-ui releases](https://github.com/ag-ui-protocol/ag-ui/releases)
- `@ag-ui/core` and `@ag-ui/client` 1.0.4 (2026-11-05), peer `zod ^3.25.18 || ^4.0.0`. — [registry](https://registry.npmjs.org/@ag-ui/core)
- The AI SDK's generative-UI doc renders typed tool parts (`tool-displayWeather`, by `part.state`) from `message.parts`, consistent with 第20章's parts/registry pattern. — [Generative user interfaces](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces)
- (Context only, not in the course) CopilotKit, the main AG-UI reference client, is at `@copilotkit/react-core` 1.87.0 (2026-11-11), with a `next` tag of 2.0.0-rc.45. — [registry](https://registry.npmjs.org/@copilotkit/react-core)

Suggested replacement for 第20章 L51's last sentence: `规范 1.0 已稳定（仓库按日期滚动发布各语言 SDK，2026-11 仍在持续更新；TS 包 @ag-ui/core / @ag-ui/client 为 1.0.x）。`. Optionally update the L53 links to the `docs.ag-ui.com` canonical URLs.

### Inferences
- A "stable" label for 1.0 is not stated on the spec page itself. The course's "规范 1.0 已于 2026 稳定" relies on the 1.0 versioning plus the 1.0.x npm line. That is reasonable, but softer wording ("1.0 版规范") avoids over-claiming.

### Gaps
- I did not open the "Key Changes (1.0 vs 0.x)" or event-stream pages to enumerate the eight event families against the course's description ("run/step 生命周期、文本增量、工具调用、推理过程、状态快照、子 Agent").
