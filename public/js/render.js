/* ================= Render ================= */
function appbar(){
  const bar = $("#appbar");
  if (st.sub){
    const titulo = st.sub.t==="pueblo" ? "Pueblo" : st.sub.t==="imp" ? "Importantes" : st.sub.t==="elec" ? "Elecciones 29N" : st.sub.t==="parte" ? "Parte del día" : st.sub.t==="redes" ? "Zona privada" : "Medios";
    bar.innerHTML = `<button class="ibtn back" id="btnBack" type="button" aria-label="Volver">${I.back}Volver</button><div class="brand"><div class="t" style="font-size:16px;opacity:.85">${esc(titulo)}</div></div><div class="syncpill" id="syncPill" title="Las noticias se revisan cada 10 minutos de lunes a viernes de 8 a 15 h, y cada hora el resto"></div>`;
    syncLabel();
    $("#btnBack").onclick = () => cerrarSub();
    return;
  }
  bar.innerHTML = `<div class="brand"><img class="ico-movil" src="brand.png" alt=""><img class="logo" src="logo-aguila.png?v=2" alt="G.I.C. Segovia"><div><div class="t">Prensa Segovia</div><small id="syncTxt"></small></div></div>
    <div class="syncpill" id="syncPill" title="Las noticias se revisan cada 10 minutos de lunes a viernes de 8 a 15 h, y cada hora el resto"></div>
    <button class="ibtn" id="btnSearch" type="button" aria-label="Buscar" aria-pressed="${!$("#searchbar").hidden}">${I.search}</button>
    ${!push.on && avisosListos() ? `<button class="ibtn bellbtn" id="btnBell" type="button" aria-label="Activar avisos" title="Activar avisos en este móvil">${I.bell}${store.get("avisosNo",false)?"":`<span class="bdot"></span>`}</button>` : ""}
    ${esPC()?`<button class="ibtn partebar" id="btnParte" type="button" aria-label="Parte del día"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/></svg>Parte del día</button>`:""}
    <button class="ibtn" id="btnReload" type="button" aria-label="Actualizar">${I.reload}</button>`;
  $("#btnSearch").onclick = () => toggleSearch();
  if ($("#btnBell")) $("#btnBell").onclick = () => abreAvisos(true);
  if ($("#btnParte")) $("#btnParte").onclick = () => abrirSub({t:"parte"});
  $("#btnReload").onclick = () => load(true);
  syncLabel();
}
// Si la actualización automática lleva tiempo sin funcionar, se avisa claramente
function horasDesdeActualizacion(){
  const m = (st.actualizado||"").match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  return m ? (Date.now()-madridMs(m[1],m[2],m[3]))/36e5 : 0;
}
function avisoViejo(){
  const h = horasDesdeActualizacion();
  if (h < 2.5) return "";
  const t = h < 48 ? `${Math.floor(h)} horas` : `${Math.floor(h/24)} días`;
  return `<div class="viejo-w"><div class="viejo"><b>Sin actualizar desde hace ${t}</b> (última revisión: ${esc(fmtCorto(st.actualizado.slice(0,10)))}, ${esc(st.actualizado.slice(11,16))}). Puede faltar lo más reciente.</div></div>`;
}
function syncLabel(){
  const tx = $("#syncTxt") || {}; const pl0 = $("#syncPill");
  if (!$("#syncTxt") && !pl0) return;
  if (!st.actualizado){ tx.textContent = st.loaded ? (st.error?"Sin conexión":"Sin datos") : "Cargando…"; if (pl0) pl0.textContent = tx.textContent; return; }
  const m = st.actualizado.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  if (!m){ tx.textContent = "Actualizado"; return; }
  const min = Math.max(0, Math.round((Date.now()-madridMs(m[1],m[2],m[3]))/6e4));
  const dia = m[1]===today() ? "hoy" : m[1]===addDays(today(),-1) ? "ayer" : fmtCorto(m[1]).toLowerCase();
  const hace = min < 2 ? "ahora mismo" : min < 60 ? `hace ${min} min` : min < 1440 ? `hace ${Math.floor(min/60)} h` : "";
  tx.innerHTML = `<span class="sy-l">Actualizado </span>${dia}, ${m[2]}:${m[3]}${hace?` · ${hace}`:""}`;
  const pl = $("#syncPill"); if (pl){ pl.classList.toggle("stale", min > 150); pl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>Actualizado <b>${dia} a las ${m[2]}:${m[3]}</b>${hace?` · ${hace}`:""}</span>`; }
}
setInterval(syncLabel, 60000);

let chipObs;
function render(keepScroll){
  if (st.view !== "periodicos" || st.sub) enPer = false;
  document.body.classList.toggle("v-periodicos", st.view==="periodicos" && !st.sub);
  // Ordenador: en Noticias y Periódicos el menú se recoge y las noticias ocupan todo el ancho en mosaico
  document.body.classList.toggle("ancho", esPC());
  seguro("la barra superior", appbar);
  const app = $("#app"); const y = window.scrollY; const chipsX = $("#chips")?.scrollLeft || 0;
  if (!st.loaded){ app.innerHTML = `<section class="hero"><div class="day">${esc(fmtLong(today()))}</div><div class="sum">Cargando noticias…</div></section><div class="feed" style="padding-top:14px">${'<div class="skel"></div>'.repeat(4)}</div>`; return; }
  const news = allNews();
  if (!news.length && !st.sub && st.view!=="guardadas"){
    app.innerHTML = `<section class="hero"><div class="day">${esc(fmtLong(today()))}</div><div class="sum">${st.error?"No se han podido cargar las noticias.":"Todavía no hay noticias cargadas."}</div></section><div class="empty"><b>${st.error?"Revisa la conexión":"La primera carga llega pronto"}</b>${st.error?"Vuelve a intentarlo en unos segundos.":"La app se actualiza sola cada hora."}<br><button class="btn" data-act="reload" type="button">Volver a cargar</button></div>`;
    return;
  }
  // Redes: no se repinta sola (recargaría los incrustados de cada perfil); solo cuando cambia algo de la propia zona
  if (st.sub && st.sub.t==="redes" && !st.redesPinta && app.querySelector(".rz-deck")){ /* se conserva lo que hay */ }
  else if (st.sub) app.innerHTML = seguro("el aviso de actualización", avisoViejo, "") + seguro(NOMBRE_SECCION[st.sub.t] || "esta sección", () => st.sub.t==="pueblo" ? viewPueblo(news, st.sub.name) : st.sub.t==="imp" ? viewImportantes(news) : st.sub.t==="elec" ? viewElecciones(news) : st.sub.t==="parte" ? viewParte(news) : st.sub.t==="redes" ? viewRedes() : viewMedios(), cajaFallo);
  else app.innerHTML = seguro("el aviso de actualización", avisoViejo, "") + seguro(NOMBRE_SECCION[st.view] || "esta sección", () => st.view==="agenda" ? viewAgenda(news) : st.view==="pueblos" ? viewPueblos(news) : st.view==="guardadas" ? viewGuardadas() : st.view==="periodicos" ? viewPeriodicos() : viewNoticias(news), cajaFallo);
  fijaHash();
  st.redesPinta = false; if (st.sub && st.sub.t==="redes") setTimeout(() => seguro("Redes", redesObserva), 0);
  const t = today();
  seguro("los contadores del menú", () => {
    const nAg = (({ev,sinFecha})=>ev.length+sinFecha.length)(agendaDe(news));
    const b = $("#agBadge"); b.hidden = !nAg; b.textContent = nAg; actualizaPer();
  });
  const nf = Object.keys(st.favs).length; const fb = $("#favBadge"); fb.hidden = !nf; fb.textContent = nf;
  if (keepScroll) window.scrollTo(0,y);
  if (chipObs) chipObs.disconnect();
  const ch = $("#chips");
  if (ch){
    // La barra de temas conserva su posición y el tema elegido siempre queda a la vista
    ch.scrollLeft = chipsX;
    const sel = ch.querySelector('[data-cat][aria-pressed="true"]:not([data-cat=""])');
    if (sel && (sel.offsetLeft < ch.scrollLeft || sel.offsetLeft + sel.offsetWidth > ch.scrollLeft + ch.clientWidth)) ch.scrollLeft = sel.offsetLeft - 16;
    const sent = document.createElement("div"); ch.before(sent);
    chipObs = new IntersectionObserver(([e])=>ch.classList.toggle("stuck", !e.isIntersecting && e.boundingClientRect.top < 200), {rootMargin:`-${$("#appbar").offsetHeight+2}px 0px 0px 0px`}); chipObs.observe(sent); }
  seguro("las noticias vistas", observarVistos);
  seguro("el panel derecho", () => renderAside(news));
  seguro("el título", () => actualizaTitulo(news));
  const tq = $("#townQ");
  if (tq) tq.addEventListener("input", e=>{ st.townQ=e.target.value; const pos=e.target.selectionStart; render(true); const n=$("#townQ"); n.focus(); n.setSelectionRange(pos,pos); });
}

/* Una noticia cuenta como vista al estar un segundo en pantalla o al abrirla */
let vistoObs; const timers = new Map();
function observarVistos(){
  if (vistoObs) vistoObs.disconnect();
  if (!("IntersectionObserver" in window)) return;
  vistoObs = new IntersectionObserver(entries=>{
    for (const e of entries){
      const el = e.target, k = el.dataset.k;
      if (e.isIntersecting){
        if (!timers.has(el)) timers.set(el, setTimeout(()=>{ marcarVisto([k]); document.querySelectorAll(`.card[data-k="${CSS.escape(k)}"]`).forEach(c=>c.classList.remove("unseen")); vistoObs.unobserve(el); actualizaTitulo(); timers.delete(el); }, 1000));
      } else if (timers.has(el)){ clearTimeout(timers.get(el)); timers.delete(el); }
    }
  }, {threshold:0.6});
  document.querySelectorAll(".card.unseen").forEach(c=>vistoObs.observe(c));
}

