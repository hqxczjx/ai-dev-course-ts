# 评测 / 可观测（LLMOps）/ 可靠性 / 安全 / 部署工具链时效核查（截至 2026-11-13）

> 核查范围：`05-工程化篇/第15章-评测体系.md` ~ `第19章-部署与上线.md`、`附录/附录B-资源索引.md`（B4/B5/B6/B9）、`CHANGELOG.md`，对照 `research/R4`、`R6`、`核对-V5`、`R7`。课程上次复核日为 2026-10-22。
> 方法：npm registry 直查（`https://registry.npmjs.org/<pkg>`，2026-11-13 拉取全量 packument，取 `dist-tags`/`time`/`engines`/`peerDependencies`）+ 官方文档/GitHub release 一手来源 + 一次真实 `npm install --package-lock-only` 依赖解析实测（见 Q3）。**所有来源访问日期均为 2026-11-13**，下文不再逐条重复。
> 标记：✅ 仍正确 ／ ⚠️ 需更新 ／ ❌ 错误或已失效；**【10-22 后变化】** = 课程复核日之后才发生的变化。
> 文件行号均指课程当前文件（只读，未修改任何课程文件）。

---

## Q1. 本领域涉及包的最新版本（npm registry）

### Takeaway
没有出现推翻课程写法的大版本，但有 6 处版本快照已落后，其中 **@langfuse/* 6.0.x→6.1.1、OTel 2.x 线出了 0.223.1、promptfoo 0.125.x** 三处直接影响课程正文里的锁版本命令或文字；另有 **@vercel/sandbox 4.0.0（11-12）**、**p-retry 9.0.0（11-02）** 等课程未用到的大版本。

### Cited Findings
版本表（latest = npm `dist-tags.latest`；发布时间为 UTC）：

| 包 | 课程写法（file:line） | npm latest（发布时间） | 判定 | 说明 |
|---|---|---|---|---|
| promptfoo | 第15章 L53「2026-10 已 0.124.x」；附录B L131「0.124.x」 | **0.125.1**（2026-10-25；0.125.0 为 2026-10-23）engines `node >=22.22.0` | ⚠️【10-22 后变化】 | [registry](https://registry.npmjs.org/promptfoo) |
| autoevals | 第15章 L120-133；附录B L131「0.4.x」 | 0.4.1（2026-10-21） | ✅ | [registry](https://registry.npmjs.org/autoevals) |
| @langfuse/otel / tracing / openai / vercel-ai-sdk / client / core | 第16章 L57、L63-64「6.0.1」；附录B L131「6.0.x」 | **6.1.1**（2026-11-03）；6.0.2（10-22）、6.1.0（10-30）；engines `node >=22` | ⚠️【10-22 后变化】 | [registry @langfuse/otel](https://registry.npmjs.org/@langfuse%2Fotel) |
| @opentelemetry/sdk-node | 第16章 L65「0.223.0（2.x 线最后一版）」 | latest **0.301.1**（2026-11-09，OTel 3.1.1 线，engines `node >=22.15.0`，peer api `>=1.10.0 <1.11.0`）；**dist-tag `latest-2` = 0.223.1（2026-11-09）** | ❌【10-22 后变化】 | [registry](https://registry.npmjs.org/@opentelemetry%2Fsdk-node) |
| @opentelemetry/exporter-trace-otlp-http / otlp-exporter-base | 第16章 L66-67「0.223.0」 | latest 0.301.1；`latest-2` = **0.223.1**（2026-11-09） | ⚠️【10-22 后变化】 | [registry](https://registry.npmjs.org/@opentelemetry%2Fexporter-trace-otlp-http) |
| @opentelemetry/api | 第16章 L65「1.9.1」 | latest 1.10.0（2026-10-20）；1.9.x 仅有 1.9.0/1.9.1 | ✅（2.x 线必须 <1.10.0，1.9.1 仍是正确锁定值） | [registry](https://registry.npmjs.org/@opentelemetry%2Fapi) |
| @opentelemetry/core | —（被 @langfuse/otel 作为 peer 要求 `^2.0.1`） | latest 3.1.1（11-09）；`latest-2` = 2.12.1（11-09） | 信息 | [registry](https://registry.npmjs.org/@opentelemetry%2Fcore) |
| @opentelemetry/sdk-trace-base / sdk-trace-node | 课程未直接装（Langfuse Next.js 指南用 sdk-trace-node） | 2.12.x 已被标 `deprecated: "Use @opentelemetry/sdk-trace package"`；OTel 3.0 已移除 sdk-trace-node | 信息 | [registry sdk-trace-base](https://registry.npmjs.org/@opentelemetry%2Fsdk-trace-base) |
| @ai-sdk/otel | 附录B L62 | 1.0.170（2026-11-11），engines node >=22 | ✅ | [registry](https://registry.npmjs.org/@ai-sdk%2Fotel) |
| @vercel/otel | 课程未直接装 | 2.3.0（2026-11-05）；peer 全部限定 OTel 2.x（如 `@opentelemetry/sdk-trace-base >=2.0.0 <3.0.0`） | 信息 | [registry](https://registry.npmjs.org/@vercel%2Fotel) |
| inngest | 附录B L132「4.25.x」；CHANGELOG L26 | **4.26.2**（2026-10-29）；4.26.0 发布于 2026-10-22 | ⚠️ | [registry](https://registry.npmjs.org/inngest) · [CHANGELOG](https://github.com/inngest/inngest-js/blob/main/packages/inngest/CHANGELOG.md) |
| @inngest/agent-kit | — | 0.13.2（2025-11-13，一年未更新） | ✅ | [registry](https://registry.npmjs.org/@inngest%2Fagent-kit) |
| @trigger.dev/sdk | 第17章 L127「v4」 | 4.8.5（2026-11-12） | ✅（仍 v4） | [registry](https://registry.npmjs.org/@trigger.dev%2Fsdk) |
| e2b | 附录B L133「2.58.x」 | **2.63.0**（2026-11-04），engines `node >=22.19.0` | ⚠️ | [registry](https://registry.npmjs.org/e2b) |
| @e2b/code-interpreter | 附录B L78 | 2.9.1（2026-11-02），engines `node >=22.19.0` | ✅ | [registry](https://registry.npmjs.org/@e2b%2Fcode-interpreter) |
| @vercel/sandbox | 课程未提 | **4.0.0（2026-11-12）**，engines `node >=22.19.0` | 信息【10-22 后变化】 | [registry](https://registry.npmjs.org/@vercel%2Fsandbox) · [release](https://github.com/vercel/sandbox/releases) |
| @cloudflare/sandbox | 课程未提 | 1.0.3（2026-10-22）；1.0.2 于 10-20 | 信息 | [registry](https://registry.npmjs.org/@cloudflare%2Fsandbox) |
| @upstash/redis | 附录B L133「1.39.x」 | **1.41.0**（2026-11-02；1.40.0 为 10-26） | ⚠️【10-22 后变化】 | [registry](https://registry.npmjs.org/@upstash%2Fredis) |
| @upstash/vector | B3/B5 | 1.2.4（2026-11-12） | ✅（patch） | [registry](https://registry.npmjs.org/@upstash%2Fvector) |
| @upstash/ratelimit | 课程未用 | 2.2.1（2026-11-12） | N/A | [registry](https://registry.npmjs.org/@upstash%2Fratelimit) |
| p-retry | 课程未用（全书 grep 无命中） | **9.0.0（2026-11-02）**，engines node >=22 | N/A | [registry](https://registry.npmjs.org/p-retry) |
| drizzle-orm / drizzle-kit | 附录B L130「0.45.x / 0.31.x」；第19章 L91 | drizzle-orm 0.45.4；drizzle-kit 0.31.11（2026-09-21）；另有预发布 drizzle-kit **1.0.0-rc.5**（2026-10-21，非 latest） | ✅ | [registry drizzle-kit](https://registry.npmjs.org/drizzle-kit) |
| next | 附录B L136「16.4.x」 | 16.4.6（2026-11-09） | ✅ | [registry](https://registry.npmjs.org/next) |
| deepeval（TS） | 第15章 L247；附录B L133 | 0.9.26（2026-11-11），engines node >=22 | ✅ | [registry](https://registry.npmjs.org/deepeval) |
| braintrust | 第15章 L248 | 3.44.0（2026-11-11） | ✅ | [registry](https://registry.npmjs.org/braintrust) |
| langsmith | 第15章 L250；第16章 L152 | 0.12.0（2026-11-10；0.11.x 于 10-15 起） | ✅（未到 1.0） | [registry](https://registry.npmjs.org/langsmith) |
| ai | 附录B L127 | 7.0.170（2026-11-11） | ✅ | [registry](https://registry.npmjs.org/ai) |
| wrangler | 第19章 L95 | 4.161.0，engines `node >=22.12.0` | ✅ | [registry](https://registry.npmjs.org/wrangler/latest) |
| pnpm | 附录B L136「12.x」 | 12.20.0（2026-11-12） | ✅ | [registry](https://registry.npmjs.org/pnpm) |

建议替换（附录B L131-133 B9 快照）：
```
promptfoo 0.125.x          autoevals 0.4.x                @langfuse/* 6.1.x（tracing/otel/openai/vercel-ai-sdk；OTel 必须锁 2.x：sdk-node 0.223.1）
inngest 4.26.x             playwright 1.64.x              @playwright/mcp 0.0.83
e2b 2.63.x                 @upstash/redis 1.41.x          deepeval 0.9.x（TS 版）
```
（playwright/@playwright/mcp 不在本核查范围，未复核。）

### Inferences
- 本领域大量包（e2b、@vercel/sandbox、OTel 3.x、deepeval、@ai-sdk/otel、promptfoo）的 engines 已抬到 Node ≥22.12～22.22，课程主线 Node 24 LTS 不受影响，但第 19 章 CI 里的 `node-version: 22` 若解析到较老的 22.x 会踩线（见 Q10）。
- 时间敏感点：OTel 2.x 维护线在 11-09 仍在出补丁（0.223.1），说明「锁 2.x」在近期仍是官方可持续的选择，而非死胡同。

### Gaps
- playwright、@playwright/mcp、MCP SDK、zod 等不属于本主题，未复核。
- 未逐包阅读每个 patch 版本的 changelog；只对 promptfoo、langfuse-js、OTel JS、inngest-js、@vercel/sandbox 读了 release notes。

---

## Q2. promptfoo：配置 schema、断言、CLI、CI Action、破坏性变更

### Takeaway
课程的 YAML 结构、`eval`/`view` 命令与断言名基本全对；**一处断言名错误（不存在 `context-precision`）**；0.124/0.125 的破坏性变更只是把若干 SDK 改成可选安装，不影响课程示例。CI 示例里 `actions/checkout@v4` 与缺少 `permissions` 块需更新。另：promptfoo 已于 2026-03 宣布被 OpenAI 收购（声明继续开源），课程未提。

### Cited Findings
- 课程 第15章 L53「0.124.x，非常活跃」→ npm latest 0.125.1（2026-10-25），engines `node >=22.22.0` — [npm](https://registry.npmjs.org/promptfoo)。判定 ⚠️【10-22 后变化】。建议替换：「promptfoo（npm 包 `promptfoo`，2026-11 为 0.125.x，需 Node ≥22.22；2026-03 宣布被 OpenAI 收购，官方承诺继续开源维护）是 TS 生态评测的事实标准 CLI……」
- 0.125.0（2026-10-23）破坏性变更：「make jks-js an optional peer dependency」「make Claude Agent and Codex SDKs opt-in」；新增 `rouge-l`/`rouge-s` 断言、`equals`/`contains` 可选 Unicode 归一化、「add safe mode to disable inline JavaScript execution」。0.124.0（10-06）破坏性变更：「make Langfuse SDK opt-in」「make OpenAI Agents an explicit install」等；0.123.0：「default GPT-5.6+ to Responses」 — [promptfoo releases](https://github.com/promptfoo/promptfoo/releases)。判定：课程示例只用 OpenAI/DeepSeek provider 与基础断言，✅ 不受影响。
- 收购：promptfoo 官方博客（2026-03-09）「Promptfoo has agreed to be acquired by OpenAI」「Promptfoo will remain open source」 — [promptfoo blog](https://www.promptfoo.dev/blog/promptfoo-joining-openai/)；第三方报道见 [TechCrunch](https://www.techcrunch.com/2026/03/09/openai-acquires-promptfoo-to-secure-its-ai-agents/)。课程第15章 L53 / 第16章未提 → ⚠️ 建议加一句（中立性话题面试常问）。
- 断言名（官方 expected-outputs 全表）：确定性含 `equals`/`contains`/`icontains`/`regex`/`is-json`/`javascript`/`latency`/`cost`/`is-valid-function-call`/`is-valid-openai-tools-call`/`tool-call-f1`，以及**新的 Agent 轨迹断言** `trajectory:tool-used`、`trajectory:tool-args-match`、`trajectory:tool-sequence`、`trajectory:step-count`、`trace-span-count`、`trace-error-spans`、`skill-used`；模型辅助含 `similar`/`llm-rubric`/`g-eval`/`answer-relevance`/`context-faithfulness`/`context-recall`/`context-relevance`/`conversation-relevance`/`trajectory:goal-success`/`factuality`（别名 `model-graded-factuality`）；无任何类型被标弃用 — [promptfoo expected-outputs](https://www.promptfoo.dev/docs/configuration/expected-outputs/)。
  - 第15章 L88-96 断言表 ✅（全部存在）。
  - **第15章 L163 RAG 行工具列写「`context-recall/precision`」→ ❌ promptfoo 没有 `context-precision` 断言**，对应的是 `context-relevance`。替换为：「| RAG | 上下文召回/相关性 | 该召回的召回了没/召回的是否都与问题相关 | `context-recall` / `context-relevance` |」
  - 第15章 L170-230（Agent 评测）建议补一句：「promptfoo 已内置 Agent 轨迹断言（`trajectory:tool-used` / `trajectory:tool-sequence` / `trajectory:step-count` / `trajectory:goal-success`），可把 15.7 的轨迹检查写进 YAML。」
- `llm-rubric` 语法：`type: llm-rubric` + `value`，可选 `threshold`/`weight`/`metric`/`provider`/`rubricPrompt` — [expected-outputs](https://www.promptfoo.dev/docs/configuration/expected-outputs/)。第15章 L76-78 ✅。
- provider：`deepseek:` 简写对应 `deepseek-flash`，官方文档「`deepseek-chat` and `deepseek-reasoner` IDs are retired」，环境变量 `DEEPSEEK_API_KEY` — [promptfoo DeepSeek provider](https://www.promptfoo.dev/docs/providers/deepseek/)。第15章 L63 `deepseek:deepseek-flash` ✅。（`openai:gpt-6-luna` 的型号名属模型/价格核查范围，未在此复核。）
- CLI `npx promptfoo@latest eval` / `view`（第15章 L82-83）✅，0.124/0.125 release notes 未改动这两个子命令 — [releases](https://github.com/promptfoo/promptfoo/releases)。
- CI Action（第15章 L100-116）：README 必填 `config`、`github-token`；官方示例含 `permissions: contents: read / pull-requests: write`、`actions/checkout@v4`、可选 `actions/cache` 与 `cache-path`、`prompts: 'prompts/**'` — [promptfoo-action README](https://github.com/promptfoo/promptfoo-action)；`v1` 浮动标签仍在，最新具体版本 `promptfoo-action-v1.3.4`（2026-06-15）— [GitHub releases API](https://api.github.com/repos/promptfoo/promptfoo-action/releases)。判定：`@v1` ✅、输入名 ✅；**缺 `permissions` 块 ⚠️**（仓库默认 GITHUB_TOKEN 只读时无法在 PR 评论）；`actions/checkout@v4` ⚠️（GitHub 已于 2026-09-23 移除 Node 20，见 Q10）。建议替换：
  ```yaml
  # .github/workflows/eval.yml（官方 promptfoo/promptfoo-action）
  on:
    pull_request:
      paths: ["prompts/**", "evals/**", "promptfooconfig.yaml"]
  permissions:
    contents: read
    pull-requests: write          # 允许 Action 在 PR 上评论
  jobs:
    eval:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v6   # v4 是 Node 20 时代的版本；runner 已于 2026-09-23 移除 Node 20
        - uses: promptfoo/promptfoo-action@v1
          with:
            github-token: ${{ secrets.GITHUB_TOKEN }}
            config: promptfooconfig.yaml
            openai-api-key: ${{ secrets.OPENAI_API_KEY }}
  ```

### Inferences
- `context-precision` 很可能是从 Ragas 的指标名（context_precision）迁移过来的口误；promptfoo 自己的 RAG 三件套是 faithfulness / recall / relevance。
- OpenAI 收购 + OpenAI 官方把 Evals 迁移目标指向 promptfoo（见 Q3b）意味着 promptfoo 在 OpenAI 生态的地位上升；课程「框架无关」的定位仍成立，但应提醒读者关注其独立性与许可证变化（目前官方承诺继续开源）。

### Gaps
- 收购是否已完成交割：promptfoo 博客只说「subject to customary closing conditions」，未找到交割完成的一手公告。
- 未复核 promptfoo 仓库 LICENSE 文本（仍是否 MIT）。

---

## Q3. autoevals 与评测生态（DeepEval / Braintrust / LangSmith / OpenAI Evals）

### Takeaway
autoevals、DeepEval、Braintrust 的描述仍正确；**OpenAI Evals 平台已弃用：2026-10-31 起只读、2026-11-30 关停**——第15章把它当作推荐托管评测选项，必须改。

### Cited Findings
- autoevals 0.4.1（2026-10-21），peer zod `^3.25.0 || ^4.0.0` — [npm](https://registry.npmjs.org/autoevals)；`Factuality({ input, output, expected })` → `.score` 用法自 V5 核对（2026-10-11）后无破坏性版本 — [autoevals README](https://github.com/braintrustdata/autoevals)。第15章 L122-132 ✅。
- **OpenAI Evals**：弃用页「On June 3, 2026, we notified developers using the Evals platform that the product is being deprecated」；2026-10-31「Existing evals become read-only」；2026-11-30「Evals dashboard and API are scheduled to shut down」；迁移指引标题「Moving from OpenAI Evals to Promptfoo」 — [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations)；Evals 指南页同样写明只读与关停日期 — [OpenAI Evals guide](https://developers.openai.com/api/docs/guides/evals)。
  - 第15章 L249「**OpenAI Evals API**：托管评测（`client.evals` 已在 openai SDK 里），服务端跑服务端评」→ ❌（弃用公告 06-03 已早于课程复核；只读生效于 10-31，属【10-22 后变化】）。替换：「- **OpenAI Evals（已弃用）**：OpenAI 于 2026-06-03 宣布弃用 Evals 平台，2026-10-31 起只读、2026-11-30 关停 Dashboard 与 API；官方迁移指引指向 promptfoo——这也是本章以 promptfoo 为主线的又一理由。」
  - 第15章 L289 延伸阅读「OpenAI Evals 官方指南：https://platform.openai.com/docs/guides/evals」→ ❌ 删除或改为「OpenAI 弃用说明（Evals → promptfoo 迁移）：https://developers.openai.com/api/docs/deprecations」。
- DeepEval TS 0.9.26（2026-11-11），peer 含 `vitest >=1.0.0`、`ai >=7.0.93 <8` — [npm](https://registry.npmjs.org/deepeval)。第15章 L247 ✅。
- Braintrust Starter「$0 / month」「$10 credits」「1 GB processed data」「10k scores」「14-day retention」；Pro $249/月 — [Braintrust pricing](https://www.braintrust.dev/pricing)。第15章 L248 ✅。
- LangSmith npm 0.12.0（2026-11-10）— [npm](https://registry.npmjs.org/langsmith)。第15章 L250 / 第16章 L152 包名 ✅。

### Inferences
- 第15章「生态一览」去掉 OpenAI Evals 后，「托管评测」位可由 Langfuse Evals/Braintrust 承担，不需要补新工具。

### Gaps
- 未复核 LangSmith TS SDK 0.12 的 `wrapOpenAI` / `traceable` 是否有改名（第16章 L152）；0.11→0.12 为 minor，未读 changelog。

---

## Q4. Langfuse TS SDK v6 + OpenTelemetry 2.x/3.x 兼容（课程锁版本命令）

### Takeaway
课程的 v6 API 写法（`LangfuseSpanProcessor` / `observeOpenAI` / `LangfuseVercelAiSdkIntegration` / `startActiveObservation` / `shutdown`）与官方文档逐字一致，**「必须锁 OTel 2.x」的结论在 2026-11-13 实测仍成立**；但锁定版本号应从 6.0.1/0.223.0 升到 **6.1.1/0.223.1**，且「0.223.0 是 2.x 线最后一版」已被事实推翻（OTel 2.x 维护线 11-09 发了 2.12.1/0.223.1，并有 npm dist-tag `latest-2`）。

### Cited Findings
- langfuse-js release：v6.0.2（10-22）、v6.1.0（10-30：bump undici、autoevals 0.4.1、skills tracing）、**v6.1.1（11-02/03）：「Fixes OTLP exporter peers to stay on the OpenTelemetry SDK 2.x line (#1077)」**；页面未提 OTel 3.x 支持 — [langfuse-js releases](https://github.com/langfuse/langfuse-js/releases)。
- peer 对比（npm registry）：`@langfuse/otel@6.0.1` peer `@opentelemetry/exporter-trace-otlp-http: ">=0.202.0 <1.0.0"`（会放进 0.300.x）；**`@langfuse/otel@6.1.1` 改为 `">=0.202.0 <0.300.0"`**，`@opentelemetry/core ^2.0.1`、`@opentelemetry/sdk-trace-base ^2.0.1`、`@opentelemetry/api ^1.9.0` 不变 — [@langfuse/otel 6.0.1](https://registry.npmjs.org/@langfuse%2Fotel/6.0.1)、[@langfuse/otel](https://registry.npmjs.org/@langfuse%2Fotel)。
- OTel JS：v3.0.0（10-20）最低 Node 提到 `>=22.15.0`、移除 `@opentelemetry/sdk-trace-node`；v3.1.0（11-05）把依赖 core/otlp-transformer/instrumentation 的包的 api 最低 peer 提到 1.10.0；**v2.12.1 与 experimental/v0.223.1 于 11-09 发布**（「Update local dependencies to 2.12.1」）— [opentelemetry-js releases](https://github.com/open-telemetry/opentelemetry-js/releases)；sdk-node `dist-tags.latest-2 = 0.223.1`，0.223.1 peer `@opentelemetry/api ">=1.3.0 <1.10.0"` — [npm sdk-node 0.223.1](https://registry.npmjs.org/@opentelemetry%2Fsdk-node/0.223.1)。
- **本次实测（2026-11-13，npm `--package-lock-only`，公共 registry）**：
  - 不锁 OTel：`npm install @langfuse/otel@6.1.1 @langfuse/tracing@6.1.1 @opentelemetry/sdk-node` → **ERESOLVE**：「Conflicting peer dependency: @opentelemetry/api@1.10.0 … peer @opentelemetry/api@">=1.10.0 <1.11.0" from @opentelemetry/sdk-node@0.301.1」vs「peer @opentelemetry/api@">=1.0.0 <1.10.0" from @opentelemetry/core@2.12.1」。→ 第16章 L73 的 ERESOLVE 描述 ✅ 仍成立。
  - 锁 0.223.1：`@langfuse/{otel,openai,tracing,vercel-ai-sdk}@6.1.1 ai@7 @opentelemetry/sdk-node@0.223.1 @opentelemetry/api@1.9.1 @opentelemetry/exporter-trace-otlp-http@0.223.1 @opentelemetry/otlp-exporter-base@0.223.1` → 解析成功（exit 0），树内 OTel 全部为 2.12.1/0.223.1，`protobufjs 7.6.6` 仍在依赖树中（第16章 L70 `pnpm approve-builds protobufjs` ✅ 仍需要）。（仅做了解析，未跑运行时上报。）
- 官方文档：SDK 总览安装 `npm install @langfuse/tracing @langfuse/otel @opentelemetry/sdk-node`，`@langfuse/otel` 需 Node ≥22，「built on the OpenTelemetry JS SDK v2」，环境变量 `LANGFUSE_SECRET_KEY`/`LANGFUSE_PUBLIC_KEY`/`LANGFUSE_BASE_URL`，`main().finally(() => sdk.shutdown())`「Shutdown flushes events and is required for short-lived applications」；文档**未给 OTel 版本锁定建议** — [Langfuse SDK overview](https://langfuse.com/docs/observability/sdk/overview)。→ 第16章 L80-87、L114-123 ✅。
- v5→v6 升级指南：「It needs Node.js 22+ and Langfuse Cloud or self-hosted Langfuse v4.59.0 or later」；移除 `getPrompt()` 等顶层别名、`setActiveTraceIO()` 等；v6 默认 gzip，`new LangfuseSpanProcessor({ compression: "none" })` 或 `LANGFUSE_OTEL_COMPRESSION=none` 可关 — [js-v5-to-v6](https://langfuse.com/docs/observability/sdk/upgrade-path/js-v5-to-v6)。→ 第16章 L57 Node/服务端版本要求 ✅。
- AI SDK 7 集成：官方代码与第16章 L99-108 逐字一致（`registerTelemetry(new LangfuseVercelAiSdkIntegration())`），「requires Node.js 22 or later」，单次关闭 `telemetry: { isEnabled: false }`；serverless 示例在 `after()` 里 `forceFlush()`；官方安装清单额外含 `@langfuse/client` 与 `zod` — [Langfuse × Vercel AI SDK](https://langfuse.com/integrations/frameworks/vercel-ai-sdk)。`@langfuse/vercel-ai-sdk@6.1.1` peer `ai ">=7.0.0 <8"` — [npm](https://registry.npmjs.org/@langfuse%2Fvercel-ai-sdk)。→ ✅。
- `observeOpenAI`（第16章 L91-92）：6.1.0/6.1.1 release notes 无移除 — [releases](https://github.com/langfuse/langfuse-js/releases) → ✅。

逐条判定与替换：
- 第16章 L57「`@langfuse/*` 6.0.1，2026-10-19」→ ⚠️【10-22 后变化】。替换：「Langfuse TS SDK 已是 **v6**（`@langfuse/*` 6.1.1，2026-11-03；v6.0.0 2026-10-14）。v6 要求 **Node.js ≥22** 与 **自部署 Langfuse ≥4.59.0**……」
- 第16章 L62-67 安装命令 → ⚠️ 替换为：
  ```bash
  # Langfuse 6.1.1 + OpenTelemetry 2.x（2.x 维护线，npm dist-tag: latest-2）
  pnpm add @langfuse/otel@6.1.1 @langfuse/openai@6.1.1 @langfuse/tracing@6.1.1 \
    @langfuse/vercel-ai-sdk@6.1.1 \
    @opentelemetry/sdk-node@0.223.1 @opentelemetry/api@1.9.1 \
    @opentelemetry/exporter-trace-otlp-http@0.223.1 \
    @opentelemetry/otlp-exporter-base@0.223.1

  # pnpm 12 必需：批准 protobufjs 的构建脚本，否则上一条命令会以 ERR_PNPM_IGNORED_BUILDS 退出
  pnpm approve-builds protobufjs
  ```
- 第16章 L73（及 CHANGELOG L44）「`0.223.0` 是 2.x 线最后一版」→ ❌【10-22 后变化】。替换：「> **为什么锁 OTel 2.x**：Langfuse 6.1.1 的 `@langfuse/otel` peer 仍要求 `@opentelemetry/core ^2.0.1`、`sdk-trace-base ^2.0.1`，并在 6.1.1 把 OTLP exporter peer 收紧到 `<0.300.0`（官方 release：stay on the OpenTelemetry SDK 2.x line）；而 OTel JS 3.x（`sdk-node@0.300+`，2026-10-20 起）要求 `@opentelemetry/api >=1.10.0 <1.11.0` 与 Node ≥22.15。不锁版本时 npm 直接 ERESOLVE（2026-11-13 复测仍如此）。OTel 官方仍在维护 2.x 线（2026-11-09 发布 2.12.1 / 0.223.1，npm dist-tag `latest-2`），锁这条线的最新补丁即可；等 Langfuse 宣布支持 OTel 3 后再整体升级。」
- 第16章 L95-108 ✅；可选补注：「官方安装清单另含 `@langfuse/client`（prompt/数据集/打分，本节代码不用可不装）」。

### Inferences
- Langfuse 6.1.1 的 peer 收紧意味着：只要 sdk-node 也锁在 2.x，npm 自动装 peer 时不会再把 0.300 版 exporter 混进来（R7 记录的 `SeverityNumber` 运行时报错场景在 6.1.1 下大概率不会再由 peer 自动安装触发）；但 sdk-node 不是 Langfuse 的 peer，所以 **sdk-node 仍必须手动锁**——这是读者照抄最容易出事的一行。
- 若后续出现 OTel 2.x 的 0.223.2 等补丁，课程写「锁 `@opentelemetry/sdk-node@latest-2` 对应版本」比写死补丁号更耐久，但 `@opentelemetry/api` 没有对应 dist-tag，仍需写死 1.9.1。

### Gaps
- 未找到 Langfuse 关于「何时支持 OTel JS 3.x」的官方路线图或 issue；GitHub release 与文档均未提。
- 本次只验证依赖解析，未连真实 Langfuse 4.79 实例跑端到端上报（R7 也未做）。

---

## Q5. Langfuse 自部署（docker compose / v4 架构 / 许可证 / Cloud 免费层）

### Takeaway
第16章 16.3 与第19章 compose 注释仍正确；服务端最新 **v4.79.0（2026-11-12）**，满足 SDK v6 的 ≥4.59.0；10-22 之后 compose 新增了 AI Gateway 容器、服务端移除了「自动 tokenization」，课程可选补注。

### Cited Findings
- docker compose 指南：本地 `git clone https://github.com/langfuse/langfuse.git` → `cd langfuse` → `docker compose up`，约 2-3 分钟 `langfuse-web-1` 日志「Ready」；「We strongly recommend that you update the secrets in the docker-compose file」（`# CHANGEME`）；「There is no default login」；VM「at least 4 cores and 16 GiB of memory」；升级 `docker compose up --pull always`；「The docker compose setup lacks high-availability, scaling capabilities, and backup functionality」；只有 langfuse-web 与 minio 需对外暴露，worker 与数据库绑定 127.0.0.1；新增 `langfuse-ai-gateway`（beta，端口 3031，需 Langfuse > v4.75.0） — [Langfuse docker compose](https://langfuse.com/self-hosting/deployment/docker-compose)。第16章 L44-50、第19章 L84-87、L163 ✅。
- 服务端 release：v4.79.0（11-12）、v4.78.0（11-10）、**v4.77.0（11-09）「This release removes automatic tokenization」**、**v4.76.0（11-05）「ship the gateway in the self-hosted docker compose」**、v4.73.0（11-03）「bump docker compose clickhouse version」、降低 legacy public API 限速 — [langfuse releases](https://github.com/langfuse/langfuse/releases)。【10-22 后变化】
- 许可证：仓库 LICENSE「Content outside of the above mentioned directories … is available under the "MIT Expat" license」，`ee/` 等目录另有许可；版权行为「Copyright (c) 2023-2026 ClickHouse, Inc.」 — [langfuse LICENSE](https://github.com/langfuse/langfuse/blob/main/LICENSE)。第16章 L42「开源（MIT 核心）」✅。
- Cloud Hobby「50k units / month included」、30 天数据访问、2 用户；Core $29、Pro $199（Teams +$300）、Enterprise $2,499；「Langfuse is open source and you can self-host it for free」 — [Langfuse pricing](https://langfuse.com/pricing)。第16章 L42 ✅。

建议（可选补注，第16章 L50 后）：「（2026-11 起官方 compose 还带一个 beta 的 `langfuse-ai-gateway` 容器；compose 方案官方明确不含高可用与备份，生产用 K8s/Helm。服务端 v4.77 起不再对未上报 token 数的 generation 自动分词计数——用 `observeOpenAI` / AI SDK 集成会从 API 响应里带 usage，不受影响。）」

### Inferences
- 版权行显示 Langfuse 已归属 ClickHouse, Inc.，但 MIT 核心许可未变；课程「数据不出门 + 免费自部署」论证不受影响。
- 「移除自动 tokenization」对第16章 16.6「成本看板」有潜在影响：手写 `startActiveObservation` 的 generation 若不带 usage，v4.77+ 不再估算成本。

### Gaps
- 未找到 ClickHouse 收购 Langfuse 的一手公告（只有 LICENSE 版权行这一一手证据），不在课程中下结论。
- 指南未写 ClickHouse/Redis/Postgres 的最低版本号。

---

## Q6. OTel GenAI 语义约定（第16章 16.5）

### Takeaway
「独立成仓 + Development 状态 + span 名」仍正确；但 **10-22 后规范有两处直接影响课程措辞的变化**：内容采集开关在 2026-10-26 被正式规范化为 `OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT`（四档取值），且 `gen_ai.tool.call.arguments` 是 **`execute_tool` span 上的 Opt-In 属性**——课程（采纳 V5 建议）写成「事件属性、不是 span 属性」是错的。另外 AI SDK 7 的 OTel 集成**默认记录输入输出**，与「默认不采集」相反。

### Cited Findings
- 仓库 README「**Status**: Development」 — [semantic-conventions-genai docs/gen-ai/README.md](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/README.md)。第16章 L127 ✅。
- execute-tool 规范：「Span name SHOULD be `execute_tool {gen_ai.tool.name}`」；属性表中 `gen_ai.tool.call.arguments`、`gen_ai.tool.call.result` 均为 **`Opt-In`** 的 span 属性 — [execute-tool.md](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/execute-tool.md)。events 文档只定义了 `gen_ai.evaluation.result` 等，未见 `gen_ai.tool.call` 事件 — [gen-ai-events.md](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-events.md)。
- 内容采集配置：「Capturing model instructions, prompts, completions, … is gated by an explicit user opt-in」；受控属性含 `gen_ai.input.messages`、`gen_ai.output.messages`、`gen_ai.system_instructions`、`gen_ai.tool.call.arguments`、`gen_ai.tool.call.result` 等；「If this configuration is provided via an environment variable, the environment variable MUST be named `OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT`」，取值 `NO_CONTENT`（默认）/`SPAN_ONLY`/`EVENT_ONLY`/`SPAN_AND_EVENT` — [gen-ai-spans.md](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md)。
- 提交历史：2026-10-26「Define and formalize GenAI content capture and upload configuration options (#543)」；2026-11-05「Move execute tool signals to `execute-tool.md`, rename span type to `gen_ai.execute_tool` (#636)」「Require structured GenAI content attributes (#634)」；2026-10-17「require provider-supplied tool call ID on execute_tool」 — [commit history](https://github.com/open-telemetry/semantic-conventions-genai/commits/main/docs/gen-ai/gen-ai-spans.md)。【10-22 后变化】
- AI SDK 7 Telemetry：「Once a telemetry integration is registered, supported AI SDK calls emit telemetry events by default」；「By default, both inputs and outputs are recorded」（`recordInputs`/`recordOutputs` 可关）；span `invoke_agent {modelId}` → `step {n}` → `chat {modelId}` / `execute_tool {toolName}`；tool span 带 `gen_ai.tool.call.arguments`、`gen_ai.tool.call.result` — [AI SDK telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry)。

逐条判定与替换：
- 第16章 L129 span 名 ✅。
- 第16章 L130「`gen_ai.tool.call.arguments` 则是 `gen_ai.tool.call` **事件**的属性（不是 span 属性）」→ ❌。替换：「- 关键属性：`gen_ai.request.model`、`gen_ai.usage.input_tokens`（含缓存 token）、`gen_ai.response.finish_reasons`；工具调用参数/结果 `gen_ai.tool.call.arguments` / `gen_ai.tool.call.result` 挂在 `execute_tool` span 上，属于 **Opt-In**（敏感内容）属性」
- 第16章 L131「消息内容默认不采集……需显式 opt-in（如 `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT`）」→ ⚠️【10-22 后变化】。替换：「- **规范层面内容默认不采集**（隐私设计）：2026-10 起规范统一用环境变量 `OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT`（`NO_CONTENT` 默认 / `SPAN_ONLY` / `EVENT_ONLY` / `SPAN_AND_EVENT`）。⚠️ 但具体 SDK 可以有自己的默认：**AI SDK 7 的遥测默认记录输入与输出**（用 `recordInputs: false` / `recordOutputs: false` 关闭），接 Langfuse 后用户 prompt 会原样进 trace——与第 18 章脱敏一起考虑。」
- 第16章「常见坑 3」L163 可补「AI SDK 7 默认记录输入输出」一句（同上）。

### Inferences
- 旧名 `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` 来自早期各语言 instrumentation（尤其 Python contrib）；新规范名生效后，各实现迁移会有时间差，课程写「规范名 + 以所用 SDK 文档为准」最稳。
- Development 状态的规范一个月内改了 span 类型名、内容开关、tool call ID 要求，印证课程「可能变，知道即可」的定位是对的。

### Gaps
- 未能确认旧环境变量名在 JS 侧任何官方 instrumentation 中是否仍被识别（GitHub API 未认证访问受限）。
- semantic-conventions-genai 仓库尚无正式 release 标签，只能引用 main 分支文档。

---

## Q7. Inngest v4 / Trigger.dev（第17章 17.2）

### Takeaway
v4 两参 `createFunction({ id, retries, triggers }, handler)`、`step.sleep(id, duration)`、免费层 5 万 executions/月（函数 + 每个 step 各计 1）、SSPL→Apache 延迟开源、SDK Apache-2.0 均 ✅；4.26.x 无破坏性变更。**一处教学性问题**：「并行步骤」示例其实是**一个** `step.run` 包了 `Promise.all`，不是 Inngest 的并行 step，失败时三个子任务会一起重跑。

### Cited Findings
- createFunction 参考：`inngest.createFunction(configuration, handler)`；`triggers` 位于配置对象内，可为单个或最多 10 个数组；`retries` 0-20，默认 4；handler 入参 `{ event, events, step, runId, logger, attempt }` — [Inngest v4 createFunction](https://www.inngest.com/docs/reference/typescript/v4/functions/create)。第17章 L104-107 ✅。
- `step.sleep(id, duration)`：duration 可为毫秒数、`ms` 风格字符串（如 `"30m"`）或 `Temporal.Duration` — [step.sleep](https://www.inngest.com/docs/reference/typescript/v4/functions/step-sleep)。第17章 L119-120 ✅。
- 并行：官方写法是不 await 地启动多个 `step.run()` 再 `Promise.all`，每个 step 「keep its own step result and retries」，动态任务用基于索引的稳定 ID — [Inngest step parallelism](https://www.inngest.com/docs/guides/step-parallelism)。
  - 第17章 L112-115「并行步骤：三个检索同时跑」+ `step.run("research", async () => Promise.all(...))` → ⚠️（代码能跑，但注释与 Inngest 的「并行步骤」概念不符：只有一个持久单元）。替换：
    ```ts
    // 并行步骤：每个子任务是独立的 step（各自记忆化、各自重试），全部完成才进下一步
    const research = await Promise.all(
      plan.subtasks.map((t: Task, i: number) =>
        step.run(`research-${i}`, () => runSubAgent(t)),
      ),
    );
    ```
- 计费：免费层「50k /mo included」，execution 定义「A single durable function run or step execution」，FAQ：五步的一次运行计 6 次；免费层并发 5 个 step、24 小时 trace 历史；Pro 起 $99/月、Business 起 $499/月 — [Inngest pricing](https://www.inngest.com/pricing)。第17章 L94、L129，附录B L76 ✅。（可选补：免费层只保留 24 小时历史。）
- 许可：README「Server Side Public License」+ 延迟开源发布为 Apache 2.0，SDK 均 Apache 2.0 — [inngest/inngest](https://github.com/inngest/inngest)。自托管文档：「supported as of the 1.0 release」、Helm chart 用于「production-ready Kubernetes deployments」，但「Inngest's support team does not guarantee direct support for self-hosted instances」；默认 SQLite + 内置内存 Redis，扩展需外接 Postgres/Redis；`inngest start` — [Inngest self-hosting](https://www.inngest.com/docs/self-hosting)。第17章 L94「支持生产自托管」✅（可补「官方不对自托管提供直接支持；默认 SQLite 单节点，生产需外接 Postgres + Redis」）。
- inngest 4.26.0（10-22）/4.26.1/4.26.2（10-29）：新增实验性 sandbox、`inngest.globals()`、`score.experiment()` 不再接受 `stepId`；无 createFunction/step 破坏性变更 — [inngest-js CHANGELOG](https://github.com/inngest/inngest-js/blob/main/packages/inngest/CHANGELOG.md)。
- Trigger.dev：Free「$5 of compute credits every month and 20 concurrent runs」；Hobby $10/月、Pro $50/月；官网 FAQ「Trigger is built for long running AI agents and workflows」 — [Trigger.dev pricing](https://trigger.dev/pricing)；SDK 4.8.5 — [npm](https://registry.npmjs.org/@trigger.dev%2Fsdk)。第17章 L127「v4、免费层 $5/月」✅；「内置 durable chat agent」⚠️ 本次在定价页未找到该说法（页面只说支持长时 AI agent、流式到前端），建议改为「面向长时 AI Agent 的持久任务（无超时、崩溃可续）」。

### Inferences
- 课程的并行示例若被读者照搬做「批量调研」，任一子 Agent 抛错会导致已成功的子 Agent 结果一起丢弃并重跑（成本翻倍），恰好违背本章「幂等 + 记忆化省钱」的主旨，值得改。

### Gaps
- `step.waitForEvent` 的 v4 签名未取到参考页原文（课程未用到，不影响判定）。
- 「durable chat agent」可能出自 Trigger.dev 某个产品页/博客，本次未找到一手出处。

---

## Q8. 安全：OWASP LLM Top 10、Agentic Top 10、注入防御、promptfoo 红队

### Takeaway
OWASP LLM Top 10 **仍是 2025 版**、无 2026 版；注入速查表要点仍成立。**课程缺失 OWASP Top 10 for Agentic Applications for 2026（2025-12-09 发布）**——对以 Agent 为主线的课程是明显缺口。promptfoo 红队有三处小措辞需改（`init --no-gui` 仍在、`harmful` 只是前缀、OPENAI_API_KEY 为可选）。

### Cited Findings
- genai.owasp.org/llm-top-10：当前为「2025 Top 10 Risk & Mitigations for LLMs and Gen AI Apps」，LLM01:2025 Prompt Injection … LLM10:2025 Unbounded Consumption；无 2026 版或草案公告 — [OWASP LLM Top 10](https://genai.owasp.org/llm-top-10/)。第18章 L5/L12/L47-62、附录B L88 ✅。
- **OWASP Top 10 for Agentic Applications for 2026**：官方资源页标题与日期「December 9, 2025」 — [OWASP GenAI resource page](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)。十条（官方页未内嵌清单，以下名称取自二手转述，需以官方 PDF 为准）：ASI01 Agent Goal Hijack、ASI02 Tool Misuse & Exploitation、ASI03 Identity & Privilege Abuse、ASI04 Agentic Supply Chain Vulnerabilities、ASI05 Unexpected Code Execution、ASI06 Memory & Context Poisoning、ASI07 Insecure Inter-Agent Communication、ASI08 Cascading Failures、ASI09 Human–Agent Trust Exploitation、ASI10 Rogue Agents — [Astrix 解读（2025-12-10）](https://astrix.security/learn/blog/the-owasp-agentic-top-10-just-dropped-heres-what-you-need-to-know/)；ASI01 与间接注入的关系另见 [TechRepublic](https://www.techrepublic.com/article/news-owasp-ai-agent-risk-list/)。
  - 判定 ❌（遗漏，非错误；发布早于 10-22 复核）。建议在第18章 18.3 末尾新增：
    > **18.3.1 补充：OWASP Agentic Top 10（2026 版）**——2025-12-09 OWASP GenAI 项目发布《Top 10 for Agentic Applications for 2026》（ASI01-ASI10），专门针对会规划、调工具、带委托权限行动的 Agent。与本课程的对应：ASI01 目标劫持（≈间接注入，18.2）、ASI02 工具误用 / ASI03 身份与权限滥用（18.4 第 4 层权限矩阵 + 18.6 完全中介）、ASI05 意外代码执行（18.4 第 5 层沙箱）、ASI06 记忆与上下文投毒（第 14 章记忆 + RAG 入库审核）、ASI07 Agent 间通信不安全（第 11 章多 Agent/A2A）、ASI08 级联失败（第 17 章熔断/降级）、ASI09 人-Agent 信任利用（HITL 审批文案不能被模型操纵）、ASI10 失控 Agent（步数/预算熔断 + 审计日志）。面试时「LLM Top 10 管模型应用，Agentic Top 10 管 Agent」是一句加分话术。
  - 附录B B6 建议加一行：`| OWASP Agentic Top 10（2026 版） | https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ | ASI01-ASI10，2025-12-09 发布 |`
- 注入速查表：仍有「do not treat text labels or prompt wording as an enforcement boundary」「enforce permissions at the tool boundary」；Model-Based Guardrails 一节引用 CaMeL（改进自 Simon Willison 的 Dual-LLM），列出「Llama Guard, ShieldGemma, IBM Granite Guardian, and Prompt Guard」；新增章节含 Best-of-N Attack Mitigation、Agent-Specific Defenses、Smoke-Testing Your Defenses；未提 Agentic Top 10 — [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)。第18章 L24、L192、附录B L89 ✅。
- promptfoo 红队快速开始：「Install Node.js `>=22.22.0`」；「Optional: Set your `OPENAI_API_KEY` environment variable」；「Attack generation uses a separate provider (defaults to OpenAI)」；`redteam setup`「will open a web UI」；仍文档化 `promptfoo redteam init --no-gui`；`redteam run` 生成 `redteam.yaml` — [red-team quickstart](https://www.promptfoo.dev/docs/red-team/quickstart/)。
  - 第18章 L228「需 Node ≥ 22，攻击生成用独立的 `OPENAI_API_KEY`」→ ⚠️ 替换：「需 Node ≥22.22；攻击生成走独立的生成 provider（默认 OpenAI，`OPENAI_API_KEY` 官方标为可选），与被测目标分离」。
  - 第18章 L231「旧命令 redteam init 曾提供 --no-gui 纯命令行」→ ⚠️ 替换：「`redteam setup` 打开 Web UI 向导；不想开浏览器用 `npx promptfoo@latest redteam init --no-gui`（两者并存）」。
- promptfoo 插件页：`harmful:*` 为子类族（如 `harmful:hate`，无裸 `harmful` ID）、`pii:direct`/`pii:api-db`/`pii:session`/`pii:social`、`prompt-extraction`、`bola`、`bfla`、`indirect-prompt-injection`、`data-exfil` 均存在；Agent 类新增 `mcp`、`tool-discovery`、`excessive-agency`、`agentic:memory-poisoning`、`hijacking`、`coding-agent:*`、`rag-poisoning`；框架预设有 `owasp:llm`（如 `owasp:llm:01`）、`owasp:api`、`nist:ai:measure`、`mitre:atlas` 等，**未列 `owasp:agentic`** — [red-team plugins](https://www.promptfoo.dev/docs/red-team/plugins/)。
  - 第18章 L242 → ⚠️ 替换：「- `redteam.plugins`：攻击生成器——重点开 `harmful:*`（有害内容子类）、`prompt-extraction`（套提示词）、`bola`/`bfla`（越权工具调用）、`pii:*`（数据泄露）、`indirect-prompt-injection` / `data-exfil`（间接注入与外传）、`excessive-agency`（过度代理）；也可直接用框架预设 `owasp:llm` 一键覆盖 LLM Top 10」。
- LLM06 八条缓解 + 两条损害限制（第18章 L196-213）：本轮未重新抓取 LLM06 详情页，沿用 V5（2026-10-11）核实结论 — [LLM06:2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)。

### Inferences
- 课程 18.4 的权限矩阵、沙箱、熔断已经覆盖 Agentic Top 10 的大部分缓解，补一节映射表成本很低、收益很高（Agent 岗面试高频）。
- `owasp:llm` 预设可替代课程手挑插件，减少读者配置失误。

### Gaps
- 未能从 genai.owasp.org 直接抓到 ASI01-ASI10 的官方逐条文本（资源页只给下载链接）；条目名称来自二手来源，写入课程前应下载官方 PDF 逐字核对。
- 未找到 OWASP LLM Top 10 的 2026 更新计划的一手消息。

---

## Q9. Agent 代码执行沙箱（E2B / Vercel Sandbox / Cloudflare Sandbox）

### Takeaway
课程只点名 E2B（描述正确）；Vercel Sandbox 已 GA 且 11-12 发布 SDK 4.0.0，Cloudflare Sandbox SDK 已到 1.0——建议第18章第5层改成「三选一」并给出 Node 版本门槛。

### Cited Findings
- E2B Hobby：「One-time $100 in usage credits」「Up to 1 hour per sandbox session」「Up to 10 concurrently running sandboxes」；Pro「$150 monthly plan fee, plus usage」 — [E2B pricing](https://e2b.dev/pricing)。e2b 2.63.0 / @e2b/code-interpreter 2.9.1，均 `node >=22.19.0` — [npm e2b](https://registry.npmjs.org/e2b)。附录B L78 ✅；第18章 L169 ✅。
- Vercel Sandbox：「Run untrusted or agent-generated code in isolated Linux microVMs」，「Each sandbox runs in a secure Firecracker microVM with its own filesystem and network」，Active CPU 计费（等待 LLM/网络不计 CPU），JS SDK `@vercel/sandbox`，文档相关链接含「Vercel Sandboxes are now generally available」（文档 last_updated 2026-09-22） — [Vercel Sandbox docs](https://vercel.com/docs/vercel-sandbox)。`@vercel/sandbox` 4.0.0（2026-11-12）：「Update Undici to version 8」「The minimum required Node.js version is now 22.19.0」 — [vercel/sandbox releases](https://github.com/vercel/sandbox/releases)。【10-22 后变化】
- Cloudflare Sandbox：「an isolated place to run code」，Containers（每实例为独立内核的 microVM）或 Dynamic Workers；「Available on Workers Paid plan」；npm `@cloudflare/sandbox`（0.x 有迁移指南）；页面 last updated 2026-09-30 — [Cloudflare Sandbox docs](https://developers.cloudflare.com/sandbox/)；npm latest 1.0.3（2026-10-22） — [npm](https://registry.npmjs.org/@cloudflare%2Fsandbox)。
- Inngest 4.26 也加入了实验性 sandbox（`step.sandbox.create`、`tool.shim()`） — [inngest-js CHANGELOG](https://github.com/inngest/inngest-js/blob/main/packages/inngest/CHANGELOG.md)。

建议替换第18章 L169：「Agent 要跑模型生成的代码/命令时（代码解释、文件操作），必须在沙箱里：microVM/容器隔离（无宿主文件系统、默认断网或出网白名单、资源限额）。托管选项（2026-11）：**E2B**（`@e2b/code-interpreter`，Hobby 一次性 $100 额度、单会话 ≤1 小时）、**Vercel Sandbox**（GA，Firecracker microVM，`@vercel/sandbox` 4.x 需 Node ≥22.19）、**Cloudflare Sandbox SDK**（`@cloudflare/sandbox` 1.x，基于 Containers，需 Workers Paid）。原则：**模型生成的内容永远不直接进 `eval`/`exec`/shell**……」

### Inferences
- 三家 SDK 都要求 Node ≥22.19，与课程 Node 24 一致；对仍在 Node 22 早期补丁的读者需提醒。

### Gaps
- 未取到 Vercel Sandbox 各计划的最长运行时长与免费额度；未取到 Cloudflare Sandbox 的具体价格（页面只链接 Containers 定价）。
- 未逐字核实 Vercel Sandbox GA 的发布日期（只看到文档内的 GA changelog 链接标题）。

---

## Q10. 部署：Docker/Next.js standalone、Vercel/Cloudflare 时限、CI、Drizzle 迁移

### Takeaway
standalone 配置、Vercel 时限表、drizzle-kit 迁移命令都正确；**需改的有三处**：① `maxDuration = 60` 在 fluid compute 默认 300s 下反而是「调低」；② CI 用的 `checkout@v4 / setup-node@v4 / pnpm/action-setup@v4` 都已落后两个大版本，且 GitHub 已于 2026-09-23 移除 runner 上的 Node 20、`node-version: 22` 与课程 Node 24 主线不一致；③ Dockerfile 缺官方示例中的 `HOSTNAME=0.0.0.0` 与非 root 用户。

### Cited Findings
- Next.js `output: 'standalone'`：生成 `.next/standalone`，带最小 `server.js`；`public` 与 `.next/static` 需手动拷贝；「run `PORT=8080 HOSTNAME=0.0.0.0 node server.js`」（文档 lastUpdated 2026-09-18） — [Next.js output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)。第19章 L38 ✅。
- 官方 with-docker 示例：`ARG NODE_VERSION=24.13.0-slim`，三阶段 dependencies/builder/runner，pnpm 走 `corepack enable pnpm && pnpm install --frozen-lockfile`，runner 设 `NODE_ENV=production`、`PORT=3000`、`HOSTNAME="0.0.0.0"`，`USER node` 且 `COPY --chown=node:node`，`CMD ["node", "server.js"]` — [next.js examples/with-docker/Dockerfile](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile)。
  - 第19章 L44-62 → ⚠️（结构正确；`node:24-alpine` 可用；corepack 在 Node 24 仍可用）。建议 runner 阶段替换为：
    ```dockerfile
    FROM node:24-alpine
    WORKDIR /app
    ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0   # 容器内必须监听 0.0.0.0
    COPY --from=build --chown=node:node /app/.next/standalone ./
    COPY --from=build --chown=node:node /app/.next/static ./.next/static
    COPY --from=build --chown=node:node /app/public ./public
    USER node                                            # 非 root 运行（官方示例同款）
    EXPOSE 3000
    CMD ["node", "server.js"]
    ```
- Vercel 时长（fluid compute 默认开启，文档 last_updated 2026-08-24）：Hobby 默认=最大 300s；Pro/Enterprise 默认 300s、最大 800s、Extended 1800s（Beta，仅 nodejs22.x/24.x/26.x、Bun、Python 3.12-3.14，>800s 需逐函数配置）；「For workloads that require unlimited execution time, use Vercel Workflows」 — [Vercel duration](https://vercel.com/docs/functions/configuring-functions/duration)。
  - 第19章 L162（常见坑 3）✅ 数字全对。
  - 第19章 L32「三个必做：`export const maxDuration = 60`（流式路由）」→ ⚠️（写法对，但数值已不合时宜：默认已是 300s，写 60 会把流式路由上限从 5 分钟降到 1 分钟）。替换：「三个必做：流式/Agent 路由显式写 `export const maxDuration = 300`（fluid compute 默认即 300s，Hobby 上限也是 300s；写明是为了防止项目级默认被改小，Pro 可到 800）；……」
- Cloudflare Workers（文档 last updated 2026-10-29）：HTTP 触发「There is no hard limit on duration」，只要客户端保持连接即可持续流式；CPU 时间 Free 10ms、Paid 默认 30s 可配到 5 分钟（等待 `fetch()` 不计 CPU）；子请求 Free 50 / Paid 10,000；运行时更新时在途流式请求有最多 20 分钟宽限 — [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)。第19章 L93-103 未写数字，✅ 无误；可选补一句「Workers 对 HTTP 流式无墙钟上限，但 Free 计划 CPU 仅 10ms/请求」。
- GitHub Actions：GitHub 官方「Runners now use Node 24 for JavaScript actions」，`ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION` opt-out 已取消，建议「update to the latest versions that support Node 24」（2026-09-23） — [GitHub changelog](https://github.blog/changelog/2026-09-23-node-20-is-no-longer-available-in-github-actions)。最新版本：actions/checkout v7.0.1、actions/setup-node v7.1.0（2026-10-08）、pnpm/action-setup v6.1.1（2026-11-03）、actions/cache v6.1.0 — [GitHub releases API: checkout](https://api.github.com/repos/actions/checkout/releases)、[setup-node](https://api.github.com/repos/actions/setup-node/releases)、[pnpm/action-setup](https://api.github.com/repos/pnpm/action-setup/releases)。pnpm/action-setup README：示例 `actions/checkout@v6` + `pnpm/action-setup@v6`，「This action supports pnpm v12 and earlier」，「This action does not set up Node.js」，版本取自 `packageManager` 或 `devEngines.packageManager`；pnpm v11+ 推荐 `pnpm/setup` — [pnpm/action-setup](https://github.com/pnpm/action-setup)。pnpm 官方 CI 文档推荐 `pnpm/setup`（示例固定到 commit SHA，注释 `# v3.1.2`，`runtime: node@24`、`cache: true`，默认自动 `pnpm install`），`actions/checkout@v6` — [pnpm CI](https://pnpm.io/continuous-integration)。
  - 第19章 L117-120 → ⚠️【部分为 10-22 前即已发生】。替换：
    ```yaml
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v6          # 读取 package.json 的 packageManager；支持 pnpm 12
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: pnpm }   # 与课程 Node 24 LTS 主线一致（promptfoo 需 ≥22.22）
      - run: pnpm install --frozen-lockfile
    ```
    （或按 pnpm 官方推荐用一步式 `pnpm/setup`：`with: { runtime: node@24, cache: true }`，它会顺带执行 `pnpm install`。）
  - 第19章 L138「`pnpm/action-setup` 依赖 package.json 的 `packageManager` 字段」✅（另可用 `devEngines.packageManager`）。
- Drizzle：`generate` 产 SQL 迁移、`migrate` 应用未执行的迁移、`push` 适合原型、`pull`/`export`/`check`/`up`；运行时 `migrate(db)` 适用于单体零停机与 serverless 部署 — [Drizzle migrations](https://orm.drizzle.team/docs/migrations)。drizzle-kit latest 0.31.11，1.0.0-rc.5 为预发布 — [npm](https://registry.npmjs.org/drizzle-kit)。第19章 L91、第6章 L151 ✅。

### Inferences
- `actions/checkout@v4` 在 Node 20 移除后会被 runner 强制以 Node 24 运行，多数情况下仍能跑，但属于「未受支持」状态；课程作为 2026-11 教材应直接用 v6/v7。
- `HOSTNAME=0.0.0.0` 缺失在某些容器网络（Docker 会把 `HOSTNAME` 环境变量设为容器 ID）下会导致 standalone server 只监听容器主机名，反代/端口映射访问失败——这是 Next.js 官方示例显式设置它的原因（推断，官方页未解释动机）。

### Gaps
- 未验证 `pnpm/action-setup@v4` 在 pnpm 12 下是否真的失败（README 只声明 v6 支持 pnpm 12）。
- `pgvector/pgvector:pg17`（第19章 L81）本轮未重新核对 tag（V5 于 10-11 核实存在）。

---

## Q11. 可靠性/成本：Prompt 缓存机制、Batch API、网关（只看机制）

### Takeaway
「稳定前缀放前面」的原则仍正确，但课程把各家缓存都写成「自动、改顺序即可」不够准确：**Anthropic 需要显式 `cache_control`（顶层自动模式或最多 4 个断点）才会缓存**；OpenAI 在 GPT-5.6+ 引入了 `prompt_cache_options`（显式断点模式、TTL 30m/12h），且最新模型缓存读价已低至 0.05x，课程「约 10%」需改。Batch 五折 ✅；Cloudflare AI Gateway 免费三件套 ✅。

### Cited Findings
- OpenAI：「Prompt caching is enabled by default for supported OpenAI models」；GPT-5.6+ 最小 1,024 tokens；「Cache reuse requires the entire rendered prefix to match」；旧模型用 `prompt_cache_retention`（`in_memory`/`24h`）与 `prompt_cache_key`，**GPT-5.6+ 改用 `prompt_cache_options.ttl`（默认 `"30m"`，Responses API 可 `"12h"`）并可通过 `prompt_cache_options.mode` 选择仅显式断点**，且「the key is not needed to optimize caching」；用量看 `usage.input_tokens_details.cached_tokens`；「savings of up to 95%」，GPT-6.1 Sol / GPT-6.1 Terra 缓存读为 0.05× — [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)。旧链接 `https://platform.openai.com/docs/guides/prompt-caching` 301 跳转到该地址。
- Anthropic：两种方式——「Add a single `cache_control` field at the top level of your request」（自动断点，随对话前移）或在内容块上放显式断点；「You can define up to 4 cache breakpoints」；缓存覆盖顺序「`tools`, `system`, and `messages` (in that order)」，改工具定义会使整个缓存失效；TTL 默认 5 分钟（命中续期）、可选 `"ttl": "1h"`；写入 1.25x（5m）/2x（1h）、读取 0.1x（Fable 5.x / Mythos 5.x 为 0.025x，Opus 5.5 / Sonnet 5.5 为 0.05x）；Opus 5.5 / Sonnet 5.5 / Haiku 5.5 等最小 512 tokens；时间戳等变化块放在最后一个可缓存块会导致自动模式不命中 — [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)。
- Batch：OpenAI「50% cost discount compared to synchronous APIs」、24h 窗口、单批 ≤50,000 请求/200 MB — [OpenAI batch](https://developers.openai.com/api/docs/guides/batch)；Anthropic Message Batches「reducing costs by 50 percent」、多数 1 小时内完成 — [Anthropic batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)。第17章 L164（OpenAI/Anthropic 部分）✅。
- Cloudflare AI Gateway：「AI Gateway's core features available today are offered for free」——「dashboard analytics, caching, and rate limiting」；Workers Free 旧日志「100,000 logs total」；**2026-09-24 及之后创建的网关日志改存 Workers Logs、按其计费**；Unified Billing 收 5% 手续费（页面 last updated 2026-11-02） — [AI Gateway pricing](https://developers.cloudflare.com/ai-gateway/reference/pricing/)。第16章 L150、第17章 L166、附录B L79 ✅。

逐条判定与替换：
- 第17章 L156「OpenAI 缓存输入约 **10%** 价。工程要点：稳定前缀……放消息最前……」→ ⚠️。替换（只改机制部分，具体价格交给价格核查）：「OpenAI 默认自动缓存（≥1,024 tokens 前缀完全一致才命中），GPT-5.6 起可用 `prompt_cache_options` 设 TTL（默认 30 分钟）或改为显式断点，最新型号缓存读最低约 0.05x；**Claude 不会自动缓存**——必须在请求顶层加 `cache_control: { type: "ephemeral" }`（自动断点）或在稳定块上打最多 4 个显式断点，缓存顺序固定为 tools → system → messages，默认 5 分钟 TTL（可选 1 小时，写入价更高）。工程要点不变：**稳定前缀（system/工具定义/长文档）放最前、变化内容放后**……」
- 第17章 L198（练习 2「只开 Prompt 缓存（前缀重排）」）→ 建议补「（Claude 需加 `cache_control`）」。
- 第17章 L218 OpenAI 链接 → ⚠️ 改为 `https://developers.openai.com/api/docs/guides/prompt-caching`；L220「Anthropic Prompt Caching：https://platform.claude.com/docs（搜 prompt caching）」→ 改为具体页 `https://platform.claude.com/docs/en/build-with-claude/prompt-caching`。

### Inferences
- 课程练习「只重排前缀就能省钱」在 DeepSeek/OpenAI 上成立，在 Claude 上若不加 `cache_control` 会得到「命中率为 0」的反例——正好可以作为常见坑 6 的补充。
- （超出本主题、提醒价格核查方）Anthropic 缓存文档已列出 **Fable 5.2 / Mythos 5.2**，OpenAI 文档出现 **GPT-6.1 Terra**——均不在课程附录B L13-14 的模型清单中，可能是 10-22 之后的新模型。

### Gaps
- GLM（智谱）Batch API 是否五折本轮未核实（第17章 L164 提到）。
- 模型路由工具（OpenRouter 等）不在本轮核查（课程本章只给自写 `pickModel`，无第三方路由工具 API 主张）。

---

## 附：需修改清单（按优先级汇总，供报告撰写）

**P0（照抄会错/已失效）**
1. 第15章 L249、L289：OpenAI Evals 已弃用（10-31 只读、11-30 关停）→ 删除推荐、改为弃用注记。
2. 第16章 L62-67、L73 + CHANGELOG L44：OTel「0.223.0 是 2.x 最后一版」不成立 → 锁 `@langfuse/*@6.1.1` + `@opentelemetry/*@0.223.1` + `api@1.9.1`（2026-11-13 实测：不锁仍 ERESOLVE，锁后解析成功）。
3. 第16章 L130：`gen_ai.tool.call.arguments` 是 `execute_tool` span 的 Opt-In 属性，不是事件属性。
4. 第15章 L163：`context-precision` 不存在 → `context-relevance`。

**P1（过时/不精确）**
5. 第16章 L131：内容采集环境变量规范名改为 `OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT`；补「AI SDK 7 默认记录输入输出」。
6. 第18章：新增 OWASP Agentic Top 10（2026 版）映射小节 + 附录B B6 一行。
7. 第19章 L32：`maxDuration = 60` → `300`（默认值已是 300）。
8. 第19章 L117-120、第15章 L109：Actions 升级到 checkout@v6/setup-node@v7/pnpm/action-setup@v6，`node-version: 24`；第15章 CI 补 `permissions: pull-requests: write`。
9. 第17章 L112-115：并行示例改为多个 `step.run` + `Promise.all`。
10. 第17章 L156、L218、L220：缓存机制补 Claude 需 `cache_control`、OpenAI `prompt_cache_options`；链接更新。
11. 第18章 L228、L231、L242：红队 OPENAI_API_KEY 可选、`init --no-gui` 仍可用、插件 ID 用 `harmful:*` / `pii:*` 并提 `owasp:llm` 预设。
12. 第15章 L53 / 第16章 L57 / 附录B L131-133：版本号更新（promptfoo 0.125.x、@langfuse 6.1.x、inngest 4.26.x、e2b 2.63.x、@upstash/redis 1.41.x）；可提 promptfoo 被 OpenAI 收购。

**P2（建议补充）**
13. 第19章 Dockerfile 补 `HOSTNAME=0.0.0.0`、`USER node`。
14. 第18章第 5 层沙箱补 Vercel Sandbox（GA，4.0.0 需 Node ≥22.19）与 Cloudflare Sandbox SDK 1.x。
15. 第16章 16.3 补：compose 含 beta AI Gateway 容器、无 HA/备份；服务端 v4.77 移除自动 tokenization。
16. 第17章：Inngest 免费层仅 24h 历史；自托管官方不提供直接支持；Trigger.dev「durable chat agent」措辞改为可证实表述。
