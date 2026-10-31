import { calendar, compact, escapeXml as esc, fmt, heatLevels, onDark, pct } from '../format.ts';
import type { Strings } from '../i18n.ts';
import type { Wrapped } from '../stats.ts';

export const HEAT_COLORS = ['rgba(255,255,255,0.08)', '#4c3bcf', '#8b5cf6', '#d946ef', '#fb7185'];
export const FONT =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', Helvetica, Arial, sans-serif";

const W = 1200;
const H = 630;

/** A 1200x630 share card: the size social sites expect for link previews. */
export function renderCard(w: Wrapped, t: Strings): string {
  const persona = t.personas[w.personas[0]];
  const level = heatLevels(w.daily);

  const tiles = [
    [w.commits >= 100_000 ? compact(w.commits) : fmt(w.commits), t.cardCommits],
    [compact(w.added), t.cardAdded],
    [fmt(w.activeDays), t.cardDays],
    [fmt(w.longestStreak.days), t.cardStreak],
  ]
    .map(([value, label], i) => {
      const x = 64 + i * 274;
      return `<rect x="${x}" y="248" width="250" height="132" rx="20" fill="#fff" fill-opacity="0.06"/>
  <text x="${x + 24}" y="324" font-size="52" font-weight="800" fill="#fff">${esc(value)}</text>
  <text x="${x + 24}" y="358" font-size="18" fill="#fff" fill-opacity="0.66">${esc(label)}</text>`;
    })
    .join('\n  ');

  const heat = calendar(w.year)
    .cells.map((c) => {
      const fill = HEAT_COLORS[level(w.daily[c.date] ?? 0)];
      return `<rect x="${64 + c.col * 13}" y="${432 + c.row * 13}" width="11" height="11" rx="2.5" fill="${fill}"/>`;
    })
    .join('');

  const top = w.languages.slice(0, 4);
  const rest = 1 - top.reduce((s, l) => s + l.share, 0);
  let x = 800;
  const bar = [...top.map((l) => ({ color: onDark(l.color), share: l.share })), { color: '#6b6385', share: rest }]
    .filter((s) => s.share > 0.001)
    .map((s) => {
      const width = s.share * 336;
      const rect = `<rect x="${x.toFixed(1)}" y="452" width="${width.toFixed(1)}" height="12" fill="${s.color}"/>`;
      x += width;
      return rect;
    })
    .join('');
  const legend = top
    .slice(0, 3)
    .map((l, i) => {
      const y = 494 + i * 28;
      return `<circle cx="806" cy="${y - 6}" r="6" fill="${onDark(l.color)}"/>
  <text x="822" y="${y}" font-size="18" fill="#fff">${esc(l.name)}</text>
  <text x="1136" y="${y}" font-size="18" fill="#fff" fill-opacity="0.66" text-anchor="end">${pct(l.share)}%</text>`;
    })
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a1033"/>
      <stop offset="0.55" stop-color="#2a1150"/>
      <stop offset="1" stop-color="#3b0d3a"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
    <clipPath id="bar"><rect x="800" y="452" width="336" height="12" rx="6"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="1120" cy="20" r="260" fill="#8b5cf6" fill-opacity="0.45" filter="url(#glow)"/>
    <circle cx="80" cy="640" r="220" fill="#ec4899" fill-opacity="0.3" filter="url(#glow)"/>
  </g>
  <text x="64" y="96" font-size="16" font-weight="700" letter-spacing="3" fill="#c4b5fd">GIT WRAPPED · ${w.year}</text>
  <text x="64" y="156" font-size="50" font-weight="800" fill="#fff">${esc(t.cardTitle(w.year))}</text>
  <text x="64" y="200" font-size="24" fill="#fff" fill-opacity="0.7">${esc(w.name)}</text>
  <rect x="744" y="70" width="392" height="120" rx="24" fill="#fff" fill-opacity="0.08"/>
  <text x="772" y="152" font-size="56">${persona.emoji}</text>
  <text x="852" y="118" font-size="15" font-weight="700" letter-spacing="1.5" fill="#c4b5fd">${esc(t.youAre.toUpperCase())}</text>
  <text x="852" y="154" font-size="26" font-weight="800" fill="#fff">${esc(persona.name)}</text>
  ${tiles}
  ${heat}
  <text x="800" y="438" font-size="15" font-weight="700" letter-spacing="1.5" fill="#c4b5fd">${esc(t.topLanguages.toUpperCase())}</text>
  <g clip-path="url(#bar)"><rect x="800" y="452" width="336" height="12" fill="#6b6385"/>${bar}</g>
  ${legend}
  <text x="64" y="590" font-size="18" fill="#fff" fill-opacity="0.55" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">$ npx git-wrapped</text>
</svg>
`;
}
