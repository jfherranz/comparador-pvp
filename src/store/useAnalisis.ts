import { useMemo } from 'react';
import { analizar, filtrar } from '../logic/calc';
import { useApp } from './AppContext';

/** Análisis con los filtros globales (cadena y período). */
export function useAnalisis(cadenaOverride?: string, periodoOverride?: string) {
  const { precios, cadena, periodo, maestros } = useApp();
  const cad = cadenaOverride ?? cadena;
  const per = periodoOverride ?? periodo;
  return useMemo(() => {
    const rows = filtrar(precios, cad, per);
    return { rows, ...analizar(rows, maestros.productos, maestros.cadenas) };
  }, [precios, cad, per, maestros]);
}
