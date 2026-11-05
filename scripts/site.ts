/**
 * Builds the live demo site into site/: the demo report in English (index.html) and
 * Chinese (zh.html), each with a small badge saying it's sample data and how to get
 * your own; a page of every personality and AI style (personalities.html,
 * zh-personalities.html); and the same demo data drawn as each personality, so every
 * look can be seen (sample-<id>.html, zh-sample-<id>.html). GitHub Pages serves it;
 * see .github/workflows/pages.yml.
 *
 *   node scripts/site.ts
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strings } from '../src/i18n.ts';
import { renderCard } from '../src/render/card.ts';
import { renderHtml } from '../src/render/html.ts';
import { renderPoster } from '../src/render/poster.ts';
import type { Wrapped } from '../src/stats.ts';
import { PERSONAS, renderGallery, sampleFile } from './gallery.ts';

const REPO = 'https://github.com/qry6868/commitale';

const PAGES = [
  { lang: 'en', file: 'index.html', gallery: 'personalities.html', note: 'Sample data. Get your own:', all: 'All personalities &amp; styles', other: { href: 'zh.html', label: '中文' } },
  { lang: 'zh', file: 'zh.html', gallery: 'zh-personalities.html', note: '示例数据。生成你自己的：', all: '全部人格和风格', other: { href: './', label: 'English' } },
] as const;

/** A page the badge goes on: the demo reports, or a sample, whose other language is its own twin. */
type Page = Omit<(typeof PAGES)[number], 'file' | 'other'> & { other: { href: string; label: string } };

const badge = (page: Page): string => `
<style>
.demo-badge{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:50;display:flex;gap:10px;align-items:center;
  max-width:calc(100vw - 32px);padding:8px 14px;border-radius:999px;font:500 13px/1.3 system-ui,sans-serif;color:#fff;white-space:nowrap;
  background:rgba(10,10,20,.62);border:1px solid rgba(255,255,255,.18);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.demo-badge a{color:inherit;text-decoration:none}
.demo-badge code{font:600 12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:2px 7px;border-radius:6px;background:rgba(255,255,255,.14)}
.demo-badge .sep{opacity:.35}
/* Phone pages use the whole screen, so the badge shows on the opening page only, in its free top corner. */
@media (max-width:640px){.demo-badge{display:none;top:30px;bottom:auto;left:16px;transform:none;padding:6px 12px;font-size:12px}.demo-badge .note,.demo-badge .all{display:none}
  .slide:first-of-type.active ~ .demo-badge{display:flex}}
</style>
<div class="demo-badge"><span class="note">${page.note}</span><a href="${REPO}"><code>npx commitale</code> ↗</a><span class="sep all">|</span><a class="all" href="${page.gallery}">${page.all}</a><span class="sep">|</span><a href="${page.other.href}" lang="${page.lang === 'en' ? 'zh' : 'en'}">${page.other.label}</a></div>
`;

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'site');
rmSync(out, { recursive: true, force: true });
mkdirSync(out);

for (const page of PAGES) {
  const tmp = mkdtempSync(join(tmpdir(), 'commitale-site-'));
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'demo.ts'), '--lang', page.lang, '--out', tmp, '--no-open'], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (result.status !== 0) process.exit(result.status ?? 1);
  const report = readdirSync(tmp).find((f) => f.endsWith('.html'));
  if (!report) throw new Error(`No report in ${tmp}`);
  const html = readFileSync(join(tmp, report), 'utf8').replace('</body>', `${badge(page)}</body>`);
  writeFileSync(join(out, page.file), html);
  writeFileSync(join(out, page.gallery), renderGallery(page.lang, REPO));
  rmSync(tmp, { recursive: true, force: true });
}
// The same demo data drawn as each personality, in its own look.
const json = spawnSync(process.execPath, [join(root, 'scripts', 'demo.ts'), '--json'], { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 });
if (json.status !== 0) process.exit(json.status ?? 1);
const demo = JSON.parse(json.stdout.toString()) as Wrapped;
for (const page of PAGES) {
  const t = strings(page.lang);
  for (const id of PERSONAS) {
    const w = { ...demo, personas: [id, ...demo.personas.filter((p) => p !== id)] };
    const each = (render: typeof renderCard) => ({ wide: render(w, t, 'wide'), square: render(w, t, 'square'), story: render(w, t, 'story') });
    const other = PAGES.find((p) => p !== page)!;
    const html = renderHtml(w, t, { poster: each(renderPoster), data: each(renderCard) }).replace(
      '</body>',
      `${badge({ ...page, other: { href: sampleFile(other.lang, id), label: page.other.label } })}</body>`,
    );
    writeFileSync(join(out, sampleFile(page.lang, id)), html);
  }
}
console.log(`Wrote ${PAGES.flatMap((p) => [`site/${p.file}`, `site/${p.gallery}`]).join(', ')}, and a sample report for each of ${PERSONAS.length} personalities in each language`);
