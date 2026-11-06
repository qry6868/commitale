/**
 * Builds the live demo site into site/: the demo report in English (index.html) and
 * Chinese (zh.html), each with a small badge saying it's sample data and how to get
 * your own; a page of every personality and AI style (personalities.html,
 * zh-personalities.html); and a sample report for each personality, from a year of demo
 * history that earns it, so every look can be seen (sample-<id>.html, zh-sample-<id>.html). GitHub Pages serves it;
 * see .github/workflows/pages.yml.
 *
 *   node scripts/site.ts
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
const SITE = 'https://qry6868.github.io/commitale/';

const PREVIEW = {
  en: { title: 'Commitale: your year in code, told as a story', description: 'A Spotify Wrapped-style report for your git history, drawn in your coding personality\'s own style. See a sample, then run npx commitale on yours.' },
  zh: { title: 'Commitale：把你这一年的代码讲成一个故事', description: '类似 Spotify Wrapped 的 git 年度报告，用你的编程人格专属的风格画出来。先看示例，再用 npx commitale 生成你自己的。' },
};

/** What link previews show: the title, a line about the project, and the poster. */
const preview = (lang: 'en' | 'zh', file: string): string => {
  const { title, description } = PREVIEW[lang];
  return `<meta name="description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Commitale">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${SITE}${file === 'index.html' ? '' : file}">
<meta property="og:image" content="${SITE}og-${lang}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${SITE}og-${lang}.png">
</head>`;
};

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
  const html = readFileSync(join(tmp, report), 'utf8').replace('</body>', `${badge(page)}</body>`).replace('</head>', preview(page.lang, page.file));
  writeFileSync(join(out, page.file), html);
  writeFileSync(join(out, page.gallery), renderGallery(page.lang, REPO).replace('</head>', preview(page.lang, page.gallery)));
  copyFileSync(join(root, 'assets', `og-${page.lang}.png`), join(out, `og-${page.lang}.png`));
  rmSync(tmp, { recursive: true, force: true });
}
// A year of demo history shaped to earn each personality, drawn in its own look. Early in a
// year there isn't enough of it yet (the Marathoner's streak runs through March), so the
// samples stay on the year before until then.
const now = new Date();
const sampleYear = now.getMonth() >= 4 ? now.getFullYear() : now.getFullYear() - 1;
for (const id of PERSONAS) {
  const json = spawnSync(process.execPath, [join(root, 'scripts', 'demo.ts'), '--persona', id, '--year', String(sampleYear), '--json'], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  if (json.status !== 0) process.exit(json.status ?? 1);
  const w = JSON.parse(json.stdout.toString()) as Wrapped;
  // The sample has to earn its name: a report that says 3% before 9 AM isn't an Early Bird.
  if (w.personas[0] !== id) throw new Error(`The ${id} sample came out as ${w.personas.join(', ')}. Adjust its profile in scripts/demo.ts.`);
  for (const page of PAGES) {
    const t = strings(page.lang);
    const each = (render: typeof renderCard) => ({ wide: render(w, t, 'wide'), square: render(w, t, 'square'), story: render(w, t, 'story') });
    const other = PAGES.find((p) => p !== page)!;
    const html = renderHtml(w, t, { poster: each(renderPoster), data: each(renderCard) }).replace(
      '</body>',
      `${badge({ ...page, other: { href: sampleFile(other.lang, id), label: page.other.label } })}</body>`,
    ).replace('</head>', preview(page.lang, sampleFile(page.lang, id)));
    writeFileSync(join(out, sampleFile(page.lang, id)), html);
  }
}
console.log(`Wrote ${PAGES.flatMap((p) => [`site/${p.file}`, `site/${p.gallery}`]).join(', ')}, and a sample report for each of ${PERSONAS.length} personalities in each language`);
