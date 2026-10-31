import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { expandHome, findRepos, samePath, searchRoots } from '../src/scan.ts';

test('expandHome resolves a leading ~ in both slash styles', () => {
  assert.equal(expandHome('~'), homedir());
  assert.equal(expandHome('~/code'), join(homedir(), 'code'));
  assert.equal(expandHome('~\\code'), join(homedir(), 'code'));
  assert.equal(expandHome('D:\\projects'), 'D:\\projects');
  assert.equal(expandHome('./~notes'), './~notes');
  assert.equal(expandHome('~alice/code'), '~alice/code');
});

test('findRepos respects depth and skips node_modules and hidden folders', () => {
  const root = mkdtempSync(join(tmpdir(), 'commitale-scan-'));
  try {
    for (const repo of ['a', 'group/b', 'deep/x/y/c', 'node_modules/pkg', '.cache/d']) {
      mkdirSync(join(root, repo, '.git'), { recursive: true });
    }
    const names = (depth: number) => findRepos([root], depth).map((p) => p.slice(root.length + 1).replace(/\\/g, '/'));
    assert.deepEqual(names(3), ['a', 'group/b']);
    assert.deepEqual(names(4), ['a', 'deep/x/y/c', 'group/b']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('system folders are skipped right under a root, but not deeper', () => {
  const root = mkdtempSync(join(tmpdir(), 'commitale-drive-'));
  try {
    for (const repo of ['Windows/x', 'Program Files/y', 'projects/z', 'projects/Users/w']) {
      mkdirSync(join(root, repo, '.git'), { recursive: true });
    }
    const names = findRepos([root], 3).map((p) => p.slice(root.length + 1).replace(/\\/g, '/'));
    assert.deepEqual(names, ['projects/Users/w', 'projects/z']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('searchRoots starts with the home folder', () => {
  const roots = searchRoots();
  assert.equal(roots[0], homedir());
  if (process.platform === 'win32') assert.ok(roots.some((r) => /^[A-Z]:\\$/.test(r)));
  else assert.equal(roots.length, 1);
});

test('samePath ignores trailing separators and, on Windows, case', () => {
  assert.ok(samePath(homedir(), `${homedir()}/`));
  if (process.platform === 'win32') assert.ok(samePath(homedir(), homedir().toUpperCase()));
});
