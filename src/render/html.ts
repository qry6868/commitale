import { calendar, escapeXml as esc, fmt, heatLevels, onDark, pct } from '../format.ts';
import type { Strings } from '../i18n.ts';
import { change, type Moment, type Wrapped } from '../stats.ts';
import { CARD_SIZES, FONT, type CardFormat } from './card.ts';
import { themeFor, type Theme } from './theme.ts';

/** Two glow colors per slide, so each page feels like a new story. */
const SLIDE_COLORS = [
  ['#6d28d9', '#db2777'],
  ['#1d4ed8', '#7c3aed'],
  ['#047857', '#0e7490'],
  ['#9d174d', '#6d28d9'],
  ['#b45309', '#be123c'],
  ['#0f766e', '#1d4ed8'],
  ['#7c2d12', '#9d174d'],
  ['#4338ca', '#0891b2'],
  ['#a21caf', '#4f46e5'],
];

const LINES_PER_PAGE = 50;
const FORMATS: CardFormat[] = ['wide', 'square', 'story'];

export function renderHtml(w: Wrapped, t: Strings, cards: Record<CardFormat, string>): string {
  const theme = themeFor(w);
  const slides: { body: string; colors?: string[] }[] = [
    { body: intro(w, t) },
    { body: commits(w, t) },
    { body: lines(w, t) },
    { body: heatmap(w, t, theme) },
    { body: rhythm(w, t) },
    { body: moments(w, t) },
    { body: languages(w, t) },
    { body: repos(w, t) },
    { body: words(w, t) },
    // The reveal and the share page wear the personality's own colors.
    { body: persona(w, t), colors: theme.glow },
    { body: share(w, t, cards), colors: theme.glow },
  ].filter((s) => Boolean(s.body));

  const sections = slides
    .map((s, i) => {
      const [c1, c2] = s.colors ?? SLIDE_COLORS[i % SLIDE_COLORS.length];
      return `<section class="slide" style="--c1:${c1};--c2:${c2}"><div class="inner">${s.body}</div></section>`;
    })
    .join('\n');

  const shareText = JSON.stringify(t.shareText(w)).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>commitale ${w.year} · ${esc(w.name)}</title>
<style>${CSS}
:root{--accent:${theme.accent};--g1:${theme.glow[0]};--g2:${theme.heat[4]}}</style>
</head>
<body>
<div class="progress" aria-hidden="true">${slides.map(() => '<i><b></b></i>').join('')}</div>
${sections}
<div class="nav"><button class="prev" aria-label="Previous">‹</button><button class="next" aria-label="Next">›</button></div>
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
  const p = change(now, before);
  if (p === undefined || !w.previous) return '';
  return `<p class="delta ${p >= 0 ? 'up' : 'down'}" ${reveal(d)}>${esc(t.vsYear(p, w.previous.year, w.previous.partial))}</p>`;
}

function intro(w: Wrapped, t: Strings): string {
  return `<div class="kicker" ${reveal(0)}>commitale · ${w.year}</div>
<h1 ${reveal(1)}>${esc(t.hello(w.name, w.year))}</h1>
<div class="hint" ${reveal(3)}>${esc(t.scroll)} <span class="arrow">→</span></div>`;
}

function commits(w: Wrapped, t: Strings): string {
  return `<div class="big" ${reveal(0)}>${count(w.commits)}</div>
<h2 ${reveal(1)}>${esc(t.commitsLabel)}</h2>
${delta(w.commits, w.previous?.commits, w, t, 2)}
<p class="sub" ${reveal(2)}>${esc(t.commitsSub(w.repos, w.activeDays))}</p>
<p class="sub" ${reveal(3)}>${esc(t.showedUp(pct(w.activeDays / w.daysInYear)))}</p>`;
}

function lines(w: Wrapped, t: Strings): string {
  const pages = Math.max(1, Math.round(w.added / LINES_PER_PAGE));
  return `<div class="kicker" ${reveal(0)}>${esc(t.linesTitle)}</div>
<div class="big plus" ${reveal(1)}>${count(w.added, '+')}</div>
<div class="label" ${reveal(1)}>${esc(t.added)}</div>
${delta(w.added, w.previous?.added, w, t, 1)}
<div class="big minus" ${reveal(2)}>${count(w.deleted, '−')}</div>
<div class="label" ${reveal(2)}>${esc(t.deleted)}</div>
<p class="sub" ${reveal(3)}>${esc(t.pages(fmt(pages)))}</p>`;
}

function heatmap(w: Wrapped, t: Strings, theme: Theme): string {
  const level = heatLevels(w.daily);
  const { cells, cols } = calendar(w.year);
  const grid = cells
    .map((c) => {
      const n = w.daily[c.date] ?? 0;
      return `<i style="grid-area:${c.row + 1}/${c.col + 1};background:${theme.heat[level(n)]};--i:${c.col}" title="${esc(t.date(c.date))} · ${esc(t.commitsN(n))}"></i>`;
    })
    .join('');
  const months = t.months
    .map((m, i) => {
      const first = cells.find((c) => Number(c.date.slice(5, 7)) === i + 1)!;
      return `<span style="grid-column:${first.col + 1}">${esc(m)}</span>`;
    })
    .join('');
  const columns = `grid-template-columns:repeat(${cols},minmax(0,1fr))`;
  const s = w.longestStreak;
  const lastYear = w.previous ? `<div class="label">${esc(t.lastYearStreak(w.previous.longestStreak, w.previous.partial))}</div>` : '';
  return `<div class="kicker" ${reveal(0)}>${esc(t.heatTitle)}</div>
<div ${reveal(1)}>
  <div class="months" style="${columns}">${months}</div>
  <div class="heat" style="${columns}">${grid}</div>
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
  const days = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => `<div class="row"><span>${esc(t.weekdays[d])}</span><b><i style="width:${(w.byWeekday[d] / maxDay) * 100}%"></i></b><em>${fmt(w.byWeekday[d])}</em></div>`)
    .join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.rhythmTitle)}</div>
<h2 ${reveal(1)}>${esc(t.peakHour(t.hour(w.peakHour)))}</h2>
<div class="hours" ${reveal(2)}>${hours}</div>
<div class="ticks" ${reveal(2)}>${ticks}</div>
<div class="rows" ${reveal(3)}>${days}</div>
<p class="sub" ${reveal(4)}>${esc(t.peakDay(t.weekdays[w.peakWeekday]))} ${esc(t.peakMonth(t.months[w.peakMonth]))}</p>`;
}

function moments(w: Wrapped, t: Strings): string {
  const card = (label: string, m: Moment, d: number, extra = ''): string => `<div class="moment" ${reveal(d)}>
  <div class="label">${esc(label)}</div>
  <div class="when">${esc(t.date(m.date))} · ${m.time}</div>
  ${m.subject ? `<blockquote>${esc(m.subject)}</blockquote>` : ''}
  <div class="label">${esc(m.repo)}${extra}</div>
</div>`;
  const cards = [
    card(t.first, w.firstCommit, 1),
    w.latestNight ? card(t.latest, w.latestNight, 2) : '',
    card(t.biggest, w.biggestCommit, 3, ` · ${esc(t.linesN(fmt(w.biggestCommit.lines)))}`),
    card(t.last, w.lastCommit, 4),
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
  const rows = w.topRepos
    .map((r, i) => `<li ${reveal(i + 1)}><span class="rank">${i + 1}</span><span class="name">${esc(r.name)}</span><span class="meta">${esc(t.commitsN(r.commits))}<br><span class="plus">+${fmt(r.added)}</span> <span class="minus">−${fmt(r.deleted)}</span></span></li>`)
    .join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.reposTitle)}</div><ol class="repos">${rows}</ol>`;
}

function words(w: Wrapped, t: Strings): string {
  if (w.words.length === 0) return '';
  const max = w.words[0].count;
  const chips = w.words
    .map((x) => `<span class="chip" style="font-size:${16 + Math.round((x.count / max) * 28)}px" title="${fmt(x.count)}">${esc(x.word)}</span>`)
    .join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.wordsTitle)}</div>
<div class="chips" ${reveal(1)}>${chips}</div>
<p class="sub" ${reveal(2)}>${esc(t.fixes(w.fixCommits, pct(w.fixCommits / w.commits)))}</p>
<p class="sub" ${reveal(3)}>${esc(t.avgLen(w.avgMessageLength))}</p>`;
}

function persona(w: Wrapped, t: Strings): string {
  const [main, ...others] = w.personas.map((id) => t.personas[id]);
  const badges = others.length
    ? `<div class="badges" ${reveal(4)}><span class="label">${esc(t.alsoYou)}</span>${others.map((p) => `<span class="chip">${p.emoji} ${esc(p.name)}</span>`).join('')}</div>`
    : '';
  return `<div class="kicker" ${reveal(0)}>${esc(t.personaIntro)}</div>
<div class="emoji" ${reveal(1)}>${main.emoji}</div>
<h1 ${reveal(2)}>${esc(main.name)}</h1>
<p class="sub" ${reveal(3)}>${esc(main.desc(w))}</p>
${badges}`;
}

function share(w: Wrapped, t: Strings, cards: Record<CardFormat, string>): string {
  const file = `commitale-${w.year}.svg`;
  const tabs = FORMATS.map((f) => `<button class="fmt${f === 'wide' ? ' on' : ''}" data-format="${f}" aria-pressed="${f === 'wide'}">${esc(t.formats[f])}</button>`).join('');
  const previews = FORMATS.map((f) => `<div class="card card-${f}" data-format="${f}"${f === 'wide' ? '' : ' hidden'}>${cards[f]}</div>`).join('');
  return `<div class="kicker" ${reveal(0)}>${esc(t.shareTitle)}</div>
<div class="formats" ${reveal(1)}>${tabs}</div>
<div id="cards" ${reveal(1)}>${previews}</div>
<div class="buttons" ${reveal(2)}>
  <button data-action="png">${esc(t.downloadPng)}</button>
  <button data-action="svg" class="ghost">${esc(t.downloadSvg)}</button>
  <button data-action="copy" class="ghost">${esc(t.copyText)}</button>
</div>
<p class="label" ${reveal(3)}>${esc(t.readmeHint)}</p>
<code ${reveal(3)}>![commitale ${w.year}](./${file})</code>
<p class="footer" ${reveal(4)}>${esc(t.footer)}</p>`;
}

const CSS = `
*{box-sizing:border-box}
:root{color-scheme:dark;--ink:#fff;--muted:rgba(255,255,255,.68);--plus:#86efac;--minus:#fda4af}
html,body{height:100%;overflow:hidden;background:#0d0a1a}
body{margin:0;color:var(--ink);font-family:${FONT};-webkit-font-smoothing:antialiased;user-select:none;-webkit-tap-highlight-color:transparent}
.slide{position:fixed;inset:0;overflow-y:auto;padding:56px 16px 40px;
  background:radial-gradient(circle at 85% 10%,var(--c1) 0,transparent 55%),radial-gradient(circle at 5% 95%,var(--c2) 0,transparent 50%),#0d0a1a;
  opacity:0;visibility:hidden;transform:translateY(28px) scale(.98);
  transition:opacity .45s ease,transform .6s cubic-bezier(.2,.7,.2,1),visibility 0s linear .6s}
.slide.past{transform:translateY(-28px) scale(.98)}
.slide.active{opacity:1;visibility:visible;transform:none;transition:opacity .45s ease,transform .6s cubic-bezier(.2,.7,.2,1),visibility 0s}
.inner{width:100%;max-width:880px;min-height:100%;margin:0 auto;display:flex;flex-direction:column;justify-content:center}
.progress{position:fixed;top:14px;left:16px;right:16px;display:flex;gap:4px;z-index:10;pointer-events:none}
.progress i{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.22);overflow:hidden}
.progress b{display:block;height:100%;width:0;background:#fff;transition:width .4s ease}
.progress i.done b{width:100%}
.nav button{position:fixed;top:50%;transform:translateY(-50%);z-index:10;width:44px;height:44px;padding:0;border-radius:50%;
  background:rgba(255,255,255,.1);color:#fff;font-size:26px;line-height:44px}
.nav .prev{left:12px}.nav .next{right:12px}
@media (hover:none),(max-width:960px){.nav{display:none}}
.kicker{text-transform:uppercase;letter-spacing:.16em;font-size:14px;font-weight:700;color:var(--accent);margin-bottom:16px}
h1{font-size:clamp(40px,8vw,88px);line-height:1.02;letter-spacing:-.035em;margin:0 0 24px;font-weight:900;text-wrap:balance}
h2{font-size:clamp(26px,4.6vw,44px);letter-spacing:-.02em;margin:4px 0 20px;font-weight:800;text-wrap:balance}
.big{font-size:clamp(64px,15vw,168px);font-weight:900;line-height:.95;letter-spacing:-.045em;font-variant-numeric:tabular-nums}
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
.fact{font-size:clamp(28px,5vw,44px);font-weight:800;letter-spacing:-.02em}
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
.moments{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.moment{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:20px 22px}
.moment .label{margin:0}
.when{font-size:22px;font-weight:800;margin:6px 0 10px}
blockquote{margin:0 0 12px;font-size:17px;line-height:1.4;overflow-wrap:anywhere}
blockquote::before{content:'“'}blockquote::after{content:'”'}
.repos{list-style:none;padding:0;margin:0;display:grid;gap:12px}
.repos li{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:16px;padding:16px 20px;border-radius:18px;background:rgba(255,255,255,.07)}
.rank{font-size:28px;font-weight:900;color:var(--accent)}
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
.card-square{max-width:min(100%,52vh)}
.card-story{max-width:min(100%,29vh)}
.card svg{width:100%;height:auto;display:block;border-radius:clamp(10px,2vw,24px);box-shadow:0 30px 80px rgba(0,0,0,.45)}
.buttons{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}
button{font:inherit;font-weight:700;font-size:16px;padding:12px 22px;border-radius:999px;border:0;cursor:pointer;background:#fff;color:#1a1033}
button.ghost{background:rgba(255,255,255,.1);color:#fff}
button:hover{filter:brightness(.92)}
button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
code{display:block;padding:14px 16px;border-radius:12px;background:rgba(0,0,0,.35);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;overflow-x:auto;white-space:nowrap;user-select:text}
.footer{margin-top:32px;color:var(--muted);font-size:14px}
.reveal{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1);transition-delay:calc(var(--d,0)*120ms)}
.in .reveal{opacity:1;transform:none}
@media (max-width:560px){.rows.wide .row{grid-template-columns:96px 1fr 44px;font-size:16px}.repos li{grid-template-columns:32px 1fr}.meta{grid-column:2;text-align:left}
  .moments{grid-template-columns:1fr}.months{font-size:10px}.months span:nth-child(even){visibility:hidden}}
@media (prefers-reduced-motion:reduce){.slide,.slide.past{transform:none;transition:opacity .2s,visibility 0s}.reveal{opacity:1;transform:none;transition:none}
  .arrow,.in .heat i,.in .hours i,.in .row b i,.in .emoji{animation:none}}
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
  // Replay the page's animations every time it is shown.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    slide.classList.add('in');
    slide.querySelectorAll('[data-count]').forEach(countUp);
  }));
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

let format = 'wide';
document.querySelectorAll('.formats button').forEach((b) => b.addEventListener('click', () => {
  format = b.dataset.format;
  document.querySelectorAll('.formats button').forEach((x) => {
    x.classList.toggle('on', x === b);
    x.setAttribute('aria-pressed', String(x === b));
  });
  document.querySelectorAll('#cards .card').forEach((c) => { c.hidden = c.dataset.format !== format; });
}));

function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const fileName = (ext) => 'commitale-' + YEAR + (format === 'wide' ? '' : '-' + format) + '.' + ext;
const svgText = () => new XMLSerializer().serializeToString(document.querySelector('#cards .card[data-format="' + format + '"] svg'));
const actions = {
  svg: () => save(new Blob([svgText()], { type: 'image/svg+xml' }), fileName('svg')),
  png: async () => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText());
    await img.decode();
    const [w, h] = SIZES[format];
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
`;
