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
/** Oil colours, for the painterly look. */
export const OCHRE = '#D19A3E';
export const SIENNA = '#B4532F';
export const ULTRAMARINE = '#2F3F8C';
export const SAP = '#4E7A47';
export const MADDER = '#8E2F3C';
/** The painterly look's data pages: a warm, dark umber ground. */
export const UMBER = '#1E1914';
/** Paper and one ink, for the minimal look. */
export const PAPER = '#F3EFE6';
export const SAND = '#EAE3D3';
export const MIST = '#E3E7E1';
export const SNOW = '#F8F6F1';
export const VERMILION = '#C8401F';
/** Risograph inks and paper stocks, for the riso look. */
export const RISO_PINK = '#FF48B0';
export const RISO_BLUE = '#0078BF';
export const RISO_TEAL = '#00838A';
export const RISO_ORANGE = '#FF6C2F';
export const RISO_YELLOW = '#FFE800';
/** Riso "medium blue": the riso look prints its text in it instead of black. */
export const RISO_INK = '#2F4E9E';
export const STOCK = '#F2EDE4';
export const STOCK_PINK = '#F6D9DE';
export const STOCK_BLUE = '#D9E4F0';
export const STOCK_YELLOW = '#F3E7B4';
/** Dark blue stock, the riso look's data pages. */
export const MIDNIGHT = '#141A30';
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

export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Whether ink or cream reads better on a colour: "light" fields take ink. */
export const tone = (bg: string): 'light' | 'dark' => (contrast(bg, INK) > contrast(bg, CREAM) ? 'light' : 'dark');
