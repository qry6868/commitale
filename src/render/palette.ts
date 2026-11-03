/** The flat print palette the badges and the report share. */
export const CREAM = '#F3EBDD';
export const INK = '#16161D';
export const NAVY = '#1F2A5C';
export const RED = '#E8553A';
export const BRICK = '#C23B2E';
export const YELLOW = '#F2C14E';
export const ORANGE = '#F2A541';
export const TEAL = '#3AA6A0';
export const BLUE = '#2D6CB5';
export const PLUM = '#7B5EA7';
export const PINK = '#D94F8A';
export const GREEN = '#2F9E68';
/** The report's data pages: near-black, a touch warm. */
export const NIGHT = '#121219';

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Whether ink or cream reads better on a colour: "light" fields take ink. */
export const tone = (bg: string): 'light' | 'dark' => (contrast(bg, INK) > contrast(bg, CREAM) ? 'light' : 'dark');
