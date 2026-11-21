/* ===== Redes · publicaciones: las cuatro redes con la misma tarjeta =====
   Cada red trae sus publicaciones (Instagram, Facebook y TikTok del Worker de Cloudflare; X del Worker o, mientras no las dé,
   de la cuenta de lectura vía Apps Script). Aquí se pasan todas al mismo formato y se pintan igual: historias arriba
   (una por perfil), buscador y todas las publicaciones mezcladas por fecha y hora, separadas por días.
   Pensado para trabajo de investigación: fecha y hora exactas (hora peninsular), cifras tal como estaban al consultar,
   contexto completo (respuesta, repost, cita, enlace compartido, ubicación…) y botones para copiar el enlace o la ficha.

   Formato que se espera de /api/feed?red=…&usuario=… (lo que falte, simplemente no se muestra):
   { perfiles:[{ usuario, nombre, avatar, seguidores, siguiendo, total, verificado, bio }], errores:[{ error }],
     posts:[{ id, url, usuario, autor, avatar, verificado, fecha, texto, imagenes:[], video, esVideo, duracion,
              tipo:"post|carrusel|reel|video|retuit|respuesta|cita|compartido|historia", fijado, editado,
              respuestaA, repostDe:{ autor, usuario }, cita:{ autor, usuario, texto, url, fecha, imagen },
              enlace:{ url, titulo, dominio, imagen }, ubicacion, musica, colaboradores:[],
              metricas:{ likes, respuestas, compartidos, vistas, guardados } }] } */

const RS_RED_API = {ig:"instagram", fb:"facebook", x:"x", tt:"tiktok"};
const RS_CACHE = {}, RS_PAG = 24, RS_TZ = "Europe/Madrid";
const RS_SVG = {
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M16.8 3.6c-1.9 0-3.6 1-4.8 2.6-1.2-1.6-2.9-2.6-4.8-2.6C4.3 3.6 2 6 2 9c0 5.6 8.5 11 10 11.5 1.5-.5 10-5.9 10-11.5 0-3-2.3-5.4-5.2-5.4z"/></svg>`,
  com: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M20.7 16.2A9.5 9.5 0 1 0 17 20.1L21.5 21z"/></svg>`,
  rep: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4l7 7-7 7v-4c-6 0-9 2-11 6 0-7 4-11 11-12z"/></svg>`,
  ojo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
  guarda: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
  abre: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>`,
  todos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>`,
  ok: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  copia: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>`,
  enlace: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>`,
  ficha: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 3l6 6-3 1-3 3 .5 4.5L13 20l-4-4-5 5-1-1 5-5-4-4 2.5-2.5L11 9l3-3z"/></svg>`,
  lugar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`,
  musica: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  resp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v6"/></svg>`,
  verif: `<svg viewBox="0 0 24 24" aria-label="Cuenta verificada"><path fill="#1D9BF0" d="M12 1.5l2.6 1.9 3.2-.2 1 3 2.7 1.8-.9 3.1.9 3.1-2.7 1.8-1 3-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3-2.7-1.8.9-3.1-.9-3.1 2.7-1.8 1-3 3.2.2z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M7.8 12.2l2.8 2.8 5.6-5.8"/></svg>`,
  buscar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`
};
// Cómo llama cada red a cada cosa (para que la tarjeta y la ficha hablen como la propia red)
const RS_NOM = {
  ig: { likes:"Me gusta", respuestas:"Comentarios", compartidos:"Compartidos", vistas:"Reproducciones", guardados:"Guardados", pub:"publicación" },
  fb: { likes:"Reacciones", respuestas:"Comentarios", compartidos:"Veces compartido", vistas:"Reproducciones", guardados:"Guardados", pub:"publicación" },
  x:  { likes:"Me gusta", respuestas:"Respuestas", compartidos:"Reposts", vistas:"Visualizaciones", guardados:"Guardados", pub:"tuit" },
  tt: { likes:"Me gusta", respuestas:"Comentarios", compartidos:"Compartidos", vistas:"Reproducciones", guardados:"Guardados", pub:"vídeo" }
};
const RS_ICO_M = { likes:RS_SVG.heart, respuestas:RS_SVG.com, compartidos:RS_SVG.rep, vistas:RS_SVG.ojo, guardados:RS_SVG.guarda };
const RS_TIPO = { reel:"Reel", video:"Vídeo", carrusel:"Carrusel", retuit:"Repost", respuesta:"Respuesta", cita:"Cita", compartido:"Compartido", historia:"Historia", directo:"Directo" };
const RS_TAG = { ig: w=>`https://www.instagram.com/explore/tags/${w}/`, fb: w=>`https://www.facebook.com/hashtag/${w}`, x: w=>`https://x.com/hashtag/${w}`, tt: w=>`https://www.tiktok.com/tag/${w}` };
const RS_MEN = { ig: u=>`https://www.instagram.com/${u}/`, fb: u=>`https://www.facebook.com/${u}`, x: u=>`https://x.com/${u}`, tt: u=>`https://www.tiktok.com/@${u}` };

/* ---------- Fechas (siempre en hora peninsular, aunque el ordenador esté en otra zona) ---------- */
const rsF = (f, o) => new Date(f).toLocaleString("es-ES", { timeZone: RS_TZ, ...o });
const rsHora = f => rsF(f, { hour:"2-digit", minute:"2-digit" });
const rsCorta = f => rsF(f, { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" });
const rsLarga = f => { const t = rsF(f, { weekday:"long", day:"numeric", month:"long", year:"numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
const rsDiaClave = f => rsF(f, { year:"numeric", month:"2-digit", day:"2-digit" });
const rsDia = f => { const k = rsDiaClave(f); if (k === rsDiaClave(Date.now())) return "Hoy"; if (k === rsDiaClave(Date.now() - 864e5)) return "Ayer";
  const mismo = rsF(f, { year:"numeric" }) === rsF(Date.now(), { year:"numeric" });
  const t = rsF(f, mismo ? { weekday:"long", day:"numeric", month:"long" } : { weekday:"long", day:"numeric", month:"long", year:"numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
const rsHace = f => { const s = (Date.now() - new Date(f)) / 1000; if (!(s >= 0) || s > 7 * 86400) return "";
  return s < 60 ? "ahora mismo" : s < 3600 ? `hace ${Math.round(s / 60)} min` : s < 86400 ? `hace ${Math.round(s / 3600)} h` : `hace ${Math.round(s / 86400)} d`; };
const rsDur = s => s > 0 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "";
const rsExacto = n => n == null ? "" : Number(n).toLocaleString("es-ES");
const rsUsr = u => String(u || "").replace(/^@/, "");
const rsImg = s => !s ? "" : /^\//.test(s) ? API + s : s; // el Worker da rutas propias (/api/img…); las demás van tal cual

/* ---------- Búsqueda: sin distinguir mayúsculas ni tildes, y resaltando lo encontrado ---------- */
const rsSinTilde = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const rsQRe = q => { q = String(q || "").trim(); if (!q) return null;
  const m = { a:"aáàäâ", e:"eéèëê", i:"iíìïî", o:"oóòöô", u:"uúùüû", n:"nñ", c:"cç" };
  return new RegExp(rsSinTilde(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[aeiounc]/g, ch => `[${m[ch]}]`), "giu"); };
const rsEscM = (s, re) => { s = String(s ?? ""); if (!re) return esc(s); let out = "", ult = 0;
  s.replace(re, (m, i) => { out += esc(s.slice(ult, i)) + `<mark>${esc(m)}</mark>`; ult = i + m.length; return m; });
  return out + esc(s.slice(ult)); };
const rsCasa = (o, q) => { const t = rsSinTilde(q).trim(); if (!t) return true;
  return [o.texto, o.autor, o.usuario, o.p.n, o.p.g, o.ubicacion, o.musica, o.respuestaA, o.cita && o.cita.texto, o.cita && o.cita.usuario, o.enlace && o.enlace.titulo, o.repostDe && o.repostDe.usuario, ...(o.colaboradores || [])]
    .some(v => v && rsSinTilde(v).includes(t)); };
// Texto con enlaces, #etiquetas y @menciones que llevan a la red de la publicación
function rsTexto(t, red, re){
  const R = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)»])|(^|[\s(¡¿«])([#@])([\p{L}\p{N}_.]*[\p{L}\p{N}_])/gu;
  let out = "", ult = 0, m;
  while ((m = R.exec(t))){
    out += rsEscM(t.slice(ult, m.index), re);
    if (m[1]) out += `<a href="${esc(m[1])}" target="_blank" rel="noopener noreferrer">${rsEscM(m[1].replace(/^https?:\/\/(www\.)?/, "").slice(0, 60) + (m[1].length > 68 ? "…" : ""), re)}</a>`;
    else out += esc(m[2]) + `<a href="${esc((m[3] === "#" ? RS_TAG : RS_MEN)[red](encodeURIComponent(m[4])))}" target="_blank" rel="noopener noreferrer">${m[3]}${rsEscM(m[4], re)}</a>`;
    ult = m.index + m[0].length;
  }
  return out + rsEscM(t.slice(ult), re);
}

/* ---------- Datos: cada red al mismo formato ---------- */
function rsNorm(x, p){
  const red = p.r, usuario = rsUsr(x.usuario || p.u), fecha = x.fecha || x.date || "";
  return { k: red + ":" + (x.id || x.url || usuario + fecha), red, p, id: x.id || "", url: x.url || redUrl(red, p.u),
    usuario, autor: x.autor || "", avatar: rsImg(x.avatar), verificado: !!x.verificado, fecha,
    texto: String(x.texto || "").trim(), imagenes: (x.imagenes || []).map(rsImg).filter(Boolean), video: rsImg(x.video),
    esVideo: !!(x.esVideo || x.video || /^(reel|video)$/.test(x.tipo || "")), duracion: +x.duracion || 0,
    tipo: x.tipo || "", fijado: !!x.fijado, editado: !!x.editado, respuestaA: x.respuestaA ? rsUsr(x.respuestaA) : "",
    repostDe: x.repostDe && x.repostDe.usuario ? { autor: x.repostDe.autor || "", usuario: rsUsr(x.repostDe.usuario) } : null,
    cita: x.cita && (x.cita.texto || x.cita.url) ? { ...x.cita, usuario: rsUsr(x.cita.usuario), imagen: rsImg(x.cita.imagen) } : null,
    enlace: x.enlace && x.enlace.url ? { ...x.enlace, imagen: rsImg(x.enlace.imagen), dominio: x.enlace.dominio || (String(x.enlace.url).match(/^https?:\/\/(?:www\.)?([^/]+)/) || [])[1] || "" } : null,
    ubicacion: x.ubicacion || "", musica: x.musica || "", colaboradores: (x.colaboradores || []).map(rsUsr).filter(Boolean),
    m: x.metricas || {} };
}
// X mientras el Worker no lo dé: lo que guardó la cuenta de lectura en el Apps Script (texto, fotos, fecha y si es repost)
const rsDesdeXScript = p => (((st.redesX || {}).datos || {})[redXUsuario(p.u)] || {}).tuits || [];
const rsXScriptPost = t => ({ id: t.id || t.url, url: t.url, fecha: t.fecha, texto: t.texto, imagenes: t.fotos || [], tipo: t.rt ? "retuit" : "" });
async function rsTrae(p){
  if (RS_DEMO) return (window.RS_DEMO_FEED || {})[p.id] || { posts: [] };
  const k = p.r + "|" + rsUsr(p.u).toLowerCase(), c = RS_CACHE[k];
  if (c && Date.now() - c.t < 5 * 60e3) return c.d;
  let d = { posts: [] };
  try {
    const r = await fetch(`${API}/api/feed?red=${RS_RED_API[p.r]}&usuario=${encodeURIComponent(p.u)}`);
    if (!r.ok) throw new Error("el servidor respondió " + r.status);
    d = await r.json();
  } catch(e){ d = { posts: [], errores: [{ error: e.message || "el servidor no responde" }] }; }
  if (p.r === "x" && !(d.posts || []).length && rsDesdeXScript(p).length) d = { ...d, posts: rsDesdeXScript(p).map(rsXScriptPost), errores: [] };
  RS_CACHE[k] = { t: Date.now(), d }; return d;
}

/* ---------- Vista: historias, herramientas y feed ---------- */
const rsVista = (LF, clave) => { if (st.rsVer && !LF.some(p => p.id === st.rsVer)) st.rsVer = null;
  return `<div class="rz-deck rs-wrap" data-vista="${esc(clave)}"><div class="rs-stories" id="rsHist">${rsHistorias(LF)}</div>`
    + `<div class="rs-herr"><label class="rs-q">${RS_SVG.buscar}<input id="rsQ" type="search" autocomplete="off" placeholder="Buscar en las publicaciones: texto, perfil, #etiqueta, @mención, lugar…" value="${esc(st.rsQ || "")}" aria-label="Buscar en las publicaciones"></label>`
    + `<button class="rs-bt" data-act="redRsCopiaTodo" type="button" title="Copia la ficha de todas las publicaciones que se ven ahora, para pegarla en un informe">${RS_SVG.ficha}<span>Copiar fichas</span></button>`
    + `<button class="rs-bt" data-act="redRsRecarga" type="button" title="Volver a pedir las publicaciones ahora">↻<span>Actualizar</span></button></div>`
    + `<div class="rs-estado" id="rsEstado"></div>`
    + `<div class="rs-feed" id="rsFeed" data-ids="${esc(LF.map(p => p.id).join(","))}">${'<div class="rs-skel"></div>'.repeat(3)}</div></div>`; };
const rsLF = () => { const el = document.getElementById("rsFeed"); return el ? (el.dataset.ids || "").split(",").map(id => redesData().find(p => p.id === id)).filter(Boolean) : []; };
const rsClave = () => (document.querySelector(".rs-wrap") || { dataset:{} }).dataset.vista || "todas";
const rsEsNuevo = o => { const v = st.rs && st.rs.visto; return !!v && new Date(o.fecha).getTime() > v; };
// Foto: la puesta a mano; si no, la que da la red (perfil o publicación); si no, la traída de unavatar; si no, las iniciales
const rsFoto = p => { if (p.f) return p.f; const m = st.rs && st.rs.meta[p.id]; if (m && m.avatar) return rsImg(m.avatar);
  const o = st.rs && st.rs.posts.find(o => o.p.id === p.id && o.avatar); return o ? o.avatar : (p.fa || ""); };
const rsAvt = p => { const f = rsFoto(p); return f ? `<img src="${esc(f)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span>${esc(iniciales(p.n))}</span>`; };
function rsHistorias(LF){
  const ver = st.rsVer, hay = id => st.rs && st.rs.posts.some(o => o.p.id === id && rsEsNuevo(o)), mezcla = new Set(LF.map(p => p.r)).size > 1;
  return `<button class="rs-st" data-act="redRsVer" data-v="" aria-pressed="${!ver}"><span class="ring"><span>${RS_SVG.todos}</span></span><span class="n">Todos</span></button>`
    + LF.map(p => `<button class="rs-st${hay(p.id) ? " hay" : ""}" data-act="redRsVer" data-v="${esc(p.id)}" data-r="${p.r}" aria-pressed="${ver === p.id}" title="${esc(p.n)} · ${REDES[p.r].n}"><span class="ring">${rsAvt(p)}`
      + `${p.av ? `<span class="campana" title="Con aviso">${RI.bell}</span>` : mezcla ? `<span class="red">${redKey(p.r)}</span>` : ""}</span><span class="n">${esc(rsUsr(p.u))}</span></button>`).join("");
}
const rsHistRepinta = () => { const h = document.getElementById("rsHist"); if (h) h.innerHTML = rsHistorias(rsLF()); };

async function rsCarga(forzar){
  const el = document.getElementById("rsFeed"); if (!el || (el.dataset.ok && !forzar)) return; el.dataset.ok = "1";
  const perf = rsLF(), clave = rsClave();
  if (!RS_DEMO && perf.some(p => p.r === "x")) redesXAsegura();
  // La marca de «Nuevo» se fija al entrar en cada vista y dura toda la visita
  st.rsVistoV = st.rsVistoV || {}; const vistos = store.get("rsVisto", {}) || {};
  if (st.rsVistoV[clave] == null) st.rsVistoV[clave] = RS_DEMO ? Date.now() - 4 * 3600e3 : vistos[clave] || (clave === "ig" ? store.get("igVisto", 0) : 0) || 0;
  const res = await Promise.allSettled(perf.map(rsTrae));
  const posts = [], errs = [], meta = {}, vistas = new Set();
  res.forEach((r, i) => { const p = perf[i], d = r.status === "fulfilled" ? r.value : null, raw = (d && d.posts) || [];
    const ps = raw.map(x => seguro("una publicación de " + p.n, () => rsNorm(x, p), null)).filter(o => o && o.fecha && !vistas.has(o.k));
    ps.forEach(o => vistas.add(o.k));
    meta[p.id] = { ...((d && d.perfiles && d.perfiles[0]) || {}), n: ps.length, min: ps.length ? Math.min(...ps.map(o => new Date(o.fecha).getTime())) : 0 };
    if (!ps.length) errs.push({ p, e: d ? ((d.errores && d.errores[0] && d.errores[0].error) || (p.r === "x" && redXLeyendo() ? "leyendo en X…" : "sin publicaciones")) : "el servidor no responde" });
    posts.push(...ps); });
  posts.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  st.rs = { clave, posts, errs, meta, n: (st.rs && st.rs.clave === clave && st.rs.n) || RS_PAG, hora: Date.now(), visto: st.rsVistoV[clave] };
  if (!document.body.contains(el)) return;
  rsPinta();
  if (!RS_DEMO){ vistos[clave] = Date.now(); store.set("rsVisto", vistos); }
}
// Lo que se ve ahora (perfil elegido y búsqueda), en el orden del feed
const rsVisibles = () => { if (!st.rs) return []; const ver = st.rsVer, q = st.rsQ || "";
  return st.rs.posts.filter(o => (!ver || o.p.id === ver) && rsCasa(o, q)); };
function rsPinta(){
  const el = document.getElementById("rsFeed"); if (!el || !st.rs) return;
  const LF = rsLF(), ver = st.rsVer, q = (st.rsQ || "").trim(), re = rsQRe(q), M = st.rs.meta;
  rsHistRepinta();
  const L = rsVisibles(), errs = st.rs.errs.filter(e => !ver || e.p.id === ver);
  const est = document.getElementById("rsEstado");
  if (est){ const nPerf = new Set(L.map(o => o.p.id)).size;
    est.innerHTML = `<span>${q ? `<b>${plural(L.length, "publicación contiene", "publicaciones contienen")} «${esc(q)}»</b>` : `${plural(L.length, "publicación", "publicaciones")} de ${plural(nPerf, "perfil", "perfiles")}`} · consultado a las ${esc(rsHora(st.rs.hora))}</span>`
      + (LF.some(p => p.r === "x") && !RS_DEMO ? `<span class="rs-x" id="redXEstado">${redXEstadoHtml()}</span>` : ""); }
  let h = "";
  if (ver){ const p = LF.find(q => q.id === ver), m = M[ver] || {};
    if (p) h += `<div class="rs-perfil" data-r="${p.r}"><span class="ring">${rsAvt(p)}</span><div class="rs-pf-i"><section class="rz-col rs-pf" data-id="${esc(p.id)}"><header>${redCab(p)}</header></section>`
      + `<span class="cifras">${[m.total != null && `<b>${rsExacto(m.total)}</b> publicaciones`, m.seguidores != null && `<b>${rsExacto(m.seguidores)}</b> seguidores`, m.siguiendo != null && `<b>${rsExacto(m.siguiendo)}</b> seguidos`].filter(Boolean).join(" · ") || "Sin datos del perfil"}</span>`
      + (m.bio ? `<p class="bio">${rsTexto(m.bio, p.r, null)}</p>` : "")
      + `<a class="ver" href="${esc(redUrl(p.r, p.u))}" target="_blank" rel="noopener noreferrer">Ver perfil en ${REDES[p.r].n} ↗</a></div></div>`; }
  if (errs.length) h += `<p class="rs-errs">No se ha podido leer: ${errs.map(e => `${redKey(e.p.r)} <b>${esc(e.p.n)}</b> (${esc(e.e)})`).join(", ")}</p>`;
  if (!L.length) h += `<div class="rz-vacio"><b>${q ? "Nada encontrado" : "Sin publicaciones"}</b>${q ? "Ninguna publicación cargada contiene eso. Prueba con otra palabra." : ver ? "Este perfil no tiene publicaciones que se puedan leer ahora." : "Ningún perfil tiene publicaciones que se puedan leer ahora."}</div>`;
  /* El servidor trae solo las últimas de cada perfil (12 en Instagram). Un perfil que publica mucho las cubre en un día y otro en
     una semana: más atrás de la más antigua del primero ya solo saldrían las del segundo. En «Todos» (sin buscar) se enseña solo
     el tramo en que están todos los perfiles, bien mezclados por fecha y hora, y lo anterior queda detrás de un botón que lo explica. */
  const tm = o => new Date(o.fecha).getTime();
  const conPosts = LF.filter(p => (M[p.id] || {}).n > 0), tope = Math.max(0, ...conPosts.map(p => M[p.id].n));
  const llenos = tope >= 10 ? conPosts.filter(p => M[p.id].n === tope) : [];
  const corte = !ver && !q && conPosts.length > 1 && llenos.length ? Math.max(...llenos.map(p => M[p.id].min)) : 0;
  const cortos = corte ? llenos.filter(p => M[p.id].min === corte) : [];
  const antes = corte ? L.filter(o => tm(o) < corte).length : 0;
  const aviso = abierto => `<div class="rs-corte">${abierto ? "Desde aquí" : "Hasta aquí están todas, por fecha y hora. Más atrás"} ya no salen publicaciones de <b>${cortos.map(p => esc(p.n)).join("</b> ni de <b>")}</b>: el servidor solo trae las ${tope} últimas de cada perfil${abierto ? "." : ", así que las anteriores serían solo de los demás."}`
    + `<br><button class="btn ghost" data-act="redRsTodo">${abierto ? "Ocultar las anteriores" : `Ver también las anteriores (${antes})`}</button></div>`;
  const V = corte && !st.rsTodo ? L.filter(o => tm(o) >= corte) : L;
  let aldia = false, dia = "", cortado = false;
  V.slice(0, st.rs.n).forEach((o, i) => {
    if (!q && !aldia && i > 0 && !rsEsNuevo(o) && rsEsNuevo(V[i - 1])){ aldia = true;
      h += `<div class="rs-aldia"><div class="ok">${RS_SVG.ok}</div><b>Estás al día</b>Has visto todo lo nuevo desde tu última visita</div>`; }
    if (corte && !cortado && tm(o) < corte){ cortado = true; h += aviso(true); dia = ""; }
    if (rsDiaClave(o.fecha) !== dia){ dia = rsDiaClave(o.fecha); h += `<div class="rs-dia">${esc(rsDia(o.fecha))}</div>`; }
    h += seguro("una publicación de " + o.p.n, () => rsPost(o, re), "");
  });
  if (V.length > st.rs.n) h += `<button class="btn ghost rs-cargar" data-act="redRsMasPosts">Ver más publicaciones (${V.length - st.rs.n})</button>`;
  else if (corte && antes && !st.rsTodo) h += aviso(false);
  el.innerHTML = h;
}

/* ---------- La tarjeta ---------- */
function rsMedia(o){
  const imgs = o.imagenes, url = esc(o.url), dur = rsDur(o.duracion);
  const ab = (s, lazy) => `<a href="${url}" target="_blank" rel="noopener noreferrer"><img${lazy ? ' loading="lazy"' : ""} src="${esc(s)}" alt="" referrerpolicy="no-referrer"></a>`;
  if (o.video) return `<div class="rs-media"><video controls preload="none" playsinline src="${esc(o.video)}"${imgs[0] ? ` poster="${esc(imgs[0])}"` : ""}></video></div>`;
  if (!imgs.length) return o.esVideo ? `<a class="rs-media rs-sinimg" href="${url}" target="_blank" rel="noopener noreferrer">${RS_SVG.play}<span>Ver el vídeo en ${REDES[o.red].n}${dur ? " · " + dur : ""}</span></a>` : "";
  // X enseña hasta 4 fotos en mosaico; las demás redes, en carrusel
  if (o.red === "x" && imgs.length > 1 && imgs.length <= 4) return `<div class="rs-media rs-mosaico n${imgs.length}">${imgs.map((s, i) => ab(s, i > 0)).join("")}</div>`;
  if (imgs.length > 1) return `<div class="rs-media"><div class="rs-car">${imgs.map((s, i) => ab(s, i > 0)).join("")}</div><span class="rs-cnt">1/${imgs.length}</span>`
    + `<button class="rs-flecha izq" data-act="redRsCar" data-v="-1" aria-label="Anterior">‹</button><button class="rs-flecha der" data-act="redRsCar" data-v="1" aria-label="Siguiente">›</button></div>`
    + `<div class="rs-puntos">${imgs.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div>`;
  return `<div class="rs-media">${ab(imgs[0], true)}${o.esVideo ? `<span class="rs-vid">${RS_SVG.play}${dur ? `<b>${dur}</b>` : ""}</span>` : ""}</div>`;
}
function rsPost(o, re){
  const p = o.p, R = REDES[o.red], N = RS_NOM[o.red], nuevo = rsEsNuevo(o);
  const perfil = esc(redUrl(o.red, o.red === "fb" ? o.usuario : "@" + o.usuario)), url = esc(o.url);
  const nombre = o.autor && o.autor.toLowerCase() !== o.usuario.toLowerCase() ? o.autor : (p.n || o.usuario);
  const tipo = o.red === "tt" && o.tipo === "video" ? "" : RS_TIPO[o.tipo] || (o.esVideo && o.red !== "tt" ? "Vídeo" : ""); // en TikTok todo es vídeo
  // Contexto encima de la cabecera, como lo enseña cada red
  const ctx = [o.fijado && `<span>${RS_SVG.pin}Fijado</span>`,
    o.repostDe && `<span>${RS_SVG.rep}${esc(p.n)} ha reposteado a <a href="${esc(RS_MEN[o.red](encodeURIComponent(o.repostDe.usuario)))}" target="_blank" rel="noopener noreferrer">@${esc(o.repostDe.usuario)}</a></span>`,
    !o.repostDe && o.tipo === "retuit" && `<span>${RS_SVG.rep}Repost</span>`,
    o.respuestaA && `<span>${RS_SVG.resp}En respuesta a <a href="${esc(RS_MEN[o.red](encodeURIComponent(o.respuestaA)))}" target="_blank" rel="noopener noreferrer">@${esc(o.respuestaA)}</a></span>`].filter(Boolean).join("");
  const texto = o.texto, largo = texto.length > 280 || (texto.match(/\n/g) || []).length > 4;
  const extras = [o.ubicacion && `<span>${RS_SVG.lugar}${rsEscM(o.ubicacion, re)}</span>`, o.musica && `<span>${RS_SVG.musica}${rsEscM(o.musica, re)}</span>`,
    o.colaboradores.length && `<span>Con ${o.colaboradores.map(c => `<a href="${esc(RS_MEN[o.red](encodeURIComponent(c)))}" target="_blank" rel="noopener noreferrer">@${esc(c)}</a>`).join(", ")}</span>`,
    o.editado && `<span>Editado</span>`].filter(Boolean).join("");
  const cita = o.cita ? `<a class="rs-cita" href="${esc(o.cita.url || o.url)}" target="_blank" rel="noopener noreferrer"><span class="who"><b>${esc(o.cita.autor || "@" + o.cita.usuario)}</b>${o.cita.usuario ? ` @${esc(o.cita.usuario)}` : ""}${o.cita.fecha ? ` · ${esc(rsCorta(o.cita.fecha).slice(0, 10))}` : ""}</span>`
    + (o.cita.texto ? `<span class="t">${rsEscM(o.cita.texto, re)}</span>` : "") + (o.cita.imagen ? `<img loading="lazy" src="${esc(o.cita.imagen)}" alt="" referrerpolicy="no-referrer">` : "") + `</a>` : "";
  const enl = o.enlace ? `<a class="rs-enlace" href="${esc(o.enlace.url)}" target="_blank" rel="noopener noreferrer">${o.enlace.imagen ? `<img loading="lazy" src="${esc(o.enlace.imagen)}" alt="" referrerpolicy="no-referrer">` : ""}<span><small>${esc(o.enlace.dominio)}</small><b>${rsEscM(o.enlace.titulo || o.enlace.url, re)}</b></span></a>` : "";
  const met = ["respuestas", "compartidos", "likes", "vistas", "guardados"].map(k => { const n = o.m[k];
    return n == null || n < 0 ? "" : `<span class="k" title="${rsExacto(n)} ${N[k].toLowerCase()}">${RS_ICO_M[k]}<b>${redNum(n)}</b><i>${N[k]}</i></span>`; }).join("");
  // En X el texto va antes que las fotos; en Instagram y TikTok, debajo
  const txt = texto ? `<div class="rs-txt${largo ? " corto" : ""}">${rsTexto(texto, o.red, re)}</div>${largo ? `<button class="rs-mas" data-act="redRsMas">Ver más</button>` : ""}` : "";
  const arriba = o.red === "x" || o.red === "fb";
  return `<article class="rs-post${nuevo ? " nuevo" : ""}" data-r="${o.red}" data-k="${esc(o.k)}">`
    + (ctx ? `<div class="rs-ctx">${ctx}</div>` : "")
    + `<header><a class="av" href="${perfil}" target="_blank" rel="noopener noreferrer">${o.avatar ? `<img src="${esc(o.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : rsAvt(p)}</a>`
    + `<div class="who"><a class="nom" href="${perfil}" target="_blank" rel="noopener noreferrer">${rsEscM(nombre, re)}</a>${o.verificado ? `<span class="verif">${RS_SVG.verif}</span>` : ""}${nuevo ? `<span class="rs-nuevo">Nuevo</span>` : ""}`
    + `<small>${redKey(o.red)}<span>@${rsEscM(o.usuario, re)}${p.g ? " · " + esc(p.g) : ""}</span></small></div>`
    + (tipo ? `<span class="rs-tipo">${esc(tipo)}</span>` : "")
    + `<a class="abre" href="${url}" target="_blank" rel="noopener noreferrer" title="Abrir en ${R.n}" aria-label="Abrir en ${R.n}">${RS_SVG.abre}</a></header>`
    + (arriba ? txt : "") + rsMedia(o) + cita + enl + (arriba ? "" : txt)
    + (extras ? `<div class="rs-extra">${extras}</div>` : "")
    + (met ? `<div class="rs-met">${met}</div>` : "")
    + `<footer><time datetime="${esc(o.fecha)}" title="${esc(rsCorta(o.fecha))} (hora peninsular)">${esc(rsLarga(o.fecha))}, ${esc(rsHora(o.fecha))}${rsHace(o.fecha) ? " · " + esc(rsHace(o.fecha)) : ""}</time>`
    + `<span class="rs-acc"><button data-act="redRsEnlace" title="Copiar el enlace de la ${N.pub}" aria-label="Copiar enlace">${RS_SVG.enlace}</button><button data-act="redRsFicha" title="Copiar la ficha completa (red, perfil, fecha y hora, enlace, texto y cifras) para un informe" aria-label="Copiar ficha">${RS_SVG.ficha}</button></span></footer></article>`;
}

/* ---------- Ficha para informes ---------- */
function rsFicha(o){
  const N = RS_NOM[o.red], L = [], nfotos = o.imagenes.length;
  L.push(`Red: ${REDES[o.red].n}`);
  const nombre = o.autor && o.autor.toLowerCase() !== o.usuario.toLowerCase() ? o.autor : (o.p.n || o.usuario);
  L.push(`Perfil: ${nombre} (@${o.usuario})${o.p.g ? " · " + o.p.g : ""}${o.verificado ? " · verificado" : ""}`);
  L.push(`Fecha de publicación: ${rsCorta(o.fecha)} (hora peninsular)`);
  const tipo = RS_TIPO[o.tipo] || (o.esVideo ? "Vídeo" : nfotos > 1 ? "Carrusel" : "Publicación");
  L.push(`Tipo: ${tipo}${o.esVideo && o.duracion ? ` (${rsDur(o.duracion)})` : ""}${nfotos ? ` · ${plural(nfotos, "imagen", "imágenes")}` : ""}${o.fijado ? " · fijado" : ""}${o.editado ? " · editado" : ""}`);
  L.push(`Enlace: ${o.url}`);
  if (o.repostDe) L.push(`Repost de: @${o.repostDe.usuario}`);
  if (o.respuestaA) L.push(`En respuesta a: @${o.respuestaA}`);
  if (o.ubicacion) L.push(`Ubicación: ${o.ubicacion}`);
  if (o.musica) L.push(`Sonido: ${o.musica}`);
  if (o.colaboradores.length) L.push(`Con: ${o.colaboradores.map(c => "@" + c).join(", ")}`);
  L.push(`Texto:\n${o.texto || "(sin texto)"}`);
  if (o.cita) L.push(`Cita a ${o.cita.autor || ""} (@${o.cita.usuario}): ${o.cita.texto || ""}${o.cita.url ? "\n" + o.cita.url : ""}`);
  if (o.enlace) L.push(`Enlace compartido: ${o.enlace.titulo || ""}\n${o.enlace.url}`);
  const cif = ["likes", "respuestas", "compartidos", "vistas", "guardados"].filter(k => o.m[k] != null && o.m[k] >= 0).map(k => `${N[k]}: ${rsExacto(o.m[k])}`);
  if (cif.length) L.push(`Cifras (a ${rsCorta(st.rs ? st.rs.hora : Date.now())}): ${cif.join(" · ")}`);
  L.push(`Consultado: ${rsCorta(Date.now())} · Prensa Segovia`);
  return L.join("\n");
}
const rsCopia = (t, ok) => { const hecho = () => aviso(ok), plan = () => { const a = document.createElement("textarea"); a.value = t; a.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(a); a.select();
    try { document.execCommand("copy") ? hecho() : aviso("No se pudo copiar"); } catch(e){ aviso("No se pudo copiar"); } a.remove(); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(hecho, plan); else plan(); };
const rsDe = b => { const a = b.closest(".rs-post"); return a && st.rs ? st.rs.posts.find(o => o.k === a.dataset.k) : null; };

function rsAccion(act, b){
  if (act === "redRsVer"){ st.rsVer = b.dataset.v || null; rsPinta(); const m = document.querySelector(".rs-wrap"); if (m && m.getBoundingClientRect().top < 0) m.scrollIntoView({ behavior:"smooth" }); }
  else if (act === "redRsMas"){ const c = b.previousElementSibling; if (c) c.classList.remove("corto"); b.remove(); }
  else if (act === "redRsMasPosts"){ if (st.rs){ st.rs.n += RS_PAG; rsPinta(); } }
  else if (act === "redRsTodo"){ st.rsTodo = !st.rsTodo; rsPinta(); }
  else if (act === "redRsCar"){ const c = b.parentElement.querySelector(".rs-car"); if (c) c.scrollBy({ left: c.clientWidth * (+b.dataset.v || 1), behavior:"smooth" }); }
  else if (act === "redRsEnlace"){ const o = rsDe(b); if (o) rsCopia(o.url, "Enlace copiado"); }
  else if (act === "redRsFicha"){ const o = rsDe(b); if (o) rsCopia(rsFicha(o), "Ficha copiada"); }
  else if (act === "redRsCopiaTodo"){ const L = rsVisibles().slice(0, 200); if (!L.length){ aviso("No hay publicaciones que copiar"); return; }
    rsCopia(L.map(rsFicha).join("\n\n────────────\n\n"), plural(L.length, "ficha copiada", "fichas copiadas")); }
  else if (act === "redRsRecarga"){ Object.keys(RS_CACHE).forEach(k => delete RS_CACHE[k]); const el = document.getElementById("rsFeed"); if (el) el.innerHTML = '<div class="rs-skel"></div>'.repeat(3); rsCarga(true); }
  else return false;
  return true;
}
// Buscador: filtra lo cargado según se escribe, sin recargar nada
let rsQT = null;
document.addEventListener("input", e => { if (e.target.id !== "rsQ") return; clearTimeout(rsQT); rsQT = setTimeout(() => { st.rsQ = e.target.value; if (st.rs) st.rs.n = RS_PAG; rsPinta(); }, 160); });
// Carrusel: contador «2/5» y puntos al deslizar
document.addEventListener("scroll", e => { const c = e.target; if (!(c instanceof Element) || !c.classList.contains("rs-car")) return;
  const i = Math.round(c.scrollLeft / (c.clientWidth || 1)), m = c.parentElement, cnt = m.querySelector(".rs-cnt"), pts = m.nextElementSibling;
  if (cnt) cnt.textContent = `${i + 1}/${c.children.length}`;
  if (pts && pts.classList.contains("rs-puntos")) [...pts.children].forEach((d, j) => d.classList.toggle("on", j === i)); }, true);
