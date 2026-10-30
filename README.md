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
