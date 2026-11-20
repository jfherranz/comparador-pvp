export const C = {
  bg: '#F5F3EE',
  card: '#FFFFFF',
  ink: '#1F2A1F',
  muted: '#6B7266',
  line: '#E3E0D7',
  brand: '#2F6B3A', // verde Los Granos
  brandDark: '#1F4D28',
  brandSoft: '#E5F0E3',
  accent: '#C8962E', // dorado grano
  red: '#C0392B',
  redSoft: '#FBE6E3',
  green: '#2E8B57',
  greenSoft: '#E1F3E8',
  comp: '#8A8F86', // serie competencia
};

/** Color de celda según índice LG: verde (más barato) → blanco (100 %) → rojo (más caro). */
export function colorIndice(idx: number | null): { bg: string; fg: string } {
  if (idx == null) return { bg: '#F0EEE8', fg: C.muted };
  const d = Math.max(-0.3, Math.min(0.3, idx - 1)) / 0.3; // -1..1
  const mix = (a: number[], b: number[], t: number) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
  const white = [255, 255, 255];
  const green = [46, 139, 87];
  const red = [192, 57, 43];
  const rgb = d < 0 ? mix(white, green, -d) : mix(white, red, d);
  const strong = Math.abs(d) > 0.55;
  return { bg: `rgb(${rgb.join(',')})`, fg: strong ? '#fff' : C.ink };
}
