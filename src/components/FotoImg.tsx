import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageStyle, StyleProp, View } from 'react-native';
import { loadFoto } from '../store/storage';
import { REMOTO, urlFoto } from '../store/remoto';
import { C } from '../theme';

/** Carga la imagen guardada de una foto por su id (Supabase o almacenamiento local). */
export function FotoImg({ id, style }: { id: string; style: StyleProp<ImageStyle> }) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let ok = true;
    (REMOTO ? urlFoto(id) : loadFoto(id)).then((u) => ok && setUri(u ?? null), () => {});
    return () => { ok = false; };
  }, [id]);
  if (!uri) return <View style={[style as any, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE' }]}><ActivityIndicator color={C.brand} /></View>;
  return <Image source={{ uri }} style={style} resizeMode="contain" />;
}
