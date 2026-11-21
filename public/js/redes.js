/* ===== Redes sociales (zona privada) — EN PRUEBAS.
   Cada perfil se muestra con el incrustado oficial de su red (Instagram, Facebook, X): el contenido real lo sirve la
   propia red en el navegador de quien mira; aquí no se copia ni se guarda nada. La lista de perfiles se guarda,
   de momento, solo en este navegador, y la contraseña es de muestra. ===== */
const REDES = {
  ig:{n:"Instagram", c:"#D6336C", av:true, nota:"Todas las publicaciones juntas, de la más nueva a la más antigua. Toca una historia para ver solo ese perfil y su aviso, editar o quitar."},
  fb:{n:"Facebook", c:"#1877F2", nota:"Últimas publicaciones de cada página, servidas por Facebook. Solo funciona con páginas públicas, no con perfiles personales."},
  x:{n:"X", c:"var(--ink)", av:true, nota:"Últimos tuits de cada perfil. X no deja mostrarlos en otras webs, así que los lee la cuenta de lectura de la unidad y aparecen aquí; al entrar, si son de hace más de 10 minutos, se piden de nuevo (tarda 1–2 minutos)."},
  tt:{n:"TikTok", c:"#FE2C55", av:true, nota:"Ficha de cada perfil con sus últimos vídeos, tal como la sirve TikTok. Solo funciona con cuentas públicas."}
};
const REDES_GRUPOS = ["Partidos y candidatos","Sindicatos","Organizaciones agrarias","Plataformas y asociaciones","Ayuntamientos","Otros"];
const RI = {
  bell:`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  edit:`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  ok:`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  del:`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>`,
  mas:`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  lock:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`
};
const redKey = (r, t="") => `<img class="rk ${r} ${t}" src="redes/${r}.png" alt="${REDES[r].n}" width="20" height="20">`;
const redUrl = (r,u) => r==="ig" ? "https://www.instagram.com/"+u.replace(/^@/,"")+"/" : r==="fb" ? "https://www.facebook.com/"+u+"/" : r==="tt" ? "https://www.tiktok.com/@"+u.replace(/^@/,"") : "https://x.com/"+u.replace(/^@/,"");
// Acepta «@usuario», «usuario» o el enlace pegado tal cual
const redUser = (r,u) => { u = String(u).trim(); const id = r==="fb" && /profile\.php\?id=(\d+)/.exec(u); if (id) return id[1];
  const x = u.replace(/^(https?:\/\/)?(www\.|m\.|mobile\.)?(instagram\.com|facebook\.com|fb\.com|x\.com|twitter\.com|tiktok\.com)\//i,"").replace(/[/?#].*$/,"").replace(/^@+/,"").replace(/\s+/g,"");
  return /^[\w.\-]{1,80}$/.test(x) ? (r==="fb" ? x : "@"+x) : ""; };
const iniciales = n => n.replace(/[·|].*$/,"").replace(/^@/,"").split(/[\s._-]+/).filter(w=>/^[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(w) && !/^(de|del|la|el|los|las|y)$/i.test(w)).slice(0,2).map(w=>w[0].toUpperCase()).join("") || "?";
const redActual = () => REDES[st.redRed] ? st.redRed : "ig";
const REDES_CLAVE = "2daa7d78da68335e567c39515cf19cf2066123882deb3628a9d4e39fbfa8fbe5";
const redHuella = async (sal, pw) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sal + "|" + pw))), x=>x.toString(16).padStart(2,"0")).join("");
function redesAbierto(){ try{ return sessionStorage.getItem("redesOk")==="1"; }catch(e){ return !!st.redesOk; } }
const redesData = () => { if (!st.redesD){ let d = store.get("redesPerfiles", null);
    if (!d) d = (store.get("redesDemo", []) || []).filter(p=>/^u/.test(p.id) && REDES[p.r]).map(({id,r,g,n,u,av})=>({id,r,g,n,u,av:!!av})); // lo que se añadió a mano en la maqueta anterior
    st.redesD = d; } return st.redesD; };
/* Lista compartida: los perfiles se guardan también en el Apps Script de la unidad (no en el repositorio público),
   así se ven igual en todos los dispositivos. Si ese script aún no tiene la parte de Redes, sigue funcionando solo en local. */
const redClave = () => { try{ return sessionStorage.getItem("redesPw") || ""; }catch(e){ return st.redesPw || ""; } };
const redNube = async cuerpo => { const c = await confPush(); if (!c.url) return null;
  try { return await (await fetch(c.url, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ ...cuerpo, clave: redClave() }) })).json(); } catch(e){ return null; } };
let redSubeT = null;
const redesSube = () => { clearTimeout(redSubeT); redSubeT = setTimeout(async ()=>{ const d = await redNube({ accion:"redesGuardar", perfiles: st.redesD }); if (!(d && d.guardado)) aviso("No se pudo guardar en la lista compartida"); }, 700); };
const redesSave = () => { store.set("redesPerfiles", st.redesD); if (st.redesNube) redesSube(); redSync(); };
async function redesBaja(){ // al entrar: trae la lista compartida
  st.redesBajado = true;
  const d = await redNube({ accion:"redesLeer" });
  if (!(d && Array.isArray(d.perfiles))){ st.redesNube = false; redNubePinta(); return; }
  st.redesNube = true;
  const nube = d.perfiles.filter(p=>p && REDES[p.r] && p.u), clave = p => p.r + "|" + String(p.u).toLowerCase();
  // La primera vez en este dispositivo, lo que hubiera guardado aquí se suma a la lista compartida; después manda la compartida
  const propios = store.get("redesSinc", false) ? [] : redesData().filter(p=>!nube.some(q=>clave(q)===clave(p)));
  st.redesD = [...propios, ...nube]; store.set("redesPerfiles", st.redesD); store.set("redesSinc", true);
  if (propios.length) redesSube();
  if (redesAbierto() && st.sub && st.sub.t==="redes"){ st.redesPinta = true; render(true); }
}
const redNubeTxt = () => st.redesNube ? "La lista de perfiles es compartida: se ve igual en todos los dispositivos." : st.redesNube===false ? "La lista compartida aún no está activada: de momento los perfiles se guardan solo en este dispositivo." : "Cargando la lista compartida…";
const redNubePinta = () => { const e = document.getElementById("redNubeTxt"); if (e) e.textContent = redNubeTxt(); };
const temaOscuro = () => { const t = document.documentElement.dataset.theme; return t ? t==="dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
const cargaScript = (id, src) => new Promise(res=>{ let s = document.getElementById(id);
  if (s){ if (s.dataset.ok) res(); else s.addEventListener("load", ()=>res()); return; }
  s = document.createElement("script"); s.id = id; s.async = true; s.src = src; s.onload = ()=>{ s.dataset.ok = "1"; res(); }; s.onerror = ()=>res(); document.head.appendChild(s); });
/* Incrustado oficial de cada red. Si la red (o un bloqueador de anuncios) no lo deja cargar, queda el enlace para abrirlo fuera */
function redIncrusta(el){
  const r = el.dataset.r, u = el.dataset.u, url = redUrl(r,u), R = REDES[r];
  const fallo = `<a class="rz-fallo" href="${esc(url)}" target="_blank" rel="noopener">Cargando lo último de ${esc(u)}…<br>Si no aparece, desactiva el bloqueador de anuncios en esta web.<b>Abrir en ${R.n} ↗</b></a>`;
  if (r==="ig"){
    redIg(el, u, fallo);
  } else if (r==="fb"){
    const w = Math.max(280, Math.min(500, Math.floor(el.clientWidth) || 380));
    el.innerHTML = fallo + `<iframe title="Publicaciones de ${esc(u)} en Facebook" loading="lazy" src="https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(url)}&tabs=timeline&width=${w}&height=440&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false&locale=es_ES" width="${w}" height="440" style="border:0;overflow:hidden;display:block;margin:0 auto" scrolling="no" frameborder="0" allow="encrypted-media; picture-in-picture; web-share"></iframe>`;
  } else if (r==="tt"){
    const us = u.replace(/^@/,"");
    el.innerHTML = `<blockquote class="tiktok-embed" cite="${esc(url)}" data-unique-id="${esc(us)}" data-embed-type="creator" style="max-width:780px;min-width:288px;margin:0"><section>${fallo}</section></blockquote>`;
    // el script de TikTok solo mira la página al cargarse: se vuelve a cargar con cada perfil nuevo
    const viejo = document.getElementById("ttEmbed"); if (viejo) viejo.remove();
    cargaScript("ttEmbed", "https://www.tiktok.com/embed.js");
  } else if (r==="x"){
    el.innerHTML = redXHtml(u); redesXAsegura();
    if (st.redesX && st.redesX.datos && !st.redesX.datos[redXUsuario(u)] && !redXLeyendo()) { clearTimeout(redXNuevoT); redXNuevoT = setTimeout(()=>redesXAsegura(true), 800); }
  } else {
    el.innerHTML = `<a class="twitter-timeline rz-fallo" data-height="440" data-theme="${temaOscuro()?"dark":"light"}" data-chrome="noheader nofooter transparent" data-lang="es" data-dnt="true" href="https://twitter.com/${encodeURIComponent(u.replace(/^@/,""))}">Cargando los tuits de ${esc(u)}…<br>Solo se ven con tu sesión de X abierta en este navegador y sin bloqueador de anuncios.<b>Abrir en X ↗</b></a>`;
    cargaScript("xWidgets", "https://platform.twitter.com/widgets.js").then(()=>{ try{ window.twttr.widgets.load(el); }catch(e){} });
  }
}
const API = "https://redes.josango11.workers.dev";
const CLAVE = "psg-redes-7f3c91b2e48a4d05";

function redNum(n){
  if (n == null) return "—";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",") + " M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(".", ",") + " mil";
  return String(n);
}

async function redIg(el, u, fallo){
  el.innerHTML = `<div class="rz-nota">Cargando @${esc(u)}…</div>`;
  try{
    const r = await fetch(`${API}/api/feed?red=instagram&usuario=${encodeURIComponent(u)}`);
    const d = await r.json();
    const posts = d.posts || [];
    if (!posts.length){
      const err = (d.errores && d.errores[0] && d.errores[0].error) || "sin publicaciones";
      el.innerHTML = fallo + `<div class="rz-nota">${esc(err)}</div>`;
      return;
    }
    const meta = (d.perfiles && d.perfiles[0]) || {};
    el.innerHTML =
      `<div style="font-size:.7rem;opacity:.7;padding:0 2px 8px">${redNum(meta.total)} publicaciones · ${redNum(meta.seguidores)} seguidores</div>` +
      posts.map(p => {
        const f = new Date(p.fecha).toLocaleDateString("es-ES", {day:"numeric", month:"short", year:"numeric"});
        const av = p.avatar ? `<img src="${esc(API + p.avatar)}" alt="" style="width:30px;height:30px;border-radius:50%;object-fit:cover">` : "";
        const img = p.imagenes && p.imagenes[0]
          ? `<a href="${esc(p.url)}" target="_blank" rel="noopener" style="display:block;position:relative"><img loading="lazy" src="${esc(API + p.imagenes[0])}" alt="" style="width:100%;aspect-ratio:4/5;object-fit:cover;display:block;border-radius:6px">${p.esVideo ? `<span style="position:absolute;top:6px;right:6px;color:#fff;font-size:.65rem;background:#0009;border-radius:3px;padding:1px 4px">▶</span>` : ""}</a>`
          : "";
        return `<article style="border-bottom:1px solid #0001;padding:12px 0">` +
          `<header style="display:flex;align-items:center;gap:8px;margin-bottom:8px">${av}` +
          `<div style="line-height:1.15"><b style="font-size:.8rem">${esc(p.autor || u)}</b>` +
          `<div style="font-size:.68rem;opacity:.65">@${esc(p.usuario)}</div></div>` +
          `<time style="margin-left:auto;font-size:.65rem;opacity:.6">${esc(f)}</time></header>` +
          img +
          `<div style="font-size:.72rem;opacity:.75;margin-top:6px">${p.metricas?.likes ?? 0} me gusta · ${p.metricas?.respuestas ?? 0} comentarios</div>` +
          (p.texto ? `<p style="font-size:.78rem;white-space:pre-wrap;margin:6px 0 0">${esc(p.texto)}</p>` : "") +
          `<a href="${esc(p.url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;font-size:.7rem;opacity:.7;text-decoration:none">Ver en Instagram ↗</a>` +
          `</article>`;
      }).join("") +
      `<a href="https://www.instagram.com/${encodeURIComponent(u)}/" target="_blank" rel="noopener" style="display:block;margin-top:10px;font-size:.72rem;text-align:center;opacity:.75;text-decoration:none">Ver todo en Instagram ↗</a>`;
  }catch(e){
    el.innerHTML = fallo;
  }
}

/* Instagram como la app: historias arriba (una por perfil, con anillo de color si tiene algo nuevo y campanita si tiene aviso)
   y una tarjeta por publicación, todos los perfiles mezclados de la más nueva a la más antigua, en rejilla.
   Al tocar una historia sale la cabecera de ese perfil con aviso, editar, abrir y quitar.
   Las publicaciones las sirve el Worker (que las guarda media hora); aquí se reutilizan 5 minutos. */
const IG_CACHE = {}, IG_PAG = 24;
const IG_SVG = {
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M16.8 3.6c-1.9 0-3.6 1-4.8 2.6-1.2-1.6-2.9-2.6-4.8-2.6C4.3 3.6 2 6 2 9c0 5.6 8.5 11 10 11.5 1.5-.5 10-5.9 10-11.5 0-3-2.3-5.4-5.2-5.4z"/></svg>`,
  com: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M20.7 16.2A9.5 9.5 0 1 0 17 20.1L21.5 21z"/></svg>`,
  abre: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`,
  reel: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>`,
  todos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>`,
  ok: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`
};
const igUsr = u => String(u || "").replace(/^@/, "");
const igHace = f => { const s = (Date.now() - new Date(f)) / 1000; if (!(s >= 0)) return "";
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min"; if (s < 86400) return Math.round(s / 3600) + " h"; if (s < 7 * 86400) return Math.round(s / 86400) + " d";
  return new Date(f).toLocaleDateString("es-ES", { day:"numeric", month:"short" }).replace(".", ""); };
const igFechaLarga = f => { const d = new Date(f); return d.toLocaleDateString("es-ES", d.getFullYear() === new Date().getFullYear() ? { day:"numeric", month:"long" } : { day:"numeric", month:"long", year:"numeric" }); };
const igHora = f => new Date(f).toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" });
const igDiaClave = f => new Date(f).toDateString();
// Cabecera de cada día del feed: «Hoy», «Ayer» o «Jueves, 19 de noviembre»
const igDia = f => { const d = new Date(f), h = new Date(), ay = new Date(); ay.setDate(h.getDate() - 1);
  if (d.toDateString() === h.toDateString()) return "Hoy"; if (d.toDateString() === ay.toDateString()) return "Ayer";
  const t = d.toLocaleDateString("es-ES", d.getFullYear() === h.getFullYear() ? { weekday:"long", day:"numeric", month:"long" } : { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1); };
// Texto con #etiquetas y @menciones enlazadas, como en la app
const igTexto = t => esc(t).replace(/(^|[\s(¡¿])([#@])([\p{L}\p{N}_.]*[\p{L}\p{N}_])/gu, (m, a, s, w) =>
  `${a}<a href="https://www.instagram.com/${s === "#" ? "explore/tags/" + encodeURIComponent(w) : encodeURIComponent(w)}/" target="_blank" rel="noopener">${s}${w}</a>`);
const igEsNuevo = x => !!st.igVisto && new Date(x.fecha).getTime() > st.igVisto;
// Foto: la que se haya puesto a mano; si no, la de Instagram que trae el servidor; si no, las iniciales
const igFoto = p => { if (p.f) return p.f; const o = st.ig && st.ig.posts.find(o => o.p.id === p.id && o.x.avatar); return o ? API + o.x.avatar : (p.fa || ""); };
const igAvt = p => { const f = igFoto(p); return f ? `<img src="${esc(f)}" alt="" loading="lazy">` : `<span>${esc(iniciales(p.n))}</span>`; };

async function igTrae(u){
  const k = igUsr(u).toLowerCase(), c = IG_CACHE[k];
  if (c && Date.now() - c.t < 5 * 60e3) return c.d;
  const r = await fetch(`${API}/api/feed?red=instagram&usuario=${encodeURIComponent(u)}`);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const d = await r.json(); IG_CACHE[k] = { t: Date.now(), d }; return d;
}
const igVista = LF => { if (st.igVer && !LF.some(p => p.id === st.igVer)) st.igVer = null;
  return `<div class="rz-deck ig-wrap"><div class="ig-main"><div class="ig-stories" id="igHist">${igHistorias(LF)}</div>`
    + `<div class="ig-feed" id="igFeed" data-ids="${esc(LF.map(p => p.id).join(","))}">${'<div class="ig-skel"></div>'.repeat(3)}</div></div></div>`; };
const igLF = () => { const el = document.getElementById("igFeed"); return el ? (el.dataset.ids || "").split(",").map(id => redesData().find(p => p.id === id)).filter(Boolean) : []; };
const igHistRepinta = () => { const h = document.getElementById("igHist"); if (h) h.innerHTML = igHistorias(igLF()); };
function igHistorias(LF){
  const ver = st.igVer, hay = id => st.ig && st.ig.posts.some(o => o.p.id === id && igEsNuevo(o.x));
  return `<button class="ig-st" data-act="redIgVer" data-v="" aria-pressed="${!ver}"><span class="ring"><span>${IG_SVG.todos}</span></span><span class="n">Todos</span></button>`
    + LF.map(p => `<button class="ig-st${hay(p.id) ? " hay" : ""}" data-act="redIgVer" data-v="${esc(p.id)}" aria-pressed="${ver === p.id}" title="${esc(p.n)}"><span class="ring">${igAvt(p)}${p.av ? `<span class="campana" title="Con aviso">${RI.bell}</span>` : ""}</span><span class="n">${esc(igUsr(p.u))}</span></button>`).join("");
}
async function igCarga(){
  const el = document.getElementById("igFeed"); if (!el || el.dataset.ok) return; el.dataset.ok = "1";
  const perf = (el.dataset.ids || "").split(",").filter(Boolean).map(id => redesData().find(p => p.id === id)).filter(Boolean);
  if (st.igVisto == null) st.igVisto = store.get("igVisto", 0); // la marca de «Nuevo» se fija al entrar y dura toda la visita
  const res = await Promise.allSettled(perf.map(p => igTrae(p.u)));
  const posts = [], errs = [], meta = {};
  res.forEach((r, i) => { const p = perf[i], d = r.status === "fulfilled" ? r.value : null, ps = (d && d.posts) || [];
    meta[p.id] = { ...((d && d.perfiles && d.perfiles[0]) || {}), n: ps.length, min: ps.length ? Math.min(...ps.map(x => new Date(x.fecha).getTime())) : 0 };
    if (!ps.length) errs.push({ p, e: d ? ((d.errores && d.errores[0] && d.errores[0].error) || "sin publicaciones") : "el servidor no responde" });
    ps.forEach(x => posts.push({ x, p })); });
  posts.sort((a, b) => new Date(b.x.fecha) - new Date(a.x.fecha));
  st.ig = { posts, errs, meta, n: IG_PAG };
  if (!document.body.contains(el)) return;
  igPinta();
  store.set("igVisto", Date.now());
}
function igPinta(){
  const el = document.getElementById("igFeed"), hist = document.getElementById("igHist"); if (!el || !st.ig) return;
  const LF = igLF();
  if (hist) hist.innerHTML = igHistorias(LF);
  const ver = st.igVer, L = st.ig.posts.filter(o => !ver || o.p.id === ver), errs = st.ig.errs.filter(e => !ver || e.p.id === ver);
  let h = "";
  if (ver){ const p = LF.find(q => q.id === ver), m = st.ig.meta[ver] || {};
    // Cabecera del perfil con sus botones (aviso, editar, abrir, quitar): los mismos de siempre, dentro de su «.rz-col»
    if (p) h += `<div class="ig-perfil"><span class="ring">${igAvt(p)}</span><div class="ig-pf-i"><section class="rz-col ig-pf" data-id="${esc(p.id)}"><header>${redCab(p)}</header></section>`
      + `<span class="cifras">${redNum(m.total)} publicaciones · ${redNum(m.seguidores)} seguidores</span><a class="ver" href="https://www.instagram.com/${encodeURIComponent(igUsr(p.u))}/" target="_blank" rel="noopener">Ver perfil en Instagram ↗</a></div></div>`; }
  if (errs.length) h += `<p class="ig-errs">No se ha podido leer: ${errs.map(e => `<b>${esc(e.p.n)}</b> (${esc(e.e)})`).join(", ")}</p>`;
  if (!L.length && !errs.length) h += `<div class="rz-vacio"><b>Sin publicaciones</b>${ver ? "Este perfil no tiene publicaciones que se puedan leer ahora." : "Ningún perfil tiene publicaciones que se puedan leer ahora."}</div>`;
  /* El servidor trae solo las últimas 12 de cada perfil. Un perfil que publica mucho (el PP en campaña) las cubre en un día
     y otro (Guardia Civil) en una semana: más atrás de la más antigua del primero ya solo saldrían las del segundo.
     En «Todos» se enseña solo el tramo en que están todos los perfiles, bien mezclados por fecha y hora, y lo anterior
     queda detrás de un botón que lo explica. */
  const tm = o => new Date(o.x.fecha).getTime(), M = st.ig.meta;
  const conPosts = LF.filter(p => (M[p.id] || {}).n > 0), tope = Math.max(0, ...conPosts.map(p => M[p.id].n));
  const llenos = tope >= 10 ? conPosts.filter(p => M[p.id].n === tope) : [];
  const corte = !ver && conPosts.length > 1 && llenos.length ? Math.max(...llenos.map(p => M[p.id].min)) : 0;
  const cortos = corte ? llenos.filter(p => M[p.id].min === corte) : [];
  const antes = corte ? L.filter(o => tm(o) < corte).length : 0;
  const aviso = abierto => `<div class="ig-corte">${abierto ? "Desde aquí" : "Hasta aquí están todas, por fecha y hora. Más atrás"} ya no salen publicaciones de <b>${cortos.map(p => esc(p.n)).join("</b> ni de <b>")}</b>: el servidor solo trae las ${tope} últimas de cada perfil${abierto ? "." : ", así que las anteriores serían solo de los demás."}`
    + `<br><button class="btn ghost" data-act="redIgTodo">${abierto ? "Ocultar las anteriores" : `Ver también las anteriores (${antes})`}</button></div>`;
  const V = corte && !st.igTodo ? L.filter(o => tm(o) >= corte) : L;
  let aldia = false, dia = "", cortado = false;
  V.slice(0, st.ig.n).forEach((o, i) => {
    if (!aldia && i > 0 && !igEsNuevo(o.x) && igEsNuevo(V[i - 1].x)){ aldia = true;
      h += `<div class="ig-aldia"><div class="ok">${IG_SVG.ok}</div><b>Estás al día</b>Has visto todo lo nuevo desde tu última visita</div>`; }
    if (corte && !cortado && tm(o) < corte){ cortado = true; h += aviso(true); dia = ""; }
    if (igDiaClave(o.x.fecha) !== dia){ dia = igDiaClave(o.x.fecha); h += `<div class="ig-dia">${esc(igDia(o.x.fecha))}</div>`; }
    h += igPost(o);
  });
  if (V.length > st.ig.n) h += `<button class="btn ghost ig-cargar" data-act="redIgMasPosts">Ver más publicaciones</button>`;
  else if (corte && antes && !st.igTodo) h += aviso(false);
  el.innerHTML = h;
}
function igPost({ x, p }){
  const usr = igUsr(x.usuario || p.u), perfil = `https://www.instagram.com/${encodeURIComponent(usr)}/`, url = esc(x.url || perfil);
  const imgs = (x.imagenes || []).filter(Boolean), nuevo = igEsNuevo(x);
  let media = "";
  if (imgs.length > 1) media = `<div class="ig-media"><div class="ig-car">` + imgs.map((s, i) => `<a href="${url}" target="_blank" rel="noopener"><img${i ? ' loading="lazy"' : ""} src="${esc(API + s)}" alt=""></a>`).join("")
    + `</div><span class="ig-cnt">1/${imgs.length}</span><button class="ig-flecha izq" data-act="redIgCar" data-v="-1" aria-label="Anterior">‹</button><button class="ig-flecha der" data-act="redIgCar" data-v="1" aria-label="Siguiente">›</button></div>`
    + `<div class="ig-puntos">${imgs.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div>`;
  else if (imgs.length) media = `<div class="ig-media"><a href="${url}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(API + imgs[0])}" alt=""></a>${x.esVideo ? `<span class="ig-vid">${IG_SVG.reel}</span>` : ""}</div>`;
  const likes = x.metricas && x.metricas.likes, coms = x.metricas && x.metricas.respuestas;
  const k = (n, ic, t) => n == null || n < 0 ? "" : `<span class="k" title="${t}">${ic}<b>${redNum(n)}</b></span>`;
  const texto = String(x.texto || "").trim(), largo = texto.length > 140 || (texto.match(/\n/g) || []).length > 1;
  return `<article class="ig-post${nuevo ? " nuevo" : ""}"><header><a class="av" href="${perfil}" target="_blank" rel="noopener">${igAvt(p)}</a>`
    + `<div class="who"><a href="${perfil}" target="_blank" rel="noopener">${esc(usr)}</a> <time datetime="${esc(x.fecha)}" title="${esc(new Date(x.fecha).toLocaleString("es-ES"))}">· ${esc(igHora(x.fecha))}</time>${nuevo ? `<span class="ig-nuevo">Nuevo</span>` : ""}`
    + `<small>${esc(p.n)}${p.g ? " · " + esc(p.g) : ""}</small></div>`
    + `<a class="abre" href="${url}" target="_blank" rel="noopener" title="Abrir en Instagram" aria-label="Abrir en Instagram">${IG_SVG.abre}</a></header>`
    + media
    + `<div class="ig-acts">${k(likes, IG_SVG.heart, "Me gusta")}${k(coms, IG_SVG.com, "Comentarios")}</div>`
    + (texto ? `<div class="ig-cap${largo ? " corto" : ""}"><b>${esc(usr)}</b>${igTexto(texto)}</div>${largo ? `<button class="ig-mas" data-act="redIgMas">más</button>` : ""}` : "")
    + (coms > 0 ? `<a class="ig-com" href="${url}" target="_blank" rel="noopener">Ver ${coms === 1 ? "el comentario" : `los ${redNum(coms)} comentarios`}</a>` : "")
    + `<time class="ig-fecha" datetime="${esc(x.fecha)}">${esc(igFechaLarga(x.fecha))}, ${esc(igHora(x.fecha))}${Date.now() - new Date(x.fecha) < 7 * 864e5 ? " · hace " + esc(igHace(x.fecha)) : ""}</time></article>`;
}
// Carrusel: contador «2/5» y puntos al deslizar
document.addEventListener("scroll", e => { const c = e.target; if (!(c instanceof Element) || !c.classList.contains("ig-car")) return;
  const i = Math.round(c.scrollLeft / (c.clientWidth || 1)), m = c.parentElement, cnt = m.querySelector(".ig-cnt"), pts = m.nextElementSibling;
  if (cnt) cnt.textContent = `${i + 1}/${c.children.length}`;
  if (pts && pts.classList.contains("ig-puntos")) [...pts.children].forEach((d, j) => d.classList.toggle("on", j === i)); }, true);

function redSync(){
  try{
    const mapa = {ig:"instagram", fb:"facebook", x:"x", tt:"tiktok"};
    const lista = (st.redesD || []).filter(p => mapa[p.r] && p.u).map(p => ({ red: mapa[p.r], usuario: p.u }));
    fetch(`${API}/api/profiles/sync`, { method:"POST", headers:{"Content-Type":"application/json", "x-clave": CLAVE}, body: JSON.stringify(lista) }).catch(()=>{});
  }catch(e){}
}
/* X no deja mostrar tuits en otras webs (su incrustado ya no carga). Los lee GitHub con la cuenta de lectura de la unidad
   y los guarda el Apps Script (herramientas/redesx.gs); aquí se piden y se pintan. Si son viejos, se pide una lectura nueva. */
const REDX_VIEJO_MIN = 10, REDX_ESPERA_MIN = 4;
const redXUsuario = u => String(u).replace(/^@/,"").toLowerCase();
const redXHace = ms => { const m = Math.round((Date.now()-ms)/6e4); return m<1 ? "ahora mismo" : m<60 ? `hace ${m} min` : m<1440 ? `hace ${Math.floor(m/60)} h` : `hace ${Math.floor(m/1440)} días`; };
const redXFecha = iso => { const d = new Date(iso); return d.toLocaleString("es-ES", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }); };
const redXLeyendo = () => { const X = st.redesX || {}; return X.pedido && X.pedido > ((X.estado||{}).hora||0) && Date.now() - X.pedido < REDX_ESPERA_MIN*6e4; };
let redXNuevoT = null, redXPollT = null;
function redXHtml(u){
  const X = st.redesX || {}, k = redXUsuario(u), d = (X.datos||{})[k];
  const abrir = `<a href="${esc(redUrl("x",u))}" target="_blank" rel="noopener">Abrir en X ↗</a>`;
  if (!d || !(d.tuits||[]).length) return `<div class="rx-vacio">${X.cargando ? "Cargando…" : redXLeyendo() ? `Leyendo los tuits de ${esc(u)} en X…<br>tarda 1–2 minutos.` : d && d.error ? esc(d.error) : X.sinScript ? "La lectura de X todavía no está activada." : "Todavía no hay tuits leídos de este perfil."}${abrir}</div>`;
  if (!st.redXVistoAntes) st.redXVistoAntes = store.get("redesXVisto", {}) || {};
  const antes = st.redXVistoAntes[k] || "", visto = store.get("redesXVisto", {}) || {};
  const ultimo = d.tuits.reduce((m,t)=>t.fecha>m?t.fecha:m, ""); if (ultimo > (visto[k]||"")) { visto[k] = ultimo; store.set("redesXVisto", visto); }
  return `<ol class="rx">` + d.tuits.map(t=>{ const nuevo = antes && t.fecha > antes;
    return `<li${nuevo?' class="nuevo"':""}>${t.rt?'<span class="rx-rt">Retuit</span>':""}<p>${esc(t.texto)}</p>${(t.fotos||[]).map(f=>`<img loading="lazy" src="${esc(f)}${/\?/.test(f)?"":"?name=small"}" alt="" referrerpolicy="no-referrer">`).join("")}<a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(redXFecha(t.fecha))}${nuevo?" · <b>nuevo</b>":""}</a></li>`; }).join("") + `</ol>`;
}
function redXEstadoHtml(){
  const X = st.redesX || {}, E = X.estado || {};
  if (X.cargando) return `<span>Cargando tuits…</span>`;
  if (X.sinScript) return `<span>La lectura de X aún no está activada (falta poner al día el Apps Script).</span>`;
  if (X.error === "clave") return `<span>El Apps Script no reconoce la contraseña de la zona privada.</span>`;
  const btn = `<button class="rz-link" data-act="redXActualiza" type="button">Actualizar</button>`;
  if (X.errorPedir) return `<span>No se pudo pedir una lectura nueva: ${esc(X.errorPedir)}</span>${btn}`;
  if (redXLeyendo()) return `<span>Leyendo en X… (1–2 minutos)${E.hora ? ` · lo que ves es de ${redXHace(E.hora)}` : ""}</span>`;
  if (E.estado === "caducada" || E.estado === "limitada") return `<span>⚠ ${esc(E.detalle || "La cuenta de lectura de X no está disponible.")}</span>${btn}`;
  return E.hora ? `<span>Tuits leídos ${redXHace(E.hora)}</span>${btn}` : `<span>Todavía no se ha leído nada.</span>${btn}`;
}
function redXRepinta(){
  document.querySelectorAll('.rz-emb[data-r="x"][data-ok]').forEach(el=>{ el.innerHTML = redXHtml(el.dataset.u); });
  const e = document.getElementById("redXEstado"); if (e){ e.innerHTML = redXEstadoHtml(); const E = (st.redesX||{}).estado||{}; e.classList.toggle("mal", E.estado==="caducada" || E.estado==="limitada"); }
}
async function redesXTrae(){
  const d = await redNube({ accion:"redesXLeer" });
  if (d && d.datos) st.redesX = { ...st.redesX, datos: d.datos, estado: d.estado || {}, pedido: Math.max(d.pedido||0, (st.redesX||{}).pedido||0), cargando:false, sinScript:false, error:"" };
  else st.redesX = { ...st.redesX, cargando:false, sinScript: !(d && d.error==="clave"), error: d && d.error };
}
async function redesXAsegura(forzar){
  if (st.redesXIniciado && !forzar) return;
  st.redesXIniciado = true;
  if (!st.redesX){ st.redesX = { cargando:true }; redXRepinta(); }
  await redesXTrae();
  const X = st.redesX;
  if (X.sinScript || X.error) return redXRepinta();
  const usuarios = redesData().filter(p=>p.r==="x").map(p=>redXUsuario(p.u));
  const faltan = usuarios.some(u=>!(X.datos||{})[u]), viejo = !X.estado.hora || Date.now() - X.estado.hora > REDX_VIEJO_MIN*6e4;
  if (usuarios.length && (forzar || faltan || viejo) && !redXLeyendo()){
    const d = await redNube({ accion:"redesXPedir", usuarios });
    if (d && d.pedido) { X.pedido = d.pedido; X.errorPedir = ""; } else X.errorPedir = (d && d.error) || "sin respuesta";
  }
  redXRepinta();
  // Mientras GitHub lee, se mira cada 15 s si ya ha llegado
  clearInterval(redXPollT);
  if (redXLeyendo()) redXPollT = setInterval(async ()=>{ await redesXTrae(); redXRepinta(); if (!redXLeyendo()) clearInterval(redXPollT); }, 15000);
}
let redObs = null;
function redesObserva(){ // cada columna se carga cuando está a punto de verse, no todas de golpe
  if (redObs) redObs.disconnect();
  igCarga();
  redFotosPide();
  const els = document.querySelectorAll(".rz-emb[data-r]:not([data-ok])"); if (!els.length) return;
  redObs = new IntersectionObserver(es=>es.forEach(e=>{ if (e.isIntersecting){ redObs.unobserve(e.target); e.target.dataset.ok = "1"; redIncrusta(e.target); } }), {rootMargin:"500px"});
  els.forEach(el=>redObs.observe(el));
}
const redActs = p => (REDES[p.r].av ? `<button class="rz-ic bell" data-act="redAv" data-id="${esc(p.id)}" aria-pressed="${!!p.av}" title="${p.av?"Aviso pedido: quitar":"Avisarme cuando publique"}" aria-label="Avisos de ${esc(p.n)}">${RI.bell}</button>` : "")
  + `<button class="rz-ic" data-act="redEdita" data-id="${esc(p.id)}" title="Cambiar nombre, grupo o foto" aria-label="Editar ${esc(p.n)}">${RI.edit}</button><a class="rz-ic" href="${esc(redUrl(p.r,p.u))}" target="_blank" rel="noopener" title="Abrir en ${REDES[p.r].n}" aria-label="Abrir en ${REDES[p.r].n}">↗</a><button class="rz-ic del" data-act="redBorra" data-id="${esc(p.id)}" title="Quitar perfil" aria-label="Quitar ${esc(p.n)}">${RI.del}</button>`;
// Foto del perfil: la que se haya puesto a mano; si no, la que se trae sola (X y Facebook); si no, las iniciales
const redAvt = p => (p.f || p.fa) ? `<img class="rz-avt" src="${esc(p.f || p.fa)}" alt="">` : `<span class="rz-avt">${esc(iniciales(p.n))}</span>`;
/* Foto automática: unavatar.io da gratis la foto de perfil de X y de páginas de Facebook (25 consultas al día por conexión;
   lo que ya tiene en su caché no cuenta). Se trae una sola vez, se recorta a 96 px y se guarda con el perfil en este navegador;
   se renueva cada 30 días. Si falla (no existe, sin foto o tope del día), quedan las iniciales y se reintenta al día siguiente.
   Instagram no: unavatar solo lo da en su plan de pago, y desde el navegador Instagram no deja leerla. */
const RED_FOTO = {fb:"facebook", x:"x"};
const redFotoCola = new Set(); let redFotoVa = false;
function redFotosPide(){
  if (st.redFotoTope || !redesAbierto()) return;
  const ahora = Date.now();
  for (const p of redesData()) if (RED_FOTO[p.r] && !p.f && (!p.fa || ahora - (p.fad||0) > 30*864e5) && !(p.fz && ahora - p.fz < 864e5)) redFotoCola.add(p.id);
  redFotoSigue();
}
async function redFotoTrae(p){
  const r = await fetch(`https://unavatar.io/${RED_FOTO[p.r]}/${encodeURIComponent(p.u.replace(/^@/,""))}?fallback=false`, {referrerPolicy:"no-referrer"});
  if (!r.ok) throw new Error(String(r.status));
  const b = await r.blob(); if (!/^image\//.test(b.type)) throw new Error("no es imagen");
  const im = await createImageBitmap(b), m = Math.min(im.width, im.height), c = document.createElement("canvas"); c.width = c.height = 96;
  c.getContext("2d").drawImage(im, (im.width-m)/2, (im.height-m)/2, m, m, 0, 0, 96, 96);
  return c.toDataURL("image/jpeg", .85);
}
async function redFotoSigue(){
  if (redFotoVa) return; redFotoVa = true;
  for (const id of redFotoCola){ redFotoCola.delete(id); // de una en una, para no gastar el cupo de golpe
    const p = redesData().find(q=>q.id===id); if (!p || p.f) continue;
    try{ p.fa = await redFotoTrae(p); p.fad = Date.now(); delete p.fz; }
    catch(e){ p.fz = Date.now(); if (e.message==="429"){ st.redFotoTope = true; redFotoCola.clear(); } }
    redesSave();
    document.querySelectorAll(`.rz-col[data-id="${CSS.escape(id)}"] .rz-avt`).forEach(el=>{ el.outerHTML = redAvt(p); });
  }
  redFotoVa = false;
}
function redFoto(file, id){
  if (!file || !/^image\//.test(file.type)){ aviso("Eso no es una imagen"); return; }
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = ()=>{ const c = document.createElement("canvas"); c.width = c.height = 96; const m = Math.min(img.width, img.height); // recorte cuadrado centrado, 96 px
    c.getContext("2d").drawImage(img, (img.width-m)/2, (img.height-m)/2, m, m, 0, 0, 96, 96); URL.revokeObjectURL(url);
    const p = redesData().find(q=>q.id===id); if (!p) return; p.f = c.toDataURL("image/jpeg", .85); redesSave();
    const pv = document.querySelector(`.rz-col[data-id="${CSS.escape(id)}"] .rz-edit .pv`); if (pv) pv.innerHTML = redAvt(p); aviso("Foto puesta"); };
  img.onerror = ()=>{ URL.revokeObjectURL(url); aviso("No se pudo leer la imagen"); }; img.src = url;
}
document.addEventListener("change", e=>{ const i = e.target; if (i.matches && i.matches(".rz-edit input[type=file]")) redFoto(i.files[0], i.closest("form").dataset.id); });
document.addEventListener("paste", e=>{ const f = document.querySelector(".rz-edit"); if (!f) return; // con un perfil en edición, pegar una imagen la pone de foto
  const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x=>x.type.startsWith("image/")); if (it){ e.preventDefault(); redFoto(it.getAsFile(), f.dataset.id); } });
const redCab = p => `${redAvt(p)}<div class="i"><b>${esc(p.n)}</b><span>${esc(p.u)} · ${esc(p.g)}</span></div><span class="acts">${redActs(p)}</span>`;
const redChips = (L, grp) => { const grupos = REDES_GRUPOS.filter(g=>L.some(p=>p.g===g));
  return grupos.length > 1 ? ["todos",...grupos].map(g=>`<button class="chip" data-act="redGrupo" data-v="${esc(g)}" aria-pressed="${grp===g}">${g==="todos"?"Todos":esc(g)} <span class="c">${g==="todos"?L.length:L.filter(p=>p.g===g).length}</span></button>`).join("") : ""; };
function viewRedes(){
  const hero = `<section class="subhero"><h1>Redes</h1><p>Perfiles de interés · acceso restringido</p></section>`;
  // Contraseña única y provisional para todos (se cambiará la forma de entrar más adelante)
  if (!redesAbierto()) return hero + `<div class="rlock"><div class="ico">${RI.lock}</div>
    <h3>Zona privada</h3><p>Escribe la contraseña para ver los perfiles.</p>
    <form data-form="redes"><input id="redesPw" type="password" autocomplete="off" placeholder="Contraseña" aria-label="Contraseña"><div class="err" id="redesErr"></div><button class="btn" type="submit">Entrar</button></form></div>`;
  const P = redesData(), red = redActual(), R = REDES[red];
  const de = r => P.filter(p=>p.r===r);
  const L = de(red), grp = st.redGrupo || "todos";
  const grupos = REDES_GRUPOS.filter(g=>L.some(p=>p.g===g));
  const LF = L.filter(p=>grp==="todos" || p.g===grp);
  const que = red==="fb" ? "página" : "perfil";
  let h = hero + `<div class="rz" data-red="${red}"><div class="rz-demo"><b>En desarrollo.</b> Lo que se ve en cada columna lo sirve cada red. <span id="redNubeTxt">${redNubeTxt()}</span></div>`;
  if (!st.redesBajado) redesBaja();
  h += ``;
  h += `<div class="rz-tabs" role="tablist" aria-label="Redes">` + Object.keys(REDES).map(r=>`<button class="rz-tile" role="tab" data-act="redRed" data-v="${r}" aria-selected="${r===red}" style="--tc:${REDES[r].c}">${redKey(r,"lg")}<span class="t"><b>${REDES[r].n}</b><span class="s">${plural(de(r).length, r==="fb"?"página":"perfil", r==="fb"?"páginas":"perfiles")}</span></span></button>`).join("")
    + `<button class="rz-link rz-out" data-act="redCerrar">Cerrar zona privada</button></div>`;
  h += `<div class="rz-bar"><div class="rz-chips">${redChips(L, grp)}</div><button class="rz-add" data-act="redNuevo">${RI.mas} Añadir ${que}</button></div>`;
  h += `<form class="rz-form" data-form="redPerfil" hidden><h3>${red==="fb"?"Nueva página":"Nuevo perfil"} de ${R.n}</h3>
    <label>Enlace o usuario<input type="text" name="u" id="redU" maxlength="200" autocomplete="off" placeholder="${red==="fb"?"https://www.facebook.com/nombre.de.la.pagina":red==="tt"?"https://www.tiktok.com/@usuario o @usuario":red==="ig"?"https://www.instagram.com/usuario o @usuario":"https://x.com/usuario o @usuario"}"></label>
    <label>Nombre (opcional)<input type="text" name="n" maxlength="60" autocomplete="off" placeholder="Cómo quieres que aparezca"></label>
    <label>Grupo<select name="g">${REDES_GRUPOS.map(g=>`<option${g===(grp!=="todos"?grp:"Otros")?" selected":""}>${esc(g)}</option>`).join("")}</select></label>
    ${R.av ? `<label class="chk"><input type="checkbox" name="av"> Avisarme cuando publique</label>` : ""}
    <div class="fa"><button class="btn" type="submit">Añadir</button><button class="btn ghost" type="button" data-act="redNuevo">Cancelar</button><span class="err" id="redFormErr"></span></div></form>`;
  if (L.length) h += `<p class="rz-nota">${R.nota}</p>`;
  if (red==="x" && L.length) h += `<div class="rx-estado" id="redXEstado">${redXEstadoHtml()}</div>`;
  if (red==="ig" && LF.length) h += igVista(LF);
  else h += `<div class="rz-deck">` + (LF.length ? LF.map(p=>`<section class="rz-col" data-id="${esc(p.id)}"><header>${redCab(p)}</header><div class="rz-emb" data-r="${p.r}" data-u="${esc(p.u)}"></div></section>`).join("")
    : `<div class="rz-vacio"><b>${L.length ? "Nada en este grupo" : `Todavía no hay ${red==="fb"?"páginas":"perfiles"} de ${R.n}`}</b>${L.length ? "Elige otro grupo o añade uno nuevo." : `Pulsa «Añadir ${que}» y pega el enlace: aparecerá aquí con su foto y lo último que haya publicado.`}</div>`) + `</div>`;
  redSync();
  return h + `</div>`;
}
document.addEventListener("submit", e=>{ const f = e.target.dataset.form;
  if (f==="redes"){ e.preventDefault();
    const v = ($("#redesPw")||{}).value||"", err = $("#redesErr");
    if (!v){ err.textContent = "Escribe la contraseña"; return; }
    redHuella("prensa-segovia-redes", v).then(h=>{ if (h===REDES_CLAVE){ try{ sessionStorage.setItem("redesOk","1"); sessionStorage.setItem("redesPw", v); }catch(_){ st.redesOk = true; st.redesPw = v; } st.redesBajado = false; st.redesPinta = true; render(); window.scrollTo({top:0}); }
      else { err.textContent = "Contraseña incorrecta"; $("#redesPw").select(); } }).catch(()=>{ err.textContent = "No se pudo comprobar"; }); }
  else if (f==="redPerfil"){ e.preventDefault(); const r = redActual(), F = e.target.elements;
    const u = redUser(r, F.u.value), n = F.n.value.trim() || u.replace(/^@/,""), err = $("#redFormErr");
    if (!u){ err.textContent = F.u.value.trim() ? "No reconozco ese enlace o usuario" : "Pega el enlace o escribe el usuario"; F.u.focus(); return; }
    if (redesData().some(p=>p.r===r && p.u.toLowerCase()===u.toLowerCase())){ err.textContent = "Ya está en la lista"; return; }
    redesData().unshift({id:"u"+Date.now(), r, g:F.g.value, n, u, av: !!(F.av && F.av.checked)}); redesSave();
    st.redGrupo = "todos"; st.redesPinta = true; render(true); aviso("Añadido"); }
  else if (f==="redEdita"){ e.preventDefault(); const p = redesData().find(q=>q.id===e.target.dataset.id), F = e.target.elements; if (!p) return;
    p.n = F.n.value.trim() || p.u.replace(/^@/,""); p.g = F.g.value; redesSave();
    const grp = st.redGrupo || "todos";
    if (grp!=="todos" && p.g!==grp){ st.redesPinta = true; render(true); } // ya no es de este grupo: sale de la vista
    else { e.target.closest("header").innerHTML = redCab(p); const c = document.querySelector(".rz-chips"); if (c) c.innerHTML = redChips(redesData().filter(q=>q.r===p.r), grp); }
    aviso("Guardado"); }
});
function redesAccion(act, b){
  const P = redesData(), p = P.find(q=>q.id===b.dataset.id);
  const pinta = keep => { st.redesPinta = true; render(keep); };
  if (act==="redRed"){ if (b.dataset.v===redActual()) return; st.redRed = b.dataset.v; st.redGrupo = "todos"; pinta(); window.scrollTo({top:0}); }
  else if (act==="redGrupo"){ st.redGrupo = b.dataset.v; pinta(true); }
  else if (act==="redNuevo"){ const f = document.querySelector('form[data-form="redPerfil"]'); if (!f) return; f.hidden = !f.hidden; $("#redFormErr").textContent = ""; if (!f.hidden) setTimeout(()=>$("#redU")?.focus(), 30); }
  // Quitar: la confirmación se pinta solo en esa columna, sin recargar las demás
  else if (act==="redBorra" && p){ b.closest(".acts").innerHTML = `<span class="rz-conf">¿Quitar? <button class="si" data-act="redBorraSi" data-id="${esc(p.id)}">Sí</button><button data-act="redBorraNo" data-id="${esc(p.id)}">No</button></span>`; }
  else if (act==="redBorraNo" && p){ b.closest(".acts").innerHTML = redActs(p); }
  // Avisos: se guarda la preferencia; empezarán a llegar cuando la red esté conectada por su API
  else if (act==="redAv" && p){ p.av = !p.av; redesSave(); b.closest(".acts").innerHTML = redActs(p); if (p.r==="ig") igHistRepinta(); aviso(p.av ? `Marcado. Activa también la campana de este perfil en ${REDES[p.r].n}` : "Marca quitada"); }
  else if (act==="redEdita" && p){ const hd = b.closest("header");
    hd.innerHTML = `<form class="rz-edit" data-form="redEdita" data-id="${esc(p.id)}"><input type="text" name="n" maxlength="60" value="${esc(p.n)}" aria-label="Nombre"><select name="g" aria-label="Grupo">${REDES_GRUPOS.map(g=>`<option${g===p.g?" selected":""}>${esc(g)}</option>`).join("")}</select><button class="rz-ic ok" type="submit" title="Guardar" aria-label="Guardar">${RI.ok}</button><button class="rz-ic" type="button" data-act="redEditaNo" data-id="${esc(p.id)}" title="Cancelar" aria-label="Cancelar">✕</button><div class="ft"><span class="pv">${redAvt(p)}</span><label class="rz-fb"><input type="file" accept="image/*" hidden>Poner foto</label>${p.f?`<button type="button" class="rz-fb" data-act="redFotoNo" data-id="${esc(p.id)}">Quitar</button>`:""}<small>o pégala con Ctrl+V</small></div></form>`;
    hd.querySelector("input").focus(); }
  else if (act==="redEditaNo" && p){ b.closest("header").innerHTML = redCab(p); }
  else if (act==="redFotoNo" && p){ delete p.f; delete p.fz; redesSave(); const pv = b.closest(".ft").querySelector(".pv"); if (pv) pv.innerHTML = redAvt(p); b.remove(); redFotosPide(); }
  else if (act==="redBorraSi" && p){ st.redesD = P.filter(q=>q!==p); redesSave(); pinta(true); aviso("Quitado"); }
  else if (act==="redXActualiza"){ redesXAsegura(true); }
  // Instagram: ver un perfil (historia) o todos; «más» en el texto; más publicaciones; flechas del carrusel
  else if (act==="redIgVer"){ st.igVer = b.dataset.v || null; igPinta(); const m = document.querySelector(".ig-main"); if (m && m.getBoundingClientRect().top < 0) m.scrollIntoView({ behavior:"smooth" }); }
  else if (act==="redIgMas"){ const c = b.previousElementSibling; if (c) c.classList.remove("corto"); b.remove(); }
  else if (act==="redIgMasPosts"){ if (st.ig){ st.ig.n += IG_PAG; igPinta(); } }
  else if (act==="redIgTodo"){ st.igTodo = !st.igTodo; igPinta(); }
  else if (act==="redIgCar"){ const c = b.parentElement.querySelector(".ig-car"); if (c) c.scrollBy({ left: c.clientWidth * (+b.dataset.v || 1), behavior:"smooth" }); }
  else if (act==="redCerrar"){ try{ sessionStorage.removeItem("redesOk"); }catch(_){} st.redesOk = false; pinta(); window.scrollTo({top:0}); }
}
function viewElecciones(news){
  const list = elecNoticias(news), per = elecPeriodicos(news);
  let h = `<section class="subhero"><h1>Elecciones 29N</h1><p>Campaña, candidatos, visitas, mítines y Junta Electoral en Segovia capital y la provincia: ${plural(list.length,"noticia de interés","noticias de interés")} desde el inicio de la precampaña.</p></section><div class="feed">`;
  h += list.length ? porDias(list) : `<div class="empty"><b>Sin noticias electorales</b>No hay noticias de la campaña en este periodo.</div>`;
  if (per.length) h += `<div class="dayhead"><h3>Más en los periódicos</h3><span>${per.length}</span></div>` + per.slice(0,60).map(cardPer).join("");
  return h + `</div>`;
}
function viewImportantes(news){
  const list = news.filter(n=>enRango(n) && pasa(n) && n.relevancia==="alta").sort(porHora);
  let h = `<section class="subhero"><h1>Importantes</h1><p>${plural(list.length,"noticia","noticias")} en los últimos ${st.rango} días.</p></section><div class="feed">${avisoFiltros()}`;
  return h + (list.length ? porDias(list) : `<div class="empty"><b>Nada importante</b>No hay noticias marcadas como importantes en este periodo.</div>`) + `</div>`;
}
