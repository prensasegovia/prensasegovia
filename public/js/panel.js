/* ================= Panel derecho (ordenador) ================= */
const esPC = () => matchMedia("(min-width:1024px)").matches;
const conPanel = () => false; // en ordenador la tarjeta abre la noticia directamente (sin panel lateral)
function panelDetalle(n){
  const medios = mediosDe(n);
  const libre = medios.find(m=>!m.pago) || medios[0];
  const cats = n._cats.filter(c=>CAT[c]).map(c=>`<span class="cat">${ICON(CAT[c].d)}${esc(CAT[c].n)}</span>`).join("");
  const lugar = n.municipio && n.municipio!=="General" ? n.municipio : "Provincia";
  const fav = !!st.favs[n._key];
  const ext = extractoDe(n);
  const ev = n._anulada ? `<div class="dt-ev"><span><b>Cancelado.</b> ${esc(n._anulada)}</span></div>` : n.fecha_evento ? `<div class="dt-ev">${I.cal.replace('<svg','<svg width="16" height="16"')}<span><b>${esc(fmtCorto(n.fecha_evento))}${n.hora_evento?", a las "+esc(n.hora_evento):""}</b>${n.fecha_evento<today()?" (ya pasó)":""}</span></div>` : "";
  return `<div class="abox detalle ${n.relevancia==="alta"?"alta":""}">
    <div class="dt-top"><button class="dt-x" data-dt="cerrar" type="button" aria-label="Cerrar">×</button>
      <span class="dt-meta"><button class="pill" data-pueblo="${esc(lugar==="Provincia"?"":lugar)}" type="button" ${lugar==="Provincia"?"disabled":""}>${esc(lugar)}</button>${n.relevancia==="alta"?'<span class="pill lvl-alta">Importante</span>':""}<span class="time">${esc(cuando(n._dia, n.hora))}</span></span></div>
    ${fotoValida(n.img)?`<img class="dt-img" src="${esc(n.img)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:""}
    <h3 class="dt-t">${hl(n.titulo)}</h3>
    ${cats?`<div class="dt-cats">${cats}</div>`:""}
    ${ev}
    ${n.resumen?`<p class="dt-r">${hl(n.resumen)}</p>`:""}
    ${ext?`<div class="pista"><b>En la noticia:</b> ${hl(ext)}</div>`:""}
    <div class="dt-acts">
      ${libre?`<a class="btn" href="${esc(libre.url)}" target="_blank" rel="noopener">Leer en ${esc(libre.nombre)} ${I.ext}</a>`:""}
      <button class="btn ghost" data-dt="fav" type="button" aria-pressed="${fav}">${fav?"Guardada ✓":"Guardar"}</button>
      <button class="btn ghost" data-dt="share" type="button">Compartir</button>
    </div>
    ${medios.length>1?`<div class="dt-med"><b>La cuentan ${medios.length} medios</b>${medios.map(m=>`<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.nombre)}${m.pago?' <span class="pay-s">Suscriptores</span>':""}${I.ext}</a>`).join("")}</div>`:""}
    <div class="dt-hint">Pulsa otra noticia para verla aquí, o Esc para cerrar.</div>
  </div>`;
}
// Ordenador, sección Periódicos: la columna derecha es la lista de periódicos (filtro), con lo que te queda por ver de cada uno
function asidePeriodicos(){
  const all = periodicosNews().filter(perPasa);
  const fila = (m, nom) => { const l = all.filter(n=>m==="todos"||n.medio===m), k = 0;
    return `<button class="aper ${st.periodico===m?"on":""}" data-per="${esc(m)}" type="button"><span class="an">${esc(nom)}</span>${k?`<span class="badge pnb" data-pn="${esc(m)}">${k}</span>`:`<span class="badge pnb" data-pn="${esc(m)}" hidden></span>`}<span class="ac">${l.length}</span></button>`; };
  return `<div class="abox aperbox"><h3>Periódicos <button data-act="perElegir" type="button">${st.perPanel?"Cerrar":"Elegir"}</button></h3>
    ${fila("todos","Todos")}${perTodos().filter(perVisible).map(m=>fila(m,m)).join("")}
    ${perSel()?`<p class="aperh">Ves ${perSel().length} de ${perTodos().length}. <button data-act="perTodos" type="button">Ver todos</button></p>`:""}</div>
    ${perDias().length>1?`<div class="abox aperbox"><h3>Día</h3>${["todos",...perDias()].map(d=>{ const k = periodicosNews().filter(n=>!(st.sinCapital && isCapital(n)) && (st.periodico==="todos"||n.medio===st.periodico) && (d==="todos"||n._dia===d)).length;
      return `<button class="aper ${(st.perDia||"todos")===d?"on":""}" data-dia="${d}" type="button"><span class="an">${d==="todos"?"Todos los días":esc(nomDia(d))}</span><span class="ac">${k}</span></button>`; }).join("")}</div>`:""}`;
}
function renderAside(news){
  const el = $("#aside"); if (!el) return;
  if (!conPanel() || !st.loaded){ el.innerHTML = ""; return; }
  if (st.detalle && tarjetas.has(st.detalle)){ el.innerHTML = panelDetalle(tarjetas.get(st.detalle)); return; }
  if (st.view==="periodicos" && !st.sub){ el.innerHTML = ""; return; }
  const t = today();
  const base = news.filter(pasa);
  const ag = agendaDe(news).ev.slice(0,7);
  const imp = base.filter(n=>enRango(n) && n.relevancia==="alta").sort(porHora).slice(0,5);
  const cnt = {}; for (const n of base.filter(n=>enRango(n) && esPueblo(n.municipio))) cnt[n.municipio]=(cnt[n.municipio]||0)+1;
  const pue = Object.entries(cnt).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"es")).slice(0,8);
  const enlace = n => esc((mediosDe(n)[0]||{}).url||"#");
  const lugar = n => n.municipio && n.municipio!=="General" ? n.municipio : "Provincia";
  let h = `<div class="abox"><h3>Próximo en agenda <button data-act="agenda" type="button">Ver todo</button></h3>`;
  h += ag.length ? ag.map(n=>{ const d=D(n.fecha_evento); return `<a class="arow" href="${enlace(n)}" target="_blank" rel="noopener" data-k="${esc(n._key)}"><span class="ad ${n.fecha_evento===t?"hoy":""}"><b>${d.getDate()}</b><span>${esc(d.toLocaleDateString("es-ES",{month:"short"}).replace(".",""))}</span></span><span><div class="at">${esc(n.titulo)}</div><div class="am">${esc(lugar(n))}${n.hora_evento?" · "+esc(n.hora_evento)+" h":""}</div></span></a>`; }).join("") : `<div class="aempty">Sin convocatorias con fecha.</div>`;
  h += `</div><div class="abox"><h3>Importante <button data-act="imp" type="button">Ver todo</button></h3>`;
  h += imp.length ? imp.map(n=>`<a class="arow" href="${enlace(n)}" target="_blank" rel="noopener" data-k="${esc(n._key)}"><span class="adot"></span><span><div class="at">${esc(n.titulo)}</div><div class="am">${esc(lugar(n))} · ${esc(cuando(n._dia,n.hora))}</div></span></a>`).join("") : `<div class="aempty">Nada grave en los últimos ${st.rango} días.</div>`;
  h += `</div><div class="abox"><h3>Pueblos con noticias <button data-act="pueblos" type="button">Ver todos</button></h3>`;
  h += pue.length ? pue.map(([k,v])=>`<button class="prow" data-pueblo="${esc(k)}" type="button"><span>${esc(k)}</span><b>${v}</b></button>`).join("") : `<div class="aempty">Sin noticias de pueblos.</div>`;
  h += `</div>`;
  el.innerHTML = h;
  const f = $("#sideFoot");
  if (f){ const ok = st.fuentes.filter(x=>x.ok).length; f.innerHTML = `${ok} de ${st.fuentes.length} fuentes responden<br><span style="opacity:.8">Atajo: tecla <b>/</b> para buscar</span>`; }
}
$("#aside").addEventListener("click", e=>{
  const dt = e.target.closest("[data-dt]");
  if (dt){
    const n = tarjetas.get(st.detalle); const v = dt.dataset.dt;
    if (v==="cerrar" || !n){ cerrarDetalle(); return; }
    if (v==="fav"){ toggleFav(n._key); render(true); return; }
    if (v==="share"){ const m = mediosDe(n).find(m=>!m.pago) || mediosDe(n)[0]; compartir({ querySelector:()=>({textContent:n.titulo}), dataset:{ href: m ? m.url : "" } }); return; }
  }
  const a = e.target.closest("a[data-k]"); if (a){ marcarAbierta(a.dataset.k); return; }
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.per){ st.periodico = b.dataset.per; render(true); window.scrollTo({top:0, behavior:"smooth"}); return; }
  if (b.dataset.dia){ st.perDia = b.dataset.dia; render(true); window.scrollTo({top:0, behavior:"smooth"}); return; }
  if (b.dataset.act==="perElegir"){ st.perPanel = !st.perPanel; render(true); window.scrollTo({top:0, behavior:"smooth"}); return; }
  if (b.dataset.act==="perTodos"){ store.set("perSel", null); render(true); actualizaPer(); return; }
  if (b.dataset.pueblo) abrirSub({t:"pueblo", name:b.dataset.pueblo});
  else if (b.dataset.act==="agenda") setView("agenda");
  else if (b.dataset.act==="pueblos") setView("pueblos");
  else if (b.dataset.act==="imp") abrirSub({t:"imp"});
});
document.querySelector(".side-extra").addEventListener("click", e=>{
  const b = e.target.closest("[data-side]"); if (!b) return; b.blur();
  const v = b.dataset.side;
  if (v==="filtros") openSheet(); else if (v==="avisos") abreAvisos(!push.on); else abrirSub({t:v});
});
function cerrarDetalle(){ st.detalle = null; document.querySelectorAll(".card.sel").forEach(c=>c.classList.remove("sel")); renderAside(allNews()); }
let rT; addEventListener("resize", ()=>{ clearTimeout(rT); rT=setTimeout(()=>{ document.body.classList.toggle("ancho", esPC()); if (!conPanel() && st.detalle){ st.detalle=null; document.querySelectorAll(".card.sel").forEach(c=>c.classList.remove("sel")); } if (st.loaded) renderAside(allNews()); }, 150); });
// Atajo de teclado: "/" para buscar
document.addEventListener("keydown", e=>{
  if (e.key==="/" && !/input|textarea/i.test(document.activeElement.tagName) && !$("#sheetWrap").classList.contains("open")){ e.preventDefault(); if (esPC()) $("#q").focus(); else toggleSearch(true); }
  else if (e.key==="Escape" && st.detalle && !$("#sheetWrap").classList.contains("open") && !/input|textarea/i.test(document.activeElement.tagName)) cerrarDetalle();
  else if (e.key==="Escape" && st.sub && !$("#sheetWrap").classList.contains("open") && !/input|textarea/i.test(document.activeElement.tagName)) cerrarSub();
});

/* Búsqueda */
function toggleSearch(on, sinRender, desdeHistorial){
  const bar = $("#searchbar"); const show = on ?? bar.hidden;
  const estaba = !bar.hidden;
  bar.hidden = !show; document.body.classList.toggle("searching", show);
  if (show){
    if (st.sub || st.view!=="noticias"){ cierraTodo(); st.detalle=null; st.view="noticias"; document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected", t.dataset.view==="noticias")); render(); window.scrollTo({top:0}); } else appbar();
    if (!esPC() && !estaba) history.pushState({search:true}, "");
    $("#q").focus();
  } else {
    st.q=""; $("#q").value=""; if (!sinRender) render();
    if (!esPC() && estaba && !desdeHistorial && history.state && history.state.search) atras();
  }
}
let qT; $("#q").addEventListener("input", e=>{ clearTimeout(qT); qT=setTimeout(()=>{
  const v = e.target.value.trim();
  if (v && (st.view!=="noticias" || st.sub)){ if (st.sub && history.state && history.state.sub){ st.sub=null; history.back(); } st.sub=null; st.view="noticias"; document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected", t.dataset.view==="noticias")); }
  document.body.classList.toggle("searching", !!v || !$("#searchbar").hidden);
  st.q=v; render(); window.scrollTo({top:0});
},200); });
$("#q").addEventListener("keydown", e=>{ if (e.key==="Enter") e.target.blur(); if (e.key==="Escape") toggleSearch(false); });
$("#qClear").addEventListener("click", ()=>{ toggleSearch(false); if (esPC()) $("#q").blur(); });

/* Hoja de filtros */
/* Tamaño de letra: en el iPhone el tamaño de texto del sistema no llega a las webs, así que se lee aquí y se aplica */
function escalaMovil(){
  if (!/iPhone|iPad|iPod/.test(navigator.userAgent) && !(navigator.platform==="MacIntel" && navigator.maxTouchPoints>1)) return 1; // Android ya agranda la letra por su cuenta
  const d = document.createElement("span"); d.style.cssText = "font:-apple-system-body;position:absolute;visibility:hidden"; d.textContent = "x"; if (!d.style.font) return 1; document.body.appendChild(d);
  const px = parseFloat(getComputedStyle(d).fontSize) || 17; d.remove();
  return Math.min(1.6, Math.max(0.9, px / 17)); // 17 px es el tamaño normal del iPhone
}
let letraBase = null;
function aplicaLetra(){
  const k = st.letra==="auto" ? escalaMovil() : (+st.letra || 1);
  const reglas = []; for (const sh of document.styleSheets){ let rs; try { rs = sh.cssRules; } catch(e){ continue; } const walk = l => { for (const r of l){ if (r.cssRules) walk(r.cssRules); if (r.style && r.style.fontSize && /px/.test(r.style.fontSize)) reglas.push(r); } }; walk(rs); }
  if (!letraBase) letraBase = new Map(reglas.map(r=>[r, r.style.fontSize]));
  for (const [r, base] of letraBase) r.style.fontSize = Math.abs(k-1) < 0.02 ? base : base.replace(/(\d+(?:\.\d+)?)px/g, (m,n)=>(+n*k).toFixed(2)+"px");
  document.documentElement.classList.toggle("letra-grande", k > 1.05);
}
function aplicaTema(){
  const r = document.documentElement;
  if (st.tema==="light"||st.tema==="dark") r.dataset.theme = st.tema; else delete r.dataset.theme;
  const oscuro = st.tema==="dark" || (st.tema==="auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]').content = oscuro ? "#123029" : "#1E4A3F";
}
aplicaTema();
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", aplicaTema);
function syncSheet(){
  document.querySelectorAll("#segTema button").forEach(x=>x.setAttribute("aria-pressed", x.dataset.v===st.tema));
  document.querySelectorAll("#segLetra button").forEach(x=>x.setAttribute("aria-pressed", x.dataset.v===st.letra));
  document.querySelectorAll("#segRango button").forEach(x=>x.setAttribute("aria-pressed", x.dataset.v===st.rango));
  $("#fCompacta").checked = st.compacta; pintaPush(); $("#fKw").checked = st.soloKw;
  $("#kws").innerHTML = st.kws.map((k,i)=>`<span class="kw">${esc(k)}<button data-i="${i}" type="button" aria-label="Quitar ${esc(k)}">×</button></span>`).join("") || `<span class="h">Las palabras que añadas se resaltan en las noticias.</span>`;
}
function openSheet(){ syncSheet(); if (!$("#sheetWrap").classList.contains("open")) history.pushState({sheet:true}, ""); $("#sheetWrap").classList.add("open"); }
function closeSheet(){ if (!$("#sheetWrap").classList.contains("open")) return; $("#sheetWrap").classList.remove("open"); render(true); if (history.state && history.state.sheet) atras(); }
$("#scrim").addEventListener("click", closeSheet);
$("#fClose").addEventListener("click", closeSheet);
$("#fX").addEventListener("click", closeSheet);
$("#fMedios").addEventListener("click", ()=>{ $("#sheetWrap").classList.remove("open"); if (history.state && history.state.sheet) history.replaceState({sub:true}, ""); st.sub = {t:"medios"}; render(); window.scrollTo({top:0}); });
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && $("#sheetWrap").classList.contains("open")) closeSheet(); });
document.addEventListener("change", e=>{
  if (e.target.id==="selPer"){ st.periodico = e.target.value; render(true); actualizaPer(); return; }
  if (e.target.id==="selDia"){ st.perDia = e.target.value; render(true); actualizaPer(); return; }
});
document.addEventListener("change", e=>{ const c = e.target.closest("[data-perm]"); if (!c) return;
  const todos = perTodos(); let sel = perSel() || [...todos];
  sel = c.checked ? [...new Set([...sel, c.dataset.perm])] : sel.filter(m=>m!==c.dataset.perm);
  if (!sel.length){ c.checked = true; aviso("Deja al menos un periódico"); return; }
  store.set("perSel", sel.length===todos.length ? null : sel);
  if (st.periodico!=="todos" && !sel.includes(st.periodico)) st.periodico = "todos";
  const y = window.scrollY; render(true); window.scrollTo({top:y}); actualizaPer();
});
$("#segLetra").addEventListener("click", e=>{ const b=e.target.closest("button"); if(!b) return; st.letra=b.dataset.v; store.set("letra",st.letra); aplicaLetra(); syncSheet(); render(true); });
$("#segTema").addEventListener("click", e=>{ const b=e.target.closest("button"); if(!b) return; st.tema=b.dataset.v; store.set("tema",st.tema); aplicaTema(); syncSheet(); });
$("#segRango").addEventListener("click", e=>{ const b=e.target.closest("button"); if(!b) return; st.rango=b.dataset.v; syncSheet(); render(true); });

const aplicaCompacta = () => document.documentElement.classList.toggle("compacta", !!st.compacta);
aplicaCompacta();
$("#fCompacta").addEventListener("change", e=>{ st.compacta=e.target.checked; store.set("compacta", st.compacta); aplicaCompacta(); });
