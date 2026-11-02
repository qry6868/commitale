import type { PersonaId } from '../stats.ts';

/**
 * An illustrated badge for each personality, in place of emoji: emoji look different
 * on every system and clash with the cards. Each is drawn on a 120×120 grid in its
 * personality's colours. Pages that include ART_CSS bring them to life (the owl
 * blinks, the sneaker runs); on cards and posters they stand still.
 *
 * `key` makes the gradient ids unique, so several badges can share one page.
 */
export function personaArt(id: PersonaId, key: string, place: { size?: number; x?: number; y?: number } = {}): string {
  const size = place.size ?? 120;
  const at = place.x === undefined ? '' : ` x="${round(place.x)}" y="${round(place.y ?? 0)}"`;
  return `<svg class="art"${at} width="${round(size)}" height="${round(size)}" viewBox="0 0 120 120" aria-hidden="true">${ART[id](`art-${key}`)}</svg>`;
}

const round = (n: number): number => Math.round(n * 10) / 10;

/** The disc every badge sits on: a radial glow, clipped so the scene stays inside, and a rim. */
function disc(u: string, centre: string, edge: string, rim: string, scene: string): string {
  return `<defs><radialGradient id="${u}-disc" cx=".5" cy=".3" r=".75"><stop offset="0" stop-color="${centre}"/><stop offset="1" stop-color="${edge}"/></radialGradient>
  <clipPath id="${u}-clip"><circle cx="60" cy="60" r="56"/></clipPath></defs>
  <circle cx="60" cy="60" r="58" fill="url(#${u}-disc)"/>
  <g clip-path="url(#${u}-clip)">${scene}</g>
  <circle cx="60" cy="60" r="56.5" fill="none" stroke="${rim}" stroke-opacity=".55" stroke-width="2.5"/>`;
}

const linear = (id: string, from: string, to: string, x2 = 0, y2 = 1): string =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;
const radial = (id: string, from: string, to: string): string =>
  `<radialGradient id="${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></radialGradient>`;
/** A four-point sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number, cls = 'a-twinkle'): string =>
  `<path class="${cls}" d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="#fff"/>`;

const ART: Record<PersonaId, (u: string) => string> = {
  // A purple owl on a branch under the moon. It blinks, bobs, flaps, and its eyes follow you.
  nightOwl: (u) =>
    disc(u, '#2a3b8f', '#0b1026', '#93c5fd', `<defs>
    <radialGradient id="${u}-m" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fde68a" stop-opacity=".55"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>
    ${linear(`${u}-b`, '#9b6cf7', '#5b21b6')}${radial(`${u}-i`, '#fde68a', '#f59e0b')}${linear(`${u}-f`, '#ede9fe', '#c4b5fd')}</defs>
    <circle class="a-halo" cx="91" cy="27" r="20" fill="url(#${u}-m)"/>
    <circle cx="91" cy="27" r="9" fill="#fef3c7"/><circle cx="95.5" cy="23.5" r="8" fill="#1b2a6b"/>
    <g class="a-stars"><circle cx="22" cy="36" r="1.6" fill="#fff"/><circle cx="31" cy="20" r="1.1" fill="#fff"/><circle cx="104" cy="52" r="1.3" fill="#fff"/><circle cx="17" cy="62" r="1" fill="#fff"/></g>
    <path d="M6 102 C30 96 70 98 116 92" stroke="#6b3f24" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M96 94 c6 -8 14 -8 16 -6 c-4 6 -10 8 -16 6z" fill="#22c55e"/>
    <g class="a-bob">
      <path d="M38 52 L33 31 L52 45 Z M82 52 L87 31 L68 45 Z" fill="#6d28d9"/>
      <path d="M34 95 C29 66 38 42 60 42 C82 42 91 66 86 95 C77 101 43 101 34 95 Z" fill="url(#${u}-b)"/>
      <path class="a-wing-l" d="M35 70 C26 80 28 93 39 97 C41 85 41 76 35 70 Z" fill="#4c1d95"/>
      <path class="a-wing-r" d="M85 70 C94 80 92 93 81 97 C79 85 79 76 85 70 Z" fill="#4c1d95"/>
      <ellipse cx="60" cy="86" rx="14" ry="10" fill="#a78bfa" opacity=".75"/>
      <path d="M52 82 l2.5 3 l2.5 -3 M58 82 l2.5 3 l2.5 -3 M64 82 l2.5 3 l2.5 -3 M55 88 l2.5 3 l2.5 -3 M61 88 l2.5 3 l2.5 -3" stroke="#6d28d9" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M60 53 C52 44 35 46 35 60 C35 73 48 77 60 72 C72 77 85 73 85 60 C85 46 68 44 60 53 Z" fill="url(#${u}-f)"/>
      <g class="a-blink"><circle cx="48" cy="61" r="10.5" fill="#fff"/><circle cx="72" cy="61" r="10.5" fill="#fff"/>
        <g class="a-pupils"><circle cx="48.5" cy="61.5" r="8" fill="url(#${u}-i)"/><circle cx="71.5" cy="61.5" r="8" fill="url(#${u}-i)"/>
        <circle cx="49" cy="62" r="4.3" fill="#1e1b4b"/><circle cx="71" cy="62" r="4.3" fill="#1e1b4b"/>
        <circle cx="51" cy="59.2" r="2" fill="#fff"/><circle cx="73" cy="59.2" r="2" fill="#fff"/><circle cx="46.8" cy="64.6" r=".9" fill="#fff"/><circle cx="68.8" cy="64.6" r=".9" fill="#fff"/></g></g>
      <path d="M55.5 69 h9 l-4.5 7.5 Z" fill="#f59e0b"/><path d="M56.5 69 h4 l-1.6 3 Z" fill="#fde68a"/>
    </g>
    <path d="M50 97 l-2 4 M53 98 l0 4 M70 97 l2 4 M67 98 l0 4" stroke="#f59e0b" stroke-width="2.4" stroke-linecap="round"/>`),

  // A round bird singing in front of the rising sun, whose rays turn slowly.
  earlyBird: (u) =>
    disc(u, '#c2410c', '#2a1206', '#fdba74', `<defs>${radial(`${u}-s`, '#fef3c7', '#f59e0b')}${linear(`${u}-b`, '#fbcfe8', '#ec4899')}</defs>
    <g class="a-rays" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" opacity=".85">
      ${Array.from({ length: 12 }, (_, i) => `<path d="M42 ${50 - 24} V${50 - 31}" transform="rotate(${i * 30} 42 50)"/>`).join('')}
    </g>
    <circle cx="42" cy="50" r="19" fill="url(#${u}-s)"/>
    <path d="M0 80 Q30 70 60 78 T120 76 V120 H0 Z" fill="#9a3412"/>
    <path d="M0 98 Q40 88 80 97 T120 95 V120 H0 Z" fill="#431407"/>
    <g class="a-hop">
      <path d="M64 99 v5 M72 99 v5" stroke="#f59e0b" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="68" cy="80" r="19" fill="url(#${u}-b)"/>
      <path d="M64 61 q1 -8 7 -7 q-4 2 -2 7 Z" fill="#db2777"/>
      <ellipse cx="71" cy="88" rx="11" ry="9" fill="#fde68a"/>
      <path class="a-wing" d="M53 78 C45 84 49 96 59 94 C61 88 59 82 53 78 Z" fill="#be185d"/>
      <circle cx="75" cy="74" r="3.2" fill="#1f0a0a"/><circle cx="76.2" cy="72.8" r="1.1" fill="#fff"/>
      <circle cx="67" cy="80" r="3" fill="#f472b6" opacity=".7"/>
      <path d="M85 75 l9 2.5 l-9 3 Z" fill="#f59e0b"/><path class="a-beak" d="M85 79 l7 1.5 l-7 1.8 Z" fill="#d97706"/>
    </g>
    <g class="a-note" fill="#fff"><ellipse cx="96" cy="54" rx="3.6" ry="2.8"/><path d="M99 54 V42 q5 1 5 6 q-2 -3 -5 -3" stroke="#fff" stroke-width="1.8" fill="none"/></g>`),

  // A shield with a lightning bolt in front of a sword; light glints along the blade.
  weekendWarrior: (u) =>
    disc(u, '#b91c1c', '#1f0a0a', '#fca5a5', `<defs>${linear(`${u}-blade`, '#f9fafb', '#9ca3af', 1, 1)}${linear(`${u}-sh`, '#f87171', '#991b1b')}
      <clipPath id="${u}-bc"><path d="M90 22 L98 20 L95 30 L46 80 L40 74 Z"/></clipPath></defs>
    ${sparkle(24, 40, 5)}${sparkle(98, 78, 4)}
    <g class="a-sway">
      <path d="M90 22 L98 20 L95 30 L46 80 L40 74 Z" fill="url(#${u}-blade)"/>
      <g clip-path="url(#${u}-bc)"><path class="a-gleam" d="M38 64 L56 82" stroke="#fff" stroke-width="7" opacity=".9"/></g>
      <path d="M34 68 L52 86" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/>
      <path d="M42 80 L30 92" stroke="#7c2d12" stroke-width="6" stroke-linecap="round"/>
      <circle cx="28" cy="94" r="4.5" fill="#f59e0b"/>
    </g>
    <g class="a-bob">
      <path d="M58 40 C70 47 80 47 88 44 C88 73 78 91 58 100 C38 91 28 73 28 44 C36 47 46 47 58 40 Z" fill="url(#${u}-sh)" stroke="#fca5a5" stroke-width="3" stroke-linejoin="round"/>
      <path d="M58 46 C68 52 76 52 82 50 C81 59 78 66 74 72" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".35"/>
      <path class="a-bolt" d="M63 52 L49 73 H58 L54 90 L70 66 H61 L66 52 Z" fill="#fde68a" stroke="#f59e0b" stroke-width="1.5" stroke-linejoin="round"/>
    </g>`),

  // A finish-line sneaker on the run: it bounces, the speed lines stream, dust kicks up.
  marathoner: (u) =>
    disc(u, '#1f7a43', '#052e16', '#86efac', `<defs>${linear(`${u}-s`, '#4ade80', '#15803d')}${linear(`${u}-o`, '#fff', '#d1d5db')}</defs>
    <path class="a-speed" d="M2 64 h22 M-2 74 h28 M4 84 h20" stroke="#86efac" stroke-width="4" stroke-linecap="round" opacity=".7"/>
    <ellipse class="a-shadow" cx="66" cy="96" rx="40" ry="5" fill="#000" opacity=".3"/>
    <g class="a-bounce">
      <path d="M28 76 C28 64 37 58 47 58 L62 54 C69 52 75 56 79 62 L98 70 C106 73 109 80 107 87 L30 87 C28 84 28 80 28 76 Z" fill="url(#${u}-s)"/>
      <path d="M46 76 C58 70 76 72 96 80" stroke="#bbf7d0" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M56 56 l6 9 M62 54.5 l6 9 M68 55 l5 8.5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <path d="M28 85 L108 85 C108 92 104 96 97 96 L36 96 C31 96 28 92 28 87 Z" fill="url(#${u}-o)"/>
      <path d="M40 91 h8 M54 91 h8 M68 91 h8 M82 91 h8" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
      <path d="M30 70 C28 64 31 59 36 58" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".55"/>
    </g>
    <circle class="a-puff" cx="22" cy="94" r="4" fill="#fff"/><circle class="a-puff a-late" cx="14" cy="90" r="3" fill="#fff"/>`),

  // A shiny ladybug under a sweeping magnifier.
  bugHunter: (u) =>
    disc(u, '#5a4f10', '#1c1a05', '#fde047', `<defs>
    <radialGradient id="${u}-s" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fde047"/><stop offset=".6" stop-color="#eab308"/><stop offset="1" stop-color="#a16207"/></radialGradient>
    ${linear(`${u}-r`, '#e5e7eb', '#6b7280', 1, 1)}${linear(`${u}-h`, '#b45309', '#78350f', 1, 1)}</defs>
    <ellipse cx="54" cy="98" rx="30" ry="5" fill="#000" opacity=".3"/>
    <g stroke="#1f1a05" stroke-width="4" stroke-linecap="round"><path class="a-leg" d="M40 66 l-13 -7 M41 88 l-12 8 M69 77 h15"/><path class="a-leg a-late" d="M39 77 h-15 M68 66 l13 -7 M67 88 l12 8"/></g>
    <g class="a-antenna"><path d="M48 47 q-5 -10 -13 -12 M60 47 q5 -10 13 -12" fill="none" stroke="#1f1a05" stroke-width="3" stroke-linecap="round"/>
      <circle cx="35" cy="35" r="2.6" fill="#1f1a05"/><circle cx="73" cy="35" r="2.6" fill="#1f1a05"/></g>
    <ellipse cx="54" cy="52" rx="11" ry="9" fill="#1f1a05"/>
    <circle cx="50" cy="50" r="2" fill="#fff"/><circle cx="58" cy="50" r="2" fill="#fff"/>
    <ellipse cx="54" cy="76" rx="20" ry="24" fill="url(#${u}-s)"/>
    <path d="M54 53 v47" stroke="#1f1a05" stroke-width="2.5"/>
    <circle cx="45" cy="70" r="4" fill="#1f1a05"/><circle cx="63" cy="70" r="4" fill="#1f1a05"/><circle cx="46" cy="85" r="3.3" fill="#1f1a05"/><circle cx="62" cy="85" r="3.3" fill="#1f1a05"/>
    <path d="M40 66 C42 58 48 55 52 55" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".6"/>
    <g class="a-sweep">
      <path d="M84 84 L102 104" stroke="url(#${u}-h)" stroke-width="9" stroke-linecap="round"/>
      <circle cx="74" cy="70" r="19" fill="#bae6fd" fill-opacity=".22"/>
      <circle cx="74" cy="70" r="19" fill="none" stroke="url(#${u}-r)" stroke-width="5"/>
      <path d="M63 62 a13 13 0 0 1 11 -6" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>
    </g>`),

  // A broom sweeping up sparkles, with soap bubbles drifting off.
  cleaner: (u) =>
    disc(u, '#0e7490', '#042f2e', '#67e8f9', `<defs>${linear(`${u}-h`, '#d97706', '#78350f')}${linear(`${u}-br`, '#fde68a', '#eab308')}</defs>
    <path d="M14 100 H106" stroke="#67e8f9" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>
    ${sparkle(30, 84, 7)}${sparkle(42, 70, 4.5, 'a-twinkle a-late')}${sparkle(22, 66, 3.5)}
    <g class="a-broom">
      <path d="M84 14 L58 76" stroke="url(#${u}-h)" stroke-width="6" stroke-linecap="round"/>
      <path d="M48 72 L66 79 L63 86 L45 79 Z" fill="#0891b2"/>
      <path d="M45 79 L63 86 L62 102 L30 96 Z" fill="url(#${u}-br)"/>
      <path d="M50 83 L44 98 M55 85 L51 100 M59 86 L57 101" stroke="#ca8a04" stroke-width="1.8" stroke-linecap="round"/>
    </g>
    <g class="a-bubble" fill="#a5f3fc" fill-opacity=".18" stroke="#a5f3fc" stroke-width="1.8">
      <circle cx="90" cy="62" r="7"/><circle cx="101" cy="78" r="4"/><circle cx="84" cy="44" r="4.5"/>
    </g>
    <path d="M86 59 a4 4 0 0 1 3 -2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none"/>`),

  // A globe ringed by speech bubbles in code.
  polyglot: (u) =>
    disc(u, '#3b1a6b', '#0f172a', '#5eead4', `<defs>${radial(`${u}-g`, '#5eead4', '#0f766e')}<clipPath id="${u}-gc"><circle cx="60" cy="64" r="27"/></clipPath></defs>
    <circle cx="60" cy="64" r="27" fill="url(#${u}-g)"/>
    <g clip-path="url(#${u}-gc)" fill="none" stroke="#ccfbf1" stroke-opacity=".55" stroke-width="1.8">
      <g class="a-turn"><ellipse cx="60" cy="64" rx="20" ry="27"/><ellipse cx="60" cy="64" rx="9" ry="27"/></g>
      <path d="M33 54 H87 M33 64 H87 M33 74 H87"/>
      <path d="M40 50 q8 -6 14 0 q4 6 -2 10 q-6 2 -4 8 q-6 0 -8 -6 Z M66 70 q8 -2 12 4 q-2 8 -10 8 q-4 -6 -2 -12 Z" fill="#14b8a6" stroke="none" opacity=".9"/>
    </g>
    <ellipse cx="50" cy="52" rx="9" ry="5" fill="#fff" opacity=".3"/>
    <g class="a-float"><rect x="10" y="22" width="34" height="22" rx="8" fill="#a855f7"/><path d="M20 44 l-2 7 l8 -7 Z" fill="#a855f7"/>
      <path d="M22 28 l-5 5 l5 5 M32 28 l5 5 l-5 5 M29 27 l-4 12" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g class="a-float a-late"><rect x="76" y="14" width="30" height="22" rx="8" fill="#f0abfc"/><path d="M96 36 l3 7 l-8 -7 Z" fill="#f0abfc"/>
      <path d="M87 19 q-3 0 -3 3 v2 q0 2 -2 2 q2 0 2 2 v2 q0 3 3 3 M95 19 q3 0 3 3 v2 q0 2 2 2 q-2 0 -2 2 v2 q0 3 -3 3" stroke="#701a75" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
    <g class="a-float"><rect x="84" y="84" width="26" height="20" rx="7" fill="#14b8a6"/><path d="M90 84 l-3 -6 l8 6 Z" fill="#14b8a6"/>
      <path d="M93 89 l-2 10 M99 89 l-2 10 M89 92 h12 M88 96 h12" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>`),

  // A wall clock whose hands keep going, and a coffee that keeps steaming.
  nineToFive: (u) =>
    disc(u, '#1e4976', '#0f172a', '#7dd3fc', `<defs>${linear(`${u}-m`, '#38bdf8', '#0369a1')}${radial(`${u}-c`, '#ffffff', '#e2e8f0')}</defs>
    <circle cx="68" cy="50" r="30" fill="url(#${u}-c)" stroke="#7dd3fc" stroke-width="4"/>
    <path d="M68 50 L68 22 A28 28 0 1 1 40 50 Z" fill="#bae6fd" opacity=".55"/>
    <g stroke="#334155" stroke-width="2.4" stroke-linecap="round">
      ${Array.from({ length: 12 }, (_, i) => `<path d="M68 ${i % 3 === 0 ? 25 : 26.5} V${i % 3 === 0 ? 31 : 29.5}" transform="rotate(${i * 30} 68 50)"/>`).join('')}
    </g>
    <rect class="a-hour" x="66.5" y="36" width="3" height="14" rx="1.5" fill="#0f172a"/>
    <rect class="a-minute" x="67" y="27" width="2" height="23" rx="1" fill="#0ea5e9"/>
    <circle cx="68" cy="50" r="3" fill="#0f172a"/>
    <g class="a-steam" fill="none" stroke="#e2e8f0" stroke-width="2.6" stroke-linecap="round">
      <path d="M30 70 q-4 -5 0 -10 q4 -5 0 -10"/><path class="a-late" d="M39 70 q-4 -5 0 -10 q4 -5 0 -10"/>
    </g>
    <path d="M48 82 h6 a7 7 0 0 1 0 14 h-6" stroke="#0284c7" stroke-width="4" fill="none"/>
    <path d="M20 76 h32 v18 a8 8 0 0 1 -8 8 h-16 a8 8 0 0 1 -8 -8 Z" fill="url(#${u}-m)"/>
    <path d="M24 80 v12" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".45"/>
    <ellipse cx="36" cy="76" rx="16" ry="3" fill="#7c2d12"/>`),

  // Building blocks, with the next one lowered into place on a crane hook.
  builder: (u) => {
    const brick = (x: number, y: number, w: number, from: string, to: string, id: string): string =>
      `${linear(id, from, to)}<rect x="${x}" y="${y}" width="${w}" height="16" rx="3" fill="url(#${id})"/>
      <rect x="${x + 5}" y="${y - 5}" width="7" height="6" rx="1.5" fill="${from}"/><rect x="${x + w - 12}" y="${y - 5}" width="7" height="6" rx="1.5" fill="${from}"/>
      <rect x="${x}" y="${y + 12}" width="${w}" height="4" rx="2" fill="#000" opacity=".18"/>`;
    return disc(u, '#5b21b6', '#1a1033', '#c4b5fd', `
    <path d="M14 101 H106" stroke="#c4b5fd" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>
    ${brick(26, 85, 32, '#a78bfa', '#7c3aed', `${u}-a`)}${brick(62, 85, 32, '#f472b6', '#db2777', `${u}-b`)}
    ${brick(44, 64, 32, '#fbbf24', '#d97706', `${u}-c`)}
    <g class="a-drop">
      <path d="M60 -4 V34" stroke="#e5e7eb" stroke-width="2"/>
      <path d="M60 34 v4 a4 4 0 1 1 -4 4" stroke="#e5e7eb" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      ${brick(44, 48, 32, '#5eead4', '#0d9488', `${u}-d`)}
    </g>
    ${sparkle(32, 56, 5)}${sparkle(90, 62, 4, 'a-twinkle a-late')}`);
  },
};

/** The motion. Scoped to `.art`; anyone who prefers reduced motion gets the still pictures. */
export const ART_CSS = `
.art *{transform-box:fill-box}
.art .a-late{animation-delay:.6s!important}
.art .a-halo{transform-origin:center;animation:a-halo 3s ease-in-out infinite}
@keyframes a-halo{50%{transform:scale(1.25);opacity:.6}}
.art .a-stars circle,.art .a-twinkle{transform-origin:center;animation:a-twinkle 2.4s ease-in-out infinite}
.art .a-stars circle:nth-child(2){animation-delay:.8s}.art .a-stars circle:nth-child(3){animation-delay:1.5s}.art .a-stars circle:nth-child(4){animation-delay:.3s}
@keyframes a-twinkle{50%{opacity:.2;transform:scale(.6)}}
.art .a-bob{animation:a-bob 3.2s ease-in-out infinite}
@keyframes a-bob{50%{transform:translateY(-2.5px)}}
.art .a-wing-l{transform-origin:100% 0;animation:a-flap-l 3.2s ease-in-out infinite}
.art .a-wing-r{transform-origin:0 0;animation:a-flap-r 3.2s ease-in-out infinite}
@keyframes a-flap-l{0%,70%,100%{transform:none}78%{transform:rotate(18deg)}86%{transform:rotate(-4deg)}}
@keyframes a-flap-r{0%,70%,100%{transform:none}78%{transform:rotate(-18deg)}86%{transform:rotate(4deg)}}
.art .a-blink{transform-origin:center;animation:a-blink 4.5s infinite}
@keyframes a-blink{0%,92%,100%{transform:none}95%{transform:scaleY(.08)}}
.art .a-pupils{transition:transform .25s ease-out}
.art .a-rays{transform-origin:center;animation:a-spin 14s linear infinite}
@keyframes a-spin{to{transform:rotate(360deg)}}
.art .a-hop{animation:a-hop 2.2s cubic-bezier(.3,0,.3,1) infinite}
@keyframes a-hop{0%,40%,100%{transform:none}52%{transform:translateY(-6px)}64%{transform:none}72%{transform:translateY(-3px)}82%{transform:none}}
.art .a-wing{transform-origin:20% 10%;animation:a-flutter 2.2s ease-in-out infinite}
@keyframes a-flutter{0%,40%,100%{transform:none}50%,70%{transform:rotate(-14deg)}60%{transform:rotate(4deg)}}
.art .a-beak{transform-origin:0 0;animation:a-beak 2.2s infinite}
@keyframes a-beak{0%,48%,62%,100%{transform:none}52%,58%{transform:rotate(16deg)}}
.art .a-note{animation:a-note 2.2s ease-out infinite}
@keyframes a-note{0%,45%{opacity:0;transform:translate(-6px,6px)}60%{opacity:1}100%{opacity:0;transform:translate(4px,-12px)}}
.art .a-sway{transform-origin:20% 90%;animation:a-sway 3s ease-in-out infinite}
@keyframes a-sway{50%{transform:rotate(-4deg)}}
.art .a-gleam{animation:a-gleam 2.6s ease-in-out infinite}
@keyframes a-gleam{0%,55%{transform:translate(0,0);opacity:0}60%{opacity:.9}90%,100%{transform:translate(52px,-52px);opacity:0}}
.art .a-bolt{transform-origin:center;animation:a-bolt 2.6s ease-in-out infinite}
@keyframes a-bolt{0%,100%{transform:none}50%{transform:scale(1.1)}}
.art .a-speed{stroke-dasharray:10 8;animation:a-stream .5s linear infinite}
@keyframes a-stream{to{stroke-dashoffset:18}}
.art .a-bounce{transform-origin:50% 100%;animation:a-bounce .9s cubic-bezier(.3,0,.3,1) infinite}
@keyframes a-bounce{0%,100%{transform:translateY(0) scale(1.03,.97)}45%{transform:translateY(-9px) rotate(-4deg) scale(.98,1.02)}}
.art .a-shadow{transform-origin:center;animation:a-shadow .9s cubic-bezier(.3,0,.3,1) infinite}
@keyframes a-shadow{45%{transform:scaleX(.8);opacity:.18}}
.art .a-puff{opacity:0;animation:a-puff .9s ease-out infinite}
@keyframes a-puff{0%{opacity:.35;transform:scale(.6)}100%{opacity:0;transform:translate(-10px,-6px) scale(1.4)}}
.art .a-leg{animation:a-scuttle .5s ease-in-out infinite alternate}
.art .a-leg.a-late{animation-delay:-.5s!important}
@keyframes a-scuttle{to{transform:translateY(-2.5px)}}
.art .a-antenna{transform-origin:50% 100%;animation:a-antenna 1.8s ease-in-out infinite}
@keyframes a-antenna{25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}
.art .a-sweep{animation:a-sweep 4s ease-in-out infinite}
@keyframes a-sweep{0%,100%{transform:none}30%{transform:translate(-22px,-4px)}60%{transform:translate(-14px,14px)}}
.art .a-broom{transform-origin:84% 0;animation:a-broom 1.6s ease-in-out infinite}
@keyframes a-broom{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(10deg)}}
.art .a-bubble circle{animation:a-rise 3s ease-in infinite}
.art .a-bubble circle:nth-child(2){animation-delay:1s}.art .a-bubble circle:nth-child(3){animation-delay:2s}
@keyframes a-rise{0%{opacity:0;transform:translateY(10px)}20%{opacity:1}100%{opacity:0;transform:translateY(-22px)}}
.art .a-turn{transform-origin:center;animation:a-turn 3s ease-in-out infinite alternate}
@keyframes a-turn{to{transform:scaleX(.35)}}
.art .a-float{animation:a-bob 2.6s ease-in-out infinite}
.art .a-hour{transform-origin:50% 100%;animation:a-spin 24s linear infinite}
.art .a-minute{transform-origin:50% 100%;animation:a-spin 4s linear infinite}
.art .a-steam path{animation:a-steam 2.4s ease-in-out infinite}
@keyframes a-steam{0%{opacity:0;transform:translateY(6px)}40%{opacity:.9}100%{opacity:0;transform:translateY(-10px)}}
.art .a-drop{animation:a-drop 3.4s cubic-bezier(.5,0,.3,1) infinite}
@keyframes a-drop{0%{transform:translateY(-40px)}45%,80%{transform:none}100%{transform:translateY(-40px)}}
@media (prefers-reduced-motion:reduce){.art *{animation:none!important}}
`;
