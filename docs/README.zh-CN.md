<div align="center">

# Commitale

**把你这一年的提交，讲成一个故事。** 像 Spotify Wrapped 一样回顾你这一年的 git 提交。

一条命令，扫描你电脑上的所有仓库，数据完全不离开本机。

[![npm](https://img.shields.io/npm/v/commitale?color=8b5cf6)](https://www.npmjs.com/package/commitale)
[![CI](https://github.com/qry6868/commitale/actions/workflows/ci.yml/badge.svg)](https://github.com/qry6868/commitale/actions/workflows/ci.yml)
![zero dependencies](https://img.shields.io/badge/dependencies-0-d946ef)
[![license](https://img.shields.io/badge/license-MIT-fb7185)](../LICENSE)

[English](../README.md) · 简体中文

<img src="../assets/demo-poster.svg" alt="Commitale 海报卡片，我的 2026 Coding 年度报告：Coding 时，我是夜猫子（38% 的提交在晚上 10 点到凌晨 5 点之间），AI 搭档类型是结对搭档，653 次提交、6.7 亿 AI token、最长连续 41 天。" width="760">

</div>

## 快速开始

**准备工作**：需要安装 [Node.js](https://nodejs.org) 20 或更高版本，以及 git。可以运行 `node -v` 和 `git --version` 检查；提示找不到命令的话，先安装它们。

1. **打开终端**：macOS 打开「终端」；Windows 打开 PowerShell 或 Windows Terminal。
2. **运行它**。如果 npx 问 `Ok to proceed? (y)`，按 `y` 继续。

   ```bash
   npx commitale
   ```

   Commitale 会自己找到你的仓库：在某个项目里运行，就只统计这个项目；否则先找当前文件夹下的项目，再搜索你的用户目录（Windows 上还会搜索其他磁盘），并列出找到了哪些仓库。

   只想统计特定文件夹？直接写上路径：`npx commitale ~/code` 或 `npx commitale D:\projects`。
3. **查看你的年度报告**：报告会自动在浏览器中打开，向下滑动浏览；最后一页有下载分享卡片的按钮。

报告（`commitale-2026.html`）和卡片（`commitale-2026.svg`）会保存在你运行命令时所在的文件夹里，之后可以随时再打开。遇到问题？请看[常见问题](#常见问题)。

## 你会看到什么

- **核心数据**：提交次数、新增和删除的代码行数、活跃天数、参与的仓库数，以及和去年的对比。
- **全年热力图**：覆盖所有仓库的每一天，包括公司内网和私有仓库，不只是 GitHub 上能看到的。
- **连续提交和高峰**：最长连续提交天数，以及最忙的一天。
- **你的节奏**：一天中最活跃的时段、一周中的高产日、最忙的月份。
- **难忘时刻**：年度第一次提交、最晚的一次提交（没错，就是凌晨 3:47 那次），以及最大的一次提交。
- **语言和仓库**：你的时间到底花在了哪里。
- **提交信息词云**：你最常用的词，以及有多少次提交是在修 bug。
- **你的 AI 编程年**：今年在 Claude Code 和 Codex 上消耗了多少 token、多少个会话和天数、最常用的模型、用 AI 最多的一天，以及你的 [AI 搭档类型](#ai-搭档类型)。
- **编程人格**：夜猫子、周末战士、马拉松选手、捉虫猎人……见[全部人格](#编程人格)。
- **背景音乐**：一段在浏览器里实时合成的 lo-fi 循环音乐（没有音频文件），第一次点击时开始播放，右上角的按钮可以关掉。
- **两种风格、三种尺寸的分享卡片**：醒目的海报风或信息完整的数据风；横版适合 X、LinkedIn 和 GitHub 个人主页，方形和竖版适合朋友圈、小红书和 Instagram。每种编程人格都有自己的配色，支持下载 PNG 和 SVG。

终端里也能直接看：

```
  ✦ commitale 2026  ·  Alex Chen

  653 次提交  ·  分布在 5 个仓库，共 164 天  比去年同期多 6%
  +21,851  −12,760
  ◆ AI 用量  6.7 亿 token  🤝 结对搭档  共 498 个会话，277 天在和 AI 结对编程 · Claude Code 97%, Codex 3%

  最长连续提交     41 天 3月1日 → 4月10日
  最忙的一天       3月2日 · 36 次提交
  最活跃时段       22:00
  最晚的一次提交   04:47 "docs: auth flow"

  你是 🦉 夜猫子
```

## 隐私优先

Commitale 只通过 `git log` 读取本地仓库，然后在当前目录生成两个文件：一份 HTML 报告和一张 SVG 卡片。它**不发送任何网络请求**：没有统计上报，不需要 API Token，不上传任何东西。报告离线也能打开。

AI 编程年这一页会读取 Claude Code（`~/.claude/projects`）和 Codex（`~/.codex/sessions`）在你电脑上保存的记录，但**只读取用量数字、时间和模型名**，绝不读取你的提示词、AI 的回复和代码。不想要这一页？加上 `--no-ai`。

分享卡片里不会出现仓库名和提交信息，只有留在你电脑上的报告里才有。如果要把报告本身给别人看（比如和工作相关），加上 `--anonymize`，报告里也会隐藏它们。

## 更多用法

```bash
npx commitale                       # 自动查找你的仓库
npx commitale ~/code ~/work         # 多个目录
npx commitale ~/code --year 2025    # 其他年份
npx commitale . --all-authors --name "火箭队"   # 团队报告
```

| 选项 | 说明 |
| --- | --- |
| `-y, --year <年份>` | 统计的年份。默认今年（1 月份时默认去年）。 |
| `-a, --author <身份>` | 你的邮箱或名字，可重复使用来指定多个身份。默认取全局和各仓库 git 配置里的 `user.email` 和 `user.name`。 |
| `--all-authors` | 统计所有人的提交，生成团队报告。 |
| `--name <名字>` | 报告上显示的名字。 |
| `-d, --depth <n>` | 向下搜索仓库的目录层数（默认 `3`）。 |
| `-o, --out <目录>` | 报告和卡片的输出目录（默认当前目录）。 |
| `--lang <en\|zh>` | 报告语言，默认跟随系统语言。 |
| `--anonymize` | 隐藏仓库名和提交信息。 |
| `--json` | 以 JSON 输出原始统计数据，不写文件。 |
| `--no-open` | 不自动在浏览器中打开报告。 |
| `--no-ai` | 跳过 AI 用量页。 |

### 用了多个邮箱提交？

Commitale 会自动读取每个仓库里配置的邮箱。其他邮箱（比如旧电脑、GitHub noreply 地址）可以手动添加：

```bash
npx commitale ~/code -a me@work.com -a me@home.dev -a 1234+me@users.noreply.github.com
```

如果一个提交都没匹配上，Commitale 会列出它找到的所有作者，方便你选出自己。

### 把卡片放到 GitHub 个人主页

<img src="../assets/demo-card.svg" alt="Commitale 分享卡片：653 次提交、新增 2.2 万行代码、6.7 亿 AI token、最长连续 41 天，附提交热力图和常用语言。编程人格：夜猫子；AI 搭档类型：结对搭档。" width="600">

把生成的 `commitale-2026.svg` 提交到你的个人主页仓库（`<用户名>/<用户名>`），然后在 README 中加入：

```markdown
![commitale 2026](./commitale-2026.svg)
```

## 常见问题

| 你看到的提示 | 解决方法 |
| --- | --- |
| 提示找不到 `npx`（`not recognized` 或 `command not found`） | 安装 [Node.js](https://nodejs.org) 20 或更高版本，然后重新打开一个终端窗口。 |
| PowerShell 提示 `无法加载文件 npx.ps1，因为在此系统上禁止运行脚本` | 改用 `npx.cmd commitale`。或者运行一次 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`，允许运行本地脚本。 |
| `No git repositories found …`（没有找到 git 仓库） | 直接写上存放项目的文件夹，例如 `npx commitale D:\projects`。如果项目藏在 3 层以上的子文件夹里，加上 `--depth 5`。 |
| 找到的仓库比预期少 | 调大 `--depth`。隐藏文件夹、`node_modules`、`vendor` 和构建产物文件夹会被故意跳过。 |
| `No commits by … in 2026`（没有找到你的提交） | 你的提交用的是另一个邮箱。Commitale 会列出它找到的作者，用 `-a 你的邮箱` 指定你自己。 |
| 浏览器没有自动打开 | 到你运行命令的文件夹里，手动打开 `commitale-2026.html`。 |

## 编程人格

你会得到第一个符合条件的人格，其余符合的会作为徽章显示。

| | 人格 | 获得条件 |
| --- | --- | --- |
| 🦉 | 夜猫子 | 30% 以上的提交在晚上 10 点到凌晨 5 点之间 |
| 🌅 | 早起鸟 | 25% 以上的提交在早上 5 点到 9 点之间 |
| ⚔️ | 周末战士 | 35% 以上的提交在周末 |
| 🏃 | 马拉松选手 | 连续 21 天以上每天都有提交 |
| 🐛 | 捉虫猎人 | 30% 以上的提交是修 bug |
| 🧹 | 代码清洁工 | 删除的代码比新增的多（且至少 1000 行） |
| 🌍 | 多语言玩家 | 5 种以上语言各占你改动的 5% 以上 |
| 💼 | 准点打工人 | 70% 以上的提交在工作日 9 点到 18 点之间 |
| 🧱 | 稳健建造者 | 以上都不是：你只是一直在稳定输出 |

## AI 搭档类型

现在几乎人人都在用 AI 写代码，所以重点不是用没用，而是用了多少。AI 搭档类型按今年消耗的 token 总量来分。Anthropic 公布的 Claude Code 用户平均花费约为[每个活跃日 13 美元](https://code.claude.com/docs/en/costs)，折算下来一年大约几十亿 token，所以中间档设在这个范围。

| | 类型 | 今年的 token 总量 |
| --- | --- | --- |
| 🔍 | 点到为止 | 5 亿以下 |
| 🤝 | 结对搭档 | 5 亿～20 亿 |
| 🧭 | 领航员 | 20 亿～100 亿 |
| 🎩 | 甩手掌柜 | 100 亿～400 亿 |
| 🌊 | Vibe Coder | 400 亿以上 |

## 统计规则

- **提交**：任意分支上的非合并提交，作者时间在指定年份内，按邮箱或名字匹配到你。同一个提交出现在多个克隆或 fork 中只计一次。
- **时间**：使用提交时所在的时区，出差时凌晨 2 点的提交依然算凌晨 2 点。
- **代码行数**：排除 lock 文件、构建产物、vendor 代码、压缩文件和 source map。
- **语言**：按文件扩展名识别，颜色与 GitHub Linguist 一致。
- **AI token**：输入、输出、缓存读取和缓存写入加在一起，和工具的计费口径一致。Claude Code 重复记录的同一条回复只算一次。

## 参与贡献

非常欢迎提想法、报 bug 和提 PR。新增编程人格或新语言翻译都是很好的第一次贡献。

```bash
git clone https://github.com/qry6868/commitale && cd commitale
npm install
npm run demo     # 生成带有一年历史的模拟仓库并运行
npm test
```

翻译文本都在 [`src/i18n.ts`](../src/i18n.ts) 中。

## 许可证

[MIT](../LICENSE)

<div align="center">

如果 commitale 让你会心一笑，**[点个 ⭐](https://github.com/qry6868/commitale)** 让更多开发者看到它。

</div>
