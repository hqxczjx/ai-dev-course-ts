# 第 04 章 · 结构化输出与 Zod

> 📋 **本章目标**
> 1. 让模型的输出 100% 可被程序安全消费——不再 `JSON.parse` 裸奔
> 2. Zod 速成：定义 schema、校验、错误定位、从 schema 推导 TS 类型
> 3. 掌握跨厂商通用的「JSON mode + Zod 校验 + 修复循环」三板斧
> 4. 会处理结构化输出的经典暗坑（截断、围栏包裹、字段漂移、类型谎报）
> 5. 建立「输出契约」思维：模型是你管道中的一个函数，签名先行
>
> 前置知识：第 02 章（lib/ai.ts）、第 03 章（输出格式约束）｜预计用时：5-8 小时
>
> **配套代码**：`code/src/lib/extract.ts`（本章 4.4.1），离线测试 `code/test/extract.test.ts`——在 `code/` 里跑 `pnpm check` 就能看到修复循环的三条路径被确定地验证，不需要 API key。
>
> **岗位依据**：结构化输出出现在约 15% 的 JD 明文里，但真实使用率远高于此——凡「LLM + 工程系统」的接缝处都需要它：工具调用参数解析（第 7 章）、RAG 的引用标注（第 13 章）、评测打分（第 15 章）、生成式 UI 的组件意图（第 20 章）。这是把模型「接进」工程世界的万能接头。

---

## 4.1 问题：`JSON.parse` 裸奔是定时炸弹

你让模型「输出 JSON」，然后：

```ts
const data = JSON.parse(res.choices[0].message.content); // ❌ 危险代码
```

真实世界会发生什么（每一条都有人血泪验证）：

1. 模型输出 ```` ```json {...} ``` ````（Markdown 围栏包裹）→ parse 直接炸
2. 模型在 JSON 前后加了句「好的，以下是结果：」→ 炸
3. `max_tokens` 用完 JSON 被拦腰截断 → 炸
4. JSON 合法，但字段名从 `severity` 漂移成了 `level`，或该数字的地方给了字符串 `"3"` → parse 成功，**运行时深处炸**（最阴险）
5. `score` 字段这次返回 `0.8`，下次返回 `"高"` → 类型不稳定

**结论**：第 3 章说过，文字格式约束是「软」的。凡是要进你代码的数据，必须有**硬保障**：格式层（JSON mode/schema）+ 校验层（Zod）+ 修复层（重试循环）。本章把这三层全部建好。

## 4.2 Zod 速成（本课程用到的 90%）

Zod 是 TS 生态的运行时校验库——**TypeScript 的类型在编译后消失，Zod 的 schema 在运行时仍在岗**。这正是校验模型输出需要的：模型可不认识你的 TS 类型。

```ts
import { z } from "zod";

// 1. 定义 schema（像写类型一样写校验规则）
const Feedback = z.object({
  category: z.enum(["complaint", "question", "praise", "invalid"]),  // 枚举：分类任务的输出最常用；invalid = 无意义/刷屏内容（第 15 章评测集会用到）
  sentiment: z.number().min(-1).max(1),                   // 数值范围
  keywords: z.array(z.string()).max(5),                   // 数组与长度限制
  needsReply: z.boolean(),                                // 布尔
  summary: z.string().min(5).max(100),                    // 字符串长度约束
});

// 2. 从 schema 推导 TS 类型——单一事实来源，类型与校验永不脱节
type Feedback = z.infer<typeof Feedback>;

// 3. 校验：safeParse 不抛异常，把结果交给你
//    模拟一份「模型输出」：sentiment 给成了字符串
const modelOutput: unknown = JSON.parse(
  '{"category":"complaint","sentiment":"-0.8","keywords":["物流"],"needsReply":true,"summary":"物流太慢，等了半个月"}',
);
const result = Feedback.safeParse(modelOutput);
if (result.success) {
  console.log(result.data.category);  // ✅ 类型安全，字段全有保证
} else {
  console.log(result.error.issues);   // 精确到字段与原因的报错
  // [{ path: ["sentiment"], message: "Invalid input: expected number, received string", ... }]（Zod 4 的措辞）
}
```

三个高频进阶件：

```ts
import { z } from "zod";

// coerce：模型爱把数字给成字符串，收编它
const Page = z.object({ page: z.coerce.number().int().min(1) });

// optional / nullable / default：字段可能缺失的处理
const Doc = z.object({
  publishedAt: z.iso.datetime().optional(),       // ISO 时间戳（Zod 4 用 z.iso.datetime()；.datetime() 已弃用但仍可用）
  tags: z.array(z.string()).default([]),          // 缺失时给默认值
});

// describe：schema 即文档——第 7 章它会变成工具的「说明书」
const Score = z.number().min(0).max(1).describe("相关性得分，1 最相关");
```

> **第 7 章预告**：Zod 的 `describe` 与 Zod 4 内置的 `z.toJSONSchema()` 会把 schema 转成 JSON Schema 发给模型——**同一个 Zod schema，既告诉模型「怎么给」，又约束程序「怎么收」**。这是本课程反复出现的「单一契约」模式。（旧的 `zod-to-json-schema` 只支持 Zod 3、已停止维护，不要再装。）

## 4.3 第一层保障：让模型「进 JSON 通道」

各家 API 提供 JSON mode（`response_format: { type: "json_object" }`），打开后模型被约束只能产出合法 JSON（注意：**保证合法性，不保证结构**——字段对不对要靠下一层）。第 2 章的 `chat()` 已经留好了开关：传 `json: true`，封装就会替你带上 `response_format`：

```ts
// 04-json-mode.ts —— 第一层保障：打开 JSON mode
import { chat } from "./lib/ai";

const feedback = "物流太慢了，等了半个月！客服也不回消息。";

const { text, finishReason } = await chat({
  messages: [
    { role: "system", content: "你是评论分析器。以 JSON 输出，包含字段：category（complaint|question|praise|invalid，无意义内容归 invalid）、sentiment（-1到1的数字）、keywords（数组）、needsReply（布尔）、summary（一句话）。" },
    { role: "user", content: `<feedback>\n${feedback}\n</feedback>` },
  ],
  json: true,       // ← JSON mode：封装会发送 response_format: { type: "json_object" }
  temperature: 0,   // 结构化任务：温度压到底（支持温度的模型才传，见第 2 章 2.1）
  maxTokens: 500,
});

console.log(finishReason); // "stop" 才是完整输出；"length" 说明被 maxTokens 截断了（4.5 暗坑 1）
console.log(text);         // 合法 JSON 字符串，但字段对不对还不知道——交给下一层
```

三条铁律：

1. **system 里仍要写字段说明**——JSON mode 只管「是合法 JSON」，字段名和取值范围仍靠提示（或第 7 章的 schema 工具调用硬约束）
2. **「JSON」这个词必须出现在提示里**（OpenAI / DeepSeek 的硬要求；GLM / Kimi 更看重字段与结构的描述，但写上也无害）
3. **温度压低**——你要的是查表般的稳定，不是创作。支持温度的模型（DeepSeek 等）传 `temperature: 0`；GPT-6 推理模型、Claude 新 API 不接受这个参数，不传即可

> **厂商支持情况**（2026-11 复核）：JSON mode 在 OpenAI / DeepSeek / GLM / Kimi 都可用；Anthropic 的 OpenAI 兼容端点**不支持** `json_object`（会 400），只支持 `json_schema` + `strict`。更强的 `json_schema` 严格模式（schema 级硬约束，违反即拒绝）各家支持度参差不一，**以各家官方文档为准**；直连 OpenAI 时，openai SDK 自带 `zodResponseFormat` 辅助函数（`import { zodResponseFormat } from "openai/helpers/zod"`），可以直接把 Zod schema 变成 `json_schema`。本课程教通用三板斧，你的封装在任何兼容厂商都能跑；端点不支持 JSON mode 时传 `json: false`，靠下面的剥壳 + 校验兜底。

## 4.4 第二层保障：Zod 校验 + 第三层：修复循环

先把三层写进**一个函数**里看清楚（这是本章的核心模式，背下来）。它是一个独立的小模块，放在 `feedback-v1.ts`——4.4.1 再把它泛化成全课程复用的库函数：

```ts
// feedback-v1.ts —— 结构化抽取（手写版）：JSON mode + Zod + 修复循环
import { z } from "zod";
import { chat } from "./lib/ai";

const Feedback = z.object({
  category: z.enum(["complaint", "question", "praise", "invalid"]),
  sentiment: z.number().min(-1).max(1),
  keywords: z.array(z.string()).max(5),
  needsReply: z.boolean(),
  summary: z.string().min(5).max(100),
});
type Feedback = z.infer<typeof Feedback>;

type Msg = { role: "system" | "user" | "assistant"; content: string };

// 预处理：剥掉模型可能加的围栏和废话（防御性解析）
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

export async function analyzeFeedback(
  feedback: string,
  maxRepair = 2,   // 修复循环上限：每次修复都是一次新的 API 调用（花钱！）
): Promise<Feedback> {
  const schemaDesc = `以 JSON 输出：category 是 complaint|question|praise|invalid 之一（无意义内容归 invalid）；
sentiment 是 -1 到 1 的数字；keywords 是不超过 5 个词的数组；
needsReply 是布尔；summary 是 5-100 字的一句话总结。只输出 JSON。`;

  // 显式标注元素类型：后面要追加 assistant 消息，只靠推断会推成 system | user，再赋值就编译失败
  let messages: Msg[] = [
    { role: "system", content: `你是评论分析器。${schemaDesc}` },
    { role: "user", content: `<feedback>\n${feedback}\n</feedback>` },
  ];

  for (let attempt = 0; attempt <= maxRepair; attempt++) {
    // ① 第一层：json: true 打开 JSON mode（第 2 章 chat() 的开关）
    const { text } = await chat({ messages, json: true, temperature: 0, maxTokens: 500 });

    // ② 剥壳 → parse → 校验：parse 本身也可能抛错（截断/脏围栏），必须一起接住
    let issues: string;
    try {
      const parsed = Feedback.safeParse(JSON.parse(extractJson(text)));
      if (parsed.success) return parsed.data;                         // 成功即返回
      issues = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } catch (err) {
      issues = `输出不是合法 JSON（${String(err)}）`;                    // JSON.parse 抛错也走修复分支
    }

    // ③ 失败：把错误「喂回去」，让模型自我修正
    console.warn(`[extract] 第 ${attempt + 1} 次输出不合格：${issues}，触发修复`);
    messages = [
      ...messages,
      { role: "assistant", content: text },
      { role: "user", content: `你的输出不符合要求：${issues}。请严格按要求重新输出，只输出 JSON。` },
    ];
  }
  throw new Error(`结构化输出在 ${maxRepair + 1} 次尝试后仍不合格，放弃（转人工/降级）`);
}
```

为什么这个模式是「生产级」的（面试加分讲法）：

- **三层各司其职**：JSON mode 拦截非法 JSON；Zod 拦截结构/类型/范围错误；修复循环把「模型会犯错」当作常态设计进流程，而不是假装不会
- **错误信息是给模型的提示词**：`issues` 精确到字段（`sentiment: Invalid input: expected number, received string`），模型看懂后修正率极高
- **有放弃线**：`maxRepair` 上限防无限烧钱；超限抛错转人工或降级（第 17 章的 Fallback 思想第一次落地）
- **防御性解析**：围栏剥离让它在没开 JSON mode 的端点上也能工作（跨厂商兼容的代价换来的鲁棒性）

### 4.4.1 封装成通用工具：`lib/extract.ts` 的 `structured<T>()`

上面每个抽取器都长一个样：变的只有 schema 和提示。把它泛化成全课程复用的第二个地基函数（第 8/11/14/17 章都会 import 它）。注意它是一个**全新的文件** `lib/extract.ts`，和 `feedback-v1.ts` 互不相干；`extractJson` 搬进这里并导出，以后都用这一份：

```ts
// lib/extract.ts —— 结构化输出：JSON 剥壳 + Zod 校验 + 修复循环（第 04 章 4.4 / 4.4.1）
import { z } from "zod";
import { chat, type ChatOptions, type ChatResult } from "./ai";

/** 防御性解析：剥掉模型可能加的 ```json 围栏和前后废话 */
export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

type SimpleMsg = { role: "system" | "user" | "assistant"; content: string };
/** 依赖注入点：默认用真实的 chat()，测试时传一个假的 */
export type ChatFn = (opts: ChatOptions) => Promise<Pick<ChatResult, "text">>;

export interface StructuredOptions {
  maxRepair?: number;    // 修复次数上限：每次修复都是一次新的 API 调用（花钱！）
  temperature?: number;  // 支持温度的模型（如 DeepSeek）抽取任务建议传 0
  maxTokens?: number;
  json?: boolean;        // 默认 true：打开 JSON mode；端点不支持时传 false，靠剥壳 + 校验兜底
  chatFn?: ChatFn;
}

/** 通用结构化函数：schema 进，类型安全的 T 出（第 08/11/14/17 章复用） */
export async function structured<T>(
  schema: z.ZodType<T>,
  messages: SimpleMsg[],
  opts: StructuredOptions = {},
): Promise<T> {
  const { maxRepair = 2, temperature, maxTokens = 800, json = true, chatFn = chat } = opts;
  const schemaDesc = `只输出 JSON，符合此 JSON Schema：\n${JSON.stringify(z.toJSONSchema(schema))}`;
  let msgs: SimpleMsg[] = [{ role: "system", content: schemaDesc }, ...messages];

  for (let attempt = 0; attempt <= maxRepair; attempt++) {
    const { text } = await chatFn({ messages: msgs, temperature, maxTokens, json });
    let issues: string;
    try {
      // JSON.parse 本身也会抛（截断、脏围栏），必须和校验放在同一个 try 里
      const parsed = schema.safeParse(JSON.parse(extractJson(text)));
      if (parsed.success) return parsed.data;
      issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (err) {
      issues = `输出不是合法 JSON（${String(err)}）`;
    }
    msgs = [
      ...msgs,
      { role: "assistant", content: text },
      { role: "user", content: `不符合要求：${issues}。请重新输出，只输出 JSON。` },
    ];
  }
  throw new Error(`structured: ${maxRepair + 1} 次尝试后仍不合格`);
}
```

完整代码：`code/src/lib/extract.ts`；离线测试：`code/test/extract.test.ts`。

和手写版相比多了三个设计：

- **把 Zod schema 转成 JSON Schema 塞进提示**：`z.toJSONSchema()` 是 Zod 4 内置能力（旧的 `zod-to-json-schema` 已归档且不支持 Zod 4，不要再装）。schema 改了，提示自动跟着改，不会两处漂移。
- **`json` 默认打开**：第一层保障默认生效；遇到不支持 JSON mode 的端点，调用方传 `json: false`。`temperature` 不给默认值——支持温度的模型由调用方显式传 `0`。
- **`chatFn` 依赖注入**：默认用真实的 `chat()`；测试时传一个按脚本返回预设文本的假函数，就能**不花一分钱**地确定复现「第一次截断、第二次越界、第三次才合格」和「三次都不合格就放弃」——这正是第 0 章说的「先离线证明程序逻辑」。

> 注意两个边界：① 顶层 schema 必须是 `z.object`——JSON mode 本身就要求输出一个对象，`extractJson` 也只认 `{…}`。要返回数组，就包一层：`z.object({ items: z.array(Item) })`。② `structured` 只拿 `text`，不看 `finishReason`；被截断的输出会表现为「不是合法 JSON」，进修复循环——如果截断频繁，调大 `maxTokens`（练习 2 让你在手写版里显式处理它）。

有了 `structured`，4.4 的手写版可以缩成几行，调用方只写 schema 和提示，修复/校验/剥壳全部透明：

```ts
// feedback.ts —— 用 structured() 重写 analyzeFeedback
import { z } from "zod";
import { structured } from "./lib/extract";

export const Feedback = z.object({
  category: z.enum(["complaint", "question", "praise", "invalid"]),
  sentiment: z.number().min(-1).max(1).describe("情感倾向，-1 最负面，1 最正面"),
  keywords: z.array(z.string()).max(5),
  needsReply: z.boolean(),
  summary: z.string().min(5).max(100),
});

export function analyzeFeedback(feedback: string) {
  return structured(
    Feedback,
    [
      { role: "system", content: "你是评论分析器。空洞刷屏、无意义的内容归为 invalid。" },
      { role: "user", content: `<feedback>\n${feedback}\n</feedback>` },
    ],
    { temperature: 0, maxTokens: 500 },
  ); // 返回类型自动推断为 Promise<z.infer<typeof Feedback>>
}
```

## 4.5 五个经典暗坑与对策

| # | 暗坑 | 症状 | 对策 |
|---|---|---|---|
| 1 | **JSON 被截断** | `finish_reason: "length"`，JSON 尾部缺失 | 检查 `chat()` 返回的 `finishReason`！截断直接加大 `maxTokens` 重试，不要 parse |
| 2 | **围栏/废话包裹** | ```` ```json ```` 或「好的，以下是」 | `extractJson` 预处理（4.4） |
| 3 | **字段名漂移** | parse 成功但 `data.category` 是 undefined | Zod 4 用 `z.strictObject()` 拒绝多余字段（`.strict()` 已弃用但可用）；字段少了直接校验失败进修复 |
| 4 | **类型谎报** | `"3"` vs `3`、`"true"` vs `true` | `z.coerce` 收编常见类型滑动；schema 里写清类型并给示例 |
| 5 | **日期与 null** | 日期是 `"2026年10月"`；该缺省时给 `null` | schema 用 `z.iso.datetime()` 强制 ISO 格式并在提示中给格式示例；`.nullable().or(z.literal(""))` 明确空值语义 |

第 1 条单独强调：**养成检查 `finish_reason` 的习惯**——`stop` 是正常结束，`length` 是被 max_tokens 掐断，`tool_calls`（第 7 章）是模型想调工具。它是模型「怎么结束的」的自白书，也是排查「JSON 为什么坏了」的第一现场。

## 4.6 模式扩展：从「一次抽取」到「输出契约」

本章的模式可以推广成全课程的通用思维——**「输出契约」**：凡是模型输出要进工程系统，先写两样东西：

```ts
// ⚠️ 接口示意：只示意三件东西的形状，UserInput 等未定义，不要直接运行
// ① 契约（schema 即接口）
const Contract = z.object({ /* 字段与约束 */ });
type Contract = z.infer<typeof Contract>;

// ② 管道（生成 → 校验 → 修复 → 类型安全的下游）：通常就是一行 structured()
async function llmFunction(input: UserInput): Promise<Contract> {
  return structured(Contract, [{ role: "user", content: render(input) }]);
}

// ③ 下游函数直接依赖类型，编译期就安全
function renderCard(data: Contract) { /* … */ }   // 第 20 章生成式 UI 的组件 props 就这么来
function score(data: Contract) { /* … */ }        // 第 15 章评测的输入也这么来
```

「把 LLM 当函数用」——这个 2026 年 JD 高频表述的工程本质，就是本章的输出契约。第 7 章的工具调用其实是同一个思想的官方标准化版本（模型输出工具调用参数，参数被 schema 硬校验），到时候回看本章会有「原来如此」的连贯感。

## 4.7 什么时候不用结构化输出

- **给人看的内容**（对话回复、文章）→ 自由文本 + 流式
- **长文本生成中嵌少量结构** → 分两次调用（先生成内容，再单独结构化抽取关键信息），比要求一次完成更稳
- **探索性任务**（brainstorm）→ 先自由生成，需要时二次加工

成本提示：结构化输出的「省」在于省掉下游解析失败的重试与人工；单次调用它并不更便宜（schema 描述也占 token）。**省的是工程成本，不是 token 成本**。

---

## ⚠️ 常见坑

1. **信任 `response_format` 到牙齿**——JSON mode 只保「合法 JSON」，字段层面照样要 Zod。
2. **修复循环没上限**——极端情况下模型能错 10 次，每次都是钱；`maxRepair=2` 足够覆盖 95% 场景。
3. **在 schema 里堆几十个字段**——字段越多遵循率越低。超过 ~10 个字段考虑拆任务（两次抽取），或减少可选字段。
4. **`z.infer` 与手写类型重复定义**——类型永远从 schema 推导（`z.infer`），双份定义必然漂移。
5. **把 schema 当提示的全部**——schema 管不住「语义」（sentiment 给 0.5 还是 0.7），语义质量靠 system 提示中的定义与示例（第 3 章）。

## ✍️ 动手练习

**基础**：
1. 跑通 4.4 的 `analyzeFeedback`（手写版和 `structured` 版各跑一遍）：准备 10 条真实风格的评论（5 条正常 + 5 条刁钻：空格刷屏/中英混杂/纯表情），统计一次通过率与修复触发次数——**这就是你的第一个微型评测集**（第 15 章的前身）。再把 `json: true` 改成 `false` 重跑，对比通过率，亲眼看第一层保障的作用。
2. 在 `feedback-v1.ts` 里处理截断：`chat()` 已经返回 `finishReason`，当它是 `"length"` 时不要进修复循环，而是把 `maxTokens` 翻倍重试一次（只重试一次）。

**进阶**：
3. **简历信息抽取器**：输入一段自然语言简历文本，输出 `{ name, skills: string[], yearsOfExperience: { [skill: string]: number }, education: "大专"|"本科"|"硕士"|"博士"|"未知" }`。难点在嵌套结构（record 的 key 是动态的）——练习 schema 建模能力。提示：Zod 4 的 `z.record` 必须写两个参数，如 `z.record(z.string(), z.number())`，单参数写法已移除。
4. 给 4.4.1 的 `structured<T>()` 写离线测试：用 `chatFn` 注入一个按脚本返回预设文本的假 chat，分别模拟「首次合法」「首次非法、第二次修复成功」「始终非法触发放弃」三条路径，并断言调用次数（**测你的代码，不测模型**——测试/mock 意识本身就是 AI 时代的工程基本功）。写法对照 `code/test/extract.test.ts`（Node 自带的 `node:test`，`pnpm exec tsx --test test/*.test.ts` 运行），写完先跑通，再故意把 `maxRepair` 的循环条件改坏，看哪条测试变红。

## 🧠 自测清单

1. `JSON.parse` 裸奔的五种死法？哪一种最阴险、为什么？
2. Zod 与 TS 类型的关系？为什么校验模型输出必须用运行时校验？
3. 「三板斧」分别是什么、各拦什么错误？第一层在 `chat()` 里靠哪个选项打开？修复循环为什么必须带上 Zod 的错误信息？
4. `structured()` 的 `chatFn` 注入解决了什么问题？为什么顶层 schema 必须是对象？
5. `finish_reason` 有哪三种典型值？分别意味着什么？
6. 「输出契约」思维的三要素？它和第 7 章工具调用是什么关系？
7. `z.coerce`、`z.enum`、`.describe`、`z.infer` 各自的使用场景？
8. 什么时候不该用结构化输出？它省的是什么成本？

## 🔗 延伸阅读

- Zod 官方文档（本课程依赖的核心库）：https://zod.dev
- OpenAI Structured Outputs 指南（json_schema 严格模式原理，含 `zodResponseFormat` 用法）：https://developers.openai.com/api/docs/guides/structured-outputs
- （中文备选）DeepSeek 文档中「JSON Output」章节：https://api-docs.deepseek.com/

---

➡️ 下一章：[第 05 章 · 流式输出与对话应用](第05章-流式输出与对话应用.md)——你的第一个完整项目。
