/**
 * Despertador de Prensa Segovia (Google Apps Script, gratis).
 * Lanza la actualización de noticias en GitHub cada hora, porque el reloj
 * automático de GitHub se salta ejecuciones cuando tiene carga.
 *
 * Instalación:
 * 1. script.google.com → Nuevo proyecto → pegar este código.
 * 2. Configuración del proyecto (rueda) → Propiedades del script → Añadir:
 *      nombre: TOKEN   valor: el token de GitHub (github_pat_...)
 * 3. Ejecutar la función "lanzar" una vez y dar permisos.
 * 4. Activadores (reloj) → Añadir activador → función "lanzar",
 *    basado en tiempo, temporizador por horas, cada hora.
 */
function lanzar() {
  const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
  const r = UrlFetchApp.fetch(
    'https://api.github.com/repos/prensasegovia/prensasegovia/actions/workflows/actualizar.yml/dispatches',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
      payload: JSON.stringify({ ref: 'main' }),
      muteHttpExceptions: true,
    }
  );
  Logger.log(r.getResponseCode() + ' ' + r.getContentText()); // 204 = lanzado
}
