// Genera el SQL con los maestros y los 276 precios de noviembre (planilla v13) para cargar en Supabase.
// Uso (en la carpeta app):  node supabase/generar_datos_iniciales.js
// Escribe ..\supabase_datos_iniciales.sql (fuera de la carpeta app, para que NO se suba a GitHub).
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const seed = JSON.parse(fs.readFileSync(path.join(raiz, 'src/data/seed.json'), 'utf8'));
const ts = fs.readFileSync(path.join(raiz, 'src/data/maestros.ts'), 'utf8');

const lista = (tipo) => {
  const m = ts.match(new RegExp(tipo + ':\\s*\\[([\\s\\S]*?)\\]'));
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
};
const q = (v) => (v === null || v === undefined || v === '' ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

let sql = '-- Datos iniciales: maestros + precios de noviembre 2026 (planilla v13). Ejecutar UNA vez, después de esquema.sql.\n\n';
for (const tipo of ['cadenas', 'productos', 'marcas']) {
  const filas = lista(tipo).map((n, i) => `(${q(tipo)}, ${q(n)}, ${i + 1})`);
  sql += `insert into public.maestros (tipo, nombre, orden) values\n  ${filas.join(',\n  ')}\non conflict do nothing;\n\n`;
}
const filas = seed.map((p) =>
  `(${[p.id, p.fecha, p.cadena, p.sala, p.producto, p.marca, p.formato, p.pvpNormal, p.pvpOferta, p.reponedor, p.obs].map(q).join(', ')})`,
);
sql += 'insert into public.precios (id, fecha, cadena, sala, producto, marca, formato, pvp_normal, pvp_oferta, reponedor, obs) values\n  ';
sql += filas.join(',\n  ') + '\non conflict do nothing;\n';

const destino = path.join(raiz, '..', 'supabase_datos_iniciales.sql');
fs.writeFileSync(destino, sql, 'utf8');
console.log(`Listo: ${seed.length} precios → ${destino}`);
