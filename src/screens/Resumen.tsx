import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Badge, Card, Empty, H, Kpi, Row, Sub, Table } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useAnalisis } from '../store/useAnalisis';
import { analizar, clp, filtrar, pct, periodoDe, periodoLabel, signedPct } from '../logic/calc';
import { C, colorIndice } from '../theme';
import { TODAS } from '../types';

export default function Resumen() {
  const { periodo, cadena, periodos, precios, fotos, maestros } = useApp();
  const a = useAnalisis();

  // Período anterior para comparar el índice
  const anterior = useMemo(() => {
    if (periodo === TODAS) return null;
    const i = periodos.indexOf(periodo);
    const prev = periodos[i + 1];
    if (!prev) return null;
    const r = analizar(filtrar(precios, cadena, prev), maestros.productos, maestros.cadenas);
    return { periodo: prev, indice: r.indiceGlobal };
  }, [periodo, periodos, precios, cadena, maestros]);

  const fotosPer = fotos.filter(
    (f) => (cadena === TODAS || f.cadena === cadena) && (periodo === TODAS || periodoDe(f.fecha) === periodo),
  ).length;
  const comparados = a.celdas.filter((c) => c.indice != null).length;
  const delta = anterior?.indice != null && a.indiceGlobal != null ? a.indiceGlobal - anterior.indice : null;

  return (
    <View>
      <H>Resumen</H>
      <Sub>
        {cadena === TODAS ? 'Todas las cadenas' : cadena} · {periodoLabel(periodo)}. Índice LG = $/kg Los Granos ÷ promedio $/kg de la
        competencia (sobre 100 % = Los Granos más caro).
      </Sub>

      <Row style={{ marginBottom: 14, alignItems: 'stretch' }}>
        <Kpi
          label="Índice LG promedio"
          value={pct(a.indiceGlobal)}
          tone={a.indiceGlobal == null ? undefined : a.indiceGlobal > 1 ? 'bad' : 'good'}
          sub={delta != null ? `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta * 100).toFixed(1).replace('.', ',')} pts vs ${periodoLabel(anterior!.periodo)}` : 'Sin mes anterior para comparar'}
        />
        <Kpi label="Alertas (marca más barata que LG)" value={String(a.alertas.length)} tone={a.alertas.length ? 'bad' : 'good'} sub={`de ${comparados} producto-cadena comparados`} />
        <Kpi label="Precios registrados" value={String(a.rows.length)} sub={`${a.porCadena.length} cadenas · ${a.porProducto.length} productos`} />
        <Kpi label="Fotos del período" value={String(fotosPer)} sub={a.rows.filter((r) => !r.fotoId).length ? `${a.rows.filter((r) => !r.fotoId).length} precios sin foto (datos de partida)` : undefined} />
      </Row>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        <Card title="Índice LG por cadena" style={{ flexGrow: 1, flexShrink: 1, flexBasis: 340, minWidth: 0 }}>
          {a.porCadena.length === 0 && <Empty text="Sin datos para estos filtros." />}
          {a.porCadena.map((c) => {
            const col = colorIndice(c.indice);
            const w = c.indice == null ? 0 : Math.min(1.4, c.indice) / 1.4;
            return (
              <View key={c.cadena} style={{ marginBottom: 10 }}>
                <Row style={{ justifyContent: 'space-between' }} wrap={false}>
                  <Text style={{ fontWeight: '700', color: C.ink }}>{c.cadena}</Text>
                  <Text style={{ fontWeight: '800', color: c.indice != null && c.indice > 1 ? C.red : C.green }}>{pct(c.indice)}</Text>
                </Row>
                <View style={{ height: 10, backgroundColor: '#F0EEE8', borderRadius: 5, marginTop: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${w * 100}%`, height: '100%', backgroundColor: col.bg === 'rgb(255,255,255)' ? '#ddd' : col.bg }} />
                  <View style={{ position: 'absolute', left: `${(1 / 1.4) * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: C.ink }} />
                </View>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  {c.productos} productos comparados · {c.alertas} alertas
                </Text>
              </View>
            );
          })}
          {a.porCadena.length > 0 && <Text style={{ color: C.muted, fontSize: 11 }}>La línea negra marca 100 %.</Text>}
        </Card>

        <Card title={`Alertas (${a.alertas.length})`} style={{ flexGrow: 2, flexShrink: 1, flexBasis: 520, minWidth: 0 }}>
          {a.alertas.length === 0 ? (
            <Empty text="Ninguna marca de la competencia está más barata que Los Granos." />
          ) : (
            <Table
              maxHeight={520}
              cols={[
                { key: 'cad', label: 'Cadena', w: 120 },
                { key: 'prod', label: 'Producto', w: 220 },
                { key: 'lg', label: 'LG $/kg', w: 80, align: 'right' },
                { key: 'marca', label: 'Marca más barata', w: 120 },
                { key: 'comp', label: 'Marca $/kg', w: 90, align: 'right' },
                { key: 'dif', label: 'Diferencia', w: 95, align: 'right' },
              ]}
              rows={a.alertas.map((c) => ({
                key: c.cadena + c.producto,
                cells: {
                  cad: c.cadena,
                  prod: c.producto,
                  lg: clp(c.lg),
                  marca: c.minMarca ?? '–',
                  comp: clp(c.minKg),
                  dif: <Badge text={signedPct(c.lg! / c.minKg! - 1)} tone="bad" />,
                },
              }))}
            />
          )}
        </Card>
      </View>
    </View>
  );
}
