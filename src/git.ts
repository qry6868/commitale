import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Commit, FileChange } from './types.ts';

const execFileAsync = promisify(execFile);

// Record and unit separators: they never show up in names, emails or subjects.
const RS = '\x1e';
const US = '\x1f';

/** Reading one repository may take this long before it is skipped (a kernel-sized clone, say). */
export const REPO_TIMEOUT_MS = 120_000;

export async function git(args: string[], timeout?: number): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
    windowsHide: true,
    timeout,
  });
  return stdout;
}

export async function hasGit(): Promise<boolean> {
  try {
    await git(['--version']);
    return true;
  } catch {
    return false;
  }
}

/** Reads a git config value. Without `repo`, reads the global config. */
export async function gitConfig(key: string, repo?: string): Promise<string | undefined> {
  try {
    const args = repo ? ['-C', repo, 'config', '--get', key] : ['config', '--global', '--get', key];
    return (await git(args)).trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function repoRoot(dir: string): Promise<string | undefined> {
  try {
    return (await git(['-C', dir, 'rev-parse', '--show-toplevel'])).trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Every non-merge commit on any branch whose author date falls in `fromYear`..`year`. */
export async function readCommits(repo: string, year: number, fromYear = year): Promise<Commit[]> {
  const out = await git([
    '-C', repo,
    '-c', 'core.quotepath=off',
    '-c', 'log.showSignature=false',
    'log', '--all', '--no-merges', '--numstat',
    // --since/--until filter on committer date, so leave slack and filter on author date below.
    `--since=${fromYear - 1}-12-25`,
    `--until=${year + 1}-01-07`,
    `--pretty=format:${RS}%H${US}%an${US}%ae${US}%aI${US}%s`,
  ], REPO_TIMEOUT_MS);
  return parseLog(out, repo).filter((c) => {
    const y = Number(c.date.slice(0, 4));
    return y >= fromYear && y <= year;
  });
}

export function parseLog(out: string, repo: string): Commit[] {
  const commits: Commit[] = [];
  for (const chunk of out.split(RS)) {
    if (!chunk.trim()) continue;
    const [header = '', ...lines] = chunk.split('\n');
    const [hash, authorName = '', authorEmail = '', iso, subject = ''] = header.split(US);
    if (!hash || !iso) continue;

    const files: FileChange[] = [];
    for (const raw of lines) {
      const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(raw.replace(/\r$/, ''));
      if (!m) continue;
      files.push({
        path: renamedPath(m[3]),
        added: m[1] === '-' ? 0 : Number(m[1]),
        deleted: m[2] === '-' ? 0 : Number(m[2]),
      });
    }

    // %aI keeps the author's own UTC offset, so the wall-clock time is read straight
    // from the string: a commit at 2am in Tokyo stays a 2am commit.
    const y = Number(iso.slice(0, 4));
    const mo = Number(iso.slice(5, 7));
    const d = Number(iso.slice(8, 10));
    commits.push({
      hash,
      repo,
      authorName,
      authorEmail: authorEmail.toLowerCase(),
      date: iso.slice(0, 10),
      hour: Number(iso.slice(11, 13)),
      minute: Number(iso.slice(14, 16)),
      weekday: new Date(Date.UTC(y, mo - 1, d)).getUTCDay(),
      timestamp: Date.parse(iso),
      subject: subject.trim(),
      files,
    });
  }
  return commits;
}

/** Turns numstat rename notation (`a => b`, `src/{old => new}/x.ts`) into the new path. */
export function renamedPath(path: string): string {
  if (!path.includes(' => ')) return path;
  if (path.includes('{')) {
    return path.replace(/\{[^{}]*? => ([^{}]*)\}/, '$1').replace(/\/{2,}/g, '/');
  }
  return path.slice(path.indexOf(' => ') + 4);
}
