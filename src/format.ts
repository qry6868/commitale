export function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

/** 950, 12.3k, 450k, 1.2M, 1.24B */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${trim((n / 1000).toFixed(n < 10_000 ? 1 : 0))}k`;
  if (n < 1_000_000_000) return `${trim((n / 1_000_000).toFixed(1))}M`;
  return `${parseFloat((n / 1_000_000_000).toFixed(2))}B`;
}

export function pct(ratio: number): number {
  return Math.round(ratio * 100);
}

export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** Lightens colors too dark to read on the report's dark background. */
export function onDark(hex: string): string {
  const v = parseInt(hex.slice(1), 16);
  const rgb = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  if (luminance >= 0.3) return hex;
  const mixed = rgb.map((c) => Math.round(c + (255 - c) * 0.45));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Maps each daily count to a 0-4 intensity level using quartiles of active days. */
export function heatLevels(daily: Record<string, number>): (count: number) => number {
  const values = Object.values(daily).filter((v) => v > 0).sort((a, b) => a - b);
  const q = (p: number): number => values[Math.min(values.length - 1, Math.floor(p * values.length))] ?? 1;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  return (count) => (count <= 0 ? 0 : count <= q1 ? 1 : count <= q2 ? 2 : count <= q3 ? 3 : 4);
}

export interface CalendarCell {
  date: string;
  col: number;
  row: number;
}

/** GitHub-style calendar layout: one column per week, Sunday at the top. */
export function calendar(year: number): { cells: CalendarCell[]; cols: number } {
  const offset = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const cells: CalendarCell[] = [];
  for (let d = new Date(Date.UTC(year, 0, 1)); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
    const index = cells.length + offset;
    cells.push({ date: d.toISOString().slice(0, 10), col: Math.floor(index / 7), row: index % 7 });
  }
  return { cells, cols: cells[cells.length - 1].col + 1 };
}

function trim(s: string): string {
  return s.replace(/\.0$/, '');
}
