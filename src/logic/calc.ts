import { Precio, TODAS } from '../types';

export const LG = 'Los Granos';

// ---------- Reglas por registro ----------

/** Precio efectivo = el menor entre PVP normal y PVP oferta / mayorista. */
export function efectivo(p: Pick<Precio, 'pvpNormal' | 'pvpOferta'>): number | null {
  const vals = [p.pvpNormal, p.pvpOferta].filter((v): v is number => typeof v === 'number' && v > 0);
  return vals.length ? Math.min(...vals) : null;
}

/** $/kg = precio efectivo ÷ gramos × 1.000 (redondeado, igual que la planilla). */
export function porKg(p: Pick<Precio, 'pvpNormal' | 'pvpOferta' | 'formato'>): number | null {
  const ef = efectivo(p);
  if (ef == null || !p.formato) return null;
  return Math.round((ef / p.formato) * 1000);
}

/** Período = mes calendario de la fecha de la foto (YYYY-MM). */
export const periodoDe = (fecha: string) => fecha.slice(0, 7);

/** Semana como WEEKNUM(fecha;2) de Excel: semana parte el lunes, la semana 1 contiene el 1 de enero. */
export function semanaExcel(fecha: string): number {
  const d = new Date(fecha + 'T12:00:00');
  const jan1 = new Date(d.getFullYear(), 0, 1, 12);
  const offset = (jan1.getDay() + 6) % 7; // 0 = lunes
  const dayOfYear = Math.round((d.getTime() - jan1.getTime()) / 86400000);
  return Math.floor((dayOfYear + offset) / 7) + 1;
}

export function periodoLabel(per: string): string {
  if (per === TODAS) return 'Todos';
  const [y, m] = per.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${meses[Number(m) - 1]} ${y}`;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// ---------- Agregación ----------

/** Celda = una cadena × un producto en un período. */
export type Celda = {
  cadena: string;
  producto: string;
  marcas: Record<string, number>; // $/kg promedio por marca
  lg: number | null; // $/kg Los Granos
  comp: number | null; // promedio $/kg de las marcas de la competencia
  indice: number | null; // lg / comp
  minMarca: string | null; // marca de la competencia con menor $/kg
  minKg: number | null;
};

export type Analisis = {
  celdas: Celda[];
  porCadena: { cadena: string; indice: number | null; productos: number; alertas: number }[];
  porProducto: {
    producto: string;
    marcas: Record<string, number>; // $/kg promedio entre cadenas
    lg: number | null;
    comp: number | null;
    indice: number | null; // promedio de los índices de cada cadena
  }[];
  marcas: string[]; // marcas presentes, Los Granos primero
  indiceGlobal: number | null;
  alertas: Celda[]; // celdas donde alguna marca de la competencia está más barata que LG, ordenadas por la diferencia
};

export function filtrar(precios: Precio[], cadena: string, periodo: string): Precio[] {
  return precios.filter(
    (p) => (cadena === TODAS || p.cadena === cadena) && (periodo === TODAS || periodoDe(p.fecha) === periodo),
  );
}

/** Alerta: al menos una marca de la competencia tiene menor $/kg que Los Granos en la misma cadena (criterio del Excel). */
export const esAlerta = (c: Celda) => c.lg != null && c.minKg != null && c.minKg < c.lg;

export function analizar(rows: Precio[], ordenProductos: string[], ordenCadenas: string[]): Analisis {
  // cadena -> producto -> marca -> [$/kg]
  const acc = new Map<string, Map<string, Map<string, number[]>>>();
  for (const p of rows) {
    const k = porKg(p);
    if (k == null) continue;
    if (!acc.has(p.cadena)) acc.set(p.cadena, new Map());
    const byProd = acc.get(p.cadena)!;
    if (!byProd.has(p.producto)) byProd.set(p.producto, new Map());
    const byMarca = byProd.get(p.producto)!;
    if (!byMarca.has(p.marca)) byMarca.set(p.marca, []);
    byMarca.get(p.marca)!.push(k);
  }

  const celdas: Celda[] = [];
  acc.forEach((byProd, cadena) => {
    byProd.forEach((byMarca, producto) => {
      const marcas: Record<string, number> = {};
      byMarca.forEach((ks, marca) => (marcas[marca] = mean(ks)!));
      const lg = marcas[LG] ?? null;
      const comp = mean(Object.entries(marcas).filter(([m]) => m !== LG).map(([, v]) => v));
      const indice = lg != null && comp != null ? lg / comp : null;
      const min = Object.entries(marcas).filter(([m]) => m !== LG).sort((x, y) => x[1] - y[1])[0];
      celdas.push({ cadena, producto, marcas, lg, comp, indice, minMarca: min?.[0] ?? null, minKg: min?.[1] ?? null });
    });
  });

  const idxProd = (p: string) => {
    const i = ordenProductos.indexOf(p);
    return i < 0 ? 999 : i;
  };
  const idxCad = (c: string) => {
    const i = ordenCadenas.indexOf(c);
    return i < 0 ? 999 : i;
  };
  celdas.sort((a, b) => idxCad(a.cadena) - idxCad(b.cadena) || idxProd(a.producto) - idxProd(b.producto));

  // Por cadena
  const cadenas = [...new Set(celdas.map((c) => c.cadena))].sort((a, b) => idxCad(a) - idxCad(b));
  const porCadena = cadenas.map((cadena) => {
    const cs = celdas.filter((c) => c.cadena === cadena && c.indice != null);
    return {
      cadena,
      indice: mean(cs.map((c) => c.indice!)),
      productos: cs.length,
      alertas: cs.filter(esAlerta).length,
    };
  });

  // Por producto (entre cadenas)
  const productos = [...new Set(celdas.map((c) => c.producto))].sort((a, b) => idxProd(a) - idxProd(b));
  const porProducto = productos.map((producto) => {
    const cs = celdas.filter((c) => c.producto === producto);
    const marcasAcc: Record<string, number[]> = {};
    cs.forEach((c) => Object.entries(c.marcas).forEach(([m, v]) => (marcasAcc[m] ||= []).push(v)));
    const marcas: Record<string, number> = {};
    Object.entries(marcasAcc).forEach(([m, vs]) => (marcas[m] = mean(vs)!));
    const lg = marcas[LG] ?? null;
    const comp = mean(Object.entries(marcas).filter(([m]) => m !== LG).map(([, v]) => v));
    const indice = mean(cs.filter((c) => c.indice != null).map((c) => c.indice!));
    return { producto, marcas, lg, comp, indice };
  });

  const marcasSet = new Set<string>();
  celdas.forEach((c) => Object.keys(c.marcas).forEach((m) => marcasSet.add(m)));
  const marcas = [...marcasSet].sort((a, b) => (a === LG ? -1 : b === LG ? 1 : a.localeCompare(b, 'es')));

  const conIndice = celdas.filter((c) => c.indice != null);
  const alertas = celdas.filter(esAlerta).sort((a, b) => b.lg! / b.minKg! - a.lg! / a.minKg!);

  return {
    celdas,
    porCadena,
    porProducto,
    marcas,
    indiceGlobal: mean(conIndice.map((c) => c.indice!)),
    alertas,
  };
}

/** Brechas: una fila por cadena × producto × marca de competencia, vs Los Granos en la misma cadena. */
export type Brecha = { cadena: string; producto: string; marca: string; kg: number; lg: number; dif: number };

export function brechas(celdas: Celda[]): Brecha[] {
  const out: Brecha[] = [];
  for (const c of celdas) {
    if (c.lg == null) continue;
    for (const [marca, kg] of Object.entries(c.marcas)) {
      if (marca === LG) continue;
      out.push({ cadena: c.cadena, producto: c.producto, marca, kg, lg: c.lg, dif: kg / c.lg - 1 });
    }
  }
  return out;
}

/** Serie mensual: $/kg promedio de Los Granos vs competencia (solo celdas donde existen ambos). */
export function serieMensual(precios: Precio[], cadena: string, producto: string, ordenProductos: string[], ordenCadenas: string[]) {
  const periodos = [...new Set(precios.map((p) => periodoDe(p.fecha)))].sort();
  return periodos.map((per) => {
    let rows = filtrar(precios, cadena, per);
    if (producto !== TODAS) rows = rows.filter((p) => p.producto === producto);
    const a = analizar(rows, ordenProductos, ordenCadenas);
    const pares = a.celdas.filter((c) => c.lg != null && c.comp != null);
    return {
      periodo: per,
      lg: mean(pares.map((c) => c.lg!)),
      comp: mean(pares.map((c) => c.comp!)),
      indice: mean(pares.map((c) => c.indice!)),
      n: pares.length,
    };
  });
}

// ---------- Formato ----------

export function clp(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '–';
  const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return '$' + s;
}

export function pct(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(n)) return '–';
  return (n * 100).toFixed(decimals).replace('.', ',') + '%';
}

export function signedPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '–';
  const v = (n * 100).toFixed(1).replace('.', ',');
  return (n > 0 ? '+' : '') + v + '%';
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const hoy = () => {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
