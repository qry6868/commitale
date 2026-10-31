import { calendar, compact, escapeXml as esc, fmt, heatLevels, onDark, pct } from '../format.ts';
import type { Strings } from '../i18n.ts';
import { change, type Wrapped } from '../stats.ts';
import { themeFor } from './theme.ts';

export const FONT =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', Helvetica, Arial, sans-serif";
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export type CardFormat = 'wide' | 'square' | 'story';

/** Wide suits link previews and GitHub; square and story suit WeChat Moments, Xiaohongshu and Instagram. */
export const CARD_SIZES: Record<CardFormat, [number, number]> = {
  wide: [1200, 630],
  square: [1080, 1080],
  story: [1080, 1920],
};

interface Layout {
  pad: number;
  kicker: [y: number, size: number];
  title: [y: number, size: number];
  name: [y: number, size: number];
  persona: { x: number; y: number; w: number; h: number; emoji: number; label: number; name: number };
  tiles: { y: number; cols: number; w: number; h: number; gap: number; num: number; label: number; delta: number };
  heat: { y: number; step: number };
  /** `list`: a title, a bar and one row per language; `inline`: a bar and one legend row. */
  langs: { mode: 'list' | 'inline'; x: number; y: number; w: number; rows: number; size: number };
  footer: [y: number, size: number];
}

const LAYOUTS: Record<CardFormat, Layout> = {
  wide: {
    pad: 64,
    kicker: [96, 16],
    title: [156, 50],
    name: [200, 24],
    persona: { x: 744, y: 70, w: 392, h: 120, emoji: 56, label: 15, name: 26 },
    tiles: { y: 248, cols: 4, w: 250, h: 132, gap: 24, num: 52, label: 18, delta: 14 },
    heat: { y: 432, step: 13 },
    langs: { mode: 'list', x: 800, y: 438, w: 336, rows: 3, size: 18 },
    footer: [590, 18],
  },
  square: {
    pad: 72,
    kicker: [110, 20],
    title: [182, 58],
    name: [230, 30],
    persona: { x: 72, y: 268, w: 936, h: 128, emoji: 64, label: 18, name: 36 },
    tiles: { y: 428, cols: 2, w: 456, h: 148, gap: 24, num: 64, label: 22, delta: 18 },
    heat: { y: 790, step: 17 },
    langs: { mode: 'inline', x: 72, y: 940, w: 936, rows: 3, size: 22 },
    footer: [1040, 22],
  },
  story: {
    pad: 88,
    kicker: [220, 24],
    title: [318, 72],
    name: [384, 36],
    persona: { x: 88, y: 450, w: 904, h: 220, emoji: 120, label: 24, name: 52 },
    tiles: { y: 710, cols: 2, w: 440, h: 210, gap: 24, num: 88, label: 28, delta: 24 },
    heat: { y: 1218, step: 17 },
    langs: { mode: 'list', x: 88, y: 1420, w: 904, rows: 4, size: 32 },
    footer: [1820, 30],
  },
};

const UP = '#86efac';
const DOWN = '#fda4af';

export function renderCard(w: Wrapped, t: Strings, format: CardFormat = 'wide'): string {
  const L = LAYOUTS[format];
  const [W, H] = CARD_SIZES[format];
  const theme = themeFor(w);
  const persona = t.personas[w.personas[0]];
  const prev = w.previous;

  // AI tokens make a better boast than active days, so they take that slot when present.
  const third = w.ai
    ? { value: t.tokens(w.ai.tokens), label: t.cardTokens, delta: change(w.ai.tokens, w.ai.previous?.tokens), base: w.ai.previous }
    : { value: fmt(w.activeDays), label: t.cardDays, delta: change(w.activeDays, prev?.activeDays), base: prev };
  const tiles = [
    { value: w.commits >= 100_000 ? compact(w.commits) : fmt(w.commits), label: t.cardCommits, delta: change(w.commits, prev?.commits), base: prev },
    { value: compact(w.added), label: t.cardAdded, delta: change(w.added, prev?.added), base: prev },
    third,
    { value: fmt(w.longestStreak.days), label: t.cardStreak, delta: change(w.longestStreak.days, prev?.longestStreak), base: prev },
  ]
    .map((tile, i) => {
      const T = L.tiles;
      const x = L.pad + (i % T.cols) * (T.w + T.gap);
      const y = T.y + Math.floor(i / T.cols) * (T.h + T.gap);
      const pad = Math.round(T.num * 0.45);
      const delta =
        tile.delta === undefined || !tile.base
          ? ''
          : `<text x="${x + T.w - pad}" y="${y + Math.round(T.h * 0.84)}" font-size="${T.delta}" font-weight="700" text-anchor="end" fill="${tile.delta >= 0 ? UP : DOWN}">${esc(t.cardVs(tile.delta, tile.base.year, tile.base.partial))}</text>`;
      return `<rect x="${x}" y="${y}" width="${T.w}" height="${T.h}" rx="${Math.round(T.h / 6.6)}" fill="#fff" fill-opacity="0.07"/>
  ${delta}
  <text x="${x + pad}" y="${y + Math.round(T.h * 0.58)}" font-size="${T.num}" font-weight="800" fill="#fff">${esc(tile.value)}</text>
  <text x="${x + pad}" y="${y + Math.round(T.h * 0.84)}" font-size="${T.label}" fill="#fff" fill-opacity="0.66">${esc(tile.label)}</text>`;
    })
    .join('\n  ');

  const level = heatLevels(w.daily);
  const { cells, cols } = calendar(w.year);
  const { step } = L.heat;
  const cell = step * 0.85;
  const heatX = format === 'wide' ? L.pad : L.pad + Math.round((W - 2 * L.pad - cols * step) / 2);
  const heat = cells
    .map((c) => {
      const fill = theme.heat[level(w.daily[c.date] ?? 0)];
      return `<rect x="${(heatX + c.col * step).toFixed(1)}" y="${(L.heat.y + c.row * step).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="${(cell / 4.4).toFixed(1)}" fill="${fill}"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <defs>
    <linearGradient id="${format}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.bg[0]}"/>
      <stop offset="0.55" stop-color="${theme.bg[1]}"/>
      <stop offset="1" stop-color="${theme.bg[2]}"/>
    </linearGradient>
    <filter id="${format}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(W / 17)}"/></filter>
    <clipPath id="${format}-frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
  </defs>
  <g clip-path="url(#${format}-frame)">
    <rect width="${W}" height="${H}" fill="url(#${format}-bg)"/>
    <circle cx="${W - 80}" cy="20" r="${Math.round(W * 0.22)}" fill="${theme.glow[0]}" fill-opacity="0.45" filter="url(#${format}-glow)"/>
    <circle cx="80" cy="${H + 10}" r="${Math.round(W * 0.19)}" fill="${theme.glow[1]}" fill-opacity="0.32" filter="url(#${format}-glow)"/>
  </g>
  <text x="${L.pad}" y="${L.kicker[0]}" font-size="${L.kicker[1]}" font-weight="700" letter-spacing="${L.kicker[1] / 5}" fill="${theme.accent}">COMMITALE · ${w.year}</text>
  <text x="${L.pad}" y="${L.title[0]}" font-size="${L.title[1]}" font-weight="800" fill="#fff">${esc(t.cardTitle(w.year))}</text>
  <text x="${L.pad}" y="${L.name[0]}" font-size="${L.name[1]}" fill="#fff" fill-opacity="0.7">${esc(w.name)}</text>
  ${personaBlock(L, theme.accent, persona.emoji, t.youAre, persona.name)}
  ${tiles}
  ${heat}
  ${languages(w, t, L, theme.accent, format)}
  <text x="${L.pad}" y="${L.footer[0]}" font-size="${L.footer[1]}" fill="#fff" fill-opacity="0.55" font-family="${MONO}">$ npx commitale</text>
</svg>
`;
}

function personaBlock(L: Layout, accent: string, emoji: string, youAre: string, name: string): string {
  const P = L.persona;
  const textX = P.x + P.emoji * 2;
  return `<rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" rx="${Math.round(P.h / 5)}" fill="#fff" fill-opacity="0.08"/>
  <text x="${P.x + Math.round(P.emoji / 2)}" y="${P.y + Math.round(P.h / 2 + P.emoji * 0.36)}" font-size="${P.emoji}">${emoji}</text>
  <text x="${textX}" y="${P.y + Math.round(P.h / 2 - P.name * 0.3)}" font-size="${P.label}" font-weight="700" letter-spacing="${P.label / 10}" fill="${accent}">${esc(youAre.toUpperCase())}</text>
  <text x="${textX}" y="${P.y + Math.round(P.h / 2 + P.name * 0.75)}" font-size="${P.name}" font-weight="800" fill="#fff">${esc(name)}</text>`;
}

function languages(w: Wrapped, t: Strings, L: Layout, accent: string, id: string): string {
  const G = L.langs;
  const top = w.languages.slice(0, 4);
  if (top.length === 0) return '';
  const barH = Math.round(G.size * 0.66);
  const barY = G.mode === 'list' ? G.y + Math.round(G.size * 0.8) : G.y;
  const rest = 1 - top.reduce((s, l) => s + l.share, 0);
  let x = G.x;
  const segments = [...top.map((l) => ({ color: onDark(l.color), share: l.share })), { color: '#6b6385', share: rest }]
    .filter((s) => s.share > 0.001)
    .map((s) => {
      const width = s.share * G.w;
      const rect = `<rect x="${x.toFixed(1)}" y="${barY}" width="${width.toFixed(1)}" height="${barH}" fill="${s.color}"/>`;
      x += width;
      return rect;
    })
    .join('');
  const bar = `<clipPath id="${id}-bar"><rect x="${G.x}" y="${barY}" width="${G.w}" height="${barH}" rx="${barH / 2}"/></clipPath>
  <g clip-path="url(#${id}-bar)"><rect x="${G.x}" y="${barY}" width="${G.w}" height="${barH}" fill="#6b6385"/>${segments}</g>`;

  const dot = (cx: number, y: number, color: string): string =>
    `<circle cx="${cx}" cy="${y - G.size * 0.33}" r="${G.size / 3}" fill="${onDark(color)}"/>`;
  const shown = top.slice(0, G.rows);
  if (G.mode === 'inline') {
    const slot = G.w / shown.length;
    const y = barY + barH + Math.round(G.size * 2);
    return `${bar}
  ${shown
    .map((l, i) => {
      const lx = G.x + i * slot;
      return `${dot(lx + G.size / 3, y, l.color)}<text x="${lx + G.size}" y="${y}" font-size="${G.size}" fill="#fff">${esc(l.name)} <tspan fill-opacity="0.66">${pct(l.share)}%</tspan></text>`;
    })
    .join('\n  ')}`;
  }
  const rowH = Math.round(G.size * 1.6);
  return `<text x="${G.x}" y="${G.y}" font-size="${Math.round(G.size * 0.82)}" font-weight="700" letter-spacing="${G.size / 12}" fill="${accent}">${esc(t.topLanguages.toUpperCase())}</text>
  ${bar}
  ${shown
    .map((l, i) => {
      const y = barY + barH + Math.round(G.size * 1.9) + i * rowH;
      return `${dot(G.x + G.size / 3, y, l.color)}<text x="${G.x + G.size}" y="${y}" font-size="${G.size}" fill="#fff">${esc(l.name)}</text>
  <text x="${G.x + G.w}" y="${y}" font-size="${G.size}" fill="#fff" fill-opacity="0.66" text-anchor="end">${pct(l.share)}%</text>`;
    })
    .join('\n  ')}`;
}
