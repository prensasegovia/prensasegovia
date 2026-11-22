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
  const rx = redesXGet_(e); if (rx) return rx;   // Redes → X (redesx.gs)
  const p = e.parameter || {};
  if (p.accion === 'lista' && p.token === TOKEN) return json_({ subs: leer_() });
  return json_({ ok: true });
}

// La app apunta o quita un móvil; GitHub borra los que ya no existen
function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const rx = redesX_(d); if (rx) return rx;   // Redes → X (redesx.gs)
    if (d.accion === 'redesLeer' || d.accion === 'redesGuardar') return redes_(d); // lista compartida de perfiles de Redes
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

/* ===== Redes: lista compartida de perfiles =====
 * Se guarda aquí (propiedades del script, privadas de tu cuenta de Google), no en el repositorio público.
 * Solo responde a quien manda la contraseña. La contraseña está en Configuración del proyecto → Propiedades del script,
 * con el nombre CLAVE_REDES (no en el código). Para cambiarla, cambia esa propiedad: no hace falta volver a implementar. */
const CLAVE_REDES = PropertiesService.getScriptProperties().getProperty('CLAVE_REDES') || '';
function redesLeer_() {
  const p = PropertiesService.getScriptProperties(), n = Number(p.getProperty('REDES_N') || 0);
  let s = ''; for (let i = 0; i < n; i++) s += p.getProperty('REDES_' + i) || '';
  try { return JSON.parse(s || '[]'); } catch (e) { return []; }
}
function redesGuardar_(lista) {
  const p = PropertiesService.getScriptProperties();
  let s = JSON.stringify(lista);
  if (s.length > 250000) s = JSON.stringify(lista.map(function (x) { const y = Object.assign({}, x); delete y.f; return y; })); // sin fotos si no cabe
  const antes = Number(p.getProperty('REDES_N') || 0), n = Math.ceil(s.length / 4000);
  for (let i = 0; i < n; i++) p.setProperty('REDES_' + i, s.substr(i * 4000, 4000));
  for (let i = n; i < antes; i++) p.deleteProperty('REDES_' + i);
  p.setProperty('REDES_N', String(n)); p.setProperty('REDES_HORA', new Date().toISOString());
}
function redes_(d) {
  if (!CLAVE_REDES || String(d.clave || '') !== CLAVE_REDES) return json_({ error: 'clave' }); // sin propiedad, nadie entra
  if (d.accion === 'redesGuardar' && Array.isArray(d.perfiles)) {
    const txt = function (v, n) { return String(v == null ? '' : v).slice(0, n); };
    const lista = d.perfiles.filter(function (x) { return x && ['ig', 'fb', 'x', 'tt'].indexOf(x.r) >= 0 && x.u; }).slice(0, 300).map(function (x) {
      const o = { id: txt(x.id, 30), r: x.r, g: txt(x.g, 40), n: txt(x.n, 60), u: txt(x.u, 90), av: !!x.av };
      if (typeof x.f === 'string' && x.f.indexOf('data:image/') === 0 && x.f.length < 12000) o.f = x.f;
      return o;
    });
    redesGuardar_(lista);
    return json_({ guardado: true, n: lista.length });
  }
  return json_({ perfiles: redesLeer_(), hora: PropertiesService.getScriptProperties().getProperty('REDES_HORA') || '' });
}
