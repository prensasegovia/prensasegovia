# Prensa Segovia

Web que reúne cada día las noticias de los pueblos de la provincia de Segovia.

- **Web:** se publica con GitHub Pages desde la carpeta `public/`.
- **Actualización:** GitHub Actions ejecuta `scripts/actualizar.mjs`. Lo lanza el despertador de Apps Script (`herramientas/despertador.gs`) cada 10 minutos de lunes a viernes de 8 a 15 h y cada hora el resto; el reloj de GitHub hace de respaldo cada 20 minutos. El script lee los RSS de los medios provinciales y comarcales y varias búsquedas de Google Noticias, clasifica cada noticia por pueblo, tema y relevancia, agrupa las repetidas y guarda los últimos 21 días en `public/datos.json` (lo que pasó el filtro queda por meses en `public/archivo/` y todo lo leído en `public/hemeroteca/`).
- **Banco de pruebas del filtro:** `node scripts/prueba.mjs --casos` comprueba los ejemplos reales de `scripts/casos.json` (si entran o no, en qué pueblo y si van en rojo). Al cambiar el filtro se añaden los casos nuevos y todos tienen que seguir saliendo bien. Necesita `npm install` la primera vez.
- **Coste:** cero. Repositorio público + GitHub Pages + GitHub Actions gratuitos.

## Cómo está organizada la web (`public/`)

- `index.html`: solo el esqueleto de la página; carga los estilos y el código en este orden.
- `css/`: `base.css` (móvil), `ordenador.css` (pantallas grandes), `ajustes.css` (repasos de diseño), `guia-parte.css` (guía rápida y parte del día), `lector.css` (lector del texto completo), `mapa-pueblos.css` y `sintonia.css` (detalles comunes con Atalaya: letra Rajdhani en títulos y cifras, y colores de estado).
- `js/`: `config.js`, `utilidades.js`, `estado.js`, `datos.js` (noticias, hemeroteca y archivo), `tarjeta.js`, `vistas.js`, `mapa-pueblos.js` (mapa de Pueblos), `asuntos.js` (seguir un asunto: línea de tiempo con todas sus noticias, guardada en el dispositivo), `periodicos.js`, `parte.js`, `render.js`, `navegacion.js`, `panel.js` (panel derecho, búsqueda, filtros, letra), `avisos.js`, `lector.js` (texto completo de las noticias) y `arranque.js` (carga, guía y aviso de versión nueva). Son scripts normales que comparten variables: el orden de `index.html` importa.
- **Enlaces por sección:** `#noticias`, `#agenda`, `#pueblos`, `#periodicos`, `#guardadas`, `#parte`, `#medios`, `#pueblo/Cuéllar`… Al recargar, la web se queda en la misma sección (`js/navegacion.js` y `vistaHash` en `js/arranque.js`).
- **Mapa de Pueblos:** los límites de los municipios están en `public/mapa/municipios.json` (se generan con `node scripts/mapa-municipios.mjs /ruta/a/segovia.json`, a partir de los límites municipales del IGN). Leaflet se carga desde unpkg solo al abrir Pueblos; si no carga, queda la lista.
- **Cada sección va aislada:** si una falla (incluso si su archivo entero está roto), solo esa muestra «Esta sección ha fallado» y el resto sigue funcionando. Lo hace `seguro()` de `js/utilidades.js`; el detalle del fallo sale en la consola del navegador.
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


