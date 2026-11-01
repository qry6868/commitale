import { aiStyle } from '../ai.ts';
import { compact, escapeXml as esc, fmt } from '../format.ts';
import type { Strings } from '../i18n.ts';
import type { Wrapped } from '../stats.ts';
import { CARD_SIZES, DISPLAY, FONT, type CardFormat, type CardOptions } from './card.ts';
import { FONT_FACE } from './font.ts';
import { themeFor } from './theme.ts';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

interface PosterLayout {
  pad: number;
  kicker: [y: number, size: number];
  user: [y: number, size: number];
  orb: { cx: number; cy: number; r: number; emoji: number };
  /** The personality block: label baseline, then the name, shrunk to fit `width` in two lines. */
  verdict: { y: number; label: number; width: number; max: number; min: number };
  pill: { size: number; h: number; gap: number };
  stats: { y: number; size: number; label: number; col: number };
  footer: { y: number; size: number; right: boolean };
}

const LAYOUTS: Record<CardFormat, PosterLayout> = {
  wide: {
    pad: 72,
    kicker: [92, 16],
    user: [124, 22],
    orb: { cx: 930, cy: 300, r: 210, emoji: 210 },
    verdict: { y: 200, label: 22, width: 600, max: 84, min: 52 },
    pill: { size: 20, h: 48, gap: 30 },
    stats: { y: 534, size: 56, label: 17, col: 210 },
    footer: { y: 592, size: 18, right: true },
  },
  square: {
    pad: 72,
    kicker: [110, 20],
    user: [148, 26],
    orb: { cx: 770, cy: 330, r: 220, emoji: 230 },
    verdict: { y: 560, label: 26, width: 936, max: 96, min: 60 },
    pill: { size: 24, h: 58, gap: 36 },
    stats: { y: 940, size: 72, label: 22, col: 310 },
    footer: { y: 1032, size: 20, right: false },
  },
  story: {
    pad: 88,
    kicker: [200, 24],
    user: [246, 32],
    orb: { cx: 540, cy: 660, r: 290, emoji: 310 },
    verdict: { y: 1080, label: 32, width: 904, max: 128, min: 72 },
    pill: { size: 30, h: 72, gap: 48 },
    stats: { y: 1660, size: 96, label: 28, col: 300 },
    footer: { y: 1830, size: 30, right: false },
  },
};

/**
 * The poster card: one big verdict instead of a dashboard. The personality fills the
 * frame, the AI style rides beside it as a tag, and three numbers back it up.
 */
export function renderPoster(w: Wrapped, t: Strings, format: CardFormat = 'wide', options: CardOptions = {}): string {
  const L = LAYOUTS[format];
  const [W, H] = CARD_SIZES[format];
  const theme = themeFor(w);
  const persona = t.personas[w.personas[0]];
  const id = `poster-${format}`;
  const display = DISPLAY();

  const { size: nameSize, lines } = fit(persona.name, L.verdict.max, L.verdict.min, L.verdict.width);
  const firstLine = L.verdict.y + Math.round(nameSize * 1.05);
  const name = lines
    .map((line, i) => `<text x="${L.pad}" y="${firstLine + Math.round(i * nameSize * 1.02)}" font-size="${nameSize}" font-weight="700" font-family="${display}" letter-spacing="${-nameSize / 40}" fill="#fff">${esc(line)}</text>`)
    .join('\n  ');
  const lastLine = firstLine + Math.round((lines.length - 1) * nameSize * 1.02);

  const styleId = aiStyle(w);
  let pill = '';
  if (styleId) {
    const s = t.aiStyles[styleId];
    const label = `${t.myAiStyle} · ${s.name}`;
    const P = L.pill;
    const top = lastLine + P.gap;
    const padX = Math.round(P.h * 0.45);
    const emojiW = Math.round(P.size * 1.6);
    const width = padX * 2 + emojiW + textWidth(label, P.size);
    pill = `<rect x="${L.pad}" y="${top}" width="${width}" height="${P.h}" rx="${P.h / 2}" fill="#fff" fill-opacity="0.12"/>
  <text x="${L.pad + padX}" y="${top + Math.round(P.h / 2 + P.size * 0.36)}" font-size="${P.size}">${s.emoji}</text>
  <text x="${L.pad + padX + emojiW}" y="${top + Math.round(P.h / 2 + P.size * 0.36)}" font-size="${P.size}" font-weight="600" fill="#fff">${esc(label)}</text>`;
  }

  const stats: [string, string][] = [
    [w.commits >= 100_000 ? compact(w.commits) : fmt(w.commits), t.cardCommits],
    w.ai ? [t.tokens(w.ai.tokens), t.cardTokens] : [compact(w.added), t.cardAdded],
    [fmt(w.longestStreak.days), t.cardStreak],
  ];
  const S = L.stats;
  const statText = stats
    .map(([value, label], i) => {
      const x = L.pad + i * S.col;
      return `<text x="${x}" y="${S.y}" font-size="${S.size}" font-weight="700" font-family="${display}" fill="#fff">${esc(value)}</text>
  <text x="${x}" y="${S.y + Math.round(S.label * 1.7)}" font-size="${S.label}" fill="#fff" fill-opacity="0.66">${esc(label)}</text>`;
    })
    .join('\n  ');

  const O = L.orb;
  const F = L.footer;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <defs>${options.embedFont ? `<style>${FONT_FACE}</style>` : ''}
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.bg[0]}"/>
      <stop offset="0.55" stop-color="${theme.bg[1]}"/>
      <stop offset="1" stop-color="${theme.bg[2]}"/>
    </linearGradient>
    <radialGradient id="${id}-orb" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="${theme.heat[4]}" stop-opacity="0.95"/>
      <stop offset="0.45" stop-color="${theme.glow[0]}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${theme.glow[1]}" stop-opacity="0.55"/>
    </radialGradient>
    <filter id="${id}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(W / 14)}"/></filter>
    <clipPath id="${id}-frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
  </defs>
  <g clip-path="url(#${id}-frame)">
    <rect width="${W}" height="${H}" fill="url(#${id}-bg)"/>
    <circle cx="${O.cx}" cy="${O.cy}" r="${Math.round(O.r * 1.25)}" fill="${theme.glow[0]}" fill-opacity="0.35" filter="url(#${id}-glow)"/>
    <circle cx="80" cy="${H + 10}" r="${Math.round(W * 0.2)}" fill="${theme.glow[1]}" fill-opacity="0.3" filter="url(#${id}-glow)"/>
    <circle cx="${O.cx}" cy="${O.cy}" r="${O.r + 64}" fill="none" stroke="#fff" stroke-opacity="0.06" stroke-width="2"/>
    <circle cx="${O.cx}" cy="${O.cy}" r="${O.r + 26}" fill="none" stroke="#fff" stroke-opacity="0.14" stroke-width="2"/>
    <circle cx="${O.cx}" cy="${O.cy}" r="${O.r}" fill="url(#${id}-orb)"/>
  </g>
  <text x="${O.cx}" y="${O.cy + Math.round(O.emoji * 0.35)}" font-size="${O.emoji}" text-anchor="middle">${persona.emoji}</text>
  <text x="${L.pad}" y="${L.kicker[0]}" font-size="${L.kicker[1]}" font-weight="700" letter-spacing="${L.kicker[1] / 5}" fill="${theme.accent}">COMMITALE · ${w.year}</text>
  <text x="${L.pad}" y="${L.user[0]}" font-size="${L.user[1]}" fill="#fff" fill-opacity="0.72">${esc(w.name)}</text>
  <text x="${L.pad}" y="${L.verdict.y}" font-size="${L.verdict.label}" font-weight="700" letter-spacing="${L.verdict.label / 8}" fill="${theme.accent}">${esc(t.iAm.toUpperCase())}</text>
  ${name}
  ${pill}
  ${statText}
  <text x="${F.right ? W - L.pad : L.pad}" y="${F.y}" font-size="${F.size}" fill="#fff" fill-opacity="0.55" font-family="${MONO}"${F.right ? ' text-anchor="end"' : ''}>$ npx commitale</text>
</svg>
`;
}

/** The largest size, stepping down, at which `text` fits `width` in at most two lines. */
function fit(text: string, max: number, min: number, width: number): { size: number; lines: string[] } {
  for (let size = max; size > min; size -= 4) {
    const lines = breakLines(text, size, width);
    if (lines.length <= 2) return { size, lines };
  }
  return { size: min, lines: breakLines(text, min, width).slice(0, 2) };
}

/** Greedy line breaks by estimated width; words stay whole, CJK breaks anywhere. */
function breakLines(text: string, size: number, width: number): string[] {
  const tokens = text.match(/[⺀-鿿가-힯＀-￯]|[^\s⺀-鿿가-힯＀-￯]+|\s+/g) ?? [];
  const lines: string[] = [];
  let line = '';
  for (const token of tokens) {
    const next = line + token;
    if (line.trim() && textWidth(next.trimEnd(), size) > width) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/** Rough rendered width: SVG can't measure text, so estimate per character class. */
export function textWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) {
    if (/[⺀-鿿가-힯＀-￯]/.test(ch)) w += size;
    else if (/[A-Z0-9]/.test(ch)) w += size * 0.64;
    else if (ch === ' ') w += size * 0.28;
    else w += size * 0.54;
  }
  return Math.round(w);
}
