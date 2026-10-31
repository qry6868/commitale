import { existsSync, readdirSync, type Dirent } from 'node:fs';
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

/**
 * Finds git repositories under each root, up to `maxDepth` levels down.
 * A root that is itself a repo is included and still searched; other repos are not
 * descended into, which keeps big monorepos from slowing the scan down.
 */
export function findRepos(roots: string[], maxDepth: number): string[] {
  const found = new Set<string>();

  const walk = (dir: string, depth: number): void => {
    if (existsSync(join(dir, '.git'))) {
      found.add(dir);
      if (depth > 0) return;
    }
    if (depth >= maxDepth) return;

    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || entry.name.startsWith('$') || SKIP.has(entry.name)) continue;
      if (depth === 0 && SYSTEM.has(entry.name)) continue;
      walk(join(dir, entry.name), depth + 1);
    }
  };

  for (const root of roots) walk(resolve(root), 0);
  return [...found].sort();
}

/**
 * Where to look when no folder is given: the home folder, plus every drive on
 * Windows, where projects often live on D:\ rather than under the user folder.
 */
export function searchRoots(): string[] {
  const roots = [homedir()];
  if (process.platform === 'win32') {
    for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
      const drive = `${letter}:\\`;
      if (existsSync(drive)) roots.push(drive);
    }
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
