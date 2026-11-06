/**
 * Draws the images link previews show (assets/og-en.png, assets/og-zh.png) from the demo's
 * wide poster. Previews need a real image, not an SVG, so this takes a screenshot with
 * Chrome or Edge; scripts/site.ts just copies the results. Run it by hand when the posters
 * change:
 *
 *   node scripts/og.ts
 *
 * Set CHROME to the browser's path if it isn't found.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { strings } from '../src/i18n.ts';
import { CARD_SIZES } from '../src/render/card.ts';
import { renderPoster } from '../src/render/poster.ts';
import type { Wrapped } from '../src/stats.ts';

const BROWSERS = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const browser = BROWSERS.find((path) => path && existsSync(path));
if (!browser) throw new Error('No Chrome or Edge found. Set CHROME to its path.');

const root = fileURLToPath(new URL('..', import.meta.url));
const json = spawnSync(process.execPath, [join(root, 'scripts', 'demo.ts'), '--json'], { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 });
if (json.status !== 0) process.exit(json.status ?? 1);
const demo = JSON.parse(json.stdout.toString()) as Wrapped;

const tmp = mkdtempSync(join(tmpdir(), 'commitale-og-'));
const [W, H] = CARD_SIZES.wide;
for (const lang of ['en', 'zh'] as const) {
  // Square corners: a preview is cropped by whatever shows it.
  const svg = renderPoster(demo, strings(lang), 'wide', { embedFont: true }).replace('rx="28"', 'rx="0"');
  const file = join(tmp, `${lang}.svg`);
  writeFileSync(file, svg);
  const out = join(root, 'assets', `og-${lang}.png`);
  const shot = spawnSync(browser, ['--headless=new', '--hide-scrollbars', `--user-data-dir=${join(tmp, 'profile')}`, `--window-size=${W},${H}`, '--virtual-time-budget=2000', `--screenshot=${out}`, pathToFileURL(file).href], { stdio: 'ignore' });
  if (shot.status !== 0 || !existsSync(out)) throw new Error(`The browser couldn't draw ${out}`);
  console.log(`Wrote ${out}`);
}
rmSync(tmp, { recursive: true, force: true });
