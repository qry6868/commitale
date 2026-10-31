/**
 * Builds a set of fake repositories with a year of believable history, then runs
 * commitale on them. Handy for screenshots and for trying changes without
 * pointing the tool at your own code.
 *
 *   node scripts/demo.ts [--year 2026] [any commitale options]
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEMO_AUTHOR = { name: 'Alex Chen', email: 'alex@example.dev' };
const TEAMMATE = { name: 'Sam Rivera', email: 'sam@example.dev' };

const REPOS = [
  { name: 'nebula-ui', weight: 5, files: ['src/App.tsx', 'src/components/Button.tsx', 'src/components/Modal.tsx', 'src/hooks/useTheme.ts', 'src/styles/theme.css', 'src/api/client.ts', 'README.md'] },
  { name: 'pixel-forge', weight: 3, files: ['src/main.rs', 'src/render.rs', 'src/ecs/world.rs', 'src/shader.wgsl', 'Cargo.toml'] },
  { name: 'tiny-gateway', weight: 2, files: ['cmd/server/main.go', 'internal/proxy/proxy.go', 'internal/auth/jwt.go', 'deploy/k8s.yaml'] },
  { name: 'notebooks', weight: 1, files: ['analysis/churn.py', 'analysis/forecast.py', 'utils/plot.py'] },
  { name: 'dotfiles', weight: 1, files: ['zsh/aliases.zsh', 'nvim/init.lua', 'install.sh'] },
];
const VERBS = ['fix', 'fix', 'feat', 'feat', 'feat', 'refactor', 'chore', 'docs', 'perf', 'test'];
const TOPICS = ['render loop', 'auth flow', 'dark mode', 'build cache', 'error handling', 'retry logic', 'modal focus trap',
  'shader uniforms', 'rate limiter', 'flaky test', 'memory leak', 'typos', 'deps', 'CI pipeline', 'startup time', 'theme tokens'];
const FUNNY = ['fix prod please', 'wip', "it works, don't touch it", 'one more try', 'revert the revert', 'why was this ever working'];
// Weighted toward evenings and late nights: the demo user is a night owl.
const HOUR_WEIGHTS = [5, 4, 3, 1, 0.3, 0.1, 0.2, 0.5, 1, 2, 3, 3, 2, 3, 3, 3, 3, 3, 2, 3, 5, 6, 7, 6];

export function createDemoRepos(dir: string, year: number, until = new Date(Date.UTC(year, 11, 31))): string[] {
  const rand = mulberry32(year);
  const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];
  const weighted = (weights: number[]): number => {
    let r = rand() * weights.reduce((s, w) => s + w, 0);
    return weights.findIndex((w) => (r -= w) < 0);
  };

  const streams = REPOS.map(() => [] as string[]);
  const contents = REPOS.map((r) => new Map(r.files.map((f) => [f, [] as string[]])));
  const day = new Date(Date.UTC(year, 0, 1));
  const end = Math.min(until.getTime(), Date.UTC(year, 11, 31));

  for (; day.getTime() <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const month = day.getUTCMonth();
    const date = day.getUTCDate();
    const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
    const sprint = (month === 2 && date >= 2) || (month === 3 && date <= 9);
    const vacation = month === 7 && date >= 5 && date <= 18;
    const chance = sprint ? 1 : vacation ? 0.02 : weekend ? 0.45 : 0.62;
    if (rand() > chance) continue;

    const commits = rand() < 0.03 ? 18 + Math.floor(rand() * 20) : 1 + Math.floor(-Math.log(1 - rand()) * 2.5);
    for (let i = 0; i < commits; i++) {
      const r = weighted(REPOS.map((x) => x.weight));
      // The teammate stays out of the sprint so the demo user's streak is unbroken.
      const author = r === 0 && !sprint && rand() < 0.15 ? TEAMMATE : DEMO_AUTHOR;
      const hour = weighted(HOUR_WEIGHTS);
      // Authored in UTC+8: the epoch time is eight hours before the wall clock.
      const epoch = Date.UTC(year, month, date, hour, Math.floor(rand() * 60)) / 1000 - 8 * 3600;
      const subject = rand() < 0.05 ? pick(FUNNY) : `${pick(VERBS)}: ${pick(TOPICS)}`;

      const ident = `${author.name} <${author.email}> ${epoch} +0800`;
      const out = streams[r];
      out.push(`commit refs/heads/main`, `author ${ident}`, `committer ${ident}`, data(subject));

      const files = contents[r];
      const touched = new Set(Array.from({ length: 1 + Math.floor(rand() * 2) }, () => pick([...files.keys()])));
      for (const path of touched) {
        const lines = files.get(path)!;
        if (lines.length > 220 || rand() < 0.2) lines.splice(Math.floor(rand() * lines.length), Math.floor(rand() * 40));
        const add = 2 + Math.floor(rand() * 45);
        for (let k = 0; k < add; k++) lines.splice(Math.floor(rand() * (lines.length + 1)), 0, `line ${epoch}-${k} ${rand().toString(36).slice(2)}`);
        out.push(`M 100644 inline ${path}`, data(`${lines.join('\n')}\n`));
      }
    }
  }

  rmSync(dir, { recursive: true, force: true });
  return REPOS.map((repo, i) => {
    const path = join(dir, repo.name);
    mkdirSync(path, { recursive: true });
    execFileSync('git', ['init', '-q', '-b', 'main', path]);
    execFileSync('git', ['-C', path, 'fast-import', '--quiet'], { input: `${streams[i].join('\n')}\n` });
    return path;
  });
}

function data(text: string): string {
  return `data ${Buffer.byteLength(text)}\n${text}`;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const yearIndex = args.indexOf('--year');
  const year = yearIndex >= 0 ? Number(args[yearIndex + 1]) : new Date().getFullYear();
  const dir = join(tmpdir(), 'commitale-demo');
  createDemoRepos(dir, year, new Date());
  console.error(`Demo repos created in ${dir}`);
  const cli = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
  const result = spawnSync(process.execPath, [cli, dir, '--author', DEMO_AUTHOR.email, '--name', DEMO_AUTHOR.name, ...args], {
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}
