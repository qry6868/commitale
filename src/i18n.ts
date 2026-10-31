import { compact, fmt, pct } from './format.ts';
import type { PersonaId, Wrapped } from './stats.ts';

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

  scanning: (repos: number) => string;
  noRepos: (roots: string) => string;
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

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const en: Strings = {
  htmlLang: 'en',
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  months: EN_MONTHS,
  date: (d) => `${EN_MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`,
  hour: (h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`,

  hello: (name, year) => `${name}, here's your ${year} in code`,
  scroll: 'Scroll to begin',
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
  downloadPng: 'Download PNG',
  downloadSvg: 'Download SVG',
  copyText: 'Copy share text',
  copied: 'Copied!',
  readmeHint: 'Put the card on your GitHub profile: commit the SVG and add this to your README.',
  footer: 'Generated locally by git-wrapped. Nothing left your machine.',
  shareText: (w) => {
    const p = en.personas[w.personas[0]];
    return `My ${w.year} in code: ${fmt(w.commits)} commits, +${compact(w.added)} lines, ` +
      `a ${w.longestStreak.days}-day streak. I'm ${p.emoji} ${p.name}. Get yours: npx git-wrapped`;
  },

  cardTitle: (year) => `My ${year} in code`,
  cardCommits: 'commits',
  cardAdded: 'lines added',
  cardDays: 'active days',
  cardStreak: 'day streak',

  scanning: (n) => `Reading ${n} ${n === 1 ? 'repository' : 'repositories'}…`,
  noRepos: (roots) => `No git repositories found under ${roots}. Point git-wrapped at a folder with your projects, e.g. npx git-wrapped ~/code`,
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
  scroll: '向下滑动开始',
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
  downloadPng: '下载 PNG',
  downloadSvg: '下载 SVG',
  copyText: '复制分享文案',
  copied: '已复制！',
  readmeHint: '把卡片放到 GitHub 主页：提交这个 SVG，然后把下面这行加进 README。',
  footer: '由 git-wrapped 在本地生成，数据没有离开你的电脑。',
  shareText: (w) => {
    const p = zh.personas[w.personas[0]];
    return `我的 ${w.year} 编码年度报告：${fmt(w.commits)} 次提交，新增 ${compact(w.added)} 行代码，` +
      `最长连续 ${w.longestStreak.days} 天。我是 ${p.emoji} ${p.name}！生成你的：npx git-wrapped`;
  },

  cardTitle: (year) => `我的 ${year} 编码年度报告`,
  cardCommits: '次提交',
  cardAdded: '行新增代码',
  cardDays: '天活跃',
  cardStreak: '天连续提交',

  scanning: (n) => `正在读取 ${n} 个仓库……`,
  noRepos: (roots) => `在 ${roots} 下没有找到 git 仓库。请指定存放项目的目录，例如 npx git-wrapped ~/code`,
  noCommits: (year, who) => `${year} 年没有找到 ${who} 的提交。`,
  foundAuthors: '这些仓库里的作者：',
  tryAuthor: '用 --author <邮箱> 指定你自己，或用 --all-authors 生成团队报告。',
  youAre: '你是',
  report: '报告',
  card: '分享卡片',
  topLanguages: '常用语言',

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
