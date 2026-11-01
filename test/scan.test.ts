import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { expandHome, findRepos, samePath, searchRoots, withTimeout } from '../src/scan.ts';

test('expandHome resolves a leading ~ in both slash styles', () => {
  assert.equal(expandHome('~'), homedir());
  assert.equal(expandHome('~/code'), join(homedir(), 'code'));
  assert.equal(expandHome('~\\code'), join(homedir(), 'code'));
  assert.equal(expandHome('D:\\projects'), 'D:\\projects');
  assert.equal(expandHome('./~notes'), './~notes');
  assert.equal(expandHome('~alice/code'), '~alice/code');
});

test('findRepos respects depth and skips node_modules and hidden folders', async () => {
  const root = mkdtempSync(join(tmpdir(), 'commitale-scan-'));
  try {
    for (const repo of ['a', 'group/b', 'deep/x/y/c', 'node_modules/pkg', '.cache/d']) {
      mkdirSync(join(root, repo, '.git'), { recursive: true });
    }
    const names = async (depth: number) => (await findRepos([root], depth)).map((p) => p.slice(root.length + 1).replace(/\\/g, '/'));
    assert.deepEqual(await names(3), ['a', 'group/b']);
    assert.deepEqual(await names(4), ['a', 'deep/x/y/c', 'group/b']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('system folders are skipped right under a root, but not deeper', async () => {
  const root = mkdtempSync(join(tmpdir(), 'commitale-drive-'));
  try {
    for (const repo of ['Windows/x', 'Program Files/y', 'projects/z', 'projects/Users/w']) {
      mkdirSync(join(root, repo, '.git'), { recursive: true });
    }
    const names = (await findRepos([root], 3)).map((p) => p.slice(root.length + 1).replace(/\\/g, '/'));
    assert.deepEqual(names, ['projects/Users/w', 'projects/z']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a root that runs out of time is reported and the scan still finishes', async () => {
  const root = mkdtempSync(join(tmpdir(), 'commitale-slow-'));
  try {
    for (let i = 0; i < 40; i++) mkdirSync(join(root, `p${i}`, 'src', 'lib'), { recursive: true });
    const timedOut: string[] = [];
    const started = Date.now();
    await findRepos([root], 3, { timeLimitMs: 1, onTimeout: (r) => timedOut.push(r) });
    assert.deepEqual(timedOut, [root]);
    assert.ok(Date.now() - started < 5000);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('withTimeout gives up on a promise that never settles', async () => {
  assert.equal(await withTimeout(new Promise<string>(() => {}), 20, 'gave up'), 'gave up');
  assert.equal(await withTimeout(Promise.resolve('done'), 1000, 'gave up'), 'done');
  assert.equal(await withTimeout(Promise.resolve('no limit'), undefined, 'gave up'), 'no limit');
});

test('searchRoots starts with the home folder', async () => {
  const roots = await searchRoots();
  assert.equal(roots[0], homedir());
  if (process.platform === 'win32') assert.ok(roots.some((r) => /^[A-Z]:\\$/.test(r)));
  else assert.equal(roots.length, 1);
});

test('samePath ignores trailing separators and, on Windows, case', () => {
  assert.ok(samePath(homedir(), `${homedir()}/`));
  if (process.platform === 'win32') assert.ok(samePath(homedir(), homedir().toUpperCase()));
});
