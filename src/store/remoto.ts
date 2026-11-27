// Conexión con Supabase (base de datos compartida, login y fotos).
// Si no están EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, la app funciona en modo local.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { Foto, Maestros, Precio, Rol } from '../types';

const URL_SB = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY_SB = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Al abrir el enlace de invitación (o de recuperación) del correo, la sesión llega en la URL y hay que definir contraseña.
const HASH = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hash : '';
export const VIENE_DE_ENLACE = /type=(invite|recovery)/.test(HASH);
export const ENLACE_INVALIDO = /error_code=/.test(HASH);

export const supabase = URL_SB && KEY_SB
  ? createClient(URL_SB, KEY_SB, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === 'web' },
    })
  : null;

export const REMOTO = !!supabase;
const sb = () => supabase!;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => (s === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()));
}

export type Perfil = { email: string; nombre: string | null; rol: Rol };

function ok<T>(r: { data: T; error: { message: string } | null } | { data: unknown; error: { message: string } }): T {
  if (r.error) throw new Error(traducir(r.error.message));
  return r.data as T;
}
function traducir(m: string) {
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'El correo aún no está confirmado.';
  if (/row-level security|permission denied/i.test(m)) return 'Tu perfil no tiene permiso para este cambio.';
  if (/Failed to fetch|Network request failed/i.test(m)) return 'Sin conexión con el servidor.';
  if (/Password should be/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  return m;
}

// ───────── Sesión ─────────
export async function entrar(email: string, password: string) {
  ok(await sb().auth.signInWithPassword({ email: email.trim(), password }));
}
export async function salir() {
  await sb().auth.signOut();
}
export async function cambiarClave(password: string) {
  ok(await sb().auth.updateUser({ password }));
}
export async function miPerfil(): Promise<Perfil | null> {
  const { data } = await sb().auth.getUser();
  if (!data.user) return null;
  const r = ok(await sb().from('perfiles').select('email, nombre, rol').eq('user_id', data.user.id).maybeSingle());
  return (r as Perfil) ?? null;
}

// ───────── Conversión fila ↔ app ─────────
type FilaPrecio = {
  id: string; fecha: string; cadena: string; sala: string | null; producto: string; marca: string; formato: number;
  pvp_normal: number | null; pvp_oferta: number | null; reponedor: string | null; obs: string | null; foto_id: string | null; actualizado: string;
};
const aPrecio = (r: FilaPrecio): Precio => ({
  id: r.id, fecha: r.fecha, cadena: r.cadena, sala: r.sala ?? undefined, producto: r.producto, marca: r.marca, formato: r.formato,
  pvpNormal: r.pvp_normal, pvpOferta: r.pvp_oferta, reponedor: r.reponedor ?? undefined, obs: r.obs ?? undefined,
  fotoId: r.foto_id, updatedAt: r.actualizado,
});
const aFila = (p: Partial<Precio>) => {
  const f: Record<string, unknown> = {};
  const m: [keyof Precio, string][] = [
    ['id', 'id'], ['fecha', 'fecha'], ['cadena', 'cadena'], ['sala', 'sala'], ['producto', 'producto'], ['marca', 'marca'],
    ['formato', 'formato'], ['pvpNormal', 'pvp_normal'], ['pvpOferta', 'pvp_oferta'], ['reponedor', 'reponedor'], ['obs', 'obs'], ['fotoId', 'foto_id'],
  ];
  for (const [k, c] of m) if (k in p) f[c] = (p[k] ?? null) === '' ? null : p[k] ?? null;
  return f;
};

// ───────── Lectura ─────────
export async function cargarTodo(): Promise<{ precios: Precio[]; fotos: Foto[]; maestros: Maestros }> {
  const precios: Precio[] = [];
  for (let desde = 0; ; desde += 1000) {
    const lote = ok(await sb().from('precios').select('*').order('id').range(desde, desde + 999)) as FilaPrecio[];
    precios.push(...lote.map(aPrecio));
    if (lote.length < 1000) break;
  }
  const fotos = (ok(await sb().from('fotos').select('id, cadena, fecha, nombre, creado').order('creado')) as any[]).map(
    (f): Foto => ({ id: f.id, cadena: f.cadena, fecha: f.fecha, nombre: f.nombre ?? undefined, createdAt: f.creado }),
  );
  const ms = ok(await sb().from('maestros').select('tipo, nombre, orden').order('orden')) as { tipo: keyof Maestros; nombre: string }[];
  const maestros: Maestros = { cadenas: [], productos: [], marcas: [] };
  for (const m of ms) maestros[m.tipo]?.push(m.nombre);
  return { precios, fotos, maestros };
}

// ───────── Precios ─────────
export async function actualizarPrecio(id: string, patch: Partial<Precio>) {
  ok(await sb().from('precios').update(aFila(patch)).eq('id', id));
}
export async function borrarPrecio(id: string) {
  ok(await sb().from('precios').delete().eq('id', id));
}

// ───────── Fotos ─────────
const rutaFoto = (id: string) => `${id}.jpg`;

function dataUriABytes(dataUri: string): { bytes: Uint8Array; tipo: string } {
  const [cab, b64] = dataUri.split(',');
  const tipo = /data:([^;]+)/.exec(cab)?.[1] ?? 'image/jpeg';
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const limpio = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((limpio.length * 3) / 4));
  let j = 0;
  for (let i = 0; i < limpio.length; i += 4) {
    const n = (abc.indexOf(limpio[i]) << 18) | (abc.indexOf(limpio[i + 1]) << 12) |
      ((abc.indexOf(limpio[i + 2]) & 63) << 6) | (abc.indexOf(limpio[i + 3]) & 63);
    bytes[j++] = (n >> 16) & 255;
    if (i + 2 < limpio.length) bytes[j++] = (n >> 8) & 255;
    if (i + 3 < limpio.length) bytes[j++] = n & 255;
  }
  return { bytes: bytes.subarray(0, j), tipo };
}

/** Sube la foto y guarda su registro y sus precios. */
export async function guardarCarga(foto: Foto, dataUri: string, precios: Precio[]) {
  const { bytes, tipo } = dataUriABytes(dataUri);
  ok(await sb().storage.from('fotos').upload(rutaFoto(foto.id), bytes, { contentType: tipo, upsert: true }));
  ok(await sb().from('fotos').insert({ id: foto.id, cadena: foto.cadena, fecha: foto.fecha, nombre: foto.nombre ?? null }));
  if (precios.length) ok(await sb().from('precios').insert(precios.map(aFila)));
}

/** Borra la foto, su archivo y (en cascada) sus precios. */
export async function borrarFoto(id: string) {
  ok(await sb().from('fotos').delete().eq('id', id));
  await sb().storage.from('fotos').remove([rutaFoto(id)]);
  urls.delete(id);
}

// ───────── Fotos de terreno (subidas desde el teléfono, esperan el análisis mensual) ─────────
// Ruta: terreno/<cadena sin tildes ni espacios>/<AAAA-MM-DD>_<hhmmss>_<id>.jpg (Storage no acepta tildes en la ruta).
// El script Fotos\_analisis\bajar_fotos_terreno.ps1 las baja a Fotos\<Cadena>\terreno\ y las borra de aquí.
export const slugCadena = (c: string) =>
  c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export type FotoTerreno = { ruta: string; slug: string; fecha: string; creado: string };

export async function subirFotoTerreno(cadena: string, dataUri: string) {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const nombre = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}_${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { bytes, tipo } = dataUriABytes(dataUri);
  ok(await sb().storage.from('fotos').upload(`terreno/${slugCadena(cadena)}/${nombre}`, bytes, { contentType: tipo }));
}

export async function listarFotosTerreno(): Promise<FotoTerreno[]> {
  const carpetas = (ok(await sb().storage.from('fotos').list('terreno', { limit: 1000 })) as any[]).filter((x) => !x.id);
  const out: FotoTerreno[] = [];
  for (const c of carpetas) {
    const arch = ok(await sb().storage.from('fotos').list(`terreno/${c.name}`, { limit: 1000, sortBy: { column: 'name', order: 'desc' } })) as any[];
    for (const a of arch) {
      if (!a.id) continue;
      out.push({ ruta: `terreno/${c.name}/${a.name}`, slug: c.name, fecha: a.name.slice(0, 10), creado: a.created_at ?? '' });
    }
  }
  return out;
}

export async function borrarFotoTerreno(ruta: string) {
  ok(await sb().storage.from('fotos').remove([ruta]));
}

export async function urlFotoTerreno(ruta: string): Promise<string | undefined> {
  const { data } = await sb().storage.from('fotos').createSignedUrl(ruta, 3600);
  return data?.signedUrl;
}

const urls = new Map<string, { url: string; vence: number }>();
/** URL temporal (1 hora) para mostrar una foto privada. */
export async function urlFoto(id: string): Promise<string | undefined> {
  const c = urls.get(id);
  if (c && c.vence > Date.now()) return c.url;
  const { data } = await sb().storage.from('fotos').createSignedUrl(rutaFoto(id), 3600);
  if (!data?.signedUrl) return undefined;
  urls.set(id, { url: data.signedUrl, vence: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

// ───────── Datos de partida (una sola vez, con la base vacía) ─────────
export async function cargarDatosPartida(maestros: Maestros, precios: Precio[]) {
  const filasM = (Object.keys(maestros) as (keyof Maestros)[]).flatMap((tipo) =>
    maestros[tipo].map((nombre, i) => ({ tipo, nombre, orden: i + 1 })),
  );
  ok(await sb().from('maestros').upsert(filasM, { onConflict: 'tipo,nombre', ignoreDuplicates: true }));
  for (let i = 0; i < precios.length; i += 500) {
    const lote = precios.slice(i, i + 500).map((p) => aFila({ ...p, fotoId: null }));
    ok(await sb().from('precios').upsert(lote, { onConflict: 'id', ignoreDuplicates: true }));
  }
}

// ───────── Maestros ─────────
export async function agregarMaestro(tipo: keyof Maestros, nombre: string, orden: number) {
  ok(await sb().from('maestros').insert({ tipo, nombre, orden }));
}
export async function quitarMaestro(tipo: keyof Maestros, nombre: string) {
  ok(await sb().from('maestros').delete().eq('tipo', tipo).eq('nombre', nombre));
}
export async function renombrarMaestro(tipo: keyof Maestros, viejo: string, nuevo: string) {
  ok(await sb().rpc('renombrar_maestro', { p_tipo: tipo, p_viejo: viejo, p_nuevo: nuevo }));
}
export async function ordenarMaestros(tipo: keyof Maestros, nombres: string[]) {
  ok(await sb().rpc('ordenar_maestros', { p_tipo: tipo, p_nombres: nombres }));
}
