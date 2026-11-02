/**
 * Avisos de Prensa Segovia (Google Apps Script, gratis).
 * Guarda los móviles que quieren avisos y lo que ha elegido cada uno.
 * La app apunta o borra el móvil; GitHub lee la lista (con el TOKEN) y envía los avisos.
 *
 * Instalación (una vez):
 * 1. En el mismo proyecto del despertador: Archivos (+) → Script → nombre "avisos" → pegar este código.
 * 2. Cambiar TOKEN abajo por el que viene en las instrucciones (no se publica en ningún sitio).
 * 3. Implementar → Nueva implementación → tipo "Aplicación web":
 *      Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario → Implementar → copiar la URL (termina en /exec).
 */
const TOKEN = 'PEGA_AQUI_EL_TOKEN';

function guardar_(subs) { PropertiesService.getScriptProperties().setProperty('SUBS', JSON.stringify(subs)); }
function leer_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('SUBS') || '[]'); } catch (e) { return []; } }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// GitHub pide la lista de suscritos (solo con el token)
function doGet(e) {
  const p = e.parameter || {};
  if (p.accion === 'lista' && p.token === TOKEN) return json_({ subs: leer_() });
  return json_({ ok: true });
}

// La app apunta o quita un móvil; GitHub borra los que ya no existen
function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    let subs = leer_();
    if (d.accion === 'alta' && d.sub && d.sub.endpoint && d.sub.keys) {
      subs = subs.filter(s => s.endpoint !== d.sub.endpoint);
      const prefs = d.prefs || {};
      subs.push({ endpoint: String(d.sub.endpoint), keys: { p256dh: String(d.sub.keys.p256dh), auth: String(d.sub.keys.auth) },
        prefs: { nivel: ['todas', 'importantes', 'ninguna'].indexOf(prefs.nivel) >= 0 ? prefs.nivel : 'todas', capital: prefs.capital !== false, periodicos: !!prefs.periodicos },
        alta: new Date().toISOString() });
      if (subs.length > 200) subs = subs.slice(-200);
    } else if (d.accion === 'baja' && d.endpoint) {
      subs = subs.filter(s => s.endpoint !== d.endpoint);
    } else if (d.accion === 'borrar' && d.token === TOKEN && Array.isArray(d.endpoints)) {
      subs = subs.filter(s => d.endpoints.indexOf(s.endpoint) < 0);
    }
    guardar_(subs);
    return json_({ ok: true, n: subs.length });
  } finally { lock.releaseLock(); }
}
