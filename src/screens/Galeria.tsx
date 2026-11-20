import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Btn, Card, Empty, H, Sub, Table, s as ui } from '../components/ui';
import { FotoImg } from '../components/FotoImg';
import { useApp } from '../store/AppContext';
import { clp, efectivo, periodoDe, periodoLabel, porKg } from '../logic/calc';
import { confirmar } from '../logic/util';
import { C } from '../theme';
import { Foto, TODAS } from '../types';

export default function Galeria() {
  const { fotos, precios, cadena, periodo, rol, deleteFotoYPrecios } = useApp();
  const { width } = useWindowDimensions();
  const [sel, setSel] = useState<Foto | null>(null);

  const lista = fotos
    .filter((f) => (cadena === TODAS || f.cadena === cadena) && (periodo === TODAS || periodoDe(f.fecha) === periodo))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const sinFoto = precios.filter((p) => !p.fotoId).length;
  const thumb = width < 600 ? (width - 60) / 2 : 180;
  const preciosSel = sel ? precios.filter((p) => p.fotoId === sel.id) : [];

  return (
    <View>
      <H>Galería</H>
      <Sub>Fotos de flejes · filtra con Cadena y Período arriba. Toca una foto para ver los precios que salieron de ella.</Sub>
      <Card title={`${lista.length} fotos`}>
        {lista.length === 0 ? (
          <Empty text={`No hay fotos para estos filtros. Los ${sinFoto} precios de partida de noviembre no tienen foto.`} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {lista.map((f) => (
              <Pressable key={f.id} onPress={() => setSel(f)} style={{ width: thumb }}>
                <FotoImg id={f.id} style={{ width: thumb, height: thumb, borderRadius: 10, backgroundColor: '#EEE' }} />
                <Text style={{ fontWeight: '700', marginTop: 4, color: C.ink }}>{f.cadena}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  {f.fecha} · {precios.filter((p) => p.fotoId === f.id).length} precios
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      <Modal visible={!!sel} transparent animationType="none" onRequestClose={() => setSel(null)}>
        <Pressable style={ui.backdrop} onPress={() => setSel(null)}>
          <Pressable style={[ui.sheet, { maxWidth: 900, maxHeight: '92%' }]} onPress={() => {}}>
            {sel && (
              <ScrollView>
                <Text style={ui.sheetTitle}>{sel.cadena} · {sel.fecha} ({periodoLabel(periodoDe(sel.fecha))})</Text>
                <FotoImg id={sel.id} style={{ width: '100%', height: 380, borderRadius: 10, backgroundColor: '#111' }} />
                <Text style={{ fontWeight: '700', marginVertical: 10 }}>Precios de esta foto ({preciosSel.length})</Text>
                {preciosSel.length ? (
                  <Table
                    cols={[
                      { key: 'prod', label: 'Producto', w: 200 },
                      { key: 'marca', label: 'Marca', w: 110 },
                      { key: 'g', label: 'Gramos', w: 70, align: 'right' },
                      { key: 'n', label: 'Normal', w: 80, align: 'right' },
                      { key: 'o', label: 'Oferta', w: 80, align: 'right' },
                      { key: 'ef', label: 'Efectivo', w: 80, align: 'right' },
                      { key: 'kg', label: '$/kg', w: 80, align: 'right' },
                    ]}
                    rows={preciosSel.map((p) => ({
                      key: p.id,
                      cells: {
                        prod: p.producto, marca: p.marca, g: String(p.formato), n: clp(p.pvpNormal), o: clp(p.pvpOferta),
                        ef: clp(efectivo(p)), kg: clp(porKg(p)),
                      },
                    }))}
                  />
                ) : <Empty text="Sin precios asociados." />}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  <Btn label="Cerrar" kind="ghost" onPress={() => setSel(null)} />
                  {rol === 'admin' && (
                    <Btn
                      label="Eliminar foto y sus precios"
                      kind="danger"
                      onPress={async () => {
                        const ok = await confirmar('Eliminar foto', `Se eliminará la foto y sus ${preciosSel.length} precios. No se puede deshacer.`);
                        if (ok) { await deleteFotoYPrecios(sel.id); setSel(null); }
                      }}
                    />
                  )}
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
