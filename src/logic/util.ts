import { Alert, Platform } from 'react-native';

/** Confirmación que funciona en navegador y en teléfono. */
export function confirmar(titulo: string, mensaje: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  return new Promise((resolve) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Aceptar', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export function aviso(titulo: string, mensaje: string) {
  if (Platform.OS === 'web') window.alert(`${titulo}\n\n${mensaje}`);
  else Alert.alert(titulo, mensaje);
}

/** Reduce una imagen (data URI) a máx. `max` px de lado, en JPEG. Solo navegador; en teléfono devuelve la original. */
export async function reducirImagen(dataUri: string, max = 1600, quality = 0.8): Promise<string> {
  if (Platform.OS !== 'web') return dataUri;
  return new Promise((resolve) => {
    const img = new (window as any).Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUri);
    img.src = dataUri;
  });
}
