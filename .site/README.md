# 在线阅读站点

把整个课程目录构建成一个 VitePress 文档站：左侧按篇章自动生成目录，支持中文全文搜索、深色模式和手机阅读。正文就是课程目录里的 Markdown，不需要复制或改写；新增或修改章节后，重新构建（或推送到 GitHub）即可。

站点工具都放在这个隐藏目录里，Obsidian 不会去索引 `node_modules`。

## 本地预览

```bash
cd .site
pnpm install      # 构建脚本审批已写在 pnpm-workspace.yaml
pnpm dev          # 边写边看：http://localhost:5173
pnpm build && pnpm preview   # 按线上效果预览：http://localhost:4173
```

## 发布到 GitHub Pages（推送后自动更新）

1. 在课程目录初始化 Git 仓库并推送到 GitHub（`.gitignore` 已排除构建产物、`node_modules`、`.env`、本机工具状态）：

   ```bash
   git init -b main && git add . && git commit -m "课程初版"
   gh repo create <仓库名> --public --source . --push
   ```

2. 打开仓库 **Settings → Pages**，把 **Source** 设为 **GitHub Actions**。
3. 之后每次 `git push` 到 `main`，`.github/workflows/deploy-site.yml` 会自动构建并发布。网址是 `https://<你的用户名>.github.io/<仓库名>/`。

## 哪些内容会上站点

- 上站点：README（首页）、第 00–22 章、附录、`code/README.md`、`RESOURCES.md`、`CHANGELOG.md`、`reports/`、`research/`
- 不上站点：`MISSION.md`、`NOTES.md`（个人学习目标与笔记）、`code/fixtures/`（测试用的假文档）、`research_notes/`（核查底稿）

注意：公开仓库里的**所有文件**任何人都能看到，包括不上站点的 `MISSION.md`、`NOTES.md`。介意的话：把它们移出仓库，或者改用私有仓库 + Cloudflare Pages（免费版支持私有仓库；构建命令填 `cd .site && pnpm install && pnpm build`，输出目录填 `.site/.vitepress/dist`）。GitHub Pages 要从私有仓库发布，需要付费套餐。

## 构建时做了哪些处理

- `markdown.html: false`：正文里 `<feedback>`、`<片段1>` 这类文字按普通文本显示，不会被当成 HTML 标签
- 每页正文包在 `v-pre` 里：`${{ secrets.X }}` 这类文字不会被 Vue 当成模板表达式执行
- 本地搜索使用 `Intl.Segmenter` 中文分词，并为连续汉字补两字组合（与第 13 章 `rag/keyword.ts` 同一思路）
