import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AI_STYLES, renderGallery, TIER_EXAMPLES } from '../scripts/gallery.ts';
import { aiStyle } from '../src/ai.ts';
import { strings } from '../src/i18n.ts';
import type { Wrapped } from '../src/stats.ts';

test("the gallery's AI tiers match aiStyle()", () => {
  TIER_EXAMPLES.forEach((tokens, i) => assert.equal(aiStyle({ ai: { tokens } } as Wrapped), AI_STYLES[i]));
});

for (const lang of ['en', 'zh'] as const) {
  test(`the gallery shows every personality and AI style (${lang})`, () => {
    const t = strings(lang);
    const html = renderGallery(lang, 'https://example.com');
    assert.doesNotMatch(html, /NaN|undefined/);
    for (const p of Object.values(t.personas)) assert.ok(html.includes(`<h3>${p.name}</h3>`), p.name);
    for (const s of Object.values(t.aiStyles)) assert.ok(html.includes(`<h3>${s.name}</h3>`), s.name);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(ids.length, 9 + 5 + 1, 'one tile per badge, plus the globe');
    assert.equal(new Set(ids).size, ids.length);
  });
}
