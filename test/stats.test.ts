import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendar, compact, heatLevels, onDark } from '../src/format.ts';
import { isGenerated, languageOf } from '../src/languages.ts';
import { computeStats, streak } from '../src/stats.ts';
import type { Commit, FileChange } from '../src/types.ts';

let seq = 0;
function commit(date: string, hour: number, subject: string, files: FileChange[] = [], repo = '/code/app'): Commit {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return {
    hash: `h${seq++}`,
    repo,
    authorName: 'Ada',
    authorEmail: 'ada@example.com',
    date,
    hour,
    minute: 30,
    weekday,
    timestamp: Date.parse(`${date}T${String(hour).padStart(2, '0')}:30:00Z`),
    subject,
    files,
  };
}

test('streak finds the longest run of consecutive days, across month ends', () => {
  assert.deepEqual(streak([]), { days: 0, start: '', end: '' });
  assert.deepEqual(streak(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-05', '2026-02-06']), {
    days: 3,
    start: '2026-01-30',
    end: '2026-02-01',
  });
});

test('computeStats totals lines, skips generated files and ranks languages', () => {
  const w = computeStats(
    [
      commit('2026-02-02', 10, 'feat: parser', [
        { path: 'src/a.ts', added: 100, deleted: 10 },
        { path: 'package-lock.json', added: 5000, deleted: 4000 },
      ]),
      commit('2026-02-03', 11, 'fix: crash', [{ path: 'tool.py', added: 20, deleted: 5 }], '/code/tools'),
    ],
    { year: 2026, name: 'Ada' },
  );
  assert.equal(w.commits, 2);
  assert.equal(w.repos, 2);
  assert.equal(w.added, 120);
  assert.equal(w.deleted, 15);
  assert.equal(w.fixCommits, 1);
  assert.deepEqual(w.languages.map((l) => l.name), ['TypeScript', 'Python']);
  assert.equal(w.longestStreak.days, 2);
  assert.equal(w.biggestCommit.subject, 'feat: parser');
  assert.equal(w.biggestCommit.lines, 110);
  assert.equal(w.topRepos[0].name, 'app');
});

test('the latest-night commit is the one closest to dawn', () => {
  const w = computeStats(
    [commit('2026-05-01', 23, 'late'), commit('2026-05-02', 3, 'later'), commit('2026-05-03', 14, 'day')],
    { year: 2026, name: 'Ada' },
  );
  assert.equal(w.latestNight?.subject, 'later');
  assert.ok(w.personas.includes('nightOwl'));
});

test('no latest-night commit when everything happens in daylight', () => {
  const w = computeStats([commit('2026-05-04', 10, 'a'), commit('2026-05-05', 15, 'b')], { year: 2026, name: 'Ada' });
  assert.equal(w.latestNight, undefined);
  assert.deepEqual(w.personas, ['nineToFive']);
});

test('anonymize hides repo names and commit messages', () => {
  const w = computeStats([commit('2026-06-01', 12, 'secret project', [], '/work/acme-internal')], {
    year: 2026,
    name: 'Ada',
    anonymize: true,
  });
  assert.equal(w.topRepos[0].name, 'repo-1');
  assert.equal(w.firstCommit.subject, '');
  assert.equal(w.firstCommit.repo, 'repo-1');
});

test('commit words skip stopwords and handle CJK text', () => {
  const w = computeStats(
    [commit('2026-01-05', 10, '修复 登录 bug'), commit('2026-01-06', 10, '修复 登录 问题'), commit('2026-01-07', 10, 'the fix')],
    { year: 2026, name: 'Ada' },
  );
  const words = w.words.map((x) => x.word);
  assert.ok(words.includes('登录'));
  assert.ok(!words.includes('the'));
});

test('languageOf and isGenerated', () => {
  assert.equal(languageOf('src/App.tsx')?.name, 'TypeScript');
  assert.equal(languageOf('docker/Dockerfile')?.name, 'Dockerfile');
  assert.equal(languageOf('data.json'), undefined);
  assert.equal(languageOf('.gitignore'), undefined);
  assert.ok(isGenerated('web/node_modules/x/index.js'));
  assert.ok(isGenerated('yarn.lock'));
  assert.ok(!isGenerated('src/lockfile.ts'));
});

test('calendar lays out weeks Sunday-first', () => {
  const { cells, cols } = calendar(2026); // Jan 1 2026 is a Thursday
  assert.equal(cells.length, 365);
  assert.deepEqual(cells[0], { date: '2026-01-01', col: 0, row: 4 });
  assert.deepEqual(cells[3], { date: '2026-01-04', col: 1, row: 0 });
  assert.equal(cols, 53);
  assert.equal(calendar(2028).cells.length, 366);
});

test('format helpers', () => {
  assert.equal(compact(950), '950');
  assert.equal(compact(1000), '1k');
  assert.equal(compact(12_345), '12k');
  assert.equal(compact(1_250_000), '1.3M');
  assert.equal(onDark('#ffffff'), '#ffffff');
  assert.notEqual(onDark('#000080'), '#000080');
  const level = heatLevels({ a: 1, b: 2, c: 3, d: 4, e: 40 });
  assert.equal(level(0), 0);
  assert.equal(level(1), 1);
  assert.equal(level(40), 4);
});
