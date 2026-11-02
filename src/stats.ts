import { basename } from 'node:path';
import { isGenerated, languageOf } from './languages.ts';
import type { AiStats } from './ai.ts';
import type { Commit } from './types.ts';

export type PersonaId =
  | 'nightOwl'
  | 'earlyBird'
  | 'weekendWarrior'
  | 'marathoner'
  | 'bugHunter'
  | 'cleaner'
  | 'polyglot'
  | 'nineToFive'
  | 'builder';

export interface Moment {
  date: string;
  time: string;
  subject: string;
  repo: string;
}

export interface Wrapped {
  year: number;
  name: string;
  commits: number;
  repos: number;
  activeDays: number;
  daysInYear: number;
  added: number;
  deleted: number;
  /** Commits per date, YYYY-MM-DD. */
  daily: Record<string, number>;
  byMonth: number[];
  byWeekday: number[];
  byHour: number[];
  longestStreak: { days: number; start: string; end: string };
  busiestDay: { date: string; commits: number };
  peakHour: number;
  peakWeekday: number;
  peakMonth: number;
  weekendShare: number;
  nightShare: number;
  languages: { name: string; color: string; lines: number; share: number }[];
  topRepos: { name: string; commits: number; added: number; deleted: number }[];
  words: { word: string; count: number }[];
  /** Commit counts by type, largest first, with empty types left out. */
  commitTypes: { type: CommitType; count: number }[];
  fixCommits: number;
  avgMessageLength: number;
  firstCommit: Moment;
  lastCommit: Moment;
  latestNight?: Moment;
  biggestCommit: Moment & { lines: number };
  /** The quirkiest things about the year, most remarkable first; empty when nothing stands out. */
  funFacts: FunFact[];
  personas: PersonaId[];
  /** AI coding tool usage, when Claude Code or Codex logs exist on this machine. */
  ai?: AiStats;
  /** The year before, for comparisons; absent when there were no commits then. `partial` = only up
   *  to the same date, because this year is still in progress. */
  previous?: { year: number; commits: number; added: number; activeDays: number; longestStreak: number; partial: boolean };
}

/** Percent change from `before` to `now`, or undefined when there is nothing to compare. */
export function change(now: number, before: number | undefined): number | undefined {
  if (!before) return undefined;
  return Math.round(((now - before) / before) * 100);
}

const STOPWORDS = new Set(
  ('the and for with from into this that are was were has have not but you your all can use ' +
    'when then than its out via more some also add adds added update updates updated ' +
    'merge branch main master pull request remote tracking origin ' +
    // Conventional-commit prefixes: the commit types chart already shows these.
    'feat fix chore docs refactor test tests perf style build').split(' '),
);

export type CommitType = 'feature' | 'fix' | 'refactor' | 'docs' | 'test' | 'chore' | 'other';

const CONVENTIONAL: Record<string, CommitType> = {
  feat: 'feature', feature: 'feature', fix: 'fix', hotfix: 'fix',
  refactor: 'refactor', perf: 'refactor', style: 'refactor',
  docs: 'docs', doc: 'docs', test: 'test', tests: 'test',
  chore: 'chore', build: 'chore', ci: 'chore', deps: 'chore', release: 'chore',
};
// Checked in order when a message has no conventional prefix.
const KEYWORDS: [CommitType, RegExp][] = [
  ['fix', /\b(fix(e[sd])?|bug(fix)?|hotfix|patch(e[sd])?|revert)\b|修复|修正|bug/i],
  ['test', /\b(tests?|specs?)\b|测试/i],
  ['docs', /\b(docs?|readme|changelog|comments?)\b|文档|注释/i],
  ['refactor', /\b(refactor|clean(up)?|rename|simplif(y|ied)|restructure|tidy|optimi[sz]e)\b|重构|优化|整理/i],
  ['chore', /\b(bump|deps?|dependenc(y|ies)|upgrade|release|version|ci|config|lint)\b|依赖|升级|发布|配置/i],
  ['feature', /\b(add(s|ed)?|implement|introduce|support|new|create|feat)\b|新增|添加|实现|支持|功能/i],
];

/** What a commit was for, from its conventional prefix or failing that its wording. */
export function commitType(subject: string): CommitType {
  const prefix = /^(\w+)(\([^)]*\))?!?:/.exec(subject.trim().toLowerCase());
  if (prefix && CONVENTIONAL[prefix[1]]) return CONVENTIONAL[prefix[1]];
  return KEYWORDS.find(([, re]) => re.test(subject))?.[0] ?? 'other';
}
const FIX_RE = /\b(fix(e[sd])?|bug(fix)?|hotfix|patch(e[sd])?)\b|修复|修正|修改bug/i;

export type Holiday = 'newYear' | 'valentine' | 'aprilFools' | 'halloween' | 'christmasEve' | 'christmas' | 'newYearsEve';
const HOLIDAYS: Record<string, Holiday> = {
  '01-01': 'newYear', '02-14': 'valentine', '04-01': 'aprilFools', '10-31': 'halloween',
  '12-24': 'christmasEve', '12-25': 'christmas', '12-31': 'newYearsEve',
};

/** A quirk worth a line in the report. `n` is the headline number; the rest depends on `id`. */
export type FunFact =
  | { id: 'fridayNight' | 'reverts' | 'typos' | 'wip' | 'tiny'; n: number }
  | { id: 'fixStreak'; n: number; date: string }
  | { id: 'session'; n: number; commits: number; date: string }
  | { id: 'holiday'; n: number; holiday: Holiday }
  | { id: 'emoji'; n: number; emoji: string };

/** Breaks longer than this end a coding session. */
const SESSION_GAP_MS = 90 * 60_000;

/**
 * Picks out the year's quirks: Friday-night commits, fix after fix, reverts, marathon
 * sessions and the like. Each has a bar to clear, and the ones that clear it furthest
 * come first, so a dull year shows nothing rather than something forced.
 */
export function funFacts(commits: Commit[], max = 4): FunFact[] {
  const sorted = [...commits].sort((a, b) => a.timestamp - b.timestamp);
  const count = (re: RegExp): number => sorted.filter((c) => re.test(c.subject)).length;
  const found: { fact: FunFact; score: number }[] = [];
  const add = (fact: FunFact, bar: number): void => {
    if (fact.n >= bar) found.push({ fact, score: fact.n / bar });
  };

  add({ id: 'fridayNight', n: sorted.filter((c) => c.weekday === 5 && c.hour >= 18).length }, 3);
  add({ id: 'reverts', n: count(/\breverts?\b|\breverted\b|回滚|撤销/i) }, 2);
  add({ id: 'typos', n: count(/\btypos?\b|错别字|拼写/i) }, 2);
  add({ id: 'wip', n: count(/\bwip\b/i) }, 3);
  add({ id: 'tiny', n: sorted.filter((c) => [...c.subject.trim()].length <= 3).length }, 3);

  // The longest run of fixes in a row: the first fix didn't take.
  let run = 0;
  let fixRun = { n: 0, date: '' };
  for (const c of sorted) {
    run = commitType(c.subject) === 'fix' ? run + 1 : 0;
    if (run > fixRun.n) fixRun = { n: run, date: c.date };
  }
  add({ id: 'fixStreak', ...fixRun }, 3);

  // The longest stretch of commits with no break over 90 minutes.
  let start = 0;
  let session = { minutes: 0, commits: 0, date: '' };
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i].timestamp - sorted[i - 1].timestamp <= SESSION_GAP_MS) continue;
    const minutes = Math.round((sorted[i - 1].timestamp - sorted[start].timestamp) / 60_000);
    if (i - start >= 4 && minutes > session.minutes) session = { minutes, commits: i - start, date: sorted[start].date };
    start = i;
  }
  add({ id: 'session', n: session.minutes, commits: session.commits, date: session.date }, 180);

  // Holidays always make the cut, the busiest one only.
  const holidays = new Map<Holiday, number>();
  for (const c of sorted) {
    const holiday = HOLIDAYS[c.date.slice(5)];
    if (holiday) holidays.set(holiday, (holidays.get(holiday) ?? 0) + 1);
  }
  const [holiday, n] = [...holidays].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (holiday && n) found.push({ fact: { id: 'holiday', n, holiday }, score: 1.5 + n / 10 });

  const emojis = new Map<string, number>();
  for (const c of sorted) for (const [e] of c.subject.matchAll(/\p{Extended_Pictographic}/gu)) emojis.set(e, (emojis.get(e) ?? 0) + 1);
  const [emoji, uses] = [...emojis].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (emoji && uses) add({ id: 'emoji', n: uses, emoji }, 5);

  return found.sort((a, b) => b.score - a.score).slice(0, max).map((f) => f.fact);
}

export interface StatsOptions {
  year: number;
  name: string;
  anonymize?: boolean;
}

export function computeStats(input: Commit[], opts: StatsOptions): Wrapped {
  if (input.length === 0) throw new Error('computeStats needs at least one commit');
  const commits = [...input].sort((a, b) => a.timestamp - b.timestamp);
  const n = commits.length;

  const daily: Record<string, number> = {};
  const byMonth = new Array<number>(12).fill(0);
  const byWeekday = new Array<number>(7).fill(0);
  const byHour = new Array<number>(24).fill(0);
  const langLines = new Map<string, { color: string; lines: number }>();
  const repoStats = new Map<string, { commits: number; added: number; deleted: number }>();
  const wordCounts = new Map<string, number>();
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });

  let added = 0;
  let deleted = 0;
  let fixCommits = 0;
  const types = new Map<CommitType, number>();
  let messageChars = 0;
  let biggest = { commit: commits[0], lines: -1 };
  let latestNight: { commit: Commit; score: number } | undefined;

  for (const c of commits) {
    daily[c.date] = (daily[c.date] ?? 0) + 1;
    byMonth[Number(c.date.slice(5, 7)) - 1]++;
    byWeekday[c.weekday]++;
    byHour[c.hour]++;

    let cAdded = 0;
    let cDeleted = 0;
    for (const f of c.files) {
      if (isGenerated(f.path)) continue;
      cAdded += f.added;
      cDeleted += f.deleted;
      const lang = languageOf(f.path);
      if (lang) {
        const entry = langLines.get(lang.name) ?? { color: lang.color, lines: 0 };
        entry.lines += f.added + f.deleted;
        langLines.set(lang.name, entry);
      }
    }
    const lines = cAdded + cDeleted;
    added += cAdded;
    deleted += cDeleted;
    if (lines > biggest.lines) biggest = { commit: c, lines };

    const repo = repoStats.get(c.repo) ?? { commits: 0, added: 0, deleted: 0 };
    repo.commits++;
    repo.added += cAdded;
    repo.deleted += cDeleted;
    repoStats.set(c.repo, repo);

    if (FIX_RE.test(c.subject)) fixCommits++;
    const type = commitType(c.subject);
    types.set(type, (types.get(type) ?? 0) + 1);
    messageChars += [...c.subject].length;
    for (const seg of segmenter.segment(c.subject.toLowerCase())) {
      if (!seg.isWordLike || /^\d+$/.test(seg.segment)) continue;
      const word = seg.segment;
      const cjk = /[぀-ヿ㐀-鿿가-힯]/.test(word);
      if (cjk ? word.length < 2 : word.length < 3 || STOPWORDS.has(word)) continue;
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }

    // Late night runs 22:00 through 04:59; later in that window scores higher.
    const minutes = (c.hour < 5 ? c.hour + 24 : c.hour) * 60 + c.minute;
    if (minutes >= 22 * 60 && (!latestNight || minutes >= latestNight.score)) {
      latestNight = { commit: c, score: minutes };
    }
  }

  const dates = Object.keys(daily).sort();
  const longestStreak = streak(dates);
  const busiestDate = dates.reduce((best, d) => (daily[d] > daily[best] ? d : best), dates[0]);

  const totalLangLines = [...langLines.values()].reduce((s, l) => s + l.lines, 0) || 1;
  const languages = [...langLines.entries()]
    .map(([name, l]) => ({ name, color: l.color, lines: l.lines, share: l.lines / totalLangLines }))
    .filter((l) => l.lines > 0)
    .sort((a, b) => b.lines - a.lines);

  const repoNames = new Map<string, string>();
  [...repoStats.entries()]
    .sort((a, b) => b[1].commits - a[1].commits)
    .forEach(([path], i) => repoNames.set(path, opts.anonymize ? `repo-${i + 1}` : basename(path)));
  const topRepos = [...repoStats.entries()]
    .map(([path, s]) => ({ name: repoNames.get(path)!, ...s }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5);

  const words = [...wordCounts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, 12);

  const moment = (c: Commit): Moment => ({
    date: c.date,
    time: `${pad(c.hour)}:${pad(c.minute)}`,
    subject: opts.anonymize ? '' : c.subject,
    repo: repoNames.get(c.repo)!,
  });

  const share = (count: number): number => count / n;
  const hoursIn = (from: number, to: number): number =>
    byHour.reduce((s, v, h) => s + (inRange(h, from, to) ? v : 0), 0);
  const officeCommits = commits.filter((c) => c.weekday > 0 && c.weekday < 6 && c.hour >= 9 && c.hour < 18).length;

  const wrapped: Wrapped = {
    year: opts.year,
    name: opts.name,
    commits: n,
    repos: repoStats.size,
    activeDays: dates.length,
    daysInYear: isLeap(opts.year) ? 366 : 365,
    added,
    deleted,
    daily,
    byMonth,
    byWeekday,
    byHour,
    longestStreak,
    busiestDay: { date: busiestDate, commits: daily[busiestDate] },
    peakHour: argmax(byHour),
    peakWeekday: argmax(byWeekday),
    peakMonth: argmax(byMonth),
    weekendShare: share(byWeekday[0] + byWeekday[6]),
    nightShare: share(hoursIn(22, 5)),
    languages,
    topRepos,
    words,
    fixCommits,
    commitTypes: [...types].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    avgMessageLength: Math.round(messageChars / n),
    firstCommit: moment(commits[0]),
    lastCommit: moment(commits[n - 1]),
    latestNight: latestNight && moment(latestNight.commit),
    biggestCommit: { ...moment(biggest.commit), lines: biggest.lines },
    funFacts: funFacts(commits),
    personas: [],
  };

  const personas: PersonaId[] = [];
  if (wrapped.nightShare >= 0.3) personas.push('nightOwl');
  if (share(hoursIn(5, 9)) >= 0.25) personas.push('earlyBird');
  if (wrapped.weekendShare >= 0.35) personas.push('weekendWarrior');
  if (longestStreak.days >= 21) personas.push('marathoner');
  if (share(fixCommits) >= 0.3) personas.push('bugHunter');
  if (deleted > added && deleted >= 1000) personas.push('cleaner');
  if (languages.filter((l) => l.share >= 0.05).length >= 5) personas.push('polyglot');
  if (share(officeCommits) >= 0.7) personas.push('nineToFive');
  if (personas.length === 0) personas.push('builder');
  wrapped.personas = personas;

  return wrapped;
}

/** Longest run of consecutive dates in a sorted list of YYYY-MM-DD strings. */
export function streak(sortedDates: string[]): { days: number; start: string; end: string } {
  let best = { days: 0, start: '', end: '' };
  let runStart = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (i > 0 && dayNumber(sortedDates[i]) - dayNumber(sortedDates[i - 1]) !== 1) runStart = i;
    const days = i - runStart + 1;
    if (days > best.days) best = { days, start: sortedDates[runStart], end: sortedDates[i] };
  }
  return best;
}

export function dayNumber(date: string): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / 86_400_000;
}

export function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Whether hour `h` is in [from, to), wrapping past midnight when from > to. */
function inRange(h: number, from: number, to: number): boolean {
  return from <= to ? h >= from && h < to : h >= from || h < to;
}

function argmax(values: number[]): number {
  return values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
