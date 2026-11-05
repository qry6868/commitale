import type { PersonaId } from '../stats.ts';
import { BLUE, contrast, CREAM, GREEN, INK, NAVY, NIGHT, ORANGE, PINK, PLUM, RED, TEAL, tone, YELLOW } from './palette.ts';

/**
 * The report's backdrops, in the badges' flat print style. Two kinds of page alternate,
 * like the year-in-review stories people know: **field** pages are one solid colour with
 * a giant shape cut off by the edges, for the big moments; **data** pages stay near-black
 * so charts read clearly, with small shapes tucked into the corners. Shapes slide in from
 * off screen when a page opens, then drift.
 *
 * Every colour comes from one palette, picked per personality, so no two people's
 * reports look the same.
 */
export type Kind = 'field' | 'data' | 'stage';

interface Colours {
  /** Field pages take these in turn. */
  fields: string[];
  /** The personality page: chosen to set off the badge's own tile. */
  stage: string;
  /** The highlight on data pages: peaks, the heatmap, kickers. */
  key: string;
}

const COLOURS: Record<PersonaId, Colours> = {
  nightOwl: { fields: [NAVY, RED, PLUM, BLUE, TEAL], stage: YELLOW, key: YELLOW },
  earlyBird: { fields: [ORANGE, PINK, NAVY, RED, YELLOW], stage: NAVY, key: ORANGE },
  weekendWarrior: { fields: [RED, NAVY, YELLOW, PLUM, ORANGE], stage: YELLOW, key: RED },
  marathoner: { fields: [GREEN, NAVY, YELLOW, TEAL, RED], stage: YELLOW, key: GREEN },
  bugHunter: { fields: [YELLOW, RED, NAVY, PLUM, ORANGE], stage: NAVY, key: YELLOW },
  cleaner: { fields: [TEAL, NAVY, YELLOW, PLUM, RED], stage: YELLOW, key: TEAL },
  polyglot: { fields: [PLUM, TEAL, YELLOW, PINK, NAVY], stage: YELLOW, key: PINK },
  nineToFive: { fields: [BLUE, YELLOW, RED, NAVY, TEAL], stage: YELLOW, key: YELLOW },
  builder: { fields: [RED, NAVY, YELLOW, TEAL, PLUM], stage: YELLOW, key: ORANGE },
};

type Form = 'circle' | 'half' | 'quarter' | 'square' | 'ring' | 'bar' | 'tri';

interface Shape {
  form: Form;
  /** Width, and height when it differs (CSS lengths). */
  w: string;
  h?: string;
  /** Where it sits: any of left/right/top/bottom. */
  at: Partial<Record<'left' | 'right' | 'top' | 'bottom', string>>;
  rotate?: number;
  /** Where it slides in from, as a CSS translate. */
  from: string;
  /** Which of the page's two shape colours: 0 or 1. */
  colour: 0 | 1;
}

// One giant shape and an accent per field page, cycled.
const FIELD: Shape[][] = [
  [
    { form: 'circle', w: '86vmin', at: { right: '-22vmin', bottom: '-34vmin' }, from: '30vmin, 30vmin', colour: 0 },
    { form: 'square', w: '9vmin', at: { right: '12vw', top: '14vh' }, rotate: 14, from: '0, -40vmin', colour: 1 },
  ],
  [
    { form: 'quarter', w: '72vmin', at: { right: '-2vmin', top: '-2vmin' }, from: '30vmin, -30vmin', colour: 0 },
    { form: 'bar', w: '46vw', h: '5vmin', at: { left: '0', bottom: '9vh' }, from: '-50vw, 0', colour: 1 },
  ],
  [
    { form: 'ring', w: '64vmin', at: { right: '-22vmin', bottom: '-22vmin' }, from: '40vmin, 40vmin', colour: 0 },
    { form: 'circle', w: '11vmin', at: { right: '9vw', top: '11vh' }, from: '0, -30vmin', colour: 1 },
  ],
  [
    { form: 'half', w: '96vmin', h: '48vmin', at: { right: '-30vmin', bottom: '-1vmin' }, from: '0, 50vmin', colour: 0 },
    { form: 'tri', w: '12vmin', at: { right: '10vw', top: '12vh' }, rotate: -12, from: '0, -40vmin', colour: 1 },
  ],
];

// Small shapes in the corners, out of the charts' way.
const DATA: Shape[][] = [
  [
    { form: 'quarter', w: '28vmin', at: { right: '0', top: '0' }, from: '14vmin, -14vmin', colour: 0 },
    { form: 'square', w: '5vmin', at: { left: '4vw', bottom: '7vh' }, rotate: 18, from: '-20vmin, 0', colour: 1 },
  ],
  [
    { form: 'half', w: '30vmin', h: '15vmin', at: { right: '6vw', bottom: '0' }, from: '0, 16vmin', colour: 0 },
    { form: 'circle', w: '4vmin', at: { left: '6vw', top: '12vh' }, from: '-20vmin, 0', colour: 1 },
  ],
  [
    { form: 'bar', w: '1.6vmin', h: '100vh', at: { left: '0', top: '0' }, from: '-4vmin, 0', colour: 0 },
    { form: 'ring', w: '16vmin', at: { right: '-5vmin', bottom: '-5vmin' }, from: '10vmin, 10vmin', colour: 1 },
  ],
  [
    { form: 'tri', w: '18vmin', at: { left: '-3vmin', bottom: '-2vmin' }, rotate: 8, from: '-14vmin, 14vmin', colour: 0 },
    { form: 'circle', w: '7vmin', at: { right: '7vw', top: '9vh' }, from: '0, -20vmin', colour: 1 },
  ],
  [
    { form: 'circle', w: '24vmin', at: { right: '-9vmin', top: '-9vmin' }, from: '12vmin, -12vmin', colour: 0 },
    { form: 'bar', w: '22vw', h: '1.6vmin', at: { left: '0', bottom: '5vh' }, from: '-24vw, 0', colour: 1 },
  ],
  [
    { form: 'ring', w: '20vmin', at: { left: '-7vmin', top: '-7vmin' }, from: '-12vmin, -12vmin', colour: 0 },
    { form: 'square', w: '6vmin', at: { right: '5vw', bottom: '8vh' }, rotate: -10, from: '0, 20vmin', colour: 1 },
  ],
  [
    // Turned over, the quarter tucks into the bottom-left corner instead.
    { form: 'quarter', w: '22vmin', at: { left: '0', bottom: '0' }, rotate: 180, from: '-12vmin, 12vmin', colour: 0 },
    { form: 'bar', w: '1.6vmin', h: '30vh', at: { right: '6vw', top: '0' }, from: '0, -30vh', colour: 1 },
  ],
  [
    { form: 'tri', w: '16vmin', at: { right: '4vw', top: '-2vmin' }, rotate: 180, from: '0, -20vmin', colour: 0 },
    { form: 'circle', w: '5vmin', at: { left: '5vw', bottom: '10vh' }, from: '-16vmin, 0', colour: 1 },
  ],
];

// The reveal: a sunrise of a half-disc behind the badge, and a ring.
const STAGE: Shape[] = [
  { form: 'half', w: '84vmin', h: '42vmin', at: { right: '-26vmin', bottom: '-1vmin' }, from: '0, 50vmin', colour: 0 },
  { form: 'ring', w: '22vmin', at: { right: '8vw', top: '10vh' }, from: '0, -40vmin', colour: 1 },
];

export interface Scene {
  /** CSS custom properties for the page: its colours, for text, surfaces and charts. */
  style: string;
  tone: 'light' | 'dark';
  /** The shapes, as markup for the page's backdrop. */
  shapes: string;
}

/** A backdrop for each page, in order. */
export function scenery(persona: PersonaId, kinds: Kind[]): Scene[] {
  const c = COLOURS[persona];
  let field = 0;
  let data = 0;
  return kinds.map((kind) => {
    const bg = kind === 'stage' ? c.stage : kind === 'field' ? c.fields[field % c.fields.length] : NIGHT;
    const t = kind === 'data' ? 'dark' : tone(bg);
    const ink = t === 'light' ? INK : CREAM;
    // Shape colours: anything in the palette that isn't the page itself.
    const others = [c.key, ...c.fields, c.stage].filter((x, i, all) => x !== bg && all.indexOf(x) === i);
    const pair: [string, string] =
      kind === 'data' ? [c.key, others.find((x) => x !== c.key && x !== NAVY) ?? CREAM] : [others[field % others.length], others[(field + 1) % others.length]];
    const shapes = kind === 'stage' ? STAGE : kind === 'field' ? FIELD[field % FIELD.length] : DATA[data % DATA.length];
    if (kind === 'field') field++;
    if (kind === 'data') data++;
    // On data pages the highlight is the personality's colour; on fields, the ink.
    const hi = kind === 'data' ? c.key : ink;
    const accent = kind === 'data' ? c.key : ink;
    // For small icons on an accent tile: the palette colour that stands out most on the
    // tile while still parting from the page colour drawn next to it.
    const pop = others.filter((x) => x !== accent && contrast(x, bg) >= 1.5).sort((a, b) => contrast(b, accent) - contrast(a, accent))[0] ?? CREAM;
    const rgb = t === 'light' ? '22,22,29' : '243,235,221';
    const style = [
      `--bg:${bg}`,
      `--ink:${ink}`,
      `--muted:rgba(${rgb},.7)`,
      // Opaque, so a card over one of the shapes stays readable.
      `--glass:color-mix(in srgb,${ink} 9%,${bg})`,
      `--line:rgba(${rgb},.14)`,
      `--bar:rgba(${rgb},.26)`,
      `--hi:${hi}`,
      `--accent:${accent}`,
      `--pop:${pop}`,
      // Lines added and removed: green and red where charts are, the ink on a colour field.
      `--plus:${kind === 'data' ? GREEN : ink}`,
      `--minus:${kind === 'data' ? RED : ink}`,
      `--s1:${pair[0]}`,
      `--s2:${pair[1]}`,
    ].join(';');
    return { style, tone: t, shapes: shapes.map((s, i) => shape(s, pair[s.colour], i)).join('') };
  });
}

/** Shapes are sized in vmin, scaled down on portrait screens, where vmin is the whole width. */
const unit = (css: string): string => css.replace(/(-?[0-9.]+)vmin/g, (_, n) => `calc(${n} * var(--u))`);

function shape(s: Shape, colour: string, i: number): string {
  const at = Object.entries(s.at).map(([k, v]) => `${k}:${unit(v)}`).join(';');
  const h = s.h ? `;--h:${unit(s.h)}` : '';
  // Each shape drifts on its own clock, so the page never moves in lockstep.
  const drift = `--dur:${14 + i * 5}s;--dx:${i % 2 ? -1.4 : 1.4}vmin;--dy:${i % 2 ? 1.2 : -1.2}vmin`;
  return `<i class="s ${s.form}" style="--w:${unit(s.w)}${h};${at};--r:${s.rotate ?? 0}deg;--from:${unit(s.from)};--c:${colour};--sd:${0.08 + i * 0.12}s;${drift}"><b></b></i>`;
}

/** The shapes' look and motion. Pages give `.in` once they open, which brings the shapes in. */
export const SCENERY_CSS = `
.scene{position:absolute;inset:0;overflow:hidden;z-index:-2;pointer-events:none;--u:1vmin}
@media (orientation:portrait){.scene{--u:.62vmin}}
.scene .s{position:absolute;width:var(--w);height:var(--h,var(--w));transform:translate(var(--from)) rotate(var(--r));opacity:0;
  transition:transform 1.1s cubic-bezier(.16,.84,.24,1) var(--sd),opacity .5s ease var(--sd)}
.in .scene .s{transform:rotate(var(--r));opacity:1}
.scene .s b{display:block;width:100%;height:100%;background:var(--c);animation:drift var(--dur) ease-in-out infinite alternate}
.scene .circle b{border-radius:50%}
.scene .half b{border-radius:999px 999px 0 0}
.scene .quarter b{border-radius:0 0 0 100%}
.scene .ring b{background:none;border:max(10px,2.6vmin) solid var(--c);border-radius:50%}
.scene .tri b{clip-path:polygon(50% 0,100% 100%,0 100%)}
@keyframes drift{to{transform:translate(var(--dx),var(--dy)) rotate(3deg)}}
@media (prefers-reduced-motion:reduce){.scene .s{transition:none;transform:rotate(var(--r));opacity:1}.scene .s b{animation:none}}
`;
