import { calendar, escapeXml as esc, fmt, heatLevels, pct } from '../format.ts';
import type { Strings } from '../i18n.ts';
import { aiStyle } from '../ai.ts';
import { change, type CommitType, type Moment, type PersonaId, type Wrapped } from '../stats.ts';
import { CARD_SIZES, FONT, type CardFormat } from './card.ts';
import { ART_CSS, aiArt, personaArt } from './art.ts';
import { DISPLAY_FAMILY, FONT_FACE } from './font.ts';
import { icon, ICON_CSS, type MomentIcon } from './icons.ts';
import { BLUE, NIGHT, PINK, PLUM, RED, TEAL, YELLOW } from './palette.ts';
import { SCENERY_CSS, scenery, type Kind } from './scenery.ts';

const LINES_PER_PAGE = 50;
const FORMATS: CardFormat[] = ['wide', 'square', 'story'];
const STYLES = ['poster', 'data'] as const;

/** Every card the summary page can show: poster and stats styles, in each size. */
export type Cards = Record<(typeof STYLES)[number], Record<CardFormat, string>>;

interface Slide {
  body: string;
  /** Solid colour fields for the big moments, near-black for the charts; see scenery.ts. */
  kind: Kind;
}

export function renderHtml(w: Wrapped, t: Strings, cards: Cards): string {
  // Colour fields and dark data pages take turns, so the story has a rhythm.
  const slides: Slide[] = (
    [
      { body: intro(w, t), kind: 'field' },
      { body: commits(w, t), kind: 'data' },
      ...ai(w, t).map((body, i) => ({ body, kind: i === 0 ? 'field' : 'data' })),
      { body: lines(w, t), kind: 'data' },
      { body: heatmap(w, t), kind: 'data' },
      { body: rhythm(w, t), kind: 'field' },
      { body: moments(w, t), kind: 'data' },
      { body: languages(w, t), kind: 'data' },
      { body: repos(w, t), kind: 'field' },
      { body: words(w, t), kind: 'data' },
      { body: fun(w, t), kind: 'field' },
      { body: persona(w, t), kind: 'stage' },
      { body: share(w, t, cards), kind: 'data' },
    ] as Slide[]
  ).filter((s) => Boolean(s.body));

  const scenes = scenery(w.personas[0], slides.map((s) => s.kind));
  const sections = slides
    .map((s, i) => {
      const scene = scenes[i];
      return `<section class="slide ${s.kind}" data-tone="${scene.tone}" style="${scene.style}"><div class="scene" aria-hidden="true">${scene.shapes}</div><div class="inner">${s.body}</div></section>`;
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
${ART_CSS}
${SCENERY_CSS}
${ICON_CSS}</style>
</head>
<body>
<div class="grain" aria-hidden="true"></div>
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

/** The year's commit calendar as grid cells; the page's colours shade the five levels. */
function heatCells(w: Wrapped, titles?: Strings): { cells: string; cols: number } {
  const level = heatLevels(w.daily);
  const { cells, cols } = calendar(w.year);
  const html = cells
    .map((c) => {
      const n = w.daily[c.date] ?? 0;
      const title = titles ? ` title="${esc(titles.date(c.date))} · ${esc(titles.commitsN(n))}"` : '';
      return `<i class="h${level(n)}" style="grid-area:${c.row + 1}/${c.col + 1};--i:${c.col}"${title}></i>`;
    })
    .join('');
  return { cells: html, cols };
}

function intro(w: Wrapped, t: Strings): string {
  // A wordless preview of the year: the heatmap, small, rippling in left to right.
  const { cells, cols } = heatCells(w);
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

function heatmap(w: Wrapped, t: Strings): string {
  const { cells: grid, cols } = heatCells(w, t);
  const { cells } = calendar(w.year);
  const months = t.months
    .map((m, i) => {
      const first = cells.find((c) => Number(c.date.slice(5, 7)) === i + 1)!;
      return `<span style="grid-column:${first.col + 1}">${esc(m)}</span>`;
    })
    .join('');
  const columns = `grid-template-columns:repeat(${cols},minmax(0,1fr))`;
  const scale = [0, 1, 2, 3, 4].map((l) => `<i class="h${l}"></i>`).join('');
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
  const card = (id: MomentIcon, label: string, m: Moment, d: number, extra = ''): string => `<div class="moment" ${reveal(d)}>
  <span class="icon">${icon(id)}</span>
  <div class="label">${esc(label)}</div>
  <div class="when">${esc(t.date(m.date))} · ${m.time}</div>
  ${m.subject ? `<blockquote>${esc(m.subject)}</blockquote>` : ''}
  <div class="label">${esc(m.repo)}${extra}</div>
</div>`;
  const cards = [
    card('first', t.first, w.firstCommit, 1),
    w.latestNight ? card('latest', t.latest, w.latestNight, 2) : '',
    card('biggest', t.biggest, w.biggestCommit, 3, ` · ${esc(t.linesN(fmt(w.biggestCommit.lines)))}`),
    card('last', t.last, w.lastCommit, 4),
  ].join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.momentsTitle)}</div><div class="moments">${cards}</div>`;
}

function languages(w: Wrapped, t: Strings): string {
  if (w.languages.length === 0) return '';
  const top = w.languages.slice(0, 6);
  const max = top[0].share;
  const rows = top
    .map((l, i) => `<div class="row" ${reveal(i + 1)}><span>${esc(l.name)}</span><b><i style="width:${(l.share / max) * 100}%"></i></b><em>${pct(l.share)}%</em></div>`)
    .join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.langTitle)}</div>
<h2 ${reveal(0)}>${esc(top[0].name)}</h2>
<div class="rows wide langs">${rows}</div>`;
}

function repos(w: Wrapped, t: Strings): string {
  const max = w.topRepos[0]?.commits || 1;
  const rows = w.topRepos
    .map((r, i) => `<li ${reveal(i + 1)}><span class="rank">${i + 1}</span><span class="name">${esc(r.name)}<span class="share"><i style="width:${(r.commits / max) * 100}%"></i></span></span><span class="meta">${esc(t.commitsN(r.commits))}<br><span class="plus">+${fmt(r.added)}</span> <span class="minus">−${fmt(r.deleted)}</span></span></li>`)
    .join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.reposTitle)}</div><ol class="repos">${rows}</ol>`;
}

/** Fixed colours per commit type, from the palette; "other" stays neutral. They sit on a data page. */
const TYPE_COLORS: Record<CommitType, string> = {
  feature: BLUE,
  fix: RED,
  refactor: TEAL,
  docs: YELLOW,
  test: PINK,
  chore: PLUM,
  other: 'var(--bar)',
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

/** The year's quirks, each a big number and a wry line. Left out when fewer than two stand out. */
function fun(w: Wrapped, t: Strings): string {
  if (w.funFacts.length < 2) return '';
  const cards = w.funFacts
    .map((f, i) => {
      const { big, line } = t.fun(f);
      // The emoji fact's headline is already an emoji.
      const mark = f.id === 'emoji' ? '' : icon(f.id === 'holiday' ? f.holiday : f.id);
      return `<div class="quirk" ${reveal(i + 1)}>${mark ? `<span class="icon">${mark}</span>` : ''}<div class="quirk-big${[...big].length > 5 ? ' long' : ''}">${esc(big)}</div><p>${esc(line)}</p></div>`;
    })
    .join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.funTitle)}</div><div class="quirks">${cards}</div>`;
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
${id && style ? `<div class="ai-style" ${reveal(3)}><span class="ai-emoji">${aiArt(id, 'ai-slide')}</span><div class="label">${esc(t.aiStyleIntro)}</div><div class="ai-name">${esc(style.name)}</div><p>${esc(style.desc)}</p></div>` : ''}
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
  const [mainId, ...otherIds] = w.personas;
  const main = t.personas[mainId];
  // A few numbers behind the verdict, so it reads as earned rather than assigned.
  const stats: [label: string, value: string, icon?: string][] = [
    [t.peakLabel, t.hour(w.peakHour)],
    [t.streak, t.days(w.longestStreak.days)],
  ];
  if (w.languages[0]) stats.push([t.topLanguages, w.languages[0].name]);
  const styleId = aiStyle(w);
  if (styleId) stats.unshift([t.aiStyleIntro, t.aiStyles[styleId].name, aiArt(styleId, 'stat-ai')]);
  const badges = otherIds.length
    ? `<div class="badges after" style="--d:3"><span class="label">${esc(t.alsoYou)}</span>${otherIds.map((id) => `<span class="chip">${personaArt(id, `chip-${id}`, { size: 24 })}${esc(t.personas[id].name)}</span>`).join('')}</div>`
    : '';
  // The reveal: every personality's badge spins past like a slot machine, slows, and lands
  // on yours; then a burst, the name letter by letter, and the rest. The script runs the
  // reel through the faces in `data-reel` order: the others twice, then yours, which alone
  // carries your number.
  const rest = (Object.keys(t.personas) as PersonaId[]).filter((id) => id !== mainId);
  const faces = [...rest, mainId]
    .map((id) => `<div class="face${id === mainId ? ' on' : ''}" data-persona="${id}">${personaArt(id, `reel-${id}`, {}, id === mainId ? t.figures[id](w) : undefined)}</div>`)
    .join('');
  const order = [...rest.keys(), ...rest.keys(), rest.length];
  let letter = 0;
  const name = main.name
    .split(' ')
    .map((word) => `<span class="word">${[...word].map((ch) => `<span class="ch" style="--i:${letter++}">${esc(ch)}</span>`).join('')}</span>`)
    .join(' ');
  const sparks = Array.from({ length: 14 }, (_, i) => `<i style="--a:${Math.round(i * (360 / 14))}deg"></i>`).join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.personaIntro)}</div>
<div class="emoji-wrap"><div class="burst" aria-hidden="true"></div><div class="sparks" aria-hidden="true">${sparks}</div><div class="avatar" data-reel="${JSON.stringify(order)}">${faces}</div></div>
<h1 class="persona-name" aria-label="${esc(main.name)}"><span aria-hidden="true">${name}</span></h1>
<p class="sub after" style="--d:1">${esc(main.desc(w))}</p>
<div class="stats after" style="--d:2">${stats.map(([label, value, icon]) => `<div><div class="label">${esc(label)}</div><div class="fact">${icon ?? ''}${esc(value)}</div></div>`).join('')}</div>
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
:root{color-scheme:dark;--ink:#F3EBDD;--muted:rgba(243,235,221,.7);--chrome:#F3EBDD}
html,body{height:100%;overflow:hidden;background:${NIGHT}}
body{margin:0;color:var(--ink);font-family:${FONT};--display:'${DISPLAY_FAMILY}',${FONT};-webkit-font-smoothing:antialiased;user-select:none;-webkit-tap-highlight-color:transparent}
.slide{position:fixed;inset:0;overflow-x:hidden;overflow-y:auto;padding:56px 16px 40px;background:var(--bg);color:var(--ink);visibility:hidden;z-index:0;
  --h0:var(--glass);--h1:color-mix(in srgb,var(--hi) 30%,transparent);--h2:color-mix(in srgb,var(--hi) 55%,transparent);--h3:color-mix(in srgb,var(--hi) 80%,transparent);--h4:var(--hi)}
/* Turning the page: the next one opens as a circle from where you tapped (or the side it
   comes from), over the last one, which sinks back. A timer settles it if frames stall. */
.slide.active{visibility:visible;z-index:2;clip-path:circle(150% at var(--ox,50%) var(--oy,50%));animation:open .85s cubic-bezier(.65,0,.2,1) both}
.slide.active.settled,.slide.active.first{animation:none;clip-path:none}
@keyframes open{from{clip-path:circle(0% at var(--ox,50%) var(--oy,50%))}}
.slide.leaving{visibility:visible;z-index:1}
.slide.leaving .inner{transform:scale(.94);opacity:.4;transition:transform .85s cubic-bezier(.65,0,.2,1),opacity .85s ease}
.grain{position:fixed;inset:0;z-index:30;pointer-events:none;opacity:.22;mix-blend-mode:soft-light;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.inner{width:100%;max-width:1040px;min-height:100%;margin:0 auto;display:flex;flex-direction:column;justify-content:center}
.progress{position:fixed;top:14px;left:16px;right:16px;display:flex;gap:4px;z-index:10;pointer-events:none}
.progress i{flex:1;height:3px;border-radius:2px;background:color-mix(in srgb,var(--chrome) 25%,transparent);overflow:hidden;transition:background .5s}
.progress b{display:block;height:100%;width:0;background:var(--chrome);transition:width .4s ease,background .5s}
.progress i.done b{width:100%}
.nav button{position:fixed;top:50%;transform:translateY(-50%);z-index:10;width:44px;height:44px;padding:0;border-radius:50%;
  background:color-mix(in srgb,var(--chrome) 14%,transparent);color:var(--chrome);font-size:26px;line-height:44px;transition:background .5s,color .5s}
.nav .prev{left:12px}.nav .next{right:12px}
.music{position:fixed;top:28px;right:16px;z-index:11;display:flex;align-items:center;justify-content:center;gap:3px;width:40px;height:40px;padding:0;border-radius:50%;background:color-mix(in srgb,var(--chrome) 14%,transparent)}
.music[hidden]{display:none}
.music i{display:block;width:3px;height:6px;border-radius:2px;background:var(--chrome);opacity:.55}
.music.on{background:color-mix(in srgb,var(--chrome) 24%,transparent)}
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
.delta{display:inline-block;align-self:flex-start;margin:0 0 16px;padding:6px 14px;border-radius:999px;font-weight:800;font-size:18px;background:var(--glass)}
.delta.up{color:var(--plus)}.delta.down{color:var(--minus)}
.field .delta,.stage .delta{background:var(--ink);color:var(--bg)}
.plus{color:var(--plus)}.minus{color:var(--minus)}
.hint{margin-top:48px;color:var(--muted)}
.arrow{display:inline-block;animation:nudge 1.6s ease-in-out infinite}
@keyframes nudge{50%{transform:translateX(6px)}}
.heat{display:grid;grid-template-rows:repeat(7,1fr);gap:3px;margin:8px 0 36px}
.heat i{aspect-ratio:1;border-radius:3px}
.h0{background:var(--h0)}.h1{background:var(--h1)}.h2{background:var(--h2)}.h3{background:var(--h3)}.h4{background:var(--h4)}
.in .heat i{animation:pop .5s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(150ms + var(--i) * 18ms)}
@keyframes pop{from{opacity:0;transform:scale(.3)}}
.months{display:grid;gap:3px;margin-bottom:8px;font-size:12px;color:var(--muted)}
.months span{grid-row:1;white-space:nowrap}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px}
.facts .label{margin-bottom:4px}
.fact{font-family:var(--display);font-size:clamp(28px,5vw,44px);font-weight:800;letter-spacing:-.02em}
.hours{display:flex;align-items:flex-end;gap:3px;height:180px}
.hours i{flex:1;border-radius:3px 3px 0 0;background:var(--bar);transform-origin:bottom}
.in .hours i{animation:grow .6s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(300ms + var(--i) * 25ms)}
@keyframes grow{from{transform:scaleY(0)}}
.hours i.peak{background:var(--hi)}
.ticks{position:relative;height:24px;margin:8px 0 32px;color:var(--muted);font-size:13px}
.ticks span{position:absolute}
.rows{display:grid;gap:10px;max-width:560px}
.rows.wide{max-width:none}
.row{display:grid;grid-template-columns:minmax(64px,auto) 1fr 56px;align-items:center;gap:14px}
.rows.wide .row{grid-template-columns:minmax(120px,180px) 1fr 56px;font-size:20px}
.row b{height:14px;border-radius:7px;background:var(--glass);overflow:hidden}
.rows.wide .row b{height:20px;border-radius:10px}
.row b i{display:block;height:100%;border-radius:inherit;background:var(--hi);transform-origin:left}
.in .row b i{animation:fill .8s cubic-bezier(.2,.7,.2,1) both;animation-delay:.35s}
@keyframes fill{from{transform:scaleX(0)}}
.row em{font-style:normal;color:var(--muted);text-align:right;font-variant-numeric:tabular-nums}
.ai-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px 32px;margin:24px 0 4px}
.ai-grid .label{margin-bottom:10px}
.rows.ai .row{grid-template-columns:minmax(80px,auto) 1fr auto;font-size:15px}
.note{margin-top:20px;color:var(--muted);font-size:13px;opacity:.8;line-height:1.5}
.ai-style{padding:28px 30px;border-radius:28px;background:var(--glass);border:1px solid var(--line)}
.ai-style .label{margin:0}
.ai-style p{margin:8px 0 12px;font-size:18px;line-height:1.45}
.ai-emoji{display:block;margin-bottom:16px}.ai-emoji .art{display:block;width:72px;height:72px}
.fact .art{width:1.15em;height:1.15em;vertical-align:-.2em;margin-right:.35em}
.ai-name{font-family:var(--display);font-size:clamp(28px,4vw,40px);font-weight:900;letter-spacing:-.02em;margin:4px 0 0}
.moments{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.moment{background:var(--glass);border:1px solid var(--line);border-radius:20px;padding:20px 22px}
.moment .label{margin:0}
.when{font-family:var(--display);font-size:22px;font-weight:800;margin:6px 0 10px}
blockquote{margin:0 0 12px;font-size:17px;line-height:1.4;overflow-wrap:anywhere}
blockquote::before{content:'“'}blockquote::after{content:'”'}
.repos{list-style:none;padding:0;margin:0;display:grid;gap:12px}
.repos li{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:16px;padding:16px 20px;border-radius:18px;background:var(--glass)}
.rank{font-family:var(--display);font-size:28px;font-weight:900;color:var(--accent)}
.name{font-size:clamp(18px,3vw,26px);font-weight:800;overflow-wrap:anywhere}
.meta{text-align:right;color:var(--muted);font-size:14px;font-variant-numeric:tabular-nums}
.chips{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:baseline;margin:8px 0 24px}
.chip{display:inline-block;padding:6px 14px;border-radius:999px;background:var(--glass);font-weight:700}
.emoji-wrap{position:relative;align-self:flex-start;margin-bottom:12px}
.avatar{position:relative;width:clamp(120px,17vw,176px);aspect-ratio:1}
.face{position:absolute;inset:0;visibility:hidden}.face.on{visibility:visible}.face .art{display:block;width:100%;height:100%}
.spinning .avatar{filter:blur(1.5px);opacity:.85;transform:scale(.9)}
.landed .avatar{animation:land .8s cubic-bezier(.2,1.6,.4,1) both}
@keyframes land{0%{transform:scale(1.6) rotate(-12deg)}60%{transform:scale(.92) rotate(3deg)}}
.burst{position:absolute;inset:-12%;border-radius:50%;border:clamp(8px,1.6vw,16px) solid var(--s1);box-shadow:0 0 0 clamp(14px,3vw,28px) var(--bg),0 0 0 clamp(20px,4.2vw,40px) var(--s2);opacity:0;pointer-events:none}
.landed .burst{animation:burst 1.1s cubic-bezier(.2,.7,.2,1) both}
@keyframes burst{0%{opacity:1;transform:scale(.4)}100%{opacity:0;transform:scale(2.6)}}
.sparks i{position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px;border-radius:50%;background:var(--ink);opacity:0}
.sparks i:nth-child(3n+1){background:var(--s1);border-radius:2px}.sparks i:nth-child(3n+2){background:var(--s2);width:9px;height:9px;margin:-4.5px}
.landed .sparks i{animation:spark 1s cubic-bezier(.1,.7,.3,1) both,fade 1s linear both}
@keyframes spark{0%{transform:rotate(var(--a)) translateX(30px)}100%{transform:rotate(var(--a)) translateX(clamp(130px,24vw,240px)) scale(.5)}}
@keyframes fade{0%,55%{opacity:1}100%{opacity:0}}
.persona-name .word{display:inline-block;white-space:nowrap}
.persona-name .ch{display:inline-block;opacity:0;transform:translateY(.35em)}
.landed .persona-name .ch{animation:rise .55s cubic-bezier(.2,1.3,.4,1) both;animation-delay:calc(180ms + var(--i) * 40ms)}
@keyframes rise{to{opacity:1;transform:none}}
.after{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1);transition-delay:calc(500ms + var(--d,0) * 160ms)}
.landed .after{opacity:1;transform:none}
.badges{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:28px}
.badges .label{margin:0 6px 0 0}
.formats{display:inline-flex;align-self:flex-start;gap:4px;padding:4px;margin-bottom:16px;border-radius:999px;background:var(--glass)}
.formats button{padding:8px 18px;font-size:14px;background:transparent;color:var(--muted)}
.formats button.on{background:var(--ink);color:var(--bg)}
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
button{font:inherit;font-weight:700;font-size:16px;padding:12px 22px;border-radius:999px;border:0;cursor:pointer;background:var(--ink);color:var(--bg)}
button.ghost{background:var(--glass);color:var(--ink)}
button:hover{filter:brightness(.92)}
button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
code{display:inline-block;margin-top:8px;padding:8px 12px;border-radius:10px;background:rgba(0,0,0,.35);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;overflow-x:auto;white-space:nowrap;user-select:text}
.footer{margin-top:32px;color:var(--muted);font-size:14px}
.backdrop{position:absolute;inset:0;overflow:hidden;z-index:-1;pointer-events:none}
.hero-year{font-family:var(--display);position:absolute;right:-1vw;bottom:-4vh;font-size:clamp(160px,32vw,460px);font-weight:900;letter-spacing:-.06em;line-height:.8;color:transparent;-webkit-text-stroke:2px var(--line);pointer-events:none;user-select:none}
.chip .art{vertical-align:-7px;margin-right:6px}
.heat.mini{gap:2px;margin:12px 0 0;max-width:640px;opacity:.9}
.heat.mini i{border-radius:2px}
.split{display:grid;gap:36px;align-items:center}
@media (min-width:900px){.split{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:64px}.split .big{font-size:clamp(64px,8.4vw,128px)}}
.viz{padding:24px 26px;border-radius:24px;background:var(--glass);border:1px solid var(--line)}
.viz .label{margin:14px 0 0}
.viz-title{text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:16px}
.cols{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px;align-items:end}
.col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:190px}
.col i{width:min(22px,100%);height:calc(var(--v) * 150px);min-height:2px;border-radius:3px 3px 0 0;background:var(--bar);transform-origin:bottom}
.col.peak i{background:var(--hi)}
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
.rows.days .row b i{background:var(--bar)}
.rows.days .row.peak b i{background:var(--hi)}
.rows.days .row.peak span,.rows.days .row.peak em{color:var(--ink);font-weight:800}
.moment{position:relative}
.moment .icon{position:absolute;top:16px;right:18px;width:40px;height:40px;transform:rotate(-6deg)}.moment .ico{display:block;width:100%;height:100%}
.langs .row b i{background:var(--bar)}.langs .row:first-child b i{background:var(--hi)}
.repos .name{display:flex;flex-direction:column;gap:8px}
.share{display:block;height:6px;border-radius:3px;background:var(--glass);overflow:hidden;max-width:420px}
.share i{display:block;height:100%;border-radius:inherit;background:var(--hi);transform-origin:left}
.in .share i{animation:fill .8s cubic-bezier(.2,.7,.2,1) both;animation-delay:.4s}
.quirks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.quirk{position:relative;padding:26px 28px;border-radius:24px;background:var(--glass);border:1px solid var(--line)}
.quirk .icon{position:absolute;top:20px;right:20px;width:52px;height:52px;transform:rotate(-6deg)}.quirk .ico{display:block;width:100%;height:100%}
.quirk-big{font-family:var(--display);font-size:clamp(40px,6vw,76px);font-weight:900;line-height:1;letter-spacing:-.03em;color:var(--accent)}
.quirk-big.long{font-size:clamp(30px,4vw,52px);padding-right:60px}
.quirk p{margin:12px 0 0;font-size:clamp(15px,1.9vw,20px);line-height:1.4;color:var(--muted);text-wrap:pretty}
.reveal{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1);transition-delay:calc(var(--d,0)*120ms)}
.in .reveal{opacity:1;transform:none}
@media (max-width:560px){.rows.wide .row{grid-template-columns:96px 1fr 44px;font-size:16px}.repos li{grid-template-columns:32px 1fr}.meta{grid-column:2;text-align:left}
  .moments{grid-template-columns:1fr}.stats{gap:12px 24px;margin-top:18px}.summary-actions .buttons{margin:4px 0 12px}.summary-actions .footer{display:none}.chip{padding:4px 11px}.chips{gap:8px 10px;margin-bottom:12px}.row.type{font-size:14px}.types{gap:6px}.stack{margin-bottom:12px}.col{height:150px}.col i{height:calc(var(--v) * 110px)}.col span{font-size:9px}.cols{gap:2px}.viz{padding:18px}.hero-year{font-size:44vw;bottom:-1vh}.moment{padding:14px 16px}.moment .icon{top:12px;right:12px;width:28px;height:28px}.moments{gap:10px}.when{font-size:19px;margin:4px 0 6px}blockquote{margin-bottom:6px}.months{font-size:10px}.months span:nth-child(even){visibility:hidden}
  .quirks{gap:10px}.quirk{padding:16px;border-radius:18px}.quirk .icon{top:12px;right:12px;width:32px;height:32px}.quirk-big{font-size:36px}.quirk-big.long{font-size:19px;padding-right:20px;white-space:nowrap}.quirk p{font-size:14px;margin-top:8px}}
/* Small phones (iPhone SE and the like): every page should fit one screen, no scrolling inside a story. */
@media (max-width:560px) and (max-height:760px){.slide{padding:48px 16px 24px}.kicker{margin-bottom:10px}h2{margin:2px 0 12px}.split{gap:16px}
  .hours{height:100px}.ticks{margin:6px 0 10px}.rows{gap:6px}.viz .label{margin-top:8px}
  .repos{gap:8px}.repos li{padding:10px 14px;gap:4px 12px}.repos .name{font-size:18px;gap:6px}.meta br{display:none}
  .types{grid-template-columns:1fr 1fr;column-gap:18px}.row.type{grid-template-columns:1fr 40px}.row.type em:first-of-type{display:none}
  .sub{font-size:16px;margin-top:8px}.chips{margin:4px 0 8px}
  .moment{padding:10px 14px}blockquote{font-size:15px}
  .summary{gap:12px}.summary-head .formats{margin-top:6px}.readme{display:none}}
@media (prefers-reduced-motion:reduce){.slide.active{animation:none;clip-path:none}.slide.leaving{visibility:hidden}.reveal{opacity:1;transform:none;transition:none}
  .music.on i,.arrow,.in .heat i,.in .hours i,.in .row b i,.landed .avatar,.in .col i,.in .ratio i,.in .share i{animation:none}
  .persona-name .ch,.after{opacity:1;transform:none;animation:none;transition:none}.burst,.sparks{display:none}}
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

// The personality reveal: the reel runs through every personality's badge, slows down and
// lands on yours. Timers rather than frames, so it finishes even where frames stall.
let spins = 0;
function spin(slide, box) {
  const order = JSON.parse(box.dataset.reel), faces = [...box.children], id = ++spins;
  const face = (k) => faces.forEach((f, i) => f.classList.toggle('on', i === k));
  const land = () => {
    face(order[order.length - 1]);
    slide.classList.remove('spinning');
    slide.classList.add('landed');
    if (Music && Music.on) Music.chime();
  };
  if (reduced) return land();
  // Swap the face before the page shows, so the answer never flashes first.
  face(order[0]);
  slide.classList.add('spinning');
  let k = 1;
  const step = () => {
    if (id !== spins || slides[current] !== slide) return;
    if (k === order.length - 1) return land();
    face(order[k]);
    if (Music && Music.on) Music.blip();
    const p = k++ / order.length;
    setTimeout(step, 45 + 320 * p * p * p);
  };
  setTimeout(step, 400);
}
// The owl's eyes follow the pointer.
addEventListener('pointermove', (e) => {
  document.querySelectorAll('.slide.active .art .a-pupils').forEach((g) => {
    const r = g.ownerSVGElement.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1, k = Math.min(2.5, d / 60);
    g.style.transform = 'translate(' + (dx / d * k).toFixed(2) + 'px,' + (dy / d * k).toFixed(2) + 'px)';
  });
}, { passive: true });
const slides = [...document.querySelectorAll('.slide')];
const bars = [...document.querySelectorAll('.progress i')];
let current = -1, settle = 0;
// "from" is where the next page opens: a tap's position, or else the side it comes from.
function show(i, from) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  if (i === current) return;
  const before = slides[current], forward = i > current;
  slides.forEach((s, k) => {
    s.classList.toggle('active', k === i);
    s.classList.toggle('leaving', s === before);
    s.classList.remove('first', 'settled');
    s.setAttribute('aria-hidden', String(k !== i));
    if (k !== i) s.classList.remove('in', 'spinning', 'landed');
  });
  const opening = slides[i];
  const x = from ? from.x : forward ? innerWidth : 0, y = from ? from.y : innerHeight / 2;
  opening.style.setProperty('--ox', x + 'px');
  opening.style.setProperty('--oy', y + 'px');
  if (!before) opening.classList.add('first');
  clearTimeout(settle);
  settle = setTimeout(() => {
    opening.classList.add('settled');
    slides.forEach((s) => s !== opening && s.classList.remove('leaving'));
  }, 900);
  // The progress bar, arrows and music button take the new page's ink.
  document.body.style.setProperty('--chrome', getComputedStyle(opening).getPropertyValue('--ink'));
  bars.forEach((b, k) => b.classList.toggle('done', k <= i));
  const slide = slides[i];
  slide.scrollTop = 0;
  const reel = slide.querySelector('.avatar[data-reel]');
  if (reel) spin(slide, reel);
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
  const at = { x: e.clientX, y: e.clientY };
  show(current + (e.clientX < innerWidth * 0.3 ? -1 : 1), at);
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
    /** A soft tick for each face of the personality reel. */
    blip() { if (on) note(88, ctx.currentTime, 0.06, 'square', 0.012, 5000); },
    /** A bright arpeggio when the personality lands. */
    chime() { if (on) [72, 76, 79, 84, 88].forEach((m, k) => note(m, ctx.currentTime + k * 0.06, 1.4, 'triangle', 0.05, 4500)); },
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
