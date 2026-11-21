# 模型阵容、价格、上下文、缓存与多模态 API 时效核查（截至 2026-11-13）

> 核查日期（所有来源的访问日期）：**2026-11-13**。课程上次复核：2026-10-22（`research/R8`）。
> 范围：附录B B1、第01/02/05/10/12/13/15/17/21 章、README 中出现的模型名、价格、上下文、缓存倍数、免费层、多模态 API。课程文件未做任何修改。
> 口径：国际厂商 USD / 1M tokens（官方标准价，非 Batch）；国内厂商 CNY / 1M tokens（官方牌价）。折算人民币沿用课程口径 1 USD ≈ 7.2 CNY（估算，非核实项）。
> 可达性：`platform.openai.com` 直连 HTTP 403；OpenAI 数据改从官方文档站 `developers.openai.com` 直接读取（可读）。按 R8 做法经 `r.jina.ai` 转读被本环境以“绕过 bot 检测”为由拒绝，所以没有使用。`open.bigmodel.cn/pricing` 只返回 JS 外壳，改读官方文档站 `docs.bigmodel.cn` 的定价页。Kimi 定价页的价格表在抓取结果中为空，只能读到正文说明。`ai.google.dev/gemini-api/docs/*` 已 301 跳转到 `aistudio.google.com/docs/*`。
> 判定：✅ 仍正确 / ⚠️ 需更新（过时、不完整或不精确） / ❌ 错误。

**2026-10-22 之后发生的变化（重点标记）**
1. **Anthropic 于 2026-11-09 发布 Claude Fable 5.2（及限量版 Mythos 5.2）**，标价 $8/$40，低于 Fable 5.1 的 $10/$50；现役“最强”档由 Fable 5.1 换成 Fable 5.2。
2. **OpenAI 于 2026-10-26 发布 GPT-6.1 Terra**（`gpt-6.1-terra`，$1/$5），是新的中间档。另有 GPT-Image-2.6（11-04）、GPT-6-Cyber（11-05）、GPT-6 Rosalind（10-30，限审批组织）。
3. **Google 于 2026-10-28 发布 Gemini 4 Carbon**，官方模型页称其为“strongest reasoning model”，Argon 改称高效档。Carbon 与 Argon 同价，但按官方博客是分阶段开放。Gemini 文档站整体迁到 `aistudio.google.com/docs`。
4. **Kimi 于 2026-10-24 发布 K3.1 Pro**；官方定价页公告 **K2 系列 2026-10-31 起不再对新注册用户开放，计划 12 月底全部下线**，影响课程示例 `kimi-k2.6`。
5. DeepSeek Search/Fetch 按计划从 2026-11-01 起收费（¥5/千次成功请求）；o4-mini、gpt-image-1 已于 2026-10-23 按计划关停（属于课程已知日期的“兑现”）。
6. DeepSeek 主力价、GLM-4.7-Flash / GLM-4.6V-Flash 免费、Qwen 北京区价格：与 10-22 相比**没有变化**。

---

## OpenAI：现役 GPT 阵容、模型 ID、价格、缓存、上下文与关停日期

### Takeaway
课程的“GPT-6 家族（Astra/Sol/Luna）”在官方模型页和定价页上都核实为真实的现役阵容，价格与 1.05M/128K 上下文仍正确。需要更新三处：一是漏了 2026-10-26 新增的 **GPT-6.1 Terra（$1/$5）**；二是“GPT-5.2 已进入关停流程”找不到官方依据；三是“OpenAI 缓存输入约 10%”已不精确（实际为 5%–10%，且缓存写入另行计费）。

### Cited Findings
- 官方模型页的旗舰表：`gpt-6-astra` $10/$50、`gpt-6.1-sol` $2/$10、`gpt-6.1-terra` $1/$5、`gpt-6-luna` $0.10/$0.50，四者都是 1.05M 上下文 / 128K 最大输出 — [OpenAI Models](https://developers.openai.com/api/docs/models)
- 定价页标准价（≤272K 输入）：Astra 缓存输入 $1.00、30 分钟写入 $12.50、12 小时写入 $25.00；Sol 缓存 $0.10 / 写 $2.50 / $5.00；Terra 缓存 $0.05 / 写 $1.25 / $2.50；Luna 缓存 $0.01 / 写 $0.125 / $0.25 — [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)
- 长上下文（输入 >272K）整单涨价：Astra $20/$75、Sol $4/$15、Terra $2/$7.50、Luna $0.20/$0.75，即输入 2x、输出 1.5x — [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)
- Batch 与 Flex 为标准价 50%；Fast（原 Priority，2026-07-30 改名）约 2x；Ultrafast 约 6x，只有 Astra 和 6.1 Sol 提供 — [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)
- 定价页仍列出 `gpt-5.2`（$1.75 / 缓存 $0.175 / $14）、`gpt-5.1`、`gpt-5`、`gpt-5-mini`、`gpt-5-nano`、`gpt-5.4*`、`gpt-5.5*`、`gpt-5.6-sol/terra/luna`，以及较早的 `gpt-6-sol`（$2 / 缓存 $0.20 / $10）— [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)
- GPT-5.6 Sol 促销价写的是“runs until November 30, 2026”（R8 记录为“至少到 11-21”，口径已变）— [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)
- 更新日志：2026-10-26 “GPT-6.1 Terra released”；10-30 GPT-6 Rosalind；11-04 GPT-Image-2.6 Sunburst/Flare；11-05 GPT-6-Cyber；10-20 “12-hour prompt cache writes cost 2.5x the input token price” — [OpenAI Changelog](https://developers.openai.com/api/docs/changelog)
- 关停表：o4-mini 2026-10-23（2026-04-22 公告）；o3、gpt-5、gpt-5-mini、gpt-5-nano 2026-12-11（06-11 公告）；gpt-5.1 2027-04-01（10-01 公告，替代 `gpt-6-sol`）；gpt-4o（2024-08-06/11-20）与 gpt-4.1 2027-01-14；gpt-image-1 2026-10-23；Agent Builder 与 Evals 平台 2026-11-30。关停表里**只有 `gpt-5.2-chat-latest`（2026-08-10）和 `gpt-5.2-codex`（2026-07-23）**，没有 `gpt-5.2` 基础模型本身的条目 — [OpenAI Deprecations](https://developers.openai.com/api/docs/deprecations)
- 10-22 之后关停页新增的公告只有 GPT-5.5-Cyber（11-05）和 GPT Image 2（11-10），课程都没有引用 — [OpenAI Deprecations](https://developers.openai.com/api/docs/deprecations)
- `text-embedding-3-small` $0.02、`text-embedding-3-large` $0.13（每 1M tokens）— [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)

#### 逐条判定（OpenAI）

| # | 课程原文（文件:行） | 最新事实（2026-11-13） | 来源 | 判定 | 建议替换文本 |
|---|---|---|---|---|---|
| O1 | `附录/附录B-资源索引.md:13`：`https://platform.openai.com/docs/pricing` ｜ GPT-6 Astra $10/$50；GPT-6.1 Sol $2/$10；GPT-6 Luna $0.10/$0.50；1.05M 上下文 / 128K 输出（GPT-5.2 与 o 系已进入关停流程） | 三档价格与 1.05M/128K 都正确；**新增 GPT-6.1 Terra $1/$5（10-26）**；`gpt-5.2` 仍在定价页，关停页没有它的条目，“GPT-5.2 已进入关停流程”无依据；o4-mini 已关停，o3 将于 12-11 关停；文档实际由 developers.openai.com 提供 | [Models](https://developers.openai.com/api/docs/models)；[Pricing](https://developers.openai.com/api/docs/pricing)；[Deprecations](https://developers.openai.com/api/docs/deprecations)；[Changelog](https://developers.openai.com/api/docs/changelog) | ⚠️ | `\| OpenAI 文档+定价 \| https://developers.openai.com/api/docs/pricing \| GPT-6 Astra $10/$50；GPT-6.1 Sol $2/$10；GPT-6.1 Terra $1/$5（2026-10-26 新增）；GPT-6 Luna $0.10/$0.50；均 1.05M 上下文 / 128K 输出，单次输入 >272K 整单按长上下文价（输入 2x、输出 1.5x）；o4-mini 已于 2026-10-23 关停，o3 / gpt-5 / gpt-5-mini / gpt-5-nano 于 2026-12-11 关停〔R10〕 \|` |
| O2 | `01-地基篇/第02章-环境搭建与第一个AI程序.md:110`：`openai/gpt-6.1-sol` | `gpt-6.1-sol` 仍是现役，$2/$10 | [Models](https://developers.openai.com/api/docs/models) | ✅（OpenRouter slug 本轮未复核） | 无需改 |
| O3 | `01-地基篇/第02章-环境搭建与第一个AI程序.md:196`：o4-mini 于 2026-10-23 关停，o3 / GPT-5 系于 2026-12-11 关停 | 日期正确，o4-mini 已关停。但“GPT-5 系”范围过宽：gpt-5.1 是 2027-04-01 关停，gpt-5.2/5.4/5.5/5.6 不在关停表 | [Deprecations](https://developers.openai.com/api/docs/deprecations) | ⚠️ | `o4-mini 已于 2026-10-23 关停；o3、gpt-5、gpt-5-mini、gpt-5-nano 于 2026-12-11 关停，gpt-5.1 于 2027-04-01 关停——新代码请以 GPT-6 系（gpt-6.1-sol / gpt-6.1-terra / gpt-6-luna）为默认。` |
| O4 | `01-地基篇/第02章-环境搭建与第一个AI程序.md:326`：GPT-6.1 Sol / Claude Sonnet 5.5 ≈ ¥390 | 12×$2 + 3×$10 = $54 ≈ ¥389 | [Pricing](https://developers.openai.com/api/docs/pricing) | ✅ | 无需改（可选新增一行：`\| GPT-6.1 Terra \| ≈ ¥195（中档，按需） \|`，计算 12×$1 + 3×$5 = $27） |
| O5 | `03-Agent篇/第10章-Agent框架实战.md:149`：`"openai/gpt-6-luna"`；`05-工程化篇/第15章-评测体系.md:64`：`openai:gpt-6-luna` | `gpt-6-luna` 现役，$0.10/$0.50，是最便宜档 | [Models](https://developers.openai.com/api/docs/models) | ✅ | 无需改 |
| O6 | `05-工程化篇/第17章-可靠性与成本工程.md:156`：OpenAI 缓存输入约 **10%** 价 | GPT-6.1 Sol / Terra 为 5%（$0.10/$2、$0.05/$1），Astra / Luna 为 10%；另有缓存写入费：30 分钟 1.25x、12 小时 2.5x | [Pricing](https://developers.openai.com/api/docs/pricing)；[Changelog](https://developers.openai.com/api/docs/changelog) | ⚠️ | `OpenAI 缓存输入为输入价的 **5%-10%**（GPT-6.1 Sol / Terra 5%，GPT-6 Astra / Luna 10%），且 GPT-6 系缓存写入另计费（30 分钟 1.25x、12 小时 2.5x）` |
| O7 | `05-工程化篇/第17章-可靠性与成本工程.md:164`：Batch 普遍五折（OpenAI/Anthropic/GLM） | OpenAI Batch/Flex 50%；Anthropic 50%；GLM 五折（见下文） | [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)；[Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing)；[智谱定价](https://docs.bigmodel.cn/cn/guide/start/pricing) | ✅ | 可选补充：`（Gemini、Qwen Max/Plus 也是五折；Kimi K3 系 Batch 为标准价的 60%）` |
| O8 | `04-RAG篇/第12章-Embedding与向量数据库.md:69-70`：text-embedding-3-small $0.02/1M、large $0.13/1M | 正确 | [Pricing](https://developers.openai.com/api/docs/pricing) | ✅ | 无需改 |

### Inferences
- GPT-6 家族核实为真实存在：命名（Astra/Sol/Luna，以及新的 Terra）、模型 ID 与价格均出自 OpenAI 自己的文档站，不是二手转述。课程把它当作 GPT-5.x 的替代是成立的。
- 从定价和 Terra 的定位（“fast, efficient … visual reasoning and computer use”）看，Terra 填补了 Sol（$2/$10）与 Luna（$0.10/$0.50）之间的空档。课程如果要列 OpenAI 的三档“旗舰/中档/最便宜”，应写 Astra / Sol（或 Terra）/ Luna。
- “GPT-5.2 已进入关停流程”可能是把 `gpt-5.2-chat-latest` 与 `gpt-5.2-codex` 的关停误当成基础模型的关停。稳妥写法是“GPT-5.x 不再是现役旗舰”，不要说 GPT-5.2 已在关停流程。

### Gaps
- `platform.openai.com/docs/pricing`（课程 B1 链接）对本环境返回 403，无法确认它是否 301 到 developers.openai.com；建议改用已验证可读的 developers.openai.com 地址。
- R8 提到的“GPT-6 Sol/Luna 在 Chat Completions 下只有 `reasoning_effort: "none"` 才支持 function calling，tool calling 需 Responses API”本轮没有复核（影响第 10 章 Mastra + gpt-6-luna 带工具的示例）。
- OpenRouter 上 `openai/gpt-6.1-sol` slug 与 OpenRouter 费率（5.5% 手续费、支付宝）本轮没有复核。
- `max_completion_tokens` 与 `max_tokens` 弃用状态（第 02 章:196 前半句）本轮没有复核。

---

## Anthropic：Claude 模型家族、API ID、价格、缓存倍数与上下文

### Takeaway
Opus 5.5 / Sonnet 5.5 / Haiku 5.5 的 ID、价格、1M/128K、缓存 0.025x–0.1x 都仍正确。但 **2026-11-09 发布的 Claude Fable 5.2（`claude-fable-5-2`，$8/$40）已取代 Fable 5.1 成为现役最强档**，课程里出现“Fable 5.1”的 4 处都需要改。

### Cited Findings
- 官方“Latest models”表只列 4 个：Claude Fable 5.2（`claude-fable-5-2`，$8/$40）、Opus 5.5（`claude-opus-5-5`，$4/$20）、Sonnet 5.5（`claude-sonnet-5-5`，$2/$10）、Haiku 5.5（`claude-haiku-5-5`，“From $0.10 / input MTok, From $0.50 / output MTok”），都是 1M 上下文 / 128K 最大输出 — [Claude Models overview](https://platform.claude.com/docs/en/models/overview)
- 官方建议“start with Claude Opus 5.5 for most workloads”；Fable 5.2 用于高难推理与长程 Agent 任务 — [Claude Models overview](https://platform.claude.com/docs/en/models/overview)
- Fable 5.1（`claude-fable-5-1`，$10/$50）移入“All models”表，仍可用但不再列为 latest — [Claude Models overview](https://platform.claude.com/docs/en/models/overview)
- 退役承诺：Fable 5.2 “Not sooner than November 9, 2027”，Opus 5.5 “Not sooner than September 22, 2027” — [Claude Models overview](https://platform.claude.com/docs/en/models/overview)
- 发布日期：Fable 5.2 与 Mythos 5.2 于 2026-11-09 发布（媒体报道，二手来源，但与官方退役承诺日期吻合）— [9to5Mac](https://9to5mac.com/2026/11/09/anthropic-upgrades-claude-with-new-fable-5-2-model-details-here/)；[SD Times](https://sdtimes.com/ai/anthropic-introduces-claude-fable-5-2-mythos-5-2/)
- 定价表：Fable 5.2 输入 $8、5m 写 $10、1h 写 $16、命中 $0.20、输出 $40；Opus 5.5 $4 / $5 / $8 / $0.20 / $20；Sonnet 5.5 $2 / $2.50 / $4 / $0.10 / $10；Haiku 5.5（≤100K prompt）$0.10 / $0.125 / $0.20 / $0.01 / $0.50，（>100K）$0.50 / $0.625 / $1 / $0.05 / $2.50；Haiku 4.5 $1/$5 — [Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- 缓存倍数原文：Fable 5.2 / Mythos 5.2 / Fable 5.1 / Mythos 5.1 命中为基础输入价的 0.025x；Opus 5.5 / Sonnet 5.5 为 0.05x；“All other models use the standard 0.1x multiplier”。写入 5m = 1.25x，1h = 2x（$10/$8 = 1.25，$16/$8 = 2）— [Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Batch API 输入、输出都五折（如 Fable 5.2 $4/$20；Haiku 5.5 ≤100K $0.05/$0.25）— [Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Haiku 5.5 按单次请求的 prompt 长度计价，超过 100,000 tokens 整单按高价档（含缓存读写）；其余 Claude 4.6+ 模型 1M 上下文按标准价计 — [Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Fast mode：Fable 5.2 $16/$80 — [Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)

#### 逐条判定（Anthropic）

| # | 课程原文（文件:行） | 最新事实 | 来源 | 判定 | 建议替换文本 |
|---|---|---|---|---|---|
| A1 | `附录/附录B-资源索引.md:14`：Fable 5.1 $10/$50；Opus 5.5 $4/$20；Sonnet 5.5 $2/$10；Haiku 5.5 $0.10/$0.50 起；缓存读 0.025x-0.1x | 现役最强档是 **Fable 5.2 $8/$40**（11-09，10-22 之后的变化）；其余正确 | [Overview](https://platform.claude.com/docs/en/models/overview)；[Pricing](https://platform.claude.com/docs/en/about-claude/pricing) | ⚠️ | `\| Anthropic 模型与定价 \| https://platform.claude.com/docs/en/about-claude/pricing \| Fable 5.2 $8/$40（2026-11-09 发布，取代 Fable 5.1 的 $10/$50）；Opus 5.5 $4/$20；Sonnet 5.5 $2/$10；Haiku 5.5 $0.10/$0.50 起（单次 prompt >100K 整单 $0.50/$2.50）；均 1M 上下文 / 128K 输出；缓存读 0.025x-0.1x、写 1.25x（5 分钟）/ 2x（1 小时）；Batch 五折〔R10〕 \|` |
| A2 | `01-地基篇/第02章-环境搭建与第一个AI程序.md:327`：`\| GPT-6 Astra / Claude Fable 5.1 \| ≈ ¥1,940（顶级旗舰，只在演示用） \|` | Astra 仍为 12×$10 + 3×$50 = $270 ≈ ¥1,944；Fable 5.2 为 12×$8 + 3×$40 = $216 ≈ ¥1,555 | [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) | ⚠️ | `\| GPT-6 Astra / Claude Fable 5.2 \| ≈ ¥1,940 / ¥1,560（顶级旗舰，只在演示用） \|` |
| A3 | `02-核心技能篇/第05章-流式输出与对话应用.md:181`：`'anthropic/claude-sonnet-5.5'` | Sonnet 5.5 是现役模型（原生 API ID 是 `claude-sonnet-5-5`）；Vercel AI Gateway 的 slug 写法本轮没有复核 | [Overview](https://platform.claude.com/docs/en/models/overview) | ✅（模型）/ 未核（slug） | 无需改 |
| A4 | `05-工程化篇/第17章-可靠性与成本工程.md:133`：Fable 5.1 / GPT-6 Astra 约 90x | Fable 5.2 输出 $40 ≈ ¥288，是空闲输出 ¥4 的 **72x**；Astra 仍 90x | 同上 | ⚠️ | 见“相对成本”一节的替换文本 |
| A5 | `05-工程化篇/第17章-可靠性与成本工程.md:156`：Claude 缓存读 0.025x-0.1x（Fable 5.1 为 0.025x；Opus 5.5 / Sonnet 5.5 为 0.05x；Haiku 5.5 及更早为 0.1x） | 区间正确；Fable 5.2 也是 0.025x（$0.20）；Haiku 5.5 ≤100K 命中 $0.01 = 0.1x | [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) | ⚠️（小改） | `Claude 缓存读 **0.025x-0.1x**（Fable 5.2 / 5.1 为 0.025x；Opus 5.5 / Sonnet 5.5 为 0.05x；Haiku 5.5 及更早为 0.1x；写入 5 分钟 1.25x、1 小时 2x）` |
| A6 | `05-工程化篇/第17章-可靠性与成本工程.md:164`：Anthropic Batch 五折 | 正确 | [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) | ✅ | 无需改 |

### Inferences
- Fable 5.2 降价后，“顶级旗舰”价位里 Anthropic（$8/$40）已低于 OpenAI Astra（$10/$50），所以课程中“Fable / Astra 同为 90x”的并列不再成立。
- 课程主线不用 Claude 原生 API，所以这些变化只影响价格叙述与成本表，不影响代码。

### Gaps
- 没有读到 Anthropic 官方的 Fable 5.2 发布公告原文（发布日期来自媒体，与官方退役承诺日期互证）。
- claude-api 技能的缓存表与官方定价页一致（Fable 5.2 $8/$40、0.025x），但技能表头标注“cached: 2026-11-03”，早于 11-09 发布日，日期标注疑有出入，所以只以官方页面为准。

---

## Google：Gemini 阵容、价格、上下文与免费层

### Takeaway
课程 B1 的 Gemini 价格与日期（Argon $2/$10 → 12-01 起 $4/$20；3.8/3.6 Flash $0.75/$3.75 → 2027-01-01 起翻倍；Flash 有免费层）全部仍正确。但 **2026-10-28 发布的 Gemini 4 Carbon 已在官方模型页取代 Argon 成为“最强推理”档**，而且文档站域名已迁移。

### Cited Findings
- 定价页（`ai.google.dev/gemini-api/docs/pricing` 已 301 到 `aistudio.google.com/docs/pricing`）：`gemini-4-carbon` 与 `gemini-4-argon` 都是 $2.00 → $4.00 输入、$10.00 → $20.00 输出（12-01 起）、缓存 $0.10 → $0.20，无免费层，Batch $1/$5 → $2/$10；Carbon 标注“Implicit caching only” — [Gemini Pricing](https://aistudio.google.com/docs/pricing)
- `gemini-3.8-flash` / `gemini-3.6-flash`：$0.75 → $1.50 / $3.75 → $7.50（至 2026-12-31，2027-01-01 起），缓存 $0.075 → $0.15 外加存储费，**有免费层**；`gemini-3.5-flash-lite` $0.30/$2.50；`gemini-3.1-flash-lite` $0.25/$1.50；`gemini-2.5-flash-lite` $0.10/$0.40，都有免费层 — [Gemini Pricing](https://aistudio.google.com/docs/pricing)
- `gemini-2.5-flash` 与 `gemini-2.5-pro` 已弃用，2026-12-01 起分别路由到 `gemini-3.5-flash-lite` 和 `gemini-3.8-flash` — [Gemini Pricing](https://aistudio.google.com/docs/pricing)；[Gemini Models](https://aistudio.google.com/docs/models)
- 模型页：`gemini-4-carbon` 被称为“our strongest reasoning model”，`gemini-4-argon` 是更快、更省 token 的高效档；两者都是 1M 上下文，最大输出标注为“65K / 1M”；`gemini-3.8-flash` 标“New”，`gemini-3.6-flash` 标“Stable”（上一代 Flash）— [Gemini Models](https://aistudio.google.com/docs/models)
- 官方博客（2026-10-28）：Carbon “Building on Gemini 4 Argon, which was launched two weeks ago”；先向部分 cyber defenders 开放，再经 Fairwind Program 扩大，之后才面向开发者；引入价 $2/$10，之后 $4/$20，缓存输入 95% off — [Google Blog: Gemini 4 Carbon](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/)
- OpenAI 兼容层 base URL 仍是 `https://generativelanguage.googleapis.com/v1beta/openai/`，示例模型为 `gemini-3.8-flash`，支持图像理解与 function calling — [Gemini OpenAI compatibility](https://aistudio.google.com/docs/openai)

#### 逐条判定（Google）

| # | 课程原文（文件:行） | 最新事实 | 来源 | 判定 | 建议替换文本 |
|---|---|---|---|---|---|
| G1 | `附录/附录B-资源索引.md:15`：`https://ai.google.dev/gemini-api/docs/pricing` ｜ Gemini 4 Argon $2/$10（2026-11-30 前，12-01 起 $4/$20，无免费层）；3.8/3.6 Flash $0.75/$3.75（2026-12-31 前，之后翻倍，有限速免费层） | 价格与日期都正确；缺 **Gemini 4 Carbon**（10-28，现为“最强推理”档、同价）；链接已 301 | [Pricing](https://aistudio.google.com/docs/pricing)；[Models](https://aistudio.google.com/docs/models)；[Blog](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/) | ⚠️ | `\| Gemini 定价 \| https://aistudio.google.com/docs/pricing（原 ai.google.dev 地址已 301 跳转） \| Gemini 4 Carbon（2026-10-28 发布，最强推理，分阶段开放）与 Gemini 4 Argon（高效档）同价：$2/$10（至 2026-11-30；12-01 起 $4/$20），均无免费层、仅隐式缓存；3.8/3.6 Flash $0.75/$3.75（至 2026-12-31；2027-01-01 起 $1.50/$7.50），有限速免费层〔R10〕 \|` |
| G2 | `01-地基篇/第02章-环境搭建与第一个AI程序.md:88`：Google Gemini Flash 系免费层｜限速免费 | 3.8/3.6 Flash、3.5/3.1/2.5 Flash-Lite 都有免费层 | [Pricing](https://aistudio.google.com/docs/pricing) | ✅ | 无需改 |
| G3 | `01-地基篇/第02章-环境搭建与第一个AI程序.md:109`：`https://generativelanguage.googleapis.com/v1beta/openai/` | 不变 | [OpenAI compatibility](https://aistudio.google.com/docs/openai) | ✅ | 无需改 |
| G4 | `06-进阶篇/第21章-多模态与选修专题.md:28`：Gemini Flash 免费层可做视觉 | 兼容层支持图像理解；Flash 有免费层 | 同上 | ✅ | 无需改 |

### Inferences
- 官方模型/定价页已把 `gemini-4-carbon` 列为可计价模型，但官方博客说开发者尚未普遍可用，两处存在张力。所以课程不宜把 Carbon 写成“人人可调”的默认模型，只需在 B1 标注“分阶段开放”。
- 12-01 之后 Argon/Carbon 输出变为 $20，对 DeepSeek 空闲输出 ¥4 的倍数从 18x 变成 36x。课程如果引用 Gemini 旗舰倍数，应带上日期。

### Gaps
- 定价页截断在约 100K 字符处，Imagen 等后段没有读到；模型页没有给出 3.x Flash 的上下文数字（R8 记录为 1,048,576，本轮没有重新读到）。
- 没有确认 Carbon 在 Gemini API 上对普通开发者的实际开放状态（只读到页面列价与博客表述）。

---

## 国内厂商：DeepSeek / 通义千问 / 智谱 GLM / Kimi / 豆包 / 硅基流动

### Takeaway
课程主线依赖的事实**全部仍成立**：DeepSeek flash 分时价 ¥1/¥2 入、¥4/¥8 出、命中 ¥0.02/¥0.04；GLM-4.7-Flash 与 GLM-4.6V-Flash 免费；Qwen 北京区价格不变；硅基 bge-m3 / bge-reranker-v2-m3 免费。**唯一硬变化是 Kimi**：K3.1 Pro 于 10-24 发布，K2 系列（含课程示例 `kimi-k2.6`）10-31 起不再对新注册用户开放，计划 12 月底下线。

### Cited Findings
- DeepSeek（元/百万 tokens）：`deepseek-flash` = DeepSeek-V4.1-Flash-1017，1M 上下文，384K 最大输出，支持图像理解；空闲/高峰输入未命中 1/2、命中 0.02/0.04、输出 4/8。`deepseek-v4-pro` = DeepSeek-V4-Pro-0813，不支持图像理解；4.5/9、0.15/0.30、13.5/27。高峰为北京时间周一至周五（不含法定节假日）9:00-12:00、14:00-18:00，其余为空闲（半价）。Search/Fetch 各 ¥5/千次成功请求 — [DeepSeek 模型 & 价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)
- DeepSeek 页面已不再提及 `deepseek-chat` / `deepseek-reasoner`；改为说明旧名 `deepseek-v4-flash`、`deepseek-v4-flash-vision-exp` 仍可调用，但由 V4.1-Flash-1017 提供服务并按 Flash 计价 — [DeepSeek 模型 & 价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)
- 智谱（官方文档站定价页）：GLM-4.7-Flash 200K，输入、输出、缓存命中都免费；GLM-4.6V-Flash 都免费；GLM-5.3 1M ¥8/¥28/命中 ¥2；GLM-5.3-Flash 1M ¥0.8/¥2.8/命中 ¥0.23；GLM-5.3-FlashX ¥2/¥7；免费模型还有 GLM-4-Flash-250414、GLM-Z1-Flash、GLM-4V-Flash、GLM-4.1V-Thinking-Flash，以及 CogView-3-Flash、CogVideoX-Flash；Batch “标准调用价格的 5 折”；缓存存储“限时免费” — [智谱 API 定价](https://docs.bigmodel.cn/cn/guide/start/pricing)
- GLM-4.7-Flash 于 2026-01-19 发布并开源，替代 GLM-4.5-Flash 免费提供 — [GLM-4.7-Flash 开放文档](https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash)；[智谱新闻](https://www.zhipuai.cn/zh/news/148)
- 通义千问（北京地域，元/百万 Token）：qwen3.8-max ¥12/¥36（0-1M）；qwen3.7-plus ≤256K 原价 ¥2/¥8、256K-1M 原价 ¥6/¥24（都标“限时8折”，没有截止日）；qwen3.8-flash ¥0.8/¥2.7；新用户每模型 100 万 Token 免费额度，**仅北京地域**，90 天；显式缓存创建 125%、命中 10%；Max/Plus 支持 Batch 半价；没有 qwen3.9 / qwen4 — [百炼模型价格](https://help.aliyun.com/zh/model-studio/model-pricing)
- Kimi 官方定价页正文：K3 系列（`kimi-k3.1-pro`、`kimi-k3`）1,048,576 上下文；K2 系列 262,144；K3 缓存写入按 TTL（5min/1h）计费；kimi-k3.1-pro 与 kimi-k3 的 Batch 为标准价 60%；公告原文“K2 系列模型将于 2026 年 10 月 31 日起停止向新注册用户开放，已注册用户不受影响；我们计划在 12 月底下线所有 K2 系列模型” — [Kimi 模型推理价格](https://platform.kimi.com/docs/pricing/chat)
- Kimi K3.1 Pro（页面“更新于 2026-10-24”）：模型名 `kimi-k3.1-pro` / `kimi-k3.1-pro-highspeed`，支持 100 万上下文；输入命中 ¥1.3、未命中 ¥13，输出 ¥68；Highspeed 价格 2 倍 — [Kimi K3.1 Pro 官方博客](https://www.kimi.com/news/kimi-k3-1-pro)
- 硅基流动：`BAAI/bge-m3` 输入免费，`BAAI/bge-reranker-v2-m3` 免费（`Pro/BAAI/bge-m3` 为 ¥0.07/M，不免费）；另有免费的 `FunAudioLLM/SenseVoiceSmall`（ASR）和 `Kwai-Kolors/Kolors`（生图）；页面上的 DeepSeek/Qwen/GLM 主力对话模型都不免费 — [SiliconFlow 价格](https://siliconflow.cn/pricing)

#### 逐条判定（国内）

| # | 课程原文（文件:行） | 最新事实 | 来源 | 判定 | 建议替换文本 |
|---|---|---|---|---|---|
| C1 | `附录/附录B-资源索引.md:16`；`01-地基篇/第02章…:86`；`05-工程化篇/第17章…:133,145,156`：deepseek-flash 分时价 ¥1/¥2、¥4/¥8，命中 ¥0.02/¥0.04；支持图像理解；空闲=工作日 9-12/14-18 点以外 | 全部一致 | [DeepSeek 价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing) | ✅ | 可选，在附录B:16 末尾补：`；Search/Fetch 自 2026-11-01 起 ¥5/千次成功请求` |
| C2 | `附录/附录B-资源索引.md:16`：旧名 deepseek-chat 已弃用；`01-地基篇/第02章…:345` | 官方页面已不提 deepseek-chat（R2 记录 2026-07-24 弃用），没有与课程矛盾的信息 | 同上 | ✅（以 R2 为据） | 无需改 |
| C3 | `05-工程化篇/第17章…:62-64,144-147`；`03-Agent篇/第11章…:119-129`：`deepseek-v4-pro` / `deepseek-flash` / `glm-4.7-flash` | 三个模型都在售 | [DeepSeek](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)；[智谱](https://docs.bigmodel.cn/cn/guide/start/pricing) | ✅ | 无需改 |
| C4 | `附录/附录B-资源索引.md:17`；`01-地基篇/第02章…:12,85,107,324`：GLM-4.7-Flash 完全免费（200K） | 一致 | [智谱定价](https://docs.bigmodel.cn/cn/guide/start/pricing) | ✅ | 可选把附录链接改为可直接读取的 `https://docs.bigmodel.cn/cn/guide/start/pricing` |
| C5 | `06-进阶篇/第21章…:28`：`glm-4.6v-flash` 免费 | 一致 | 同上 | ✅ | 无需改 |
| C6 | `01-地基篇/第02章-环境搭建与第一个AI程序.md:108`：`https://api.moonshot.cn/v1`（模型名如 `kimi-k2.6`） | K2 系列 2026-10-31 起不对新注册用户开放，计划 12 月底下线；现役 K3 系列为 `kimi-k3.1-pro`（10-24）/ `kimi-k3` | [Kimi 定价页](https://platform.kimi.com/docs/pricing/chat)；[K3.1 Pro](https://www.kimi.com/news/kimi-k3-1-pro) | ⚠️（10-22 之后才可见的变化） | `\| Kimi \| \`https://api.moonshot.cn/v1\`（模型名如 \`kimi-k3.1-pro\`；K2 系列含 kimi-k2.6 自 2026-10-31 起不再对新注册用户开放，计划 2026 年 12 月底下线） \|` |
| C7 | `附录/附录B-资源索引.md:18`：Kimi 文档 `platform.kimi.com/docs/api/chat`；API 域名仍是 api.moonshot.cn | 本轮没有读到 base URL | — | 未核 | 可选在备注末尾补：`；现役 K3.1 Pro ¥13（命中 ¥1.3）/ ¥68，K2 系列 12 月底下线` |
| C8 | `附录/附录B-资源索引.md:19`：qwen3.8 系列；新用户免费额度 | 正确；免费额度为每模型 100 万 Token，仅北京地域，90 天 | [百炼价格](https://help.aliyun.com/zh/model-studio/model-pricing) | ✅（可更精确） | `\| 阿里百炼 \| https://help.aliyun.com/zh/model-studio/ \| qwen3.8-max ¥12/¥36、qwen3.7-plus ≤256K ¥2/¥8（限时 8 折）、qwen3.8-flash ¥0.8/¥2.7（北京地域）；新用户每模型 100 万 tokens 免费额度（仅北京地域，90 天）〔R10〕 \|` |
| C9 | `README.md:144`：全程 API 花费 ¥50-150（DeepSeek/Qwen 等低价或免费额度） | 底层价格不变，结论仍合理 | 同上 | ✅ | 无需改 |
| C10 | `附录/附录B-资源索引.md:21,47`；`04-RAG篇/第12章…:68`；`04-RAG篇/第13章…:181`：bge-m3、bge-reranker-v2-m3 免费 | 一致（注意不要用 `Pro/BAAI/bge-m3`，那个是 ¥0.07/M） | [SiliconFlow](https://siliconflow.cn/pricing) | ✅ | 可选补一句：`（注意选 BAAI/bge-m3，不要选收费的 Pro/BAAI/bge-m3）` |

### Inferences
- `kimi-k2.6` 当前对老用户仍可用，但 10-31 之后注册的新学员按公告无法调用。第 02 章作为“新手第一次配置”章节，示例模型必须换。K3.1 Pro 比 k2.6 贵约 2–2.5 倍（¥13/¥68 vs R8 记录的 ¥6.5/¥27），只适合当“可选厂商”。
- R2 记录 GLM-5.3-Flash“限时五折 ¥0.4/¥1.4”，但智谱文档站定价页只给出 ¥0.8/¥2.8，没有折扣说明。五折可能已结束或只在 open.bigmodel.cn 的 FAQ 展示，无法判定。课程正文没有引用 GLM-5.3-Flash，只影响 `research/R2`。
- R2 写百炼免费额度“限国际站新加坡区”，与当前中文定价页“北京地域有免费额度、其他地域没有”相反，应以当前页为准修正 R2。

### Gaps
- **豆包 / 火山方舟**：课程全文没有引用豆包（grep 无命中），所以无需修改。本轮没有读到火山方舟官方价目页；搜索只看到媒体报道（豆包 2.1 Pro 约 ¥6/¥30），无法归到具体官方 URL，不作为事实采用。
- Kimi 定价页的价格表在抓取结果中为空：`kimi-k3`（R8：¥20/¥100）与 K2 各型号的现价没能直接核实；K3.1 Pro 价格来自 Kimi 官方博客。
- `api.moonshot.cn/v1` 与百炼兼容 base URL 本轮没有复核。
- 百炼 `text-embedding-v4` ¥0.5/1M（第12章:71）、Voyage `voyage-4-lite` $0.02/1M（第12章:72）、Voyage rerank $0.05/1M（第13章:194、附录B:49）本轮没有复核。

---

## 相对成本：课程中“旗舰贵 18-90 倍”等倍数重算

### Takeaway
“18-90 倍”这个**区间仍然成立**（下限 Sonnet 5.5 / GPT-6.1 Sol 18x，上限 GPT-6 Astra 90x），但区间内的示例要改：Fable 5.2 是 72x，不再与 Astra 同为 90x。新增的 GPT-6.1 Terra 约 9x，Kimi K3.1 Pro 约 17x。

### Cited Findings
- 基准：DeepSeek flash 空闲输出 ¥4、高峰输出 ¥8 — [DeepSeek 价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)
- 输出单价：Sonnet 5.5 $10、Opus 5.5 $20、Fable 5.2 $40、Fable 5.1 $50 — [Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)；GPT-6.1 Sol $10、GPT-6.1 Terra $5、GPT-6 Astra $50、GPT-6 Luna $0.50 — [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)；Gemini 4 Argon/Carbon $10（12-01 起 $20）— [Gemini Pricing](https://aistudio.google.com/docs/pricing)；Kimi K3.1 Pro ¥68 — [Kimi K3.1 Pro](https://www.kimi.com/news/kimi-k3-1-pro)
- 课程测算假设（每月 12M 入 + 3M 出）见 `01-地基篇/第02章-环境搭建与第一个AI程序.md:318-327` 与 `research/R2-模型与价格.md:80-81`

#### 重算表（输出价倍数，基准 = DeepSeek flash 空闲输出 ¥4；1 USD ≈ 7.2 CNY）

| 模型 | 输出价 | 折合 ¥ | 倍数（对空闲 ¥4） | 倍数（对高峰 ¥8） | 月成本（12M 入 + 3M 出） |
|---|---|---|---|---|---|
| GPT-6 Luna | $0.50 | ¥3.6 | 0.9x | 0.45x | $2.7 ≈ ¥19 |
| GPT-6.1 Terra（新） | $5 | ¥36 | 9x | 4.5x | $27 ≈ ¥194 |
| GPT-6.1 Sol / Claude Sonnet 5.5 | $10 | ¥72 | **18x** | 9x | $54 ≈ ¥389 |
| Gemini 4 Argon / Carbon（至 11-30） | $10 | ¥72 | 18x | 9x | $54 ≈ ¥389 |
| Kimi K3.1 Pro | ¥68 | ¥68 | 17x | 8.5x | ¥360 |
| Claude Opus 5.5 | $20 | ¥144 | **36x** | 18x | $108 ≈ ¥778 |
| Gemini 4 Argon / Carbon（12-01 起） | $20 | ¥144 | 36x | 18x | $108 ≈ ¥778 |
| Claude Fable 5.2（新，现役） | $40 | ¥288 | **72x** | 36x | $216 ≈ ¥1,555 |
| GPT-6 Astra | $50 | ¥360 | **90x** | 45x | $270 ≈ ¥1,944 |
| （Claude Fable 5.1，已非现役最强） | $50 | ¥360 | 90x | 45x | $270 ≈ ¥1,944 |
| DeepSeek flash（对照） | ¥4 / ¥8 | — | 1x | — | 空闲 ¥24，高峰 ¥48；全部命中缓存且空闲约 ¥12 |

#### 逐条判定（相对成本与通用数字）

| # | 课程原文（文件:行） | 重算结果 | 判定 | 建议替换文本 |
|---|---|---|---|---|
| R1 | `05-工程化篇/第17章-可靠性与成本工程.md:133`：旗舰模型贵约 18-90 倍：Sonnet 5.5 / GPT-6.1 Sol 约 18x，Opus 5.5 约 36x，Fable 5.1 / GPT-6 Astra 约 90x | 区间对；Fable 5.2 为 72x | ⚠️ | `旗舰模型贵约 18-90 倍（按输出价对比 DeepSeek flash 空闲 ¥4；对高峰价则减半）：Sonnet 5.5 / GPT-6.1 Sol 约 18x，Opus 5.5 约 36x，Fable 5.2 约 72x，GPT-6 Astra 约 90x。` |
| R2 | `01-地基篇/第01章-大模型工作原理.md:191`：若换用某旗舰模型（贵约 18-90 倍，见第 17 章） | 区间仍成立 | ✅ | 无需改 |
| R3 | `01-地基篇/第02章-环境搭建与第一个AI程序.md:325`：DeepSeek flash ≈ ¥12-48 | 空闲 ¥24 / 高峰 ¥48；全部命中缓存且空闲约 ¥12.2 | ✅ | 无需改 |
| R4 | `01-地基篇/第02章-环境搭建与第一个AI程序.md:326-327` | 见 O4 / A2 | ⚠️（仅 327 行） | 见 A2 |
| R5 | `01-地基篇/第01章-大模型工作原理.md:56`：输出通常贵 3-5 倍 | Claude / GPT-6 / Gemini 4 均 5x；Kimi K3.1 Pro 5.2x；DeepSeek flash 4x、v4-pro 3x；GLM-5.3 3.5x；qwen3.8-max 3x、qwen3.8-flash 3.4x | ✅ | 无需改 |
| R6 | `01-地基篇/第01章-大模型工作原理.md:81`：2026 年主流模型窗口从 128K 到数百万 token 不等 | 本轮核到的现役主流模型上限都约为 1M：Claude 1M、GPT-6 1.05M、Gemini 4 1M、DeepSeek 1M、GLM-5.3 1M、Kimi K3 1,048,576、Qwen 1M；小窗口端有 GLM-4.7-Flash 200K、Kimi K2 262K、Claude Haiku 4.5 200K。没有核到“数百万”的现役主流 API 模型 | ⚠️ | `2026 年主流模型窗口从 128K-200K 到约 1M（1,048,576）token 不等` |
| R7 | `01-地基篇/第01章-大模型工作原理.md:70`：输入 ¥2 / 输出 ¥8 的算例 | 与 DeepSeek flash 高峰价一致，属于示意 | ✅ | 无需改 |

### Inferences
- 课程把倍数基准定为“空闲输出价”，没有在第 17 章写明口径。如果读者拿高峰价（¥8）去比，倍数会减半。建议替换文本里写明口径。
- 课程想要一个“中间档”对照时，GPT-6.1 Terra（9x）比 Sol 更合适。

### Gaps
- 倍数只按输出单价计算；含输入的“混合成本倍数”会因输入/输出比例不同而变化，课程原文也只按输出口径，所以本表沿用。

---

## 多模态（第 21 章）：视觉、ASR/TTS/实时语音、图像生成与 Ollama 本地模型

### Takeaway
视觉部分（`glm-4.6v-flash` 免费、`deepseek-flash` 支持图像、Gemini 兼容层）**仍正确**。语音部分的“OpenAI Whisper API（稳定）”**已过时**：`whisper-1` 于 2026-08-26 宣布弃用（2027-02-26 关停），推荐 `gpt-transcribe`；OpenAI 的 TTS 模型也在 2026-10-01 宣布弃用（2027-01-06 关停），迁移目标只走 Realtime API。这两项公告都早于 10-22，属于上轮漏核。Ollama 写法仍可用，但 `qwen3` 已是一年前的模型。

### Cited Findings
- 转写：推荐 `gpt-transcribe` 走 `/v1/audio/transcriptions`（“the recommended model for transcribing recorded speech”）；`whisper-1`、`gpt-4o-transcribe`、`gpt-4o-mini-transcribe`、`gpt-4o-transcribe-diarize`、`/v1/audio/translations` 已弃用，2027-02-26 关停；实时音频推荐 `gpt-live-transcribe`；翻译迁移到 `/v1/realtime/translations` + `gpt-realtime-translate` — [OpenAI Speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)
- 弃用公告日期：whisper-1 与 gpt-4o-transcribe 公告于 2026-08-26；tts-1、tts-1-hd、gpt-4o-mini-tts 公告于 2026-10-01，2027-01-06 关停，替代为 `gpt-realtime-2.1-mini` — [OpenAI Deprecations](https://developers.openai.com/api/docs/deprecations)
- TTS 指南：“Migrate to `gpt-realtime-2.1-mini` using the Realtime API”，且该模型“isn't a supported model for `/v1/audio/speech`”；`/v1/audio/speech` 端点本身没有标注弃用，现有集成可用到关停 — [OpenAI Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech)
- 价格：`gpt-transcribe` $0.0045/分钟；`gpt-live-1` $0.05/分钟；`gpt-realtime-2.1-mini` 音频 $10 入 / $20 出（每 1M tokens）— [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)
- 实时/音频模型清单：`gpt-live-1`、`gpt-realtime-2.1`、`gpt-realtime-2.1-mini`、`gpt-realtime-2`、`gpt-realtime-translate`；转写 `gpt-transcribe`、`gpt-live-transcribe`、`gpt-realtime-whisper` — [OpenAI Models](https://developers.openai.com/api/docs/models)
- Gemini 语音：`gemini-3.5-transcribe`（$0.003/分钟音频）、`gemini-3.5-transcribe-live`、`gemini-3.8-flash-tts`（有免费层）、`gemini-3.8-live`（Live 音频对音频，有免费层）— [Gemini Pricing](https://aistudio.google.com/docs/pricing)
- 国内免费 ASR：硅基流动 `FunAudioLLM/SenseVoiceSmall` 免费 — [SiliconFlow 价格](https://siliconflow.cn/pricing)
- 图像生成（OpenAI）：Image API `/v1/images/generations` 直接传 `model`；GPT-Image-2.6 有 Sunburst（精细）与 Flare（快速）；示例读取 `data[0].b64_json`，只返回 base64 — [OpenAI Image generation](https://developers.openai.com/api/docs/guides/image-generation)；`gpt-image-1` 已于 2026-10-23 关停，DALL·E 已于 2026-05-12 关停 — [OpenAI Deprecations](https://developers.openai.com/api/docs/deprecations)；GPT-Image-2.6 于 2026-11-04 发布 — [OpenAI Changelog](https://developers.openai.com/api/docs/changelog)
- 图像计费：OpenAI gpt-image-2.6 图像输出 $30/1M tokens — [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)；Gemini 图像模型官方折合约 $0.0336–$0.24/张 — [Gemini Pricing](https://aistudio.google.com/docs/pricing)；国内有免费的智谱 CogView-3-Flash — [智谱定价](https://docs.bigmodel.cn/cn/guide/start/pricing) 与硅基 Kolors — [SiliconFlow](https://siliconflow.cn/pricing)
- Ollama：OpenAI 兼容 base URL 仍是 `http://localhost:11434/v1/`；支持 `/v1/chat/completions`（含 tools、vision）、`/v1/responses`（仅无状态）、`/v1/embeddings`、`/v1/audio/speech|transcriptions|translations`；文档示例模型 `gpt-oss:20b`、`qwen3:8b`、`qwen3-vl:8b`、云端 `gemma4:31b` — [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)
- Ollama 模型库：`qwen3`（0.6b–235b）仍在，但“1 year ago”更新；更新的有 `qwen3.5`（0.8b/2b/4b/9b/27b/35b/122b，约 4 周前）、`qwen3.6`（27b/35b）、`qwen3.8`（27b）、`gemma4`（e2b/e4b/12b/26b/31b）、`gpt-oss`（20b/120b）、`deepseek-v4.1-flash`、`glm-4.7-flash` — [Ollama Library](https://ollama.com/library)

#### 逐条判定（多模态）

| # | 课程原文（文件:行） | 最新事实 | 来源 | 判定 | 建议替换文本 |
|---|---|---|---|---|---|
| M1 | `06-进阶篇/第21章-多模态与选修专题.md:28-29`：`glm-4.6v-flash` 免费；Gemini Flash 免费层；已支持图像理解的 deepseek-flash | 都正确（注意 `deepseek-v4-pro` 不支持图像） | [智谱](https://docs.bigmodel.cn/cn/guide/start/pricing)；[DeepSeek](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)；[Gemini](https://aistudio.google.com/docs/openai) | ✅ | 无需改（“2026-10 核实”可改为“2026-11 核实”） |
| M2 | `06-进阶篇/第21章-多模态与选修专题.md:50`：**ASR**：OpenAI Whisper API（transcriptions 端点，稳定）或国内厂商语音接口；文件上传式，实现简单 | `whisper-1` 已弃用（08-26 公告，2027-02-26 关停）；推荐 `gpt-transcribe`；实时用 `gpt-live-transcribe` | [STT 指南](https://developers.openai.com/api/docs/guides/speech-to-text)；[Deprecations](https://developers.openai.com/api/docs/deprecations) | ⚠️（“稳定”已不成立） | `- **ASR**：OpenAI \`gpt-transcribe\`（\`/v1/audio/transcriptions\`，文件上传式；\`whisper-1\` / \`gpt-4o-transcribe\` 已弃用，2027-02-26 关停），实时流式转写用 \`gpt-live-transcribe\`（Realtime API）；或国内/其他厂商语音接口（如硅基流动免费的 \`FunAudioLLM/SenseVoiceSmall\`、Gemini \`gemini-3.5-transcribe\`）；文件上传式实现最简单` |
| M3 | `06-进阶篇/第21章-多模态与选修专题.md:51`：**TTS**：各厂商 text-to-speech 端点，注意流式 TTS | OpenAI 的 `tts-1` / `tts-1-hd` / `gpt-4o-mini-tts` 已弃用（10-01 公告，2027-01-06 关停），迁移目标 `gpt-realtime-2.1-mini` 只走 Realtime API，不支持 `/v1/audio/speech`；Gemini 仍有独立 TTS（`gemini-3.8-flash-tts`，有免费层）；Ollama 也提供 `/v1/audio/speech` | [TTS 指南](https://developers.openai.com/api/docs/guides/text-to-speech)；[Gemini Pricing](https://aistudio.google.com/docs/pricing)；[Ollama](https://docs.ollama.com/api/openai-compatibility) | ⚠️ | `- **TTS**：各厂商 text-to-speech 端点（注意 OpenAI 的 \`tts-1\` / \`gpt-4o-mini-tts\` 已弃用、2027-01-06 关停，官方迁移目标 \`gpt-realtime-2.1-mini\` 只走 Realtime API；Gemini \`gemini-3.8-flash-tts\` 等仍是独立 TTS），注意**流式 TTS**（分段合成边放）才是对话级延迟` |
| M4 | `06-进阶篇/第21章-多模态与选修专题.md:56`：各家 images/generations 端点……返回图片 URL/base64……按图计费，比文本贵一个量级 | OpenAI 现役为 `gpt-image-2.6-sunburst` / `-flare`（11-04），走 `/v1/images/generations`，**只返回 base64**；OpenAI 按图像 token 计费（输出 $30/1M），Gemini 折合约 $0.034–0.24/张；“贵一个量级”仍成立 | [Image 指南](https://developers.openai.com/api/docs/guides/image-generation)；[OpenAI Pricing](https://developers.openai.com/api/docs/pricing)；[Gemini Pricing](https://aistudio.google.com/docs/pricing) | ⚠️（小改） | `文生图/图生图（各家 images/generations 端点；OpenAI 现役 \`gpt-image-2.6-sunburst\` / \`-flare\` 只返回 base64，其他厂商多为 URL 或 base64）是纯集成：\`prompt → 返回图片 URL/base64\`。工程考虑：内容安全过滤的报错处理、生成结果缓存、成本（按图或按图像 token 计费，折合每张约几美分到二十几美分，比文本贵一个量级；智谱 CogView-3-Flash、硅基 Kolors 有免费档可练手）。` |
| M5 | `06-进阶篇/第21章-多模态与选修专题.md:60`：`ollama run qwen3`，OpenAI 兼容 API `http://localhost:11434/v1` | 命令仍可用，base URL 正确；但 qwen3 已一年没有更新，有更新的 qwen3.5（含 0.8b–9b 小尺寸）与 gemma4 | [Ollama Library](https://ollama.com/library)；[Ollama OpenAI compat](https://docs.ollama.com/api/openai-compatibility) | ✅（可选更新） | `Ollama（本地跑开源模型：\`ollama run qwen3.5:4b\`——笔记本也跑得动；同档可选 \`gemma4:e4b\`，OpenAI 兼容 API \`http://localhost:11434/v1\`）` |
| M6 | `06-进阶篇/第21章-多模态与选修专题.md:114`：OpenAI Vision 指南 `https://platform.openai.com/docs/guides/images-vision` | 本环境对 platform.openai.com 返回 403，无法核实 | — | 未核 | 建议改用 developers.openai.com 下的对应页（本轮没有确认具体路径） |

### Inferences
- 第 21 章的语音段落只是“API 集成级”介绍，不涉及代码。把 Whisper 换成 `gpt-transcribe` 是一处名称和状态修正，不需要改架构。
- OpenAI 的 TTS 路线从“独立 Speech API”转向“Realtime 会话”。如果课程想保留“TTS 端点”这个教学点，用 Gemini TTS 或国内厂商 TTS 举例会更稳。

### Gaps
- 国内厂商（阿里百炼 CosyVoice / Paraformer、火山豆包语音、智谱 GLM-ASR/TTS）的语音模型名与价格本轮没有核，课程原文也只写“国内厂商语音接口”，没有点名。
- OpenAI 图像指南截断在约 100K 字符处，没看到是否有 GPT Image 2 弃用细节（关停页显示 11-10 有“GPT Image 2”公告，课程没有引用）。

---

## 附：对研究底稿与 CHANGELOG 的影响（供改稿时同步）

### Takeaway
`research/R8` 的价格总表需要增补 4 处 10-22 之后的变化，`research/R2` 还有 1 处免费额度地域写反。这些都是底稿，不是正文，但后续章节会引用它们。

### Cited Findings
- R8 2.1 节需补：Claude Fable 5.2 $8/$40、命中 $0.20、写 $10/$16 — [Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)；GPT-6.1 Terra $1/$5、缓存 $0.05、写 $1.25/$2.50，以及 GPT-6 系 >272K 长上下文价 — [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)；Gemini 4 Carbon 同 Argon 价 — [Gemini Pricing](https://aistudio.google.com/docs/pricing)
- R8 2.1 节 GPT-5.6 Sol 促销截止应改为“until November 30, 2026” — [OpenAI Pricing](https://developers.openai.com/api/docs/pricing)
- R8 2.2 节需补：kimi-k3.1-pro ¥13（命中 ¥1.3）/ ¥68，1M；K2 系列 10-31 起停止新用户、12 月底下线 — [Kimi K3.1 Pro](https://www.kimi.com/news/kimi-k3-1-pro)；[Kimi 定价页](https://platform.kimi.com/docs/pricing/chat)
- R2 第 54/74 行“新用户免费额度限国际站新加坡区”与当前中文定价页“北京地域有免费额度、其他地域没有”相反 — [百炼价格](https://help.aliyun.com/zh/model-studio/model-pricing)

### Inferences
- 建议新底稿编号沿用“〔R10〕”（替换文本里已使用），并在 CHANGELOG 记一条 2026-11-13 复核：Fable 5.2、GPT-6.1 Terra、Gemini 4 Carbon、Kimi K2 下线、Whisper/TTS 弃用、Gemini 文档域名迁移。

### Gaps
- 没有逐行复核 R8 / R2 的全部历史行，只列出本轮发现的冲突项。
