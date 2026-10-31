import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Wrapped } from './stats.ts';

/**
 * Token usage from AI coding tools, read from the logs they keep on this machine.
 * Only usage counts, timestamps and model names are read: never prompts, replies or code.
 */
export interface AiStats {
  /** Everything: input, output and cache reads and writes. */
  tokens: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  sessions: number;
  activeDays: number;
  tools: { name: string; tokens: number }[];
  models: { name: string; tokens: number }[];
  byMonth: number[];
  busiestDay: { date: string; tokens: number };
  previous?: { year: number; tokens: number; partial: boolean };
}

export interface AiSources {
  claude: string[];
  codex: string[];
}

interface Usage {
  tool: 'Claude Code' | 'Codex';
  session: string;
  date: string;
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export function defaultAiSources(): AiSources {
  const home = homedir();
  return {
    claude: [join(process.env.CLAUDE_CONFIG_DIR || join(home, '.claude'), 'projects')],
    codex: [join(process.env.CODEX_HOME || join(home, '.codex'), 'sessions')],
  };
}

export function hasAiSources(sources: AiSources = defaultAiSources()): boolean {
  return [...sources.claude, ...sources.codex].some((dir) => existsSync(dir));
}

export interface AiOptions {
  year: number;
  /** Compare with last year only up to this date (YYYY-MM-DD) while `year` is still running. */
  cutoff?: string;
  sources?: AiSources;
}

export function readAiUsage({ year, cutoff, sources = defaultAiSources() }: AiOptions): AiStats | undefined {
  // Logs untouched since before last year can't hold anything we count.
  const since = new Date(year - 1, 0, 1).getTime();
  const usage: Usage[] = [];
  const seen = new Set<string>();
  for (const dir of sources.claude) for (const file of jsonlFiles(dir, since)) readClaude(file, usage, seen);
  for (const dir of sources.codex) for (const file of jsonlFiles(dir, since)) readCodex(file, usage);

  const current = usage.filter((u) => u.date.startsWith(`${year}-`));
  if (current.length === 0) return undefined;
  const stats = aggregate(current);

  const before = usage.filter((u) => u.date.startsWith(`${year - 1}-`) && (!cutoff || u.date <= cutoff));
  if (before.length > 0) {
    stats.previous = { year: year - 1, tokens: before.reduce((s, u) => s + total(u), 0), partial: Boolean(cutoff) };
  }
  return stats;
}

/** Heavy, regular AI use: half a billion tokens, on at least half the days you committed. */
export function isAiCommander(w: Wrapped): boolean {
  return Boolean(w.ai && w.ai.tokens >= 500_000_000 && w.ai.activeDays >= w.activeDays * 0.5);
}

/**
 * Claude Code: one JSON object per line; assistant messages carry `message.usage`.
 * A streamed reply can be logged more than once, so each message id counts once.
 */
function readClaude(file: string, out: Usage[], seen: Set<string>): void {
  for (const line of lines(file)) {
    if (!line.includes('"usage"')) continue;
    const o = parse(line);
    const usage = o?.message?.usage;
    if (o?.type !== 'assistant' || !usage || typeof o.timestamp !== 'string') continue;
    if (o.message.id) {
      const key = `${o.message.id}:${o.requestId ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push({
      tool: 'Claude Code',
      session: String(o.sessionId ?? file),
      date: localDate(o.timestamp),
      model: modelName(o.message.model),
      input: num(usage.input_tokens),
      output: num(usage.output_tokens),
      cacheRead: num(usage.cache_read_input_tokens),
      cacheWrite: num(usage.cache_creation_input_tokens),
    });
  }
}

/**
 * Codex: `token_count` events carry the session's running total, so each event
 * contributes what it added since the one before.
 */
function readCodex(file: string, out: Usage[]): void {
  let model = 'unknown';
  let prev = { input: 0, cached: 0, output: 0, total: 0 };
  for (const line of lines(file)) {
    if (!line.includes('token_count') && !line.includes('"model"')) continue;
    const o = parse(line);
    const p = o?.payload;
    if (typeof p?.model === 'string') model = modelName(p.model);
    const t = p?.type === 'token_count' ? p.info?.total_token_usage : undefined;
    if (!t || typeof o.timestamp !== 'string') continue;
    const cur = {
      input: num(t.input_tokens),
      cached: num(t.cached_input_tokens),
      output: num(t.output_tokens),
      total: num(t.total_tokens) || num(t.input_tokens) + num(t.output_tokens),
    };
    if (cur.total > prev.total) {
      out.push({
        tool: 'Codex',
        session: file,
        date: localDate(o.timestamp),
        model,
        input: Math.max(0, cur.input - cur.cached - (prev.input - prev.cached)),
        output: Math.max(0, cur.output - prev.output),
        cacheRead: Math.max(0, cur.cached - prev.cached),
        cacheWrite: 0,
      });
    }
    prev = cur;
  }
}

function aggregate(usage: Usage[]): AiStats {
  const byTool = new Map<string, number>();
  const byModel = new Map<string, number>();
  const byDay = new Map<string, number>();
  const sessions = new Set<string>();
  const byMonth = new Array<number>(12).fill(0);
  const sums = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  for (const u of usage) {
    const n = total(u);
    sums.input += u.input;
    sums.output += u.output;
    sums.cacheRead += u.cacheRead;
    sums.cacheWrite += u.cacheWrite;
    byTool.set(u.tool, (byTool.get(u.tool) ?? 0) + n);
    if (u.model !== 'unknown') byModel.set(u.model, (byModel.get(u.model) ?? 0) + n);
    byDay.set(u.date, (byDay.get(u.date) ?? 0) + n);
    byMonth[Number(u.date.slice(5, 7)) - 1] += n;
    sessions.add(`${u.tool}:${u.session}`);
  }
  const ranked = (m: Map<string, number>) =>
    [...m].map(([name, tokens]) => ({ name, tokens })).filter((r) => r.tokens > 0).sort((a, b) => b.tokens - a.tokens);
  const [busiest] = [...byDay].sort((a, b) => b[1] - a[1]);
  return {
    tokens: sums.input + sums.output + sums.cacheRead + sums.cacheWrite,
    ...sums,
    sessions: sessions.size,
    activeDays: byDay.size,
    tools: ranked(byTool),
    models: ranked(byModel),
    byMonth,
    busiestDay: { date: busiest[0], tokens: busiest[1] },
  };
}

function* jsonlFiles(dir: string, since: number, depth = 0): Generator<string> {
  if (depth > 5) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const path = join(dir, e.name);
    if (e.isDirectory()) yield* jsonlFiles(path, since, depth + 1);
    else if (e.name.endsWith('.jsonl')) {
      try {
        if (statSync(path).mtimeMs >= since) yield path;
      } catch {
        // Vanished or unreadable: skip it.
      }
    }
  }
}

function lines(file: string): string[] {
  try {
    return readFileSync(file, 'utf8').split('\n');
  } catch {
    return [];
  }
}

function parse(line: string): any {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

function total(u: Usage): number {
  return u.input + u.output + u.cacheRead + u.cacheWrite;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}

/** Drops date suffixes such as -20250514; skips placeholder models. */
function modelName(model: unknown): string {
  if (typeof model !== 'string' || !model || model.startsWith('<')) return 'unknown';
  return model.replace(/-\d{8}$/, '');
}

/** The calendar date on this machine's clock, matching what the user lived through. */
function localDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '0000-00-00';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
