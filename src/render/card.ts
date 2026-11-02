import { calendar, compact, escapeXml as esc, fmt, heatLevels, onDark, pct } from '../format.ts';
import type { Strings } from '../i18n.ts';
import { aiStyle } from '../ai.ts';
import { change, type PersonaId, type Wrapped } from '../stats.ts';
import { personaArt } from './art.ts';
import { DISPLAY_FAMILY, FONT_FACE } from './font.ts';
import { themeFor } from './theme.ts';

/** Headlines and big numbers: Space Grotesk where it has the glyphs, the system face for the rest. */
export const DISPLAY = () => `'${DISPLAY_FAMILY}', ${FONT}`;

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
  /** `desc`: font size for the persona's description, on cards with room for it. */
  persona: { x: number; y: number; w: number; h: number; emoji: number; label: number; name: number; desc?: number };
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
    heat: { y: 800, step: 17 },
    langs: { mode: 'inline', x: 72, y: 960, w: 936, rows: 3, size: 22 },
    // Top right, beside the kicker: the bottom of a square is full.
    footer: [110, 20],
  },
  story: {
    pad: 88,
    kicker: [220, 24],
    title: [318, 72],
    name: [384, 36],
    persona: { x: 88, y: 450, w: 904, h: 300, emoji: 120, label: 24, name: 52, desc: 26 },
    tiles: { y: 790, cols: 2, w: 440, h: 210, gap: 24, num: 88, label: 28, delta: 24 },
    heat: { y: 1298, step: 17 },
    langs: { mode: 'list', x: 88, y: 1490, w: 904, rows: 4, size: 32 },
    footer: [1820, 30],
  },
};

const UP = '#86efac';
const DOWN = '#fda4af';

export interface CardOptions {
  /**
   * Put the display font inside the SVG. Needed for a standalone file; a card shown
   * inline in the report uses the page's copy instead.
   */
  embedFont?: boolean;
}

export function renderCard(w: Wrapped, t: Strings, format: CardFormat = 'wide', options: CardOptions = {}): string {
  const L = LAYOUTS[format];
  const [W, H] = CARD_SIZES[format];
  const theme = themeFor(w);
  const persona = t.personas[w.personas[0]];
  const prev = w.previous;

  // AI tokens make a better boast than active days, so they take that slot when present.
  const third = w.ai
    ? { value: t.tokens(w.ai.tokens), label: t.cardTokens, delta: change(w.ai.tokens, w.ai.previous?.tokens), base: w.ai.previous }
    : { value: fmt(w.activeDays), label: t.cardDays, delta: change(w.activeDays, prev?.activeDays), base: prev };

  // The AI style stands beside the personality as an equal, not as a footnote.
  const styleId = aiStyle(w);
  const badges: Badge[] = [{ icon: artIcon(w.personas[0], `${format}-persona`), label: t.youAre, name: persona.name, desc: persona.desc(w) }];
  if (styleId) {
    const s = t.aiStyles[styleId];
    badges.push({ icon: emojiIcon(s.emoji), label: t.aiStyleIntro, name: s.name, desc: s.desc });
  }
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
  <text x="${x + pad}" y="${y + Math.round(T.h * 0.58)}" font-size="${T.num}" font-weight="700" font-family="${DISPLAY()}" fill="#fff">${esc(tile.value)}</text>
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
  <defs>${options.embedFont ? `<style>${FONT_FACE}</style>` : ''}
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
  <text x="${L.pad}" y="${L.title[0]}" font-size="${L.title[1]}" font-weight="700" font-family="${DISPLAY()}" fill="#fff">${esc(t.cardTitle(w.year))}</text>
  <text x="${L.pad}" y="${L.name[0]}" font-size="${L.name[1]}" fill="#fff" fill-opacity="0.7">${esc(w.name)}</text>
  ${badges.length === 1 ? personaBlock(L, theme.accent, badges[0].icon, t.youAre, persona.name, persona.desc(w)) : badgePair(L, format, theme.accent, badges[0], badges[1])}
  ${tiles}
  ${heat}
  ${languages(w, t, L, theme.accent, format)}
  <text x="${format === 'square' ? W - L.pad : L.pad}" y="${L.footer[0]}" font-size="${L.footer[1]}" fill="#fff" fill-opacity="0.55" font-family="${MONO}"${format === 'square' ? ' text-anchor="end"' : ''}>$ npx commitale</text>
</svg>
`;
}

function personaBlock(L: Layout, accent: string, icon: Icon, youAre: string, name: string, desc: string): string {
  const P = L.persona;
  const textX = P.x + P.emoji * 2;
  const box = `<rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" rx="${Math.round(Math.min(P.h, 220) / 5)}" fill="#fff" fill-opacity="0.08"/>
  ${icon(P.x + Math.round(P.emoji / 2), P.y + Math.round(P.h / 2 - P.emoji / 2), P.emoji)}`;
  if (!P.desc) {
    return `${box}
  <text x="${textX}" y="${P.y + Math.round(P.h / 2 - P.name * 0.3)}" font-size="${P.label}" font-weight="700" letter-spacing="${P.label / 10}" fill="${accent}">${esc(youAre.toUpperCase())}</text>
  <text x="${textX}" y="${P.y + Math.round(P.h / 2 + P.name * 0.75)}" font-size="${P.name}" font-weight="700" font-family="${DISPLAY()}" fill="#fff">${esc(name)}</text>`;
  }
  // SVG doesn't wrap text, so break the description into at most two lines ourselves.
  const lines = wrap(desc, Math.floor((P.x + P.w - 40 - textX) / (P.desc * 0.52)), 2);
  const top = P.y + Math.round((P.h - (P.label + P.name * 1.4 + lines.length * P.desc * 1.4)) / 2);
  return `${box}
  <text x="${textX}" y="${top + P.label}" font-size="${P.label}" font-weight="700" letter-spacing="${P.label / 10}" fill="${accent}">${esc(youAre.toUpperCase())}</text>
  <text x="${textX}" y="${top + P.label + Math.round(P.name * 1.25)}" font-size="${P.name}" font-weight="700" font-family="${DISPLAY()}" fill="#fff">${esc(name)}</text>
  ${lines.map((line, i) => `<text x="${textX}" y="${top + P.label + Math.round(P.name * 1.25) + Math.round(P.desc! * 1.5 * (i + 1))}" font-size="${P.desc}" fill="#fff" fill-opacity="0.72">${esc(line)}</text>`).join('\n  ')}`;
}

/** What sits beside a badge's words, drawn with its top-left corner at (x, top). */
type Icon = (x: number, top: number, size: number) => string;
/** A personality gets its drawn badge, a touch larger than an emoji would be. */
const artIcon = (id: PersonaId, key: string): Icon => (x, top, size) =>
  personaArt(id, key, { size: size * 1.12, x: x - size * 0.06, y: top - size * 0.06 });
const emojiIcon = (emoji: string): Icon => (x, top, size) =>
  `<text x="${x}" y="${Math.round(top + size * 0.86)}" font-size="${size}">${emoji}</text>`;

interface Badge {
  icon: Icon;
  label: string;
  name: string;
  desc: string;
}

/**
 * The personality and the AI style as two equal badges in the persona area:
 * stacked on the wide card, side by side on square and story.
 */
function badgePair(L: Layout, format: CardFormat, accent: string, a: Badge, b: Badge): string {
  const P = L.persona;
  if (format === 'wide') {
    const h = 68, gap = 8, y0 = P.y - 12;
    return [a, b].map((x, i) => rowBadge(P.x, y0 + i * (h + gap), P.w, h, x, { emoji: 40, label: 12, name: 22 }, accent)).join('\n  ');
  }
  const gap = 24, w = (P.w - gap) / 2;
  if (format === 'square') {
    return [a, b].map((x, i) => rowBadge(P.x + i * (w + gap), P.y, w, P.h, x, { emoji: 56, label: 15, name: 28 }, accent)).join('\n  ');
  }
  return [a, b].map((x, i) => columnBadge(P.x + i * (w + gap), P.y, w, P.h, x, accent)).join('\n  ');
}

/** Emoji on the left, label and name beside it. */
function rowBadge(x: number, y: number, w: number, h: number, b: Badge, size: { emoji: number; label: number; name: number }, accent: string): string {
  const textX = x + size.emoji * 2;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(Math.min(h, 120) / 5)}" fill="#fff" fill-opacity="0.08"/>
  ${b.icon(x + Math.round(size.emoji / 2), y + Math.round(h / 2 - size.emoji / 2), size.emoji)}
  <text x="${textX}" y="${y + Math.round(h / 2 - size.name * 0.3)}" font-size="${size.label}" font-weight="700" letter-spacing="${size.label / 10}" fill="${accent}">${esc(b.label.toUpperCase())}</text>
  <text x="${textX}" y="${y + Math.round(h / 2 + size.name * 0.75)}" font-size="${size.name}" font-weight="700" font-family="${DISPLAY()}" fill="#fff">${esc(b.name)}</text>`;
}

/** Emoji on top, then label, name and a two-line description: for the tall story card. */
function columnBadge(x: number, y: number, w: number, h: number, b: Badge, accent: string): string {
  const emoji = 88, label = 22, name = 34, desc = 22, pad = 28;
  const labelY = y + pad + emoji + 34;
  const nameY = labelY + Math.round(name * 1.3);
  const lines = wrap(b.desc, Math.floor((w - 2 * pad) / (desc * 0.52)), 2);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="#fff" fill-opacity="0.08"/>
  ${b.icon(x + pad, y + pad + Math.round(emoji * 0.04), emoji)}
  <text x="${x + pad}" y="${labelY}" font-size="${label}" font-weight="700" letter-spacing="${label / 10}" fill="${accent}">${esc(b.label.toUpperCase())}</text>
  <text x="${x + pad}" y="${nameY}" font-size="${name}" font-weight="700" font-family="${DISPLAY()}" fill="#fff">${esc(b.name)}</text>
  ${lines.map((line, i) => `<text x="${x + pad}" y="${nameY + Math.round(desc * 1.5 * (i + 1))}" font-size="${desc}" fill="#fff" fill-opacity="0.72">${esc(line)}</text>`).join('\n  ')}`;
}

/**
 * Greedy line breaking for SVG text. `width` is in half-em units: a Latin character
 * takes one, a CJK character two. Words stay whole; CJK breaks anywhere.
 */
export function wrap(text: string, width: number, maxLines: number): string[] {
  const units = (s: string): number => [...s].reduce((n, ch) => n + (/[⺀-鿿가-힯＀-￯]/.test(ch) ? 2 : 1), 0);
  const tokens = text.match(/[⺀-鿿가-힯＀-￯]|[^\s⺀-鿿가-힯＀-￯]+\s*|\s+/g) ?? [];
  const lines: string[] = [];
  let line = '';
  for (const token of tokens) {
    if (line && units(line + token.trimEnd()) > width) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line += token;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[\s,.，。]*$/, '')}…`;
  return kept;
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
