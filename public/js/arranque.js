/* ================= Carga ================= */
function applyData(j){
  st.pending = null; $("#toast").classList.remove("show");
  st.dias = (j.dias||[]).filter(d=>d && d.fecha).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  st.fuentes = j.fuentes || [];
  st.viaGoogle = j.via_google || [];
  st.actualizado = j.actualizado || "";
  st.loaded = true; st.error = false; cacheNews = null;
  // Enlace de prueba ?nuevas=5: vuelve a marcar como nuevas las N últimas (para ver cómo se ven)
  { const k = parseInt(new URLSearchParams(location.search).get("nuevas")||"", 10);
    if (k > 0 && k <= 50){ allNews().slice().sort(porHora).slice(0, k).forEach(n=>{ st.seen.delete(n._key); st.sesionNuevas && st.sesionNuevas.delete(n._key); });
      try{ history.replaceState(null, "", location.pathname + location.hash); }catch(e){} } }
  // Instantánea de lo no visto al cargar: se queda en "Nuevo para ti" durante la visita
  { const ya = st.sesionNuevas || new Set(); for (const n of allNews()) if (isNew(n)) ya.add(n._key); st.sesionNuevas = ya; }
  // Las guardadas se refrescan con la versión más reciente (más medios, mejor resumen)
  for (const n of allNews()) if (st.favs[n._key]){ const { _ts, ...g } = n; st.favs[n._key].n = g; }
  store.set("favs", st.favs);
  if (!store.get("seen3", null)){ // primera vez: cuenta como nuevo lo de los últimos 2 días
    store.set("seen3", true); st.seen = new Set();
    marcarVisto(allNews().map(n=>n._key)); st.sesionNuevas = new Set(); st.primera = true; // la primera vez nada es «nuevo»
    store.set("seenP", null);
    if (st.periodicos.length){ store.set("seenP", true); const lim = Date.now() - 24*36e5; marcarVisto(periodicosNews().filter(n=>n._ts < lim).map(n=>n._key)); }
  }
  render();
  avisar(allNews());
}
async function cargaPeriodicos(){
  try { const r = await fetch("periodicos.json?t="+Date.now(), {cache:"no-store"}); if (!r.ok) return; const j = await r.json(); st.periodicos = j.noticias || [];
    if (!store.get("seenP", null)){ store.set("seenP", true); const lim = Date.now() - 24*36e5; marcarVisto(periodicosNews().filter(n=>n._ts < lim).map(n=>n._key)); }
    { const conocidos = store.get("perConocidos", null), hay = [...new Set(st.periodicos.map(n=>n.medio))];
      if (conocidos){ const nuevos = hay.filter(m=>!conocidos.includes(m)); if (nuevos.length){ const lim = Date.now() - 3*36e5; marcarVisto(st.periodicos.filter(n=>nuevos.includes(n.medio) && new Date(n.publicado).getTime() < lim).map(n=>"p:"+n.url)); } }
      store.set("perConocidos", [...new Set([...(conocidos||[]), ...hay])]); }
    actualizaPer(); if (st.view==="periodicos" && !st.sub) render(true); } catch(e){}
}
async function fetchJSON(){
  const r = await fetch("datos.json?t="+Date.now(), {cache:"no-store"});
  if (!r.ok) throw new Error("http "+r.status);
  return r.json();
}
async function load(){
  const btn = $("#btnReload"); if (btn) btn.classList.add("spin");
  cargaPeriodicos();
  try{ applyData(await fetchJSON()); }
  catch(e){ st.loaded = true; st.error = !st.dias.length; render(); if (st.dias.length) aviso("Sin conexión: mostrando lo último guardado"); }
  finally{ const b=$("#btnReload"); if (b) setTimeout(()=>b.classList.remove("spin"), 400); }
}
async function poll(){
  try{
    const j = await fetchJSON();
    if (j.actualizado && j.actualizado !== st.actualizado) cargaPeriodicos();
    if (j.actualizado && j.actualizado !== st.actualizado){
      if (window.scrollY < 80 && !$("#sheetWrap").classList.contains("open") && !st.q && !st.sub) applyData(j);
      else { st.pending = j; $("#toast").classList.add("show"); const nn = noticiasDe(j); avisar(nn); actualizaTitulo(nn); }
    } else syncLabel();
  }catch(e){}
}

/* ================= Guía rápida ================= */
const ic = d => `<span class="gi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></span>`;
let instalarEv = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); instalarEv = e; if ($("#guia").classList.contains("open")) pintaGuia(); });
addEventListener("appinstalled", () => { instalarEv = null; if ($("#guia").classList.contains("open")) pintaGuia(); });
const esPCg = () => !esIOS() && !esAndroid();
function pasoInstalar(){
  if (instalada()) return `<h2 id="guiaTit">Ya la tienes como app</h2><p><span class="gok">✓ Estás usando la app instalada.</span> Se abre desde su icono, a pantalla completa y se actualiza sola.</p>` + (push.on ? `<p class="gok">✓ Los avisos están activados.</p>` : `<div class="gnota">Ahora es el momento de activar los <b>avisos</b>: te llegará lo nuevo de interés aunque tengas la app cerrada.</div>` + (avisosListos() ? `<button class="gbtn ginst" id="guiaAvisos" type="button">Activar avisos</button>` : ""));
  let h = `<h2 id="guiaTit">Guárdala en el móvil como una app</h2><p>No hace falta tienda de aplicaciones: se añade a la pantalla de inicio con su icono, se abre a pantalla completa y, además, así puedes recibir <b>avisos</b>.</p>`;
  if (enOtraApp()) return h + `<div class="gnota">Ahora la estás viendo dentro de otra app (WhatsApp, Telegram…). Primero ábrela en el navegador: toca <b>⋮</b> o <b>···</b> y elige <b>«Abrir en el navegador»</b> (en iPhone, <b>«Abrir en Safari»</b>). Al abrirla en el navegador te volverá a salir esta guía con los pasos.</div>`;
  if (esIOS()) return h + `<ul>
    <li><span class="gnum">1</span><span>Ábrela en <b>Safari</b>. Si la abriste desde WhatsApp, toca primero la brújula o «Abrir en Safari»</span></li>
    <li><span class="gnum">2</span><span>Toca <b>···</b> (abajo a la derecha) y luego <b>Compartir</b>. En iPhones con otra versión, el botón Compartir <span style="white-space:nowrap">(cuadrado con flecha ↑)</span> está directamente abajo</span></li>
    <li><span class="gnum">3</span><span>Baja y elige <b>«Añadir a pantalla de inicio»</b>. Si no aparece, toca «Editar acciones» al final de la lista</span></li>
    <li><span class="gnum">4</span><span>Deja activado <b>«Abrir como app web»</b> si te sale, pulsa <b>«Añadir»</b> y ábrela siempre desde el icono nuevo</span></li></ul>
    <div class="gnota">En iPhone los avisos solo funcionan desde la app añadida a la pantalla de inicio.</div>`;
  if (esAndroid()) return h + (instalarEv ? `<button class="gbtn ginst" id="guiaInst" type="button">Instalar ahora</button><div class="gnota">Si no te sale, hazlo a mano: en Chrome toca <b>⋮</b> (arriba a la derecha) y busca la opción que empieza por <b>«Instalar…»</b> o <b>«Añadir a pantalla de inicio»</b>. Si te pregunta, elige <b>Instalar</b>, no «Crear acceso directo».</div>` : `<ul>
    <li><span class="gnum">1</span><span>Ábrela en <b>Chrome</b></span></li>
    <li><span class="gnum">2</span><span>Toca <b>⋮</b>, arriba a la derecha</span></li>
    <li><span class="gnum">3</span><span>Busca la opción que empieza por <b>«Instalar…»</b> o <b>«Añadir a pantalla de inicio»</b>. Si te pregunta, elige <b>Instalar</b>, no «Crear acceso directo»</span></li>
    <li><span class="gnum">4</span><span>Ábrela desde el icono nuevo de tu pantalla de inicio</span></li></ul>`);
  // Ordenador: sin pasos; se explica cuando la abra en el móvil
  return `<h2 id="guiaTit">Tenla también en el móvil</h2><p>En el teléfono se puede guardar como una app: con su icono en la pantalla de inicio, a pantalla completa y con <b>avisos</b> de lo nuevo.</p>
    <div class="gnota">Abre en el móvil <b>prensasegovia.github.io/prensasegovia</b> (o el enlace que te pasaron) y allí te explicará cómo guardarla, paso a paso para iPhone o Android.</div>`;
}
const PASOS = [
  () => `<h2 id="guiaTit">Prensa Segovia</h2><p>Toda la prensa de la provincia en un sitio. En <b>Noticias</b> solo sale lo que interesa al servicio, sobre todo en los pueblos.</p>
    <ul><li>${ic("M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z")}<span><b>Qué entra</b>Sucesos, movilizaciones, política, visitas de autoridades, medio ambiente, emergencias y fiestas.</span></li>
    <li>${ic("M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z")}<span><b>Siempre al día</b>Se actualiza sola a lo largo del día. Lo que llega nuevo se marca en azul.</span></li>
    <li>${ic("M12 3l9 16H3zM12 10v4M12 17h.01")}<span><b>Importante</b>Lo más relevante sale arriba, en rojo.</span></li></ul>`,
  () => `<h2 id="guiaTit">Las secciones</h2><p>Abajo (o a la izquierda en el ordenador):</p>
    <ul><li>${ic("M4 5h13a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2zM8 9h7M8 13h7M8 17h4")}<span><b>Noticias</b>Lo de interés, agrupado: si varios periódicos cuentan lo mismo sale una sola vez con todos los enlaces.</span></li>
    <li>${ic("M3 10h18M8 3v4M16 3v4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z")}<span><b>Agenda</b>Concentraciones, huelgas, mítines, visitas y fiestas con fecha.</span></li>
    <li>${ic("M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z")}<span><b>Pueblos</b>Las noticias de cada pueblo.</span></li>
    <li>${ic("M3 4h18v16H3zM7 8h10M7 12h4M7 16h4M14 12h3v4h-3z")}<span><b>Periódicos</b>Todo lo que publica cada medio, sin filtrar, como un quiosco.</span></li>
    <li>${ic("M6 3h12v18l-6-4-6 4z")}<span><b>Guardadas</b>Las que marques para leer luego.</span></li></ul>` + (hayElecciones() ? `<div class="gnota"><b>Elecciones 29N:</b> el acceso «Elecciones 29N» del resumen reúne toda la campaña de la capital y la provincia, aunque tengas puesto «Sin capital».</div>` : ""),
  () => `<h2 id="guiaTit">Ajústala a tu gusto</h2><p>En la barra de arriba de Noticias y en <b>Filtros</b>:</p>
    <ul><li>${ic("M3 21h18M5 21V10M19 21V10M3 10l9-6 9 6z")}<span><b>Con o sin capital</b>Los botones <i>Con capital / Sin capital</i> muestran u ocultan las noticias de Segovia capital.</span></li>
    <li>${ic("M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16zM10 21h4")}<span><b>Avisos</b>Te llega una notificación con lo nuevo de interés (todo o solo lo importante) y, si quieres, de los periódicos que elijas. De 23 a 7 no molesta.</span></li>
    <li>${ic("M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5")}<span><b>Palabras vigiladas</b>Apunta nombres o temas y se resaltan en amarillo cuando salgan. «Guardia Civil» ya viene puesta.</span></li>
    <li>${ic("M4 6h16M7 12h10M10 18h4")}<span><b>Periodo, letra y aspecto</b>3, 7 o 21 días; letra más grande; modo oscuro; vista compacta.</span></li>
    <li>${ic("M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2zM8 11h8M8 15h8")}<span><b>Parte del día</b>El botón <i>Parte</i> te da un resumen listo para copiar o mandar por WhatsApp.</span></li></ul>`,
  pasoInstalar
];
let guiaI = 0;
function pintaGuia(){
  const n = PASOS.length;
  $("#guiaCuerpo").innerHTML = PASOS[guiaI]();
  $("#guiaPaso").textContent = `Guía rápida · ${guiaI+1} de ${n}`;
  $("#guiaPuntos").innerHTML = PASOS.map((_,i)=>`<i class="${i===guiaI?"on":""}"></i>`).join("");
  $("#guiaAtras").hidden = guiaI === 0;
  $("#guiaSig").textContent = guiaI === n-1 ? (guiaDesde ? "Cerrar" : "Empezar") : "Siguiente";
  $("#guiaX").hidden = guiaI === n-1;
  $("#guiaCuerpo").scrollTop = 0; requestAnimationFrame(sombraGuia);
  const ba = $("#guiaAvisos"); if (ba) ba.onclick = () => { cierraGuia(); abreAvisos(true); };
  const bi = $("#guiaInst"); if (bi) bi.onclick = async () => { if (!instalarEv) return; instalarEv.prompt(); try { await instalarEv.userChoice; } catch(e){} instalarEv = null; pintaGuia(); };
}
let guiaDesde = null;
const FONDO_GUIA = ["#app","#aside","#appbar",".tabbar","#searchbar"];
function sombraGuia(){ const c = $("#guiaCuerpo"); c.classList.toggle("mas", c.scrollHeight - c.scrollTop - c.clientHeight > 4); }
$("#guiaCuerpo").addEventListener("scroll", sombraGuia, {passive:true});
function abreGuia(paso=0, desde=null){ guiaDesde = desde; guiaI = paso; pintaGuia(); $("#guia").classList.add("open"); FONDO_GUIA.forEach(q=>document.querySelector(q)?.setAttribute("inert","")); setTimeout(()=>$("#guiaSig").focus(), 50); }
const GUIA_V = 2;
function cierraGuia(){ $("#guia").classList.remove("open"); store.set("guiaVista", GUIA_V); FONDO_GUIA.forEach(q=>document.querySelector(q)?.removeAttribute("inert")); const d = guiaDesde; guiaDesde = null; if (d && d.isConnected) d.focus(); }
$("#guiaSig").addEventListener("click", ()=>{ if (guiaI < PASOS.length-1){ guiaI++; pintaGuia(); } else cierraGuia(); });
$("#guiaAtras").addEventListener("click", ()=>{ if (guiaI > 0){ guiaI--; pintaGuia(); } });
$("#guiaX").addEventListener("click", cierraGuia);
$("#guia").addEventListener("click", e=>{ if (e.target.id === "guia") cierraGuia(); });
addEventListener("keydown", e=>{ if (!$("#guia").classList.contains("open")) return; if (e.key==="Escape") cierraGuia(); else if (e.key==="ArrowRight") $("#guiaSig").click(); else if (e.key==="ArrowLeft") $("#guiaAtras").click(); });
$("#fGuia").addEventListener("click", ()=>{ $("#sheetWrap").classList.remove("open"); if (history.state && history.state.sheet) atras(); abreGuia(0, document.querySelector('.side-btn[data-side="filtros"]') || $("#appbar")); });
// Primera visita: solo a quien no ha usado la app antes (quien ya la usaba tiene algo guardado)
(() => {
  // Versión 2 de la guía: sale una vez a todos, también a quien ya la usaba
  if (store.get("guiaVista", 0) >= GUIA_V) return;
  let antes = false; try { for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && k.startsWith("psg:") && !/^psg:(recarga-|tema$|guiaVista$)/.test(k)) { antes = true; break; } } } catch(e){}
  if (/[?&]noguia\b/.test(location.search)) { store.set("guiaVista", GUIA_V); return; }
  // iPhone: la app recién instalada no comparte datos con Safari, donde ya vio la guía: novedad (si la hay) y la pantalla final
  setTimeout(()=>abreGuia(esIOS() && instalada() && !antes ? PASOS.length-1 : 0), 600);
})();
if (/[?&]guia\b/.test(location.search)) setTimeout(()=>abreGuia(), 700);
aplicaLetra();
// Abre la sección que diga el enlace (al cargar, o si se cambia a mano en la barra de direcciones)
const vistaHash = (alCargar) => {
  let h = location.hash.slice(1); try { h = decodeURIComponent(h); } catch(e){}
  // Enlace directo a un perfil de Redes (desde Atalaya): #redes/ig/usuario
  if (h.startsWith("redes/")){ st.rsAbrir = h.slice(6); st.redRed = "todas"; st.redGrupo = "todos"; h = "redes";
    if (st.sub && st.sub.t==="redes"){ st.redesPinta = true; render(); fijaHash(); return; } }
  const sub = h.startsWith("pueblo/") ? {t:"pueblo", name:h.slice(7)} : SUBS.includes(h) ? {t:h} : null;
  if (sub){
    if (st.sub && st.sub.t===sub.t && st.sub.name===sub.name) return;
    // Al cargar, debajo queda la portada: «Volver» lleva a Noticias en vez de salir de la app
    if (alCargar === true) history.replaceState(null, "", "#" + st.view);
    abrirSub(sub, alCargar !== true && history.state && history.state.sub);
    return;
  }
  if (VISTAS.includes(h) && (st.view !== h || st.sub)){ cierraTodo(); setView(h); }
};
vistaHash(true); hashListo = true; fijaHash(); addEventListener("hashchange", vistaHash);
confPush().then(c=>{ if (c && c.url) render(true); });
render();
load();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
setInterval(poll, REFRESH_MS);
// Versión de la app: si en el servidor hay una más nueva, se recarga sola (en el iPhone la app instalada no lo hace por sí misma)
const VERSION_APP = "prensa-segovia-v118";
async function compruebaVersion(){
  try {
    const t = await (await fetch("sw.js?t="+Date.now(), {cache:"no-store"})).text();
    const v = (t.match(/CACHE = "([^"]+)"/)||[])[1];
    // Se reintenta como mucho cada 2 minutos (por si el servidor aún da la página vieja) y se pide con ?v= para saltarse copias guardadas
    const ult = +(localStorage.getItem("psg:recarga-"+v) || 0);
    if (v && v !== VERSION_APP && Date.now() - ult > 120000 && !$("#sheetWrap").classList.contains("open") && !$("#guia").classList.contains("open")){
      localStorage.setItem("psg:recarga-"+v, String(Date.now()));
      const reg = await navigator.serviceWorker?.getRegistration().catch(()=>null); if (reg) await reg.update().catch(()=>{});
      location.replace(location.pathname + "?v=" + encodeURIComponent(v) + location.hash);
    }
  } catch(e){}
}
setTimeout(compruebaVersion, 4000);
setInterval(compruebaVersion, 30*60*1000);
fijaCortePer();
document.addEventListener("visibilitychange", ()=>{ if (document.visibilityState==="hidden"){ ocultoDesde = Date.now(); return; } if (ocultoDesde && Date.now()-ocultoDesde > 10*6e4){ fijaCortePer(); if (st.view==="periodicos" && !st.sub) render(true); } if (document.visibilityState==="visible"){ poll(); compruebaVersion(); if (st.letra==="auto") aplicaLetra(); } });

/* Enlace «Leer completo» en las noticias de medios de pago: el texto se abre con un lector, sin muro */
(function(){
  document.head.insertAdjacentHTML('beforeend','<style>.leer-completo{display:inline-block;margin-top:8px;padding:4px 10px;border:1px solid currentColor;border-radius:999px;font-size:.78rem;text-decoration:none;opacity:.75;color:inherit}.leer-completo:hover{opacity:1}</style>');
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a.leer-completo');
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    window.open(a.href, '_blank', 'noopener');
  }, true);
  const poner = raiz => {
    const cards = raiz.matches && raiz.matches('article.card[data-href]') ? [raiz] : (raiz.querySelectorAll ? [...raiz.querySelectorAll('article.card[data-href]')] : []);
    for (const c of cards){
      if (c.dataset.chip) continue;
      c.dataset.chip = '1';
      if (!c.querySelector('.pay')) continue;
      const h4 = c.querySelector('h4'); if (!h4) continue;
      h4.insertAdjacentHTML('afterend', `<a class="leer-completo" href="https://r.jina.ai/${c.dataset.href}" target="_blank" rel="noopener">Leer completo</a>`);
    }
  };
  poner(document);
  new MutationObserver(l => l.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && poner(n))))
    .observe(document.body, { childList:true, subtree:true });
})();
