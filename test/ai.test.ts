import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { isAiCommander, readAiUsage } from '../src/ai.ts';
import type { Wrapped } from '../src/stats.ts';

let dir: string;
const sources = () => ({ claude: [join(dir, 'claude')], codex: [join(dir, 'codex')] });

const claudeLine = (id: string, ts: string, usage: object, model = 'claude-opus-5-5-20260301') =>
  JSON.stringify({ type: 'assistant', sessionId: 's1', timestamp: ts, requestId: `r-${id}`, message: { id, model, content: [{ type: 'text', text: 'secret prompt text' }], usage } });
const codexLine = (ts: string, total: object) =>
  JSON.stringify({ timestamp: ts, type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: total } } });

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'commitale-ai-'));
  mkdirSync(join(dir, 'claude', 'proj'), { recursive: true });
  mkdirSync(join(dir, 'codex', '2026', '03', '04'), { recursive: true });
  const u = { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 10, cache_read_input_tokens: 1000 };
  writeFileSync(
    join(dir, 'claude', 'proj', 'a.jsonl'),
    [
      JSON.stringify({ type: 'user', timestamp: '2026-03-04T10:00:00Z', message: { content: 'hello' } }),
      claudeLine('m1', '2026-03-04T10:00:01Z', u),
      claudeLine('m1', '2026-03-04T10:00:01Z', u), // the same streamed reply logged twice
      claudeLine('m2', '2026-03-05T10:00:00Z', u, 'claude-sonnet-5-5'),
      claudeLine('m3', '2025-03-01T10:00:00Z', u), // last year, before the cutoff
      claudeLine('m4', '2025-12-01T10:00:00Z', u), // last year, after the cutoff
      '{ not json',
    ].join('\n'),
  );
  writeFileSync(
    join(dir, 'codex', '2026', '03', '04', 'rollout-1.jsonl'),
    [
      JSON.stringify({ timestamp: '2026-03-04T09:00:00Z', type: 'turn_context', payload: { model: 'gpt-5-codex' } }),
      codexLine('2026-03-04T09:01:00Z', { input_tokens: 1000, cached_input_tokens: 600, output_tokens: 100, total_tokens: 1100 }),
      codexLine('2026-03-04T09:01:30Z', { input_tokens: 1000, cached_input_tokens: 600, output_tokens: 100, total_tokens: 1100 }), // repeated total
      codexLine('2026-03-04T09:02:00Z', { input_tokens: 3000, cached_input_tokens: 2000, output_tokens: 300, total_tokens: 3300 }),
    ].join('\n'),
  );
});
after(() => rmSync(dir, { recursive: true, force: true }));

test('sums Claude Code usage once per message and Codex usage from running totals', () => {
  const ai = readAiUsage({ year: 2026, cutoff: '2025-06-30', sources: sources() })!;
  // Claude: two distinct 2026 messages of 1,160 tokens each. Codex: running total ends at 3,300.
  assert.equal(ai.tokens, 2 * 1160 + 3300);
  assert.deepEqual(ai.tools, [
    { name: 'Codex', tokens: 3300 },
    { name: 'Claude Code', tokens: 2320 },
  ]);
  assert.equal(ai.cacheRead, 2 * 1000 + 2000);
  assert.equal(ai.output, 2 * 50 + 300);
  assert.equal(ai.sessions, 2);
  assert.equal(ai.activeDays, 2);
  assert.deepEqual(ai.models.map((m) => m.name), ['gpt-5-codex', 'claude-opus-5-5', 'claude-sonnet-5-5']);
  assert.equal(ai.byMonth[2], ai.tokens);
});

test('last year counts only up to the cutoff while this year is running', () => {
  assert.deepEqual(readAiUsage({ year: 2026, cutoff: '2025-06-30', sources: sources() })!.previous, { year: 2025, tokens: 1160, partial: true });
  assert.deepEqual(readAiUsage({ year: 2026, sources: sources() })!.previous, { year: 2025, tokens: 2320, partial: false });
});

test('no logs, or none from that year, means no AI page', () => {
  assert.equal(readAiUsage({ year: 2026, sources: { claude: [join(dir, 'missing')], codex: [] } }), undefined);
  assert.equal(readAiUsage({ year: 2024, sources: sources() }), undefined);
});

test('AI Commander needs heavy use on most of your coding days', () => {
  const w = (tokens: number, aiDays: number) => ({ activeDays: 100, ai: { tokens, activeDays: aiDays } }) as unknown as Wrapped;
  assert.ok(isAiCommander(w(600_000_000, 60)));
  assert.ok(!isAiCommander(w(600_000_000, 30)));
  assert.ok(!isAiCommander(w(100_000_000, 90)));
});
