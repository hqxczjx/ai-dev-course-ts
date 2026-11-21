// 课程在线阅读站点配置（VitePress）
// - 文档源就是课程目录本身（srcDir: ".."），正文不用复制、不用改
// - 侧边栏按目录自动生成：新增章节文件后重新构建即可
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type DefaultTheme } from "vitepress";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COURSE = path.resolve(SITE, "..");

/** "第01章-大模型工作原理.md" → "第01章 大模型工作原理" */
function titleOf(file: string): string {
  return file.replace(/\.md$/, "").replace(/^(第\d+章|附录[A-Z])-/, "$1 ");
}

function mdFiles(dir: string): string[] {
  return fs.readdirSync(path.join(COURSE, dir))
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
}

function group(dir: string, text: string, collapsed = false): DefaultTheme.SidebarItem {
  return {
    text,
    collapsed,
    items: mdFiles(dir).map((f) => ({ text: titleOf(f), link: `/${dir}/${f.replace(/\.md$/, "")}` })),
  };
}

const PARTS = fs.readdirSync(COURSE)
  .filter((d) => /^\d\d-/.test(d) && fs.statSync(path.join(COURSE, d)).isDirectory())
  .sort();

const sidebar: DefaultTheme.Sidebar = [
  {
    text: "开始",
    items: [
      { text: "课程总览", link: "/" },
      { text: "第00章 课程导读与方法论", link: "/第00章-课程导读与方法论" },
    ],
  },
  ...PARTS.map((d) => group(d, d.replace(/^(\d\d)-/, "$1 · "))),
  group("附录", "附录"),
  {
    text: "配套与资料",
    collapsed: true,
    items: [
      { text: "配套代码 code/", link: "/code/" },
      { text: "学习资源", link: "/RESOURCES" },
      { text: "更新记录 CHANGELOG", link: "/CHANGELOG" },
      ...mdFiles("reports").map((f) => ({ text: titleOf(f), link: `/reports/${f.replace(/\.md$/, "")}` })),
    ],
  },
  group("research", "调研与审计底稿", true),
];

/**
 * 中文分词：MiniSearch 默认只按空格/标点切词，中文整句会变成一个词，搜不到。
 * 这里用 Intl.Segmenter 按词切，再对连续汉字补两字组合（和第 13 章 rag/keyword.ts 同一思路）。
 * 注意：这个函数会被序列化后在浏览器里运行，不能引用外部变量。
 */
function tokenize(text: string): string[] {
  const out: string[] = [];
  const seg = new Intl.Segmenter("zh", { granularity: "word" });
  for (const s of seg.segment(text)) {
    if (!s.isWordLike) continue;
    const w = s.segment.toLowerCase();
    out.push(w);
    if (/^[一-鿿]{3,}$/.test(w)) {
      for (let i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2));
    }
  }
  const han = text.match(/[一-鿿]+/g) ?? [];
  for (const run of han) for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2));
  return out;
}

export default defineConfig({
  srcDir: "..",
  // 不上站点的：个人学习目标与笔记、测试用的假文档（含故意写的注入样本）
  srcExclude: ["MISSION.md", "NOTES.md", "code/fixtures/**", "research_notes/**"],
  rewrites: {
    "README.md": "index.md",
    "code/README.md": "code/index.md",
  },
  // GitHub Pages 项目站点的路径是 /<仓库名>/，由部署工作流通过 SITE_BASE 传入
  base: process.env.SITE_BASE ?? "/",
  lang: "zh-CN",
  title: "AI 开发教程 · 纯 TypeScript",
  description: "从前端转型 AI 应用 / Agent 开发：22 章 + 3 个项目 + 可运行的配套代码",
  cleanUrls: true,
  lastUpdated: false,
  vite: {
    // 正文在 .site 之外：让正文编译出的代码也从 .site/node_modules 里找 vue
    resolve: { alias: { vue: path.join(SITE, "node_modules/vue") } },
    build: { chunkSizeWarningLimit: 2000 },
  },
  markdown: {
    theme: { light: "github-light", dark: "github-dark" },
    // 正文里有大量 <feedback>、<片段1> 这类「看起来像 HTML」的文字：一律按普通文本显示
    html: false,
    // 正文里有 ${{ secrets.X }}、{{ __html }} 这类文字：整页包进 v-pre，Vue 不再当模板表达式执行
    config(md) {
      md.core.ruler.push("course-v-pre", (state) => {
        const open = new state.Token("html_block", "", 0);
        open.content = "<div v-pre>\n";
        const close = new state.Token("html_block", "", 0);
        close.content = "</div>\n";
        state.tokens.unshift(open);
        state.tokens.push(close);
      });
    },
  },
  themeConfig: {
    nav: [
      { text: "导读", link: "/第00章-课程导读与方法论" },
      { text: "配套代码", link: "/code/" },
      { text: "更新记录", link: "/CHANGELOG" },
    ],
    sidebar,
    outline: { level: [2, 3], label: "本页目录" },
    docFooter: { prev: "上一章", next: "下一章" },
    darkModeSwitchLabel: "外观",
    sidebarMenuLabel: "目录",
    returnToTopLabel: "回到顶部",
    search: {
      provider: "local",
      options: {
        miniSearch: {
          options: { tokenize, processTerm: (t: string) => t.toLowerCase() },
          searchOptions: { tokenize, prefix: true, fuzzy: 0.1, combineWith: "OR" },
        },
        translations: {
          button: { buttonText: "搜索", buttonAriaLabel: "搜索" },
          modal: {
            noResultsText: "没有找到",
            resetButtonTitle: "清除",
            footer: { selectText: "打开", navigateText: "切换", closeText: "关闭" },
          },
        },
      },
    },
  },
});
