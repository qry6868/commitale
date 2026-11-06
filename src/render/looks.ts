import type { PersonaId } from '../stats.ts';
import { HEADLINE_FAMILY } from './font.ts';
import { CREAM, INK } from './palette.ts';

/**
 * Each personality's report has its own look on top of the shared layout: the same pages
 * and colours, drawn in a different hand. **Geometric** is flat print shapes; **pop** is a
 * comic book, with ink outlines, hard shadows, halftone dots and pages that slash in like
 * panels; **painterly** is paint on canvas, with brushed edges and pages that bleed open
 * like wet paint; **minimal** is paper and one ink, light type and hairlines, with pages
 * that cross-fade; **riso** is fluorescent ink on paper stock, slightly off register, with
 * pages that feed in like paper. Heavy filters are left out on phones, so pages stay
 * smooth there.
 */
export type Look = 'geometric' | 'pop' | 'painterly' | 'minimal' | 'riso';

export const LOOKS: Record<PersonaId, Look> = {
  nightOwl: 'riso',
  earlyBird: 'minimal',
  weekendWarrior: 'pop',
  marathoner: 'geometric',
  bugHunter: 'pop',
  cleaner: 'geometric',
  polyglot: 'riso',
  nineToFive: 'minimal',
  builder: 'painterly',
};

const svgUrl = (svg: string): string => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const r1 = (n: number): number => Math.round(n * 10) / 10;

// Halftone: dots that shrink away from the top-left corner.
const dots = (() => {
  let out = '';
  for (let y = 3; y < 100; y += 6) {
    for (let x = 3 + ((y / 6) % 2) * 3; x < 100; x += 6) {
      const r = 2.9 * (1 - Math.hypot(x, y) / 120);
      if (r > 0.35) out += `<circle cx="${x}" cy="${r1(y)}" r="${r1(r)}"/>`;
    }
  }
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${out}</svg>`);
})();

// A comic starburst behind the reveal, as clip-path points.
const star = Array.from({ length: 28 }, (_, i) => {
  const a = (i * Math.PI) / 14;
  const r = i % 2 ? 31 : 50 - (i % 4) * 3;
  return `${r1(50 + r * Math.cos(a))}% ${r1(50 + r * Math.sin(a))}%`;
}).join(',');

// A blot of paint with uneven edges and a few splashes, for the page turn. A plain path, so
// the browser scales it cheaply every frame.
const blot = (() => {
  const n = 64;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 38 + 4 * Math.sin(3 * a + 1) + 2.6 * Math.sin(7 * a + 2) + 1.6 * Math.sin(13 * a + 0.5);
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  });
  const mid = (p: number[], q: number[]): string => `${r1((p[0] + q[0]) / 2)} ${r1((p[1] + q[1]) / 2)}`;
  let d = `M${mid(pts[n - 1], pts[0])}`;
  for (let i = 0; i < n; i++) d += `Q${r1(pts[i][0])} ${r1(pts[i][1])} ${mid(pts[i], pts[(i + 1) % n])}`;
  const drops = [[88, 30, 3], [14, 76, 2.4], [80, 86, 2], [22, 14, 1.6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${d}Z"/>${drops}</svg>`);
})();

// Canvas: fine threads one way and the other.
const canvas = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="a"><feTurbulence type="fractalNoise" baseFrequency=".9 .035" numOctaves="2" seed="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><filter id="b"><feTurbulence type="fractalNoise" baseFrequency=".035 .9" numOctaves="2" seed="5" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#a)"/><rect width="100%" height="100%" filter="url(#b)" opacity=".55"/></svg>`,
);

// Riso: specks where the drum laid a little too much ink.
const speckle = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="s"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="11" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -20 0 0 0 6.6"/></filter><rect width="100%" height="100%" filter="url(#s)"/></svg>`,
);

/** Filters the painterly look draws with; placed once in the page. */
export const lookDefs = (look: Look): string =>
  look !== 'painterly'
    ? ''
    : `<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false">
<filter id="lk-paint" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".003 .09" numOctaves="3" seed="4"/><feColorMatrix type="saturate" values="0" result="streaks"/><feBlend in="streaks" in2="SourceGraphic" mode="overlay" result="streaked"/><feComposite in="streaked" in2="SourceGraphic" operator="arithmetic" k2=".55" k3=".45" result="brushed"/><feComposite in="brushed" in2="SourceGraphic" operator="in" result="paint"/><feTurbulence type="turbulence" baseFrequency=".009" numOctaves="2" seed="9" result="wobble"/><feDisplacementMap in="paint" in2="wobble" scale="46" xChannelSelector="R" yChannelSelector="G" result="laid"/><feTurbulence type="fractalNoise" baseFrequency=".14" numOctaves="1" seed="2" result="bristles"/><feDisplacementMap in="laid" in2="bristles" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="lk-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="lk-edge" x="-10%" y="-30%" width="120%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="6"/><feDisplacementMap in="SourceGraphic" scale="4" xChannelSelector="R" yChannelSelector="G"/></filter>
</svg>`;

const CARDS = ':is(.viz,.quirk,.moment,.ai-style,.repos li)';

export const LOOK_CSS = `
.scene .dots{display:none}
/* Pop: a comic book. */
.look-pop .slide{--k:${INK};--ks:${INK}}
.look-pop .slide.data{--k:${CREAM};--ks:var(--accent)}
.look-pop .scene .s{filter:drop-shadow(calc(1.3 * var(--u)) calc(1.3 * var(--u)) 0 var(--k))}
.look-pop .scene .s:not(.tri):not(.ring) b{box-shadow:inset 0 0 0 max(4px,calc(.7 * var(--u))) var(--k)}
.look-pop .scene .dots{display:block;position:absolute;left:0;top:0;width:calc(56 * var(--u));height:calc(56 * var(--u));background:var(--s2);opacity:0;
  -webkit-mask:${dots} no-repeat 0 0/100% 100%;mask:${dots} no-repeat 0 0/100% 100%;transition:opacity .6s ease .2s}
.look-pop .in .scene .dots{opacity:.9}
.look-pop ${CARDS}{border:3px solid var(--k);border-radius:8px;box-shadow:6px 6px 0 var(--ks)}
.look-pop .chip{border:2px solid var(--k)}
.look-pop .kicker{align-self:flex-start;padding:6px 12px;background:var(--accent);color:var(--bg);border:3px solid var(--k);box-shadow:4px 4px 0 var(--k);rotate:-1.5deg}
.look-pop :is(h1,h2,.big,.quirk-big,.ai-name){font-family:'${HEADLINE_FAMILY}',var(--display);font-weight:400;letter-spacing:.01em;text-transform:uppercase;text-shadow:.05em .05em 0 var(--s1)}
.look-pop .big{line-height:1}
.look-pop :is(.face,.ai-emoji) .art{filter:drop-shadow(6px 6px 0 var(--k))}
.look-pop .burst{inset:-30%;border:0;border-radius:0;box-shadow:none;background:var(--s1);clip-path:polygon(${star})}
.look-pop .slide.active:not(.settled):not(.first){animation:open-pop .62s cubic-bezier(.8,0,.15,1) both}
.look-pop .slide.active.back:not(.settled):not(.first){animation-name:open-pop-back}
@keyframes open-pop{from{clip-path:polygon(130% 0,130% 0,130% 100%,160% 100%)}to{clip-path:polygon(-30% 0,130% 0,130% 100%,0 100%)}}
@keyframes open-pop-back{from{clip-path:polygon(-30% 0,-30% 0,-60% 100%,-30% 100%)}to{clip-path:polygon(-30% 0,130% 0,100% 100%,-30% 100%)}}
.look-pop .slide.leaving .inner{transform:translateX(-6%) rotate(-1.5deg);opacity:.3;transition-duration:.62s}
/* Painterly: paint on canvas. */
.look-painterly .grain{opacity:.5;mix-blend-mode:multiply;background:${canvas}}
.look-painterly .scene{filter:url(#lk-paint)}
.look-painterly .scene .s b{animation:none;
  box-shadow:inset calc(-2.4 * var(--u)) calc(-3 * var(--u)) 0 color-mix(in srgb,var(--c) 74%,#000),inset calc(1.8 * var(--u)) calc(1.6 * var(--u)) 0 color-mix(in srgb,var(--c) 78%,#fff)}
/* Rings are brushed in one sweep, thick on one side and dry on the other. */
.look-painterly .scene .ring b{box-shadow:none;border-width:calc(6 * var(--u)) calc(2.4 * var(--u)) calc(4.4 * var(--u)) calc(.8 * var(--u))}
.look-painterly .scene .tri b{box-shadow:none}
/* Headlines in an italic book face, the system's own: Palatino, Georgia and the like. */
.look-painterly :is(h1,h2,.big,.quirk-big,.ai-name,.fact,.when){font-family:'Palatino Linotype',Palatino,'Book Antiqua','Iowan Old Style',Georgia,'Songti SC',SimSun,serif;font-style:italic;font-weight:700;letter-spacing:-.01em}
.look-painterly .big{letter-spacing:-.03em}
.look-painterly .persona-name{font-weight:700}
/* Charts are brushed too. */
.look-painterly :is(.hours,.heat,.ratio,.stack){filter:url(#lk-edge)}
.look-painterly :is(.col i,.row b i,.share i){filter:url(#lk-edge)}
.look-painterly .row b,.look-painterly .share{overflow:visible}
.look-painterly ${CARDS}{position:relative;isolation:isolate;background:none;border:0}
.look-painterly ${CARDS}::before{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;background:var(--glass);filter:url(#lk-rough)}
.look-painterly .kicker{align-self:flex-start;position:relative;isolation:isolate;padding:3px 10px;color:var(--bg)}
.look-painterly .kicker::before{content:'';position:absolute;inset:-3px -6px;z-index:-1;border-radius:4px;rotate:-1.2deg;background:var(--accent);filter:url(#lk-rough)}
.look-painterly :is(.face,.ai-emoji) .art{filter:url(#lk-rough)}
.look-painterly .slide.active:not(.settled):not(.first){clip-path:none;animation:open-paint 1.15s cubic-bezier(.45,0,.2,1) both;
  -webkit-mask:${blot} no-repeat;mask:${blot} no-repeat}
@keyframes open-paint{
  from{-webkit-mask-size:0 0;mask-size:0 0;-webkit-mask-position:var(--ox,50%) var(--oy,50%);mask-position:var(--ox,50%) var(--oy,50%)}
  to{-webkit-mask-size:330vmax 330vmax;mask-size:330vmax 330vmax;-webkit-mask-position:calc(var(--ox,50vw) - 165vmax) calc(var(--oy,50vh) - 165vmax);mask-position:calc(var(--ox,50vw) - 165vmax) calc(var(--oy,50vh) - 165vmax)}}
.look-painterly .slide.leaving .inner{transform:scale(.97);opacity:.25;transition-duration:1.1s}
/* Minimal: paper, one ink and a lot of room. */
.look-minimal .grain{opacity:.08}
.look-minimal :is(h1,h2,.big,.quirk-big,.ai-name,.fact,.when){font-family:inherit;font-weight:300;letter-spacing:-.035em}
.look-minimal .big{font-weight:200;letter-spacing:-.05em}
.look-minimal .kicker{display:flex;align-items:center;gap:14px;color:var(--s1);font-size:13px;font-weight:600;letter-spacing:.24em}
.look-minimal .kicker::before{content:'';width:32px;height:1px;background:currentColor}
.look-minimal ${CARDS}{padding-left:0;padding-right:0;background:none;border:0;border-top:1px solid var(--line);border-radius:0}
.look-minimal .chip{background:none;border:1px solid var(--line)}
.look-minimal .slide .delta{background:none;color:var(--s1);border:1px solid currentColor}
.look-minimal .row b{height:4px}.look-minimal .rows.wide .row b{height:6px}
.look-minimal .heat i{border-radius:50%}
.look-minimal :is(.hours i,.col i,.stack i,.ratio i){border-radius:0}
.look-minimal .burst{border-width:1px;box-shadow:none}.look-minimal .sparks{display:none}
.look-minimal .slide:not(.in) .reveal{transform:translateY(10px)}
.look-minimal .slide:not(.data){--hi:var(--s1)}
/* Pages cross-fade, unhurried. */
.look-minimal .slide.active:not(.settled):not(.first){clip-path:none;animation:open-fade .9s cubic-bezier(.3,0,.2,1) both}
@keyframes open-fade{from{opacity:0}}
.look-minimal .slide.leaving .inner{transform:translateY(-10px);opacity:0;transition-duration:.5s}
/* Riso: fluorescent inks on paper stock, a little off register. */
.look-riso .grain{opacity:.22;mix-blend-mode:multiply;background:${speckle}}
.look-riso .slide:not(.data) .scene .s{mix-blend-mode:multiply}
.look-riso .scene .s{filter:drop-shadow(calc(1.1 * var(--u)) calc(-.7 * var(--u)) 0 color-mix(in srgb,var(--c2) 80%,transparent))}
.look-riso :is(h1,h2,.big,.quirk-big,.ai-name){text-shadow:.035em -.025em 0 color-mix(in srgb,var(--s1) 75%,transparent)}
.look-riso .kicker{align-self:flex-start;padding:0 4px;color:var(--ink);box-shadow:inset 0 -.55em 0 color-mix(in srgb,var(--s1) 55%,transparent)}
.look-riso ${CARDS}{background:color-mix(in srgb,var(--s1) 16%,var(--bg));border:0;border-radius:3px}
.look-riso .slide.data ${CARDS}{background:var(--glass)}
.look-riso :is(.face,.ai-emoji) .art{filter:drop-shadow(5px -3px 0 color-mix(in srgb,var(--s1) 70%,transparent))}
/* Pages feed in like paper through the drum, and settle with a jog of the registration. */
.look-riso .slide.active:not(.settled):not(.first){clip-path:none;animation:open-feed .75s cubic-bezier(.7,0,.2,1) both}
.look-riso .slide.active.back:not(.settled):not(.first){animation-name:open-feed-back}
@keyframes open-feed{0%{transform:translateY(-102%)}80%{transform:translateY(0)}88%{transform:translateX(-.5%)}95%{transform:translateX(.25%)}100%{transform:none}}
@keyframes open-feed-back{0%{transform:translateY(102%)}80%{transform:translateY(0)}88%{transform:translateX(.5%)}95%{transform:translateX(-.25%)}100%{transform:none}}
.look-riso .slide.leaving .inner{transform:translateY(3%);opacity:.35;transition-duration:.7s}
/* Small phones: thinner comic lines, so every page still fits one screen. */
@media (max-width:560px) and (max-height:760px){.look-pop ${CARDS}{border-width:2px;box-shadow:4px 4px 0 var(--ks)}.look-pop .kicker{padding:1px 6px;border-width:2px;box-shadow:3px 3px 0 var(--k)}.look-pop .chip{border:0}
  .look-painterly .kicker{padding:1px 6px}.look-pop .kicker,.look-painterly .kicker,.look-riso .kicker{margin-bottom:4px}
  .look-minimal .kicker{gap:10px;letter-spacing:.16em;margin-bottom:6px}.look-minimal .kicker::before{width:18px}.look-minimal .chip{border:0;padding-left:0}}
/* Phones get the looks without the costly filters. */
@media (max-width:760px),(pointer:coarse){.look-painterly .scene,.look-painterly .art,.look-painterly ${CARDS}::before,.look-painterly .kicker::before,.look-painterly :is(.hours,.heat,.ratio,.stack,.col i,.row b i,.share i){filter:none}}
/* No page-turn flourishes when motion is reduced: every look just fades, over a still page. */
@media (prefers-reduced-motion:reduce){:is(.look-pop,.look-painterly,.look-minimal,.look-riso) .slide.active:not(.settled):not(.first){animation:calm-fade .25s ease both!important;clip-path:none;-webkit-mask:none;mask:none}
  :is(.look-pop,.look-painterly,.look-minimal,.look-riso) .slide.leaving .inner{transform:none;opacity:1;transition:none}}
`;
