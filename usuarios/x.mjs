// ÚNICO módulo que habla con X. El resto de la herramienta (Seguidos, búsquedas, recogidas…) pide aquí
// lo que necesite y nunca toca cookies: este módulo saca la sesión cifrada de la base de datos, la usa y la suelta.
//
// Todo pasa por un Chrome real (Playwright) con la sesión cargada: X ve un navegador normal y, cuando cambia
// su web, sigue funcionando sin tocar claves internas. Las cookies nunca salen en logs ni en errores.
//
// Límite de X (error 429): se marca la cuenta como «limitada por X» con la hora a la que X deja volver,
// y las lecturas esperan solas hasta entonces (si la espera es corta) o avisan (si es larga).
import * as almacen from "./almacen.mjs";
import { ESPERA_MAX_MIN, HAY_PANTALLA } from "./config.mjs";

export class ErrorX extends Error {
  // tipo: sin-cuenta | caducada | limitada | no-existe | cancelada | navegador | x
  constructor(tipo, mensaje, extra = {}) { super(mensaje); this.tipo = tipo; Object.assign(this, extra); }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const hora = ms => new Date(ms).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
const log = (...a) => console.log("[X]", ...a);   // solo @ y estados, jamás cookies
const ahoraISO = () => new Date().toISOString();

export const hayPantalla = HAY_PANTALLA;

// ───────────────────────── Navegador ─────────────────────────
let chromium = null;
async function lanza(headless) {
  if (!chromium) {
    try { ({ chromium } = await import("playwright-core")); }
    catch { throw new ErrorX("navegador", "Falta Playwright: ejecuta «npm install» en la carpeta usuarios."); }
  }
  const opc = { headless, args: ["--disable-blink-features=AutomationControlled"], ignoreDefaultArgs: ["--enable-automation"] };
  try { return await chromium.launch({ ...opc, channel: "chrome" }); }            // el Chrome instalado
  catch {
    try { return await chromium.launch(opc); }                                      // o el de Playwright
    catch { throw new ErrorX("navegador", "No encuentro Chrome: instala Google Chrome o ejecuta «npx playwright install chromium» en la carpeta usuarios."); }
  }
}

// Un Chrome invisible compartido para comprobar y leer; se cierra tras 2 min sin uso
let oculto = null, activos = 0, temporizador = null;
async function conContexto(cookies, fn) {
  activos++; clearTimeout(temporizador);
  try {
    if (!oculto) oculto = lanza(true).catch(e => { oculto = null; throw e; });
    let nav = await oculto;
    if (!nav.isConnected()) { oculto = lanza(true).catch(e => { oculto = null; throw e; }); nav = await oculto; }
    const so = process.platform === "darwin" ? "Macintosh; Intel Mac OS X 10_15_7" : process.platform === "win32" ? "Windows NT 10.0; Win64; x64" : "X11; Linux x86_64";
    const ctx = await nav.newContext({
      locale: "es-ES", timezoneId: "Europe/Madrid", viewport: { width: 1366, height: 900 },
      userAgent: `Mozilla/5.0 (${so}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${nav.version().split(".")[0]}.0.0.0 Safari/537.36`,
    });
    await ctx.addCookies(["auth_token", "ct0"].map(name => ({ name, value: cookies[name], domain: ".x.com", path: "/", secure: true, httpOnly: name === "auth_token", sameSite: "Lax" })));
    try { return await fn(ctx); } finally { await ctx.close().catch(() => {}); }
  } finally {
    if (--activos === 0) temporizador = setTimeout(() => { const p = oculto; oculto = null; p?.then(n => n.close()).catch(() => {}); }, 120e3);
  }
}

// Abre una página de X con la sesión y vigila las respuestas de su API: límites (429) y datos que se quieran capturar
async function visita(cookies, url, fn, capturar = []) {
  return conContexto(cookies, async ctx => {
    const pag = await ctx.newPage();
    const vigia = { limiteHasta: 0, datos: {}, pedida: new URL(url).pathname };
    pag.on("response", r => {
      const u = r.url();
      if (!/x\.com\/i\/api\/|api\.x\.com\//.test(u)) return;
      if (r.status() === 429) {
        const reset = Number(r.headers()["x-rate-limit-reset"]) * 1000;
        vigia.limiteHasta = Math.max(vigia.limiteHasta, reset > Date.now() ? reset : Date.now() + 15 * 60e3);
        return;
      }
      if (!r.ok()) return;
      const op = (u.match(/\/graphql\/[^/]+\/(\w+)/) || [])[1];
      // Quién es la cuenta: cualquier respuesta tipo «viewer»/«settings» que traiga el @
      if (/viewer|account\/settings|verify_credentials/i.test(u)) r.json().then(j => { vigia.yo ||= yoDeRespuesta(j); }).catch(() => {});
      if (op && (capturar.includes(op) || capturar.includes("*"))) r.json().then(j => (vigia.datos[op] ||= []).push(j)).catch(() => {});
    });
    await pag.goto(url, { waitUntil: "domcontentloaded", timeout: 45e3 });
    return fn(pag, vigia);
  });
}

// Busca en una respuesta de la API de X los datos de la propia cuenta (@, nombre, foto)
function yoDeRespuesta(j) {
  let hallado = null;
  const ver = n => {
    if (hallado || !n || typeof n !== "object") return;
    const sn = n.screen_name || n.core?.screen_name || n.legacy?.screen_name;
    if (typeof sn === "string" && /^\w{1,15}$/.test(sn)) {
      const foto = n.profile_image_url_https || n.legacy?.profile_image_url_https || n.avatar?.image_url || null;
      hallado = { usuario: sn, nombre: n.name || n.core?.name || n.legacy?.name || null, foto: foto ? foto.replace(/_normal\./, "_200x200.") : null };
      return;
    }
    for (const v of Object.values(n)) ver(v);
  };
  ver(j);
  return hallado;
}

const PERFIL = '[data-testid="AppTabBar_Profile_Link"], nav a[aria-label="Perfil"], nav a[aria-label="Profile"], a[aria-label="Perfil"], a[aria-label="Profile"]';
const FORM_LOGIN = 'input[autocomplete="username"], input[name="text"][autocomplete], [data-testid="loginButton"], a[href="/login"], a[href="/i/flow/login"]';

// ¿La página está dentro de la cuenta? Devuelve { usuario, nombre, foto } o lanza caducada / limitada / x.
// Con sesión mala X manda a la portada («/») o al formulario de entrada; con sesión buena se queda donde se pidió.
async function asegura(pag, vigia, segundos = 30) {
  const pedida = vigia.pedida ?? new URL(pag.url()).pathname;
  try {
    for (const fin = Date.now() + segundos * 1e3; Date.now() < fin; await sleep(500)) {
      if (vigia.limiteHasta) throw new ErrorX("limitada", `X pide esperar hasta las ${hora(vigia.limiteHasta)}`, { hasta: vigia.limiteHasta });
      const u = new URL(pag.url());
      if (/^\/account\/access/.test(u.pathname)) throw new ErrorX("caducada", "X ha bloqueado temporalmente la cuenta: entra en x.com con ella para desbloquearla y reconecta.");
      if (/^\/(i\/flow\/login|login|logout)\b/.test(u.pathname) || (u.pathname === "/" && pedida !== "/") || await pag.$(FORM_LOGIN))
        throw new ErrorX("caducada", "X ya no acepta esta sesión (ha caducado o se cerró).");
      if (vigia.yo) return vigia.yo;
      const enlace = await pag.$(PERFIL);
      if (enlace) {
        const usuario = ((await enlace.getAttribute("href")) || "").replace(/^.*\//, "");
        if (/^\w{1,15}$/.test(usuario)) {
          await sleep(1500);            // por si llega la respuesta con la foto
          if (vigia.yo?.usuario?.toLowerCase() === usuario.toLowerCase()) return vigia.yo;
          const foto = await pag.$eval(`img[src*="/profile_images/"]`, i => i.src).catch(() => null);
          return { usuario, nombre: null, foto: foto ? foto.replace(/_normal\./, "_200x200.") : null };
        }
      }
    }
  } catch (e) {
    if (e instanceof ErrorX) throw e;
    if (pag.isClosed()) throw new ErrorX("cancelada", "Se cerró la ventana antes de terminar.");
    throw new ErrorX("x", "X no ha respondido como se esperaba: " + String(e.message).split("\n")[0]);
  }
  throw new ErrorX("x", "X no ha terminado de cargar (puede ser la conexión o un cambio en su web).");
}

// ───────────────────────── Sesiones y límites ─────────────────────────
const colas = new Map();   // una operación a la vez por cuenta
function enCola(clave, tarea) {
  const p = (colas.get(clave) || Promise.resolve()).then(tarea);
  colas.set(clave, p.catch(() => {}));
  return p;
}

function marcaLimite(cuenta, hasta) {
  log(`@${cuenta.usuario}: X ha puesto un límite (429); se para hasta las ${hora(hasta)}`);
  if (cuenta.id) almacen.actualiza(cuenta.id, { estado: "limitada", limitada_hasta: hasta, comprobada: ahoraISO(), detalle: `X pide esperar hasta las ${hora(hasta)}` });
}

// Ejecuta fn(pag, vigia) en `url` con la sesión de `cuenta` ({id,usuario} guardada, o {cookies,usuario} sin guardar)
async function operar(cuenta, url, fn, { esperar = true, capturar = [] } = {}) {
  for (let intento = 0; ; intento++) {
    const hasta = cuenta.id ? (almacen.una(cuenta.id)?.limitada_hasta || 0) : 0;
    if (hasta > Date.now()) {
      const falta = hasta - Date.now();
      if (!esperar || falta > ESPERA_MAX_MIN * 60e3 || intento > 1)
        throw new ErrorX("limitada", `X ha limitado @${cuenta.usuario}: se podrá usar otra vez a las ${hora(hasta)}.`, { hasta });
      log(`@${cuenta.usuario}: esperando ${Math.ceil(falta / 60e3)} min por el límite de X…`);
      await sleep(falta + 3000);
    }
    const cookies = cuenta.id ? almacen.cookiesDe(cuenta.id) : cuenta.cookies;
    if (!cookies || cookies.error || !cookies.auth_token || !cookies.ct0) {
      const motivo = cookies?.error || "No hay sesión guardada para esta cuenta.";
      if (cuenta.id) almacen.actualiza(cuenta.id, { estado: "caducada", detalle: motivo, comprobada: ahoraISO() });
      throw new ErrorX("caducada", motivo);
    }
    try {
      return await enCola(cuenta.id ?? "nueva", () => visita(cookies, url, fn, capturar));
    } catch (e) {
      if (e.tipo === "limitada") {
        marcaLimite(cuenta, e.hasta);
        if (esperar && cuenta.id && intento < 2) continue;   // arriba se espera a la hora que diga X y se reintenta
        e.message = `X ha limitado @${cuenta.usuario}: se podrá usar otra vez a las ${hora(e.hasta)}.`;
      }
      if (e.tipo === "caducada" && cuenta.id) {
        almacen.actualiza(cuenta.id, { estado: "caducada", detalle: e.message, comprobada: ahoraISO() });
        log(`@${cuenta.usuario}: sesión caducada`);
      }
      throw e;
    }
  }
}

// ───────────────────────── Cuentas (lo que usa la sección Usuarios) ─────────────────────────
export const cuentas = () => almacen.lista();

export async function comprobar(id, { esperar = false } = {}) {
  const c = almacen.una(id);
  if (!c) throw new ErrorX("sin-cuenta", "Esa cuenta no existe.");
  try {
    let yo = await operar(c, "https://x.com/home", asegura, { esperar });
    if (!(yo.foto || c.foto) || !(yo.nombre || c.nombre)) yo = await completaPerfil(c, yo);
    almacen.actualiza(id, { estado: "conectada", detalle: null, comprobada: ahoraISO(), limitada_hasta: null, foto: yo.foto || c.foto, nombre: yo.nombre || c.nombre });
  } catch (e) {
    // caducada y limitada ya quedan marcadas; si es la red o X que no carga, no se da la sesión por perdida
    if (!["caducada", "limitada"].includes(e.tipo)) almacen.actualiza(id, { comprobada: ahoraISO(), detalle: "No se pudo comprobar: " + e.message });
  }
  return almacen.una(id);
}

export async function comprobarTodas() {
  for (const c of almacen.lista()) {
    if (c.estado === "limitada" && c.limitada_hasta > Date.now()) continue;   // se mira cuando X deje
    const r = await comprobar(c.id).catch(() => null);
    if (r && r.estado !== c.estado) log(`@${c.usuario}: ${c.estado} → ${r.estado}`);
  }
  return almacen.lista();
}

// Si en /home no salieron la foto o el nombre, se leen del propio perfil (consulta UserByScreenName de X)
async function completaPerfil(cuenta, yo) {
  if (yo.foto && yo.nombre) return yo;
  try {
    const mas = await operar(cuenta, `https://x.com/${yo.usuario}`, async (pag, vigia) => {
      for (const fin = Date.now() + 12e3; Date.now() < fin && !vigia.datos.UserByScreenName; ) await sleep(300);
      return (vigia.datos.UserByScreenName || []).map(yoDeRespuesta).find(u => u?.usuario?.toLowerCase() === yo.usuario.toLowerCase());
    }, { esperar: false, capturar: ["UserByScreenName"] });
    return { ...yo, foto: yo.foto || mas?.foto || null, nombre: yo.nombre || mas?.nombre || null };
  } catch { return yo; }
}

export const quitar = id => almacen.quita(id);
export const usarParaLeer = id => almacen.usarParaLeer(id);

const limpiaCookie = v => String(v || "").trim().replace(/^["']|["']$/g, "").replace(/^(auth_token|ct0)=/, "").replace(/;.*$/, "");

// Conexión pegando las cookies (servidores sin pantalla). Se comprueban con X antes de guardarlas.
export async function conectarConCookies(authToken, ct0) {
  const cookies = { auth_token: limpiaCookie(authToken), ct0: limpiaCookie(ct0) };
  if (!/^[A-Za-z0-9]{20,200}$/.test(cookies.auth_token)) throw new ErrorX("x", "auth_token no tiene buena pinta: copia solo el valor (letras y números).");
  if (!/^[A-Za-z0-9]{20,400}$/.test(cookies.ct0)) throw new ErrorX("x", "ct0 no tiene buena pinta: copia solo el valor (letras y números).");
  let yo;
  try { yo = await operar({ usuario: "(nueva)", cookies }, "https://x.com/home", asegura, { esperar: false }); }
  catch (e) { throw e.tipo === "caducada" ? new ErrorX("caducada", "X no acepta esas cookies: la sesión no es válida o ya ha caducado.") : e; }
  yo = await completaPerfil({ usuario: yo.usuario, cookies }, yo);
  const cuenta = almacen.guarda({ ...yo, cookies });
  log(`@${cuenta.usuario}: conectada con cookies pegadas`);
  return cuenta;
}

// Conexión con ventana: tú inicias sesión a mano; aquí solo se espera a las cookies. La contraseña nunca pasa por aquí.
let conexion = { activa: false, mensaje: "", error: "", cuenta: null };
export const estadoConexion = () => ({ ...conexion });

export function conectarConNavegador() {
  if (!HAY_PANTALLA) throw new ErrorX("navegador", "Aquí no hay pantalla para abrir la ventana: pega las cookies en el formulario.");
  if (conexion.activa) return estadoConexion();
  conexion = { activa: true, mensaje: "Abriendo la ventana de X…", error: "", cuenta: null };
  (async () => {
    let nav;
    try {
      nav = await lanza(false);
      const ctx = await nav.newContext({ viewport: null, locale: "es-ES" });
      const pag = await ctx.newPage();
      await pag.goto("https://x.com/login", { waitUntil: "domcontentloaded", timeout: 60e3 });
      conexion.mensaje = "Inicia sesión en la ventana de X (con el código si te lo pide)…";
      const tope = Date.now() + 15 * 60e3;
      for (;;) {
        if (!nav.isConnected() || pag.isClosed()) throw new ErrorX("cancelada", "Se cerró la ventana antes de iniciar sesión.");
        if (Date.now() > tope) throw new ErrorX("cancelada", "Han pasado 15 minutos sin iniciar sesión.");
        const cs = await ctx.cookies("https://x.com").catch(() => []);
        if (cs.some(c => c.name === "auth_token" && c.value)) break;
        await sleep(1000);
      }
      conexion.mensaje = "Sesión iniciada; leyendo la cuenta…";
      // X renueva ct0 justo después de entrar: se espera a que termine de cargar y se lee la definitiva
      for (const fin = Date.now() + 15e3; Date.now() < fin && !pag.isClosed() && !/^\/home/.test(new URL(pag.url()).pathname); ) await sleep(500);
      await sleep(3000);
      const cs = await ctx.cookies("https://x.com");
      const auth_token = cs.find(c => c.name === "auth_token")?.value, ct0 = cs.find(c => c.name === "ct0")?.value;
      if (!auth_token || !ct0) throw new ErrorX("x", "X no ha dado las cookies esperadas (auth_token y ct0).");
      await nav.close().catch(() => {}); nav = null;
      // Misma comprobación que con las cookies pegadas: así se sabe que valen y se leen el @ y la foto
      let yo = await operar({ usuario: "(nueva)", cookies: { auth_token, ct0 } }, "https://x.com/home", asegura, { esperar: false });
      yo = await completaPerfil({ usuario: yo.usuario, cookies: { auth_token, ct0 } }, yo);
      const cuenta = almacen.guarda({ ...yo, cookies: { auth_token, ct0 } });
      conexion = { activa: false, mensaje: `Conectada @${cuenta.usuario}`, error: "", cuenta: cuenta.id };
      log(`@${cuenta.usuario}: conectada desde la ventana`);
    } catch (e) {
      conexion = { activa: false, mensaje: "", error: e instanceof ErrorX ? e.message : "No se pudo conectar: " + String(e.message).split("\n")[0], cuenta: null };
    } finally { await nav?.close().catch(() => {}); }
  })();
  return estadoConexion();
}

// ───────────────────────── Lectura (lo que usa el resto de la herramienta) ─────────────────────────
const FRESCA_MS = 5 * 60e3;

// Antes de cada recogida: la cuenta marcada para leer, comprobada hace menos de 5 min.
// Si esa no vale, se usa otra conectada (sin cambiar la marca).
export async function sesionParaLeer({ esperar = true } = {}) {
  const lista = almacen.lista();
  if (!lista.length) throw new ErrorX("sin-cuenta", "No hay ninguna cuenta de X conectada: conéctala en Usuarios.");
  let motivo = "";
  for (const c of lista) {   // la de lectura va primero
    if (c.estado === "caducada") { motivo ||= `@${c.usuario} está caducada`; continue; }
    if (c.estado === "limitada" && c.limitada_hasta > Date.now() && !c.lectura) continue;
    const fresca = c.estado === "conectada" && Date.now() - Date.parse(c.comprobada || 0) < FRESCA_MS;
    const r = fresca ? c : await comprobar(c.id, { esperar });
    if (r.estado !== "conectada") { motivo ||= `@${c.usuario}: ${r.detalle || r.estado}`; continue; }
    if (!c.lectura) log(`la cuenta de lectura no está disponible; se lee con @${c.usuario}`);
    return { id: c.id, usuario: c.usuario };
  }
  throw new ErrorX("caducada", `Ninguna cuenta de X está lista (${motivo}). Reconecta en Usuarios.`);
}

const normUsuario = u => {
  const h = String(u || "").trim().replace(/^(https?:\/\/)?(www\.|mobile\.)?(x|twitter)\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "");
  if (!/^\w{1,15}$/.test(h)) throw new ErrorX("no-existe", `«${u}» no es un nombre de usuario de X válido.`);
  return h;
};

// Lee una página de X con la sesión de lectura y devuelve las respuestas de la API de X que la propia página pida.
// Es la pieza para Seguidos y búsquedas, por ejemplo:
//   capturar(`https://x.com/${usuario}/following`, ["Following"])
//   capturar(`https://x.com/search?q=${encodeURIComponent("Segovia")}&f=live`, ["SearchTimeline"])
export async function capturar(url, operaciones, { esperar = true, segundos = 25, alCargar, listo } = {}) {
  const s = await sesionParaLeer({ esperar });
  const cuenta = almacen.una(s.id);
  return operar(cuenta, url, async (pag, vigia) => {
    await asegura(pag, vigia);
    const fijas = operaciones.filter(o => o !== "*");   // "*" = guardar además cualquier otra respuesta de la API
    for (const fin = Date.now() + segundos * 1e3; Date.now() < fin && !(listo ? listo(vigia.datos) : fijas.length && fijas.every(o => vigia.datos[o])); await sleep(400))
      if (vigia.limiteHasta) throw new ErrorX("limitada", `X pide esperar hasta las ${hora(vigia.limiteHasta)}`, { hasta: vigia.limiteHasta });
    const extra = alCargar ? await alCargar(pag) : undefined;
    return { datos: vigia.datos, extra, cuenta: s.usuario };
  }, { esperar, capturar: operaciones });
}

// Saca los tuits de una respuesta de la API de X (sin el fijado)
export function tuitsDeRespuesta(json) {
  const out = [];
  const tuit = r => {
    if (r?.__typename === "TweetWithVisibilityResults") r = r.tweet;
    const l = r?.legacy, id = r?.rest_id || l?.id_str;
    if (!l || !id) return null;
    const autor = r.core?.user_results?.result;
    const usuario = autor?.core?.screen_name || autor?.legacy?.screen_name || "i";
    const rt = l.retweeted_status_result?.result;
    const original = rt?.__typename === "TweetWithVisibilityResults" ? rt.tweet : rt;
    const texto = original ? `RT: ${original.note_tweet?.note_tweet_results?.result?.text || original.legacy?.full_text || ""}`
      : r.note_tweet?.note_tweet_results?.result?.text || l.full_text || "";
    const media = ((original?.legacy || l).extended_entities?.media || []).map(m => m.media_url_https).filter(Boolean).slice(0, 4);
    return { id, fecha: new Date(l.created_at).toISOString(), texto, url: `https://x.com/${usuario}/status/${id}`, retuit: Boolean(rt), fotos: media };
  };
  const ver = nodo => {
    if (!nodo || typeof nodo !== "object") return;
    if (Array.isArray(nodo)) return nodo.forEach(ver);
    if (nodo.type === "TimelinePinEntry") return;
    if (nodo.tweet_results?.result) { const t = tuit(nodo.tweet_results.result); if (t) out.push(t); return; }
    for (const v of Object.values(nodo)) ver(v);
  };
  ver(json);
  return out;
}

const TUITS_EN_PAGINA = as => as.map(a => {
  const ctx = a.querySelector('[data-testid="socialContext"]')?.innerText || "";
  const t = a.querySelector("time");
  return { fijado: /fijad|pinned/i.test(ctx), retuit: /repost|retuit|republic/i.test(ctx), texto: a.querySelector('[data-testid="tweetText"]')?.innerText || "",
    fecha: t?.getAttribute("datetime") || null, url: t?.closest("a")?.href || null };
});

// Últimos n tuits de una cuenta pública (sin el fijado), del más nuevo al más viejo
export async function ultimosTuits(usuario, n = 5, opc = {}) {
  const h = normUsuario(usuario);
  const deEste = t => t.url.toLowerCase().startsWith(`https://x.com/${h.toLowerCase()}/`);
  const esLista = o => o === "UserTweets" || /Tweets|Timeline/.test(o);
  const r = await capturar(`https://x.com/${h}`, ["*"], {
    ...opc,
    listo: datos => Object.entries(datos).some(([o, l]) => esLista(o) && l.some(j => tuitsDeRespuesta(j).filter(deEste).length >= n)),
    alCargar: async pag => {
      if (await pag.$('[data-testid="emptyState"]') && !(await pag.$('article[data-testid="tweet"]'))) {
        const txt = (await pag.$eval('[data-testid="emptyState"]', e => e.innerText).catch(() => "")).split("\n")[0];
        throw new ErrorX("no-existe", `@${h}: ${txt || "no hay tuits que leer"}`);
      }
      return pag.$$eval('article[data-testid="tweet"]', TUITS_EN_PAGINA).catch(() => []);
    },
  });
  // Lo que pidió la página para el perfil (UserTweets, o como lo llame X si lo renombra), solo de este autor
  const ops = Object.keys(r.datos).filter(esLista);
  let tuits = ops.flatMap(o => r.datos[o].flatMap(tuitsDeRespuesta)).filter(deEste);
  if (!tuits.length) tuits = (r.extra || []).filter(t => !t.fijado && t.fecha);   // plan B: lo que se ve en la página
  const vistos = new Set();
  tuits = tuits.filter(t => !vistos.has(t.url) && vistos.add(t.url)).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, n);
  if (!tuits.length) throw new ErrorX("x", `No se han podido leer tuits de @${h}.`);
  return { usuario: h, leidoCon: r.cuenta, tuits };
}

// Para cerrar limpio (pruebas y apagado)
export async function cerrar() { clearTimeout(temporizador); const p = oculto; oculto = null; await p?.then(n => n.close()).catch(() => {}); }
