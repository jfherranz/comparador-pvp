import React from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { Badge, Card, Empty, H, Row, Sub, Table } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useAnalisis } from '../store/useAnalisis';
import { clp, LG, pct, periodoLabel } from '../logic/calc';
import { C } from '../theme';
import { TODAS } from '../types';

export default function Comparador() {
  const { cadena, periodo } = useApp();
  const a = useAnalisis();
  const telefono = useWindowDimensions().width < 600;

  const cols = [
    { key: 'prod', label: 'Producto', w: telefono ? 134 : 220 },
    ...a.marcas.map((m) => ({ key: 'm:' + m, label: m, w: telefono ? 80 : m === LG ? 96 : 88, align: 'right' as const })),
    { key: 'comp', label: cadena === TODAS ? 'Prom. comp.' : `Prom. comp. ${cadena}`, w: 92, align: 'right' as const },
    { key: 'idx', label: 'Índice LG', w: 90, align: 'right' as const },
  ];

  const rows = a.porProducto.map((p) => {
    const cells: Record<string, React.ReactNode> = { prod: p.producto };
    const style: Record<string, any> = {};
    for (const m of a.marcas) {
      const v = p.marcas[m];
      if (v == null) { cells['m:' + m] = ''; continue; }
      const masBarata = m !== LG && p.lg != null && v < p.lg;
      cells['m:' + m] = (
        <Text style={{ fontSize: 13, fontWeight: m === LG ? '800' : '500', color: masBarata ? C.red : C.ink }}>{clp(v)}</Text>
      );
      if (m === LG) style['m:' + m] = { backgroundColor: C.brandSoft };
      if (masBarata) style['m:' + m] = { backgroundColor: C.redSoft };
    }
    cells.comp = clp(p.comp);
    cells.idx = p.indice == null ? '–' : <Badge text={pct(p.indice)} tone={p.indice > 1 ? 'bad' : 'good'} />;
    return { key: p.producto, cells, style };
  });

  return (
    <View>
      <H>Comparador</H>
      <Sub>
        $/kg por producto y marca · {cadena === TODAS ? 'promedio de todas las cadenas' : `solo precios de ${cadena} (sin promediar con otras cadenas)`} ·{' '}
        {periodoLabel(periodo)}
      </Sub>
      <Card
        right={
          <Row>
            <View style={{ width: 12, height: 12, backgroundColor: C.redSoft, borderWidth: 1, borderColor: C.red }} />
            <Text style={{ fontSize: 12, color: C.muted }}>Marca más barata que Los Granos</Text>
          </Row>
        }
        title={`${a.porProducto.length} productos · ${a.marcas.length} marcas`}
      >
        {rows.length ? <Table cols={cols} rows={rows} fijas={a.marcas[0] === LG ? 2 : 1} /> : <Empty text="Sin datos para estos filtros." />}
        {cadena === TODAS && rows.length > 0 && (
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>
            Con "Todas", cada $/kg es el promedio entre cadenas y el índice LG es el promedio de los índices de cada cadena
            (solo donde Los Granos y la competencia están en la misma cadena).
          </Text>
        )}
      </Card>
    </View>
  );
}
