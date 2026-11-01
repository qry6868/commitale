import { type Dirent } from 'node:fs';
import { access, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const SKIP = new Set([
  'node_modules', 'bower_components', 'vendor', 'dist', 'build', 'target', 'out',
  'venv', '__pycache__', 'Pods', 'DerivedData', 'Library', 'AppData', 'Applications',
]);

// Top-level system folders on a drive. Skipped only right under a root, so scanning
// C:\ stays fast and doesn't wander into other people's home folders.
const SYSTEM = new Set([
  'Windows', 'Program Files', 'Program Files (x86)', 'ProgramData', 'Users', 'PerfLogs',
  'Recovery', 'System Volume Information', 'Config.Msi', 'Documents and Settings', 'MSOCache',
]);

export interface FindOptions {
  /**
   * Give up on a root after this long. A disconnected network drive can block a
   * directory read indefinitely; without a limit the whole scan would hang with it.
   */
  timeLimitMs?: number;
  /** Called with each root that ran out of time; repos found before then are kept. */
  onTimeout?: (root: string) => void;
}

/**
 * Finds git repositories under each root, up to `maxDepth` levels down.
 * A root that is itself a repo is included and still searched; other repos are not
 * descended into, which keeps big monorepos from slowing the scan down.
 */
export async function findRepos(roots: string[], maxDepth: number, options: FindOptions = {}): Promise<string[]> {
  const found = new Set<string>();

  const walk = async (dir: string, depth: number, deadline: number): Promise<void> => {
    if (Date.now() > deadline) return;
    if (await exists(join(dir, '.git'))) {
      found.add(dir);
      if (depth > 0) return;
    }
    if (depth >= maxDepth) return;

    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const children = entries.filter(
      (e) =>
        e.isDirectory() &&
        !e.name.startsWith('.') &&
        !e.name.startsWith('$') &&
        !SKIP.has(e.name) &&
        !(depth === 0 && SYSTEM.has(e.name)),
    );
    await Promise.all(children.map((e) => walk(join(dir, e.name), depth + 1, deadline)));
  };

  await Promise.all(
    roots.map(async (root) => {
      const limit = options.timeLimitMs;
      const deadline = limit ? Date.now() + limit : Infinity;
      const finished = await withTimeout(walk(resolve(root), 0, deadline).then(() => true), limit, false);
      if (!finished || Date.now() > deadline) options.onTimeout?.(root);
    }),
  );
  return [...found].sort();
}

/**
 * Where to look when no folder is given: the home folder, plus every drive on
 * Windows, where projects often live on D:\ rather than under the user folder.
 * A drive that doesn't answer within a second and a half (an unplugged network
 * share, an empty card reader) is left out.
 */
export async function searchRoots(): Promise<string[]> {
  const roots = [homedir()];
  if (process.platform === 'win32') {
    const drives = [...'CDEFGHIJKLMNOPQRSTUVWXYZ'].map((letter) => `${letter}:\\`);
    const present = await Promise.all(drives.map((drive) => withTimeout(exists(drive), 1500, false)));
    roots.push(...drives.filter((_, i) => present[i]));
  }
  return roots;
}

export function samePath(a: string, b: string): boolean {
  const norm = (p: string): string => {
    const r = resolve(p);
    return process.platform === 'win32' ? r.toLowerCase() : r;
  };
  return norm(a) === norm(b);
}

/**
 * Expands a leading `~` to the home folder. Unix shells do this before we see the
 * argument, but PowerShell and cmd pass `~/code` through literally.
 */
export function expandHome(path: string): string {
  if (path === '~') return homedir();
  if (path.startsWith('~/') || path.startsWith('~\\')) return join(homedir(), path.slice(2));
  return path;
}

function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

/** Resolves to `fallback` if `promise` takes longer than `ms`; no limit when `ms` is unset. */
export function withTimeout<T>(promise: Promise<T>, ms: number | undefined, fallback: T): Promise<T> {
  if (!ms) return promise;
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((done) => {
    timer = setTimeout(() => done(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
