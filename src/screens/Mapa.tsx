import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Btn, Card, Empty, H, Row, Sub, s as ui } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useAnalisis } from '../store/useAnalisis';
import { Celda, clp, LG, pct, periodoLabel, signedPct } from '../logic/calc';
import { C, colorIndice } from '../theme';
import { TODAS } from '../types';

/** Nombre corto para el encabezado de columna */
const corto = (p: string) =>
  p.replace('Arroz ', 'A. ').replace('Poroto ', 'P. ').replace('Lenteja ', 'L. ').replace('Lentejas ', 'L. ')
    .replace('Grado ', 'G').replace('Largo ', 'L').replace('Delgado', 'Delg.').replace('Ancho', 'Anch.')
    .replace('Partidas', 'Part.').replace('Partida', 'Part.').replace(' Sin Piel', ' s/piel');

export default function Mapa() {
  const { periodo, cadena } = useApp();
  const a = useAnalisis();
  const [sel, setSel] = useState<Celda | null>(null);

  const cadenas = a.porCadena.map((c) => c.cadena);
  const productos = a.porProducto.map((p) => p.producto);
  const get = (c: string, p: string) => a.celdas.find((x) => x.cadena === c && x.producto === p);

  const CW = 64;
  return (
    <View>
      <H>Mapa de calor</H>
      <Sub>Índice LG por cadena y producto · {cadena === TODAS ? 'todas las cadenas' : `solo ${cadena}`} · {periodoLabel(periodo)}. Toca una celda para ver el detalle por marca.</Sub>
      <Card
        right={
          <Row>
            {[0.8, 0.9, 1, 1.1, 1.2].map((v) => (
              <View key={v} style={{ backgroundColor: colorIndice(v).bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: C.line }}>
                <Text style={{ fontSize: 11, color: colorIndice(v).fg }}>{pct(v)}</Text>
              </View>
            ))}
          </Row>
        }
        title="Verde = Los Granos más barato · Rojo = más caro"
      >
        {!cadenas.length ? (
          <Empty text="Sin datos para estos filtros." />
        ) : (
          <ScrollView horizontal>
            <View>
              <Row wrap={false} style={{ gap: 0, alignItems: 'flex-end' }}>
                <View style={{ width: 130 }} />
                {productos.map((p) => (
                  <View key={p} style={{ width: CW, height: 70, justifyContent: 'flex-end', paddingHorizontal: 2 }}>
                    <Text style={{ fontSize: 10, color: C.muted, fontWeight: '700' }} numberOfLines={4}>{corto(p)}</Text>
                  </View>
                ))}
              </Row>
              {cadenas.map((c) => (
                <Row key={c} wrap={false} style={{ gap: 0 }}>
                  <View style={{ width: 130, paddingRight: 6 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: C.ink }} numberOfLines={1}>{c}</Text>
                  </View>
                  {productos.map((p) => {
                    const cell = get(c, p);
                    const col = colorIndice(cell?.indice ?? null);
                    return (
                      <Pressable
                        key={p}
                        onPress={() => cell && setSel(cell)}
                        style={({ hovered }: any) => ({
                          width: CW - 2, height: 36, margin: 1, borderRadius: 4, backgroundColor: cell ? col.bg : '#FAFAF8',
                          alignItems: 'center', justifyContent: 'center', borderWidth: hovered && cell ? 2 : 1,
                          borderColor: hovered && cell ? C.ink : C.line,
                        })}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: col.fg }}>
                          {cell ? (cell.indice != null ? pct(cell.indice) : '·') : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </Row>
              ))}
            </View>
          </ScrollView>
        )}
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>
          "·" = hay precios, pero falta Los Granos o la competencia en esa cadena. Vacío = sin precios.
        </Text>
      </Card>

      <Modal visible={!!sel} transparent animationType="none" onRequestClose={() => setSel(null)}>
        <Pressable style={ui.backdrop} onPress={() => setSel(null)}>
          <Pressable style={ui.sheet} onPress={() => {}}>
            {sel && (
              <>
                <Text style={ui.sheetTitle}>{sel.producto}</Text>
                <Text style={{ color: C.muted, marginBottom: 10 }}>
                  {sel.cadena} · Índice LG {pct(sel.indice)}
                </Text>
                {Object.entries(sel.marcas)
                  .sort((x, y) => x[1] - y[1])
                  .map(([m, v]) => {
                    const dif = sel.lg != null && m !== LG ? v / sel.lg - 1 : null;
                    return (
                      <Row key={m} style={{ justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#F0EEE8' }} wrap={false}>
                        <Text style={{ fontWeight: m === LG ? '800' : '500', color: m === LG ? C.brand : C.ink, flex: 1 }}>{m}</Text>
                        <Text style={{ width: 80, textAlign: 'right', fontWeight: '700' }}>{clp(v)}/kg</Text>
                        <Text style={{ width: 70, textAlign: 'right', color: dif == null ? C.muted : dif < 0 ? C.red : C.green }}>
                          {dif == null ? '' : signedPct(dif)}
                        </Text>
                      </Row>
                    );
                  })}
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
                  Promedio competencia: {clp(sel.comp)}/kg. % = diferencia de cada marca vs Los Granos.
                </Text>
                <Btn label="Cerrar" kind="ghost" onPress={() => setSel(null)} style={{ marginTop: 12 }} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
