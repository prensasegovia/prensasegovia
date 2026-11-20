/**
 * Redes → X (Google Apps Script, en el MISMO proyecto que avisos.gs y despertador.gs).
 *
 * La web no puede leer X por sí sola, así que:
 *   1. Al abrir Redes → X, la web pide aquí los últimos tuits guardados (redesXLeer) y, si son viejos,
 *      pide una lectura nueva (redesXPedir) mandando su lista de perfiles de X.
 *   2. Este script lanza el workflow «Redes · X» de GitHub (con el TOKEN del despertador).
 *   3. GitHub lee X y devuelve aquí los tuits (redesXGuardar, con el TOKEN de avisos.gs).
 * Los tuits y la lista de cuentas se guardan en las propiedades del script (privadas de tu cuenta de Google).
 *
 * Instalación: Archivos (+) → Script → nombre «redesx» → pegar este código. Después, en avisos.gs, añadir
 * UNA línea al principio de doPost y OTRA al principio de doGet (ver INSTRUCCIONES-REDES-X.md) y volver a implementar.
 */

// Misma contraseña que la zona privada de la web: se comprueba su huella, así que aquí no se guarda la contraseña
const REDESX_HUELLA = '2daa7d78da68335e567c39515cf19cf2066123882deb3628a9d4e39fbfa8fbe5';
const REDESX_REPO = 'prensasegovia/prensasegovia';
const REDESX_ESPERA_MIN = 3;    // no se lanza otra lectura si hay una pedida hace menos de esto
const REDESX_MAX_PERFILES = 60;

function redesXHuella_(t) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function redesXClaveOk_(c) { return redesXHuella_('prensa-segovia-redes|' + String(c || '')) === REDESX_HUELLA; }
function redesXJson_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// Guardar textos largos en trozos (cada propiedad admite ~9 KB)
function redesXEscribe_(nombre, valor) {
  const p = PropertiesService.getScriptProperties(), s = JSON.stringify(valor);
  const antes = Number(p.getProperty(nombre + '_N') || 0), n = Math.ceil(s.length / 8000);
  for (let i = 0; i < n; i++) p.setProperty(nombre + '_' + i, s.substr(i * 8000, 8000));
  for (let i = n; i < antes; i++) p.deleteProperty(nombre + '_' + i);
  p.setProperty(nombre + '_N', String(n));
}
function redesXLee_(nombre, def) {
  const p = PropertiesService.getScriptProperties(), n = Number(p.getProperty(nombre + '_N') || 0);
  let s = ''; for (let i = 0; i < n; i++) s += p.getProperty(nombre + '_' + i) || '';
  try { return s ? JSON.parse(s) : def; } catch (e) { return def; }
}

function redesXLanza_() {
  const token = PropertiesService.getScriptProperties().getProperty('TOKEN');   // el de despertador.gs
  if (!token) return 'Falta la propiedad TOKEN (la del despertador)';
  const r = UrlFetchApp.fetch('https://api.github.com/repos/' + REDESX_REPO + '/actions/workflows/redes-x.yml/dispatches', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({ ref: 'main' }),
  });
  return r.getResponseCode() === 204 ? '' : 'GitHub respondió ' + r.getResponseCode();
}

/** Peticiones POST de Redes → X. Devuelve null si la acción no es de aquí. */
function redesX_(d) {
  if (['redesXLeer', 'redesXPedir', 'redesXGuardar'].indexOf(d.accion) < 0) return null;
  const p = PropertiesService.getScriptProperties();

  // GitHub devuelve los tuits leídos
  if (d.accion === 'redesXGuardar') {
    if (d.token !== TOKEN) return redesXJson_({ error: 'token' });     // TOKEN de avisos.gs
    const viejos = redesXLee_('REDESX_DATOS', {}), nuevos = d.datos || {};
    // Si un perfil falla esta vez, se conservan sus tuits de antes
    Object.keys(nuevos).forEach(function (u) { if (!(nuevos[u].error && viejos[u] && viejos[u].tuits)) viejos[u] = nuevos[u]; });
    const lista = redesXLee_('REDESX_LISTA', []);
    Object.keys(viejos).forEach(function (u) { if (lista.indexOf(u) < 0) delete viejos[u]; });   // fuera los que ya no están
    redesXEscribe_('REDESX_DATOS', viejos);
    p.setProperty('REDESX_ESTADO', JSON.stringify({ estado: String(d.estado || 'ok'), detalle: String(d.detalle || '').slice(0, 300), hora: Date.now() }));
    p.deleteProperty('REDESX_PEDIDO');
    return redesXJson_({ ok: true });
  }

  if (!redesXClaveOk_(d.clave)) return redesXJson_({ error: 'clave' });

  // La web manda su lista de perfiles de X y pide una lectura nueva
  if (d.accion === 'redesXPedir') {
    const lista = (Array.isArray(d.usuarios) ? d.usuarios : []).map(function (u) { return String(u).replace(/^@/, '').toLowerCase(); })
      .filter(function (u, i, a) { return /^\w{1,15}$/.test(u) && a.indexOf(u) === i; }).slice(0, REDESX_MAX_PERFILES);
    redesXEscribe_('REDESX_LISTA', lista);
    const pedido = Number(p.getProperty('REDESX_PEDIDO') || 0);
    if (Date.now() - pedido < REDESX_ESPERA_MIN * 60e3) return redesXJson_({ pedido: pedido, yaEnCurso: true });
    const error = lista.length ? redesXLanza_() : 'La lista está vacía';
    if (error) return redesXJson_({ error: error });
    p.setProperty('REDESX_PEDIDO', String(Date.now()));
    return redesXJson_({ pedido: Date.now() });
  }

  // La web pide lo último guardado
  return redesXJson_({ datos: redesXLee_('REDESX_DATOS', {}), estado: JSON.parse(p.getProperty('REDESX_ESTADO') || '{}'),
    pedido: Number(p.getProperty('REDESX_PEDIDO') || 0) });
}

/** GitHub pide la lista de perfiles (GET con el TOKEN de avisos.gs). Devuelve null si no es de aquí. */
function redesXGet_(e) {
  const q = e.parameter || {};
  if (q.accion !== 'redesXLista') return null;
  if (q.token !== TOKEN) return redesXJson_({ error: 'token' });
  return redesXJson_({ usuarios: redesXLee_('REDESX_LISTA', []) });
}
