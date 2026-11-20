# Prensa Segovia

Web que reúne cada día las noticias de los pueblos de la provincia de Segovia.

- **Web:** se publica con GitHub Pages desde la carpeta `public/`.
- **Actualización:** GitHub Actions ejecuta `scripts/actualizar.mjs` cada hora. El script lee los RSS de los medios provinciales y comarcales y varias búsquedas de Google Noticias, clasifica cada noticia por pueblo, tema y relevancia, agrupa las repetidas y guarda los últimos 30 días en `public/datos.json`.
- **Coste:** cero. Repositorio público + GitHub Pages + GitHub Actions gratuitos.

## Cambiar cosas habituales

- **Medios:** lista `FEEDS` en `scripts/actualizar.mjs`.
- **Búsquedas de Google Noticias:** lista `BUSQUEDAS` en el mismo archivo.
- **Palabras que deciden el tema y la relevancia:** `PATRONES` y `ALTA`.
- **Horario:** línea `cron` en `.github/workflows/actualizar.yml` (en hora UTC).
- **Forzar una actualización:** pestaña *Actions* → *Actualizar noticias* → *Run workflow*.

En la pestaña *Medios* de la web se ve qué fuentes se pudieron leer en la última actualización.

## Avisos al móvil
Los avisos (Web Push) se envían desde `scripts/avisos.mjs` tras cada actualización. Las suscripciones las guarda el Apps Script de `herramientas/avisos.gs`; la clave privada va en el secreto `AVISOS` del repositorio.

## Usuarios (cuentas de X)
La carpeta `usuarios/` es una pieza aparte que se ejecuta **en tu ordenador** (o en un servidor tuyo), nunca en GitHub Pages ni en Actions, porque guarda sesiones de X.

- **Arrancar:** `cd usuarios && npm install && npm start` → abre http://127.0.0.1:4321. La primera vez se crea `usuarios/.env` con la clave de cifrado (haz copia de ese archivo).
- **Conectar:** botón «Conectar cuenta de X» → se abre Chrome en x.com, inicias sesión tú y la ventana se cierra sola. En un servidor sin pantalla sale un formulario para pegar `auth_token` y `ct0`.
- **Guardado:** `usuarios/usuarios.db`, con las cookies cifradas (AES-256-GCM) con `X_CLAVE` de `.env`. Ni la base de datos ni `.env` se suben a GitHub.
- **Acceso a X:** todo pasa por `usuarios/x.mjs` (sesión, comprobación, límites 429). El resto del código usa `ultimosTuits()` o `capturar()` y nunca toca cookies.
- **Comprobar a mano:** `npm run prueba -- @NASA` lee los 5 últimos tuits con la cuenta de lectura.
- **Servidor:** con `HOST=0.0.0.0` hace falta `USUARIOS_CLAVE` en `.env` (contraseña de la página). En Linux, `npx playwright install --with-deps chromium` si no hay Chrome.
