# R6 调研报告：AI 应用安全 + AI 编程方法论（Rules / Skills / SDD）

> 调研日期：2026-10-11。全部结论经联网核实（官方文档 / 官方仓库优先），每条附来源 URL。
> 用途：《纯 TypeScript 的 AI 开发教程》安全章节与「AI 编程方法论」章节的事实底稿。

---

# A. AI 应用安全

## A1. OWASP GenAI LLM Top 10（2025 版）

**核心结论**

- 当前版本为 **2025 版**（"OWASP Top 10 for LLM Applications 2025"），取代 2023/2024 版。来源：https://genai.owasp.org/llm-top-10/
- 官方提供 PDF 全文下载与多语言翻译（含简体中文）。
- 与 2023 版的最大变化：**提示注入升为 LLM01**；新增 **LLM07 系统提示泄露**、**LLM08 向量与嵌入弱点**；原「不正确的输出处理」降至 LLM05，并移除了独立的「LLM过拟合/模型DoS」重组为「无限制消耗」。

**2025 版完整清单（名称逐条核实）**

| 编号 | 名称 | 一句话风险 |
|---|---|---|
| LLM01:2025 | Prompt Injection（提示注入） | 用户提示改变 LLM 的预期行为或输出，直/间接注入均可劫持应用 |
| LLM02:2025 | Sensitive Information Disclosure（敏感信息泄露） | LLM 或其应用在输出中泄露 PII、财务/健康数据、商业机密或凭据 |
| LLM03:2025 | Supply Chain（供应链） | 训练数据、第三方模型、适配器（LoRA）、依赖包、部署平台任一环节被篡改或投毒 |
| LLM04:2025 | Data and Model Poisoning（数据与模型投毒） | 预训练/微调/嵌入数据被篡改，植入后门或偏见，腐蚀模型行为 |
| LLM05:2025 | Improper Output Handling（不当输出处理） | LLM 输出未经校验/净化就传给下游系统，导致 XSS、命令注入、权限提升 |
| LLM06:2025 | Excessive Agency（过度代理） | LLM 被授予超出所需的工具、权限或自主性，被注入后执行破坏性操作 |
| LLM07:2025 | System Prompt Leakage（系统提示泄露） | 系统提示暴露，泄露内部指令或内嵌的秘密信息 |
| LLM08:2025 | Vector and Embedding Weaknesses（向量与嵌入弱点） | RAG 检索系统中的向量/嵌入存在越权检索、跨租户污染等风险 |
| LLM09:2025 | Misinformation（错误信息） | 模型幻觉/错误输出被应用当作事实传播 |
| LLM10:2025 | Unbounded Consumption（无限制消耗） | 算力/配额不受控，导致拒绝服务或成本攻击 |

来源：https://genai.owasp.org/llm-top-10/ （LLM02/LLM03/LLM06 详情页另见下）

**重点条目详情（已核实官方详情页）**

1. **LLM02 敏感信息泄露**（https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/）
   - 缓解：数据清洗/脱敏（进入训练或上下文前）、严格输入校验、最小权限访问外部数据源、差分隐私/联邦学习、隐藏系统前置词（参考 OWASP API8:2023）、tokenization/模式化脱敏。
   - 官方提醒：靠系统提示限制输出类型「不一定被遵守，且可被提示注入绕过」。

2. **LLM03 供应链**（https://genai.owasp.org/llmrisk/llm032025-supply-chain/）
   - 缓解：只用可信供应商并定期审计；应用 OWASP A06:2021 措施（漏洞扫描/补丁管理）；对第三方模型做红队评测；维护 **AI SBOM（如 CycloneDX）**并签名；模型与代码做哈希/签名校验；监控 HuggingFace 等协作环境的合并/转换滥用（如 PoisonGPT、恶意 LoRA 适配器案例）。

3. **LLM06 过度代理**（https://genai.owasp.org/llmrisk/llm062025-excessive-agency/）
   - 风险定义：功能、权限、自主性三者任一过度，配合被操纵的输出即造成破坏。
   - 缓解（8 条）：最小化扩展数量（只给必需工具）；最小化扩展功能（读邮件的就不要发邮件）；避免开放式扩展（专用「写文件」优于通用 shell）；最小化扩展权限（下游只读账号）；以**用户上下文**执行扩展（OAuth 最小 scope，而非共享高权限身份）；高危操作**人工审批（HITL）**；**完全中介**（授权在下游系统强制执行，不依赖 LLM 判断）；输入输出净化 + 管道内 SAST/DAST。
   - 损害限制（非预防）：日志监控、限速。

## A2. Prompt 注入防御的工程实践（官方/权威）

**首选权威来源：OWASP《LLM Prompt Injection Prevention Cheat Sheet》**
来源：https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html

教程可直接引用的防御清单（按速查表章节核实）：

1. **输入校验与净化**：匹配危险模式（如"忽略之前的指令"）+ 模糊匹配变体（Levenshtein / Jaro-Winkler 距离检测乱序变体）；规范化空白与重复；限制输入长度。
2. **结构化提示与明确隔离**：用分隔符把可信系统指令与不可信数据分开——但速查表明确警告：**标签/分隔符不是强制边界，权限必须在工具层执行**。
3. **输出监控与校验**：扫描系统提示泄露、API key、编号指令；未通过校验或超长的输出直接拦截。
4. **人工在环（HITL）**：有实际后果的工具调用必须人工审批，依据是操作/目标/参数/调用者权限，而非关键词计数。
5. **Best-of-N 攻击缓解**：限速 + 内容过滤，但要认识到都不是保证；授权与最小权限控制保持在模型之外。
6. **远程内容净化**：对外部内容（网页、邮件、代码注释）剥离注入模式，先解码再检查。
7. **Agent 专用防御**：工具调用按用户权限/会话上下文校验；校验工具参数；限制工具访问。
8. **最小权限**：只读数据库账号、收窄 API scope。
9. **全面监控**：按用户/IP 限速、安全日志（不含秘密）、异常告警、工具使用追踪。
10. **基于模型的护栏**：独立分类器模型（Llama Guard、Prompt Guard）做输入/输出/动作筛查；可考虑 **CaMeL** 类架构（特权规划 LLM + 零工具的隔离解析 LLM + 能力追踪解释器）；护栏模型本身也可被注入，需纵深防御。
11. **安全实现流水线 + 冒烟测试**：枚举所有不可信内容通道；把所有模型输出当不可信；用有代表性的攻击/良性样本测试防御，报告假阳性率而非宣称攻击拦截率。

**Simon Willison《双重 LLM 模式》（The dual LLM pattern）**
来源：https://simonwillison.net/2023/Apr/25/dual-llm-pattern/

- 架构：**特权 LLM**（接收可信用户输入，持有工具）+ **隔离 LLM**（处理邮件/网页等不可信内容，零工具）+ 普通代码 **Controller** 在两者间传递数据（变量名可达特权模型，内容不可达）。
- 防御原理：不可信内容即使注入成功，隔离 LLM 也没有工具可滥用；其「放射性」输出永不回流特权模型。
- 作者自认局限：复杂度与体验劣化（"This solution is pretty bad!"）；任何实现失误让不可信文本漏进特权模型即告破防；对社工（诱导用户粘贴出 base64 私密数据）无解。
- 2025-04 更新：Simon 指出 Google DeepMind 的 **CaMeL 论文**（"Defeating Prompt Injection by Design"）发现该方案缺陷并给出更成熟的设计（OWASP 速查表亦引用 CaMeL）。

**给教程的一句话总结**：提示词措辞不是安全边界，真正的强制点在**工具层与执行层**（最小权限 + HITL + 输出校验 + 纵深防御）。

## A3. promptfoo 红队（promptfoo.dev）

来源：https://www.promptfoo.dev/docs/red-team/ 与 https://www.promptfoo.dev/docs/red-team/quickstart/

**能测的攻击类型（官方分两层）**

- 模型层：提示注入与越狱（jailbreak）、仇恨/偏见/有害内容、幻觉、版权侵犯、专业建议（医疗/金融）、过度代理/过度依赖、训练数据 PII 泄露。
- 应用层：**间接提示注入**、上下文 PII 泄露（RAG）、工具类漏洞（未授权数据访问、越权、SQL 注入；插件含 **BOLA / BFLA**）、话题劫持、数据外传（markdown 图片外链、链接预取泄露）。
- 测试方式：黑盒（AppSec 最常用）/白盒；一次性报告或 CI/CD 持续运行。

**配置方式（简要，已核实 quickstart）**

```bash
# 1) 初始化（向导式 UI；或 --no-gui 纯命令行）
npx promptfoo@latest redteam setup          # 旧命令 redteam init
# 2) 生成并运行数百条对抗输入（写入 redteam.yaml）
npx promptfoo@latest redteam run
# 3) 查看报告（漏洞分类、严重度、失败明细、缓解建议）
npx promptfoo@latest redteam report
```

- 配置文件 `promptfooconfig.yaml` 核心段：`targets`（可以是 `https` provider 指向你的 TS 服务，或 `openai:...` 直连模型）、`redteam.plugins`（攻击生成器，可选 Default 预设）、`redteam.strategies`（攻击策略包装，如多轮越狱）、`purpose`（描述应用与用户，提升用例质量）。
- 前置条件：Node.js ≥ 22；`OPENAI_API_KEY` 用于生成攻击（与被测目标模型分离）。

---

# B. AI 编程方法论

## B4. Claude Code 官方最佳实践

来源：https://code.claude.com/docs/en/best-practices （anthropic.com/engineering/claude-code-best-practices 已 308 重定向至此）；CLAUDE.md 机制另见 https://code.claude.com/docs/en/memory

**核心原则**：上下文窗口是最重要的资源——"Claude's context window fills up fast, and performance degrades as it fills"。不相关任务间用 `/clear`，用 `/compact <指示>` 引导压缩，重调研任务交给 subagent。

**CLAUDE.md 写法要点（可直接进教程）**

- 逐行自检："Would removing this cause Claude to make mistakes?" —— 不会就删。
- 应写：Claude 猜不到的命令、非默认代码风格、测试偏好、仓库礼仪、环境怪癖。
- 不应写：能从代码推断的内容、通用惯例、详细 API 文档、逐文件描述。
- 警告（官方原话）："Bloated CLAUDE.md files cause Claude to ignore your actual instructions!"（臃肿的 CLAUDE.md 会让 Claude 忽略你真正的指令）
- 像代码一样迭代维护：`/init` 生成初稿，`/doctor` 建议删减；个别被忽略的规则用 "IMPORTANT" 强调（ sparingly）。
- memory 文档补充：单文件建议 **< 200 行**；冲突规则会导致随机遵循；多步骤流程应移入 skills 或 `.claude/rules/`（带 `paths:` frontmatter）；`@path` 语法导入外部文件；层级为 管理策略 → `~/.claude/CLAUDE.md`（用户） → `./CLAUDE.md`（项目） → `CLAUDE.local.md`（本地不入库） → 子目录 CLAUDE.md（惰性加载）；无 CLAUDE.md 时读取 AGENTS.md。

**常用工作流（官方推荐）**

1. **Explore → Plan → Code → Commit**：plan 模式（Shift+Tab）先调研规划再实现提交；小修改直接跳过规划（"If you could describe the diff in one sentence, skip the plan"）。
2. **TDD 验证环**：给 Claude 一个可运行的检查（测试/构建/lint/退出码），让"环自己闭合"；修 bug 先要求写复现失败测试。
3. **视觉迭代**：贴截图 → 让 Claude 截图结果 → "compare it to the original, list differences and fix them"。
4. **安全变更**：每轮对话自动创建 checkpoint，`/rewind` 可回滚对话与代码（Bash 造成的改动不在内，"This isn't a replacement for git"）。
5. **访谈式规格**：大功能先让 Claude 通过提问访谈你，写成 SPEC.md，再开新会话实现。

**Hooks / Skills 简述**

- **Hooks**：用于"必须每次零例外发生"的动作，确定性执行（CLAUDE.md 是概率性的）；可让 Claude 自己帮你写（如每次编辑后跑 eslint）。
- **Skills**：`.claude/skills/` 下的 SKILL.md，按需加载领域知识或可调用工作流（如 `/fix-issue 1234`），保持 CLAUDE.md 精简。
- 其他：headless `claude -p` + `--output-format json`；`--allowedTools` + `--permission-mode` 无人值守；`--permission-mode auto` 分类器拦截高危动作；subagent 做隔离调研/对抗性审查。

## B5. Anthropic Skills 编写最佳实践

来源：
- Claude Code Skills 文档：https://code.claude.com/docs/en/skills
- Anthropic 工程博客：https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- 官方示例仓库：https://github.com/anthropics/skills （README 与目录列表经 GitHub API 核实）

**渐进式披露（Progressive Disclosure）三层（工程博客原文核实）**

1. 启动时只预载每个 skill 的 **name + description**（元数据层，常驻上下文）；
2. Claude 判断相关时读入**完整 SKILL.md**（Claude Code 中单个 skill 预算 5,000 token、合计 25,000 token，压缩后自动重挂载）；
3. 复杂 skill 附带的**链接文件**（reference.md、脚本、模板）按需读取——"effectively unbounded"，且脚本可作为工具执行而不占用上下文。

**SKILL.md 结构示例（从官方模板 + Claude Code 文档提炼）**

```markdown
---
name: my-skill-name          # 小写连字符；/ 菜单中的命令名（默认取目录名）
description: 做什么 + 何时用   # 触发依据；与 when_to_use 合并截断于 1,536 字符
---

# My Skill Name

[指令正文：State what to do rather than narrating how or why]

## Examples / Guidelines
```

- **上传 claude.ai 仅允许 6 个 Agent Skills 标准字段**：`name`、`description`、`license`、`compatibility`、`metadata`、`allowed-tools`。
- Claude Code 本地额外支持：`argument-hint` / `arguments`、`disable-model-invocation`（禁止自动触发，如部署）、`user-invocable: false`（仅背景知识）、`allowed-tools` / `disallowed-tools`、`model` / `effort`、`context: fork`（隔离子代理）、`paths`（glob 限定自动激活范围）、`hooks` 等。
- 正文支持 `$ARGUMENTS`、`${CLAUDE_SKILL_DIR}` 等替换与 `` !`git diff HEAD` `` 动态上下文注入。

**编写要点（官方）**：SKILL.md **< 500 行**，细节移入支撑文件；description 先说核心用例；name/description 是触发开关，需精调；先通过评测找到能力缺口再增量建 skill；明确代码是"执行"还是"参考"；只装可信来源的 skill（skill 供应链风险，审计代码与联网指令）。

**官方仓库（github.com/anthropics/skills）真实示例（目录已核实，19 个）**：
`academy-guide`、`algorithmic-art`、`brand-guidelines`、`canvas-design`、`claude-api`、`discernment-nudge`、`doc-coauthoring`、`docx`、`frontend-design`、`internal-comms`、`mcp-builder`、`pdf`、`pptx`、`skill-creator`、`slack-gif-creator`、`theme-factory`、`web-artifacts-builder`、`webapp-testing`、`xlsx`。
- 大部分 Apache 2.0；`docx/pdf/pptx/xlsx` 四个文档技能 source-available（生产在用，适合学习复杂 skill 的写法）。
- 仓库还含 `spec/`（Agent Skills 开放标准，见 agentskills.io）与 `template/`（模板）。
- Claude Code 里可用 `/plugin marketplace add anthropics/skills` 安装。

## B6. GitHub Spec Kit

来源：README（raw.githubusercontent.com 核实）https://github.com/github/spec-kit ；集成表 https://github.github.io/spec-kit/reference/integrations.html ；GitHub 官方博客 https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/ ；快速上手 https://github.github.io/spec-kit/quickstart.html

- **是什么**：GitHub 开源（MIT）的「给 AI 编码代理以结构化流程、可复用模板与可追溯产出」的工具包。三条独立流程：**Spec-Driven Development**（核心内置）、**Bug fixing** 与 **Idea assessment**（可选拓展 `specify extension add bug|assess`）。
- **安装**：需 Python 3.11+ 与 uv；`uv tool install specify-cli` → `specify init my-project --integration copilot`。之后全部在代理对话里以 `/speckit-*` skill 调用（不是终端命令）。
- **SDD 工作流**：`/speckit-constitution`（项目级原则，一次）→ `/speckit-specify`（做什么与为什么）→ `/speckit-plan`（技术选型/架构——**技术栈在这一步给出**）→ `/speckit-tasks`（拆小任务）→ `/speckit-implement` → `/speckit-converge`（实现→收敛循环直到 Converged）。
- **是否支持 TypeScript（核实结果）**：现行版 `specify init` **不再询问编程语言、无语言模板**（旧版有语言选择，现行 README/quickstart 均已无）；仅选择 agent 集成与脚本变体（sh/ps/py）。技术栈在 `/speckit-plan` 自由声明即可，因此对 TypeScript 项目**无障碍**，但也没有 TS 专属脚手架。
- **支持 40+ agent 集成**（核实部分键名）：`copilot`、`claude`（Claude Code）、`cursor-agent`、`codex`、`gemini`、`opencode`、`zcode`、`zed`、`generic`（自带代理）等。
- GitHub 博客定位（原话意）：从"vibe coding——prompt 然后祈祷"转向「规格是可演进的活工件/事实源」，四阶段 specify→plan→tasks→implement。

## B7. OpenSpec（Fission-AI）

来源：README（raw.githubusercontent.com 核实）https://github.com/Fission-AI/OpenSpec ；npm `@fission-ai/openspec`；文档 https://github.com/Fission-AI/OpenSpec/tree/main/docs

- **定位**：轻量 spec 层——"AI 助手在需求只存在于聊天记录时不可预测；OpenSpec 让你先就『建什么』达成一致再写代码"。哲学口号：`fluid not rigid / iterative not waterfall / easy not complex / built for brownfield / scalable`。
- **工作流（新版 opsx）**：`/opsx:explore`（不确定要建什么时先探讨）→ `/opsx:propose add-dark-mode`（生成 `openspec/changes/<slug>/`：proposal.md + specs/ + design.md + tasks.md）→ `/opsx:apply`（执行任务）→ `/opsx:archive`（归档并更新 specs）。规格为纯 Markdown：`## ADDED Requirements` + `### Requirement: X`（SHALL 语句）+ `#### Scenario:`（WHEN/THEN）。人审计划后才写代码。
- **安装**：Node.js ≥ 20.19.0；`npm install -g @fission-ai/openspec@latest`（或 brew）；`cd your-project && openspec init`。支持 30+ 工具（不同工具命令拼写不同：`/opsx:propose`、`/opsx-propose`、`@opsx-propose`、`$openspec-propose`）。
- **与 Spec Kit 的差异（官方对比，适合教程引用）**："**vs. Spec Kit — Thorough but heavyweight. Rigid phase gates, lots of Markdown, Python setup. OpenSpec is lighter and lets you iterate freely.**" 即：Spec Kit 阶段门更严格（constitution/converge 等仪式感）、CLI 是 Python 系；OpenSpec 走轻量迭代、npm 安装、面向存量代码（brownfield），另有跨仓库规划 Stores（beta）。模型建议：高推理模型（官方推荐 Codex 5.5 / Opus 4.7）+ 干净上下文。

## B8. Cursor Rules

来源：https://cursor.com/docs/context/rules （docs.cursor.com/en/context/rules 已 308 重定向至此）

- **是什么**：给 Agent 的持久化系统级指令；命中时内容插入上下文开头。
- **类型（核实）**：
  - **Project Rules**：`.cursor/rules/*.mdc`（纯 `.md` 会被忽略），入库共享；frontmatter 为 `description` / `globs` / `alwaysApply`。
  - **User Rules**：Cursor 设置（Customize → Rules）中的全局偏好。
  - **Team Rules**：Team/Enterprise 后台管理，可强制，优先级 Team → Project → User。
  - **AGENTS.md**：项目根的简单替代方案（支持子目录）。
- **四种触发模式（由 frontmatter 组合决定）**：
  - Always Apply：`alwaysApply: true`，每次会话注入；
  - Auto Attached（Specific files）：`globs` 设置时，匹配文件入上下文即挂载；
  - Agent Requested（Intelligently）：仅 `description` 时，Agent 按相关性自取；
  - Manual：全部省略，仅 `@rule` 手动引用。
- **写法要点（官方）**：单条 **< 500 行**，大规则拆分为可组合的小规则；具体可执行，不整段抄风格指南；用 `@file` 引用文件而非复制内容（文件不内联，Agent 按需读）；入库 git；只在 Agent 重复犯错时才加规则。

## B9. Vibe Coding 与 Spec-Driven Development 的边界

**来源一：Simon Willison《Vibe coding》（2025-03-19）**
https://simonwillison.net/2025/Mar/19/vibe-coding/

- 定义（窄义）："building software with an LLM **without reviewing the code it writes**"——引用 Karpathy 原始语境（全凭感觉、Accept All 不看 diff、报错直接贴回去）。
- 边界判据（适合做教程金句）："**I won't commit any code to my repository if I couldn't explain exactly what it does to somebody else.**"——评审过、测过、能解释的 LLM 代码不是 vibe coding，而是软件开发。
- 适合 vibe coding：一次性原型、周末实验、低风险抛弃型项目、新手入门、有经验者建立对 LLM 能力边界的直觉。
- 不适合：出错会伤及他人（金钱/声誉）、涉及 API key 等秘密、可能泄露私有数据、会调用外部计费 API、给别人用的东西（须有经验者评审）；推荐沙箱化平台（如 Claude Artifacts 禁网+限制依赖）。

**来源二：GitHub 官方博客《Spec-driven development with AI: Get started with a new open source toolkit》（2025-09-02）**
https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/

- 把 vibe coding 定义为「prompt 完就祈祷输出能用」，指出模糊 prompt 迫使模型猜测"数千条未言明的需求"。
- SDD 价值：规格成为"活的可执行工件"与共同事实源；企业约束（安全、合规、设计系统）进入 spec/plan 而非散落 wiki/Slack；适合绿地项目、存量库的功能开发与遗留现代化。

**给教程的边界总结**：原型/实验/低风险 → vibe coding 快速迭代；上线、涉及他人、安全敏感、多团队协作 → 先写 spec（Spec Kit/OpenSpec），人工评审规格后再让代理实现。

---

# C. OWASP LLM Top 10 速查表（可直接引用）

> 来源：https://genai.owasp.org/llm-top-10/ ；LLM01 缓解措施以官方速查表为准：https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html

| 编号 | 名称 | 一句话风险 | 一句话缓解 |
|---|---|---|---|
| LLM01:2025 | 提示注入 Prompt Injection | 用户输入（含间接注入的网页/文档）改写模型行为，劫持应用 | 措辞不是边界——工具层最小权限 + 高危操作人工审批 + 输出校验，纵深防御 |
| LLM02:2025 | 敏感信息泄露 Sensitive Information Disclosure | PII、机密、凭据经模型输出或训练数据外泄 | 数据脱敏/清洗 + 最小权限访问 + 输出侧泄露扫描（DLP） |
| LLM03:2025 | 供应链 Supply Chain | 模型、LoRA、数据集、依赖包任一被篡改投毒 | 只用可信来源 + 漏洞扫描 + AI SBOM（CycloneDX）+ 哈希/签名校验 |
| LLM04:2025 | 数据与模型投毒 Data & Model Poisoning | 预训练/微调/嵌入数据被污染，植入后门或偏见 | 数据来源治理 + 异常检测 + 针对用例的红队评测 |
| LLM05:2025 | 不当输出处理 Improper Output Handling | 未校验的模型输出直通下游引发 XSS/命令注入/越权 | 对输出做校验、净化、编码，视模型输出为不可信输入 |
| LLM06:2025 | 过度代理 Excessive Agency | 工具/权限/自主性超出所需，注入即升级为破坏性动作 | 最小化工具与权限、专用工具取代通用 shell、高危动作 HITL、下游强制鉴权 |
| LLM07:2025 | 系统提示泄露 System Prompt Leakage | 系统提示暴露内部指令或内嵌秘密 | 不要把秘密放提示里；输出侧监控泄露并过滤 |
| LLM08:2025 | 向量与嵌入弱点 Vector & Embedding Weaknesses | RAG 向量库存在越权检索与跨租户/跨文档污染 | 向量库权限隔离 + 检索内容当不可信数据处理 + 元数据校验 |
| LLM09:2025 | 错误信息 Misinformation | 幻觉与错误输出被应用当事实采信 | RAG 接地 + 引用来源 + 人工复核关键结论 + 输出免责与置信提示 |
| LLM10:2025 | 无限制消耗 Unbounded Consumption | 算力与配额不受控，造成 DoS 或成本攻击 | 速率限制 + 配额上限 + 异常用量监控与熔断 |

---

# D. 教程可直接复用的模板

## D1. CLAUDE.md 模板要点（提炼自 https://code.claude.com/docs/en/best-practices 与 https://code.claude.com/docs/en/memory）

```markdown
# CLAUDE.md（建议 < 200 行；逐行自检：删掉会导致出错吗？）

## 常用命令（Claude 猜不到的部分）
- npm run test / npm run test:watch（跑单文件：npm test -- src/xx.spec.ts）
- npm run lint:fix；构建：npm run build（tsx 可直接运行脚本）

## 代码风格（只写偏离默认的部分）
- TypeScript strict；ESM + NodeNext；2 空格；双引号
- 测试用 vitest；错误先写测试再修

## 仓库约定
- 分支命名 feat/xxx；提交信息用 Conventional Commits
- 环境怪癖：Windows 下开发，路径用 pathToFileURL()

## 注意（少量 IMPORTANT 级规则）
- IMPORTANT: 永远不要提交 .env
```

要点清单：只写"猜不到/非默认/反复纠正"的内容；命令可执行；可验证的具体规则优于抽象风格描述；冲突规则会让 Claude 随机二选一；多步流程移到 skills；`@docs/api.md` 可导入外部文件（导入即加载，不减上下文成本）。

## D2. SKILL.md 结构示例（提炼自 https://code.claude.com/docs/en/skills 、https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills 、https://github.com/anthropics/skills template）

```markdown
---
name: pdf-form-extract
description: 从 PDF 表单提取字段并输出 TypeScript 类型。当用户提到 PDF 表单、
  AcroForm 字段或需要生成 PDF 字段的 TS 类型定义时使用。
allowed-tools: Read, Bash(python:*)
---

# PDF 表单字段提取

用 scripts/extract_fields.py（Python，pdfplumber）提取字段，
脚本 stdout 为 JSON，再转换为 TypeScript interface。

## 步骤
1. 运行 `python ${CLAUDE_SKILL_DIR}/scripts/extract_fields.py <pdf路径>`
2. 校验 JSON schema（见 reference.md）
3. 生成 interface 并写入 src/types/forms.ts

## 约束
- 只用脚本输出，不要自己解析 PDF 二进制
- 失败时报告脚本 stderr，不要重试超过 2 次
```

要点清单：frontmatter 必填仅 `name` + `description`（写清"做什么 + 何时用"，是触发开关）；上传 claude.ai 仅 6 个标准字段；正文 < 500 行、细节下沉到 reference.md / scripts/（渐进式披露三层）；确定型操作用脚本而非让模型推理；说明代码是执行还是参考。

---

# E. 核实备注（供教程作者参考）

- OWASP 详情页 URL 模式为 `genai.owasp.org/llmrisk/llm0X2025-slug/`（LLM01 页面抓取 404，其缓解内容以 Cheat Sheet 为准，Cheat Sheet 内容更全且为现行权威指南）。
- `anthropic.com/engineering/claude-code-best-practices` 已 308 重定向到 `code.claude.com/docs/en/best-practices`（内容已随版本更新，含 auto 权限模式、checkpoints 等新特性）；`docs.cursor.com` 全站 308 到 `cursor.com/docs`。教程引用请用新地址。
- `platform.claude.com`/`docs.claude.com` 的 Agent Skills 作者指南在当前网络环境区域受限，Skill 编写规范以 `code.claude.com/docs/en/skills` + Anthropic 工程博客 + anthropics/skills 仓库三方交叉核实。
- Spec Kit 现行版 init 已无编程语言选择步骤（与网上旧教程不同）；TypeScript 项目在 `/speckit-plan` 声明技术栈即可。
- promptfoo 旧命令 `redteam init` 对应新命令 `redteam setup`（--no-gui 保留）。
