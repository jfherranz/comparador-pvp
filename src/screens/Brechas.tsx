import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Card, Chip, Empty, H, Row, Select, Sub, Table } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useAnalisis } from '../store/useAnalisis';
import { brechas, clp, LG, periodoLabel, signedPct } from '../logic/calc';
import { C } from '../theme';
import { TODAS } from '../types';

type Orden = 'baratas' | 'caras';

export default function Brechas() {
  const { periodo, maestros, cadena } = useApp();
  const a = useAnalisis();
  const [marca, setMarca] = useState<string>(TODAS);
  const [producto, setProducto] = useState<string>(TODAS);
  const [orden, setOrden] = useState<Orden>('baratas');

  const lista = useMemo(() => {
    let b = brechas(a.celdas);
    if (marca !== TODAS) b = b.filter((x) => x.marca === marca);
    if (producto !== TODAS) b = b.filter((x) => x.producto === producto);
    if (orden === 'baratas') b = b.filter((x) => x.dif < 0).sort((x, y) => x.dif - y.dif);
    else b = b.filter((x) => x.dif > 0).sort((x, y) => y.dif - x.dif);
    return b;
  }, [a.celdas, marca, producto, orden]);

  const marcasComp = a.marcas.filter((m) => m !== LG);

  return (
    <View>
      <H>Brechas</H>
      <Sub>Diferencia de $/kg de cada marca vs Los Granos en la misma cadena y producto · {cadena === TODAS ? 'todas las cadenas' : `solo ${cadena}`} · {periodoLabel(periodo)}</Sub>
      <Card>
        <Row style={{ marginBottom: 12, alignItems: 'flex-end' }}>
          <Select label="Marca" value={marca} options={[TODAS, ...marcasComp]} onChange={setMarca} style={{ minWidth: 180 }} />
          <Select label="Producto" value={producto} options={[TODAS, ...maestros.productos]} onChange={setProducto} style={{ minWidth: 240 }} />
          <Row>
            <Chip label="Más baratas que LG" active={orden === 'baratas'} onPress={() => setOrden('baratas')} />
            <Chip label="Más caras que LG" active={orden === 'caras'} onPress={() => setOrden('caras')} />
          </Row>
        </Row>
        <Text style={{ color: C.muted, marginBottom: 8 }}>
          {lista.length} casos{marca !== TODAS ? ` donde ${marca} está ${orden === 'baratas' ? 'más barata' : 'más cara'} que Los Granos` : ''}
        </Text>
        {lista.length === 0 ? (
          <Empty text="No hay brechas con estos filtros." />
        ) : (
          <Table
            maxHeight={640}
            cols={[
              { key: 'n', label: '#', w: 40, align: 'right' },
              { key: 'cad', label: 'Cadena', w: 130 },
              { key: 'prod', label: 'Producto', w: 220 },
              { key: 'marca', label: 'Marca', w: 120 },
              { key: 'kg', label: 'Marca $/kg', w: 90, align: 'right' },
              { key: 'lg', label: 'LG $/kg', w: 90, align: 'right' },
              { key: 'dif', label: 'Diferencia', w: 100, align: 'right' },
            ]}
            rows={lista.map((b, i) => ({
              key: `${b.cadena}|${b.producto}|${b.marca}`,
              cells: {
                n: String(i + 1),
                cad: b.cadena,
                prod: b.producto,
                marca: b.marca,
                kg: clp(b.kg),
                lg: clp(b.lg),
                dif: <Badge text={signedPct(b.dif)} tone={b.dif < 0 ? 'bad' : 'good'} />,
              },
            }))}
          />
        )}
      </Card>
    </View>
  );
}
