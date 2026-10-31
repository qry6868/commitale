import { existsSync, readdirSync, type Dirent } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const SKIP = new Set([
  'node_modules', 'bower_components', 'vendor', 'dist', 'build', 'target', 'out',
  'venv', '__pycache__', 'Pods', 'DerivedData', 'Library', 'AppData', 'Applications',
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
      walk(join(dir, entry.name), depth + 1);
    }
  };

  for (const root of roots) walk(resolve(root), 0);
  return [...found].sort();
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
