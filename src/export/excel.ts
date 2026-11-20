import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Precio } from '../types';
import { efectivo, LG, periodoDe, porKg, semanaExcel } from '../logic/calc';

/** Columnas de la hoja "Registro" de la planilla v13. */
const COLS = [
  'Fecha foto', 'Cadena', 'Sala', 'Producto', 'Marca', 'Formato (g)', 'PVP normal ($)', 'PVP oferta / 2º precio ($)',
  'Reponedor', 'Descripción fleje / observación', 'PVP efectivo ($)', '$/kg', 'Período (AAAAMM)', 'Semana',
  '$/kg Los Granos (misma cadena, producto y mes)', 'Dif. vs Los Granos', 'Alerta', 'Duplicado', 'Clave',
];

const serialExcel = (fecha: string) => {
  const [y, m, d] = fecha.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
};

export function filasRegistro(precios: Precio[]) {
  // $/kg LG promedio por cadena|producto|período
  const lgAcc = new Map<string, number[]>();
  for (const p of precios) {
    if (p.marca !== LG) continue;
    const k = porKg(p);
    if (k == null) continue;
    const key = `${p.cadena}|${p.producto}|${periodoDe(p.fecha)}`;
    (lgAcc.get(key) ?? lgAcc.set(key, []).get(key)!).push(k);
  }
  const lgKg = (p: Precio) => {
    const xs = lgAcc.get(`${p.cadena}|${p.producto}|${periodoDe(p.fecha)}`);
    return xs ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const clave = (p: Precio) => [serialExcel(p.fecha), p.cadena, p.sala ?? '', p.producto, p.marca, p.formato, p.obs ?? ''].join('|');
  const cuenta = new Map<string, number>();
  precios.forEach((p) => cuenta.set(clave(p), (cuenta.get(clave(p)) ?? 0) + 1));

  const ordenados = [...precios].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.cadena.localeCompare(b.cadena));
  return ordenados.map((p) => {
    const kg = porKg(p);
    const o = p.marca === LG ? null : lgKg(p);
    const dif = o != null && kg != null ? kg / o - 1 : null;
    const k = clave(p);
    return [
      new Date(p.fecha + 'T00:00:00'), p.cadena, p.sala ?? '', p.producto, p.marca, p.formato, p.pvpNormal ?? '', p.pvpOferta ?? '',
      p.reponedor ?? '', p.obs ?? '', efectivo(p) ?? '', kg ?? '', Number(p.fecha.slice(0, 4) + p.fecha.slice(5, 7)), semanaExcel(p.fecha),
      o ?? '', dif ?? '', dif != null && dif < 0 ? '⚠ Más barata que Los Granos' : '', (cuenta.get(k) ?? 0) > 1 ? 'Duplicado' : '', k,
    ];
  });
}

export async function descargarExcelRegistro(precios: Precio[], nombre = 'Comparador_PVP_Registro.xlsx') {
  const ws = XLSX.utils.aoa_to_sheet([COLS, ...filasRegistro(precios)], { cellDates: true });
  ws['!cols'] = COLS.map((c, i) => ({ wch: [12, 16, 14, 32, 16, 10, 12, 14, 12, 40][i] ?? 14 }));
  // formatos: fecha y porcentaje
  const range = XLSX.utils.decode_range(ws['!ref']!);
  for (let r = 1; r <= range.e.r; r++) {
    const a = ws[XLSX.utils.encode_cell({ r, c: 0 })];
    if (a) a.z = 'dd-mm-yyyy';
    const p = ws[XLSX.utils.encode_cell({ r, c: 15 })];
    if (p && typeof p.v === 'number') p.z = '0.0%';
  }
  ws['!autofilter'] = { ref: ws['!ref']! };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Registro');

  if (Platform.OS === 'web') {
    XLSX.writeFile(wb, nombre);
    return;
  }
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const file = new File(Paths.cache, nombre);
  await file.write(new Uint8Array(buf));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: nombre,
  });
}
