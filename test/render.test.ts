import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeXml as esc } from '../src/format.ts';
import { strings } from '../src/i18n.ts';
import { CARD_SIZES, renderCard, type CardFormat } from '../src/render/card.ts';
import { renderHtml } from '../src/render/html.ts';
import { renderPoster } from '../src/render/poster.ts';
import { change, computeStats, type PersonaId } from '../src/stats.ts';
import type { Commit } from '../src/types.ts';

const PERSONAS: PersonaId[] = ['nightOwl', 'earlyBird', 'weekendWarrior', 'marathoner', 'bugHunter', 'cleaner', 'polyglot', 'nineToFive', 'builder'];
const FORMATS: CardFormat[] = ['wide', 'square', 'story'];

function commits(): Commit[] {
  return ['2026-01-05', '2026-01-06', '2026-03-10'].map((date, i) => ({
    hash: `h${i}`,
    repo: '/code/secret-plans',
    authorName: 'Ada',
    authorEmail: 'ada@example.com',
    date,
    hour: 23,
    minute: 10,
    weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
    timestamp: Date.parse(`${date}T23:10:00Z`),
    subject: 'fix: <the> & "thing"',
    files: [{ path: 'src/a.ts', added: 40, deleted: 3 }],
  }));
}

test('change() is a rounded percent, undefined without a baseline', () => {
  assert.equal(change(132, 100), 32);
  assert.equal(change(88, 100), -12);
  assert.equal(change(5, 0), undefined);
  assert.equal(change(5, undefined), undefined);
});

for (const lang of ['en', 'zh'] as const) {
  test(`every personality renders every card size cleanly (${lang})`, () => {
    const t = strings(lang);
    for (const persona of PERSONAS) {
      for (const previous of [undefined, { year: 2025, commits: 2, added: 200, activeDays: 4, longestStreak: 1, partial: false }]) {
        const ai = previous ? { tokens: 1_240_000_000, input: 1, output: 1, cacheRead: 1, cacheWrite: 1, sessions: 40, activeDays: 3, tools: [{ name: 'Claude Code', tokens: 1_240_000_000 }], models: [], byMonth: new Array(12).fill(0), busiestDay: { date: '2026-01-05', tokens: 9 }, previous: { year: 2025, tokens: 620_000_000, partial: false } } : undefined;
        const w = { ...computeStats(commits(), { year: 2026, name: 'Ada <&>' }), personas: [persona], previous, ai };
        const cards = Object.fromEntries(FORMATS.map((f) => [f, renderCard(w, t, f)])) as Record<CardFormat, string>;
        for (const f of FORMATS) {
          const [width, height] = CARD_SIZES[f];
          assert.ok(cards[f].startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"`));
          // Share images never name a repo; the report the user keeps can.
          assert.doesNotMatch(cards[f], /NaN|undefined|Ada <&>|secret-plans/, `${persona} ${f}`);
          assert.ok(cards[f].includes(`id="${f}-bg"`), 'ids are unique per format');
          assert.equal(cards[f].includes(t.cardVs(50, 2025, false)), Boolean(previous), `${persona} ${f} comparison`);
        }
        const posters = Object.fromEntries(FORMATS.map((f) => [f, renderPoster(w, t, f)])) as Record<CardFormat, string>;
        for (const f of FORMATS) {
          assert.doesNotMatch(posters[f], /NaN|undefined|Ada <&>|secret-plans/, `${persona} poster ${f}`);
          // Someone scrolling past should see at once that this is about code.
          assert.ok(posters[f].toLowerCase().includes(t.cardTitle(2026).toLowerCase()), `${persona} poster ${f} says what it is`);
          // The fact behind the personality, and the waveform's month axis.
          assert.ok(posters[f].includes(t.punchlines[persona](w)), `${persona} poster ${f} has its punchline`);
          assert.ok(posters[f].includes(`>${t.months[11]}</text>`), `${persona} poster ${f} labels the months`);
          // A square poster drops its lists when a two-line name leaves no room.
          if (f !== 'square') assert.ok(posters[f].includes(t.types.fix), `${persona} poster ${f} lists commit types`);
          assert.ok(posters[f].includes(`id="poster-${f}-bg"`), 'poster ids differ from the stats cards');
          // Names are uppercased for the headline face, and CJK names must stay on one line.
          assert.ok(posters[f].toLowerCase().includes(t.personas[persona].name.split(' ').pop()!.toLowerCase()), `${persona} poster names the personality`);
        }
        const html = renderHtml(w, t, { poster: posters, data: cards });
        assert.doesNotMatch(html, /NaN|undefined/, persona);
        assert.equal(html.includes(t.vsYear(50, 2025, false)), Boolean(previous));
        // The reveal spins through the other badges twice and lands on this personality's,
        // and screen readers get the name whole.
        const main = t.personas[persona];
        const faces = [...html.matchAll(/class="face( on)?" data-persona="(\w+)"/g)].map((m) => m[2]);
        assert.equal(faces.length, PERSONAS.length, `${persona} reel has every badge`);
        assert.ok(html.includes(`class="face on" data-persona="${persona}"`), `${persona} shows its own badge without the script`);
        const order = JSON.parse(/data-reel="([^"]+)"/.exec(html)![1]) as number[];
        assert.equal(order.length, 2 * (PERSONAS.length - 1) + 1, `${persona} reel length`);
        assert.equal(faces[order[order.length - 1]], persona, `${persona} reel lands on its badge`);
        assert.ok(order.slice(0, -1).every((i) => faces[i] !== persona), `${persona} reel spins through the others first`);
        assert.ok(html.includes(`aria-label="${main.name}"`), `${persona} name is labelled whole`);
        // Drawn badges replace the emoji on the cards; with this many clip paths, ids must not repeat.
        // The poster's badge and the reveal's last face carry the user's own number.
        const [value, label] = t.figures[persona](w);
        const landing = html.slice(html.indexOf(`class="face on" data-persona="${persona}"`));
        assert.ok(landing.slice(0, landing.indexOf('</svg>')).includes(`>${esc(value)}</text>`), `${persona} reveal shows its number`);
        const style = w.ai ? t.aiStyles.pairProgrammer : undefined;
        for (const f of FORMATS) {
          assert.ok(posters[f].includes(`id="art-poster-${f}-sticker-tile"`) && !posters[f].includes(main.emoji), `${persona} poster ${f} badge`);
          assert.ok(posters[f].includes(`>${esc(value)}</text>`) && posters[f].includes(`>${esc(label)}</text>`), `${persona} poster ${f} badge number`);
          assert.ok(cards[f].includes(`id="art-${f}-persona-tile"`) && !cards[f].includes(main.emoji), `${persona} card ${f} badge`);
          if (style) {
            assert.ok(posters[f].includes(`id="art-poster-${f}-ai-tile"`) && !posters[f].includes(style.emoji), `${persona} poster ${f} AI badge`);
            assert.ok(cards[f].includes(`id="art-${f}-ai-tile"`) && !cards[f].includes(style.emoji), `${persona} card ${f} AI badge`);
          }
        }
        if (style) assert.ok(html.includes('id="art-ai-slide-tile"') && !html.includes(style.emoji), `${persona} report AI badge`);
        const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
        assert.equal(new Set(ids).size, ids.length, `${persona} page ids are unique`);
      }
    }
  });
}
