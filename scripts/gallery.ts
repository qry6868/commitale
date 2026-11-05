/**
 * The demo site's "every personality" page: a real report only ever shows your own
 * personality, so this is where people see the other badges, what earns each one, and
 * the look each one's report is drawn in, with a sample report for every personality.
 * Built by scripts/site.ts.
 */
import type { AiStyleId } from '../src/ai.ts';
import { escapeXml as esc } from '../src/format.ts';
import { strings, type Lang } from '../src/i18n.ts';
import { ART_CSS, aiArt, personaArt } from '../src/render/art.ts';
import { DISPLAY_FAMILY, FONT_FACE, HEADLINE_FAMILY } from '../src/render/font.ts';
import { LOOKS, type Look } from '../src/render/looks.ts';
import type { PersonaId, Wrapped } from '../src/stats.ts';

export const PERSONAS: PersonaId[] = ['nightOwl', 'earlyBird', 'weekendWarrior', 'marathoner', 'bugHunter', 'cleaner', 'polyglot', 'nineToFive', 'builder'];
export const AI_STYLES: AiStyleId[] = ['spotChecker', 'pairProgrammer', 'navigator', 'delegator', 'vibeCoder'];

/** Just enough of a year for every badge to show a believable number. */
const SAMPLE = {
  commits: 2148,
  latestNight: { date: '2026-03-14', time: '02:47', subject: '', repo: '' },
  nightShare: 0.38,
  byHour: [0, 0, 0, 0, 0, 3, 8, 12, ...new Array(16).fill(10)],
  weekendShare: 0.19,
  longestStreak: { days: 42, start: '', end: '' },
  fixCommits: 318,
  deleted: 12_400,
  languages: ['TypeScript', 'Rust', 'Go', 'Python', 'CSS', 'Shell'].map((name) => ({ name, color: '', lines: 1, share: 0.1 })),
  peakHour: 14,
} as unknown as Wrapped;

/** The sample report for a personality: the demo data, drawn as that personality. */
export const sampleFile = (lang: Lang, id: PersonaId): string => `${lang === 'zh' ? 'zh-' : ''}sample-${id}.html`;

/** What earns each one, matching computeStats() and aiStyle(). */
const COPY = {
  en: {
    title: 'Every personality and AI style',
    lead: 'Commitale reads your git history and tells you which coding personality you are. Most people get one; some get a few. Here are all of them, and what it takes.',
    personas: '9 coding personalities',
    ai: '5 AI styles',
    aiLead: 'From how many tokens your AI coding tools (Claude Code, Codex) used this year.',
    numbers: 'Each one’s report is drawn in its own style; open a sample to see it. Numbers on the badges are examples, and yours shows your own.',
    see: 'See its report',
    looks: { geometric: 'Flat print', pop: 'Pop comic', painterly: 'Oil paint', minimal: 'Minimal', riso: 'Riso print' } satisfies Record<Look, string>,
    sample: 'See a sample report',
    other: { href: 'zh-personalities.html', label: '中文', lang: 'zh' },
    report: './',
    rules: {
      nightOwl: 'At least 30% of your commits land between 10 PM and 5 AM.',
      earlyBird: 'At least 25% of your commits land between 5 and 9 AM.',
      weekendWarrior: 'At least 35% of your commits land on a weekend.',
      marathoner: 'You commit every day for 21 days in a row or more.',
      bugHunter: 'At least 30% of your commits are fixes.',
      cleaner: 'You delete more code than you write: at least 1,000 lines more.',
      polyglot: 'Five or more languages each make up at least 5% of your code.',
      nineToFive: 'At least 70% of your commits land on weekdays, 9 AM to 6 PM.',
      builder: 'Nothing else stands out. You just keep building.',
    } satisfies Record<PersonaId, string>,
    tiers: ['Under 500M tokens', '500M to 2B tokens', '2B to 10B tokens', '10B to 40B tokens', 'Over 40B tokens'],
  },
  zh: {
    title: '全部编程人格和 AI 搭档类型',
    lead: 'Commitale 读你的 git 记录，告诉你是哪种编程人格。大多数人是一种，有人同时是好几种。这里是全部人格，以及怎样才能拿到。',
    personas: '9 种编程人格',
    ai: '5 种 AI 搭档类型',
    aiLead: '按今年你的 AI 编程工具（Claude Code、Codex）用掉的 token 数来分。',
    numbers: '每种人格的报告都有自己的视觉风格，点开示例报告就能看到。徽章上的数字是示例，你的徽章会显示你自己的数字。',
    see: '看它的报告',
    looks: { geometric: '几何构成', pop: '波普漫画', painterly: '油画笔触', minimal: '极简', riso: '丝网印刷' } satisfies Record<Look, string>,
    sample: '看一份示例报告',
    other: { href: 'personalities.html', label: 'English', lang: 'en' },
    report: 'zh.html',
    rules: {
      nightOwl: '至少 30% 的提交在晚上 10 点到凌晨 5 点之间。',
      earlyBird: '至少 25% 的提交在早上 5 点到 9 点之间。',
      weekendWarrior: '至少 35% 的提交在周末。',
      marathoner: '连续 21 天以上，每天都有提交。',
      bugHunter: '至少 30% 的提交是在修 bug。',
      cleaner: '删掉的代码比写的多，而且多出至少 1,000 行。',
      polyglot: '至少 5 种语言，每种都占你代码的 5% 以上。',
      nineToFive: '至少 70% 的提交在工作日的早 9 点到晚 6 点之间。',
      builder: '其他都不突出：你只是一直在稳稳地写。',
    } satisfies Record<PersonaId, string>,
    tiers: ['少于 5 亿 token', '5 亿到 20 亿 token', '20 亿到 100 亿 token', '100 亿到 400 亿 token', '超过 400 亿 token'],
  },
};

export function renderGallery(lang: Lang, repo: string): string {
  const t = strings(lang);
  const c = COPY[lang];
  const card = (art: string, name: string, rule: string, extra = ''): string =>
    `<article>${art}<div><h3>${esc(name)}</h3><p>${esc(rule)}</p>${extra}</div></article>`;
  const sample = (id: PersonaId): string =>
    `<p class="look"><span>${esc(c.looks[LOOKS[id]])}</span><a href="${sampleFile(lang, id)}">${esc(c.see)} →</a></p>`;
  const personas = PERSONAS.map((id) => card(personaArt(id, id, {}, t.figures[id](SAMPLE)), t.personas[id].name, c.rules[id], sample(id))).join('\n');
  const ai = AI_STYLES.map((id, i) =>
    card(aiArt(id, id), t.aiStyles[id].name, t.aiStyles[id].desc, `<span class="tier">${esc(c.tiers[i])}</span>`),
  ).join('\n');
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.title)} · Commitale</title>
<style>${FONT_FACE}
${ART_CSS}
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0b0b12;color:#f3ebdd;font-family:'${DISPLAY_FAMILY}',system-ui,sans-serif;line-height:1.5}
main{max-width:1120px;margin:0 auto;padding:56px 20px 72px}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;font-size:14px;margin-bottom:40px}
.top a{color:inherit;text-decoration:none;opacity:.75}.top a:hover{opacity:1}
.kicker{font-weight:700;letter-spacing:.18em;font-size:13px;color:#f2c14e}
h1{font-family:'${HEADLINE_FAMILY}',Impact,sans-serif;font-weight:400;font-size:clamp(40px,7vw,76px);line-height:1;letter-spacing:.01em;text-transform:uppercase;margin:14px 0 18px}
.lead{font-size:18px;max-width:680px;color:#cfc8bb;margin:0}
.cta{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0 0}
.cta a{font:600 15px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:10px 16px;border-radius:999px;background:#f3ebdd;color:#0b0b12;text-decoration:none}
.cta a.ghost{font-family:inherit;background:none;color:#f3ebdd;border:1px solid rgba(243,235,221,.3)}
h2{font-size:22px;margin:56px 0 6px}
.note{color:#9d978c;font-size:14px;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
article{display:flex;gap:18px;align-items:center;padding:16px;border-radius:22px;background:#15151e}
article .art{flex:none;width:128px;height:128px}
h3{font-size:20px;margin:0 0 4px}
article p{margin:0;font-size:14.5px;color:#cfc8bb}
.look{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;margin:10px 0 0!important;font-size:13px!important}
.look span{font-weight:700;letter-spacing:.04em;padding:3px 9px;border-radius:999px;background:rgba(243,235,221,.1);color:#f3ebdd}
.look a{color:#f2c14e;text-decoration:none;font-weight:700}.look a:hover{text-decoration:underline}
.tier{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;letter-spacing:.04em;padding:3px 9px;border-radius:999px;background:rgba(242,193,78,.16);color:#f2c14e}
footer{margin-top:56px;font-size:13px;color:#9d978c}footer a{color:inherit}
@media (max-width:420px){article .art{width:104px;height:104px}article{gap:14px}}
</style>
</head>
<body>
<main>
<div class="top"><span class="kicker">COMMITALE</span><a href="${c.other.href}" lang="${c.other.lang}">${c.other.label}</a></div>
<h1>${esc(c.title)}</h1>
<p class="lead">${esc(c.lead)}</p>
<div class="cta"><a href="${repo}">npx commitale ↗</a><a class="ghost" href="${c.report}">${esc(c.sample)} →</a></div>
<h2>${esc(c.personas)}</h2>
<p class="note">${esc(c.numbers)}</p>
<div class="grid">
${personas}
</div>
<h2>${esc(c.ai)}</h2>
<p class="note">${esc(c.aiLead)}</p>
<div class="grid">
${ai}
</div>
<footer><a href="${repo}">github.com/qry6868/commitale</a></footer>
</main>
</body>
</html>
`;
}

/** A year's tokens inside each tier above, so a test can check them against aiStyle(). */
export const TIER_EXAMPLES = [0.25e9, 1e9, 5e9, 20e9, 60e9];
