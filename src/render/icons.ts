import type { FunFact, Holiday } from '../stats.ts';

/**
 * Small flat pictograms for the fun facts and moments, drawn like the badges: solid shapes on a
 * rounded tile, no outlines or gradients. They take the page's colours (the tile and
 * cut-outs `k` in the accent, `p` the page colour, `q` the palette colour that stands
 * out most on the tile), so they read on any backdrop.
 */
export type FunIcon = Exclude<FunFact['id'], 'holiday' | 'emoji'> | Holiday;
export type MomentIcon = 'first' | 'latest' | 'biggest' | 'last';

const rays = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const [x1, y1, x2, y2] = [7, 7, 19, 19].map((r, j) => +(24 + r * (j % 2 ? Math.sin(a) : Math.cos(a))).toFixed(1));
  return `<path class="${i % 2 ? 'lq' : 'ln'}" d="M${x1} ${y1}L${x2} ${y2}"/>`;
}).join('');

const tree = '<path class="q" d="M24 4 12 20h7L9 34h30L29 20h7z"/><rect class="p" x="21" y="34" width="6" height="9"/>';

// An eight-point burst, for the biggest commit.
const burst = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8 - Math.PI / 2;
  const r = i % 2 ? 9 : 19;
  return `${+(24 + r * Math.cos(a)).toFixed(1)} ${+(24 + r * Math.sin(a)).toFixed(1)}`;
}).join(' ');

const ICONS: Record<FunIcon | MomentIcon, string> = {
  // The sun coming up over the horizon.
  first: '<path class="q" d="M8 32a16 16 0 0 1 32 0z"/><rect class="p" x="4" y="35" width="40" height="4" rx="2"/><rect class="p" x="12" y="41" width="24" height="3" rx="1.5"/>',
  // A crescent moon: a disc with a disc cut out of it.
  latest: '<circle class="q" cx="22" cy="25" r="16"/><circle class="k" cx="31" cy="18" r="13"/><circle class="p" cx="37" cy="36" r="2.5"/>',
  biggest: `<polygon class="q" points="${burst}"/><circle class="p" cx="24" cy="24" r="5"/>`,
  // A chequered flag.
  last: '<rect class="p" x="9" y="5" width="4" height="39" rx="2"/><rect class="p" x="13" y="7" width="26" height="20"/><path class="q" d="M13 7h6.5v5H13zM26 7h6.5v5H26zM19.5 12H26v5h-6.5zM32.5 12H39v5h-6.5zM13 17h6.5v5H13zM26 17h6.5v5H26zM19.5 22H26v5h-6.5zM32.5 22H39v5h-6.5z"/>',
  // A mug of beer, for Friday nights.
  fridayNight:
    '<rect class="p" x="9" y="16" width="22" height="26" rx="3"/><path class="ln" d="M31 22h4a5 5 0 0 1 0 10h-4"/><circle class="q" cx="13" cy="15" r="5"/><circle class="q" cx="20" cy="12" r="6"/><circle class="q" cx="27" cy="15" r="5"/>',
  reverts: '<path class="p" d="M24 10 6 24l18 14z"/><path class="q" d="M42 10 24 24l18 14z"/>',
  typos:
    '<g transform="rotate(45 24 24)"><rect class="p" x="18" y="10" width="12" height="24"/><rect class="q" x="18" y="3" width="12" height="6" rx="1"/><path class="q" d="M18 35h12l-6 10z"/></g>',
  wip: '<rect class="p" x="9" y="28" width="4" height="14"/><rect class="p" x="35" y="28" width="4" height="14"/><rect class="p" x="4" y="14" width="40" height="14" rx="2"/><path class="q" d="M13 14h6l-7 14H6zM25 14h6l-7 14h-6zM37 14h6l-7 14h-6z"/>',
  tiny: '<circle class="ln" cx="24" cy="24" r="17"/><circle class="q" cx="24" cy="24" r="4"/>',
  fixStreak:
    '<path class="ln" d="M12 22a12 12 0 0 1 21-8"/><path class="p" d="M38 7v13H25z"/><path class="lq" d="M36 26a12 12 0 0 1-21 8"/><path class="q" d="M10 41V28h13z"/>',
  // A stopwatch, a quarter gone.
  session:
    '<rect class="p" x="20" y="3" width="8" height="5" rx="1"/><circle class="p" cx="24" cy="27" r="16"/><path class="q" d="M24 27V15a12 12 0 0 1 12 12z"/>',
  newYear: `${rays}<circle class="q" cx="24" cy="24" r="3"/>`,
  valentine:
    '<g class="q"><circle cx="18.4" cy="20.4" r="8"/><circle cx="29.6" cy="20.4" r="8"/><path d="M24 14.7 35.3 26 24 37.3 12.7 26z"/></g>',
  aprilFools:
    '<g transform="rotate(-10 24 24)"><rect class="p" x="12" y="6" width="24" height="36" rx="4"/><path class="q" d="m24 14 6 10-6 10-6-10z"/></g>',
  halloween:
    '<rect class="p" x="22" y="8" width="5" height="8" rx="1"/><ellipse class="q" cx="24" cy="28" rx="19" ry="14"/><path class="k" d="M13 27h8l-4-6zM27 27h8l-4-6zM15 32h18l-3 4H18z"/>',
  christmasEve: tree,
  christmas: tree,
  // Raised glass.
  newYearsEve:
    '<path class="q" d="M14 6h20l-3 14a7 7 0 0 1-14 0z"/><rect class="p" x="22.5" y="26" width="3" height="12"/><rect class="p" x="15" y="38" width="18" height="4" rx="2"/>',
};

export const icon = (id: FunIcon | MomentIcon): string =>
  `<svg class="ico" viewBox="0 0 48 48" aria-hidden="true"><rect class="k" width="48" height="48" rx="12"/><g transform="translate(8 8) scale(.667)">${ICONS[id]}</g></svg>`;

export const ICON_CSS = `
.ico .p{fill:var(--bg)}.ico .q{fill:var(--pop)}.ico .k{fill:var(--accent)}
.ico .ln,.ico .lq{fill:none;stroke:var(--bg);stroke-width:4;stroke-linecap:round}.ico .lq{stroke:var(--pop)}
`;
