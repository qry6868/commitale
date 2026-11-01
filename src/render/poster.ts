import { aiStyle } from '../ai.ts';
import { compact, escapeXml as esc, fmt, pct } from '../format.ts';
import type { Strings } from '../i18n.ts';
import type { Wrapped } from '../stats.ts';
import { CARD_SIZES, DISPLAY, FONT, type CardFormat, type CardOptions } from './card.ts';
import { FONT_FACE, HEADLINE_FAMILY } from './font.ts';
import { themeFor, type Theme } from './theme.ts';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const CJK = /[⺀-鿿가-힯＀-￯]/;
const headline = (): string => `'${HEADLINE_FAMILY}', ${DISPLAY()}`;

interface Item {
  name: string;
  share: number;
}

/** Everything a poster shows, worked out once and laid out per size. */
interface Content {
  theme: Theme;
  name: string;
  emoji: string;
  /** The fact that earned the personality, e.g. "38% of my commits landed between 10 PM and 5 AM". */
  punchline: string;
  ai?: { emoji: string; name: string };
  /** No repo names here: plenty of people would rather not post those. */
  lists: { title: string; items: Item[] }[];
  stats: [value: string, label: string][];
}

/**
 * The poster card, after the share cards people actually post: one huge verdict on a
 * flat colour block, the year drawn as art from the user's own commits, Top 5 lists
 * of the things that make it theirs, and a row of headline numbers.
 */
export function renderPoster(w: Wrapped, t: Strings, format: CardFormat = 'wide', options: CardOptions = {}): string {
  const [W, H] = CARD_SIZES[format];
  const theme = themeFor(w);
  const persona = t.personas[w.personas[0]];
  const styleId = aiStyle(w);
  const latest = w.latestNight ? [w.latestNight.time, t.latest] : [t.hour(w.peakHour), t.peakLabel];
  const c: Content = {
    theme,
    name: CJK.test(persona.name) ? persona.name : persona.name.toUpperCase(),
    emoji: persona.emoji,
    punchline: t.punchlines[w.personas[0]](w),
    ai: styleId ? { emoji: t.aiStyles[styleId].emoji, name: t.aiStyles[styleId].name } : undefined,
    lists: [
      {
        title: t.cardTypes,
        items: w.commitTypes
          .filter((k) => k.type !== 'other')
          .slice(0, 5)
          .map((k) => ({ name: t.types[k.type], share: k.count / w.commits })),
      },
      { title: t.topLanguages, items: w.languages.slice(0, 5) },
    ].filter((list) => list.items.length > 0),
    stats: [
      [w.commits >= 100_000 ? compact(w.commits) : fmt(w.commits), t.cardCommits],
      w.ai ? [t.tokens(w.ai.tokens), t.cardTokens] : [compact(w.added), t.cardAdded],
      [fmt(w.longestStreak.days), t.cardStreak],
      latest as [string, string],
    ],
  };
  const id = `poster-${format}`;
  const body = format === 'wide' ? wide(w, t, c, id) : tall(w, t, c, id, format);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <defs>${options.embedFont ? `<style>${FONT_FACE}</style>` : ''}
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.bg[0]}"/>
      <stop offset="1" stop-color="${theme.bg[1]}"/>
    </linearGradient>
    <filter id="${id}-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.35"/></filter>
    <clipPath id="${id}-frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
  </defs>
  <g clip-path="url(#${id}-frame)">
    <rect width="${W}" height="${H}" fill="url(#${id}-bg)"/>
    ${body}
  </g>
</svg>
`;
}

/** Story and square: one column, flowing top to bottom; lists take whatever room is left. */
function tall(w: Wrapped, t: Strings, c: Content, id: string, format: 'square' | 'story'): string {
  const story = format === 'story';
  const [W, H] = CARD_SIZES[format];
  const pad = story ? 72 : 64;
  const s = story
    ? { head: 46, waveY: 140, waveH: 280, axis: 20, label: 30, nameMax: 190, nameMin: 110, sticker: 150, aiLabel: 24, aiName: 64, listTitle: 26, rank: 46, item: 34, row: 66, maxRows: 5, stat: 92, statLabel: 22, statCols: 4, foot: 26 }
    : { head: 34, waveY: 110, waveH: 110, axis: 17, label: 24, nameMax: 140, nameMin: 80, sticker: 104, aiLabel: 20, aiName: 46, listTitle: 20, rank: 34, item: 26, row: 46, maxRows: 3, stat: 66, statLabel: 18, statCols: 3, foot: 20 };
  const out: string[] = [];

  out.push(header(w, t, c, pad, story ? 92 : 76, s.head, W));
  out.push(waveform(w, c.theme, id, 0, s.waveY, W, s.waveH));
  out.push(monthAxis(w, t, 0, W, s.waveY + s.waveH + Math.round(s.axis * 1.6), s.axis));

  // The verdict: a full-bleed flat block in the personality's colour.
  const panelY = s.waveY + s.waveH + Math.round(s.axis * 3.2);
  const panel = verdictPanel(c, t, { x: 0, y: panelY, width: W, pad, label: s.label, max: s.nameMax, min: s.nameMin, sticker: s.sticker, id });
  out.push(panel.svg);
  let y = panelY + panel.height;

  if (c.ai) {
    y += story ? 66 : 40;
    out.push(`<text x="${pad}" y="${y}" font-size="${s.aiLabel}" font-weight="700" letter-spacing="${s.aiLabel / 8}" fill="${c.theme.accent}">${esc(t.myAiStyle.toUpperCase())}</text>`);
    y += Math.round(s.aiName * 1.05);
    out.push(`<text x="${pad}" y="${y}" font-size="${s.aiName}" fill="#fff">${c.ai.emoji}<tspan dx="${Math.round(s.aiName * 0.25)}" font-family="${headline()}" font-weight="800">${esc(upper(c.ai.name))}</tspan></text>`);
  }

  // Stats and footer are pinned to the bottom; the lists get the space in between.
  const footY = H - (story ? 64 : 44);
  const statY = footY - (story ? 120 : 78);
  const listTop = y + (story ? 84 : 50);
  const roomForRows = statY - s.stat - (story ? 70 : 44) - (listTop + s.listTitle + 18);
  const rows = Math.min(s.maxRows, Math.floor(roomForRows / s.row));
  if (rows >= 2) {
    const colW = (W - pad * 2 - 40) / c.lists.length;
    c.lists.forEach(({ title, items }, i) =>
      out.push(topList(title, items.slice(0, rows), pad + i * (colW + 40), listTop, colW, s, c.theme)),
    );
  }

  out.push(statRow(c.stats.slice(0, s.statCols), pad, statY, W - pad * 2, s.stat, s.statLabel));
  out.push(footer(pad, footY, s.foot, W - pad));
  return out.join('\n    ');
}

/** Wide: the verdict block on the left, the year and the lists on the right. */
function wide(w: Wrapped, t: Strings, c: Content, id: string): string {
  const [W, H] = CARD_SIZES.wide;
  const panelW = 500;
  const pad = 52;
  const out: string[] = [];
  const dark = c.theme.bg[0];

  out.push(`<rect width="${panelW}" height="${H}" fill="${c.theme.accent}"/>`);
  // Say outright what this is: a stranger scrolling past should see "a year of code" first.
  out.push(`<text x="${pad}" y="76" font-size="32" font-family="${headline()}" font-weight="800" letter-spacing="1" fill="${dark}">${esc(upper(t.cardTitle(w.year)))}</text>`);
  out.push(`<text x="${pad}" y="150" font-size="22" font-weight="800" letter-spacing="3" fill="${dark}" fill-opacity="0.75">${esc(upperLabel(t.iAm))}</text>`);
  // Capped below the panel's full height so a two-line name, the punchline and the AI
  // style all clear the sticker in the bottom corner.
  const fit = fitName(c.name, 100, 56, panelW - pad * 2);
  let y = 150 + 18;
  fit.lines.forEach((line) => {
    y += Math.round(fit.size * 0.98);
    out.push(`<text x="${pad}" y="${y}" font-size="${fit.size}" font-family="${headline()}" font-weight="800" fill="${dark}">${esc(line)}</text>`);
  });
  // CJK glyphs sit lower than Latin caps, so give them more room above the punchline.
  y += CJK.test(c.name) ? 46 : 36;
  out.push(punchline(c, pad, y, 19, panelW - pad * 2));
  if (c.ai) {
    y += 46;
    out.push(`<text x="${pad}" y="${y}" font-size="15" font-weight="800" letter-spacing="2" fill="${dark}" fill-opacity="0.75">${esc(upperLabel(t.myAiStyle))}</text>`);
    y += 42;
    out.push(`<text x="${pad}" y="${y}" font-size="38" fill="${dark}">${c.ai.emoji}<tspan dx="8" font-family="${headline()}" font-weight="800">${esc(upper(c.ai.name))}</tspan></text>`);
  }
  // Bottom corner: the title runs along the top, and the name and AI style fill the middle.
  out.push(sticker(c.emoji, panelW - 80, H - 80, 84, id));

  const x0 = panelW + 44;
  const areaW = W - x0 - 48;
  out.push(waveform(w, c.theme, id, x0, 34, areaW, 120));
  out.push(monthAxis(w, t, x0, areaW, 176, 13));
  const colW = (areaW - 32) / c.lists.length;
  const sizes = { listTitle: 15, rank: 30, item: 22, row: 42 };
  c.lists.forEach(({ title, items }, i) => out.push(topList(title, items.slice(0, 3), x0 + i * (colW + 32), 206, colW, sizes, c.theme)));
  out.push(statRow(c.stats.slice(0, 3), x0, 500, areaW, 56, 16));
  out.push(footer(x0, 590, 17, W - 48));
  return out.join('\n    ');
}

function header(w: Wrapped, t: Strings, c: Content, pad: number, y: number, size: number, W: number): string {
  return `<text x="${pad}" y="${y}" font-size="${size}" font-family="${headline()}" font-weight="800" letter-spacing="${size / 24}" fill="${c.theme.accent}">${esc(upper(t.cardTitle(w.year)))}</text>
    <text x="${W - pad}" y="${y}" font-size="${Math.round(size * 0.78)}" text-anchor="end" fill="#fff" fill-opacity="0.72">${esc(w.name)}</text>`;
}

/** The command to try it, and where to find the project. */
function footer(x: number, y: number, size: number, right: number): string {
  return `<text x="${x}" y="${y}" font-size="${size}" font-family="${MONO}" fill="#fff" fill-opacity="0.6">$ npx commitale</text>
    <text x="${right}" y="${y}" font-size="${size}" text-anchor="end" fill="#fff" fill-opacity="0.45">github.com/qry6868/commitale</text>`;
}

/**
 * The year as a waveform: one bar per week, its height the square root of that
 * week's commits (so one huge week doesn't flatten the rest). Weeks rather than days
 * keep the bars thick enough to read as a bold shape; quiet weeks stay as faint dots.
 */
function waveform(w: Wrapped, theme: Theme, id: string, x: number, y: number, width: number, height: number): string {
  const start = Date.UTC(w.year, 0, 1);
  const values = new Array<number>(Math.ceil(w.daysInYear / 7)).fill(0);
  for (let i = 0; i < w.daysInYear; i++) values[Math.floor(i / 7)] += w.daily[new Date(start + i * 86_400_000).toISOString().slice(0, 10)] ?? 0;
  const max = Math.max(...values, 1);
  const step = width / values.length;
  const bar = Math.max(2, step * 0.62);
  const mid = y + height / 2;
  const active: string[] = [];
  const quiet: string[] = [];
  values.forEach((v, i) => {
    const h = v === 0 ? bar : Math.max(bar * 2, Math.sqrt(v / max) * height);
    (v === 0 ? quiet : active).push(`<rect x="${(x + i * step).toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${bar.toFixed(1)}" height="${h.toFixed(1)}" rx="${(bar / 2).toFixed(1)}"/>`);
  });
  return `<linearGradient id="${id}-wave" gradientUnits="userSpaceOnUse" x1="${x}" y1="0" x2="${x + width}" y2="0">
      <stop offset="0" stop-color="${theme.glow[0]}"/><stop offset="0.5" stop-color="${theme.heat[4]}"/><stop offset="1" stop-color="${theme.glow[1]}"/>
    </linearGradient>
    <g fill="#fff" fill-opacity="0.18">${quiet.join('')}</g>
    <g fill="url(#${id}-wave)">${active.join('')}</g>`;
}

/** Month names under the waveform, each centred on its own stretch of bars, so the shape reads as a year. */
function monthAxis(w: Wrapped, t: Strings, x: number, width: number, y: number, size: number): string {
  const start = Date.UTC(w.year, 0, 1);
  const step = width / Math.ceil(w.daysInYear / 7);
  const labels = t.months.map((name, m) => {
    const mid = (Date.UTC(w.year, m, 15) - start) / 86_400_000 / 7;
    return `<text x="${(x + mid * step).toFixed(1)}" y="${y}">${esc(name)}</text>`;
  });
  return `<g font-size="${size}" text-anchor="middle" fill="#fff" fill-opacity="0.45">${labels.join('')}</g>`;
}

/** The punchline, shrunk to one line if it has to be. */
function punchline(c: Content, x: number, y: number, max: number, width: number): string {
  const natural = textWidth(c.punchline, max);
  const size = natural > width ? Math.floor((max * width) / natural) : max;
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${c.theme.bg[0]}" fill-opacity="0.85">${esc(c.punchline)}</text>`;
}

function verdictPanel(
  c: Content,
  t: Strings,
  o: { x: number; y: number; width: number; pad: number; label: number; max: number; min: number; sticker: number; id: string },
): { svg: string; height: number } {
  const dark = c.theme.bg[0];
  // Leave room on the right for the sticker that overlaps the block's top edge.
  const fit = fitName(c.name, o.max, o.min, o.width - o.pad * 2 - Math.round(o.sticker * 1.1));
  const top = Math.round(o.label * 1.9);
  let y = o.y + top;
  const parts = [`<text x="${o.pad}" y="${y}" font-size="${o.label}" font-weight="800" letter-spacing="${o.label / 7}" fill="${dark}" fill-opacity="0.75">${esc(upperLabel(t.iAm))}</text>`];
  fit.lines.forEach((line, i) => {
    y += Math.round(fit.size * (i === 0 ? 1.02 : 0.96));
    parts.push(`<text x="${o.pad}" y="${y}" font-size="${fit.size}" font-family="${headline()}" font-weight="800" fill="${dark}">${esc(line)}</text>`);
  });
  y += Math.round(o.label * (CJK.test(c.name) ? 2.1 : 1.75));
  parts.push(punchline(c, o.pad, y, Math.round(o.label * 1.1), o.width - o.pad * 2));
  const height = y - o.y + Math.round(o.label * 1.6);
  const rect = `<rect x="${o.x}" y="${o.y}" width="${o.width}" height="${height}" fill="${c.theme.accent}"/>`;
  // The emoji sits on the block's top edge like a sticker.
  const stick = sticker(c.emoji, o.x + o.width - o.pad - o.sticker * 0.55, o.y, o.sticker, o.id);
  return { svg: [rect, ...parts, stick].join('\n    '), height };
}

function sticker(emoji: string, cx: number, cy: number, size: number, id: string): string {
  const r = Math.round(size * 0.66);
  return `<g transform="rotate(-10 ${Math.round(cx)} ${Math.round(cy)})" filter="url(#${id}-shadow)">
      <circle cx="${Math.round(cx)}" cy="${Math.round(cy)}" r="${r}" fill="#fff"/>
      <text x="${Math.round(cx)}" y="${Math.round(cy + size * 0.35)}" font-size="${size}" text-anchor="middle">${emoji}</text>
    </g>`;
}

function topList(
  title: string,
  items: Item[],
  x: number,
  y: number,
  width: number,
  s: { listTitle: number; rank: number; item: number; row: number },
  theme: Theme,
): string {
  const rankW = Math.round(s.rank * 0.9);
  const rows = items.map((item, i) => {
    const baseline = y + s.listTitle + 18 + Math.round(s.row * (i + 0.72));
    const share = `${pct(item.share)}%`;
    const shareW = textWidth(share, s.item) + 12;
    return `<text x="${x}" y="${baseline}" font-size="${s.rank}" font-family="${headline()}" fill="${theme.accent}">${i + 1}</text>
    <text x="${x + rankW}" y="${baseline}" font-size="${s.item}" font-weight="600" fill="#fff">${esc(ellipsize(item.name, s.item, width - rankW - shareW))}</text>
    <text x="${x + width}" y="${baseline}" font-size="${s.item}" fill="#fff" fill-opacity="0.55" text-anchor="end">${share}</text>`;
  });
  return `<text x="${x}" y="${y + s.listTitle}" font-size="${s.listTitle}" font-weight="700" letter-spacing="${s.listTitle / 8}" fill="#fff" fill-opacity="0.6">${esc(upperLabel(title))}</text>
    ${rows.join('\n    ')}`;
}

function statRow(stats: [string, string][], x: number, y: number, width: number, max: number, label: number): string {
  const col = width / stats.length;
  // One size for the whole row, small enough that the widest value ("6.7 亿") clears its column.
  const widest = Math.max(...stats.map(([value]) => headlineWidth(value, max)));
  const size = Math.floor(widest > col - 48 ? (max * (col - 48)) / widest : max);
  return stats
    .map(
      ([value, name], i) => `<text x="${Math.round(x + i * col)}" y="${y}" font-size="${size}" font-family="${headline()}" font-weight="800" fill="#fff">${esc(value)}</text>
    <text x="${Math.round(x + i * col)}" y="${y + Math.round(label * 1.8)}" font-size="${label}" fill="#fff" fill-opacity="0.66">${esc(ellipsize(name, label, col - 12))}</text>`,
    )
    .join('\n    ');
}

/**
 * The largest size, stepping down, at which `text` fits `width`: in up to two lines for
 * Latin names (bigger type reads better on a poster), on one line for CJK names, which
 * must not break mid-word.
 */
function fitName(text: string, max: number, min: number, width: number): { size: number; lines: string[] } {
  if (CJK.test(text)) {
    let size = max;
    while (size > min && headlineWidth(text, size) > width) size -= 2;
    return { size, lines: [text] };
  }
  for (let size = max; size > min; size -= 6) {
    const lines = breakLines(text, size, width);
    if (lines.length <= 2 && lines.every((l) => headlineWidth(l, size) <= width)) return { size, lines };
  }
  return { size: min, lines: breakLines(text, min, width).slice(0, 2) };
}

function breakLines(text: string, size: number, width: number): string[] {
  const tokens = text.match(/[⺀-鿿가-힯＀-￯]|[^\s⺀-鿿가-힯＀-￯]+|\s+/g) ?? [];
  const lines: string[] = [];
  let line = '';
  for (const token of tokens) {
    const next = line + token;
    if (line.trim() && headlineWidth(next.trimEnd(), size) > width) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/** Estimated width in the condensed headline face (CJK falls back to a full-width face). */
function headlineWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += CJK.test(ch) ? size : ch === ' ' ? size * 0.22 : size * 0.46;
  return w;
}

/** Estimated width in the body face. */
export function textWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) {
    if (CJK.test(ch)) w += size;
    else if (/[A-Z0-9]/.test(ch)) w += size * 0.64;
    else if (ch === ' ') w += size * 0.28;
    else w += size * 0.54;
  }
  return Math.round(w);
}

/** Shortens text with an ellipsis until its estimated width fits. */
function ellipsize(text: string, size: number, width: number): string {
  if (textWidth(text, size) <= width) return text;
  const chars = [...text];
  while (chars.length > 1 && textWidth(`${chars.join('')}…`, size) > width) chars.pop();
  return `${chars.join('')}…`;
}

const upper = (s: string): string => (CJK.test(s) ? s : s.toUpperCase());
const upperLabel = upper;
