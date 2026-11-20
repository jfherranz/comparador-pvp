import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { Btn, s as ui } from '../components/ui';
import { useApp } from '../store/AppContext';
import { entrar, salir } from '../store/remoto';
import { C } from '../theme';

/** Ingreso con correo y contraseña (los usuarios los crea el editor en Supabase). */
export default function Login() {
  const { estado, trasEntrar } = useApp();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const ingresar = async () => {
    setError(null);
    setEnviando(true);
    try {
      await entrar(email, clave);
      await trasEntrar();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.brandDark, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <View style={{ width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 16, padding: 24 }}>
        <Text style={{ color: C.accent, fontWeight: '800', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>Los Granos</Text>
        <Text style={{ color: C.ink, fontWeight: '800', fontSize: 22, marginBottom: 18 }}>Comparador PVP</Text>

        {estado === 'sinPerfil' ? (
          <>
            <Text style={{ color: C.ink, marginBottom: 14 }}>
              Tu usuario existe pero no tiene perfil asignado. Pide al editor que te dé acceso.
            </Text>
            <Btn label="Salir" kind="ghost" onPress={() => salir()} />
          </>
        ) : (
          <>
            <Text style={ui.label}>Correo</Text>
            <TextInput
              value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email"
              placeholder="nombre@empresa.cl" style={[ui.input, { marginBottom: 12 }]}
            />
            <Text style={ui.label}>Contraseña</Text>
            <TextInput
              value={clave} onChangeText={setClave} secureTextEntry autoComplete="password" style={[ui.input, { marginBottom: 12 }]}
              onSubmitEditing={ingresar}
            />
            {error && <Text style={{ color: C.red, marginBottom: 10 }}>{error}</Text>}
            {enviando ? <ActivityIndicator color={C.brand} /> : (
              <Btn label="Entrar" onPress={ingresar} disabled={!email.trim() || !clave} />
            )}
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 14 }}>
              ¿No tienes acceso o olvidaste tu contraseña? Pídeselo al editor del comparador.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
