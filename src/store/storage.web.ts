// En navegador se usa IndexedDB (sin el límite de 5 MB de localStorage), así caben las fotos.
import { get, set, del } from 'idb-keyval';

export async function loadJSON<T>(key: string): Promise<T | undefined> {
  return (await get(key)) as T | undefined;
}
export async function saveJSON(key: string, value: unknown) {
  await set(key, value);
}
export async function loadFoto(id: string): Promise<string | undefined> {
  return (await get('foto:' + id)) as string | undefined;
}
export async function saveFoto(id: string, dataUri: string) {
  await set('foto:' + id, dataUri);
}
export async function deleteFoto(id: string) {
  await del('foto:' + id);
}
