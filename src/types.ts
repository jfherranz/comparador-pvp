export type Precio = {
  id: string;
  fecha: string; // YYYY-MM-DD (fecha de la foto)
  cadena: string;
  sala?: string;
  producto: string;
  marca: string;
  formato: number; // gramos
  pvpNormal: number | null;
  pvpOferta: number | null; // oferta, 2º precio o precio por mayor
  reponedor?: string;
  obs?: string;
  fotoId: string | null;
  updatedAt?: string;
};

export type Foto = {
  id: string;
  cadena: string;
  fecha: string; // YYYY-MM-DD
  nombre?: string;
  createdAt: string;
};

export type Maestros = {
  cadenas: string[];
  productos: string[]; // en el orden de la planilla
  marcas: string[];
};

/** admin = tú (editor completo); precios = jefatura / comercial (solo edita precios) */
export type Rol = 'admin' | 'precios';

export const TODAS = 'Todas';
