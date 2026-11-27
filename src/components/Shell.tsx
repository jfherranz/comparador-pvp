import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useApp } from '../store/AppContext';
import { cambiarClave } from '../store/remoto';
import { C } from '../theme';
import { NOMBRE_ROL, TODAS } from '../types';
import { periodoLabel } from '../logic/calc';
import { aviso } from '../logic/util';
import { Btn, Field, Row, Select, s as ui } from './ui';

/** Datos de la cuenta: cambiar contraseña y salir (modo Supabase). */
function Cuenta({ onClose }: { onClose: () => void }) {
  const { usuario, rol, salir } = useApp();
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [guardando, setGuardando] = useState(false);
  const valida = clave.length >= 8 && clave === clave2;
  const guardar = async () => {
    setGuardando(true);
    try {
      await cambiarClave(clave);
      aviso('Contraseña cambiada', 'La próxima vez entra con la nueva contraseña.');
      onClose();
    } catch (e: any) {
      aviso('No se pudo cambiar', e?.message ?? String(e));
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={ui.backdrop} onPress={onClose}>
        <Pressable style={ui.sheet} onPress={() => {}}>
          <Text style={ui.sheetTitle}>Mi cuenta</Text>
          <Text style={{ color: C.ink }}>{usuario}</Text>
          <Text style={{ color: C.muted, marginBottom: 14 }}>Perfil: {NOMBRE_ROL[rol]}</Text>
          <Field label="Nueva contraseña (mínimo 8 caracteres)" value={clave} onChangeText={setClave} secure />
          <Field label="Repite la nueva contraseña" value={clave2} onChangeText={setClave2} secure />
          {clave2.length > 0 && clave !== clave2 && <Text style={{ color: C.red, fontSize: 12 }}>No coinciden.</Text>}
          <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
            <Btn kind="danger" label="Cerrar sesión" onPress={() => { onClose(); salir(); }} />
            <Row>
              <Btn kind="ghost" label="Cancelar" onPress={onClose} />
              <Btn label={guardando ? 'Guardando…' : 'Cambiar contraseña'} onPress={guardar} disabled={!valida || guardando} />
            </Row>
          </Row>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export type ScreenKey =
  | 'resumen' | 'comparador' | 'mapa' | 'evolucion' | 'brechas' | 'ficha' | 'galeria' | 'cargar' | 'datos';

export const SCREENS: { key: ScreenKey; label: string; icon: string; soloAdmin?: boolean }[] = [
  { key: 'resumen', label: 'Resumen', icon: '◎' },
  { key: 'comparador', label: 'Comparador', icon: '☰' },
  { key: 'mapa', label: 'Mapa de calor', icon: '▦' },
  { key: 'evolucion', label: 'Evolución', icon: '↗' },
  { key: 'brechas', label: 'Brechas', icon: '⇅' },
  { key: 'ficha', label: 'Ficha cadena', icon: '▤' },
  { key: 'galeria', label: 'Galería', icon: '▣' },
  { key: 'cargar', label: 'Cargar fotos', icon: '⇪', soloAdmin: true },
  { key: 'datos', label: 'Datos', icon: '⚙' },
];

export function Shell({ screen, setScreen, children }: {
  screen: ScreenKey; setScreen: (k: ScreenKey) => void; children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { rol, setRol, cadena, setCadena, periodo, setPeriodo, periodos, maestros, remoto, usuario } = useApp();
  const [cuenta, setCuenta] = useState(false);
  const visibles = SCREENS.filter((x) => !x.soloAdmin || rol === 'admin');

  const filtros = (
    <View style={st.filters}>
      <Select
        label="Cadena" value={cadena} options={[TODAS, ...maestros.cadenas]} onChange={setCadena}
        style={{ minWidth: 150, flexGrow: 1 }} compact
      />
      <Select
        label="Período" value={periodo} options={[TODAS, ...periodos]} onChange={setPeriodo}
        display={periodoLabel} style={{ minWidth: 130, flexGrow: 1 }} compact
      />
      {remoto ? (
        <View style={{ flexGrow: 1, minWidth: 170 }}>
          <Text style={st.lbl}>{NOMBRE_ROL[rol]}</Text>
          <Pressable onPress={() => setCuenta(true)} style={[st.roleWrap, { paddingVertical: 7, paddingHorizontal: 10 }]}>
            <Text style={st.roleTxt} numberOfLines={1}>{usuario} ▾</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexGrow: 1, minWidth: 170 }}>
          <Text style={st.lbl}>Perfil (demo local)</Text>
          <View style={st.roleWrap}>
            {(['admin', 'precios', 'lector'] as const).map((r) => (
              <Pressable key={r} onPress={() => setRol(r)} style={[st.role, rol === r && st.roleOn]}>
                <Text style={[st.roleTxt, rol === r && { color: '#fff' }]}>{NOMBRE_ROL[r]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {cuenta && <Cuenta onClose={() => setCuenta(false)} />}
    </View>
  );

  const nav = visibles.map((x) => {
    const on = x.key === screen;
    return (
      <Pressable
        key={x.key}
        onPress={() => setScreen(x.key)}
        style={({ hovered }: any) => [wide ? st.side : st.tab, on && (wide ? st.sideOn : st.tabOn), hovered && !on && { backgroundColor: 'rgba(255,255,255,0.08)' }]}
      >
        <Text style={[st.navIcon, on && { color: wide ? '#fff' : C.brand }]}>{x.icon}</Text>
        <Text style={[wide ? st.sideTxt : st.tabTxt, on && { color: wide ? '#fff' : C.brand, fontWeight: '800' }]}>{x.label}</Text>
      </Pressable>
    );
  });

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
        <View style={st.sidebar}>
          <View style={{ padding: 18, paddingBottom: 22 }}>
            <Text style={st.brandTop}>Los Granos</Text>
            <Text style={st.brandApp}>Comparador PVP</Text>
          </View>
          {nav}
        </View>
        <View style={{ flex: 1 }}>
          <View style={st.header}>{filtros}</View>
          <ScrollView contentContainerStyle={st.content}>{children}</ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={st.mHead}>
        <Text style={st.brandApp}>Comparador PVP <Text style={{ color: C.accent }}>Los Granos</Text></Text>
      </View>
      <View style={st.header}>{filtros}</View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabs} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {nav}
      </ScrollView>
      <ScrollView contentContainerStyle={[st.content, { padding: 14 }]}>{children}</ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  sidebar: { width: 220, backgroundColor: C.brandDark, paddingTop: 8 },
  brandTop: { color: C.accent, fontWeight: '800', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  brandApp: { color: '#fff', fontWeight: '800', fontSize: 18 },
  side: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 18, marginHorizontal: 8, borderRadius: 10 },
  sideOn: { backgroundColor: C.brand },
  sideTxt: { color: '#D5E3D3', fontSize: 14, fontWeight: '600' },
  navIcon: { color: '#9DB89A', fontSize: 15, width: 18, textAlign: 'center' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: C.line, paddingHorizontal: 16, paddingVertical: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' },
  lbl: { fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: '600' },
  roleWrap: { flexDirection: 'row', borderWidth: 1, borderColor: C.line, borderRadius: 10, overflow: 'hidden' },
  role: { flex: 1, paddingVertical: 7, paddingHorizontal: 8, alignItems: 'center', backgroundColor: '#fff' },
  roleOn: { backgroundColor: C.accent },
  roleTxt: { fontSize: 12, fontWeight: '700', color: C.ink },
  content: { padding: 22, maxWidth: 1300, width: '100%' },
  mHead: { backgroundColor: C.brandDark, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  tabs: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: C.line, flexGrow: 0, flexShrink: 0, minHeight: 46 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 3, borderColor: 'transparent' },
  tabOn: { borderColor: C.brand },
  tabTxt: { color: C.muted, fontSize: 13, fontWeight: '600' },
});
