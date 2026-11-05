import { aiStyle, type AiStyleId } from '../ai.ts';
import { compact, escapeXml as esc, fmt, pct } from '../format.ts';
import type { Strings } from '../i18n.ts';
import type { PersonaId, Wrapped } from '../stats.ts';
import { aiArt, personaArt, type Figure } from './art.ts';
import { CARD_SIZES, DISPLAY, FONT, type CardFormat, type CardOptions } from './card.ts';
import { FONT_FACE, HEADLINE_FAMILY } from './font.ts';
import { LOOKS, type Look } from './looks.ts';
import { CREAM, INK, NIGHT, tone } from './palette.ts';
import { coloursFor } from './scenery.ts';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const CJK = /[⺀-鿿가-힯＀-￯]/;
const SERIF = "'Palatino Linotype', Palatino, 'Book Antiqua', 'Iowan Old Style', Georgia, 'Songti SC', SimSun, serif";

interface Item {
  name: string;
  share: number;
}

/**
 * The poster in its personality's look, as the report draws it: the colours, the
 * headline face, and the touches that make it that look.
 */
interface Paint {
  look: Look;
  /** The poster's ground, and the text on it. */
  bg: string;
  ink: string;
  /** The verdict block, and the text on it. */
  panel: string;
  panelInk: string;
  /** Kickers, ranks and the waveform. */
  key: string;
  /** Shape colours: the corner shape, offsets and misregistration. */
  s1: string;
  s2: string;
  /** The headline face, whether it's set in capitals, and its rough width per character. */
  font: string;
  weight: number;
  italic: boolean;
  caps: boolean;
  em: number;
}

function paintFor(persona: PersonaId): Paint {
  const look = LOOKS[persona];
  const c = coloursFor(persona);
  const bg = c.ground ?? NIGHT;
  const inkOn = (colour: string): string => (tone(colour) === 'light' ? (c.ink ?? INK) : CREAM);
  const inks = (c.inks ?? c.fields).filter((x) => x !== c.stage && x !== bg);
  const faces: Record<Look, Pick<Paint, 'font' | 'weight' | 'italic' | 'caps' | 'em'>> = {
    geometric: { font: `'${HEADLINE_FAMILY}', ${DISPLAY()}`, weight: 800, italic: false, caps: true, em: 0.46 },
    pop: { font: `'${HEADLINE_FAMILY}', ${DISPLAY()}`, weight: 800, italic: false, caps: true, em: 0.46 },
    painterly: { font: SERIF, weight: 700, italic: true, caps: false, em: 0.58 },
    minimal: { font: FONT, weight: 300, italic: false, caps: false, em: 0.5 },
    riso: { font: DISPLAY(), weight: 700, italic: false, caps: false, em: 0.56 },
  };
  return {
    look,
    bg,
    ink: inkOn(bg),
    panel: c.stage,
    panelInk: inkOn(c.stage),
    key: c.key,
    s1: look === 'minimal' ? c.key : (inks[0] ?? c.key),
    s2: inks[1] ?? c.key,
    ...faces[look],
  };
}

/** Everything a poster shows, worked out once and laid out per size. */
interface Content {
  paint: Paint;
  name: string;
  persona: PersonaId;
  /** The number on the personality's badge. */
  figure: Figure;
  /** The fact that earned the personality, e.g. "38% of my commits landed between 10 PM and 5 AM". */
  punchline: string;
  ai?: { id: AiStyleId; name: string };
  /** No repo names here: plenty of people would rather not post those. */
  lists: { title: string; items: Item[] }[];
  stats: [value: string, label: string][];
}

/**
 * The poster card, after the share cards people actually post: one huge verdict on a
 * flat colour block, the year drawn as art from the user's own commits, Top 5 lists
 * of the things that make it theirs, and a row of headline numbers. It is drawn in the
 * personality's look, like the report, so no two personalities' posters look alike.
 */
export function renderPoster(w: Wrapped, t: Strings, format: CardFormat = 'wide', options: CardOptions = {}): string {
  const [W, H] = CARD_SIZES[format];
  const paint = paintFor(w.personas[0]);
  const persona = t.personas[w.personas[0]];
  const styleId = aiStyle(w);
  const latest = w.latestNight ? [w.latestNight.time, t.latest] : [t.hour(w.peakHour), t.peakLabel];
  const c: Content = {
    paint,
    name: paint.caps && !CJK.test(persona.name) ? persona.name.toUpperCase() : persona.name,
    persona: w.personas[0],
    figure: t.figures[w.personas[0]](w),
    punchline: t.punchlines[w.personas[0]](w),
    ai: styleId ? { id: styleId, name: t.aiStyles[styleId].name } : undefined,
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
    <filter id="${id}-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.35"/></filter>
    ${filters(paint, id)}
    <clipPath id="${id}-frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
  </defs>
  <g clip-path="url(#${id}-frame)">
    <rect id="${id}-bg" width="${W}" height="${H}" fill="${paint.bg}"/>
    ${body}
    ${texture(paint, id, W, H)}
  </g>
</svg>
`;
}

/** The filters a look draws with: brushed paint, canvas and riso specks. */
function filters(p: Paint, id: string): string {
  if (p.look === 'painterly') {
    return `<filter id="${id}-brush" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="12" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="${id}-canvas" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9 .04" numOctaves="2" seed="2"/><feColorMatrix type="saturate" values="0"/></filter>`;
  }
  if (p.look === 'riso') {
    return `<filter id="${id}-speck" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -20 0 0 0 6.6"/></filter>`;
  }
  return '';
}

/** Over everything: canvas weave for paint, ink specks for riso. */
function texture(p: Paint, id: string, W: number, H: number): string {
  if (p.look === 'painterly') return `<rect width="${W}" height="${H}" filter="url(#${id}-canvas)" opacity="0.16" style="mix-blend-mode:multiply"/>`;
  if (p.look === 'riso') return `<rect width="${W}" height="${H}" filter="url(#${id}-speck)" opacity="0.22" style="mix-blend-mode:multiply"/>`;
  return '';
}

/**
 * The verdict block, with its look's corner shape in the free corner (`corner` is that
 * corner's point): a quarter disc for flat print, halftone dots for pop, a brushed blot
 * for paint, a small sun for minimal, a misregistered disc for riso.
 */
function panelBlock(p: Paint, id: string, x: number, y: number, width: number, height: number, corner: [number, number]): string {
  const [cx, cy] = corner;
  const r = Math.round(Math.min(width, height) * 0.3);
  const clip = `<clipPath id="${id}-panel"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath>`;
  const rect = `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${p.panel}"${p.look === 'painterly' ? ` filter="url(#${id}-brush)"` : ''}/>`;
  let deco = '';
  if (p.look === 'geometric') deco = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.s1}"/>`;
  if (p.look === 'pop') deco = halftone(cx, cy, r * 1.5, p.s1);
  if (p.look === 'painterly') deco = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.s1}" filter="url(#${id}-brush)"/>`;
  if (p.look === 'minimal') {
    // A small sun, set in from the corner.
    const sun = Math.round(Math.min(width, height) * 0.09);
    const inward = (v: number, mid: number): number => v + (v < mid ? 1 : -1) * sun * 1.9;
    deco = `<circle cx="${inward(cx, x + width / 2)}" cy="${inward(cy, y + height / 2)}" r="${sun}" fill="${p.s1}"/>`;
  }
  if (p.look === 'riso') deco = `<circle cx="${cx + 10}" cy="${cy - 7}" r="${r}" fill="${p.s2}" opacity="0.85"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.s1}" style="mix-blend-mode:multiply"/>`;
  const outline = p.look === 'pop' ? `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${INK}" stroke-width="8"/>` : '';
  const hairlines = p.look === 'minimal' ? `<path d="M${x} ${y}H${x + width}M${x} ${y + height}H${x + width}" stroke="${p.panelInk}" stroke-opacity="0.25" stroke-width="2"/>` : '';
  return `${clip}${rect}<g clip-path="url(#${id}-panel)">${deco}</g>${outline}${hairlines}`;
}

/** Comic halftone: dots that shrink away from a corner. */
function halftone(cx: number, cy: number, reach: number, fill: string): string {
  const step = Math.round(reach / 12);
  const dots: string[] = [];
  for (let dy = -reach; dy <= reach; dy += step) {
    for (let dx = -reach; dx <= reach; dx += step) {
      const r = (step * 0.46) * (1 - Math.hypot(dx, dy) / reach);
      if (r > 1.2) dots.push(`<circle cx="${Math.round(cx + dx)}" cy="${Math.round(cy + dy)}" r="${r.toFixed(1)}"/>`);
    }
  }
  return `<g fill="${fill}">${dots.join('')}</g>`;
}

/** Headline text in the look's face: pop and riso set it twice, offset, like print. */
function display(p: Paint, x: number, y: number, size: number, text: string, fill: string, attrs = ''): string {
  const face = `font-size="${size}" font-family="${p.font}" font-weight="${p.weight}"${p.italic ? ' font-style="italic"' : ''}${attrs}`;
  const body = esc(text);
  const main = `<text x="${x}" y="${y}" ${face} fill="${fill}">${body}</text>`;
  if (p.look === 'pop') return `<text x="${x + Math.round(size * 0.05)}" y="${y + Math.round(size * 0.05)}" ${face} fill="${p.s1}">${body}</text>${main}`;
  if (p.look === 'riso') return `<text x="${x + Math.round(size * 0.035)}" y="${y - Math.round(size * 0.025)}" ${face} fill="${p.s1}" fill-opacity="0.8">${body}</text>${main}`;
  return main;
}

/** Story and square: one column, flowing top to bottom; lists take whatever room is left. */
function tall(w: Wrapped, t: Strings, c: Content, id: string, format: 'square' | 'story'): string {
  const story = format === 'story';
  const p = c.paint;
  const [W, H] = CARD_SIZES[format];
  const pad = story ? 72 : 64;
  const s = story
    ? { head: 46, waveY: 140, waveH: 280, axis: 20, label: 30, nameMax: 190, nameMin: 110, sticker: 150, aiLabel: 24, aiName: 64, listTitle: 26, rank: 46, item: 34, row: 66, maxRows: 5, stat: 92, statLabel: 22, statCols: 4, foot: 26 }
    : { head: 34, waveY: 110, waveH: 110, axis: 17, label: 24, nameMax: 140, nameMin: 80, sticker: 104, aiLabel: 20, aiName: 46, listTitle: 20, rank: 34, item: 26, row: 46, maxRows: 3, stat: 66, statLabel: 18, statCols: 3, foot: 20 };
  const out: string[] = [];

  out.push(header(w, t, c, pad, story ? 92 : 76, s.head, W));
  out.push(waveform(w, p, id, 0, s.waveY, W, s.waveH));
  out.push(monthAxis(w, t, p, 0, W, s.waveY + s.waveH + Math.round(s.axis * 1.6), s.axis));

  // The verdict: a full-bleed flat block in the personality's colour.
  const panelY = s.waveY + s.waveH + Math.round(s.axis * 3.2);
  const panel = verdictPanel(c, t, { x: 0, y: panelY, width: W, pad, label: s.label, max: s.nameMax, min: s.nameMin, sticker: s.sticker, id });
  out.push(panel.svg);
  let y = panelY + panel.height;

  if (c.ai) {
    y += story ? 66 : 40;
    out.push(`<text x="${pad}" y="${y}" font-size="${s.aiLabel}" font-weight="700" letter-spacing="${s.aiLabel / 8}" fill="${p.key}">${esc(t.myAiStyle.toUpperCase())}</text>`);
    y += Math.round(s.aiName * 1.05);
    out.push(aiLine(c.ai, p, `${id}-ai`, pad, y, s.aiName, p.ink));
  }

  // Stats and footer are pinned to the bottom; the lists get the space in between.
  const footY = H - (story ? 64 : 44);
  const statY = footY - (story ? 120 : 78);
  const listTop = y + (story ? 84 : 50);
  const roomForRows = statY - s.stat - (story ? 70 : 44) - (listTop + s.listTitle + 18);
  const rows = Math.min(s.maxRows, Math.floor(roomForRows / s.row));
  if (rows >= 2) {
    const colW = (W - pad * 2 - 40) / c.lists.length;
    c.lists.forEach(({ title, items }, i) => out.push(topList(title, items.slice(0, rows), pad + i * (colW + 40), listTop, colW, s, p)));
  }

  out.push(statRow(c.stats.slice(0, s.statCols), p, pad, statY, W - pad * 2, s.stat, s.statLabel));
  out.push(footer(p, pad, footY, s.foot, W - pad));
  return out.join('\n    ');
}

/** Wide: the verdict block on the left, the year and the lists on the right. */
function wide(w: Wrapped, t: Strings, c: Content, id: string): string {
  const [W, H] = CARD_SIZES.wide;
  const p = c.paint;
  const panelW = 500;
  const pad = 52;
  const out: string[] = [];
  const dark = p.panelInk;

  // The title runs along the top and the sticker takes the bottom right, so the look's
  // shape goes in the bottom left, under the AI style.
  out.push(panelBlock(p, id, 0, 0, panelW, H, [0, H]));
  // Say outright what this is: a stranger scrolling past should see "a year of code" first.
  out.push(display({ ...p, look: 'geometric' }, pad, 76, 32, upper(t.cardTitle(w.year)), dark, ' letter-spacing="1"'));
  out.push(`<text x="${pad}" y="108" font-size="20" font-weight="600" fill="${dark}" fill-opacity="0.7">${esc(ellipsize(w.name, 20, panelW - pad * 2))}</text>`);
  out.push(`<text x="${pad}" y="150" font-size="22" font-weight="800" letter-spacing="3" fill="${dark}" fill-opacity="0.75">${esc(upperLabel(t.iAm))}</text>`);
  // Capped below the panel's full height so a two-line name, the punchline and the AI
  // style all clear the sticker in the bottom corner.
  const fit = fitName(c.name, 100, 56, panelW - pad * 2, p.em);
  let y = 150 + 18;
  fit.lines.forEach((line) => {
    y += Math.round(fit.size * 0.98);
    out.push(display(p, pad, y, fit.size, line, dark));
  });
  // CJK glyphs sit lower than Latin caps, and lower-case faces have descenders, so give
  // them more room above the punchline.
  y += CJK.test(c.name) || !p.caps ? 46 : 36;
  out.push(punchline(c, pad, y, 19, panelW - pad * 2));
  if (c.ai) {
    y += 46;
    out.push(`<text x="${pad}" y="${y}" font-size="15" font-weight="800" letter-spacing="2" fill="${dark}" fill-opacity="0.75">${esc(upperLabel(t.myAiStyle))}</text>`);
    y += 42;
    out.push(aiLine(c.ai, p, `${id}-ai`, pad, y, 38, dark));
  }
  // Bottom corner: the title runs along the top, and the name and AI style fill the middle.
  out.push(sticker(c, panelW - 80, H - 80, 84, id));

  const x0 = panelW + 44;
  const areaW = W - x0 - 48;
  out.push(waveform(w, p, id, x0, 34, areaW, 120));
  out.push(monthAxis(w, t, p, x0, areaW, 176, 13));
  const colW = (areaW - 32) / c.lists.length;
  const sizes = { listTitle: 15, rank: 30, item: 22, row: 42 };
  c.lists.forEach(({ title, items }, i) => out.push(topList(title, items.slice(0, 3), x0 + i * (colW + 32), 206, colW, sizes, p)));
  out.push(statRow(c.stats.slice(0, 3), p, x0, 500, areaW, 56, 16));
  out.push(footer(p, x0, 590, 17, W - 48));
  return out.join('\n    ');
}

function header(w: Wrapped, t: Strings, c: Content, pad: number, y: number, size: number, W: number): string {
  // The title is set plain, without the print offsets: it has to read at a glance.
  return `${display({ ...c.paint, look: 'geometric' }, pad, y, size, upper(t.cardTitle(w.year)), c.paint.key, ` letter-spacing="${size / 24}"`)}
    <text x="${W - pad}" y="${y}" font-size="${Math.round(size * 0.78)}" text-anchor="end" fill="${c.paint.ink}" fill-opacity="0.72">${esc(w.name)}</text>`;
}

/** The command to try it, and where to find the project. */
function footer(p: Paint, x: number, y: number, size: number, right: number): string {
  return `<text x="${x}" y="${y}" font-size="${size}" font-family="${MONO}" fill="${p.ink}" fill-opacity="0.6">$ npx commitale</text>
    <text x="${right}" y="${y}" font-size="${size}" text-anchor="end" fill="${p.ink}" fill-opacity="0.45">github.com/qry6868/commitale</text>`;
}

/**
 * The year as a waveform: one bar per week, its height the square root of that
 * week's commits (so one huge week doesn't flatten the rest). Weeks rather than days
 * keep the bars thick enough to read as a bold shape; quiet weeks stay as faint dots.
 * Flat, in the key colour; brushed for paint, printed twice off register for riso.
 */
function waveform(w: Wrapped, p: Paint, id: string, x: number, y: number, width: number, height: number): string {
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
    (v === 0 ? quiet : active).push(`<rect x="${(x + i * step).toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${bar.toFixed(1)}" height="${h.toFixed(1)}" rx="${p.look === 'minimal' ? 0 : (bar / 2).toFixed(1)}"/>`);
  });
  const bars = active.join('');
  const ghost = p.look === 'riso' ? `<g fill="${p.s1}" fill-opacity="0.75" transform="translate(4 -3)">${bars}</g>` : '';
  const brush = p.look === 'painterly' ? ` filter="url(#${id}-brush)"` : '';
  return `<g fill="${p.ink}" fill-opacity="0.18">${quiet.join('')}</g>
    ${ghost}<g fill="${p.key}"${brush}>${bars}</g>`;
}

/** Month names under the waveform, each centred on its own stretch of bars, so the shape reads as a year. */
function monthAxis(w: Wrapped, t: Strings, p: Paint, x: number, width: number, y: number, size: number): string {
  const start = Date.UTC(w.year, 0, 1);
  const step = width / Math.ceil(w.daysInYear / 7);
  const labels = t.months.map((name, m) => {
    const mid = (Date.UTC(w.year, m, 15) - start) / 86_400_000 / 7;
    return `<text x="${(x + mid * step).toFixed(1)}" y="${y}">${esc(name)}</text>`;
  });
  return `<g font-size="${size}" text-anchor="middle" fill="${p.ink}" fill-opacity="0.45">${labels.join('')}</g>`;
}

/** The punchline, shrunk to one line if it has to be. */
function punchline(c: Content, x: number, y: number, max: number, width: number): string {
  const natural = textWidth(c.punchline, max);
  const size = natural > width ? Math.floor((max * width) / natural) : max;
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${c.paint.panelInk}" fill-opacity="0.85">${esc(c.punchline)}</text>`;
}

function verdictPanel(
  c: Content,
  t: Strings,
  o: { x: number; y: number; width: number; pad: number; label: number; max: number; min: number; sticker: number; id: string },
): { svg: string; height: number } {
  const p = c.paint;
  const dark = p.panelInk;
  // Leave room on the right for the sticker that overlaps the block's top edge.
  const fit = fitName(c.name, o.max, o.min, o.width - o.pad * 2 - Math.round(o.sticker * 1.1), p.em);
  const top = Math.round(o.label * 1.9);
  let y = o.y + top;
  const parts = [`<text x="${o.pad}" y="${y}" font-size="${o.label}" font-weight="800" letter-spacing="${o.label / 7}" fill="${dark}" fill-opacity="0.75">${esc(upperLabel(t.iAm))}</text>`];
  fit.lines.forEach((line, i) => {
    y += Math.round(fit.size * (i === 0 ? 1.02 : 0.96));
    parts.push(display(p, o.pad, y, fit.size, line, dark));
  });
  y += Math.round(o.label * (CJK.test(c.name) ? 2.1 : 1.75));
  parts.push(punchline(c, o.pad, y, Math.round(o.label * 1.1), o.width - o.pad * 2));
  const height = y - o.y + Math.round(o.label * 1.6);
  // The sticker takes the top corner, so the look's shape goes in the bottom one.
  const block = panelBlock(p, o.id, o.x, o.y, o.width, height, [o.x + o.width, o.y + height]);
  // The badge sits on the block's top edge like a sticker.
  const stick = sticker(c, o.x + o.width - o.pad - o.sticker * 0.55, o.y, o.sticker, o.id);
  return { svg: [block, ...parts, stick].join('\n    '), height };
}

/**
 * The personality's badge with the user's number on it, in a white frame, stuck on at an
 * angle: with a hard ink shadow for pop, a ghost in the second ink for riso, brushed for
 * paint, and set straight and quiet for minimal.
 */
function sticker(c: Content, cx: number, cy: number, size: number, id: string): string {
  const p = c.paint;
  const frame = Math.round(size * 1.2);
  const art = frame - Math.round(frame * 0.09);
  const [fx, fy, rx] = [Math.round(cx - frame / 2), Math.round(cy - frame / 2), Math.round(frame * 0.16)];
  const plate = (attrs: string): string => `<rect x="${fx}" y="${fy}" width="${frame}" height="${frame}" rx="${rx}" ${attrs}/>`;
  const behind = {
    geometric: '',
    pop: plate(`fill="${INK}" transform="translate(${Math.round(frame * 0.06)} ${Math.round(frame * 0.06)})"`),
    painterly: '',
    minimal: '',
    riso: plate(`fill="${p.s1}" fill-opacity="0.85" transform="translate(${Math.round(frame * 0.05)} ${-Math.round(frame * 0.035)})"`),
  }[p.look];
  const face = {
    geometric: plate('fill="#fff"'),
    pop: plate(`fill="#fff" stroke="${INK}" stroke-width="${Math.round(frame * 0.035)}"`),
    painterly: plate(`fill="#fff" filter="url(#${id}-brush)"`),
    minimal: plate(`fill="#fff" stroke="${p.panelInk}" stroke-opacity="0.18" stroke-width="2"`),
    riso: plate('fill="#fff"'),
  }[p.look];
  const tilt = p.look === 'minimal' ? '' : ` transform="rotate(-6 ${Math.round(cx)} ${Math.round(cy)})"`;
  const shadow = p.look === 'geometric' || p.look === 'painterly' ? ` filter="url(#${id}-shadow)"` : '';
  return `<g${tilt}>${behind}<g${shadow}>${face}</g>
      ${personaArt(c.persona, `${id}-sticker`, { size: art, x: cx - art / 2, y: cy - art / 2 }, c.figure)}
    </g>`;
}

/** The AI style: its badge, then its name in the headline face, sitting on baseline `y`. */
function aiLine(ai: NonNullable<Content['ai']>, p: Paint, key: string, x: number, y: number, size: number, fill: string): string {
  const icon = Math.round(size * 1.1);
  return `${aiArt(ai.id, key, { size: icon, x, y: y - Math.round(icon * 0.84) })}
    ${display({ ...p, look: 'geometric' }, x + icon + Math.round(size * 0.3), y, size, p.caps ? upper(ai.name) : ai.name, fill)}`;
}

function topList(
  title: string,
  items: Item[],
  x: number,
  y: number,
  width: number,
  s: { listTitle: number; rank: number; item: number; row: number },
  p: Paint,
): string {
  const rankW = Math.round(s.rank * 0.9);
  const rows = items.map((item, i) => {
    const baseline = y + s.listTitle + 18 + Math.round(s.row * (i + 0.72));
    const share = `${pct(item.share)}%`;
    const shareW = textWidth(share, s.item) + 12;
    return `${display({ ...p, look: 'geometric' }, x, baseline, s.rank, String(i + 1), p.key)}
    <text x="${x + rankW}" y="${baseline}" font-size="${s.item}" font-weight="600" fill="${p.ink}">${esc(ellipsize(item.name, s.item, width - rankW - shareW))}</text>
    <text x="${x + width}" y="${baseline}" font-size="${s.item}" fill="${p.ink}" fill-opacity="0.55" text-anchor="end">${share}</text>`;
  });
  return `<text x="${x}" y="${y + s.listTitle}" font-size="${s.listTitle}" font-weight="700" letter-spacing="${s.listTitle / 8}" fill="${p.ink}" fill-opacity="0.6">${esc(upperLabel(title))}</text>
    ${rows.join('\n    ')}`;
}

function statRow(stats: [string, string][], p: Paint, x: number, y: number, width: number, max: number, label: number): string {
  const col = width / stats.length;
  // One size for the whole row, small enough that the widest value ("6.7 亿") clears its column.
  const widest = Math.max(...stats.map(([value]) => headlineWidth(value, max, p.em)));
  const size = Math.floor(widest > col - 48 ? (max * (col - 48)) / widest : max);
  return stats
    .map(
      ([value, name], i) => `${display(p, Math.round(x + i * col), y, size, value, p.ink)}
    <text x="${Math.round(x + i * col)}" y="${y + Math.round(label * 1.8)}" font-size="${label}" fill="${p.ink}" fill-opacity="0.66">${esc(ellipsize(name, label, col - 12))}</text>`,
    )
    .join('\n    ');
}

/**
 * The largest size, stepping down, at which `text` fits `width`: in up to two lines for
 * Latin names (bigger type reads better on a poster), on one line for CJK names, which
 * must not break mid-word. `em` is the face's rough width per character.
 */
function fitName(text: string, max: number, min: number, width: number, em: number): { size: number; lines: string[] } {
  if (CJK.test(text)) {
    let size = max;
    while (size > min && headlineWidth(text, size, em) > width) size -= 2;
    return { size, lines: [text] };
  }
  for (let size = max; size > min; size -= 6) {
    const lines = breakLines(text, size, width, em);
    if (lines.length <= 2 && lines.every((l) => headlineWidth(l, size, em) <= width)) return { size, lines };
  }
  return { size: min, lines: breakLines(text, min, width, em).slice(0, 2) };
}

function breakLines(text: string, size: number, width: number, em: number): string[] {
  const tokens = text.match(/[⺀-鿿가-힯＀-￯]|[^\s⺀-鿿가-힯＀-￯]+|\s+/g) ?? [];
  const lines: string[] = [];
  let line = '';
  for (const token of tokens) {
    const next = line + token;
    if (line.trim() && headlineWidth(next.trimEnd(), size, em) > width) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/** Estimated width in a headline face (CJK falls back to a full-width face). */
function headlineWidth(text: string, size: number, em = 0.46): number {
  let w = 0;
  for (const ch of text) w += CJK.test(ch) ? size : ch === ' ' ? size * 0.22 : size * em;
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
