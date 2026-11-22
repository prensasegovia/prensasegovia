/* ===== Redes sociales (zona privada) — EN PRUEBAS.
   Aquí va la zona en sí: contraseña, lista de perfiles (compartida vía Apps Script), añadir/editar/quitar y fotos.
   Las publicaciones de las cuatro redes se pintan con la misma tarjeta en js/redes-feed.js.
   Modo de prueba: en este ordenador (localhost) con ?demo en la dirección se usan perfiles y publicaciones inventados
   (js/redes-demo.js), sin contraseña y sin guardar ni enviar nada a ningún sitio. ===== */
const RS_DEMO = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && new URLSearchParams(location.search).has("demo");
const REDES = {
  ig:{n:"Instagram", c:"#D6336C", av:true},
  fb:{n:"Facebook", c:"#1877F2", av:true},
  x:{n:"X", c:"var(--ink)", av:true},
  tt:{n:"TikTok", c:"#FE2C55", av:true},
  bs:{n:"Bluesky", c:"#1185FE", av:true, nota:"Lo último de cada perfil, de lo más nuevo a lo más antiguo. Solo funciona con cuentas públicas."},
  md:{n:"Mastodon", c:"#6364FF", av:true, nota:"Lo último de cada cuenta. Escribe el usuario con su instancia: usuario@servidor."}
};
const REDES_NOTA = "Todas las publicaciones juntas, de la más nueva a la más antigua, con la fecha y hora exactas. Toca una historia para ver solo ese perfil (y su aviso, editar o quitar). Cada publicación tiene botones para copiar su enlace o su ficha completa.";
const REDES_GRUPOS = ["Partidos y candidatos","Sindicatos","Organizaciones agrarias","Plataformas y asociaciones","Ayuntamientos","Otros"];
const RI = {
  bell:`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  edit:`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  ok:`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  del:`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>`,
  mas:`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  lock:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`
};
// Las redes sin icono propio (Bluesky, Mastodon) llevan una insignia con su inicial y su color
const REDES_SIN_ICONO = ["bs", "md"];
const redKey = (r, t="") => REDES_SIN_ICONO.includes(r) ? `<b class="rk rk-txt ${r} ${t}" role="img" aria-label="${REDES[r].n}">${REDES[r].n[0]}</b>` : `<img class="rk ${r} ${t}" src="redes/${r}.png" alt="${REDES[r].n}" width="20" height="20">`;
const redUrl = (r,u) => r==="bs" ? "https://bsky.app/profile/"+u.replace(/^@/,"") : r==="md" ? (()=>{const [a,b]=u.replace(/^@/,"").split("@"); return "https://"+b+"/@"+a;})() : r==="ig" ? "https://www.instagram.com/"+u.replace(/^@/,"")+"/" : r==="fb" ? "https://www.facebook.com/"+u+"/" : r==="tt" ? "https://www.tiktok.com/@"+u.replace(/^@/,"") : "https://x.com/"+u.replace(/^@/,"");
// Acepta «@usuario», «usuario» o el enlace pegado tal cual
// Rutas de la red que no son una página: si se pega el enlace de «search» o de «groups», no vale como perfil
const REDES_RUTAS = /^(search|groups|watch|events|hashtag|marketplace|reels|stories|login|home|explore|notifications|messages|photo|video|share|p|permalink\.php|profile\.php)$/i;
const redUser = (r,u) => { u = String(u).trim().replace(/[\s.]+$/, ""); const id = r==="fb" && /profile\.php\?id=(\d+)/.exec(u); if (id) return id[1]; // sin puntos ni espacios al final (el Mac pone un punto con dos espacios)
  if (r==="md"){ const t = u.replace(/^(https?:\/\/)?/i, "").replace(/^@/, "").replace(/\/+$/, "").replace(/[\s.]+@\s*/, "@");
    const m = /^([\w.\-]+)@([\w.\-]+\.[a-z]{2,})$/i.exec(t) || /^([\w.\-]+\.[a-z]{2,})\/@([\w.\-]+)$/i.exec(t);
    if (!m) return ""; return /\//.test(t) ? "@" + m[2].toLowerCase() + "@" + m[1].toLowerCase() : "@" + m[1].toLowerCase() + "@" + m[2].toLowerCase(); }
  const x = u.replace(/^(https?:\/\/)?(www\.|m\.|mobile\.)?(instagram\.com|facebook\.com|fb\.com|x\.com|twitter\.com|tiktok\.com|bsky\.app\/profile)\//i,"").replace(/[/?#].*$/,"").replace(/^@+/,"").replace(/\s+/g,"");
  if (REDES_RUTAS.test(x)) return "";
  return /^[\w.\-]{1,80}$/.test(x) ? (r==="fb" ? x : "@"+x) : ""; };
const iniciales = n => n.replace(/[·|].*$/,"").replace(/^@/,"").split(/[\s._-]+/).filter(w=>/^[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(w) && !/^(de|del|la|el|los|las|y)$/i.test(w)).slice(0,2).map(w=>w[0].toUpperCase()).join("") || "?";
const redActual = () => REDES[st.redRed] || st.redRed==="todas" ? st.redRed : "todas";
const REDES_CLAVE = "2daa7d78da68335e567c39515cf19cf2066123882deb3628a9d4e39fbfa8fbe5";
const redHuella = async (sal, pw) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sal + "|" + pw))), x=>x.toString(16).padStart(2,"0")).join("");
function redesAbierto(){ if (RS_DEMO) return true; try{ return sessionStorage.getItem("redesOk")==="1"; }catch(e){ return !!st.redesOk; } }
const redesData = () => { if (RS_DEMO) return (st.redesD = st.redesD || (window.RS_DEMO_PERFILES || []).map(p=>({...p}))); if (!st.redesD){ let d = store.get("redesPerfiles", null);
    if (!d) d = (store.get("redesDemo", []) || []).filter(p=>/^u/.test(p.id) && REDES[p.r]).map(({id,r,g,n,u,av})=>({id,r,g,n,u,av:!!av})); // lo que se añadió a mano en la maqueta anterior
    st.redesD = d; } return st.redesD; };
/* Lista compartida: los perfiles se guardan también en el Apps Script de la unidad (no en el repositorio público),
   así se ven igual en todos los dispositivos. Si ese script aún no tiene la parte de Redes, sigue funcionando solo en local. */
const redClave = () => { try{ return sessionStorage.getItem("redesPw") || ""; }catch(e){ return st.redesPw || ""; } };
const redNube = async cuerpo => { if (RS_DEMO) return null; const c = await confPush(); if (!c.url) return null;
  try { return await (await fetch(c.url, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ ...cuerpo, clave: redClave() }) })).json(); } catch(e){ return null; } };
let redSubeT = null;
const redesSube = () => { clearTimeout(redSubeT); redSubeT = setTimeout(async ()=>{ const d = await redNube({ accion:"redesGuardar", perfiles: st.redesD }); if (!(d && d.guardado)) aviso("No se pudo guardar en la lista compartida"); }, 700); };
const redesSave = () => { if (RS_DEMO) return; store.set("redesPerfiles", st.redesD); if (st.redesNube) redesSube(); redSync(); };
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
const API = "https://redes.josango11.workers.dev";
const CLAVE = "psg-redes-7f3c91b2e48a4d05";

function redNum(n){
  if (n == null) return "—";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",") + " M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(".", ",") + " mil";
  return String(n);
}

function redSync(){
  if (RS_DEMO) return;
  try{
    const mapa = {ig:"instagram", fb:"facebook", x:"x", tt:"tiktok", bs:"bluesky", md:"mastodon"};
    const lista = (st.redesD || []).filter(p => mapa[p.r] && p.u).map(p => ({ red: mapa[p.r], usuario: p.u }));
    fetch(`${API}/api/profiles/sync`, { method:"POST", headers:{"Content-Type":"application/json", "x-clave": CLAVE}, body: JSON.stringify(lista) })
      .then(r => { // con la lista ya en el servidor, se vuelven a pedir las publicaciones (si no, un perfil recién añadido sale vacío)
        if (!r.ok || typeof RS_CACHE === "undefined") return;
        Object.keys(RS_CACHE).forEach(k => delete RS_CACHE[k]);
        if (document.getElementById("rsFeed")) rsCarga(true);
      }).catch(()=>{});
  }catch(e){}
}
/* X no deja mostrar tuits en otras webs (su incrustado ya no carga). Los lee GitHub con la cuenta de lectura de la unidad
   y los guarda el Apps Script (herramientas/redesx.gs); aquí se piden y se pintan. Si son viejos, se pide una lectura nueva. */
const REDX_VIEJO_MIN = 10, REDX_ESPERA_MIN = 4;
const redXUsuario = u => String(u).replace(/^@/,"").toLowerCase();
const redXHace = ms => { const m = Math.round((Date.now()-ms)/6e4); return m<1 ? "ahora mismo" : m<60 ? `hace ${m} min` : m<1440 ? `hace ${Math.floor(m/60)} h` : `hace ${Math.floor(m/1440)} días`; };
const redXLeyendo = () => { const X = st.redesX || {}; return X.pedido && X.pedido > ((X.estado||{}).hora||0) && Date.now() - X.pedido < REDX_ESPERA_MIN*6e4; };
let redXNuevoT = null, redXPollT = null;
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
  // Si ya hay tuits de la cuenta de lectura y el feed tiene perfiles de X, se vuelve a montar con ellos
  if (rsLF().some(p=>p.r==="x") && st.redesX && st.redesX.datos){ Object.keys(RS_CACHE).filter(k=>k.startsWith("x|")).forEach(k=>delete RS_CACHE[k]); rsCarga(true); }
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
function redesObserva(){ // tras pintar la zona: se piden las publicaciones y las fotos de perfil que falten
  seguro("las publicaciones de Redes", rsCarga);
  redFotosPide();
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
  if (RS_DEMO || st.redFotoTope || !redesAbierto()) return;
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
  // Modo de prueba: primero se cargan los datos inventados
  if (RS_DEMO && !window.RS_DEMO_FEED){ cargaScript("rsDemo", "js/redes-demo.js").then(()=>{ st.redesD = null; st.redesPinta = true; render(true); });
    return hero + `<div class="rz"><div class="rz-vacio"><b>Cargando datos de prueba…</b></div></div>`; }
  const P = redesData(), red = redActual(), todas = red==="todas", R = REDES[red];
  const de = r => r==="todas" ? P : P.filter(p=>p.r===r);
  const L = de(red), grp = st.redGrupo || "todos";
  const LF = L.filter(p=>grp==="todos" || p.g===grp);
  const que = red==="fb" ? "página" : "perfil";
  let h = hero + `<div class="rz" data-red="${red}"><div class="rz-demo">${RS_DEMO ? `<b>Modo de prueba.</b> Perfiles y publicaciones inventados para ver el diseño; no se guarda ni se envía nada.` : `<b>En desarrollo.</b> <span id="redNubeTxt">${redNubeTxt()}</span>`}</div>`;
  if (!st.redesBajado) redesBaja();
  const tile = (r, ico, n, s, c) => `<button class="rz-tile" role="tab" data-act="redRed" data-v="${r}" aria-selected="${r===red}" style="--tc:${c}">${ico}<span class="t"><b>${n}</b><span class="s">${s}</span></span></button>`;
  h += `<div class="rz-tabs" role="tablist" aria-label="Redes">`
    + tile("todas", `<span class="rk lg rz-todas">${RedesTarjeta.SVG.todos}</span>`, "Todas", plural(P.length, "perfil", "perfiles"), "var(--pine)")
    + Object.keys(REDES).map(r=>tile(r, redKey(r,"lg"), REDES[r].n, plural(de(r).length, r==="fb"?"página":"perfil", r==="fb"?"páginas":"perfiles"), REDES[r].c)).join("")
    + `<button class="rz-link rz-out" data-act="redCerrar">${RS_DEMO ? "" : "Cerrar zona privada"}</button></div>`;
  h += `<div class="rz-bar"><div class="rz-chips">${redChips(L, grp)}</div>${todas ? "" : `<button class="rz-add" data-act="redNuevo">${RI.mas} Añadir ${que}</button>`}</div>`;
  if (!todas) h += `<form class="rz-form" data-form="redPerfil" hidden><h3>${red==="fb"?"Nueva página":"Nuevo perfil"} de ${R.n}</h3>
    <label>Enlace o usuario<input type="text" name="u" id="redU" maxlength="200" autocomplete="off" placeholder="${red==="fb"?"https://www.facebook.com/nombre.de.la.pagina":red==="tt"?"https://www.tiktok.com/@usuario o @usuario":red==="ig"?"https://www.instagram.com/usuario o @usuario":"https://x.com/usuario o @usuario"}"></label>
    <label>Nombre (opcional)<input type="text" name="n" maxlength="60" autocomplete="off" placeholder="Cómo quieres que aparezca"></label>
    <label>Grupo<select name="g">${REDES_GRUPOS.map(g=>`<option${g===(grp!=="todos"?grp:"Otros")?" selected":""}>${esc(g)}</option>`).join("")}</select></label>
    ${R.av ? `<label class="chk"><input type="checkbox" name="av"> Avisarme cuando publique</label>` : ""}
    <div class="fa"><button class="btn" type="submit">Añadir</button><button class="btn ghost" type="button" data-act="redNuevo">Cancelar</button><span class="err" id="redFormErr"></span></div></form>`;
  if (LF.length){ h += `<p class="rz-nota">${REDES_NOTA}</p>` + rsVista(LF, red + (grp!=="todos" ? "|" + grp : "")); }
  else h += `<div class="rz-vacio"><b>${L.length ? "Nada en este grupo" : todas ? "Todavía no hay perfiles" : `Todavía no hay ${red==="fb"?"páginas":"perfiles"} de ${R.n}`}</b>${L.length ? "Elige otro grupo." : todas ? "Elige una red arriba y pulsa «Añadir perfil»." : `Pulsa «Añadir ${que}» y pega el enlace: aparecerá aquí con su foto y lo último que haya publicado.`}</div>`;
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
  if (act==="redRed"){ if (b.dataset.v===redActual()) return; st.redRed = b.dataset.v; st.redGrupo = "todos"; st.rsVer = null; st.rsTodo = false; pinta(); window.scrollTo({top:0}); }
  else if (act==="redGrupo"){ st.redGrupo = b.dataset.v; pinta(true); }
  else if (act==="redNuevo"){ const f = document.querySelector('form[data-form="redPerfil"]'); if (!f) return; f.hidden = !f.hidden; $("#redFormErr").textContent = ""; if (!f.hidden) setTimeout(()=>$("#redU")?.focus(), 30); }
  // Quitar: la confirmación se pinta solo en esa columna, sin recargar las demás
  else if (act==="redBorra" && p){ b.closest(".acts").innerHTML = `<span class="rz-conf">¿Quitar? <button class="si" data-act="redBorraSi" data-id="${esc(p.id)}">Sí</button><button data-act="redBorraNo" data-id="${esc(p.id)}">No</button></span>`; }
  else if (act==="redBorraNo" && p){ b.closest(".acts").innerHTML = redActs(p); }
  // Avisos: se guarda la preferencia; empezarán a llegar cuando la red esté conectada por su API
  else if (act==="redAv" && p){ p.av = !p.av; redesSave(); b.closest(".acts").innerHTML = redActs(p); rsHistRepinta(); aviso(p.av ? `Marcado. Activa también la campana de este perfil en ${REDES[p.r].n}` : "Marca quitada"); }
  else if (act==="redEdita" && p){ const hd = b.closest("header");
    hd.innerHTML = `<form class="rz-edit" data-form="redEdita" data-id="${esc(p.id)}"><input type="text" name="n" maxlength="60" value="${esc(p.n)}" aria-label="Nombre"><select name="g" aria-label="Grupo">${REDES_GRUPOS.map(g=>`<option${g===p.g?" selected":""}>${esc(g)}</option>`).join("")}</select><button class="rz-ic ok" type="submit" title="Guardar" aria-label="Guardar">${RI.ok}</button><button class="rz-ic" type="button" data-act="redEditaNo" data-id="${esc(p.id)}" title="Cancelar" aria-label="Cancelar">✕</button><div class="ft"><span class="pv">${redAvt(p)}</span><label class="rz-fb"><input type="file" accept="image/*" hidden>Poner foto</label>${p.f?`<button type="button" class="rz-fb" data-act="redFotoNo" data-id="${esc(p.id)}">Quitar</button>`:""}<small>o pégala con Ctrl+V</small></div></form>`;
    hd.querySelector("input").focus(); }
  else if (act==="redEditaNo" && p){ b.closest("header").innerHTML = redCab(p); }
  else if (act==="redFotoNo" && p){ delete p.f; delete p.fz; redesSave(); const pv = b.closest(".ft").querySelector(".pv"); if (pv) pv.innerHTML = redAvt(p); b.remove(); redFotosPide(); }
  else if (act==="redBorraSi" && p){ st.redesD = P.filter(q=>q!==p); redesSave(); pinta(true); aviso("Quitado"); }
  else if (act==="redXActualiza"){ redesXAsegura(true); }
  // Feed de publicaciones (ver un perfil, buscar, copiar ficha…): lo resuelve js/redes-feed.js
  else if (/^redRs/.test(act)) rsAccion(act, b);
  else if (act==="redCerrar"){ try{ sessionStorage.removeItem("redesOk"); }catch(_){} st.redesOk = false; pinta(); window.scrollTo({top:0}); }
}
