import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createDemoRepos, DEMO_AUTHOR } from '../scripts/demo.ts';

const CLI = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
let dir: string;

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'commitale-test-'));
  createDemoRepos(join(dir, 'repos'), 2025);
});
after(() => rmSync(dir, { recursive: true, force: true }));

function run(...args: string[]) {
  return runIn(process.cwd(), ...args);
}

function runIn(cwd: string, ...args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, CI: '1' } });
}

test('--json reports stats for the chosen author only', () => {
  const result = run(join(dir, 'repos'), '--year', '2025', '--author', DEMO_AUTHOR.email, '--json');
  assert.equal(result.status, 0, result.stderr);
  const w = JSON.parse(result.stdout);
  assert.equal(w.year, 2025);
  assert.equal(w.repos, 5);
  assert.ok(w.commits > 500);
  assert.ok(w.longestStreak.days >= 30);
  assert.equal(w.personas[0], 'nightOwl');

  const everyone = JSON.parse(run(join(dir, 'repos'), '--year', '2025', '--all-authors', '--json').stdout);
  assert.ok(everyone.commits > w.commits, 'the teammate adds commits');
});

test('writes the HTML report and SVG card', () => {
  const out = join(dir, 'out');
  const result = run(join(dir, 'repos'), '--year', '2025', '--author', DEMO_AUTHOR.email, '--out', out, '--lang', 'en');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /commitale 2025/);
  const html = readFileSync(join(out, 'commitale-2025.html'), 'utf8');
  const svg = readFileSync(join(out, 'commitale-2025.svg'), 'utf8');
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /The Night Owl/);
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
});

test('points at the right author when nothing matches', () => {
  const result = run(join(dir, 'repos'), '--year', '2025', '--author', 'nobody@example.com', '--lang', 'en');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No commits by nobody@example.com/);
  assert.match(result.stderr, /alex@example.dev/);
});

test('works from a subfolder of a repo and fails clearly outside one', () => {
  const repo = join(dir, 'repos', 'nebula-ui');
  execFileSync('git', ['-C', repo, 'checkout', '-q', '-f', 'main']);
  const sub = join(repo, 'src');
  assert.ok(existsSync(sub));
  const inside = run(sub, '--year', '2025', '--author', DEMO_AUTHOR.email, '--json', '--depth', '0');
  assert.equal(inside.status, 0, inside.stderr);
  assert.equal(JSON.parse(inside.stdout).repos, 1);

  const empty = mkdtempSync(join(tmpdir(), 'commitale-empty-'));
  try {
    const outside = run(empty, '--lang', 'en');
    assert.equal(outside.status, 1);
    assert.match(outside.stderr, /No git repositories found/);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test('with no folder: the repos under the current folder, or the repo you are in', () => {
  const here = runIn(join(dir, 'repos'), '--year', '2025', '--author', DEMO_AUTHOR.email, '--json');
  assert.equal(here.status, 0, here.stderr);
  assert.equal(JSON.parse(here.stdout).repos, 5);
  assert.doesNotMatch(here.stderr, /Looking for git repositories/);

  const inside = runIn(join(dir, 'repos', 'nebula-ui', 'src'), '--year', '2025', '--author', DEMO_AUTHOR.email, '--json');
  assert.equal(inside.status, 0, inside.stderr);
  assert.equal(JSON.parse(inside.stdout).repos, 1);
});

test('--help and --version', () => {
  assert.match(run('--help').stdout, /Usage/);
  assert.match(run('--version').stdout, /^\d+\.\d+\.\d+/);
});
