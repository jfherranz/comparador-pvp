import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Foto, Maestros, Precio, Rol, TODAS } from '../types';
import { MAESTROS_INICIALES } from '../data/maestros';
import seed from '../data/seed.json';
import { periodoDe, uid } from '../logic/calc';
import { aviso } from '../logic/util';
import { deleteFoto, loadJSON, saveFoto, saveJSON } from './storage';
import * as R from './remoto';

type MaestroTipo = keyof Maestros;

/** cargando → (login) → listo.  En modo local nunca pasa por login. */
export type Estado = 'cargando' | 'login' | 'sinPerfil' | 'listo';

type Ctx = {
  ready: boolean;
  estado: Estado;
  remoto: boolean;
  usuario: string | null; // correo del usuario conectado (modo Supabase)
  salir: () => Promise<void>;
  recargar: () => Promise<void>;
  trasEntrar: () => Promise<void>; // la pantalla de login lo llama después de iniciar sesión
  precios: Precio[];
  fotos: Foto[];
  maestros: Maestros;
  rol: Rol;
  setRol: (r: Rol) => void; // solo modo local (demo)
  cadena: string;
  setCadena: (c: string) => void;
  periodo: string;
  setPeriodo: (p: string) => void;
  periodos: string[];
  // precios
  updatePrecio: (id: string, patch: Partial<Precio>) => void;
  deletePrecio: (id: string) => void;
  guardarCarga: (foto: Omit<Foto, 'id' | 'createdAt'>, dataUri: string, filas: Omit<Precio, 'id' | 'fotoId'>[]) => Promise<void>;
  deleteFotoYPrecios: (fotoId: string) => Promise<void>;
  // maestros
  addMaestro: (tipo: MaestroTipo, nombre: string) => void;
  renameMaestro: (tipo: MaestroTipo, viejo: string, nuevo: string) => void;
  removeMaestro: (tipo: MaestroTipo, nombre: string) => void;
  moveMaestro: (tipo: MaestroTipo, nombre: string, dir: -1 | 1) => void;
  restaurarDatosPartida: () => void; // solo modo local
  subirDatosPartida: () => Promise<void>; // solo modo Supabase, base vacía
  hayDatosPartida: boolean; // seed.json disponible (no existe en la versión publicada)
};

const AppContext = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppContext);

const SEED = seed as Precio[];
const K = { precios: 'precios', fotos: 'fotos', maestros: 'maestros', rol: 'rol' };
const ultimoPeriodo = (ps: Precio[]) => [...new Set(ps.map((x) => periodoDe(x.fecha)))].sort().pop();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const remoto = R.REMOTO;
  const [estado, setEstado] = useState<Estado>('cargando');
  const [usuario, setUsuario] = useState<string | null>(null);
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [maestros, setMaestros] = useState<Maestros>(MAESTROS_INICIALES);
  const [rol, setRolState] = useState<Rol>(remoto ? 'precios' : 'admin');
  const [cadena, setCadena] = useState<string>(TODAS);
  const [periodo, setPeriodo] = useState<string>(TODAS);
  const ready = estado === 'listo';
  const periodoFijado = useRef(false);

  const aplicarDatos = (p: Precio[], f: Foto[], m: Maestros) => {
    setPrecios(p);
    setFotos(f);
    setMaestros(m);
    if (!periodoFijado.current) {
      const u = ultimoPeriodo(p);
      if (u) setPeriodo(u); // último mes con datos
      periodoFijado.current = true;
    }
  };

  // ───────── Carga inicial ─────────
  const cargarRemoto = useCallback(async () => {
    try {
      const perfil = await R.miPerfil();
      if (!perfil) { setEstado('sinPerfil'); return; }
      setUsuario(perfil.email);
      setRolState(perfil.rol);
      const d = await R.cargarTodo();
      aplicarDatos(d.precios, d.fotos, d.maestros);
      setEstado('listo');
    } catch (e: any) {
      aviso('No se pudieron cargar los datos', e?.message ?? String(e));
      setEstado('login');
    }
  }, []);

  useEffect(() => {
    if (remoto) {
      const sb = R.supabase!;
      sb.auth.getSession().then(({ data }) => (data.session ? cargarRemoto() : setEstado('login')));
      const { data: sub } = sb.auth.onAuthStateChange((ev) => {
        if (ev === 'SIGNED_OUT') {
          setEstado('login'); setUsuario(null); setPrecios([]); setFotos([]); periodoFijado.current = false;
        }
      });
      return () => sub.subscription.unsubscribe();
    }
    (async () => {
      const [p, f, m, r] = await Promise.all([
        loadJSON<Precio[]>(K.precios), loadJSON<Foto[]>(K.fotos), loadJSON<Maestros>(K.maestros), loadJSON<Rol>(K.rol),
      ]);
      aplicarDatos(p ?? SEED, f ?? [], m ?? MAESTROS_INICIALES);
      if (r) setRolState(r);
      setEstado('listo');
    })();
  }, []);

  // Persistencia local (solo sin Supabase)
  useEffect(() => { if (ready && !remoto) saveJSON(K.precios, precios); }, [precios, ready]);
  useEffect(() => { if (ready && !remoto) saveJSON(K.fotos, fotos); }, [fotos, ready]);
  useEffect(() => { if (ready && !remoto) saveJSON(K.maestros, maestros); }, [maestros, ready]);

  const trasEntrar = async () => { setEstado('cargando'); await cargarRemoto(); };
  const setRol = (r: Rol) => { if (remoto) return; setRolState(r); saveJSON(K.rol, r); };
  const salir = async () => { if (remoto) await R.salir(); };
  const recargar = async () => {
    if (!remoto) return;
    const d = await R.cargarTodo();
    aplicarDatos(d.precios, d.fotos, d.maestros);
  };

  /** Ejecuta el cambio en Supabase; si falla, avisa y vuelve a leer los datos del servidor. */
  const sync = (p: Promise<unknown>) => {
    if (!remoto) return;
    p.catch(async (e) => {
      aviso('No se guardó el cambio', e?.message ?? String(e));
      try { await recargar(); } catch { /* sin conexión */ }
    });
  };

  const periodos = useMemo(
    () => [...new Set(precios.map((x) => periodoDe(x.fecha)))].sort().reverse(),
    [precios],
  );

  // ───────── Precios ─────────
  const updatePrecio = useCallback((id: string, patch: Partial<Precio>) => {
    setPrecios((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)));
    sync(R.actualizarPrecio(id, patch));
  }, []);
  const deletePrecio = useCallback((id: string) => {
    setPrecios((ps) => ps.filter((p) => p.id !== id));
    sync(R.borrarPrecio(id));
  }, []);

  const guardarCarga: Ctx['guardarCarga'] = async (foto, dataUri, filas) => {
    const ahora = new Date().toISOString();
    const nuevaFoto: Foto = { ...foto, id: uid(), createdAt: ahora };
    const nuevos: Precio[] = filas.map((f) => ({ ...f, id: uid(), fotoId: nuevaFoto.id, updatedAt: ahora }));
    if (remoto) await R.guardarCarga(nuevaFoto, dataUri, nuevos); // si falla, lanza error y no se agrega nada
    else await saveFoto(nuevaFoto.id, dataUri);
    setFotos((fs) => [...fs, nuevaFoto]);
    setPrecios((ps) => [...ps, ...nuevos]);
  };

  const deleteFotoYPrecios = async (fotoId: string) => {
    if (remoto) await R.borrarFoto(fotoId);
    else await deleteFoto(fotoId);
    setFotos((fs) => fs.filter((f) => f.id !== fotoId));
    setPrecios((ps) => ps.filter((p) => p.fotoId !== fotoId));
  };

  // ───────── Maestros ─────────
  const campo: Record<MaestroTipo, 'cadena' | 'producto' | 'marca'> = { cadenas: 'cadena', productos: 'producto', marcas: 'marca' };

  const addMaestro = (tipo: MaestroTipo, nombre: string) => {
    const n = nombre.trim();
    if (!n || maestros[tipo].includes(n)) return;
    setMaestros((m) => ({ ...m, [tipo]: [...m[tipo], n] }));
    sync(R.agregarMaestro(tipo, n, maestros[tipo].length + 1));
  };
  const renameMaestro = (tipo: MaestroTipo, viejo: string, nuevo: string) => {
    const n = nuevo.trim();
    if (!n || n === viejo) return;
    setMaestros((m) => ({ ...m, [tipo]: m[tipo].map((x) => (x === viejo ? n : x)) }));
    const f = campo[tipo];
    setPrecios((ps) => ps.map((p) => (p[f] === viejo ? { ...p, [f]: n } : p)));
    if (tipo === 'cadenas') {
      setFotos((fs) => fs.map((x) => (x.cadena === viejo ? { ...x, cadena: n } : x)));
      if (cadena === viejo) setCadena(n);
    }
    sync(R.renombrarMaestro(tipo, viejo, n));
  };
  const removeMaestro = (tipo: MaestroTipo, nombre: string) => {
    setMaestros((m) => ({ ...m, [tipo]: m[tipo].filter((x) => x !== nombre) }));
    sync(R.quitarMaestro(tipo, nombre));
  };
  const moveMaestro = (tipo: MaestroTipo, nombre: string, dir: -1 | 1) => {
    const arr = [...maestros[tipo]];
    const i = arr.indexOf(nombre);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setMaestros((m) => ({ ...m, [tipo]: arr }));
    sync(R.ordenarMaestros(tipo, arr));
  };

  const restaurarDatosPartida = () => {
    if (remoto) return;
    setPrecios((ps) => [...SEED, ...ps.filter((p) => p.fotoId)]);
  };

  /** Modo Supabase: sube maestros y precios de noviembre a una base vacía. */
  const subirDatosPartida = async () => {
    await R.cargarDatosPartida(MAESTROS_INICIALES, SEED);
    periodoFijado.current = false;
    await recargar();
  };
  const hayDatosPartida = SEED.length > 0;

  return (
    <AppContext.Provider
      value={{
        ready, estado, remoto, usuario, salir, recargar,
        precios, fotos, maestros, rol, setRol, cadena, setCadena, periodo, setPeriodo, periodos,
        updatePrecio, deletePrecio, guardarCarga, deleteFotoYPrecios,
        addMaestro, renameMaestro, removeMaestro, moveMaestro, restaurarDatosPartida,
        trasEntrar, subirDatosPartida, hayDatosPartida,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
