import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Card, Empty, H, Row, Select, Sub, Table } from '../components/ui';
import { useApp } from '../store/AppContext';
import { clp, pct, periodoLabel, serieMensual } from '../logic/calc';
import { C } from '../theme';
import { TODAS } from '../types';

export default function Evolucion() {
  const { precios, cadena, maestros } = useApp();
  const [producto, setProducto] = useState<string>(TODAS);
  const [medido, setW] = useState<number | null>(null);
  // Ancho disponible según la pantalla (menú lateral ≥900 px; márgenes de página y tarjeta).
  const { width: ww } = useWindowDimensions();
  const disponible = ww >= 900 ? Math.min(1300, ww - 220) - 44 - 34 : ww - 62;
  const w = Math.max(260, Math.min(medido ?? disponible, disponible));
  const [hover, setHover] = useState<number | null>(null);

  const serie = useMemo(
    () => serieMensual(precios, cadena, producto, maestros.productos, maestros.cadenas).filter((x) => x.n > 0),
    [precios, cadena, producto, maestros],
  );

  const H_ = 260, PL = 56, PR = 16, PT = 16, PB = 34;
  const vals = serie.flatMap((x) => [x.lg, x.comp]).filter((v): v is number => v != null);
  const min = vals.length ? Math.min(...vals) * 0.9 : 0;
  const max = vals.length ? Math.max(...vals) * 1.05 : 1;
  const n = serie.length;
  const xAt = (i: number) => (n <= 1 ? PL + (w - PL - PR) / 2 : PL + (i * (w - PL - PR)) / (n - 1));
  const yAt = (v: number) => PT + (1 - (v - min) / (max - min || 1)) * (H_ - PT - PB);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min));
  const pts = (k: 'lg' | 'comp') =>
    serie.map((x, i) => (x[k] != null ? `${xAt(i)},${yAt(x[k]!)}` : null)).filter(Boolean).join(' ');

  const h = hover != null ? serie[hover] : null;

  return (
    <View>
      <H>Evolución</H>
      <Sub>
        $/kg de Los Granos frente al promedio de la competencia, mes a mes · {cadena === TODAS ? 'todas las cadenas' : cadena}.
        Solo cuenta producto-cadena donde están ambos.
      </Sub>
      <Card
        title="$/kg mensual"
        right={
          <Select label="Producto" value={producto} options={[TODAS, ...maestros.productos]} onChange={setProducto} style={{ minWidth: 240 }} compact />
        }
      >
        {!serie.length ? (
          <Empty text="Sin datos comparables." />
        ) : (
          <View style={{ width: '100%', minWidth: 0 }} onLayout={(e: LayoutChangeEvent) => setW(Math.max(260, Math.floor(e.nativeEvent.layout.width)))}>
            <Row style={{ marginBottom: 8 }}>
              <Row><View style={{ width: 14, height: 3, backgroundColor: C.brand }} /><Text style={{ fontSize: 12 }}>Los Granos</Text></Row>
              <Row><View style={{ width: 14, height: 3, backgroundColor: C.comp }} /><Text style={{ fontSize: 12 }}>Promedio competencia{cadena === TODAS ? '' : ` en ${cadena}`}</Text></Row>
            </Row>
            <View style={{ height: H_, overflow: 'hidden' }}>
              <Svg width={w} height={H_} style={{ position: 'absolute', left: 0, top: 0 }}>
                {ticks.map((t, i) => (
                  <React.Fragment key={i}>
                    <Line x1={PL} x2={w - PR} y1={yAt(t)} y2={yAt(t)} stroke={C.line} strokeWidth={1} />
                    <SvgText x={PL - 6} y={yAt(t) + 4} fontSize={10} fill={C.muted} textAnchor="end">{clp(t)}</SvgText>
                  </React.Fragment>
                ))}
                {serie.map((x, i) => (
                  <SvgText key={x.periodo} x={xAt(i)} y={H_ - 12} fontSize={11} fill={C.muted} textAnchor="middle">
                    {periodoLabel(x.periodo)}
                  </SvgText>
                ))}
                {hover != null && <Line x1={xAt(hover)} x2={xAt(hover)} y1={PT} y2={H_ - PB} stroke={C.ink} strokeDasharray="3,3" />}
                <Polyline points={pts('comp')} fill="none" stroke={C.comp} strokeWidth={2.5} />
                <Polyline points={pts('lg')} fill="none" stroke={C.brand} strokeWidth={3} />
                {serie.map((x, i) => (
                  <React.Fragment key={'p' + i}>
                    {x.comp != null && <Circle cx={xAt(i)} cy={yAt(x.comp)} r={hover === i ? 6 : 4} fill={C.comp} />}
                    {x.lg != null && <Circle cx={xAt(i)} cy={yAt(x.lg)} r={hover === i ? 6 : 4} fill={C.brand} />}
                  </React.Fragment>
                ))}
              </Svg>
              {/* Zonas de hover / toque por mes */}
              <View style={{ position: 'absolute', left: 0, top: 0, width: w, height: H_, flexDirection: 'row' }}>
                {serie.map((x, i) => {
                  const half = n <= 1 ? (w - PL - PR) / 2 : (w - PL - PR) / (n - 1) / 2;
                  return (
                    <Pressable
                      key={x.periodo}
                      onHoverIn={() => setHover(i)}
                      onHoverOut={() => setHover((v) => (v === i ? null : v))}
                      onPress={() => setHover((v) => (v === i ? null : i))}
                      style={{ position: 'absolute', left: xAt(i) - half, width: half * 2, top: 0, bottom: 0 }}
                    />
                  );
                })}
              </View>
              {h && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute', top: 8, left: Math.min(w - 200, Math.max(0, xAt(hover!) + 10)), width: 190,
                    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: C.line, padding: 10,
                    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8,
                  }}
                >
                  <Text style={{ fontWeight: '800', marginBottom: 4 }}>{periodoLabel(h.periodo)}</Text>
                  <Text style={{ color: C.brand, fontWeight: '700' }}>Los Granos: {clp(h.lg)}/kg</Text>
                  <Text style={{ color: C.muted, fontWeight: '700' }}>Competencia: {clp(h.comp)}/kg</Text>
                  <Text style={{ color: h.indice != null && h.indice > 1 ? C.red : C.green, fontWeight: '700', marginTop: 2 }}>
                    Índice LG: {pct(h.indice)}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{h.n} producto-cadena comparados</Text>
                </View>
              )}
            </View>
            {serie.length === 1 && (
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                Por ahora hay un solo mes con datos; la línea aparece cuando cargues fotos de otro mes.
              </Text>
            )}
          </View>
        )}
      </Card>

      {serie.length > 0 && (
        <Card title="Detalle mensual">
          <Table
            cols={[
              { key: 'per', label: 'Mes', w: 100 },
              { key: 'lg', label: 'Los Granos $/kg', w: 120, align: 'right' },
              { key: 'comp', label: cadena === TODAS ? 'Competencia $/kg' : `Competencia ${cadena} $/kg`, w: 130, align: 'right' },
              { key: 'idx', label: 'Índice LG', w: 90, align: 'right' },
              { key: 'n', label: 'Comparados', w: 100, align: 'right' },
            ]}
            rows={[...serie].reverse().map((x) => ({
              key: x.periodo,
              cells: { per: periodoLabel(x.periodo), lg: clp(x.lg), comp: clp(x.comp), idx: pct(x.indice), n: String(x.n) },
            }))}
          />
        </Card>
      )}
    </View>
  );
}
