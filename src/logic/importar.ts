// Lectura de la carpeta Fotos (en navegador) y del análisis mensual que deja la tarea programada.
import { reducirImagen } from './util';

/** Formato del archivo Fotos/_analisis/analisis_AAAA-MM-DD.json que escribe la tarea mensual. */
export type AnalisisMensual = {
  version: number;
  generado: string;
  fotos: {
    archivo: string; // ruta relativa a Fotos, ej. "Cugat/IMG_0012.jpg"
    cadena: string;
    fecha: string; // AAAA-MM-DD
    fuenteFecha?: string;
    nota?: string;
    precios: {
      producto: string;
      marca: string;
      formato: number | null;
      pvpNormal: number | null;
      pvpOferta: number | null;
      obs: string;
      confianza: 'alta' | 'media' | 'baja';
    }[];
  }[];
};

export type ArchivoCarpeta = { ruta: string; file: File }; // ruta relativa a Fotos, con "/"

/** Convierte la selección del navegador (webkitdirectory) en rutas relativas a la carpeta Fotos. */
export function rutasDesdeSeleccion(files: FileList | File[]): ArchivoCarpeta[] {
  return Array.from(files).map((file) => {
    const full = ((file as any).webkitRelativePath as string) || file.name;
    const partes = full.split('/');
    // la primera parte es el nombre de la carpeta elegida (Fotos); se quita
    return { ruta: partes.length > 1 ? partes.slice(1).join('/') : full, file };
  });
}

export async function leerAnalisis(archivos: ArchivoCarpeta[]) {
  const jsons = archivos
    .filter((a) => /(^|\/)_analisis\/analisis_[^/]+\.json$/i.test(a.ruta))
    .sort((a, b) => b.ruta.localeCompare(a.ruta)); // el más reciente primero
  const out: { nombre: string; data: AnalisisMensual }[] = [];
  for (const j of jsons) {
    try {
      const data = JSON.parse(await j.file.text()) as AnalisisMensual;
      if (Array.isArray(data.fotos)) out.push({ nombre: j.ruta.split('/').pop()!, data });
    } catch {
      // archivo dañado: se ignora
    }
  }
  return out;
}

/** Busca la imagen de una foto del análisis: ruta exacta, luego por terminación, luego por nombre. */
export function buscarImagen(archivos: ArchivoCarpeta[], archivo: string): File | null {
  const norm = (s: string) => s.normalize('NFC').toLowerCase();
  const a = norm(archivo);
  const exact = archivos.find((x) => norm(x.ruta) === a);
  if (exact) return exact.file;
  const fin = archivos.find((x) => norm(x.ruta).endsWith('/' + a) || a.endsWith('/' + norm(x.ruta)));
  if (fin) return fin.file;
  const base = a.split('/').pop()!;
  const porNombre = archivos.filter((x) => norm(x.ruta.split('/').pop()!) === base);
  return porNombre.length === 1 ? porNombre[0].file : null;
}

export function leerComoDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export async function imagenReducida(file: File) {
  return reducirImagen(await leerComoDataUri(file));
}

/** Abre el selector de carpeta del navegador. */
export function elegirCarpeta(): Promise<ArchivoCarpeta[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    (input as any).webkitdirectory = true;
    input.style.display = 'none';
    input.onchange = () => {
      resolve(input.files ? rutasDesdeSeleccion(input.files) : []);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  });
}
