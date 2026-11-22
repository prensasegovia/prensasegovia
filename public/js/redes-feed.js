/* ===== Redes · publicaciones en Prensa Segovia =====
   La tarjeta, el formato común y la ficha para informes están en js/redes-tarjeta.js (el mismo archivo que usa Atalaya).
   Aquí va lo propio de esta web: pedir las publicaciones al servidor, las historias de cada perfil, el buscador y el feed.
   Instagram, Facebook y TikTok vienen del Worker de Cloudflare; X del Worker o, mientras no las dé, de la cuenta de
   lectura vía Apps Script. Todas se pasan al formato común y se pintan con la misma tarjeta. */
const RT = window.RedesTarjeta;
const RS_CACHE = {}, RS_PAG = 24;
const rsImg = s => !s ? "" : /^\//.test(s) ? API + s : s; // el Worker da rutas propias (/api/img…); las demás van tal cual

/* ---------- Datos ---------- */
// X mientras el Worker no lo dé: lo que guardó la cuenta de lectura en el Apps Script (texto, fotos, fecha y si es repost)
const rsDesdeXScript = p => (((st.redesX || {}).datos || {})[redXUsuario(p.u)] || {}).tuits || [];
const rsXScriptPost = t => ({ id: t.id || t.url, url: t.url, fecha: t.fecha, texto: t.texto, imagenes: t.fotos || [], tipo: t.rt ? "retuit" : "" });
async function rsTrae(p){
  if (RS_DEMO) return (window.RS_DEMO_FEED || {})[p.id] || { posts: [] };
  const k = RT.clave(p), c = RS_CACHE[k];
  if (c && Date.now() - c.t < 5 * 60e3) return c.d;
  let d = { posts: [] };
  try {
    const r = await fetch(`${API}/api/feed?red=${RT.RED[p.r].api}&usuario=${encodeURIComponent(p.u)}`);
    if (!r.ok) throw new Error("el servidor respondió " + r.status);
    d = await r.json();
  } catch(e){ d = { posts: [], errores: [{ error: e.message || "el servidor no responde" }] }; }
  if (p.r === "x" && !(d.posts || []).length && rsDesdeXScript(p).length) d = { ...d, posts: rsDesdeXScript(p).map(rsXScriptPost), errores: [] };
  RS_CACHE[k] = { t: Date.now(), d }; return d;
}

/* ---------- Vista: historias, herramientas y feed ---------- */
const rsVista = (LF, clave) => {
  // Enlace directo a un perfil (#redes/ig/usuario, p. ej. desde Atalaya): se abre su historia en cuanto está en la lista
  if (st.rsAbrir){ const [r, ...u] = st.rsAbrir.split("/"), k = r + "|" + u.join("/").replace(/^@/, "").toLowerCase(), p = LF.find(p => RT.clave(p) === k);
    if (p){ st.rsVer = p.id; st.rsAbrir = null; } else if (st.redesNube != null) st.rsAbrir = null; }
  if (st.rsVer && !LF.some(p => p.id === st.rsVer)) st.rsVer = null;
  return `<div class="rz-deck rs-wrap" data-vista="${esc(clave)}"><div class="rs-stories" id="rsHist">${rsHistorias(LF)}</div>`
    + `<div class="rs-herr"><label class="rs-q">${RT.SVG.buscar}<input id="rsQ" type="search" autocomplete="off" placeholder="Buscar en las publicaciones: texto, perfil, #etiqueta, @mención, lugar…" value="${esc(st.rsQ || "")}" aria-label="Buscar en las publicaciones"></label>`
    + `<button class="rs-bt" data-act="redRsCopiaTodo" type="button" title="Copia la ficha de todas las publicaciones que se ven ahora, para pegarla en un informe">${RT.SVG.ficha}<span>Copiar fichas</span></button>`
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
  return `<button class="rs-st" data-act="redRsVer" data-v="" aria-pressed="${!ver}"><span class="ring"><span>${RT.SVG.todos}</span></span><span class="n">Todos</span></button>`
    + LF.map(p => `<button class="rs-st${hay(p.id) ? " hay" : ""}" data-act="redRsVer" data-v="${esc(p.id)}" data-r="${p.r}" aria-pressed="${ver === p.id}" title="${esc(p.n)} · ${REDES[p.r].n}"><span class="ring">${rsAvt(p)}`
      + `${p.av ? `<span class="campana" title="Con aviso">${RI.bell}</span>` : mezcla ? `<span class="red">${redKey(p.r)}</span>` : ""}</span><span class="n">${esc(RT.usr(p.u))}</span></button>`).join("");
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
    const ps = raw.map(x => seguro("una publicación de " + p.n, () => RT.rsNorm(x, p, rsImg), null)).filter(o => o && o.fecha && !vistas.has(o.k));
    ps.forEach(o => vistas.add(o.k));
    meta[p.id] = { ...((d && d.perfiles && d.perfiles[0]) || {}), n: ps.length, min: ps.length ? Math.min(...ps.map(o => new Date(o.fecha).getTime())) : 0 };
    meta[p.id].vacio = !ps.length;
    const conFicha = !!(meta[p.id].enlace || meta[p.id].nota);
    if (!d) errs.push({ p, e: "el servidor no responde" });
    else if (d.errores && d.errores[0] && d.errores[0].error && !(meta[p.id].vacio && conFicha)) errs.push({ p, e: d.errores[0].error });
    else if (!ps.length && p.r === "x" && redXLeyendo()) errs.push({ p, e: "leyendo en X…" });
    posts.push(...ps); });
  posts.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  st.rs = { clave, posts, errs, meta, n: (st.rs && st.rs.clave === clave && st.rs.n) || RS_PAG, hora: Date.now(), visto: st.rsVistoV[clave] };
  if (!document.body.contains(el)) return;
  rsPinta();
  if (!RS_DEMO){ vistos[clave] = Date.now(); store.set("rsVisto", vistos); }
}
// Lo que se ve ahora (perfil elegido y búsqueda), en el orden del feed
const rsVisibles = () => { if (!st.rs) return []; const ver = st.rsVer, q = st.rsQ || "";
  return st.rs.posts.filter(o => (!ver || o.p.id === ver) && RT.casa(o, q)); };
const rsTarjeta = (o, re) => RT.tarjeta(o, { re, nuevo: rsEsNuevo(o), icono: redKey,
  avatar: x => x.avatar ? `<img src="${esc(x.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : rsAvt(x.p) });
// Ficha del perfil: foto, cabecera, cifras, bio, motivo por el que no hay publicaciones y enlace
const rsPf = (p, m) => `<div class="rs-perfil" data-r="${p.r}"><span class="ring">${rsAvt(p)}</span><div class="rs-pf-i"><section class="rz-col rs-pf" data-id="${esc(p.id)}"><header>${redCab(p)}</header></section>`
  + `<span class="cifras">${[m.total != null && `<b>${RT.exacto(m.total)}</b> publicaciones`, m.seguidores != null && `<b>${RT.exacto(m.seguidores)}</b> seguidores`, m.siguiendo != null && `<b>${RT.exacto(m.siguiendo)}</b> seguidos`].filter(Boolean).join(" · ") || "Sin datos del perfil"}</span>`
  + (m.bio ? `<p class="bio">${RT.texto(m.bio, p.r, null)}</p>` : "")
  + (m.nota ? `<p class="nota">${esc(m.nota)}</p>` : "")
  + `<a class="ver" href="${esc(m.enlace || redUrl(p.r, p.u))}" target="_blank" rel="noopener noreferrer">Ver perfil en ${REDES[p.r].n} ↗</a></div></div>`;
function rsPinta(){
  const el = document.getElementById("rsFeed"); if (!el || !st.rs) return;
  const LF = rsLF(), ver = st.rsVer, q = (st.rsQ || "").trim(), re = RT.qRe(q), M = st.rs.meta;
  rsHistRepinta();
  const L = rsVisibles(), errs = st.rs.errs.filter(e => !ver || e.p.id === ver);
  const est = document.getElementById("rsEstado");
  if (est){ const nPerf = new Set(L.map(o => o.p.id)).size, nFic = LF.filter(p => (!ver || p.id === ver) && (M[p.id] || {}).vacio).length;
    const cuenta = q ? `<b>${plural(L.length, "publicación contiene", "publicaciones contienen")} «${esc(q)}»</b>`
      : L.length ? `${plural(L.length, "publicación", "publicaciones")} de ${plural(nPerf, "perfil", "perfiles")}${nFic ? ` · ${plural(nFic, "perfil", "perfiles")} sin publicaciones` : ""}`
      : nFic ? `${plural(nFic, "perfil", "perfiles")} sin publicaciones` : "Sin publicaciones";
    est.innerHTML = `<span>${cuenta} · consultado a las ${esc(RT.hora(st.rs.hora))}</span>`
      + (LF.some(p => p.r === "x") && !RS_DEMO ? `<span class="rs-x" id="redXEstado">${redXEstadoHtml()}</span>` : ""); }
  let h = "";
  if (ver){ const p = LF.find(q => q.id === ver); if (p) h += rsPf(p, M[ver] || {}); }
  if (errs.length) h += `<p class="rs-errs">No se ha podido leer: ${errs.map(e => `${redKey(e.p.r)} <b>${esc(e.p.n)}</b> (${esc(e.e)})`).join(", ")}</p>`;
  const vacios = !ver && !q ? LF.filter(p => (M[p.id] || {}).vacio) : [];
  if (vacios.length) h += `<div class="rs-fichas">${vacios.map(p => rsPf(p, M[p.id] || {})).join("")}</div>`;
  if (!L.length && !vacios.length && (q || !ver)) h += `<div class="rz-vacio"><b>${q ? "Nada encontrado" : "Sin publicaciones"}</b>${q ? "Ninguna publicación cargada contiene eso. Prueba con otra palabra." : "Ningún perfil tiene publicaciones que se puedan leer ahora."}</div>`;
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
      h += `<div class="rs-aldia"><div class="ok">${RT.SVG.ok}</div><b>Estás al día</b>Has visto todo lo nuevo desde tu última visita</div>`; }
    if (corte && !cortado && tm(o) < corte){ cortado = true; h += aviso(true); dia = ""; }
    if (RT.diaClave(o.fecha) !== dia){ dia = RT.diaClave(o.fecha); h += `<div class="rs-dia">${esc(RT.dia(o.fecha))}</div>`; }
    h += seguro("una publicación de " + o.p.n, () => rsTarjeta(o, re), "");
  });
  if (V.length > st.rs.n) h += `<button class="btn ghost rs-cargar" data-act="redRsMasPosts">Ver más publicaciones (${V.length - st.rs.n})</button>`;
  else if (corte && antes && !st.rsTodo) h += aviso(false);
  el.innerHTML = h;
}

/* ---------- Acciones ---------- */
const rsCopia = (t, ok) => RT.copia(t, bien => aviso(bien ? ok : "No se pudo copiar"));
const rsDe = b => { const a = b.closest(".rs-post"); return a && st.rs ? st.rs.posts.find(o => o.k === a.dataset.k) : null; };
const rsFicha = o => RT.ficha(o, { leido: st.rs && st.rs.hora, origen: "Prensa Segovia" });
function rsAccion(act, b){
  if (act === "redRsVer"){ st.rsVer = b.dataset.v || null; rsPinta(); const m = document.querySelector(".rs-wrap"); if (m && m.getBoundingClientRect().top < 0) m.scrollIntoView({ behavior:"smooth" }); }
  else if (act === "redRsMasPosts"){ if (st.rs){ st.rs.n += RS_PAG; rsPinta(); } }
  else if (act === "redRsTodo"){ st.rsTodo = !st.rsTodo; rsPinta(); }
  else if (act === "redRsCopiaTodo"){ const L = rsVisibles().slice(0, 200); if (!L.length){ aviso("No hay publicaciones que copiar"); return; }
    rsCopia(L.map(rsFicha).join("\n\n────────────\n\n"), plural(L.length, "ficha copiada", "fichas copiadas")); }
  else if (act === "redRsRecarga"){ Object.keys(RS_CACHE).forEach(k => delete RS_CACHE[k]); const el = document.getElementById("rsFeed"); if (el) el.innerHTML = '<div class="rs-skel"></div>'.repeat(3); rsCarga(true); }
}
// Botones de cada tarjeta: copiar enlace y copiar ficha (el carrusel y «Ver más» los lleva la propia tarjeta común)
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest('[data-rs="enlace"],[data-rs="ficha"]'); if (!b || !b.closest(".rs-wrap")) return;
  const o = rsDe(b); if (!o) return;
  if (b.dataset.rs === "enlace") rsCopia(o.url, "Enlace copiado"); else rsCopia(rsFicha(o), "Ficha copiada"); });
// Buscador: filtra lo cargado según se escribe, sin recargar nada
let rsQT = null;
document.addEventListener("input", e => { if (e.target.id !== "rsQ") return; clearTimeout(rsQT); rsQT = setTimeout(() => { st.rsQ = e.target.value; if (st.rs) st.rs.n = RS_PAG; rsPinta(); }, 160); });
