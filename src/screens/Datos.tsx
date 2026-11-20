import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Badge, Btn, Card, Chip, Empty, Field, H, Row, Select, Sub, Table, s as ui } from '../components/ui';
import { useApp } from '../store/AppContext';
import { clp, efectivo, filtrar, periodoLabel, porKg } from '../logic/calc';
import { aviso, confirmar } from '../logic/util';
import { descargarExcelRegistro } from '../export/excel';
import { C } from '../theme';
import { Maestros, Precio, TODAS } from '../types';

const num = (s: string) => {
  const n = Number(s.replace(/[.$\s]/g, '').replace(',', '.'));
  return s.trim() && !isNaN(n) && n > 0 ? n : null;
};
const PAGE = 50;

export default function Datos() {
  const [tab, setTab] = useState<'precios' | 'maestros'>('precios');
  const { rol } = useApp();
  return (
    <View>
      <H>Datos</H>
      <Sub>
        {rol === 'admin'
          ? 'Busca, edita o elimina precios, mantén los listados y descarga el Excel de respaldo.'
          : 'Puedes corregir PVP normal y oferta, y descargar el Excel. El resto lo edita el editor.'}
      </Sub>
      <Row style={{ marginBottom: 14 }}>
        <Chip label="Precios" active={tab === 'precios'} onPress={() => setTab('precios')} />
        <Chip label="Maestros" active={tab === 'maestros'} onPress={() => setTab('maestros')} />
      </Row>
      {tab === 'precios' ? <Precios /> : <MaestrosView />}
    </View>
  );
}

function Precios() {
  const { precios, cadena, periodo, rol, remoto, deletePrecio, restaurarDatosPartida, subirDatosPartida, hayDatosPartida } = useApp();
  const [subiendo, setSubiendo] = useState(false);
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(0);
  const [edit, setEdit] = useState<Precio | null>(null);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filtrar(precios, cadena, periodo)
      .filter((p) => !t || [p.producto, p.marca, p.cadena, p.obs ?? '', p.fecha].some((x) => x.toLowerCase().includes(t)))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.cadena.localeCompare(b.cadena) || a.producto.localeCompare(b.producto));
  }, [precios, cadena, periodo, q]);
  const pag = lista.slice(pagina * PAGE, (pagina + 1) * PAGE);
  const paginas = Math.max(1, Math.ceil(lista.length / PAGE));

  return (
    <>
      <Card
        title="Respaldo"
        right={
          <Row>
            <Btn label="Descargar Excel (Registro v13)" onPress={() => descargarExcelRegistro(precios)} />
            {rol === 'admin' && remoto && hayDatosPartida && precios.length === 0 && (
              <Btn
                label={subiendo ? 'Subiendo…' : 'Cargar datos de partida (noviembre)'}
                disabled={subiendo}
                onPress={async () => {
                  if (!(await confirmar('Cargar datos de partida', 'Se suben al servidor los maestros y los 276 precios de noviembre de la planilla v13.'))) return;
                  setSubiendo(true);
                  try { await subirDatosPartida(); aviso('Listo', 'Datos de partida cargados en el servidor.'); }
                  catch (e: any) { aviso('No se pudieron cargar', e?.message ?? String(e)); }
                  finally { setSubiendo(false); }
                }}
              />
            )}
            {rol === 'admin' && !remoto && (
              <Btn
                kind="ghost"
                label="Restaurar datos de noviembre"
                onPress={async () => {
                  if (await confirmar('Restaurar datos de partida', 'Los precios sin foto vuelven a los 276 de noviembre (se pierden cambios hechos a ellos). Los precios con foto se mantienen.'))
                    restaurarDatosPartida();
                }}
              />
            )}
          </Row>
        }
      >
        <Text style={{ color: C.muted, fontSize: 13 }}>
          El Excel incluye todos los precios ({precios.length}) con las columnas de la hoja Registro: fecha, cadena, sala, producto, marca,
          formato, PVP normal y oferta, efectivo, $/kg, período, semana, $/kg Los Granos, diferencia, alerta, duplicado y clave.
        </Text>
      </Card>

      <Card title={`Precios · ${cadena === TODAS ? 'todas las cadenas' : cadena} · ${periodoLabel(periodo)}`}>
        <TextInput
          value={q}
          onChangeText={(t) => { setQ(t); setPagina(0); }}
          placeholder="Buscar producto, marca, cadena, observación…"
          style={[ui.input, { marginBottom: 10 }]}
        />
        <Text style={{ color: C.muted, marginBottom: 8 }}>{lista.length} registros · toca una fila para editar</Text>
        {pag.length ? (
          <Table
            onRowPress={(id) => setEdit(precios.find((p) => p.id === id) ?? null)}
            cols={[
              { key: 'f', label: 'Fecha', w: 90 },
              { key: 'c', label: 'Cadena', w: 120 },
              { key: 'p', label: 'Producto', w: 210 },
              { key: 'm', label: 'Marca', w: 110 },
              { key: 'g', label: 'g', w: 55, align: 'right' },
              { key: 'n', label: 'Normal', w: 75, align: 'right' },
              { key: 'o', label: 'Oferta', w: 75, align: 'right' },
              { key: 'kg', label: '$/kg', w: 75, align: 'right' },
              { key: 'foto', label: 'Foto', w: 60, align: 'center' },
            ]}
            rows={pag.map((p) => ({
              key: p.id,
              cells: {
                f: p.fecha, c: p.cadena, p: p.producto, m: p.marca, g: String(p.formato), n: clp(p.pvpNormal), o: clp(p.pvpOferta),
                kg: clp(porKg(p)), foto: p.fotoId ? <Badge text="sí" tone="good" /> : <Text style={{ color: C.muted }}>–</Text>,
              },
            }))}
          />
        ) : <Empty text="Sin resultados." />}
        {paginas > 1 && (
          <Row style={{ marginTop: 10, justifyContent: 'center' }}>
            <Btn small kind="ghost" label="‹ Anterior" disabled={pagina === 0} onPress={() => setPagina(pagina - 1)} />
            <Text style={{ color: C.muted }}>Página {pagina + 1} de {paginas}</Text>
            <Btn small kind="ghost" label="Siguiente ›" disabled={pagina >= paginas - 1} onPress={() => setPagina(pagina + 1)} />
          </Row>
        )}
      </Card>

      {edit && <EditarPrecio p={edit} onClose={() => setEdit(null)} onDelete={async () => {
        if (await confirmar('Eliminar precio', `${edit.producto} · ${edit.marca} · ${edit.cadena} (${edit.fecha}). No se puede deshacer.`)) {
          deletePrecio(edit.id); setEdit(null);
        }
      }} />}
    </>
  );
}

function EditarPrecio({ p, onClose, onDelete }: { p: Precio; onClose: () => void; onDelete: () => void }) {
  const { rol, maestros, updatePrecio } = useApp();
  const admin = rol === 'admin';
  const [d, setD] = useState({
    fecha: p.fecha, cadena: p.cadena, producto: p.producto, marca: p.marca, formato: String(p.formato),
    normal: p.pvpNormal ? String(p.pvpNormal) : '', oferta: p.pvpOferta ? String(p.pvpOferta) : '', obs: p.obs ?? '', sala: p.sala ?? '',
  });
  const set = (k: keyof typeof d) => (v: string) => setD({ ...d, [k]: v });
  const prev = { pvpNormal: num(d.normal), pvpOferta: num(d.oferta), formato: num(d.formato) ?? 0 };
  const valido = (num(d.normal) || num(d.oferta)) && num(d.formato) && /^\d{4}-\d{2}-\d{2}$/.test(d.fecha);

  const guardar = () => {
    const patch: Partial<Precio> = { pvpNormal: num(d.normal), pvpOferta: num(d.oferta) };
    if (admin) Object.assign(patch, {
      fecha: d.fecha, cadena: d.cadena, producto: d.producto, marca: d.marca, formato: num(d.formato)!, obs: d.obs, sala: d.sala,
    });
    updatePrecio(p.id, patch);
    onClose();
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={ui.backdrop} onPress={onClose}>
        <Pressable style={[ui.sheet, { maxWidth: 560 }]} onPress={() => {}}>
          <ScrollView>
            <Text style={ui.sheetTitle}>Editar precio</Text>
            {!admin && <Text style={{ color: C.muted, marginBottom: 8, fontSize: 12 }}>Con tu perfil solo puedes modificar los precios.</Text>}
            <Row style={{ alignItems: 'flex-end' }}>
              <Field label="Fecha" value={d.fecha} onChangeText={set('fecha')} editable={admin} style={{ width: 120 }} />
              {admin ? <Select label="Cadena" value={d.cadena} options={maestros.cadenas} onChange={set('cadena')} style={{ minWidth: 160, flexGrow: 1 }} />
                : <Field label="Cadena" value={d.cadena} onChangeText={() => {}} editable={false} style={{ flexGrow: 1 }} />}
            </Row>
            {admin ? <Select label="Producto" value={d.producto} options={maestros.productos} onChange={set('producto')} style={{ marginTop: 6 }} />
              : <Field label="Producto" value={d.producto} onChangeText={() => {}} editable={false} style={{ marginTop: 6 }} />}
            <Row style={{ alignItems: 'flex-end', marginTop: 6 }}>
              {admin ? <Select label="Marca" value={d.marca} options={maestros.marcas} onChange={set('marca')} style={{ minWidth: 160, flexGrow: 1 }} />
                : <Field label="Marca" value={d.marca} onChangeText={() => {}} editable={false} style={{ flexGrow: 1 }} />}
              <Field label="Formato (g)" value={d.formato} onChangeText={set('formato')} numeric editable={admin} style={{ width: 100 }} />
            </Row>
            <Row style={{ alignItems: 'flex-end', marginTop: 6 }}>
              <Field label="PVP normal" value={d.normal} onChangeText={set('normal')} numeric style={{ width: 120 }} />
              <Field label="PVP oferta / mayor" value={d.oferta} onChangeText={set('oferta')} numeric style={{ width: 140 }} />
              <Text style={{ color: C.muted, marginBottom: 12 }}>Efectivo {clp(efectivo(prev))} · {clp(porKg(prev))}/kg</Text>
            </Row>
            <Field label="Observación" value={d.obs} onChangeText={set('obs')} editable={admin} multiline style={{ marginTop: 6 }} />
            <Row style={{ marginTop: 14, justifyContent: 'space-between' }}>
              {admin ? <Btn kind="danger" label="Eliminar" onPress={onDelete} /> : <View />}
              <Row>
                <Btn kind="ghost" label="Cancelar" onPress={onClose} />
                <Btn label="Guardar" onPress={guardar} disabled={!valido} />
              </Row>
            </Row>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MaestrosView() {
  const { maestros, precios, rol, addMaestro, renameMaestro, removeMaestro, moveMaestro } = useApp();
  const [tipo, setTipo] = useState<keyof Maestros>('cadenas');
  const [nuevo, setNuevo] = useState('');
  const [editando, setEditando] = useState<{ viejo: string; nuevo: string } | null>(null);
  const admin = rol === 'admin';
  const campo = { cadenas: 'cadena', productos: 'producto', marcas: 'marca' } as const;
  const usos = (n: string) => precios.filter((p) => p[campo[tipo]] === n).length;
  const titulos = { cadenas: 'Cadenas', productos: 'Productos', marcas: 'Marcas' };

  return (
    <Card
      title={`${titulos[tipo]} (${maestros[tipo].length})`}
      right={
        <Row>
          {(['cadenas', 'productos', 'marcas'] as const).map((t) => (
            <Chip key={t} label={titulos[t]} active={tipo === t} onPress={() => { setTipo(t); setEditando(null); }} />
          ))}
        </Row>
      }
    >
      {admin && (
        <Row style={{ marginBottom: 12 }}>
          <TextInput value={nuevo} onChangeText={setNuevo} placeholder={`Agregar a ${titulos[tipo].toLowerCase()}…`} style={[ui.input, { flexGrow: 1, minWidth: 220, marginBottom: 0 }]} />
          <Btn label="Agregar" disabled={!nuevo.trim()} onPress={() => { addMaestro(tipo, nuevo); setNuevo(''); }} />
        </Row>
      )}
      {tipo === 'productos' && <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>El orden de esta lista es el orden de las tablas y el mapa.</Text>}
      {maestros[tipo].map((n, i) => (
        <Row key={n} wrap={false} style={{ paddingVertical: 7, borderBottomWidth: 1, borderColor: '#F0EEE8' }}>
          <Text style={{ width: 28, color: C.muted, textAlign: 'right' }}>{i + 1}</Text>
          {editando?.viejo === n ? (
            <TextInput value={editando.nuevo} onChangeText={(t) => setEditando({ viejo: n, nuevo: t })} style={[ui.input, { flex: 1, marginBottom: 0 }]} autoFocus />
          ) : (
            <Text style={{ flex: 1, color: C.ink, fontWeight: n === 'Los Granos' ? '800' : '500' }}>{n}</Text>
          )}
          <Text style={{ color: C.muted, fontSize: 12, width: 80, textAlign: 'right' }}>{usos(n)} precios</Text>
          {admin && (editando?.viejo === n ? (
            <>
              <Btn small label="OK" onPress={() => { renameMaestro(tipo, n, editando.nuevo); setEditando(null); }} />
              <Btn small kind="ghost" label="×" onPress={() => setEditando(null)} />
            </>
          ) : (
            <>
              <Btn small kind="ghost" label="↑" disabled={i === 0} onPress={() => moveMaestro(tipo, n, -1)} />
              <Btn small kind="ghost" label="↓" disabled={i === maestros[tipo].length - 1} onPress={() => moveMaestro(tipo, n, 1)} />
              <Btn small kind="ghost" label="Renombrar" onPress={() => setEditando({ viejo: n, nuevo: n })} />
              <Btn
                small kind="danger" label="Quitar" disabled={n === 'Los Granos' || usos(n) > 0}
                onPress={async () => { if (await confirmar('Quitar de la lista', `¿Quitar "${n}"?`)) removeMaestro(tipo, n); }}
              />
            </>
          ))}
        </Row>
      ))}
      {admin && <Text style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>Renombrar actualiza también los precios guardados. Solo se puede quitar un elemento sin precios.</Text>}
    </Card>
  );
}
