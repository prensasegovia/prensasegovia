# Prensa Segovia

Web que reúne cada día las noticias de los pueblos de la provincia de Segovia.

- **Web:** se publica con GitHub Pages desde la carpeta `public/`.
- **Actualización:** GitHub Actions ejecuta `scripts/actualizar.mjs` cada hora. El script lee los RSS de los medios provinciales y comarcales y varias búsquedas de Google Noticias, clasifica cada noticia por pueblo, tema y relevancia, agrupa las repetidas y guarda los últimos 30 días en `public/datos.json`.
- **Coste:** cero. Repositorio público + GitHub Pages + GitHub Actions gratuitos.

## Cómo está organizada la web (`public/`)

- `index.html`: solo el esqueleto de la página; carga los estilos y el código en este orden.
- `css/`: `base.css` (móvil), `ordenador.css` (pantallas grandes), `ajustes.css` (repasos de diseño), `guia-parte.css` (guía rápida y parte del día) y `redes.css`.
- `js/`: `config.js`, `utilidades.js`, `estado.js`, `datos.js` (noticias, hemeroteca y archivo), `tarjeta.js`, `vistas.js`, `redes.js`, `periodicos.js`, `parte.js`, `render.js`, `navegacion.js`, `panel.js` (panel derecho, búsqueda, filtros, letra), `avisos.js` y `arranque.js` (carga, guía y aviso de versión nueva). Son scripts normales que comparten variables: el orden de `index.html` importa.
- **Enlaces por sección:** `#noticias`, `#agenda`, `#pueblos`, `#periodicos`, `#guardadas`, `#redes`, `#parte`, `#medios`, `#pueblo/Cuéllar`… Al recargar, la web se queda en la misma sección (`js/navegacion.js` y `vistaHash` en `js/arranque.js`).
- **Cada sección va aislada:** si una falla (incluso si su archivo entero está roto), solo esa muestra «Esta sección ha fallado» y el resto sigue funcionando. Lo hace `seguro()` de `js/utilidades.js`; el detalle del fallo sale en la consola del navegador.
- **Redes (zona privada):** `js/redes.js` es la zona en sí (contraseña, lista de perfiles, añadir/editar/quitar); `js/redes-feed.js` y `css/redes-feed.css` son las publicaciones, con la misma tarjeta para Instagram, Facebook, X y TikTok. Al principio de `redes-feed.js` está el formato que debe devolver el servidor para cada red. Para ver el diseño sin datos reales: http://localhost:8000/?demo#redes (perfiles y publicaciones inventados de `js/redes-demo.js`; solo funciona en local y no guarda ni envía nada).
- **Al publicar un cambio de la web**, sube la versión en tres sitios a la vez para que los móviles se recarguen solos: `CACHE` en `sw.js`, `VERSION_APP` en `js/arranque.js` y los `?v=` de `index.html`.
- **Probar en local:** `python3 -m http.server 8000 --directory public` y abrir http://localhost:8000.

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
