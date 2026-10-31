import { calendar, fmt, heatLevels, onDark, pct } from '../format.ts';
import type { Strings } from '../i18n.ts';
import { change, type Wrapped } from '../stats.ts';
import { themeFor } from './theme.ts';

const color = Boolean(process.env.FORCE_COLOR) || (Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);

const sgr = (open: string, close: string) => (s: string): string => (color ? `\x1b[${open}m${s}\x1b[${close}m` : s);
const bold = sgr('1', '22');
const dim = sgr('2', '22');
const hex = (h: string) => {
  const v = parseInt(h.slice(1), 16);
  return sgr(`38;2;${(v >> 16) & 255};${(v >> 8) & 255};${v & 255}`, '39');
};
const accent = hex('#c4b5fd');
const plus = hex('#86efac');
const minus = hex('#fda4af');

const HEAT_EMPTY = '#3a3a4a';
const HEAT_PLAIN = ['·', '░', '▒', '▓', '█'];

export function renderTerminal(w: Wrapped, t: Strings, files?: { html: string; svg: string }): string {
  const out: string[] = [''];
  const line = (s = ''): number => out.push(`  ${s}`);

  line(`${accent('✦')} ${bold(`commitale ${w.year}`)}  ${dim('·')}  ${w.name}`);
  line();
  const growth = change(w.commits, w.previous?.commits);
  const vs = growth === undefined || !w.previous ? '' : `  ${(growth >= 0 ? plus : minus)(t.vsYear(growth, w.previous.year, w.previous.partial))}`;
  line(`${bold(fmt(w.commits))} ${t.commitsLabel}  ${dim('·')}  ${t.commitsSub(w.repos, w.activeDays)}${vs}`);
  line(`${plus(`+${fmt(w.added)}`)}  ${minus(`−${fmt(w.deleted)}`)}`);
  if (w.ai) {
    const tools = w.ai.tools.map((x) => `${x.name} ${pct(x.tokens / w.ai!.tokens)}%`).join(', ');
    line(`${accent('◆')} ${t.terminalAi}  ${bold(t.tokens(w.ai.tokens))} ${t.tokensLabel}  ${dim(`${t.aiSub(w.ai.sessions, w.ai.activeDays)} · ${tools}`)}`);
  }
  line();

  const HEAT = [HEAT_EMPTY, ...themeFor(w).heat.slice(1)];
  const level = heatLevels(w.daily);
  const { cells, cols } = calendar(w.year);
  const grid = Array.from({ length: 7 }, () => new Array<string>(cols).fill(' '));
  for (const c of cells) {
    const l = level(w.daily[c.date] ?? 0);
    grid[c.row][c.col] = color ? hex(HEAT[l])('■') : HEAT_PLAIN[l];
  }
  for (const row of grid) line(row.join(''));
  line();

  const s = w.longestStreak;
  const facts: [string, string][] = [
    [t.streak, `${bold(t.days(s.days))} ${dim(`${t.date(s.start)} → ${t.date(s.end)}`)}`],
    [t.busiest, `${bold(t.date(w.busiestDay.date))} ${dim(`· ${t.commitsN(w.busiestDay.commits)}`)}`],
    [t.peakLabel, bold(t.hour(w.peakHour))],
  ];
  if (w.latestNight) {
    const subject = w.latestNight.subject ? ` ${dim(`"${truncate(w.latestNight.subject, 48)}"`)}` : '';
    facts.push([t.latest, `${bold(w.latestNight.time)}${subject}`]);
  }
  const labelWidth = Math.max(...facts.map(([label]) => width(label))) + 3;
  for (const [label, value] of facts) line(`${dim(padEnd(label, labelWidth))}${value}`);
  line();

  if (w.languages.length > 0) {
    line(accent(t.topLanguages));
    const top = w.languages.slice(0, 5);
    const nameWidth = Math.max(...top.map((l) => width(l.name))) + 2;
    for (const l of top) {
      const filled = Math.max(1, Math.round(l.share * 24));
      const bar = hex(onDark(l.color))('█'.repeat(filled)) + dim('░'.repeat(24 - filled));
      line(`${padEnd(l.name, nameWidth)}${bar} ${String(pct(l.share)).padStart(3)}%`);
    }
    line();
  }

  const persona = t.personas[w.personas[0]];
  line(`${t.youAre} ${persona.emoji} ${bold(accent(persona.name))}`);
  line(dim(persona.desc(w)));
  line();

  if (files) {
    const fileWidth = Math.max(width(t.report), width(t.card)) + 3;
    line(`${dim(padEnd(t.report, fileWidth))}${files.html}`);
    line(`${dim(padEnd(t.card, fileWidth))}${files.svg}`);
    line();
  }
  return out.join('\n');
}

/** Terminal column width: CJK and fullwidth characters take two columns. */
function width(s: string): number {
  let w = 0;
  for (const ch of s) w += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? 2 : 1;
  return w;
}

function padEnd(s: string, cols: number): string {
  return s + ' '.repeat(Math.max(0, cols - width(s)));
}

function truncate(s: string, max: number): string {
  const chars = [...s];
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : s;
}
