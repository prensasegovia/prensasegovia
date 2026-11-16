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
// Uso anónimo: cada aparato manda un número al azar una vez al día (sin nombre ni nada que identifique)
function leerVis_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('VISITAS') || '{}'); } catch (e) { return {}; } }
function hoy_() { return Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd'); }
function uso_() {
  const v = leerVis_(), h = hoy_(), ms = Date.parse(h), dias = n => Object.keys(v).filter(k => ms - Date.parse(v[k][1]) < n * 864e5).length;
  const tipos = {}; Object.keys(v).forEach(k => { tipos[v[k][2]] = (tipos[v[k][2]] || 0) + 1; });
  return { aparatos_distintos: Object.keys(v).length, hoy: dias(1), ultimos_7_dias: dias(7), ultimos_30_dias: dias(30), por_tipo: tipos, desde: Object.keys(v).map(k => v[k][0]).sort()[0] || h };
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// GitHub pide la lista de suscritos (solo con el token)
function doGet(e) {
  const p = e.parameter || {};
  if (p.accion === 'lista' && p.token === TOKEN) return json_({ subs: leer_() });
  if (p.accion === 'uso') return json_(uso_());
  return json_({ ok: true });
}

// La app apunta o quita un móvil; GitHub borra los que ya no existen
function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    if (d.accion === 'visita' && /^[a-z0-9]{8,16}$/.test(String(d.id || ''))) {
      const v = leerVis_(), h = hoy_(), t = ['iPhone', 'Android', 'Ordenador', 'Otro'].indexOf(d.tipo) >= 0 ? d.tipo : 'Otro';
      v[d.id] = [v[d.id] ? v[d.id][0] : h, h, t];
      const ks = Object.keys(v); if (ks.length > 3000) ks.sort((a, b) => v[a][1].localeCompare(v[b][1])).slice(0, ks.length - 3000).forEach(k => delete v[k]);
      PropertiesService.getScriptProperties().setProperty('VISITAS', JSON.stringify(v));
      return json_({ ok: true });
    }
    let subs = leer_();
    if (d.accion === 'alta' && d.sub && d.sub.endpoint && d.sub.keys) {
      subs = subs.filter(s => s.endpoint !== d.sub.endpoint);
      const prefs = d.prefs || {};
      subs.push({ endpoint: String(d.sub.endpoint), keys: { p256dh: String(d.sub.keys.p256dh), auth: String(d.sub.keys.auth) },
        prefs: { nivel: ['todas', 'importantes', 'ninguna'].indexOf(prefs.nivel) >= 0 ? prefs.nivel : 'todas', capital: prefs.capital !== false, periodicos: Array.isArray(prefs.periodicos) ? prefs.periodicos.filter(x => typeof x === 'string').slice(0, 30).map(x => x.slice(0, 60)) : !!prefs.periodicos },
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
