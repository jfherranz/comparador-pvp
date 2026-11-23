import React, { useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle,
} from 'react-native';
import { C } from '../theme';

export function Card({ children, style, title, right }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; title?: string; right?: React.ReactNode;
}) {
  return (
    <View style={[s.card, style]}>
      {(title || right) && (
        <View style={s.cardHead}>
          {title ? <Text style={s.cardTitle}>{title}</Text> : <View />}
          {right ? <View style={{ flexShrink: 1, maxWidth: '100%', minWidth: 0 }}>{right}</View> : null}
        </View>
      )}
      {children}
    </View>
  );
}

export function Btn({ label, onPress, kind = 'primary', small, disabled, style }: {
  label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; small?: boolean; disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === 'primary' ? C.brand : kind === 'danger' ? C.red : 'transparent';
  const fg = kind === 'ghost' ? C.brand : '#fff';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed, hovered }: any) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: bg, borderColor: kind === 'ghost' ? C.brand : bg, opacity: disabled ? 0.4 : pressed ? 0.75 : hovered ? 0.9 : 1 },
        style,
      ]}
    >
      <Text style={[s.btnText, small && { fontSize: 12 }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

/** Selector: abre una lista modal con buscador. */
export function Select({ label, value, options, onChange, display, style, compact }: {
  label?: string; value: string; options: string[]; onChange: (v: string) => void;
  display?: (v: string) => string; style?: StyleProp<ViewStyle>; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const show = display ?? ((v: string) => v);
  const filtered = options.filter((o) => show(o).toLowerCase().includes(q.toLowerCase()));
  return (
    <View style={style}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <Pressable onPress={() => { setQ(''); setOpen(true); }} style={[s.select, compact && { paddingVertical: 6 }]}>
        <Text style={s.selectText} numberOfLines={1}>{value ? show(value) : 'Elegir…'}</Text>
        <Text style={{ color: C.muted }}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>{label ?? 'Elegir'}</Text>
            {options.length > 8 && (
              <TextInput placeholder="Buscar…" value={q} onChangeText={setQ} style={s.input} autoFocus />
            )}
            <ScrollView style={{ maxHeight: 420 }}>
              {filtered.map((o) => (
                <Pressable
                  key={o}
                  onPress={() => { onChange(o); setOpen(false); }}
                  style={({ hovered }: any) => [s.option, o === value && s.optionActive, hovered && { backgroundColor: C.brandSoft }]}
                >
                  <Text style={[s.optionText, o === value && { color: C.brand, fontWeight: '700' }]}>{show(o)}</Text>
                </Pressable>
              ))}
              {!filtered.length && <Text style={{ color: C.muted, padding: 12 }}>Sin resultados</Text>}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Field({ label, value, onChangeText, numeric, placeholder, style, editable = true, multiline, secure }: {
  label?: string; value: string; onChangeText: (t: string) => void; numeric?: boolean; placeholder?: string;
  style?: StyleProp<ViewStyle>; editable?: boolean; multiline?: boolean; secure?: boolean;
}) {
  return (
    <View style={style}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholder={placeholder}
        editable={editable}
        multiline={multiline}
        secureTextEntry={secure}
        style={[s.input, !editable && { backgroundColor: '#F0EEE8', color: C.muted }]}
      />
    </View>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? C.green : tone === 'bad' ? C.red : C.ink;
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

export function Badge({ text, tone }: { text: string; tone: 'good' | 'bad' | 'neutral' }) {
  const bg = tone === 'good' ? C.greenSoft : tone === 'bad' ? C.redSoft : '#EEE';
  const fg = tone === 'good' ? C.green : tone === 'bad' ? C.red : C.muted;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: 12 }}>{text}</Text>
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={{ color: C.muted, padding: 16, textAlign: 'center' }}>{text}</Text>;
}

export function H({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontSize: 22, fontWeight: '800', color: C.ink, marginBottom: 4 }, style]}>{children}</Text>;
}
export function Sub({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: C.muted, marginBottom: 14 }}>{children}</Text>;
}

/** Tabla simple con anchos fijos por columna y scroll horizontal. */
export function Table({ cols, rows, onRowPress, maxHeight }: {
  cols: { key: string; label: string; w: number; align?: 'left' | 'right' | 'center' }[];
  rows: { key: string; cells: Record<string, React.ReactNode>; style?: Record<string, StyleProp<ViewStyle>> }[];
  onRowPress?: (key: string) => void;
  maxHeight?: number;
}) {
  const body = rows.map((r, i) => (
    <Pressable
      key={r.key}
      onPress={onRowPress ? () => onRowPress(r.key) : undefined}
      style={({ hovered }: any) => [s.tr, i % 2 === 1 && { backgroundColor: '#FAF9F6' }, hovered && onRowPress && { backgroundColor: C.brandSoft }]}
    >
      {cols.map((c) => {
        const v = r.cells[c.key];
        return (
          <View key={c.key} style={[s.td, { width: c.w, alignItems: c.align === 'right' ? 'flex-end' : c.align === 'center' ? 'center' : 'flex-start' }, r.style?.[c.key]]}>
            {typeof v === 'string' || typeof v === 'number' ? <Text style={s.tdText} numberOfLines={2}>{v}</Text> : v}
          </View>
        );
      })}
    </Pressable>
  ));
  return (
    <ScrollView horizontal>
      <View>
        <View style={s.thRow}>
          {cols.map((c) => (
            <View key={c.key} style={[s.th, { width: c.w, alignItems: c.align === 'right' ? 'flex-end' : c.align === 'center' ? 'center' : 'flex-start' }]}>
              <Text style={s.thText} numberOfLines={2}>{c.label}</Text>
            </View>
          ))}
        </View>
        {maxHeight ? <ScrollView style={{ maxHeight }}>{body}</ScrollView> : body}
      </View>
    </ScrollView>
  );
}

export function Row({ children, style, wrap = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export const s = StyleSheet.create({
  card: {
    backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: C.line,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  btnSmall: { paddingHorizontal: 10, paddingVertical: 6 },
  btnText: { fontWeight: '700', fontSize: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff' },
  chipActive: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { fontSize: 13, color: C.ink, fontWeight: '600' },
  label: { fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: '600' },
  select: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#fff', minWidth: 120,
  },
  selectText: { color: C.ink, fontSize: 14, flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '100%', maxWidth: 440 },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, color: C.ink },
  option: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8 },
  optionActive: { backgroundColor: C.brandSoft },
  optionText: { fontSize: 15, color: C.ink },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, backgroundColor: '#fff', color: C.ink, marginBottom: 4 },
  kpi: { flexGrow: 1, flexBasis: 150, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line },
  kpiLabel: { color: C.muted, fontSize: 12, fontWeight: '600' },
  kpiValue: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  kpiSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  thRow: { flexDirection: 'row', borderBottomWidth: 2, borderColor: C.line },
  th: { paddingVertical: 8, paddingHorizontal: 8, justifyContent: 'flex-end' },
  thText: { fontSize: 12, fontWeight: '700', color: C.muted },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#F0EEE8' },
  td: { paddingVertical: 8, paddingHorizontal: 8, justifyContent: 'center' },
  tdText: { fontSize: 13, color: C.ink },
});
