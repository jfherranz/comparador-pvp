# Comparador PVP Los Granos — versión 1

App React Native + Expo (SDK 58). Funciona en navegador y en teléfono.

**Versión publicada:** https://jfherranz.github.io/comparador-pvp/ (se entra con el usuario creado en Supabase).
Repositorio: https://github.com/jfherranz/comparador-pvp

## Cómo abrirla

En PowerShell, dentro de esta carpeta (`app`):

```powershell
npx expo start --web
```

Se abre en http://localhost:8081. Para el teléfono: `npx expo start`, instala **Expo Go** y escanea el código QR (mismo Wi‑Fi).

## Dónde está cada cosa

| Qué | Archivo |
|---|---|
| Reglas de cálculo (efectivo, $/kg, índice LG, período) | `src/logic/calc.ts` |
| Maestros iniciales (10 cadenas, 31 productos, 22 marcas) | `src/data/maestros.ts` |
| 276 precios de noviembre (de la planilla v13, hoja Registro) | `src/data/seed.json` |
| Importar el análisis mensual de fotos | `src/logic/importar.ts`, `src/screens/Cargar.tsx` |
| Scripts de la tarea mensual | `..\Fotos\_analisis\*.ps1` |
| Excel de respaldo (columnas de Registro v13) | `src/export/excel.ts` |
| Pantallas | `src/screens/` |

## Fotos y análisis mensual

1. Deja las fotos en `Comparador PVP\Fotos\<Cadena>\` (una subcarpeta por cadena).
2. El **día 15 a las 06:00** la tarea programada de Claude analiza las fotos nuevas y deja
   `Fotos\_analisis\analisis_AAAA-MM-DD.json` y `resumen_AAAA-MM-DD.md`.
3. En la app: **Cargar fotos → Elegir carpeta Fotos**, revisa y **Guardar todo**.

La fecha de cada foto sale del nombre (ej. "WhatsApp Image 2026-11-10…"), del EXIF o de la fecha del archivo.
Las fotos ya analizadas quedan en `Fotos\_analisis\procesadas.json` y no se vuelven a leer.
La tarea corre con la app de Claude abierta; si está cerrada a esa hora, corre al abrirla.

## Servidor compartido (Supabase) y publicación (GitHub Pages)

La app tiene dos modos:
- **Modo local**, cuando no hay `.env.local`. Los datos quedan en el dispositivo y el perfil se cambia con un botón de prueba.
- **Modo Supabase**, cuando existe `.env.local` (o en la versión publicada). Todos ven los mismos datos, se entra con correo y contraseña, y la propia base aplica los permisos:
  - Editor: puede hacer todo.
  - Editor precios: puede ver todo, pero solo modifica el PVP normal y el PVP oferta.

### 1. Supabase (una sola vez)

1. En supabase.com crea un proyecto (región São Paulo). Guarda tú la contraseña de la base; no va en la app.
2. **SQL Editor**: pega `supabase/esquema.sql` y presiona **Run**.
3. **SQL Editor**: pega `..\supabase_datos_iniciales.sql` (maestros + 276 precios de noviembre) y presiona **Run**.
   - Si cambias `seed.json` o `maestros.ts`, regenera este archivo con `node supabase/generar_datos_iniciales.js`.
4. **Authentication → Sign In / Providers**: desactiva *Allow new users to sign up*. Así solo entran los usuarios que tú crees.
5. **Authentication → Users → Add user → Create new user**: ingresa correo y contraseña y marca *Auto Confirm User*. Repite por cada persona. Todos parten como "Editor precios".
6. Para darte el perfil de Editor, corre en **SQL Editor**:
   `update public.perfiles set rol = 'admin' where email = 'tu-correo@empresa.cl';`
7. En **Project Settings → API Keys** copia el *Project URL* y la *Publishable key*. Después copia `.env.example` como `.env.local` y complétalo con esos dos valores.

### 2. GitHub (una sola vez)

1. Crea un repositorio **público** llamado `comparador-pvp`, vacío.
   - El plan gratis solo publica páginas desde repositorios públicos.
   - Lo que queda a la vista es el código y los nombres de cadenas, productos y marcas. Los precios y las fotos quedan en Supabase, protegidos por el login.
2. **Settings → Pages → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables**: crea `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` con los mismos valores del paso 1.7.
4. Sube el código con `git push` a la rama `main`. Cada vez que subas cambios, `.github/workflows/publicar.yml` publica la app en `https://<usuario>.github.io/comparador-pvp`.

`src/data/seed.json` (los precios de noviembre) está excluido de GitHub. En la versión publicada los datos salen de Supabase.

## Limitaciones de esta versión

- **Usuarios y contraseñas** los creas tú en Supabase. Cada persona puede cambiar su contraseña en el menú de su correo (arriba a la derecha). Si alguien la olvida, se la cambias tú en *Authentication → Users*.
- Importar el análisis se hace desde el navegador del computador (en el teléfono no se puede elegir una carpeta).
- La tarea lee los maestros de `src/data/maestros.ts`: si agregas cadenas, productos o marcas en la app, agrégalos también ahí para que la tarea los reconozca.
- El reporte mensual en Claude está pendiente (falta definir el día de envío).
