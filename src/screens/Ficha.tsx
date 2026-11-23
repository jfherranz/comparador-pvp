import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Btn, Card, Empty, H, Kpi, Row, Select, Sub, Table } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useAnalisis } from '../store/useAnalisis';
import { Analisis, clp, LG, pct, periodoLabel, signedPct } from '../logic/calc';
import { descargarPDF } from '../export/pdf';
import { C } from '../theme';
import { TODAS } from '../types';

function filasFicha(a: Analisis) {
  return a.celdas.map((c) => {
    const comp = Object.entries(c.marcas).filter(([m]) => m !== LG).sort((x, y) => x[1] - y[1]);
    const min = comp[0];
    return { ...c, minMarca: min?.[0] ?? null, minKg: min?.[1] ?? null, nComp: comp.length };
  });
}

export default function Ficha() {
  const { cadena: cadGlobal, periodo, maestros } = useApp();
  const [cadena, setCadena] = useState<string>(cadGlobal !== TODAS ? cadGlobal : maestros.cadenas[0]);
  useEffect(() => { if (cadGlobal !== TODAS) setCadena(cadGlobal); }, [cadGlobal]);

  const a = useAnalisis(cadena);
  const filas = filasFicha(a);
  const resumen = a.porCadena[0];
  const masCaros = filas.filter((f) => f.indice != null && f.indice > 1).sort((x, y) => y.indice! - x.indice!);
  // Productos donde al menos una marca de la competencia está más barata que Los Granos (igual que el rojo del Comparador).
  const conMasBarata = filas.filter((f) => f.lg != null && f.minKg != null && f.minKg < f.lg);

  const pdf = () => {
    const tr = filas
      .map(
        (f) => `<tr>
          <td>${f.producto}</td><td class="r b">${clp(f.lg)}</td><td class="r">${clp(f.comp)}</td>
          <td>${f.minMarca ?? '–'}</td><td class="r" style="${f.lg != null && f.minKg != null && f.minKg < f.lg ? 'color:#C0392B;font-weight:700' : ''}">${clp(f.minKg)}</td>
          <td class="r b" style="color:${f.indice == null ? '#666' : f.indice > 1 ? '#C0392B' : '#2E8B57'}">${pct(f.indice)}</td></tr>`,
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title></title><style>
      body{font-family:Helvetica,Arial,sans-serif;color:#1F2A1F;margin:28px}
      h1{margin:0;color:#1F4D28} .sub{color:#6B7266;margin:4px 0 18px}
      .kpis{display:flex;gap:12px;margin-bottom:18px}.kpi{flex:1;border:1px solid #E3E0D7;border-radius:10px;padding:10px}
      .kpi .l{font-size:11px;color:#6B7266}.kpi .v{font-size:22px;font-weight:800}
      table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;color:#6B7266;border-bottom:2px solid #E3E0D7;padding:6px}
      td{padding:6px;border-bottom:1px solid #F0EEE8}.r{text-align:right}.b{font-weight:700}
      h2{font-size:15px;margin:20px 0 8px} ul{margin:0;padding-left:18px;font-size:12px}
      .foot{margin-top:22px;font-size:10px;color:#6B7266}
    </style></head><body>
      <h1>Ficha ${cadena}</h1>
      <div class="sub">Comparador PVP Los Granos · ${periodoLabel(periodo)}</div>
      <div class="kpis">
        <div class="kpi"><div class="l">Índice LG</div><div class="v" style="color:${resumen?.indice != null && resumen.indice > 1 ? '#C0392B' : '#2E8B57'}">${pct(resumen?.indice)}</div></div>
        <div class="kpi"><div class="l">Productos comparados</div><div class="v">${resumen?.productos ?? 0}</div></div>
        <div class="kpi"><div class="l">Con marca más barata que LG</div><div class="v">${conMasBarata.length}</div></div>
        <div class="kpi"><div class="l">Precios registrados</div><div class="v">${a.rows.length}</div></div>
      </div>
      ${conMasBarata.length ? `<h2>Productos con una marca más barata que Los Granos</h2><ul>${conMasBarata.map((f) => `<li>${f.producto}: ${f.minMarca} ${clp(f.minKg)}/kg vs Los Granos ${clp(f.lg)}/kg</li>`).join('')}</ul>` : ''}
      ${masCaros.length ? `<h2>Dónde Los Granos queda sobre el promedio de la competencia</h2><ul>${masCaros.map((f) => `<li>${f.producto}: ${signedPct(f.indice! - 1)} vs promedio competencia</li>`).join('')}</ul>` : ''}
      <h2>Detalle por producto ($/kg)</h2>
      <table><thead><tr><th>Producto</th><th class="r">Los Granos</th><th class="r">Prom. comp.</th><th>Comp. más barata</th><th class="r">$/kg</th><th class="r">Índice LG</th></tr></thead>
      <tbody>${tr}</tbody></table>
      <div class="foot">Precio efectivo = menor entre PVP normal y oferta/mayorista. $/kg = efectivo ÷ gramos × 1.000. Índice LG = $/kg LG ÷ promedio $/kg competencia.</div>
    </body></html>`;
    descargarPDF(html, `Ficha ${cadena} ${periodoLabel(periodo)}`);
  };

  return (
    <View>
      <H>Ficha cadena</H>
      <Sub>Resumen de una cadena para reuniones con compradores · {periodoLabel(periodo)}</Sub>
      <Row style={{ marginBottom: 14, alignItems: 'flex-end' }}>
        <Select label="Cadena" value={cadena} options={maestros.cadenas} onChange={setCadena} style={{ minWidth: 200 }} />
        <Btn label="Descargar PDF" onPress={pdf} disabled={!filas.length} />
      </Row>

      {!filas.length ? (
        <Card><Empty text={`Sin precios de ${cadena} en ${periodoLabel(periodo)}.`} /></Card>
      ) : (
        <>
          <Row style={{ marginBottom: 14, alignItems: 'stretch' }}>
            <Kpi label="Índice LG" value={pct(resumen?.indice)} tone={resumen?.indice != null && resumen.indice > 1 ? 'bad' : 'good'} />
            <Kpi label="Productos comparados" value={String(resumen?.productos ?? 0)} />
            <Kpi label="Con marca más barata que LG" value={String(conMasBarata.length)} sub="al menos una marca con menor $/kg" tone={conMasBarata.length ? 'bad' : 'good'} />
          </Row>
          <Card title="Detalle por producto ($/kg)">
            <Table
              cols={[
                { key: 'prod', label: 'Producto', w: 220 },
                { key: 'lg', label: 'Los Granos', w: 95, align: 'right' },
                { key: 'comp', label: 'Prom. comp.', w: 95, align: 'right' },
                { key: 'minM', label: 'Comp. más barata', w: 130 },
                { key: 'minK', label: '$/kg', w: 80, align: 'right' },
                { key: 'idx', label: 'Índice LG', w: 90, align: 'right' },
              ]}
              rows={filas.map((f) => ({
                key: f.producto,
                cells: {
                  prod: f.producto,
                  lg: <Text style={{ fontWeight: '800', color: C.brand }}>{clp(f.lg)}</Text>,
                  comp: clp(f.comp),
                  minM: f.minMarca ?? '–',
                  minK: f.lg != null && f.minKg != null && f.minKg < f.lg
                    ? <Text style={{ fontWeight: '700', color: C.red }}>{clp(f.minKg)}</Text>
                    : clp(f.minKg),
                  idx: f.indice == null ? '–' : <Badge text={pct(f.indice)} tone={f.indice > 1 ? 'bad' : 'good'} />,
                },
              }))}
            />
          </Card>
        </>
      )}
    </View>
  );
}
