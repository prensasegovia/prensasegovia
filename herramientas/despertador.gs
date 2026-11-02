/**
 * Despertador de Prensa Segovia (Google Apps Script, gratis).
 * Lanza la actualización de noticias en GitHub, porque el reloj automático
 * de GitHub se salta ejecuciones cuando tiene carga.
 *
 *   - De lunes a viernes, de 8:00 a 15:00 (hora de Madrid): cada 10 minutos.
 *   - El resto del tiempo: cada hora.
 *
 * Instalación:
 * 1. script.google.com → Nuevo proyecto → pegar este código.
 * 2. Configuración del proyecto (rueda) → Propiedades del script → Añadir:
 *      nombre: TOKEN   valor: el token de GitHub (github_pat_...)
 * 3. Ejecutar la función "lanzar" una vez y dar permisos.
 * 4. Activadores (reloj) → Añadir activador → función "lanzar",
 *    basado en tiempo, temporizador por minutos, cada 10 minutos.
 *    (El propio código decide si toca lanzar o no.)
 */
function lanzar() {
  const ahora = new Date();
  const dia = +Utilities.formatDate(ahora, 'Europe/Madrid', 'u');   // 1 = lunes … 7 = domingo
  const hora = +Utilities.formatDate(ahora, 'Europe/Madrid', 'H');
  const min = +Utilities.formatDate(ahora, 'Europe/Madrid', 'm');
  const tramo = Math.floor(min / 10);                                 // 0..5 (bloques de 10 minutos)
  const laborable = dia >= 1 && dia <= 5;
  const horaPunta = laborable && hora >= 8 && hora < 15;
  // Hora punta: todos los tramos (cada 10 min). Resto: solo el tramo 0 (≈ :00).
  const toca = horaPunta ? true : tramo === 0;
  if (!toca) return;
  // Que no se lance dos veces en el mismo tramo si el activador se adelanta o se repite
  const clave = Utilities.formatDate(ahora, 'Europe/Madrid', 'yyyyMMddHH') + '-' + tramo;
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('ULTIMO') === clave) return;
  props.setProperty('ULTIMO', clave);

  const token = props.getProperty('TOKEN');
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

// Para probar a mano sin esperar al horario: lanza ya, sin mirar la hora
function lanzarYa() {
  const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
  const r = UrlFetchApp.fetch('https://api.github.com/repos/prensasegovia/prensasegovia/actions/workflows/actualizar.yml/dispatches',
    { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, payload: JSON.stringify({ ref: 'main' }), muteHttpExceptions: true });
  Logger.log(r.getResponseCode() + ' ' + r.getContentText());
}
