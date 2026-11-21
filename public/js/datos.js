/* ================= Datos ================= */
let cacheNews = null;
// Titulares escritos todo en MAYÚSCULAS: a minúsculas normales (manteniendo siglas cortas y nombres propios conocidos)
function sinGritos(t){
  t = String(t).replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, "").replace(/\s{2,}/g, " ").trim();
  const letras = (t.match(/\p{L}/gu) || []); if (letras.length < 12) return t;
  const may = letras.filter(c => c === c.toUpperCase() && c !== c.toLowerCase()).length;
  const ini = letras.slice(0, 40), mayIni = ini.filter(c => c === c.toUpperCase() && c !== c.toLowerCase()).length;
  if (may / letras.length < 0.6 && mayIni / ini.length < 0.9) return t;
  let x = t.replace(/\S[\u0336\u0335]/g, "").replace(/\s{2,}/g, " ").toLowerCase(); // fuera lo tachado
  x = x.replace(/(^|[.!?:]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  const BIEN = { "segovia":"Segovia", "saleta":"Saleta", "santa maría la real de nieva":"Santa María la Real de Nieva", "la real de nieva":"la Real de Nieva", "plaza mayor":"Plaza Mayor", "sta.":"Sta.", "mª":"Mª", "pp":"PP", "psoe":"PSOE", "vox":"Vox", "ugt":"UGT", "ccoo":"CCOO", "junta":"Junta", "diputación":"Diputación", "guardia civil":"Guardia Civil" };
  for (const [w, ok] of Object.entries(BIEN)){ const re = new RegExp("(^|[^\\p{L}])(" + w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + ")(?![\\p{L}])", "giu"); x = x.replace(re, (m, a) => a + ok); }
  x = x.charAt(0).toUpperCase() + x.slice(1);
  return x.replace(/\b(\d{1,2}):(\d{2}) h\b/g, "$1:$2 h");
}
function procesa(n, fecha){
  const key = n.id || norm(n.titulo);
  const resumen = String(n.resumen||"").replace(/<[^>]*>?/g," ").replace(/\s+/g," ").trim();
  const pub = n.publicado ? new Date(n.publicado) : null;
  const ok = pub && !isNaN(pub);
  const dia = ok ? iso(pub) : fecha;
  const hora = ok ? pub.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:TZ}) : n.hora;
  const cats = (Array.isArray(n.categorias)?n.categorias:[]).filter(c=>CAT[c]);
  // Convocatoria anulada por una noticia posterior: fuera de la agenda, con aviso en la tarjeta
  const anulada = n.cancelada && (n.fecha_evento || n.convocatoria) ? { fecha_evento: undefined, hora_evento: undefined, convocatoria: undefined, _anulada: n.cancelada, _evAnulado: n.fecha_evento, ...(n.relevancia==="alta"?{relevancia:"media"}:{}) } : {};
  return {...n, ...anulada, titulo: sinGritos(n.titulo||""), resumen, hora, _ts: ok ? pub.getTime() : new Date(`${dia}T${n.hora||"00:00"}:00`).getTime(), _key:key, _dia:dia, _cats: cats.length?cats:["politica"]};
}
// Fotos que no aportan: logotipos o imágenes genéricas de un medio, o la misma foto en noticias distintas
const FOTO_GENERICA = /estaticos|opengraph_|\/default|logo|placeholder|og[-_]?default|no[-_]?image|sin[-_]?imagen/i;
let fotosRepetidas = null;
function fotoValida(u){
  if (!safeUrl(u) || FOTO_GENERICA.test(u)) return false;
  if (!fotosRepetidas){ const c = {}; for (const d of st.dias) for (const n of (d.noticias||[])) if (n.img) c[n.img] = (c[n.img]||0) + 1; fotosRepetidas = new Set(Object.keys(c).filter(k=>c[k]>1)); }
  return !fotosRepetidas.has(u);
}
function allNews(){
  if (cacheNews) return cacheNews;
  fotosRepetidas = null;
  const map = new Map();
  for (const d of st.dias) for (const n of (d.noticias||[])){ const x = procesa(n, d.fecha); if (!map.has(x._key)) map.set(x._key, x); }
  return (cacheNews = [...map.values()]);
}
/* ================= Hemeroteca: todo lo publicado por nuestros medios ================= */
const hem = { estado: "no", meses: [], cargados: [], items: [], desde: "" };
async function cargaHemeroteca(masMeses){
  if (hem.estado==="cargando") return;
  hem.estado = "cargando"; render(true);
  try {
    if (!hem.meses.length){ const ind = await (await fetch("hemeroteca/indice.json?t="+Date.now(), {cache:"no-store"})).json(); hem.meses = (ind.meses||[]).map(m=>m.mes).sort().reverse(); }
    const faltan = hem.meses.filter(m=>!hem.cargados.includes(m)).slice(0, masMeses ? 3 : 3);
    const arcs = await Promise.all(faltan.map(m=>fetch(`hemeroteca/${m}.json`).then(r=>r.ok?r.json():null).catch(()=>null)));
    for (const a of arcs) if (a){ hem.items.push(...(a.n||[]).map(x=>({...x, _n: norm([x.t,x.r,x.p].join(" "))}))); }
    hem.cargados.push(...faltan);
    hem.desde = [...hem.cargados].sort()[0] || "";
    hem.estado = "ok";
  } catch(e){ hem.estado = "error"; }
  render(true);
}
function resultadosHem(words){
  const vistos = new Set();
  return hem.items.filter(x=>words.every(w=>x._n.includes(w))).filter(x=>{ const k = norm(x.t); if (vistos.has(k)) return false; vistos.add(k); return true; });
}
function bloqueHemeroteca(words){
  if (hem.estado==="no" || hem.estado==="cargando") return `<div class="empty small">Cargando todo lo publicado…</div>`;
  if (hem.estado==="error") return `<div class="arcbox"><div><b>No se pudo cargar la hemeroteca</b><span>Puede que aún no tenga datos o que no haya conexión.</span></div><button class="btn" data-act="hemeroteca" type="button">Reintentar</button></div>`;
  const unicos = resultadosHem(words);
  const mas = hem.meses.some(m=>!hem.cargados.includes(m));
  let h = `<div class="dayhead"><h3>${plural(unicos.length,"noticia","noticias")}${hem.desde?` desde ${esc(mesLargo(hem.desde))}`:""}</h3><span>todos nuestros medios</span></div>`;
  h += unicos.length ? `<div class="hlist">` + unicos.slice(0,150).map(x=>`<a class="hrow" href="${esc(safeUrl(x.u)||"#")}" target="_blank" rel="noopener"><b>${hl(x.t)}</b><span>${esc(x.m||"")} · ${esc(cuando(x.f.slice(0,10), x.f.slice(11,16)))}${x.p?` · ${esc(x.p)}`:""}</span>${x.r?`<em>${hl(x.r)}</em>`:""}</a>`).join("") + `</div>` + (unicos.length>150?`<div class="empty small">Se muestran las 150 más recientes. Afina la búsqueda con más palabras.</div>`:"")
    : `<div class="empty"><b>Nada publicado con esa búsqueda</b>Prueba con otras palabras o <button class="linkbtn" data-ambito="google" type="button">busca en Google</button>.</div>`;
  if (mas) h += `<div class="arcbox"><div><b>¿Más atrás?</b><span>Cargar los meses anteriores.</span></div><button class="btn ghost" data-act="hemeroteca-mas" type="button">Cargar meses anteriores</button></div>`;
  return h;
}
// Búsqueda en Google limitada a nuestros medios (también busca años atrás)
const DOMINIOS = ["eladelantado.com","elnortedecastilla.es","eldiasegovia.es","segoviaudaz.es","segoviadirecto.com","tribunasegovia.com","acueducto2.com","escuellar.es","elnordestedesegovia.es","diariodecastillayleon.es","europapress.es","cope.es","ondacero.es","hoycyl.com","segovia247.es","cadenaser.com"];
function bloqueGoogle(q){
  const g = "https://www.google.com/search?q=" + encodeURIComponent(q + " (" + DOMINIOS.map(d=>"site:"+d).join(" OR ") + ")");
  const gn = "https://news.google.com/search?q=" + encodeURIComponent(q + (/segovia/i.test(q)?"":" Segovia")) + "&hl=es&gl=ES&ceid=ES:es";
  return `<div class="gcards">
    <a class="gcard" href="${esc(g)}" target="_blank" rel="noopener"><b>En nuestros periódicos y webs ↗</b><span>Google, solo en El Adelantado, El Norte, El Día, SegoviaUdaz, esCuéllar, Europa Press, COPE… Busca también años atrás.</span></a>
    <a class="gcard" href="${esc(gn)}" target="_blank" rel="noopener"><b>En Google Noticias ↗</b><span>Todos los medios de España, ordenado por noticias recientes.</span></a></div>`;
}
/* ================= Archivo histórico (meses anteriores) ================= */
const arc = { estado: "no", news: [], desde: "" }; // no | cargando | ok | error
async function cargaArchivo(){
  if (arc.estado==="cargando" || arc.estado==="ok") return;
  arc.estado = "cargando"; render(true);
  try {
    const ind = await (await fetch("archivo/indice.json?t="+Date.now(), {cache:"no-store"})).json();
    const meses = await Promise.all((ind.meses||[]).map(m=>fetch(`archivo/${m.mes}.json?t=${Date.now()}`, {cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null)));
    const map = new Map();
    for (const a of meses) if (a) for (const [f, l] of Object.entries(a.dias||{})) for (const n of l){ const x = procesa(n, f); if (!map.has(x._key)) map.set(x._key, x); }
    arc.news = [...map.values()]; arc.estado = "ok";
    arc.desde = (ind.meses||[]).map(m=>m.mes).sort()[0] || "";
  } catch(e){ arc.estado = "error"; }
  render(true);
}
// Lo del archivo que no está ya en los datos actuales (más antiguo que la ventana de 21 días)
const soloArchivo = news => { const ya = new Set(news.map(n=>n._key)); return arc.news.filter(n=>!ya.has(n._key)); };
const mesLargo = m => { if (!m) return ""; const [y,mo] = m.split("-"); return new Date(+y, +mo-1, 15).toLocaleDateString("es-ES",{month:"long",year:"numeric"}); };
function bloqueArchivo(news, filtro, que){
  if (arc.estado==="no") return `<div class="arcbox"><div><b>¿Buscas algo más antiguo?</b><span>La app guarda todo lo que ha salido desde que empezó, mes a mes.</span></div><button class="btn" data-act="archivo" type="button">Buscar en el archivo</button></div>`;
  if (arc.estado==="cargando") return `<div class="arcbox"><div><b>Cargando el archivo…</b></div></div>`;
  if (arc.estado==="error") return `<div class="arcbox"><div><b>No se pudo cargar el archivo</b><span>Comprueba la conexión.</span></div><button class="btn" data-act="archivo" type="button">Reintentar</button></div>`;
  const res = soloArchivo(news).filter(filtro).sort(porHora);
  return `<div class="dayhead arch"><h3>En el archivo${arc.desde?` (desde ${esc(mesLargo(arc.desde))})`:""}</h3><span>${plural(res.length,"noticia","noticias")}</span></div>` +
    (res.length ? porDias(res) : `<div class="empty small">Nada más antiguo ${esc(que)}.</div>`);
}
const kwHits = n => { if(!st.kws.length) return 0; const t = norm([n.titulo,n.resumen,n.municipio,n.analisis?.extracto].join(" ")); return st.kws.filter(k=>t.includes(norm(k))).length; };
const enRango = n => n._dia >= addDays(today(), -(parseInt(st.rango,10)-1));
// Filtros generales (los que se ven en la barra)
function pasa(n){
  if (st.sinCapital && isCapital(n)) return false;
  if (st.soloKw && !kwHits(n)) return false;
  if (st.cat && !n._cats.includes(st.cat)) return false;
  return true;
}
const porHora = (a,b) => (b._ts||0)-(a._ts||0);
const hh = h => h ? String(h).padStart(5,"0") : "99:99";
const porEvento = (a,b) => (a.fecha_evento+hh(a.hora_evento)).localeCompare(b.fecha_evento+hh(b.hora_evento));
// Agenda: lo que tiene día (de hoy en adelante) y lo anunciado sin fecha de los últimos 5 días. Todos los contadores usan esto.
function agendaDe(news, conFiltros=true){
  const t = today(), base = conFiltros ? news.filter(pasa) : news;
  return { ev: base.filter(n=>n.fecha_evento && n.fecha_evento>=t).sort(porEvento),
           sinFecha: base.filter(n=>n.convocatoria && !n.fecha_evento && n._dia>=addDays(t,-5)).sort(porHora) };
}
const isNew = n => !st.seen.has(n._key);
function actualizaTitulo(news = allNews()){
  const nu = news.filter(n=>pasa(n) && enRango(n) && isNew(n)).length;
  document.title = nu ? `(${nu}) Prensa Segovia` : "Prensa Segovia";
  faviconConNumero(nu);
}
// Icono de la pestaña con un globo rojo y el número de noticias nuevas (se ve aunque estés en otra pestaña)
let favBase = null, favUlt = -1;
function faviconConNumero(n){
  if (n === favUlt) return; favUlt = n;
  const lnk = document.getElementById("lnkFav"); if (!lnk) return;
  const orig = "iconoa-96.png";
  if (!n){ lnk.href = orig; return; }
  const pinta = img => { try {
    const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
    x.drawImage(img, 0, 0, 64, 64);
    const t = n > 99 ? "99+" : String(n), w = Math.max(30, 14 + t.length * 13);
    x.fillStyle = "#D93025"; x.beginPath(); x.roundRect ? x.roundRect(64 - w, 0, w, 32, 16) : x.rect(64 - w, 0, w, 32); x.fill();
    x.lineWidth = 3; x.strokeStyle = "#fff"; x.stroke();
    x.fillStyle = "#fff"; x.font = "bold 24px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, 64 - w / 2, 17);
    lnk.href = c.toDataURL("image/png");
  } catch(e){} };
  if (favBase && favBase.complete) pinta(favBase); else { favBase = new Image(); favBase.onload = () => pinta(favBase); favBase.src = orig; }
}
/* Abrir una noticia = leída: quita también la etiqueta «Nueva» (pasar por pantalla no la quita hasta la siguiente visita) */
function marcarAbierta(k){ if(!k) return; marcarVisto([k]); if (st.sesionNuevas) st.sesionNuevas.delete(k);
  document.querySelectorAll(`.card[data-k="${CSS.escape(k)}"]`).forEach(c=>{ c.classList.remove("unseen","llego","nueva"); c.querySelectorAll(".top > .nvtag:not([style])").forEach(t=>t.remove()); });
  actualizaTitulo(); }
function marcarVisto(keys){ let c=false; for (const k of keys) if(k && !st.seen.has(k)){ st.seen.add(k); c=true; } if(c){ store.set("seen", [...st.seen].slice(-6000)); actualizaPer(); } }
// Noticias de Periódicos sin ver: insignia de la pestaña, burbujas de cada periódico y «te quedan»
function actualizaPer(){
  const b = document.getElementById("perBadge"); if (!b) return;
  const ult = store.get("perUltima", null) ?? Date.now();
  const hay = st.view!=="periodicos" && periodicosNews().some(n=>!perFueraCap(n) && n._lleg > ult);
  b.hidden = !hay; b.textContent = ""; b.classList.add("solopunto");
}
// Botón de la capital: dice el estado actual ("Con capital" / "Sin capital"); se cambia con un toque
const chipCapital = () => `<button class="chip capchip" data-act="capital" aria-pressed="${st.sinCapital}" title="${st.sinCapital?"Toca para mostrar también Segovia capital":"Toca para ocultar Segovia capital"}" type="button"><span class="cd"></span>${st.sinCapital?"Sin capital":"Con capital"}</button>`;
const filtrosActivos = () => [st.rango!=="3"?`${st.rango} días`:"", st.sinCapital?"sin capital":"", st.soloKw?"solo palabras vigiladas":"", st.cat?CAT[st.cat].n.toLowerCase():""].filter(Boolean);

const SIN_TILDE = { a:"[aáàä]", e:"[eéèë]", i:"[iíìï]", o:"[oóòö]", u:"[uúùü]", n:"[nñ]", c:"[cç]" };
function hl(text){
  text = String(text ?? "");
  const words = [...st.kws, ...(st.q ? st.q.split(/\s+/).filter(w=>w.length>2) : [])].map(w=>norm(w).trim()).filter(Boolean).sort((a,b)=>b.length-a.length);
  if (!words.length) return esc(text);
  const re = new RegExp("(" + words.map(w=>[...w].map(ch=>SIN_TILDE[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("")).join("|") + ")", "gi");
  return text.split(re).map((p,i)=> i%2 ? `<mark>${esc(p)}</mark>` : esc(p)).join("");
}

