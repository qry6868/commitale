import { calendar, escapeXml as esc, fmt, heatLevels, onDark, pct } from '../format.ts';
import type { Strings } from '../i18n.ts';
import type { Moment, Wrapped } from '../stats.ts';
import { FONT, HEAT_COLORS } from './card.ts';

/** Two glow colors per slide, so scrolling feels like flipping through stories. */
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
  ['#be185d', '#7c3aed'],
  ['#312e81', '#86198f'],
];

const LINES_PER_PAGE = 50;

export function renderHtml(w: Wrapped, t: Strings, cardSvg: string): string {
  const slides = [
    intro(w, t),
    commits(w, t),
    lines(w, t),
    heatmap(w, t),
    rhythm(w, t),
    moments(w, t),
    languages(w, t),
    repos(w, t),
    words(w, t),
    persona(w, t),
    share(w, t, cardSvg),
  ].filter((s): s is string => Boolean(s));

  const sections = slides
    .map((body, i) => {
      const [c1, c2] = SLIDE_COLORS[i % SLIDE_COLORS.length];
      return `<section class="slide" style="--c1:${c1};--c2:${c2}"><div class="inner">${body}</div></section>`;
    })
    .join('\n');

  const shareText = JSON.stringify(t.shareText(w)).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>git wrapped ${w.year} · ${esc(w.name)}</title>
<style>${CSS}</style>
</head>
<body>
${sections}
<script>
const SHARE_TEXT = ${shareText};
const YEAR = ${w.year};
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

function intro(w: Wrapped, t: Strings): string {
  return `<div class="kicker" ${reveal(0)}>git wrapped · ${w.year}</div>
<h1 ${reveal(1)}>${esc(t.hello(w.name, w.year))}</h1>
<div class="hint" ${reveal(3)}>${esc(t.scroll)} <span class="arrow">↓</span></div>`;
}

function commits(w: Wrapped, t: Strings): string {
  return `<div class="big" ${reveal(0)}>${count(w.commits)}</div>
<h2 ${reveal(1)}>${esc(t.commitsLabel)}</h2>
<p class="sub" ${reveal(2)}>${esc(t.commitsSub(w.repos, w.activeDays))}</p>
<p class="sub" ${reveal(3)}>${esc(t.showedUp(pct(w.activeDays / w.daysInYear)))}</p>`;
}

function lines(w: Wrapped, t: Strings): string {
  const pages = Math.max(1, Math.round(w.added / LINES_PER_PAGE));
  return `<div class="kicker" ${reveal(0)}>${esc(t.linesTitle)}</div>
<div class="big plus" ${reveal(1)}>${count(w.added, '+')}</div>
<div class="label" ${reveal(1)}>${esc(t.added)}</div>
<div class="big minus" ${reveal(2)}>${count(w.deleted, '−')}</div>
<div class="label" ${reveal(2)}>${esc(t.deleted)}</div>
<p class="sub" ${reveal(3)}>${esc(t.pages(fmt(pages)))}</p>`;
}

function heatmap(w: Wrapped, t: Strings): string {
  const level = heatLevels(w.daily);
  const { cells, cols } = calendar(w.year);
  const grid = cells
    .map((c) => {
      const n = w.daily[c.date] ?? 0;
      return `<i style="grid-area:${c.row + 1}/${c.col + 1};background:${HEAT_COLORS[level(n)]}" title="${esc(t.date(c.date))} · ${esc(t.commitsN(n))}"></i>`;
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
  return `<div class="kicker" ${reveal(0)}>${esc(t.heatTitle)}</div>
<div ${reveal(1)}>
  <div class="months" style="${columns}">${months}</div>
  <div class="heat" style="${columns}">${grid}</div>
</div>
<div class="facts">
  <div ${reveal(2)}><div class="label">${esc(t.streak)}</div><div class="fact">${esc(t.days(s.days))}</div><div class="label">${esc(t.date(s.start))} → ${esc(t.date(s.end))}</div></div>
  <div ${reveal(3)}><div class="label">${esc(t.busiest)}</div><div class="fact">${esc(t.date(w.busiestDay.date))}</div><div class="label">${esc(t.commitsN(w.busiestDay.commits))}</div></div>
</div>`;
}

function rhythm(w: Wrapped, t: Strings): string {
  const maxHour = Math.max(...w.byHour, 1);
  const hours = w.byHour
    .map((v, h) => `<i class="${h === w.peakHour ? 'peak' : ''}" style="height:${Math.max(2, (v / maxHour) * 100)}%" title="${esc(t.hour(h))} · ${esc(t.commitsN(v))}"></i>`)
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

function languages(w: Wrapped, t: Strings): string | undefined {
  if (w.languages.length === 0) return undefined;
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

function words(w: Wrapped, t: Strings): string | undefined {
  if (w.words.length === 0) return undefined;
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

function share(w: Wrapped, t: Strings, cardSvg: string): string {
  const file = `git-wrapped-${w.year}.svg`;
  return `<div class="kicker" ${reveal(0)}>${esc(t.shareTitle)}</div>
<div id="card" ${reveal(1)}>${cardSvg}</div>
<div class="buttons" ${reveal(2)}>
  <button data-action="png">${esc(t.downloadPng)}</button>
  <button data-action="svg" class="ghost">${esc(t.downloadSvg)}</button>
  <button data-action="copy" class="ghost">${esc(t.copyText)}</button>
</div>
<p class="label" ${reveal(3)}>${esc(t.readmeHint)}</p>
<code ${reveal(3)}>![git wrapped ${w.year}](./${file})</code>
<p class="footer" ${reveal(4)}>${esc(t.footer)}</p>`;
}

const CSS = `
*{box-sizing:border-box}
:root{color-scheme:dark;--ink:#fff;--muted:rgba(255,255,255,.68);--accent:#c4b5fd;--plus:#86efac;--minus:#fda4af}
html{scroll-snap-type:y mandatory;background:#0d0a1a}
body{margin:0;background:#0d0a1a;color:var(--ink);font-family:${FONT};-webkit-font-smoothing:antialiased}
.slide{min-height:100svh;scroll-snap-align:start;display:flex;align-items:center;padding:72px 16px;
  background:radial-gradient(circle at 85% 10%,var(--c1) 0,transparent 55%),radial-gradient(circle at 5% 95%,var(--c2) 0,transparent 50%),#0d0a1a}
.inner{width:100%;max-width:880px;margin:0 auto}
.kicker{text-transform:uppercase;letter-spacing:.16em;font-size:14px;font-weight:700;color:var(--accent);margin-bottom:16px}
h1{font-size:clamp(40px,8vw,88px);line-height:1.02;letter-spacing:-.035em;margin:0 0 24px;font-weight:900;text-wrap:balance}
h2{font-size:clamp(26px,4.6vw,44px);letter-spacing:-.02em;margin:4px 0 20px;font-weight:800;text-wrap:balance}
.big{font-size:clamp(64px,15vw,168px);font-weight:900;line-height:.95;letter-spacing:-.045em;font-variant-numeric:tabular-nums}
.sub{font-size:clamp(18px,2.4vw,24px);color:var(--muted);line-height:1.45;margin:12px 0 0;text-wrap:pretty}
.label{color:var(--muted);font-size:15px;margin:4px 0 20px}
.plus{color:var(--plus)}.minus{color:var(--minus)}
.hint{margin-top:48px;color:var(--muted)}
.arrow{display:inline-block;animation:bob 1.6s ease-in-out infinite}
@keyframes bob{50%{transform:translateY(6px)}}
.heat{display:grid;grid-template-rows:repeat(7,1fr);gap:3px;margin:8px 0 36px}
.heat i{aspect-ratio:1;border-radius:3px}
.months{display:grid;gap:3px;margin-bottom:8px;font-size:12px;color:var(--muted)}
.months span{grid-row:1;white-space:nowrap}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px}
.fact{font-size:clamp(28px,5vw,44px);font-weight:800;letter-spacing:-.02em}
.hours{display:flex;align-items:flex-end;gap:3px;height:180px}
.hours i{flex:1;border-radius:4px 4px 0 0;background:rgba(255,255,255,.28)}
.hours i.peak{background:linear-gradient(#f0abfc,#8b5cf6)}
.ticks{position:relative;height:24px;margin:8px 0 32px;color:var(--muted);font-size:13px}
.ticks span{position:absolute}
.rows{display:grid;gap:10px;max-width:560px}
.rows.wide{max-width:none}
.row{display:grid;grid-template-columns:minmax(64px,auto) 1fr 56px;align-items:center;gap:14px}
.rows.wide .row{grid-template-columns:minmax(120px,180px) 1fr 56px;font-size:20px}
.row b{height:14px;border-radius:7px;background:rgba(255,255,255,.08);overflow:hidden}
.rows.wide .row b{height:20px;border-radius:10px}
.row b i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8b5cf6,#f0abfc)}
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
.badges{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:28px}
.badges .label{margin:0 6px 0 0}
#card svg{width:100%;height:auto;display:block;border-radius:clamp(12px,2.4vw,28px);box-shadow:0 30px 80px rgba(0,0,0,.45)}
.buttons{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0}
button{font:inherit;font-weight:700;font-size:16px;padding:12px 22px;border-radius:999px;border:0;cursor:pointer;background:#fff;color:#1a1033}
button.ghost{background:rgba(255,255,255,.1);color:#fff}
button:hover{filter:brightness(.92)}
button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
code{display:block;padding:14px 16px;border-radius:12px;background:rgba(0,0,0,.35);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;overflow-x:auto;white-space:nowrap}
.footer{margin-top:40px;color:var(--muted);font-size:14px}
.reveal{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1);transition-delay:calc(var(--d,0)*120ms)}
.in .reveal{opacity:1;transform:none}
@media (max-width:560px){.rows.wide .row{grid-template-columns:96px 1fr 44px;font-size:16px}.repos li{grid-template-columns:32px 1fr}.meta{grid-column:2;text-align:left}
  .moments{grid-template-columns:1fr}.months{font-size:10px}.months span:nth-child(even){visibility:hidden}}
@media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}.arrow{animation:none}html{scroll-snap-type:none}}
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
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    e.target.querySelectorAll('[data-count]').forEach(countUp);
    io.unobserve(e.target);
  }
}, { threshold: 0.2 });
document.querySelectorAll('.slide').forEach((s) => io.observe(s));

function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const svgText = () => new XMLSerializer().serializeToString(document.querySelector('#card svg'));
const actions = {
  svg: () => save(new Blob([svgText()], { type: 'image/svg+xml' }), 'git-wrapped-' + YEAR + '.svg'),
  png: async () => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText());
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1260;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => save(blob, 'git-wrapped-' + YEAR + '.png'), 'image/png');
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
