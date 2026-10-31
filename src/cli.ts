#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { gitConfig, readCommits, repoRoot } from './git.ts';
import { detectLang, strings, type Lang, type Strings } from './i18n.ts';
import { renderCard } from './render/card.ts';
import { renderHtml } from './render/html.ts';
import { renderTerminal } from './render/terminal.ts';
import { expandHome, findRepos, samePath, searchRoots } from './scan.ts';
import { computeStats } from './stats.ts';
import type { Commit } from './types.ts';

const HELP = `
  commitale: your year in code

  Usage
    npx commitale [folders...]

  Finds your git repositories and builds a year-in-review report from your
  commits. Everything runs locally; nothing is uploaded.

  With no folders, it uses the repo you're in, or the repos under the
  current folder, or else searches your home folder (and other drives on
  Windows).

  Options
    -y, --year <year>      Year to wrap (default: this year; last year in January)
    -a, --author <id>      Your email or name; repeat for several identities
                           (default: your git config user.email and user.name)
        --all-authors      Count everyone's commits, for a team report
        --name <name>      Name shown on the report
    -d, --depth <n>        How many folder levels to search for repos (default: 3)
    -o, --out <dir>        Where to write the report and card (default: .)
        --lang <en|zh>     Report language (default: from your locale)
        --anonymize        Hide repo names and commit messages
        --json             Print the stats as JSON and write nothing
        --no-open          Don't open the report in a browser
    -h, --help             Show this help
    -v, --version          Show the version

  Examples
    npx commitale
    npx commitale ~/code
    npx commitale ~/work ~/side-projects --author me@work.com --author me@home.dev
    npx commitale . --all-authors --name "Team Rocket"
`;

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      year: { type: 'string', short: 'y' },
      author: { type: 'string', short: 'a', multiple: true },
      'all-authors': { type: 'boolean' },
      name: { type: 'string' },
      depth: { type: 'string', short: 'd' },
      out: { type: 'string', short: 'o' },
      lang: { type: 'string' },
      anonymize: { type: 'boolean' },
      json: { type: 'boolean' },
      'no-open': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  if (values.help) {
    console.log(HELP);
    return 0;
  }
  if (values.version) {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    console.log(pkg.version);
    return 0;
  }

  const now = new Date();
  const year = values.year ? Number(values.year) : now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  if (!Number.isInteger(year) || year < 1970 || year > 2100) return fail(`Invalid --year: ${values.year}`);
  const depth = values.depth ? Number(values.depth) : 3;
  if (!Number.isInteger(depth) || depth < 0) return fail(`Invalid --depth: ${values.depth}`);
  const lang: Lang = values.lang === 'zh' || values.lang === 'en' ? values.lang : detectLang();
  const t = strings(lang);

  let repos: string[];
  if (positionals.length > 0) {
    const roots = positionals.map(expandHome);
    repos = findRepos(roots, depth);
    if (repos.length === 0) {
      // Run from inside a repo's subfolder: use the repo it belongs to.
      const tops = await Promise.all(roots.map(repoRoot));
      repos = [...new Set(tops.filter((r): r is string => Boolean(r)))];
    }
    if (repos.length === 0) return fail(t.noRepos(roots.join(', ')));
  } else {
    repos = await findDefaultRepos(depth, t);
    if (repos.length === 0) return fail(t.noReposAnywhere);
  }

  process.stderr.write(`${t.scanning(repos.length)}\n`);
  const seen = new Set<string>();
  const all: Commit[] = [];
  for (const commits of await mapLimit(repos, 8, (repo) => readCommits(repo, year).catch(() => []))) {
    for (const c of commits) {
      // The same commit shows up in forks and clones; count it once.
      if (seen.has(c.hash)) continue;
      seen.add(c.hash);
      all.push(c);
    }
  }

  const allAuthors = Boolean(values['all-authors']);
  const ids = new Set((values.author ?? []).map((a) => a.toLowerCase()));
  const globalName = await gitConfig('user.name');
  if (!allAuthors && ids.size === 0) {
    const perRepo = await mapLimit(repos, 8, async (repo) => [await gitConfig('user.email', repo), await gitConfig('user.name', repo)]);
    for (const id of [await gitConfig('user.email'), globalName, ...perRepo.flat()]) if (id) ids.add(id.toLowerCase());
  }
  const mine = allAuthors
    ? all
    : all.filter((c) => ids.has(c.authorEmail) || ids.has(c.authorName.toLowerCase()));

  if (mine.length === 0) {
    console.error(t.noCommits(year, ids.size ? [...ids].join(', ') : '?'));
    if (all.length > 0) {
      const counts = new Map<string, number>();
      for (const c of all) {
        const key = `${c.authorName} <${c.authorEmail}>`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      console.error(`\n${t.foundAuthors}`);
      for (const [who, n] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
        console.error(`  ${String(n).padStart(6)}  ${who}`);
      }
      console.error(`\n${t.tryAuthor}`);
    }
    return 1;
  }

  const name =
    values.name ??
    (allAuthors ? basename(resolve(expandHome(positionals[0] ?? '.'))) : (globalName ?? mine[mine.length - 1].authorName));
  const wrapped = computeStats(mine, { year, name, anonymize: values.anonymize });

  if (values.json) {
    console.log(JSON.stringify(wrapped, null, 2));
    return 0;
  }

  const outDir = resolve(values.out ?? '.');
  mkdirSync(outDir, { recursive: true });
  const card = renderCard(wrapped, t);
  const files = {
    html: join(outDir, `commitale-${year}.html`),
    svg: join(outDir, `commitale-${year}.svg`),
  };
  writeFileSync(files.svg, card);
  writeFileSync(files.html, renderHtml(wrapped, t, card));
  console.log(renderTerminal(wrapped, t, files));

  if (!values['no-open'] && !process.env.CI && process.stdout.isTTY) openInBrowser(files.html);
  return 0;
}

/**
 * With no folder given: the repo you're in; else the repos under the current folder;
 * else the likely places on this machine (home folder, other drives).
 */
async function findDefaultRepos(depth: number, t: Strings): Promise<string[]> {
  const top = await repoRoot('.');
  // A home folder kept under git (dotfiles) shouldn't hide every other project.
  if (top && !samePath(top, homedir())) return findRepos([top], depth);
  if (!samePath('.', homedir())) {
    const here = findRepos(['.'], depth);
    if (here.length > 0) return here;
  }

  const roots = searchRoots();
  process.stderr.write(`${t.searching(roots.join(', '))}\n`);
  const repos = findRepos(roots, depth);
  if (repos.length > 0) process.stderr.write(`${t.found(repos.map((r) => basename(r)))}\n`);
  return repos;
}

function fail(message: string): number {
  console.error(message);
  return 1;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function openInBrowser(file: string): void {
  const [command, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '""', `"${file}"`]]
      : process.platform === 'darwin'
        ? ['open', [file]]
        : ['xdg-open', [file]];
  const child = spawn(command, args, { stdio: 'ignore', detached: true, windowsVerbatimArguments: true });
  child.on('error', () => {});
  child.unref();
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
