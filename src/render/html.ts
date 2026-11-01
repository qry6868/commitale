import { calendar, escapeXml as esc, fmt, heatLevels, onDark, pct } from '../format.ts';
import type { Strings } from '../i18n.ts';
import { aiStyle } from '../ai.ts';
import { change, type CommitType, type Moment, type Wrapped } from '../stats.ts';
import { CARD_SIZES, FONT, type CardFormat } from './card.ts';
import { DISPLAY_FAMILY, FONT_FACE } from './font.ts';
import { themeFor, type Theme } from './theme.ts';

/** Deep tones for the pages before the reveal, so each one feels like a new story. */
const SLIDE_COLORS = [
  ['#6d28d9', '#be185d'],
  ['#1d4ed8', '#6d28d9'],
  ['#047857', '#0e7490'],
  ['#b45309', '#be123c'],
  ['#0f766e', '#1d4ed8'],
  ['#9d174d', '#7c2d12'],
  ['#4338ca', '#0891b2'],
  ['#a21caf', '#4f46e5'],
];

const LINES_PER_PAGE = 50;
const FORMATS: CardFormat[] = ['wide', 'square', 'story'];
const STYLES = ['poster', 'data'] as const;

/** Every card the summary page can show: poster and stats styles, in each size. */
export type Cards = Record<(typeof STYLES)[number], Record<CardFormat, string>>;

interface Slide {
  body: string;
  /** Glow colors; pages showing themed data wear the personality's colors. */
  colors?: string[];
}

export function renderHtml(w: Wrapped, t: Strings, cards: Cards): string {
  const theme = themeFor(w);
  const slides: Slide[] = [
    { body: intro(w, t, theme), colors: theme.glow },
    { body: commits(w, t) },
    ...ai(w, t).map((body) => ({ body })),
    { body: lines(w, t) },
    { body: heatmap(w, t, theme), colors: theme.glow },
    { body: rhythm(w, t) },
    { body: moments(w, t) },
    { body: languages(w, t) },
    { body: repos(w, t) },
    { body: words(w, t) },
    { body: persona(w, t), colors: theme.glow },
    { body: share(w, t, cards), colors: theme.glow },
  ].filter((s) => Boolean(s.body));

  let plain = 0;
  const sections = slides
    .map((s) => {
      const [c1, c2] = s.colors ?? SLIDE_COLORS[plain++ % SLIDE_COLORS.length];
      return `<section class="slide" style="--c1:${c1};--c2:${c2}"><div class="inner">${s.body}</div></section>`;
    })
    .join('\n')
    // `<p class="sub" ${reveal(2)}>` would carry two class attributes, and browsers drop the second.
    .replace(/class="([^"]+)" class="reveal" style="/g, 'class="$1 reveal" style="');

  const shareText = JSON.stringify(t.shareText(w)).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>commitale ${w.year} · ${esc(w.name)}</title>
<style>${FONT_FACE}
${CSS}
:root{--accent:${theme.accent};--g1:${theme.glow[0]};--g2:${theme.heat[4]}}</style>
</head>
<body>
<div class="progress" aria-hidden="true">${slides.map(() => '<i><b></b></i>').join('')}</div>
${sections}
<div class="nav"><button class="prev" aria-label="Previous">‹</button><button class="next" aria-label="Next">›</button></div>
<button class="music" aria-pressed="false" aria-label="${esc(t.music)}" title="${esc(t.music)}" hidden><i></i><i></i><i></i></button>
<script>
const SHARE_TEXT = ${shareText};
const YEAR = ${w.year};
const SIZES = ${JSON.stringify(CARD_SIZES)};
const COPIED = ${JSON.stringify(t.copied)};
${SCRIPT}
</script>
</body>
</html>
`;
}

const reveal = (d: number): string => `class="reveal" style="--d:${d}"`;
const count = (n: number, prefix = ''): string =>
  `<span data-count="${n}" data-prefix="${prefix}">${prefix}${fmt(n)}</span>`;

/** "+32% vs 2025" under a number, green when up and pink when down. */
function delta(now: number, before: number | undefined, w: Wrapped, t: Strings, d: number): string {
  return deltaTag(change(now, before), w.previous, t, d);
}

function deltaTag(p: number | undefined, base: { year: number; partial: boolean } | undefined, t: Strings, d: number): string {
  if (p === undefined || !base) return '';
  return `<p class="delta ${p >= 0 ? 'up' : 'down'}" ${reveal(d)}>${esc(t.vsYear(p, base.year, base.partial))}</p>`;
}

/** The year's commit calendar as grid cells, coloured on the theme's heat scale. */
function heatCells(w: Wrapped, theme: Theme, titles?: Strings): { cells: string; cols: number } {
  const level = heatLevels(w.daily);
  const { cells, cols } = calendar(w.year);
  const html = cells
    .map((c) => {
      const n = w.daily[c.date] ?? 0;
      const title = titles ? ` title="${esc(titles.date(c.date))} · ${esc(titles.commitsN(n))}"` : '';
      return `<i style="grid-area:${c.row + 1}/${c.col + 1};background:${theme.heat[level(n)]};--i:${c.col}"${title}></i>`;
    })
    .join('');
  return { cells: html, cols };
}

function intro(w: Wrapped, t: Strings, theme: Theme): string {
  // A wordless preview of the year: the heatmap, small, rippling in left to right.
  const { cells, cols } = heatCells(w, theme);
  return `<div class="backdrop" aria-hidden="true"><div class="hero-year">${w.year}</div></div>
<div class="kicker" ${reveal(0)}>commitale · ${w.year}</div>
<h1 ${reveal(1)}>${esc(t.hello(w.name, w.year))}</h1>
<div ${reveal(2)}><div class="heat mini" aria-hidden="true" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${cells}</div></div>
<div class="hint" ${reveal(3)}>${esc(t.scroll)} <span class="arrow">→</span></div>
<div class="label sound" ${reveal(4)}>🎧 ${esc(t.soundHint)}</div>`;
}

function commits(w: Wrapped, t: Strings): string {
  const max = Math.max(...w.byMonth, 1);
  const columns = w.byMonth
    .map((v, m) => {
      const peak = m === w.peakMonth;
      return `<div class="col${peak ? ' peak' : ''}" style="--v:${(v / max).toFixed(3)};--i:${m}" title="${esc(t.months[m])} · ${esc(t.commitsN(v))}">${peak ? `<b>${fmt(v)}</b>` : ''}<i></i><span>${esc(t.months[m])}</span></div>`;
    })
    .join('');
  return `<div class="split">
<div>
  <div class="big" ${reveal(0)}>${count(w.commits)}</div>
  <h2 ${reveal(1)}>${esc(t.commitsLabel)}</h2>
  ${delta(w.commits, w.previous?.commits, w, t, 2)}
  <p class="sub" ${reveal(2)}>${esc(t.commitsSub(w.repos, w.activeDays))}</p>
  <p class="sub" ${reveal(3)}>${esc(t.showedUp(pct(w.activeDays / w.daysInYear)))}</p>
</div>
<div class="viz" ${reveal(3)}>
  <div class="viz-title">${esc(t.monthsTitle)}</div>
  <div class="cols">${columns}</div>
  <p class="label">${esc(t.peakMonth(t.months[w.peakMonth]))}</p>
</div>
</div>`;
}

function lines(w: Wrapped, t: Strings): string {
  const pages = Math.max(1, Math.round(w.added / LINES_PER_PAGE));
  const total = w.added + w.deleted || 1;
  return `<div class="kicker" ${reveal(0)}>${esc(t.linesTitle)}</div>
<div class="split">
<div>
  <div class="big plus" ${reveal(1)}>${count(w.added, '+')}</div>
  <div class="label" ${reveal(1)}>${esc(t.added)}</div>
  ${delta(w.added, w.previous?.added, w, t, 1)}
  <div class="big minus" ${reveal(2)}>${count(w.deleted, '−')}</div>
  <div class="label" ${reveal(2)}>${esc(t.deleted)}</div>
</div>
<div class="viz" ${reveal(3)}>
  <div class="viz-title">${esc(t.linesMix)}</div>
  <div class="ratio"><i class="a" style="flex:${w.added}"></i><i class="d" style="flex:${w.deleted}"></i></div>
  <div class="legend"><span><i class="dot a"></i>${esc(t.added)} ${pct(w.added / total)}%</span><span><i class="dot d"></i>${esc(t.deleted)} ${pct(w.deleted / total)}%</span></div>
  <div class="fact">${esc(t.net(w.added - w.deleted))}</div>
  <p class="label">${esc(t.pages(fmt(pages)))}</p>
</div>
</div>`;
}

function heatmap(w: Wrapped, t: Strings, theme: Theme): string {
  const { cells: grid, cols } = heatCells(w, theme, t);
  const { cells } = calendar(w.year);
  const months = t.months
    .map((m, i) => {
      const first = cells.find((c) => Number(c.date.slice(5, 7)) === i + 1)!;
      return `<span style="grid-column:${first.col + 1}">${esc(m)}</span>`;
    })
    .join('');
  const columns = `grid-template-columns:repeat(${cols},minmax(0,1fr))`;
  const scale = theme.heat.map((c) => `<i style="background:${c}"></i>`).join('');
  const s = w.longestStreak;
  const lastYear = w.previous ? `<div class="label">${esc(t.lastYearStreak(w.previous.longestStreak, w.previous.partial))}</div>` : '';
  return `<div class="kicker" ${reveal(0)}>${esc(t.heatTitle)}</div>
<div ${reveal(1)}>
  <div class="months" style="${columns}">${months}</div>
  <div class="heat" style="${columns}">${grid}</div>
  <div class="scale"><span>${esc(t.less)}</span>${scale}<span>${esc(t.more)}</span></div>
</div>
<div class="facts">
  <div ${reveal(2)}><div class="label">${esc(t.streak)}</div><div class="fact">${esc(t.days(s.days))}</div><div class="label">${esc(t.date(s.start))} → ${esc(t.date(s.end))}</div>${lastYear}</div>
  <div ${reveal(3)}><div class="label">${esc(t.busiest)}</div><div class="fact">${esc(t.date(w.busiestDay.date))}</div><div class="label">${esc(t.commitsN(w.busiestDay.commits))}</div></div>
</div>`;
}

function rhythm(w: Wrapped, t: Strings): string {
  const maxHour = Math.max(...w.byHour, 1);
  const hours = w.byHour
    .map((v, h) => `<i class="${h === w.peakHour ? 'peak' : ''}" style="height:${Math.max(2, (v / maxHour) * 100)}%;--i:${h}" title="${esc(t.hour(h))} · ${esc(t.commitsN(v))}"></i>`)
    .join('');
  const ticks = [0, 6, 12, 18].map((h) => `<span style="left:${(h / 24) * 100}%">${esc(t.hour(h))}</span>`).join('');
  const maxDay = Math.max(...w.byWeekday, 1);
  // Only the peak gets colour; the rest stay quiet so the answer stands out.
  const days = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => `<div class="row${d === w.peakWeekday ? ' peak' : ''}"><span>${esc(t.weekdays[d])}</span><b><i style="width:${(w.byWeekday[d] / maxDay) * 100}%"></i></b><em>${fmt(w.byWeekday[d])}</em></div>`)
    .join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.rhythmTitle)}</div>
<h2 ${reveal(1)}>${esc(t.peakHour(t.hour(w.peakHour)))}</h2>
<div class="split">
<div ${reveal(2)}>
  <div class="hours">${hours}</div>
  <div class="ticks">${ticks}</div>
</div>
<div class="viz" ${reveal(3)}>
  <div class="viz-title">${esc(t.weekdaysTitle)}</div>
  <div class="rows days">${days}</div>
  <p class="label">${esc(t.peakDay(t.weekdays[w.peakWeekday]))}</p>
</div>
</div>`;
}

function moments(w: Wrapped, t: Strings): string {
  const card = (icon: string, label: string, m: Moment, d: number, extra = ''): string => `<div class="moment" ${reveal(d)}>
  <span class="icon" aria-hidden="true">${icon}</span>
  <div class="label">${esc(label)}</div>
  <div class="when">${esc(t.date(m.date))} · ${m.time}</div>
  ${m.subject ? `<blockquote>${esc(m.subject)}</blockquote>` : ''}
  <div class="label">${esc(m.repo)}${extra}</div>
</div>`;
  const cards = [
    card('🌅', t.first, w.firstCommit, 1),
    w.latestNight ? card('🌙', t.latest, w.latestNight, 2) : '',
    card('💥', t.biggest, w.biggestCommit, 3, ` · ${esc(t.linesN(fmt(w.biggestCommit.lines)))}`),
    card('🏁', t.last, w.lastCommit, 4),
  ].join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.momentsTitle)}</div><div class="moments">${cards}</div>`;
}

function languages(w: Wrapped, t: Strings): string {
  if (w.languages.length === 0) return '';
  const top = w.languages.slice(0, 6);
  const max = top[0].share;
  const rows = top
    .map((l, i) => `<div class="row" ${reveal(i + 1)}><span>${esc(l.name)}</span><b><i style="width:${(l.share / max) * 100}%;background:${onDark(l.color)}"></i></b><em>${pct(l.share)}%</em></div>`)
    .join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.langTitle)}</div>
<h2 ${reveal(0)}>${esc(top[0].name)}</h2>
<div class="rows wide">${rows}</div>`;
}

function repos(w: Wrapped, t: Strings): string {
  const max = w.topRepos[0]?.commits || 1;
  const rows = w.topRepos
    .map((r, i) => `<li ${reveal(i + 1)}><span class="rank">${i + 1}</span><span class="name">${esc(r.name)}<span class="share"><i style="width:${(r.commits / max) * 100}%"></i></span></span><span class="meta">${esc(t.commitsN(r.commits))}<br><span class="plus">+${fmt(r.added)}</span> <span class="minus">−${fmt(r.deleted)}</span></span></li>`)
    .join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.reposTitle)}</div><ol class="repos">${rows}</ol>`;
}

/** Fixed colours per commit type (validated categorical slots; "other" stays neutral). */
const TYPE_COLORS: Record<CommitType, string> = {
  feature: '#3987e5',
  fix: '#d95926',
  refactor: '#199e70',
  docs: '#c98500',
  test: '#d55181',
  chore: '#008300',
  other: '#6b6385',
};

function words(w: Wrapped, t: Strings): string {
  const total = w.commits || 1;
  const stack = w.commitTypes
    .map((x) => `<i style="flex:${x.count};background:${TYPE_COLORS[x.type]}" title="${esc(t.types[x.type])} · ${esc(t.commitsN(x.count))}"></i>`)
    .join('');
  const legend = w.commitTypes
    .map((x) => `<div class="row type"><span><i class="dot" style="background:${TYPE_COLORS[x.type]}"></i>${esc(t.types[x.type])}</span><em>${fmt(x.count)}</em><em>${pct(x.count / total)}%</em></div>`)
    .join('');
  const max = w.words[0]?.count || 1;
  const chips = w.words
    .map((x) => `<span class="chip" style="font-size:${14 + Math.round((x.count / max) * 14)}px" title="${fmt(x.count)}">${esc(x.word)}</span>`)
    .join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.wordsTitle)}</div>
<div class="split">
<div class="viz" ${reveal(1)}>
  <div class="viz-title">${esc(t.typesTitle)}</div>
  <div class="stack">${stack}</div>
  <div class="types">${legend}</div>
</div>
<div ${reveal(2)}>
  ${chips ? `<div class="viz-title">${esc(t.wordsCloud)}</div><div class="chips">${chips}</div>` : ''}
  <p class="sub">${esc(t.fixes(w.fixCommits, pct(w.fixCommits / w.commits)))}</p>
  <p class="sub">${esc(t.avgLen(w.avgMessageLength))}</p>
</div>
</div>`;
}

/** Two pages: the headline number with your AI style, then where the tokens went. */
function ai(w: Wrapped, t: Strings): string[] {
  const a = w.ai;
  if (!a) return [];
  const id = aiStyle(w);
  const style = id && t.aiStyles[id];
  const rows = (items: { name: string; tokens: number }[]): string => {
    const max = items[0]?.tokens || 1;
    return items
      .map((r) => `<div class="row"><span>${esc(r.name)}</span><b><i style="width:${(r.tokens / max) * 100}%"></i></b><em>${esc(t.tokens(r.tokens))}</em></div>`)
      .join('');
  };
  const headline = `<div class="kicker" ${reveal(0)}>${esc(t.aiTitle)}</div>
<div class="split">
<div>
  <div class="big" ${reveal(1)}>${esc(t.tokens(a.tokens))}</div>
  <h2 ${reveal(1)}>${esc(t.tokensLabel)}</h2>
  ${deltaTag(change(a.tokens, a.previous?.tokens), a.previous, t, 2)}
  <p class="sub" ${reveal(2)}>${esc(t.aiSub(a.sessions, a.activeDays))}</p>
</div>
${style ? `<div class="ai-style" ${reveal(3)}><span class="ai-emoji">${style.emoji}</span><div class="label">${esc(t.aiStyleIntro)}</div><div class="ai-name">${esc(style.name)}</div><p>${esc(style.desc)}</p></div>` : ''}
</div>`;
  const models = a.models.length
    ? `<div><div class="viz-title">${esc(t.aiModels)}</div><div class="rows ai">${rows(a.models.slice(0, 3))}</div></div>`
    : '';
  const breakdown = `<div class="kicker" ${reveal(0)}>${esc(t.aiBreakdownTitle)}</div>
<div class="ai-grid" ${reveal(1)}>
  <div><div class="viz-title">${esc(t.aiTools)}</div><div class="rows ai">${rows(a.tools)}</div></div>
  ${models}
</div>
<p class="sub" ${reveal(2)}>${esc(t.aiBusiest(t.date(a.busiestDay.date), t.tokens(a.busiestDay.tokens)))} ${esc(t.aiPerCommit(t.tokens(Math.round(a.tokens / w.commits))))}</p>
${a.cacheRead > 0 ? `<p class="sub" ${reveal(3)}>${esc(t.aiCache(pct(a.cacheRead / a.tokens)))}</p>` : ''}
<p class="note" ${reveal(4)}>${esc(t.aiNote)}</p>`;
  return [headline, breakdown];
}

function persona(w: Wrapped, t: Strings): string {
  const [main, ...others] = w.personas.map((id) => t.personas[id]);
  // A few numbers behind the verdict, so it reads as earned rather than assigned.
  const stats: [string, string][] = [
    [t.peakLabel, t.hour(w.peakHour)],
    [t.streak, t.days(w.longestStreak.days)],
  ];
  if (w.languages[0]) stats.push([t.topLanguages, w.languages[0].name]);
  const styleId = aiStyle(w);
  if (styleId) stats.unshift([t.aiStyleIntro, `${t.aiStyles[styleId].emoji} ${t.aiStyles[styleId].name}`]);
  const badges = others.length
    ? `<div class="badges" ${reveal(5)}><span class="label">${esc(t.alsoYou)}</span>${others.map((p) => `<span class="chip">${p.emoji} ${esc(p.name)}</span>`).join('')}</div>`
    : '';
  return `<div class="backdrop" aria-hidden="true"><div class="hero-emoji">${main.emoji}</div></div>
<div class="kicker" ${reveal(0)}>${esc(t.personaIntro)}</div>
<div class="emoji" ${reveal(1)}>${main.emoji}</div>
<h1 ${reveal(2)}>${esc(main.name)}</h1>
<p class="sub" ${reveal(3)}>${esc(main.desc(w))}</p>
<div class="stats" ${reveal(4)}>${stats.map(([label, value]) => `<div><div class="label">${esc(label)}</div><div class="fact">${esc(value)}</div></div>`).join('')}</div>
${badges}`;
}

function share(w: Wrapped, t: Strings, cards: Cards): string {
  const file = `commitale-${w.year}.svg`;
  const styleTabs = STYLES.map((s) => `<button class="${s === 'poster' ? 'on' : ''}" data-style="${s}" aria-pressed="${s === 'poster'}">${esc(t.styles[s])}</button>`).join('');
  const sizeTabs = FORMATS.map((f) => `<button class="${f === 'wide' ? 'on' : ''}" data-format="${f}" aria-pressed="${f === 'wide'}">${esc(t.formats[f])}</button>`).join('');
  const tabs = `${styleTabs}</div><div class="formats">${sizeTabs}`;
  const previews = STYLES.flatMap((s) =>
    FORMATS.map((f) => `<div class="card card-${f}" data-style="${s}" data-format="${f}"${s === 'poster' && f === 'wide' ? '' : ' hidden'}>${cards[s][f]}</div>`),
  ).join('');
  // Head, card, actions: stacked on phones (card before the buttons), two columns on desktop.
  return `<div class="summary">
<div class="summary-head">
  <div class="kicker" ${reveal(0)}>${esc(t.shareTitle)}</div>
  <h2 ${reveal(1)}>${esc(t.summaryTitle(w.year))}</h2>
  <p class="label" ${reveal(2)}>${esc(t.shareHint)}</p>
  <div class="formats" ${reveal(2)}>${tabs}</div>
</div>
<div id="cards" ${reveal(1)}>${previews}</div>
<div class="summary-actions">
  <div class="buttons" ${reveal(3)}>
    <button data-action="png">${esc(t.downloadPng)}</button>
    <button data-action="svg" class="ghost">${esc(t.downloadSvg)}</button>
    <button data-action="copy" class="ghost">${esc(t.copyText)}</button>
  </div>
  <p class="label readme" ${reveal(4)}>${esc(t.readmeHint)} <code>![commitale ${w.year}](./${file})</code></p>
  <p class="footer" ${reveal(5)}>${esc(t.footer)}</p>
</div>
</div>`;
}

const CSS = `
*{box-sizing:border-box}
:root{color-scheme:dark;--ink:#fff;--muted:rgba(255,255,255,.68);--plus:#86efac;--minus:#fda4af}
html,body{height:100%;overflow:hidden;background:#0d0a1a}
body{margin:0;color:var(--ink);font-family:${FONT};--display:'${DISPLAY_FAMILY}',${FONT};-webkit-font-smoothing:antialiased;user-select:none;-webkit-tap-highlight-color:transparent}
.slide{position:fixed;inset:0;overflow-y:auto;padding:56px 16px 40px;
  background:radial-gradient(circle at 85% 10%,var(--c1) 0,transparent 55%),radial-gradient(circle at 5% 95%,var(--c2) 0,transparent 50%),#0d0a1a;
  opacity:0;visibility:hidden;transform:translateY(28px) scale(.98);
  transition:opacity .45s ease,transform .6s cubic-bezier(.2,.7,.2,1),visibility 0s linear .6s}
.slide.past{transform:translateY(-28px) scale(.98)}
.slide.active{opacity:1;visibility:visible;transform:none;transition:opacity .45s ease,transform .6s cubic-bezier(.2,.7,.2,1),visibility 0s}
.inner{width:100%;max-width:1040px;min-height:100%;margin:0 auto;display:flex;flex-direction:column;justify-content:center}
.progress{position:fixed;top:14px;left:16px;right:16px;display:flex;gap:4px;z-index:10;pointer-events:none}
.progress i{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.22);overflow:hidden}
.progress b{display:block;height:100%;width:0;background:#fff;transition:width .4s ease}
.progress i.done b{width:100%}
.nav button{position:fixed;top:50%;transform:translateY(-50%);z-index:10;width:44px;height:44px;padding:0;border-radius:50%;
  background:rgba(255,255,255,.1);color:#fff;font-size:26px;line-height:44px}
.nav .prev{left:12px}.nav .next{right:12px}
.music{position:fixed;top:28px;right:16px;z-index:11;display:flex;align-items:center;justify-content:center;gap:3px;width:40px;height:40px;padding:0;border-radius:50%;background:rgba(255,255,255,.12)}
.music[hidden]{display:none}
.music i{display:block;width:3px;height:6px;border-radius:2px;background:#fff;opacity:.55}
.music.on{background:rgba(255,255,255,.2)}
.music.on i{opacity:1;animation:eq 1s ease-in-out infinite}
.music.on i:nth-child(2){animation-delay:.2s}.music.on i:nth-child(3){animation-delay:.4s}
@keyframes eq{50%{height:16px}}
.sound{margin-top:14px}
@media (hover:none),(max-width:960px){.nav{display:none}}
.kicker{text-transform:uppercase;letter-spacing:.14em;font-size:15px;font-weight:700;color:var(--accent);margin-bottom:16px}
h1{font-family:var(--display);font-size:clamp(40px,8vw,88px);line-height:1.02;letter-spacing:-.035em;margin:0 0 24px;font-weight:900;text-wrap:balance}
h2{font-family:var(--display);font-size:clamp(26px,4.6vw,44px);letter-spacing:-.02em;margin:4px 0 20px;font-weight:800;text-wrap:balance}
.big{font-family:var(--display);font-size:clamp(64px,13vw,160px);font-weight:900;line-height:.95;letter-spacing:-.045em}
.sub{font-size:clamp(18px,2.4vw,24px);color:var(--muted);line-height:1.45;margin:12px 0 0;text-wrap:pretty}
.label{color:var(--muted);font-size:15px;margin:4px 0 20px}
.delta{display:inline-block;align-self:flex-start;margin:0 0 16px;padding:6px 14px;border-radius:999px;font-weight:800;font-size:18px;background:rgba(255,255,255,.08)}
.delta.up{color:var(--plus)}.delta.down{color:var(--minus)}
.plus{color:var(--plus)}.minus{color:var(--minus)}
.hint{margin-top:48px;color:var(--muted)}
.arrow{display:inline-block;animation:nudge 1.6s ease-in-out infinite}
@keyframes nudge{50%{transform:translateX(6px)}}
.heat{display:grid;grid-template-rows:repeat(7,1fr);gap:3px;margin:8px 0 36px}
.heat i{aspect-ratio:1;border-radius:3px}
.in .heat i{animation:pop .5s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(150ms + var(--i) * 18ms)}
@keyframes pop{from{opacity:0;transform:scale(.3)}}
.months{display:grid;gap:3px;margin-bottom:8px;font-size:12px;color:var(--muted)}
.months span{grid-row:1;white-space:nowrap}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px}
.facts .label{margin-bottom:4px}
.fact{font-family:var(--display);font-size:clamp(28px,5vw,44px);font-weight:800;letter-spacing:-.02em}
.hours{display:flex;align-items:flex-end;gap:3px;height:180px}
.hours i{flex:1;border-radius:4px 4px 0 0;background:rgba(255,255,255,.28);transform-origin:bottom}
.in .hours i{animation:grow .6s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(300ms + var(--i) * 25ms)}
@keyframes grow{from{transform:scaleY(0)}}
.hours i.peak{background:linear-gradient(var(--g2),var(--g1))}
.ticks{position:relative;height:24px;margin:8px 0 32px;color:var(--muted);font-size:13px}
.ticks span{position:absolute}
.rows{display:grid;gap:10px;max-width:560px}
.rows.wide{max-width:none}
.row{display:grid;grid-template-columns:minmax(64px,auto) 1fr 56px;align-items:center;gap:14px}
.rows.wide .row{grid-template-columns:minmax(120px,180px) 1fr 56px;font-size:20px}
.row b{height:14px;border-radius:7px;background:rgba(255,255,255,.08);overflow:hidden}
.rows.wide .row b{height:20px;border-radius:10px}
.row b i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--g1),var(--g2));transform-origin:left}
.in .row b i{animation:fill .8s cubic-bezier(.2,.7,.2,1) both;animation-delay:.35s}
@keyframes fill{from{transform:scaleX(0)}}
.row em{font-style:normal;color:var(--muted);text-align:right;font-variant-numeric:tabular-nums}
.ai-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px 32px;margin:24px 0 4px}
.ai-grid .label{margin-bottom:10px}
.rows.ai .row{grid-template-columns:minmax(80px,auto) 1fr auto;font-size:15px}
.note{margin-top:20px;color:var(--muted);font-size:13px;opacity:.8;line-height:1.5}
.ai-style{padding:28px 30px;border-radius:28px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
.ai-style .label{margin:0}
.ai-style p{margin:8px 0 12px;font-size:18px;line-height:1.45}
.ai-emoji{display:block;font-size:56px;line-height:1;margin-bottom:14px}
.ai-name{font-family:var(--display);font-size:clamp(28px,4vw,40px);font-weight:900;letter-spacing:-.02em;margin:4px 0 0}
.moments{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.moment{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:20px 22px}
.moment .label{margin:0}
.when{font-family:var(--display);font-size:22px;font-weight:800;margin:6px 0 10px}
blockquote{margin:0 0 12px;font-size:17px;line-height:1.4;overflow-wrap:anywhere}
blockquote::before{content:'“'}blockquote::after{content:'”'}
.repos{list-style:none;padding:0;margin:0;display:grid;gap:12px}
.repos li{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:16px;padding:16px 20px;border-radius:18px;background:rgba(255,255,255,.07)}
.rank{font-family:var(--display);font-size:28px;font-weight:900;color:var(--accent)}
.name{font-size:clamp(18px,3vw,26px);font-weight:800;overflow-wrap:anywhere}
.meta{text-align:right;color:var(--muted);font-size:14px;font-variant-numeric:tabular-nums}
.chips{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:baseline;margin:8px 0 24px}
.chip{display:inline-block;padding:6px 14px;border-radius:999px;background:rgba(255,255,255,.1);font-weight:700}
.emoji{font-size:clamp(88px,16vw,140px);line-height:1;margin-bottom:12px}
.in .emoji{animation:land .9s cubic-bezier(.2,1.4,.4,1) both;animation-delay:.15s}
@keyframes land{from{transform:scale(.2) rotate(-20deg);opacity:0}}
.badges{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:28px}
.badges .label{margin:0 6px 0 0}
.formats{display:inline-flex;align-self:flex-start;gap:4px;padding:4px;margin-bottom:16px;border-radius:999px;background:rgba(255,255,255,.08)}
.formats button{padding:8px 18px;font-size:14px;background:transparent;color:var(--muted)}
.formats button.on{background:#fff;color:#1a1033}
.card{margin:0 auto;width:100%}
.card-wide{max-width:min(100%,100vh)}
.card-square{max-width:min(100%,58vh)}
.card-story{max-width:min(100%,33vh)}
.summary{display:grid;grid-template-areas:"head" "cards" "actions";gap:20px}
.summary-head{grid-area:head}#cards{grid-area:cards}.summary-actions{grid-area:actions}
@media (min-width:960px){.summary{grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);grid-template-areas:"head cards" "actions cards";column-gap:56px;row-gap:0;align-items:center}.summary-head{align-self:end}.summary-actions{align-self:start}}
.summary h2{margin-bottom:8px}
.summary-head .formats{margin:12px 8px 0 0}
.summary-actions .buttons{margin:16px 0 20px}
.readme{font-size:13px}
.stack{display:flex;gap:2px;height:22px;margin-bottom:18px}
.stack i{min-width:3px;border-radius:4px;transform-origin:left}
.in .stack i{animation:fill .8s cubic-bezier(.2,.7,.2,1) both;animation-delay:.4s}
.types{display:grid;gap:8px}
.row.type{grid-template-columns:1fr auto 52px;font-size:15px}
.stats{display:flex;flex-wrap:wrap;gap:16px 44px;margin-top:28px}
.stats .label{margin:0 0 4px}
.stats .fact{font-size:clamp(22px,3vw,32px)}
.card svg{width:100%;height:auto;display:block;border-radius:clamp(10px,2vw,24px);box-shadow:0 30px 80px rgba(0,0,0,.45)}
.buttons{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}
button{font:inherit;font-weight:700;font-size:16px;padding:12px 22px;border-radius:999px;border:0;cursor:pointer;background:#fff;color:#1a1033}
button.ghost{background:rgba(255,255,255,.1);color:#fff}
button:hover{filter:brightness(.92)}
button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
code{display:inline-block;margin-top:8px;padding:8px 12px;border-radius:10px;background:rgba(0,0,0,.35);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;overflow-x:auto;white-space:nowrap;user-select:text}
.footer{margin-top:32px;color:var(--muted);font-size:14px}
.backdrop{position:absolute;inset:0;overflow:hidden;z-index:-1;pointer-events:none}
.hero-year{font-family:var(--display);position:absolute;right:-1vw;bottom:-4vh;font-size:clamp(160px,32vw,460px);font-weight:900;letter-spacing:-.06em;line-height:.8;color:transparent;-webkit-text-stroke:2px rgba(255,255,255,.1);pointer-events:none;user-select:none}
.hero-emoji{position:absolute;right:4vw;top:50%;transform:translateY(-50%) rotate(-8deg);font-size:clamp(200px,34vw,460px);line-height:1;opacity:.12;filter:blur(2px) saturate(1.3);pointer-events:none}
.heat.mini{gap:2px;margin:12px 0 0;max-width:640px;opacity:.9}
.heat.mini i{border-radius:2px}
.split{display:grid;gap:36px;align-items:center}
@media (min-width:900px){.split{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:64px}.split .big{font-size:clamp(64px,8.4vw,128px)}}
.viz{padding:24px 26px;border-radius:24px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
.viz .label{margin:14px 0 0}
.viz-title{text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:16px}
.cols{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px;align-items:end}
.col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:190px}
.col i{width:min(22px,100%);height:calc(var(--v) * 150px);min-height:2px;border-radius:4px 4px 0 0;background:rgba(255,255,255,.22);transform-origin:bottom}
.col.peak i{background:linear-gradient(var(--g2),var(--g1))}
.col b{font-family:var(--display);font-size:13px;font-weight:800;margin-bottom:6px}
.col span{margin-top:8px;font-size:11px;color:var(--muted);white-space:nowrap}
.in .col i{animation:grow .7s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(450ms + var(--i) * 45ms)}
.ratio{display:flex;gap:2px;height:28px}
.ratio i{border-radius:4px;transform-origin:left}
.ratio .a{background:var(--plus)}.ratio .d{background:var(--minus)}
.in .ratio i{animation:fill .9s cubic-bezier(.2,.7,.2,1) both;animation-delay:.5s}
.legend{display:flex;flex-wrap:wrap;gap:8px 20px;margin:12px 0 18px;color:var(--muted);font-size:14px}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;vertical-align:-1px}
.dot.a{background:var(--plus)}.dot.d{background:var(--minus)}
.scale{display:flex;align-items:center;justify-content:flex-end;gap:4px;margin:-24px 0 28px;color:var(--muted);font-size:12px}
.scale i{width:12px;height:12px;border-radius:3px}
.scale span{margin:0 4px}
.rows.days .row b i{background:rgba(255,255,255,.26)}
.rows.days .row.peak b i{background:linear-gradient(90deg,var(--g1),var(--g2))}
.rows.days .row.peak span,.rows.days .row.peak em{color:#fff;font-weight:800}
.moment{position:relative}
.moment .icon{position:absolute;top:18px;right:20px;font-size:26px}
.repos .name{display:flex;flex-direction:column;gap:8px}
.share{display:block;height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;max-width:420px}
.share i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--g1),var(--g2));transform-origin:left}
.in .share i{animation:fill .8s cubic-bezier(.2,.7,.2,1) both;animation-delay:.4s}
.reveal{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1);transition-delay:calc(var(--d,0)*120ms)}
.in .reveal{opacity:1;transform:none}
@media (max-width:560px){.rows.wide .row{grid-template-columns:96px 1fr 44px;font-size:16px}.repos li{grid-template-columns:32px 1fr}.meta{grid-column:2;text-align:left}
  .moments{grid-template-columns:1fr}.stats{gap:12px 24px;margin-top:18px}.summary-actions .buttons{margin:4px 0 12px}.summary-actions .footer{display:none}.chip{padding:4px 11px}.chips{gap:8px 10px;margin-bottom:12px}.row.type{font-size:14px}.types{gap:6px}.stack{margin-bottom:12px}.col{height:150px}.col i{height:calc(var(--v) * 110px)}.col span{font-size:9px}.cols{gap:2px}.viz{padding:18px}.hero-year{font-size:44vw;bottom:-1vh}.moment{padding:14px 16px}.moments{gap:10px}.when{font-size:19px;margin:4px 0 6px}blockquote{margin-bottom:6px}.months{font-size:10px}.months span:nth-child(even){visibility:hidden}}
@media (prefers-reduced-motion:reduce){.slide,.slide.past{transform:none;transition:opacity .2s,visibility 0s}.reveal{opacity:1;transform:none;transition:none}
  .music.on i,.arrow,.in .heat i,.in .hours i,.in .row b i,.in .emoji,.in .col i,.in .ratio i,.in .share i{animation:none}}
`;

const SCRIPT = `
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(el) {
  if (reduced) return;
  const end = Number(el.dataset.count), prefix = el.dataset.prefix || '', t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / 1400);
    el.textContent = prefix + Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const slides = [...document.querySelectorAll('.slide')];
const bars = [...document.querySelectorAll('.progress i')];
let current = -1;
function show(i) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  if (i === current) return;
  slides.forEach((s, k) => {
    s.classList.toggle('active', k === i);
    s.classList.toggle('past', k < i);
    s.setAttribute('aria-hidden', String(k !== i));
    if (k !== i) s.classList.remove('in');
  });
  bars.forEach((b, k) => b.classList.toggle('done', k <= i));
  const slide = slides[i];
  slide.scrollTop = 0;
  // Replay the page's animations every time it is shown. Frames can stall in throttled
  // or embedded views, so a timer backs them up: a page must never be left blank.
  let started = false;
  const start = () => {
    if (started || slides[current] !== slide) return;
    started = true;
    slide.classList.add('in');
    slide.querySelectorAll('[data-count]').forEach(countUp);
  };
  requestAnimationFrame(() => requestAnimationFrame(start));
  setTimeout(start, 80);
  current = i;
  history.replaceState(null, '', '#' + (i + 1));
}
const next = () => show(current + 1);
const prev = () => show(current - 1);

document.addEventListener('keydown', (e) => {
  if (e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); prev(); }
  else if (e.key === 'Home') show(0);
  else if (e.key === 'End') show(slides.length - 1);
});
// Tap the left third to go back, anywhere else to go forward.
document.addEventListener('click', (e) => {
  if (e.target.closest('button, a, code, #cards')) return;
  (e.clientX < innerWidth * 0.3 ? prev : next)();
});
let wheelLock = 0;
document.addEventListener('wheel', (e) => {
  const s = slides[current];
  if (s.scrollHeight > s.clientHeight + 4) {
    const atTop = s.scrollTop <= 0;
    const atBottom = s.scrollTop + s.clientHeight >= s.scrollHeight - 2;
    if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return;
  }
  if (Date.now() < wheelLock || Math.abs(e.deltaY) < 20) return;
  wheelLock = Date.now() + 900;
  (e.deltaY > 0 ? next : prev)();
}, { passive: true });
let touch = null;
document.addEventListener('touchstart', (e) => { touch = e.touches[0]; }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.clientX, dy = e.changedTouches[0].clientY - touch.clientY;
  touch = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
}, { passive: true });
document.querySelector('.nav .prev').addEventListener('click', prev);
document.querySelector('.nav .next').addEventListener('click', next);
show((parseInt(location.hash.slice(1), 10) || 1) - 1);

const pick = { style: 'poster', format: 'wide' };
document.querySelectorAll('.formats button').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.style ? 'style' : 'format';
  pick[key] = b.dataset[key];
  b.parentElement.querySelectorAll('button').forEach((x) => {
    x.classList.toggle('on', x === b);
    x.setAttribute('aria-pressed', String(x === b));
  });
  document.querySelectorAll('#cards .card').forEach((c) => {
    c.hidden = c.dataset.style !== pick.style || c.dataset.format !== pick.format;
  });
}));
// Downloads are standalone files, so they carry the display font the page loaded.
const fontFace = [...document.styleSheets]
  .flatMap((sheet) => [...sheet.cssRules])
  .find((rule) => rule.type === CSSRule.FONT_FACE_RULE);
const fontStyle = fontFace ? '<style>' + fontFace.cssText + '</style>' : '';

function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const fileName = (ext) => 'commitale-' + YEAR + '-' + pick.style + '-' + pick.format + '.' + ext;
const svgText = () => {
  const svg = document.querySelector('#cards .card[data-style="' + pick.style + '"][data-format="' + pick.format + '"] svg');
  return new XMLSerializer().serializeToString(svg).replace('<defs>', '<defs>' + fontStyle);
};
const actions = {
  svg: () => save(new Blob([svgText()], { type: 'image/svg+xml' }), fileName('svg')),
  png: async () => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText());
    await img.decode();
    const [w, h] = SIZES[pick.format];
    const canvas = document.createElement('canvas');
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => save(blob, fileName('png')), 'image/png');
  },
  copy: async (button) => {
    try { await navigator.clipboard.writeText(SHARE_TEXT); } catch { prompt('', SHARE_TEXT); return; }
    const label = button.textContent;
    button.textContent = COPIED;
    setTimeout(() => (button.textContent = label), 1600);
  },
};
document.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => actions[b.dataset.action](b)));

// Background music, synthesised live with Web Audio: no audio files, nothing to license.
// A mellow loop, two bars per chord: Am9, Fmaj7, Cmaj7, G6.
const Music = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const BPM = 84, EIGHTH = 60 / BPM / 2;
  const CHORDS = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [48, 52, 55, 59, 64], [55, 59, 62, 64, 67]];
  const ARP = [0, 2, 4, 3, 1, 2, 4, 3];
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let ctx = null, master = null, out = null, noise = null, timer = 0, stopTimer = 0, step = 0, next = 0, on = false;

  function note(m, t, dur, type, level, cutoff) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = hz(m);
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + Math.min(0.08, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.32);
  }
  function hat(t) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    f.type = 'highpass';
    f.frequency.value = 7000;
    g.gain.setValueAtTime(0.025, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(g).connect(out);
    s.start(t);
    s.stop(t + 0.06);
  }
  function play(i, t) {
    const chord = CHORDS[Math.floor(i / 16) % CHORDS.length], s = i % 16;
    if (s === 0) chord.slice(0, 4).forEach((m) => note(m, t, EIGHTH * 16, 'triangle', 0.035, 900));
    if (s === 0 || s === 8) note(chord[0] - 24, t, EIGHTH * 6, 'sine', 0.18, 400);
    if (s % 2 === 0) note(chord[ARP[(s / 2) % ARP.length]] + 12, t, EIGHTH * 1.6, 'sine', 0.045, 2400);
    if (s % 8 === 0) kick(t);
    if (s % 2 === 1) hat(t);
  }
  function tick() {
    while (next < ctx.currentTime + 0.25) {
      play(step++, next);
      next += EIGHTH;
    }
  }
  function setup() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    out = ctx.createGain();
    // A short synthetic reverb tail for warmth.
    const verb = ctx.createConvolver(), wet = ctx.createGain(), len = Math.floor(ctx.sampleRate * 2.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 3);
    }
    verb.buffer = ir;
    wet.gain.value = 0.35;
    out.connect(master);
    out.connect(verb);
    verb.connect(wet).connect(master);
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  }
  return {
    get on() { return on; },
    start() {
      if (!ctx) setup();
      clearTimeout(stopTimer);
      ctx.resume();
      next = ctx.currentTime + 0.1;
      clearInterval(timer);
      timer = setInterval(tick, 60);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.5);
      on = true;
    },
    stop() {
      if (!ctx) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      stopTimer = setTimeout(() => { clearInterval(timer); ctx.suspend(); }, 450);
      on = false;
    },
  };
})();

const musicButton = document.querySelector('.music');
if (Music) {
  musicButton.hidden = false;
  let wanted = true;
  try { wanted = localStorage.getItem('commitale-music') !== 'off'; } catch {}
  const setMusic = (play) => {
    if (play) Music.start(); else Music.stop();
    musicButton.classList.toggle('on', play);
    musicButton.setAttribute('aria-pressed', String(play));
  };
  musicButton.addEventListener('click', () => {
    const play = !Music.on;
    setMusic(play);
    try { localStorage.setItem('commitale-music', play ? 'on' : 'off'); } catch {}
  });
  // Browsers only allow sound after a gesture, so the music starts on the first tap or key.
  const firstGesture = (e) => {
    ['pointerdown', 'keydown'].forEach((type) => removeEventListener(type, firstGesture, true));
    if (wanted && !Music.on && !(e.target.closest && e.target.closest('.music'))) setMusic(true);
  };
  ['pointerdown', 'keydown'].forEach((type) => addEventListener(type, firstGesture, true));
}
`;
