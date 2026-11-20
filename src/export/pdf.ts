import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** En navegador abre el diálogo de impresión (elegir "Guardar como PDF"); en teléfono genera el PDF y lo comparte. */
export async function descargarPDF(html: string, nombre: string) {
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) {
      await Print.printAsync({ html });
      return;
    }
    w.document.write(html.replace('<title></title>', `<title>${nombre}</title>`));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: nombre, UTI: 'com.adobe.pdf' });
}
