import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Badge, Btn, Card, Empty, Field, H, Row, Select, Sub, s as ui } from '../components/ui';
import { useApp } from '../store/AppContext';
import { clp, efectivo, hoy, porKg, uid } from '../logic/calc';
import { aviso, reducirImagen } from '../logic/util';
import {
  AnalisisMensual, ArchivoCarpeta, buscarImagen, elegirCarpeta, imagenReducida, leerAnalisis,
} from '../logic/importar';
import { C } from '../theme';

type Fila = {
  key: string; producto: string; marca: string; formato: string; normal: string; oferta: string; obs: string;
  confianza?: 'alta' | 'media' | 'baja';
};
type Item = {
  key: string; dataUri: string | null; archivo: string; cadena: string; fecha: string; filas: Fila[];
  nota?: string; origen: 'analisis' | 'manual';
};

const num = (s: string) => {
  const n = Number(s.replace(/[.$\s]/g, '').replace(',', '.'));
  return s.trim() && !isNaN(n) && n > 0 ? n : null;
};
const filaVacia = (): Fila => ({ key: uid(), producto: '', marca: '', formato: '1000', normal: '', oferta: '', obs: '' });
const sinTilde = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
/** Ajusta un nombre leído al maestro (ignora mayúsculas y tildes); si no calza, queda vacío para elegirlo. */
const alMaestro = (v: string, lista: string[]) => lista.find((x) => sinTilde(x) === sinTilde(v ?? '')) ?? '';

function errorFila(f: Fila, prods: string[], marcas: string[]): string | null {
  if (!prods.includes(f.producto)) return 'Elige un producto';
  if (!marcas.includes(f.marca)) return 'Elige una marca';
  if (!num(f.formato)) return 'Falta formato';
  if (!num(f.normal) && !num(f.oferta)) return 'Falta precio';
  return null;
}
function errorItem(it: Item, cadenas: string[]): string | null {
  if (!it.dataUri) return 'No se encontró la imagen en la carpeta';
  if (!cadenas.includes(it.cadena)) return 'Elige la cadena';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(it.fecha)) return 'Fecha inválida (AAAA-MM-DD)';
  return null;
}

export default function Cargar() {
  const { rol, maestros, fotos, guardarCarga } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [archivos, setArchivos] = useState<ArchivoCarpeta[] | null>(null);
  const [analisis, setAnalisis] = useState<{ nombre: string; data: AnalisisMensual }[]>([]);
  const [elegido, setElegido] = useState('');
  const [info, setInfo] = useState<string>('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cadenaManual, setCadenaManual] = useState(maestros.cadenas[0]);
  const [fechaManual, setFechaManual] = useState(hoy());

  const upd = (key: string, patch: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const updFila = (ik: string, fk: string, patch: Partial<Fila>) =>
    setItems((xs) => xs.map((x) => (x.key === ik ? { ...x, filas: x.filas.map((f) => (f.key === fk ? { ...f, ...patch } : f)) } : x)));

  // ---- Importar análisis mensual ----
  const cargarAnalisis = async (arch: ArchivoCarpeta[], a: { nombre: string; data: AnalisisMensual }) => {
    setCargando(true);
    const yaImportadas = new Set(fotos.map((f) => f.nombre));
    const nuevos: Item[] = [];
    let saltadas = 0, sinImagen = 0;
    for (const f of a.data.fotos) {
      if (yaImportadas.has(f.archivo)) { saltadas++; continue; }
      const file = buscarImagen(arch, f.archivo);
      let dataUri: string | null = null;
      if (file && !/\.heic$/i.test(file.name)) dataUri = await imagenReducida(file);
      if (!dataUri) sinImagen++;
      nuevos.push({
        key: uid(), dataUri, archivo: f.archivo, origen: 'analisis', nota: f.nota,
        cadena: alMaestro(f.cadena, maestros.cadenas) || f.cadena,
        fecha: f.fecha,
        filas: f.precios.map((p) => ({
          key: uid(),
          producto: alMaestro(p.producto, maestros.productos),
          marca: alMaestro(p.marca, maestros.marcas),
          formato: p.formato ? String(p.formato) : '',
          normal: p.pvpNormal ? String(p.pvpNormal) : '',
          oferta: p.pvpOferta ? String(p.pvpOferta) : '',
          obs: p.obs ?? '',
          confianza: p.confianza,
        })),
      });
    }
    setItems((xs) => [...xs.filter((x) => x.origen === 'manual'), ...nuevos]);
    setInfo(
      `${a.nombre}: ${a.data.fotos.length} fotos analizadas · ${nuevos.length} por revisar` +
      (saltadas ? ` · ${saltadas} ya importadas antes` : '') + (sinImagen ? ` · ${sinImagen} sin imagen encontrada` : ''),
    );
    setCargando(false);
  };

  const procesarCarpeta = async (arch: ArchivoCarpeta[]) => {
    if (!arch.length) return;
    setCargando(true);
    const lista = await leerAnalisis(arch);
    setArchivos(arch);
    setAnalisis(lista);
    if (!lista.length) {
      setCargando(false);
      setInfo('');
      aviso('Sin análisis', 'No encontré archivos analisis_*.json en Fotos\\_analisis. ¿Elegiste la carpeta Fotos? ¿Ya corrió la tarea mensual?');
      return;
    }
    setElegido(lista[0].nombre);
    await cargarAnalisis(arch, lista[0]);
  };

  // Gancho de prueba en desarrollo (navegador): window.__cargarCarpeta([{ ruta, file }])
  const ref = useRef(procesarCarpeta);
  ref.current = procesarCarpeta;
  useEffect(() => {
    if (Platform.OS === 'web' && __DEV__) (window as any).__cargarCarpeta = (a: ArchivoCarpeta[]) => ref.current(a);
  }, []);

  if (rol !== 'admin') return <Card><Empty text="Solo el editor puede cargar fotos." /></Card>;

  // ---- Fotos a mano ----
  const agregarManual = async (camara: boolean) => {
    if (camara) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const r = camara
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, base64: true, quality: 0.7 });
    if (r.canceled) return;
    const nuevos: Item[] = [];
    for (const a of r.assets) {
      let uri = a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : a.uri;
      uri = await reducirImagen(uri);
      nuevos.push({
        key: uid(), dataUri: uri, archivo: `manual/${a.fileName ?? uid()}`, origen: 'manual',
        cadena: cadenaManual, fecha: fechaManual, filas: [filaVacia()],
      });
    }
    setItems((xs) => [...xs, ...nuevos]);
  };

  // ---- Guardar ----
  const guardables = items.filter((i) => i.filas.length && !errorItem(i, maestros.cadenas));
  const totalFilas = guardables.reduce((n, i) => n + i.filas.length, 0);
  const errores = guardables.flatMap((i) => i.filas.map((f) => errorFila(f, maestros.productos, maestros.marcas))).filter(Boolean).length;
  const bloqueados = items.filter((i) => i.filas.length && errorItem(i, maestros.cadenas)).length;

  const guardar = async () => {
    if (errores) { aviso('Revisa las filas', `Hay ${errores} filas incompletas (marcadas en rojo).`); return; }
    setGuardando(true);
    let fotosOk = 0, preciosOk = 0;
    let fallo: string | null = null;
    const guardadas = new Set<string>();
    for (const it of guardables) {
      try {
        await guardarCarga(
          { cadena: it.cadena, fecha: it.fecha, nombre: it.archivo },
          it.dataUri!,
          it.filas.map((f) => ({
            fecha: it.fecha, cadena: it.cadena, sala: 'General', producto: f.producto, marca: f.marca, formato: num(f.formato)!,
            pvpNormal: num(f.normal), pvpOferta: num(f.oferta), reponedor: it.origen === 'analisis' ? 'Tarea mensual' : 'Foto app', obs: f.obs,
          })),
        );
      } catch (e: any) {
        fallo = `${it.archivo ?? 'Foto'}: ${e?.message ?? String(e)}`;
        break;
      }
      guardadas.add(it.key);
      fotosOk++; preciosOk += it.filas.length;
    }
    setItems((xs) => xs.filter((i) => !guardadas.has(i.key)));
    setGuardando(false);
    if (fallo) aviso('Guardado incompleto', `${fotosOk} fotos y ${preciosOk} precios guardados. Se detuvo en ${fallo}. Las fotos pendientes siguen en pantalla para reintentar.`);
    else aviso('Guardado', `${fotosOk} fotos y ${preciosOk} precios guardados.`);
  };

  return (
    <View>
      <H>Cargar fotos</H>
      <Sub>
        Una tarea programada lee las fotos el día 15 de cada mes y deja los precios propuestos. Aquí los revisas, corriges y guardas;
        cada precio queda unido a su foto.
      </Sub>

      <Card title="1. Análisis mensual de fotos">
        <Text style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>
          Deja las fotos en <Text style={{ fontWeight: '700', color: C.ink }}>Comparador PVP\Fotos\[Cadena]</Text>. El día 15 a las 06:00 Claude
          las analiza y guarda el resultado en Fotos\_analisis. Después elige aquí la carpeta <Text style={{ fontWeight: '700', color: C.ink }}>Fotos</Text>.
        </Text>
        {Platform.OS === 'web' ? (
          <Row style={{ alignItems: 'flex-end' }}>
            <Btn label={cargando ? 'Leyendo…' : 'Elegir carpeta Fotos'} disabled={cargando} onPress={async () => procesarCarpeta(await elegirCarpeta())} />
            {analisis.length > 1 && (
              <Select
                label="Análisis" value={elegido} options={analisis.map((a) => a.nombre)} style={{ minWidth: 240 }}
                onChange={(n) => { setElegido(n); const a = analisis.find((x) => x.nombre === n); if (a && archivos) cargarAnalisis(archivos, a); }}
              />
            )}
            {cargando && <ActivityIndicator color={C.brand} />}
          </Row>
        ) : (
          <Text style={{ color: C.muted }}>La importación del análisis se hace desde el navegador del computador.</Text>
        )}
        {info ? <Text style={{ marginTop: 10, fontWeight: '600', color: C.ink }}>{info}</Text> : null}
      </Card>

      <Card
        title="Agregar fotos a mano (opcional)"
        right={
          <Row>
            <Btn small kind="ghost" label="Elegir fotos" onPress={() => agregarManual(false)} />
            {Platform.OS !== 'web' && <Btn small kind="ghost" label="Tomar foto" onPress={() => agregarManual(true)} />}
          </Row>
        }
      >
        <Row style={{ alignItems: 'flex-end' }}>
          <Select label="Cadena" value={cadenaManual} options={maestros.cadenas} onChange={setCadenaManual} style={{ minWidth: 180 }} compact />
          <Field label="Fecha (AAAA-MM-DD)" value={fechaManual} onChangeText={setFechaManual} style={{ minWidth: 160 }} />
        </Row>
      </Card>

      <Card title={`2. Revisar (${items.length} fotos)`}>
        {!items.length && <Empty text="Aún no hay fotos por revisar." />}
        {items.map((it, idx) => {
          const eItem = errorItem(it, maestros.cadenas);
          return (
            <View key={it.key} style={{ borderTopWidth: idx ? 1 : 0, borderColor: C.line, paddingVertical: 14 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                {it.dataUri ? (
                  <Image source={{ uri: it.dataUri }} style={{ width: 220, height: 220, borderRadius: 10, backgroundColor: '#111' }} resizeMode="contain" />
                ) : (
                  <View style={{ width: 220, height: 220, borderRadius: 10, backgroundColor: C.redSoft, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                    <Text style={{ color: C.red, textAlign: 'center' }}>Imagen no encontrada{'\n'}{it.archivo}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 300 }}>
                  <Row style={{ marginBottom: 8, justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <Row style={{ alignItems: 'flex-end' }}>
                      <Select label="Cadena" value={it.cadena} options={maestros.cadenas} onChange={(v) => upd(it.key, { cadena: v })} style={{ minWidth: 160 }} compact />
                      <Field label="Fecha" value={it.fecha} onChangeText={(v) => upd(it.key, { fecha: v })} style={{ width: 120 }} />
                      <Badge text={`${it.filas.length} precios`} tone={it.filas.length ? 'good' : 'neutral'} />
                    </Row>
                    <Row>
                      <Btn small kind="ghost" label="+ Fila" onPress={() => upd(it.key, { filas: [...it.filas, filaVacia()] })} />
                      <Btn small kind="danger" label="Descartar" onPress={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} />
                    </Row>
                  </Row>
                  <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{it.archivo}</Text>
                  {it.nota ? <Text style={{ color: C.ink, fontSize: 12, marginBottom: 6, fontStyle: 'italic' }}>Nota del análisis: {it.nota}</Text> : null}
                  {eItem && <Text style={{ color: C.red, fontWeight: '700', marginBottom: 6 }}>{eItem}</Text>}
                  {!it.filas.length && <Text style={{ color: C.muted }}>El análisis no encontró flejes en esta foto. Agrega filas o descártala.</Text>}
                  {it.filas.map((f) => {
                    const err = errorFila(f, maestros.productos, maestros.marcas);
                    const prev = { pvpNormal: num(f.normal), pvpOferta: num(f.oferta), formato: num(f.formato) ?? 0 };
                    return (
                      <View key={f.key} style={{ borderWidth: 1, borderColor: err ? C.red : C.line, borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: f.confianza === 'baja' ? '#FFF9EC' : '#fff' }}>
                        <Row style={{ alignItems: 'flex-end' }}>
                          <Select label="Producto" value={f.producto} options={maestros.productos} onChange={(v) => updFila(it.key, f.key, { producto: v })} style={{ minWidth: 230, flexGrow: 2 }} compact />
                          <Select label="Marca" value={f.marca} options={maestros.marcas} onChange={(v) => updFila(it.key, f.key, { marca: v })} style={{ minWidth: 140, flexGrow: 1 }} compact />
                          <Field label="Gramos" value={f.formato} onChangeText={(v) => updFila(it.key, f.key, { formato: v })} numeric style={{ width: 80 }} />
                          <Field label="PVP normal" value={f.normal} onChangeText={(v) => updFila(it.key, f.key, { normal: v })} numeric style={{ width: 95 }} />
                          <Field label="Oferta / mayor" value={f.oferta} onChangeText={(v) => updFila(it.key, f.key, { oferta: v })} numeric style={{ width: 105 }} />
                        </Row>
                        <Row style={{ marginTop: 6, alignItems: 'center' }}>
                          <TextInput value={f.obs} onChangeText={(v) => updFila(it.key, f.key, { obs: v })} placeholder="Observación / texto del fleje" style={[ui.input, { flexGrow: 1, minWidth: 220, marginBottom: 0 }]} />
                          <Text style={{ fontSize: 12, color: C.muted }}>Efectivo {clp(efectivo(prev))} · {clp(porKg(prev))}/kg</Text>
                          {f.confianza === 'baja' && <Badge text="Revisar: lectura dudosa" tone="neutral" />}
                          {err && <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>{err}</Text>}
                          <Pressable onPress={() => upd(it.key, { filas: it.filas.filter((x) => x.key !== f.key) })}>
                            <Text style={{ color: C.red, fontSize: 18, paddingHorizontal: 6 }}>×</Text>
                          </Pressable>
                        </Row>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      <Card title="3. Guardar">
        <Row>
          <Text style={{ color: C.muted }}>
            {guardables.length} fotos · {totalFilas} precios listos{errores ? ` · ${errores} filas por corregir` : ''}
            {bloqueados ? ` · ${bloqueados} fotos con problemas no se guardarán` : ''}
          </Text>
          <Btn label={guardando ? 'Guardando…' : 'Guardar todo'} onPress={guardar} disabled={!totalFilas || guardando} />
        </Row>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
          Las fotos sin precios no se guardan. Una foto ya importada no vuelve a aparecer en el próximo análisis.
        </Text>
      </Card>
    </View>
  );
}
