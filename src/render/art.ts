import type { AiStyleId } from '../ai.ts';
import { escapeXml as esc } from '../format.ts';
import type { PersonaId } from '../stats.ts';
import { DISPLAY_FAMILY, HEADLINE_FAMILY } from './font.ts';

/**
 * A badge for each personality and AI style, in place of emoji: emoji look different on
 * every system and clash with the cards. The look is flat and geometric, like a print
 * poster: a square tile in one colour, a character built from circles, half-circles and
 * triangles in two or three more, and the same round eyes on every one of them.
 *
 * With a `figure`, the badge is built around the user's own number: the character peeks
 * over it, so no two people's badges are the same. Without one it is just the character,
 * which still reads at chip size.
 *
 * Pages that include ART_CSS bring the characters to life (the owl blinks, the clock
 * runs); on cards and posters they stand still. `key` keeps the clip ids unique, so
 * several badges can share one page.
 */
export interface Place {
  size?: number;
  x?: number;
  y?: number;
}

/** The number a badge is built around and what it counts, e.g. ["02:47", "LATEST COMMIT"]. */
export type Figure = [value: string, label: string];

export function personaArt(id: PersonaId, key: string, place: Place = {}, figure?: Figure): string {
  return badge(PERSONAS[id], key, place, figure);
}

export function aiArt(id: AiStyleId, key: string, place: Place = {}, figure?: Figure): string {
  return badge(AI[id], key, place, figure);
}

const CREAM = '#F3EBDD';
const INK = '#16161D';
const NAVY = '#1F2A5C';
const RED = '#E8553A';
const BRICK = '#C23B2E';
const YELLOW = '#F2C14E';
const ORANGE = '#F2A541';
const TEAL = '#3AA6A0';
const BLUE = '#2D6CB5';
const PLUM = '#7B5EA7';
const PINK = '#D94F8A';
const GREEN = '#2F9E68';

interface Look {
  bg: string;
  /** The label's colour, and anything else that picks out the number. */
  accent: string;
  /** The character, drawn with its face above y=76; over a number it is lifted 4 and the band starts at 80. */
  draw: (u: string) => string;
}

const round = (n: number): number => Math.round(n * 10) / 10;

function badge(look: Look, key: string, place: Place, figure?: Figure): string {
  const u = `art-${key}`;
  const size = place.size ?? 120;
  const at = place.x === undefined ? '' : ` x="${round(place.x)}" y="${round(place.y ?? 0)}"`;
  // Without a number, the character drops into the middle of the tile.
  const body = figure
    ? `<g transform="translate(0 -4)">${look.draw(u)}</g><rect y="80" width="120" height="40" fill="${look.bg}"/>${number(figure, look.accent)}`
    : `<g transform="translate(0 14)">${look.draw(u)}</g>`;
  return `<svg class="art"${at} width="${round(size)}" height="${round(size)}" viewBox="0 0 120 120" aria-hidden="true">
  <defs><clipPath id="${u}-tile"><rect width="120" height="120" rx="16"/></clipPath></defs>
  <g clip-path="url(#${u}-tile)"><rect width="120" height="120" fill="${look.bg}"/>${body}</g></svg>`;
}

/** The figure in the headline face, shrunk to fit, with its label underneath. */
function number([value, label]: Figure, accent: string): string {
  const size = Math.min(32, 104 / Math.max(1, [...value].length * 0.5));
  return `<text x="60" y="107" text-anchor="middle" font-family="'${HEADLINE_FAMILY}', Impact, 'Arial Narrow', sans-serif" font-size="${round(size)}" fill="${CREAM}">${esc(value)}</text>
  <text x="60" y="116.5" text-anchor="middle" font-family="'${DISPLAY_FAMILY}', system-ui, sans-serif" font-size="7.5" font-weight="700" letter-spacing="1.2" fill="${accent}">${esc(label)}</text>`;
}

/** The family face: two round eyes that blink and follow the pointer. */
function eyes(y: number, gap = 11, r = 8.5, x = 60, white = CREAM): string {
  const p = r * 0.5;
  return `<g class="a-blink"><circle cx="${x - gap}" cy="${y}" r="${r}" fill="${white}"/><circle cx="${x + gap}" cy="${y}" r="${r}" fill="${white}"/>
    <g class="a-pupils"><circle cx="${round(x - gap + r * 0.2)}" cy="${round(y + r * 0.1)}" r="${round(p)}" fill="${INK}"/><circle cx="${round(x + gap - r * 0.2)}" cy="${round(y + r * 0.1)}" r="${round(p)}" fill="${INK}"/></g></g>`;
}

/** The AI in every AI-style badge: a rounded robot with a screen for a face. */
function robot(body: string, x = 60, face = pillEyes(x)): string {
  return `<rect x="${x - 3}" y="22" width="6" height="14" fill="${INK}"/>
    <rect x="${x - 20}" y="78" width="40" height="50" rx="10" fill="${body}"/>
    <rect x="${x - 28}" y="34" width="56" height="46" rx="13" fill="${body}"/>
    <rect x="${x - 21}" y="42" width="42" height="29" rx="8" fill="${INK}"/>
    ${face}`;
}
const pillEyes = (x: number, colour = CREAM): string =>
  `<g class="a-blink"><rect x="${x - 13}" y="50" width="8" height="13" rx="4" fill="${colour}"/><rect x="${x + 5}" y="50" width="8" height="13" rx="4" fill="${colour}"/></g>`;

const PERSONAS: Record<PersonaId, Look> = {
  // An owl in two triangles and a rectangle, under a crescent moon.
  nightOwl: {
    bg: NAVY,
    accent: YELLOW,
    draw: () => `<circle cx="97" cy="22" r="11" fill="${YELLOW}"/><circle cx="102.5" cy="17.5" r="9.5" fill="${NAVY}"/>
    <circle class="a-twinkle" cx="20" cy="24" r="1.8" fill="${CREAM}"/><circle class="a-twinkle a-late" cx="31" cy="12" r="1.3" fill="${CREAM}"/>
    <g class="a-bob">
      <path d="M26 130 V50 L34 20 L50 38 H70 L86 20 L94 50 V130 Z" fill="${RED}"/>
      <path d="M40 118 A20 20 0 0 1 80 118 Z" fill="${CREAM}"/>
      ${eyes(54, 13, 12)}
      <path d="M55 67 H65 L60 75 Z" fill="${YELLOW}"/>
    </g>`,
  },

  // A round bird in front of the rising sun, flapping and hopping.
  earlyBird: {
    bg: ORANGE,
    accent: NAVY,
    draw: () => `<circle cx="60" cy="62" r="52" fill="${YELLOW}"/><circle cx="60" cy="62" r="40" fill="#F7D774"/>
    <g class="a-hop">
      <path class="a-wing-l" d="M34 54 A12 14 0 0 0 34 82 Z" fill="${BRICK}"/>
      <path class="a-wing-r" d="M86 54 A12 14 0 0 1 86 82 Z" fill="${BRICK}"/>
      <circle cx="60" cy="62" r="27" fill="${RED}"/>
      <path d="M52 37 L56 25 L60 35 L65 27 L66 38 Z" fill="${RED}"/>
      ${eyes(55, 10, 7.5)}
      <path d="M54 65 H66 L60 73 Z" fill="${NAVY}"/>
    </g>`,
  },

  // A knight's helmet with a visor, a plume and a lightning bolt.
  weekendWarrior: {
    bg: RED,
    accent: YELLOW,
    draw: () => `<path class="a-sway" d="M60 30 C60 12 78 4 94 10 C82 12 72 20 66 32 Z" fill="${YELLOW}"/>
    <path d="M30 130 V58 A30 30 0 0 1 90 58 V130 Z" fill="${NAVY}"/>
    <rect x="57" y="28" width="6" height="22" fill="${CREAM}" opacity=".9"/>
    <rect x="35" y="49" width="50" height="17" rx="8.5" fill="${INK}"/>
    <g class="a-blink"><circle cx="50" cy="57.5" r="4" fill="${YELLOW}"/><circle cx="70" cy="57.5" r="4" fill="${YELLOW}"/></g>
    <circle cx="38" cy="74" r="2.4" fill="${CREAM}"/><circle cx="82" cy="74" r="2.4" fill="${CREAM}"/>
    <path class="a-bolt" d="M63 78 L53 94 H60 L56 108 L69 89 H62 L66 78 Z" fill="${YELLOW}"/>`,
  },

  // A runner in a headband, ties flying, mid-stride.
  marathoner: {
    bg: GREEN,
    accent: CREAM,
    draw: () => `<g class="a-speed" fill="${CREAM}" opacity=".5"><rect x="92" y="44" width="18" height="4" rx="2"/><rect x="98" y="56" width="14" height="4" rx="2"/><rect x="94" y="68" width="18" height="4" rx="2"/></g>
    <g class="a-bounce">
      <path class="a-tie" d="M32 40 L10 30 L14 44 Z M32 44 L12 54 L22 58 Z" fill="${RED}"/>
      <circle cx="60" cy="60" r="30" fill="${ORANGE}"/>
      <path d="M31 40 H89 V49 H30 Z" fill="${RED}"/>
      ${eyes(60, 11, 8)}
      <path d="M53 71 A7 7 0 0 0 67 71 Z" fill="${INK}"/>
      <path class="a-drip" d="M88 26 Q83 34 88 36 Q93 34 88 26 Z" fill="${CREAM}"/>
    </g>`,
  },

  // A ladybug under a sweeping magnifier.
  bugHunter: {
    bg: YELLOW,
    accent: NAVY,
    draw: () => `<g class="a-antenna" stroke="${INK}" stroke-width="3" stroke-linecap="round"><path d="M52 30 L42 14 M68 30 L78 14"/><circle cx="42" cy="14" r="2.5" fill="${INK}"/><circle cx="78" cy="14" r="2.5" fill="${INK}"/></g>
    <circle cx="60" cy="74" r="32" fill="${RED}"/>
    <rect x="59" y="44" width="2" height="70" fill="${INK}"/>
    <circle cx="46" cy="68" r="5" fill="${INK}"/><circle cx="74" cy="68" r="5" fill="${INK}"/><circle cx="44" cy="88" r="4" fill="${INK}"/><circle cx="76" cy="88" r="4" fill="${INK}"/>
    <path d="M38 50 A22 22 0 0 1 82 50 Z" fill="${INK}"/>
    ${eyes(40, 8, 5.5)}
    <g class="a-sweep"><circle cx="90" cy="54" r="14" fill="${CREAM}" fill-opacity=".3" stroke="${CREAM}" stroke-width="5"/><path d="M99 65 L110 78" stroke="${NAVY}" stroke-width="7" stroke-linecap="round"/></g>`,
  },

  // A head in a knotted kerchief, with soap bubbles drifting up.
  cleaner: {
    bg: TEAL,
    accent: CREAM,
    draw: () => `<g class="a-bubble" fill="none" stroke="${CREAM}" stroke-width="2.5"><circle cx="20" cy="46" r="6"/><circle cx="102" cy="62" r="4.5"/><circle cx="26" cy="22" r="4"/></g>
    <circle cx="60" cy="62" r="30" fill="${NAVY}"/>
    <path d="M28 54 A32 32 0 0 1 92 54 Z" fill="${RED}"/>
    <path class="a-tie" d="M88 48 L104 40 L100 56 Z" fill="${RED}"/>
    <circle cx="46" cy="44" r="2.4" fill="${CREAM}"/><circle cx="60" cy="38" r="2.4" fill="${CREAM}"/><circle cx="74" cy="44" r="2.4" fill="${CREAM}"/>
    ${eyes(65, 11, 8)}`,
  },

  // A globe with two speech bubbles in code.
  polyglot: {
    bg: PLUM,
    accent: YELLOW,
    draw: (u) => `<defs><clipPath id="${u}-globe"><circle cx="60" cy="62" r="30"/></clipPath></defs>
    <circle cx="60" cy="62" r="30" fill="${TEAL}"/>
    <g clip-path="url(#${u}-globe)" fill="none" stroke="${CREAM}" stroke-opacity=".45" stroke-width="2.5">
      <ellipse class="a-turn" cx="60" cy="62" rx="14" ry="30"/><path d="M28 50 H92 M28 76 H92"/>
    </g>
    ${eyes(60, 11, 8)}
    <g class="a-float"><rect x="6" y="10" width="34" height="20" rx="10" fill="${YELLOW}"/><path d="M18 30 L16 38 L26 30 Z" fill="${YELLOW}"/>
      <path d="M19 15 L14 20 L19 25 M27 15 L32 20 L27 25" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g class="a-float a-late"><rect x="82" y="6" width="32" height="20" rx="10" fill="${CREAM}"/><path d="M102 26 L104 34 L94 26 Z" fill="${CREAM}"/>
      <path d="M95 11 Q91 11 91 14 V15 Q91 16 89 16 Q91 16 91 17 V18 Q91 21 95 21 M101 11 Q105 11 105 14 V15 Q105 16 107 16 Q105 16 105 17 V18 Q105 21 101 21" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`,
  },

  // A clock for a head, hands always going.
  nineToFive: {
    bg: BLUE,
    accent: YELLOW,
    draw: () => `<circle cx="60" cy="58" r="32" fill="${CREAM}"/>
    <g fill="${INK}"><rect x="58.5" y="30" width="3" height="7" rx="1.5"/><rect x="32" y="56.5" width="7" height="3" rx="1.5"/><rect x="81" y="56.5" width="7" height="3" rx="1.5"/></g>
    <rect class="a-hour" x="58.5" y="38" width="3" height="10" rx="1.5" fill="${INK}"/>
    <rect class="a-minute" x="59" y="33" width="2" height="15" rx="1" fill="${RED}"/>
    <circle cx="60" cy="48" r="3" fill="${INK}"/>
    <g class="a-blink"><circle cx="49" cy="64" r="4" fill="${INK}"/><circle cx="71" cy="64" r="4" fill="${INK}"/></g>
    <path d="M55 72 A5 5 0 0 0 65 72 Z" fill="${RED}"/>
    <rect x="100" y="18" width="6" height="6" fill="${YELLOW}"/><rect x="12" y="84" width="6" height="6" fill="${YELLOW}"/>`,
  },

  // A head in a hard hat, with the next block lowered onto the stack.
  builder: {
    bg: RED,
    accent: YELLOW,
    draw: () => `<rect x="90" y="60" width="20" height="16" fill="${CREAM}"/>
    <g class="a-drop"><rect x="90" y="-40" width="2" height="84" fill="${INK}"/><rect x="90" y="44" width="20" height="16" fill="${YELLOW}"/></g>
    <circle cx="54" cy="66" r="28" fill="${NAVY}"/>
    <path d="M28 56 A26 26 0 0 1 80 56 Z" fill="${YELLOW}"/>
    <rect x="22" y="53" width="64" height="7" rx="3.5" fill="${YELLOW}"/>
    <rect x="51" y="30" width="6" height="24" fill="#D9A520"/>
    ${eyes(70, 10, 7.5, 54)}`,
  },
};

const AI: Record<AiStyleId, Look> = {
  // The AI peeks up when asked the odd question.
  spotChecker: {
    bg: ORANGE,
    accent: NAVY,
    draw: () => `<g class="a-ask"><circle cx="96" cy="24" r="15" fill="${CREAM}"/><path d="M90 30 L84 40 L96 36 Z" fill="${CREAM}"/>
      <path d="M90.5 20 Q90.5 13 96 13 Q101.5 13 101.5 18.5 Q101.5 23 96 24.5 V27.5" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="96" cy="33" r="2" fill="${INK}"/></g>
    <g class="a-peek">${robot(TEAL, 52)}</g>`,
  },

  // You and the AI side by side, taking turns.
  pairProgrammer: {
    bg: BLUE,
    accent: YELLOW,
    draw: () => `<g class="a-take">
      <rect x="16" y="78" width="40" height="50" rx="14" fill="${YELLOW}"/>
      <circle cx="36" cy="58" r="21" fill="${ORANGE}"/><path d="M15 56 A21 21 0 0 1 57 56 Z" fill="${INK}"/>
      ${eyes(62, 7.5, 5.5, 36)}
    </g>
    <g class="a-say"><rect x="20" y="12" width="32" height="14" rx="7" fill="${CREAM}"/><circle cx="29" cy="19" r="2" fill="${INK}"/><circle cx="36" cy="19" r="2" fill="${INK}"/><circle cx="43" cy="19" r="2" fill="${INK}"/></g>
    <g class="a-take a-late">
      <rect x="84" y="28" width="4" height="12" fill="${INK}"/>
      <rect x="68" y="78" width="36" height="50" rx="10" fill="${TEAL}"/>
      <rect x="64" y="38" width="44" height="40" rx="12" fill="${TEAL}"/>
      <rect x="70" y="45" width="32" height="25" rx="7" fill="${INK}"/>
      <g class="a-blink"><rect x="77" y="51" width="6" height="11" rx="3" fill="${CREAM}"/><rect x="89" y="51" width="6" height="11" rx="3" fill="${CREAM}"/></g>
    </g>
    <g class="a-say a-late"><rect x="70" y="10" width="32" height="14" rx="7" fill="${YELLOW}"/><circle cx="79" cy="17" r="2" fill="${INK}"/><circle cx="86" cy="17" r="2" fill="${INK}"/><circle cx="93" cy="17" r="2" fill="${INK}"/></g>`,
  },

  // The AI drives; you hold the compass, which swings and settles.
  navigator: {
    bg: TEAL,
    accent: CREAM,
    draw: () => `<g class="a-needle"><path d="M60 3 L67 18 L53 18 Z" fill="${RED}"/><path d="M60 33 L67 18 L53 18 Z" fill="${CREAM}"/></g>
    <circle cx="60" cy="18" r="2.4" fill="${INK}"/>
    ${robot(NAVY, 60, pillEyes(60, YELLOW))}`,
  },

  // You describe it; the AI hands back the finished parcel.
  delegator: {
    bg: PLUM,
    accent: YELLOW,
    draw: () => `${robot(TEAL, 50)}
    <g class="a-ship"><rect x="84" y="20" width="28" height="24" fill="${ORANGE}"/><rect x="95.5" y="20" width="5" height="24" fill="${CREAM}"/><path d="M84 20 L90 12 H106 L112 20 Z" fill="${YELLOW}"/></g>`,
  },

  // The AI in headphones, nodding along.
  vibeCoder: {
    bg: PINK,
    accent: YELLOW,
    draw: () => `<g class="a-note" fill="${CREAM}"><circle cx="16" cy="40" r="5"/><rect x="19" y="18" width="3" height="22"/><rect x="19" y="18" width="10" height="4"/></g>
    <g class="a-note a-late" fill="${YELLOW}"><circle cx="100" cy="30" r="4.5"/><rect x="102.5" y="12" width="3" height="18"/></g>
    <g class="a-groove">
      ${robot(NAVY, 60, `<path d="M42 60 Q47 52 52 60 M68 60 Q73 52 78 60" stroke="${YELLOW}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`)}
      <path d="M26 56 A34 34 0 0 1 94 56" stroke="${INK}" stroke-width="6" fill="none"/>
      <rect x="20" y="46" width="13" height="26" rx="6" fill="${YELLOW}"/><rect x="87" y="46" width="13" height="26" rx="6" fill="${YELLOW}"/>
    </g>`,
  },
};

/** The motion. Scoped to `.art`; anyone who prefers reduced motion gets the still pictures. */
export const ART_CSS = `
.art *{transform-box:fill-box}
.art .a-late{animation-delay:.6s!important}
.art .a-twinkle{transform-origin:center;animation:a-twinkle 2.4s ease-in-out infinite}
@keyframes a-twinkle{50%{opacity:.2;transform:scale(.6)}}
.art .a-bob,.art .a-float{animation:a-bob 3s ease-in-out infinite}
@keyframes a-bob{50%{transform:translateY(-2.5px)}}
.art .a-blink{transform-origin:center;animation:a-blink 4.5s infinite}
@keyframes a-blink{0%,92%,100%{transform:none}95%{transform:scaleY(.1)}}
.art .a-pupils{transition:transform .25s ease-out}
.art .a-hop{animation:a-hop 2.2s cubic-bezier(.3,0,.3,1) infinite}
@keyframes a-hop{0%,40%,100%{transform:none}52%{transform:translateY(-6px)}64%{transform:none}72%{transform:translateY(-3px)}82%{transform:none}}
.art .a-wing-l{transform-origin:100% 0;animation:a-flap-l 2.2s ease-in-out infinite}
.art .a-wing-r{transform-origin:0 0;animation:a-flap-r 2.2s ease-in-out infinite}
@keyframes a-flap-l{0%,40%,100%{transform:none}50%,62%{transform:rotate(22deg)}}
@keyframes a-flap-r{0%,40%,100%{transform:none}50%,62%{transform:rotate(-22deg)}}
.art .a-sway{transform-origin:0 100%;animation:a-sway 3s ease-in-out infinite}
@keyframes a-sway{50%{transform:rotate(-8deg)}}
.art .a-bolt{transform-origin:center;animation:a-bolt 2.6s ease-in-out infinite}
@keyframes a-bolt{0%,100%{transform:none}50%{transform:scale(1.12)}}
.art .a-speed rect{animation:a-speed .8s linear infinite}
.art .a-speed rect:nth-child(2){animation-delay:-.3s}.art .a-speed rect:nth-child(3){animation-delay:-.55s}
@keyframes a-speed{from{transform:translateX(10px);opacity:0}30%{opacity:1}to{transform:translateX(-14px);opacity:0}}
.art .a-bounce{animation:a-bounce .8s cubic-bezier(.3,0,.3,1) infinite}
@keyframes a-bounce{50%{transform:translateY(-5px)}}
.art .a-tie{transform-origin:100% 50%;animation:a-tie .4s ease-in-out infinite alternate}
@keyframes a-tie{to{transform:rotate(-12deg) scaleX(.9)}}
.art .a-drip{animation:a-drip 1.6s ease-in infinite}
@keyframes a-drip{0%{opacity:0;transform:none}20%{opacity:1}100%{opacity:0;transform:translate(6px,10px)}}
.art .a-antenna{transform-origin:50% 100%;animation:a-antenna 1.8s ease-in-out infinite}
@keyframes a-antenna{25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}
.art .a-sweep{animation:a-sweep 4s ease-in-out infinite}
@keyframes a-sweep{0%,100%{transform:none}35%{transform:translate(-22px,4px)}65%{transform:translate(-8px,-12px)}}
.art .a-bubble circle{animation:a-rise 3s ease-in infinite}
.art .a-bubble circle:nth-child(2){animation-delay:1s}.art .a-bubble circle:nth-child(3){animation-delay:2s}
@keyframes a-rise{0%{opacity:0;transform:translateY(10px)}20%{opacity:1}100%{opacity:0;transform:translateY(-20px)}}
.art .a-turn{transform-origin:center;animation:a-turn 2.4s ease-in-out infinite alternate}
@keyframes a-turn{to{transform:scaleX(.2)}}
.art .a-hour{transform-origin:50% 100%;animation:a-spin 24s linear infinite}
.art .a-minute{transform-origin:50% 100%;animation:a-spin 4s linear infinite}
@keyframes a-spin{to{transform:rotate(360deg)}}
.art .a-drop{animation:a-drop 3.4s cubic-bezier(.5,0,.3,1) infinite}
@keyframes a-drop{0%,100%{transform:translateY(-40px)}45%,80%{transform:none}}
.art .a-peek{animation:a-peek 4.8s cubic-bezier(.3,0,.3,1) infinite}
@keyframes a-peek{0%,100%{transform:translateY(34px)}30%,85%{transform:none}}
.art .a-ask{transform-origin:0 100%;animation:a-ask 4.8s ease-out infinite}
@keyframes a-ask{0%,30%{transform:scale(0)}38%{transform:scale(1.12)}44%,82%{transform:none}92%,100%{transform:scale(0)}}
.art .a-take{animation:a-take 2.8s ease-in-out infinite}
.art .a-say{animation:a-say 2.8s ease-in-out infinite}
.art .a-take.a-late,.art .a-say.a-late{animation-delay:-1.4s!important}
@keyframes a-take{0%,50%,100%{transform:none}15%,35%{transform:translateY(-4px)}}
@keyframes a-say{0%,50%,100%{opacity:0}12%,38%{opacity:1}}
.art .a-needle{transform-origin:center;animation:a-needle 4s ease-in-out infinite}
@keyframes a-needle{0%,64%,100%{transform:none}12%{transform:rotate(-40deg)}28%{transform:rotate(24deg)}42%{transform:rotate(-10deg)}54%{transform:rotate(4deg)}}
.art .a-ship{animation:a-ship 3.2s cubic-bezier(.3,0,.3,1) infinite}
@keyframes a-ship{0%{transform:translate(-24px,30px) scale(.5);opacity:0}35%,75%{transform:none;opacity:1}100%{transform:translateY(-16px);opacity:0}}
.art .a-groove{transform-origin:50% 100%;animation:a-groove 1.2s ease-in-out infinite}
@keyframes a-groove{25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}
.art .a-note{animation:a-note 2.4s ease-out infinite}
@keyframes a-note{0%{opacity:0;transform:translateY(8px)}30%{opacity:1}100%{opacity:0;transform:translateY(-12px)}}
@media (prefers-reduced-motion:reduce){.art *{animation:none!important}}
`;
