// En teléfono se usa AsyncStorage. (Versión inicial: para muchas fotos conviene pasar a un servidor.)
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function loadJSON<T>(key: string): Promise<T | undefined> {
  const s = await AsyncStorage.getItem(key);
  return s ? (JSON.parse(s) as T) : undefined;
}
export async function saveJSON(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
export async function loadFoto(id: string): Promise<string | undefined> {
  return (await AsyncStorage.getItem('foto:' + id)) ?? undefined;
}
export async function saveFoto(id: string, dataUri: string) {
  await AsyncStorage.setItem('foto:' + id, dataUri);
}
export async function deleteFoto(id: string) {
  await AsyncStorage.removeItem('foto:' + id);
}
