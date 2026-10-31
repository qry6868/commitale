import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { expandHome, findRepos } from '../src/scan.ts';

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
