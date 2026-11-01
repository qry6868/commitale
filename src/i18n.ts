import { compact, fmt, pct } from './format.ts';
import type { AiStyleId } from './ai.ts';
import type { CommitType, PersonaId, Wrapped } from './stats.ts';

export type Lang = 'en' | 'zh';

export interface Persona {
  emoji: string;
  name: string;
  desc: (w: Wrapped) => string;
}

export interface Strings {
  htmlLang: string;
  weekdays: string[];
  months: string[];
  date: (isoDate: string) => string;
  hour: (h: number) => string;

  hello: (name: string, year: number) => string;
  scroll: string;
  commitsLabel: string;
  commitsSub: (repos: number, days: number) => string;
  showedUp: (pct: number) => string;
  linesTitle: string;
  added: string;
  deleted: string;
  pages: (n: string) => string;
  heatTitle: string;
  streak: string;
  days: (n: number) => string;
  busiest: string;
  commitsN: (n: number) => string;
  rhythmTitle: string;
  peakHour: (h: string) => string;
  peakLabel: string;
  peakDay: (d: string) => string;
  peakMonth: (m: string) => string;
  momentsTitle: string;
  first: string;
  last: string;
  latest: string;
  biggest: string;
  linesN: (n: string) => string;
  langTitle: string;
  reposTitle: string;
  wordsTitle: string;
  fixes: (n: number, pct: number) => string;
  avgLen: (n: number) => string;
  personaIntro: string;
  alsoYou: string;
  shareTitle: string;
  formats: { wide: string; square: string; story: string };
  downloadPng: string;
  downloadSvg: string;
  copyText: string;
  copied: string;
  readmeHint: string;
  footer: string;
  shareText: (w: Wrapped) => string;

  cardTitle: (year: number) => string;
  cardCommits: string;
  cardAdded: string;
  cardDays: string;
  cardStreak: string;
  cardVs: (pct: number, year: number, partial: boolean) => string;
  vsYear: (pct: number, year: number, partial: boolean) => string;
  lastYearStreak: (n: number, partial: boolean) => string;

  tokens: (n: number) => string;
  tokensLabel: string;
  aiTitle: string;
  aiSub: (sessions: number, days: number) => string;
  aiTools: string;
  aiModels: string;
  aiBusiest: (date: string, tokens: string) => string;
  aiPerCommit: (tokens: string) => string;
  aiNote: string;
  cardTokens: string;
  readingAi: string;
  terminalAi: string;
  aiStyleIntro: string;
  aiBreakdownTitle: string;
  music: string;
  typesTitle: string;
  iAm: string;
  topRepos: string;
  cardTypes: string;
  myAiStyle: string;
  styles: { poster: string; data: string };
  types: Record<CommitType, string>;
  wordsCloud: string;
  summaryTitle: (year: number) => string;
  shareHint: string;
  soundHint: string;
  monthsTitle: string;
  weekdaysTitle: string;
  linesMix: string;
  net: (n: number) => string;
  less: string;
  more: string;
  aiCache: (pct: number) => string;
  aiStyles: Record<AiStyleId, { emoji: string; name: string; short: string; desc: string }>;

  searching: (roots: string) => string;
  found: (names: string[]) => string;
  scanning: (repos: number) => string;
  noRepos: (roots: string) => string;
  noReposAnywhere: string;
  noGit: string;
  scanTimeout: (root: string) => string;
  repoTimeout: (names: string[]) => string;
  noCommits: (year: number, who: string) => string;
  foundAuthors: string;
  tryAuthor: string;
  youAre: string;
  report: string;
  card: string;
  topLanguages: string;

  personas: Record<PersonaId, Persona>;
}

const activeLanguages = (w: Wrapped): number => w.languages.filter((l) => l.share >= 0.05).length;

/** +32% / −12%, with a real minus sign. */
const signed = (p: number): string => `${p >= 0 ? '+' : '−'}${Math.abs(p)}%`;

/** Large numbers the Chinese way: 8,600, 3.2 万, 12.4 亿. */
const zhNumber = (n: number): string => {
  if (n >= 1e8) return `${parseFloat((n / 1e8).toFixed(1))} 亿`;
  if (n >= 1e4) return `${parseFloat((n / 1e4).toFixed(1))} 万`;
  return fmt(n);
};

/** The first few names, then a count of the rest. */
const listNames = (names: string[], more: (n: number) => string, shown = 8): string =>
  names.length <= shown ? names.join(', ') : `${names.slice(0, shown).join(', ')} ${more(names.length - shown)}`;

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const en: Strings = {
  htmlLang: 'en',
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  months: EN_MONTHS,
  date: (d) => `${EN_MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`,
  hour: (h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`,

  hello: (name, year) => `${name}, here's your ${year} in code`,
  scroll: 'Tap or press → to begin',
  commitsLabel: 'commits',
  commitsSub: (repos, days) => `across ${fmt(repos)} ${repos === 1 ? 'repo' : 'repos'}, on ${fmt(days)} different days`,
  showedUp: (p) => `You showed up on ${p}% of the days this year.`,
  linesTitle: 'Lines of code',
  added: 'added',
  deleted: 'deleted',
  pages: (n) => `Printed out, that's about ${n} pages of code.`,
  heatTitle: 'Your year, day by day',
  streak: 'Longest streak',
  days: (n) => `${fmt(n)} ${n === 1 ? 'day' : 'days'}`,
  busiest: 'Busiest day',
  commitsN: (n) => `${fmt(n)} ${n === 1 ? 'commit' : 'commits'}`,
  rhythmTitle: 'When you code',
  peakHour: (h) => `You peak at ${h}.`,
  peakLabel: 'Peak hour',
  peakDay: (d) => `${d} is your power day.`,
  peakMonth: (m) => `${m} was your biggest month.`,
  momentsTitle: 'Moments',
  first: 'First commit of the year',
  last: 'Most recent commit',
  latest: 'Latest-night commit',
  biggest: 'Biggest commit',
  linesN: (n) => `${n} lines`,
  langTitle: 'Your languages',
  reposTitle: 'Where you spent your time',
  wordsTitle: 'In your own words',
  fixes: (n, p) => `${fmt(n)} commits (${p}%) were fixes.`,
  avgLen: (n) => `Your average commit message is ${n} characters long.`,
  personaIntro: 'Your coding personality is…',
  alsoYou: 'Also spotted:',
  shareTitle: 'Share your year',
  formats: { wide: 'Wide', square: 'Square', story: 'Story' },
  downloadPng: 'Download PNG',
  downloadSvg: 'Download SVG',
  copyText: 'Copy share text',
  copied: 'Copied!',
  readmeHint: 'Put the card on your GitHub profile: commit the SVG and add this to your README.',
  footer: 'Generated locally by Commitale. Nothing left your machine.',
  shareText: (w) => {
    const p = en.personas[w.personas[0]];
    return `My ${w.year} in code: ${fmt(w.commits)} commits, +${compact(w.added)} lines, ` +
      `a ${w.longestStreak.days}-day streak. I'm ${p.emoji} ${p.name}. Get yours: npx commitale`;
  },

  cardTitle: (year) => `My ${year} in code`,
  cardCommits: 'commits',
  cardAdded: 'lines added',
  cardDays: 'active days',
  cardStreak: 'day coding streak',
  cardVs: (p, y, partial) => (partial ? `${signed(p)} YoY` : `${signed(p)} vs ${y}`),
  vsYear: (p, y, partial) => (partial ? `${signed(p)} vs the same time last year` : `${signed(p)} vs ${y}`),
  lastYearStreak: (n, partial) => `${partial ? 'This time last year' : 'Last year'}: ${fmt(n)} ${n === 1 ? 'day' : 'days'}`,

  tokens: (n) => compact(n),
  tokensLabel: 'tokens',
  aiTitle: 'Your AI pair-programming year',
  aiSub: (sessions, days) => `across ${fmt(sessions)} ${sessions === 1 ? 'session' : 'sessions'}, on ${fmt(days)} ${days === 1 ? 'day' : 'days'}`,
  aiTools: 'By tool',
  aiModels: 'Top models',
  aiBusiest: (date, tokens) => `Your biggest AI day was ${date}: ${tokens} tokens.`,
  aiPerCommit: (tokens) => `That's about ${tokens} tokens per commit.`,
  aiNote: 'Includes cached tokens. Read on your machine from usage counts only, never your prompts or code.',
  cardTokens: 'AI coding tokens',
  readingAi: 'Reading AI usage counts from Claude Code and Codex logs…',
  terminalAi: 'AI usage',
  aiStyleIntro: 'Your AI style',
  aiBreakdownTitle: 'Where the tokens went',
  music: 'Music',
  typesTitle: 'What you committed',
  iAm: "As a coder, I'm",
  topRepos: 'Top repos',
  cardTypes: 'What I shipped',
  myAiStyle: 'My AI style',
  styles: { poster: 'Poster', data: 'Stats' },
  types: { feature: 'Features', fix: 'Fixes', refactor: 'Refactors', docs: 'Docs', test: 'Tests', chore: 'Chores', other: 'Other' },
  wordsCloud: 'Words you used most',
  summaryTitle: (y) => `That was your ${y}`,
  shareHint: 'Pick a size, then download it or copy the caption.',
  soundHint: 'Best with sound on',
  monthsTitle: 'Commits by month',
  weekdaysTitle: 'By weekday',
  linesMix: 'Added vs deleted',
  net: (n) => `Net ${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))} lines`,
  less: 'Less',
  more: 'More',
  aiCache: (p) => `${p}% of them were cache reads: the AI re-reading your conversation on every step, which is why the number is so big.`,
  aiStyles: {
    spotChecker: { emoji: '🔍', name: 'The Spot Checker', short: 'Spot Checker', desc: 'You ask AI the odd question and write most of the code yourself.' },
    pairProgrammer: { emoji: '🤝', name: 'The Pair Programmer', short: 'Pair Coder', desc: 'You and the AI take turns at the keyboard.' },
    navigator: { emoji: '🧭', name: 'The Navigator', short: 'Navigator', desc: 'You set the direction, the AI drives.' },
    delegator: { emoji: '🎩', name: 'The Delegator', short: 'Delegator', desc: 'You describe it, the AI ships it.' },
    vibeCoder: { emoji: '🌊', name: 'The Vibe Coder', short: 'Vibe Coder', desc: 'You bring the vibe, the AI brings the code.' },
  },

  searching: (roots) => `Looking for git repositories in ${roots}…`,
  found: (names) =>
    `Found ${names.length} ${names.length === 1 ? 'repository' : 'repositories'}: ${listNames(names, (more) => `and ${more} more`)}`,
  scanning: (n) => `Reading ${n} ${n === 1 ? 'repository' : 'repositories'}…`,
  noRepos: (roots) => `No git repositories found under ${roots}. Point Commitale at a folder with your projects, e.g. npx commitale ~/code`,
  noGit: "Commitale needs git, but it isn't installed or isn't on your PATH. Install it from https://git-scm.com, then open a new terminal.",
  scanTimeout: (root) => `Stopped scanning ${root} early because it was slow. Name a folder to scan it fully.`,
  repoTimeout: (names) => `Skipped ${names.length} ${names.length === 1 ? 'repository' : 'repositories'} that took over 2 minutes to read: ${names.join(', ')}`,
  noReposAnywhere:
    'No git repositories found in your home folder or on your drives. Point Commitale at your projects folder, e.g. npx commitale D:\\projects',
  noCommits: (year, who) => `No commits by ${who} in ${year}.`,
  foundAuthors: 'Authors found in these repos:',
  tryAuthor: 'Pick yours with --author <email>, or use --all-authors for a team report.',
  youAre: 'You are',
  report: 'Report',
  card: 'Share card',
  topLanguages: 'Top languages',

  personas: {
    nightOwl: {
      emoji: '🦉',
      name: 'The Night Owl',
      desc: (w) => `${pct(w.nightShare)}% of your commits landed between 10 PM and 5 AM. Your best ideas show up after dark.`,
    },
    earlyBird: {
      emoji: '🌅',
      name: 'The Early Bird',
      desc: () => 'You ship before standup. The coffee is still hot when your first commit lands.',
    },
    weekendWarrior: {
      emoji: '⚔️',
      name: 'The Weekend Warrior',
      desc: (w) => `${pct(w.weekendShare)}% of your commits happened on weekends. Side projects fear you.`,
    },
    marathoner: {
      emoji: '🏃',
      name: 'The Marathoner',
      desc: (w) => `${w.longestStreak.days} days in a row. Consistency is your superpower.`,
    },
    bugHunter: {
      emoji: '🐛',
      name: 'The Bug Hunter',
      desc: (w) => `${pct(w.fixCommits / w.commits)}% of your commits were fixes. Someone has to keep the lights on.`,
    },
    cleaner: {
      emoji: '🧹',
      name: 'The Cleaner',
      desc: () => 'You deleted more code than you wrote. The best code is no code.',
    },
    polyglot: {
      emoji: '🌍',
      name: 'The Polyglot',
      desc: (w) => `${activeLanguages(w)} languages in serious rotation. You don't pick sides.`,
    },
    nineToFive: {
      emoji: '💼',
      name: 'The Professional',
      desc: () => 'Weekdays, office hours, clean commits. Work-life balance: unlocked.',
    },
    builder: {
      emoji: '🧱',
      name: 'The Steady Builder',
      desc: () => 'Commit by commit, day by day, you built something real this year.',
    },
  },
};

const zh: Strings = {
  htmlLang: 'zh-CN',
  weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  date: (d) => `${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`,
  hour: (h) => `${h}:00`,

  hello: (name, year) => `${name}，这是你的 ${year} 编码年度报告`,
  scroll: '点击或按 → 开始',
  commitsLabel: '次提交',
  commitsSub: (repos, days) => `分布在 ${fmt(repos)} 个仓库，共 ${fmt(days)} 天`,
  showedUp: (p) => `今年有 ${p}% 的日子里，你都写了代码。`,
  linesTitle: '代码行数',
  added: '新增',
  deleted: '删除',
  pages: (n) => `如果打印出来，大约有 ${n} 页纸。`,
  heatTitle: '你的一年，每一天',
  streak: '最长连续提交',
  days: (n) => `${fmt(n)} 天`,
  busiest: '最忙的一天',
  commitsN: (n) => `${fmt(n)} 次提交`,
  rhythmTitle: '你什么时候写代码',
  peakHour: (h) => `你最活跃的时间是 ${h}。`,
  peakLabel: '最活跃时段',
  peakDay: (d) => `${d}是你的高产日。`,
  peakMonth: (m) => `${m}是你最忙的月份。`,
  momentsTitle: '难忘时刻',
  first: '年度第一次提交',
  last: '最近一次提交',
  latest: '最晚的一次提交',
  biggest: '最大的一次提交',
  linesN: (n) => `${n} 行`,
  langTitle: '你的编程语言',
  reposTitle: '你的时间花在了哪里',
  wordsTitle: '你的提交信息',
  fixes: (n, p) => `${fmt(n)} 次提交（${p}%）是在修 bug。`,
  avgLen: (n) => `你的提交信息平均 ${n} 个字符。`,
  personaIntro: '你的编程人格是……',
  alsoYou: '你还是：',
  shareTitle: '分享你的年度报告',
  formats: { wide: '横版', square: '方形', story: '竖版' },
  downloadPng: '下载 PNG',
  downloadSvg: '下载 SVG',
  copyText: '复制分享文案',
  copied: '已复制！',
  readmeHint: '把卡片放到 GitHub 主页：提交这个 SVG，然后把下面这行加进 README。',
  footer: '由 Commitale 在本地生成，数据没有离开你的电脑。',
  shareText: (w) => {
    const p = zh.personas[w.personas[0]];
    return `我的 ${w.year} 编码年度报告：${fmt(w.commits)} 次提交，新增 ${compact(w.added)} 行代码，` +
      `最长连续 ${w.longestStreak.days} 天。我是 ${p.emoji} ${p.name}！生成你的：npx commitale`;
  },

  cardTitle: (year) => `我的 ${year} 编程年度报告`,
  cardCommits: '次代码提交',
  cardAdded: '行新增代码',
  cardDays: '天活跃',
  cardStreak: '天连续写代码',
  cardVs: (p, y, partial) => (partial ? `同比 ${signed(p)}` : `较 ${y} 年 ${signed(p)}`),
  vsYear: (p, y, partial) => `比${partial ? '去年同期' : ` ${y} 年`}${p >= 0 ? '多' : '少'} ${Math.abs(p)}%`,
  lastYearStreak: (n, partial) => `${partial ? '去年同期' : '去年'}：${fmt(n)} 天`,

  tokens: (n) => zhNumber(n),
  tokensLabel: 'token',
  aiTitle: '你的 AI 编程年',
  aiSub: (sessions, days) => `共 ${fmt(sessions)} 个会话，${fmt(days)} 天在和 AI 结对编程`,
  aiTools: '按工具',
  aiModels: '最常用的模型',
  aiBusiest: (date, tokens) => `用 AI 最多的一天是 ${date}，消耗了 ${tokens} token。`,
  aiPerCommit: (tokens) => `平均每次提交消耗约 ${tokens} token。`,
  aiNote: '包含缓存 token。只在你的电脑上读取用量数字，不读取你的提示词和代码。',
  cardTokens: 'AI 编程 token',
  readingAi: '正在读取 Claude Code 和 Codex 记录中的用量数字……',
  terminalAi: 'AI 用量',
  aiStyleIntro: '你的 AI 搭档类型',
  aiBreakdownTitle: 'token 都花在了哪里',
  music: '音乐',
  typesTitle: '你都提交了什么',
  iAm: '写代码时，我是',
  topRepos: '最常提交的仓库',
  cardTypes: '我都提交了什么',
  myAiStyle: '我的 AI 搭档类型',
  styles: { poster: '海报', data: '数据' },
  types: { feature: '新功能', fix: '修 bug', refactor: '重构', docs: '文档', test: '测试', chore: '杂项', other: '其他' },
  wordsCloud: '最常用的词',
  summaryTitle: (y) => `这就是你的 ${y}`,
  shareHint: '选一个尺寸，下载图片或复制分享文案。',
  soundHint: '建议打开声音',
  monthsTitle: '每月提交',
  weekdaysTitle: '按星期',
  linesMix: '新增与删除',
  net: (n) => `净${n >= 0 ? '增' : '减'} ${fmt(Math.abs(n))} 行`,
  less: '少',
  more: '多',
  aiCache: (p) => `其中 ${p}% 是缓存读取：AI 每走一步都要重读一遍你们的对话，所以数字才这么大。`,
  aiStyles: {
    spotChecker: { emoji: '🔍', name: '点到为止', short: '点到为止', desc: 'AI 偶尔问一问，代码主要自己写。' },
    pairProgrammer: { emoji: '🤝', name: '结对搭档', short: '结对搭档', desc: '你和 AI 轮流握键盘。' },
    navigator: { emoji: '🧭', name: '领航员', short: '领航员', desc: '你指方向，AI 开车。' },
    delegator: { emoji: '🎩', name: '甩手掌柜', short: '甩手掌柜', desc: '你提需求，AI 交付。' },
    vibeCoder: { emoji: '🌊', name: 'Vibe Coder', short: 'Vibe Coder', desc: '你负责感觉，AI 负责代码。' },
  },

  searching: (roots) => `正在 ${roots} 中查找 git 仓库……`,
  found: (names) => `找到 ${names.length} 个仓库：${listNames(names, (more) => `等 ${more} 个`)}`,
  scanning: (n) => `正在读取 ${n} 个仓库……`,
  noRepos: (roots) => `在 ${roots} 下没有找到 git 仓库。请指定存放项目的目录，例如 npx commitale ~/code`,
  noGit: 'Commitale 需要 git，但没有检测到（可能没安装，或不在 PATH 里）。请从 https://git-scm.com 安装，然后重新打开终端。',
  scanTimeout: (root) => `${root} 扫描太慢，已提前停止。可以直接指定文件夹来完整扫描。`,
  repoTimeout: (names) => `有 ${names.length} 个仓库读取超过 2 分钟，已跳过：${names.join('、')}`,
  noReposAnywhere: '在你的用户目录和各个磁盘上都没有找到 git 仓库。请指定存放项目的目录，例如 npx commitale D:\\projects',
  noCommits: (year, who) => `${year} 年没有找到 ${who} 的提交。`,
  foundAuthors: '这些仓库里的作者：',
  tryAuthor: '用 --author <邮箱> 指定你自己，或用 --all-authors 生成团队报告。',
  youAre: '你是',
  report: '报告',
  card: '分享卡片',
  topLanguages: '常用编程语言',

  personas: {
    nightOwl: {
      emoji: '🦉',
      name: '夜猫子',
      desc: (w) => `${pct(w.nightShare)}% 的提交发生在晚上 10 点到凌晨 5 点之间。你的灵感总在天黑后出现。`,
    },
    earlyBird: {
      emoji: '🌅',
      name: '早起鸟',
      desc: () => '站会还没开，你的代码已经提交了。咖啡都还是热的。',
    },
    weekendWarrior: {
      emoji: '⚔️',
      name: '周末战士',
      desc: (w) => `${pct(w.weekendShare)}% 的提交发生在周末。副业项目都怕你。`,
    },
    marathoner: {
      emoji: '🏃',
      name: '马拉松选手',
      desc: (w) => `连续 ${w.longestStreak.days} 天提交代码。坚持就是你的超能力。`,
    },
    bugHunter: {
      emoji: '🐛',
      name: '捉虫猎人',
      desc: (w) => `${pct(w.fixCommits / w.commits)}% 的提交都是在修 bug。总得有人守护线上稳定。`,
    },
    cleaner: {
      emoji: '🧹',
      name: '代码清洁工',
      desc: () => '你删的代码比写的还多。最好的代码就是没有代码。',
    },
    polyglot: {
      emoji: '🌍',
      name: '多语言玩家',
      desc: (w) => `今年认真用了 ${activeLanguages(w)} 种语言。你从不站队。`,
    },
    nineToFive: {
      emoji: '💼',
      name: '准点打工人',
      desc: () => '工作日、上班时间、干净的提交。工作生活平衡大师。',
    },
    builder: {
      emoji: '🧱',
      name: '稳健建造者',
      desc: () => '一次提交接着一次提交，你今年踏踏实实地造出了东西。',
    },
  },
};

export function strings(lang: Lang): Strings {
  return lang === 'zh' ? zh : en;
}

export function detectLang(): Lang {
  const env = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || '';
  const locale = env || Intl.DateTimeFormat().resolvedOptions().locale;
  return locale.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
