import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendar, compact, heatLevels, onDark } from '../src/format.ts';
import { isGenerated, languageOf } from '../src/languages.ts';
import { strings } from '../src/i18n.ts';
import { computeStats, funFacts, streak, type FunFact } from '../src/stats.ts';
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

test('fun facts pick out the quirks, most remarkable first', () => {
  const commits = [
    // Friday 2 January, after hours.
    commit('2026-01-02', 19, 'feat: a'), commit('2026-01-02', 20, 'feat: b'), commit('2026-01-02', 21, 'feat: c'),
    // Three fixes in a row, then something else before the reverts.
    commit('2026-03-03', 10, 'fix: x'), commit('2026-03-03', 11, 'fix: x again'), commit('2026-03-03', 12, 'fix: x for real'),
    commit('2026-03-04', 10, 'docs: readme'),
    commit('2026-03-05', 10, 'Revert "feat: a"'), commit('2026-03-06', 10, 'revert the revert'),
    // A five-hour session: six commits, an hour apart.
    ...[9, 10, 11, 12, 13, 14].map((h) => commit('2026-04-10', h, `feat: step ${h}`)),
    commit('2026-12-25', 10, 'chore: deps'),
  ];
  const facts = funFacts(commits);
  assert.equal(facts.length, 4);
  assert.deepEqual(facts[0], { id: 'session', n: 300, commits: 6, date: '2026-04-10' });
  assert.deepEqual(facts[1], { id: 'holiday', n: 1, holiday: 'christmas' });
  assert.deepEqual(facts[2], { id: 'fridayNight', n: 3 });
  assert.ok(!facts.some((f) => f.id === 'typos'), 'no typo fixes, no typo fact');
  assert.deepEqual(
    funFacts(commits, 10).find((f) => f.id === 'fixStreak'),
    { id: 'fixStreak', n: 3, date: '2026-03-03' },
  );
  assert.equal(funFacts(commits, 10).find((f) => f.id === 'reverts')?.n, 2);
});

test('a quiet year has no fun facts rather than forced ones', () => {
  assert.deepEqual(funFacts([commit('2026-02-03', 10, 'feat: add search'), commit('2026-02-10', 11, 'fix: search paging')]), []);
});

test('every fun fact reads well in both languages', () => {
  const facts: FunFact[] = [
    { id: 'fridayNight', n: 3 }, { id: 'reverts', n: 2 }, { id: 'typos', n: 4 }, { id: 'wip', n: 5 }, { id: 'tiny', n: 6 },
    { id: 'fixStreak', n: 4, date: '2026-03-03' }, { id: 'session', n: 578, commits: 23, date: '2026-03-02' },
    { id: 'holiday', n: 1, holiday: 'newYearsEve' }, { id: 'emoji', n: 9, emoji: '🐛' },
  ];
  for (const lang of ['en', 'zh'] as const) {
    for (const f of facts) {
      const { big, line } = strings(lang).fun(f);
      assert.ok(big && line, `${lang} ${f.id}`);
      assert.doesNotMatch(big + line, /undefined|NaN/, `${lang} ${f.id}`);
    }
  }
  assert.equal(strings('en').fun({ id: 'session', n: 578, commits: 23, date: '2026-03-02' }).big, '9h 38m');
  assert.equal(strings('zh').fun({ id: 'session', n: 578, commits: 23, date: '2026-03-02' }).big, '9小时38分');
});
