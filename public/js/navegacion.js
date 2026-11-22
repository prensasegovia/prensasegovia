/* ================= Navegación ================= */
let scrollPrevio = 0;
// Cada sección tiene su enlace (#noticias, #agenda, #pueblo/Cuéllar…): al recargar se queda donde estaba
const VISTAS = ["noticias","agenda","pueblos","periodicos","guardadas"];
const SUBS = ["parte","medios","imp","elec"];
const NOMBRE_SECCION = {noticias:"Noticias", agenda:"la Agenda", pueblos:"Pueblos", periodicos:"Periódicos", guardadas:"Guardadas",
  parte:"el Parte del día", medios:"Medios y fuentes", imp:"Importantes", elec:"Elecciones", pueblo:"este pueblo"};
function hashActual(){
  const s = st.sub;
  if (!s) return "#" + st.view;
  return "#" + (s.t==="pueblo" ? "pueblo/" + encodeURIComponent(s.name) : s.t);
}
let hashListo = false; // hasta leer el enlace con el que se abrió la app, no se toca
function fijaHash(){ if (!hashListo) return; const h = hashActual(); if (location.hash !== h) try { history.replaceState(history.state, "", h); } catch(e){} }
function setView(v){
  st.view = v; st.sub = null; st.pila = []; st.detalle = null;
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected", t.dataset.view===v));
  render(); window.scrollTo({top:0});
}
let saltarPop = 0; // pasos atrás provocados por la propia app (no por el usuario)
function atras(n=1){ if (n>0){ saltarPop++; history.go(-n); } }
function abrirSub(sub, sinHistorial){
  scrollPrevio = window.scrollY;
  if (!$("#searchbar").hidden && !esPC()) toggleSearch(false, true);
  st.detalle = null;
  if (st.sub){ st.pila = [...(st.pila||[]), st.sub]; }
  // Primero el paso en el historial y después se pinta: así el enlace nuevo queda en este paso y «atrás» vuelve al anterior
  if (!sinHistorial) history.pushState({sub:true}, "");
  st.sub = sub; render(); window.scrollTo({top:0});
}
function cerrarSub(desdeHistorial){
  if (!st.sub) return;
  st.sub = (st.pila && st.pila.length) ? st.pila.pop() : null;
  render(); window.scrollTo({top: st.sub ? 0 : scrollPrevio});
  if (!desdeHistorial && history.state && history.state.sub) atras();
}
// Cierra todas las pantallas encima (al ir a una pestaña)
function cierraTodo(){ const n = (st.sub ? 1 : 0) + (st.pila ? st.pila.length : 0); st.sub = null; st.pila = []; if (n && history.state && history.state.sub) atras(n); }
window.addEventListener("popstate", ()=>{
  if (saltarPop){ saltarPop--; fijaHash(); return; }
  if ($("#sheetWrap").classList.contains("open")){ $("#sheetWrap").classList.remove("open"); render(true); return; }
  if (!esPC() && !$("#searchbar").hidden){ toggleSearch(false, false, true); return; }
  if (st.sub) cerrarSub(true);
});
document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click", ()=>{ if (esPC()) t.blur();
  const buscando = !!st.q;
  if (!$("#searchbar").hidden || st.q) toggleSearch(false, true);
  if (!st.sub && st.view===t.dataset.view){ if (buscando) render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  cierraTodo();
  setView(t.dataset.view);
}));

/* ================= Acciones ================= */
function toggleFav(k){
  if (st.favs[k]) delete st.favs[k];
  else { const n = allNews().find(x=>x._key===k) || periodicosNews().find(x=>x._key===k) || tarjetas.get(k) || Object.values(st.favs).find(f=>f.n._key===k)?.n; if (!n) return;
    const { _ts, ...guardar } = n; st.favs[k] = { n: guardar, t: Date.now() }; aviso("Guardada"); }
  store.set("favs", st.favs);
}
async function compartir(c){
  const titulo = c.querySelector("h4")?.textContent.trim() || "Noticia";
  const url = c.dataset.href || location.href;
  try { if (navigator.share){ await navigator.share({ title: titulo, text: titulo, url }); return; } } catch(e){ if (e && e.name==="AbortError") return; }
  try { await navigator.clipboard.writeText(`${titulo}\n${url}`); aviso("Enlace copiado"); } catch(e){ aviso("No se pudo copiar"); }
}
let avisoT;
function aviso(txt){ const el=$("#aviso"); el.textContent=txt; el.classList.add("show"); clearTimeout(avisoT); avisoT=setTimeout(()=>el.classList.remove("show"),1600); }

$("#app").addEventListener("change", e=>{ if (e.target.id==="parteLinks"){ st.parteLinks=e.target.checked; store.set("parteLinks",st.parteLinks); render(true); } });
$("#app").addEventListener("click", e=>{
  const am = e.target.closest("[data-ambito]"); if (am){ st.ambito = am.dataset.ambito; store.set("ambito", st.ambito); render(); window.scrollTo({top:0}); return; }
  const sp = e.target.closest("#segParte button"); if (sp){ st.parteDesde = sp.dataset.v; render(true); return; }
  const a = e.target.closest("a");
  if (a){ const c = a.closest("[data-k]"); if (c) marcarAbierta(c.dataset.k); return; }
  const card = e.target.closest(".card");
  const b = e.target.closest("button");
  if (b && card){
    const k = card.dataset.k;
    if (b.hasAttribute("data-share")) return compartir(card);
    if (b.hasAttribute("data-fav")){ toggleFav(k); render(true); return; }
    if (b.hasAttribute("data-more")){ st.abiertos.has(k) ? st.abiertos.delete(k) : st.abiertos.add(k); render(true); return; }
  }
  if (b && b.dataset.pueblo){ abrirSub({t:"pueblo", name:b.dataset.pueblo}); return; }
  if (!b){
    if (card && conPanel() && tarjetas.has(card.dataset.k)){ // ordenador: se amplía en el panel de la derecha
      marcarAbierta(card.dataset.k);
      st.detalle = st.detalle===card.dataset.k ? null : card.dataset.k;
      document.querySelectorAll(".card.sel").forEach(c=>c.classList.remove("sel"));
      if (st.detalle) card.classList.add("sel");
      renderAside(allNews()); $("#aside").scrollTop = 0; return;
    }
    if (card && card.dataset.href){ marcarAbierta(card.dataset.k); window.open(card.dataset.href, "_blank", "noopener"); }
    return;
  }
  const act = b.dataset.act;
  if (b.dataset.per){ st.periodico = b.dataset.per; aplicaFiltro(); return; }
  if (b.dataset.dia){ st.perDia = b.dataset.dia; aplicaFiltro(); return; }
  if (b.dataset.cat !== undefined){ const k=b.dataset.cat; st.cat = (!k || st.cat===k) ? null : k; aplicaFiltro(); }
  else if (act==="filtros"){ openSheet(); try{ pintaPushPer(); }catch(e){} }
  else if (act==="capSet"){ const v = b.dataset.v==="1"; if (st.sinCapital!==v){ st.sinCapital=v; saveF(); aplicaFiltro(); sincronizaCapPush(); } }
  else if (act==="capital"){ st.sinCapital=!st.sinCapital; saveF(); aplicaFiltro(); sincronizaCapPush(); }
  else if (act==="limpiar"){ st.soloKw=false; st.cat=null; saveF(); aplicaFiltro(); }
  else if (act==="avisosSi"){ abreAvisos(true); }
  else if (act==="avisosNo"){ store.set("avisosNo", true); render(true); aviso("Puedes activarlos cuando quieras con la campana de arriba"); }
  else if (act==="rangoSet"){ st.rango = b.dataset.v; saveF(); aplicaFiltro(); }
  else if (act==="perVerTodo"){ st.periodico="todos"; st.perDia="todos"; render(true); actualizaPer(); }
  else if (act==="perElegir"){ st.perPanel = !st.perPanel; render(true); }
  else if (act==="perListo"){ st.perPanel = false; render(true); actualizaPer(); }
  else if (act==="perTodos"){ store.set("perSel", null); render(true); actualizaPer(); }
  else if (act==="leidoPer"){ marcarVisto(periodicosNews().filter(n=>(st.periodico==="todos"||n.medio===st.periodico) && !(st.sinCapital && isCapital(n))).map(n=>n._key)); render(); actualizaPer(); }
  else if (act==="leido"){ marcarVisto(allNews().map(n=>n._key)); st.sesionNuevas = new Set(); render(); window.scrollTo({top:0,behavior:"smooth"}); }
  else if (act==="imp") abrirSub({t:"imp"});
  else if (act==="elec"){ store.set("elecVisto", 1); abrirSub({t:"elec"}); }
  else if (act==="parte") abrirSub({t:"parte"});
  else if (act==="parteCopiar"){ const x = $("#parteRaw").value; navigator.clipboard.writeText(x).then(()=>aviso("Parte copiado"),()=>aviso("No se pudo copiar")); }
  else if (act==="parteEnviar"){ const x = $("#parteRaw").value; if (esPC()) window.open("https://web.whatsapp.com/send?text="+encodeURIComponent(x), "_blank", "noopener"); else if (navigator.share) navigator.share({ text: x }).catch(()=>{}); else navigator.clipboard.writeText(x).then(()=>aviso("Parte copiado")); }
  else if (act==="medios") abrirSub({t:"medios"});
  else if (act==="agenda") setView("agenda");
  else if (act==="pueblos") setView("pueblos");
  else if (act==="reload") load(true);
  else if (act==="buscapueblo"){ const q = b.dataset.q || st.townQ || ""; if (!q) return; st.ambito="todo"; store.set("ambito","todo"); if (esPC()){ cierraTodo(); st.view="noticias"; } else toggleSearch(true); $("#q").value=q; st.q=q; document.body.classList.add("searching"); render(); window.scrollTo({top:0}); }
  else if (act==="archivo"){ arc.estado = "no"; cargaArchivo(); }
  else if (act==="hemeroteca"){ if (hem.estado!=="ok") { hem.estado="no"; cargaHemeroteca(); } }
  else if (act==="hemeroteca-mas"){ cargaHemeroteca(true); }
});

// Al cambiar un filtro: se redibuja y, si estabas más abajo, la lista empieza justo bajo la barra de temas
function aplicaFiltro(){
  const ch0 = $("#chips"); const pegada = ch0 && ch0.classList.contains("stuck");
  render(true);
  const ch = $("#chips");
  // Periódicos: al cambiar el filtro, se vuelve al principio de la lista (lo más reciente)
  if (st.view==="periodicos" && !st.sub){ const ph = $(".pernota"); if (ph){ const ch2 = $("#chips"); const pega = ch2 && getComputedStyle(ch2).position==="sticky" ? ch2.offsetHeight : 0; const y = ph.getBoundingClientRect().top + window.scrollY - $("#appbar").offsetHeight - pega - 8; if (window.scrollY > y) window.scrollTo({top:Math.max(0,y), behavior:"smooth"}); } return; }
  if (ch && pegada){ const sent = ch.previousElementSibling; const y = (sent ? sent.getBoundingClientRect().top : ch.getBoundingClientRect().top) + window.scrollY - $("#appbar").offsetHeight; window.scrollTo({top:Math.max(0,y)}); }
}


