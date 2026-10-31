import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strings } from '../src/i18n.ts';
import { CARD_SIZES, renderCard, type CardFormat } from '../src/render/card.ts';
import { renderHtml } from '../src/render/html.ts';
import { change, computeStats, type PersonaId } from '../src/stats.ts';
import type { Commit } from '../src/types.ts';

const PERSONAS: PersonaId[] = ['nightOwl', 'earlyBird', 'weekendWarrior', 'marathoner', 'bugHunter', 'cleaner', 'polyglot', 'nineToFive', 'builder', 'aiCommander'];
const FORMATS: CardFormat[] = ['wide', 'square', 'story'];

function commits(): Commit[] {
  return ['2026-01-05', '2026-01-06', '2026-03-10'].map((date, i) => ({
    hash: `h${i}`,
    repo: '/code/app',
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
          assert.doesNotMatch(cards[f], /NaN|undefined|Ada <&>/, `${persona} ${f}`);
          assert.ok(cards[f].includes(`id="${f}-bg"`), 'ids are unique per format');
          assert.equal(cards[f].includes(t.cardVs(50, 2025, false)), Boolean(previous), `${persona} ${f} comparison`);
        }
        const html = renderHtml(w, t, cards);
        assert.doesNotMatch(html, /NaN|undefined/, persona);
        assert.equal(html.includes(t.vsYear(50, 2025, false)), Boolean(previous));
      }
    }
  });
}
