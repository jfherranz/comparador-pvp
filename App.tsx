import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/store/AppContext';
import { ScreenKey, Shell } from './src/components/Shell';
import { C } from './src/theme';
import Resumen from './src/screens/Resumen';
import Comparador from './src/screens/Comparador';
import Mapa from './src/screens/Mapa';
import Evolucion from './src/screens/Evolucion';
import Brechas from './src/screens/Brechas';
import Ficha from './src/screens/Ficha';
import Galeria from './src/screens/Galeria';
import Cargar from './src/screens/Cargar';
import Datos from './src/screens/Datos';
import Login from './src/screens/Login';

const PANTALLAS: Record<ScreenKey, React.ComponentType> = {
  resumen: Resumen, comparador: Comparador, mapa: Mapa, evolucion: Evolucion, brechas: Brechas,
  ficha: Ficha, galeria: Galeria, cargar: Cargar, datos: Datos,
};

function Main() {
  const { estado, rol } = useApp();
  const [screen, setScreen] = useState<ScreenKey>('resumen');
  if (estado === 'login' || estado === 'sinPerfil') return <Login />;
  if (estado !== 'listo') {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator color={C.brand} size="large" /></View>;
  }
  const actual = screen === 'cargar' && rol !== 'admin' ? 'resumen' : screen;
  const P = PANTALLAS[actual];
  return (
    <Shell screen={actual} setScreen={setScreen}>
      <P />
    </Shell>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.brandDark }} edges={['top']}>
        <StatusBar style="light" />
        <AppProvider>
          <Main />
        </AppProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
