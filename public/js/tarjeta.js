/* ================= Tarjeta ================= */
function mediosDe(n){
  const vistos = new Set();
  return (n.medios||[]).filter(m=>{ const k=norm(String(m.nombre).replace(/[.\s]+$/,"").replace(/^el\s+/i,"")); const u=String(m.url||""); if(!safeUrl(u)||vistos.has(k)||vistos.has(u)) return false; vistos.add(k); vistos.add(u); return true; });
}
// Frase del cuerpo que explica por qué interesa (si no lo dice ya el titular o la entradilla)
function extractoDe(n){
  const a = n.analisis; if (!a) return "";
  const f = (n.fecha_evento && a.evento && a.evento.fecha_evento===n.fecha_evento) ? a.evento.frase : a.extracto;
  if (!f) return "";
  const nf = norm(f).slice(0,60);
  return norm(n.resumen||"").includes(nf) || norm(n.titulo).includes(nf) ? "" : f;
}
const tarjetas = new Map(); // noticias dibujadas, para el panel ampliado
// Sin foto (o si la foto no carga): un recuadro con el icono del tema, en vez de un hueco gris
const ICO_NOTICIA = "M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5";
const sinFoto = n => `<div class="thumb sinfoto" aria-hidden="true">${ICON((n._cats && n._cats[0] && CAT[n._cats[0]] ? CAT[n._cats[0]].d : ICO_NOTICIA))}</div>`;
// Cuántos medios la cuentan y, si dan cifras distintas (asistentes, heridos…), cuáles
const CIFRA_NOMBRE = { personas: "personas", heridos: "heridos", detenidos: "detenidos", fallecidos: "fallecidos" };
const fmtN = v => Number(v).toLocaleString("es-ES");
function contraste(n){
  const k = new Set(mediosDe(n).map(m=>m.nombre)).size;
  // Con varios medios, el propio botón «✓ N medios» lo dice (y despliega la lista); con uno solo, se avisa
  const conf = k<=1 ? `<span class="conf uno" title="Solo la cuenta un medio: sin contrastar">Solo 1 medio</span>` : "";
  const cif = (n.cifras||[]).map(c=>`<div class="cifras" title="Los medios no dan la misma cifra"><b>Cifras distintas:</b> ${c.valores.map(x=>`${fmtN(x.v)} ${CIFRA_NOMBRE[c.k]||c.k} <span>(${esc(x.medio)})</span>`).join(" · ")}</div>`).join("");
  return { conf, cif };
}
// Importante: además del color, un icono y la palabra (para quien no distingue bien los colores y para lectores de pantalla)
const ICO_IMP = "M12 3l9 16H3zM12 10v4M12 17h.01";
function card(n, opts={}){
  tarjetas.set(n._key, n);
  if (opts.per) return cardPer(n);
  const lvl = n.relevancia==="alta"?"alta":n.relevancia==="media"?"media":"baja";
  const cat = n._cats[0] ? `<span class="cat">${ICON(CAT[n._cats[0]].d)}${esc(CAT[n._cats[0]].n)}</span>` : "";
  const ev = n._anulada ? `<span class="pill anul" title="${esc(n._anulada)}">Cancelado</span>` : n.fecha_evento && !opts.noEv && n.fecha_evento>=today() ? `<span class="pill ev">${I.cal.replace('<svg','<svg width="12" height="12"')}${esc(fmtCorto(n.fecha_evento))}${n.hora_evento?", "+esc(n.hora_evento):""}</span>` : "";
  const medios = mediosDe(n);
  const abierto = st.abiertos.has(n._key);
  const maxV = 1;
  const visibles = abierto ? medios : medios.slice(0,maxV);
  const src = visibles.map(m=>`<a class="src" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.nombre)}${m.pago?' <span class="pay" title="El periódico solo muestra el principio a quien no es suscriptor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Suscriptores</span>':""}${I.ext}</a>`).join("")
    + (medios.length>maxV ? `<button class="more" type="button" data-more>${abierto?"Menos":`✓ ${medios.length} medios`}</button>` : "");
  const lugar = n.municipio && n.municipio!=="General" ? `<button class="pill ${lvl!=="baja"?"lvl-"+lvl:""}" type="button" data-pueblo="${esc(n.municipio)}">${esc(n.municipio)}</button>` : "";
  const fav = !!st.favs[n._key];
  // «Nueva» se mantiene toda la visita (aunque ya haya pasado por pantalla); a la siguiente visita ya no
  const nueva = isNew(n) || (st.sesionNuevas && st.sesionNuevas.has(n._key));
  return `<article class="card ${lvl} ${isNew(n)?"unseen":""} ${nueva?"nueva":""} ${st.detalle===n._key?"sel":""}" data-k="${esc(n._key)}" tabindex="0" ${medios[0]?`data-href="${esc(medios[0].url)}"`:""}>
    <div class="top">${lvl==="alta"?`<span class="imptag">${ICON(ICO_IMP)}Importante</span>`:""}${nueva?`<span class="nvtag">Nueva</span>`:""}${n.resuelta?`<span class="nvtag" style="background:var(--pine-2)">${esc(n.resuelta)}</span>`:""}${lugar}${ev}${cat}<span class="time">${opts.pub ? (n.hora_evento ? `<b class="hacto">${I.clock}${esc(n.hora_evento)} h</b>` : `<span class="hsin">Hora sin confirmar</span>`) : esc(cuando(n._dia, n.hora))}</span></div>
    <div class="cbody">${fotoValida(n.img)?`<img class="thumb" src="${esc(n.img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-sin="${esc(sinFoto(n))}" onerror="this.outerHTML=this.dataset.sin">`:sinFoto(n)}<h4>${hl(n.titulo)}</h4>
    ${n.resumen?`<p>${hl(n.resumen)}</p>`:""}</div>
    ${opts.pub?`<div class="pubd">Publicada ${esc(cuando(n._dia, n.hora))}</div>`:""}
    ${extractoDe(n)?`<div class="pista"><b>En la noticia:</b> ${hl(extractoDe(n))}</div>`:""}
    ${contraste(n).cif}
    <div class="bottom"><div class="srcs">${contraste(n).conf}${src}</div><div class="acts">
      <button class="abtn fav" type="button" data-fav aria-pressed="${fav}" aria-label="${fav?"Quitar de guardadas":"Guardar"}">${I.fav}</button>
      <button class="abtn" type="button" data-share aria-label="Compartir">${I.share}</button>
    </div></div>
  </article>`;
}

// Tarjeta compacta de Periódicos: periódico, lugar y hora arriba; titular y dos líneas de resumen
function cardPer(n){
  const m = mediosDe(n)[0] || {};
  const fav = !!st.favs[n._key];
  const lugar = n.municipio && n.municipio!=="General" ? `<span class="plug">${esc(n.municipio)}</span>` : "";
  const it = n._int, tag = it ? `<span class="ptag ${it.relevancia==="alta"?"alta":""}">${it.relevancia==="alta"?"Importante":"De interés"}${it._cats&&it._cats[0]&&CAT[it._cats[0]]?" · "+esc(CAT[it._cats[0]].n):""}</span>` : "";
  return `<article class="card per ${llegoPer(n)?"llego":""} ${it?"int":""} ${st.detalle===n._key?"sel":""}" data-k="${esc(n._key)}" ${m.url?`data-href="${esc(m.url)}"`:""}>
    <div class="ptop"><span class="ndot" aria-label="Llegada desde tu última visita"></span><span class="pmed">${esc(m.nombre||"")}</span>${m.pago?'<span class="pay" title="El periódico solo muestra el principio a quien no es suscriptor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>':""}${lugar}<span class="time">${esc(cuando(n._dia, n.hora))}</span>
      <button class="abtn fav mini" type="button" data-fav aria-pressed="${fav}" aria-label="${fav?"Quitar de guardadas":"Guardar"}">${I.fav}</button></div>
    <div class="cbody">${fotoValida(n.img)?`<img class="thumb" src="${esc(n.img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`:""}${tag}<h4>${hl(n.titulo)}</h4>${n.resumen?`<p>${hl(n.resumen)}</p>`:""}</div>
  </article>`;
}
function chipsBar(pool){
  pool = pool.filter(n=>!(st.sinCapital && isCapital(n)) && !(st.soloKw && !kwHits(n)));
  const counts = {}; for (const n of pool) for (const c of n._cats) counts[c]=(counts[c]||0)+1;
  let h = `<button class="chip" data-cat="" aria-pressed="${!st.cat}" type="button">Todo<span class="c">${pool.length}</span></button>`;
  for (const c of CATS){ const k = counts[c.k]||0;
    if (!k && st.cat!==c.k) continue;
    h += `<button class="chip ${k?"":"zero"}" data-cat="${c.k}" aria-pressed="${st.cat===c.k}" type="button">${ICON(c.d)}${esc(c.n)}<span class="c">${k}</span></button>`; }
  const fper = `<div class="fper" role="group" aria-label="Periodo">${["3","7","21"].map(v=>`<button type="button" data-act="rangoSet" data-v="${v}" aria-pressed="${st.rango===v}">${v} días</button>`).join("")}</div>`;
  return `<div class="fbar">${barraVista(true)}${fper}<div class="chips" id="chips">${h}</div></div>`;
}
// Fila de arriba: Con capital / Sin capital (las dos opciones a la vista) y botón de Filtros
function barraVista(conFiltros, extra=""){
  const activos = st.rango!=="3" || st.soloKw;
  return `<div class="vbar"><div class="seg" role="group" aria-label="Segovia capital">
      <button type="button" data-act="capSet" data-v="0" aria-pressed="${!st.sinCapital}">Con capital</button>
      <button type="button" data-act="capSet" data-v="1" aria-pressed="${st.sinCapital}">Sin capital</button></div>
    ${conFiltros?`<div class="vacc">`:""}${conFiltros?`<button class="vfil vpar" data-act="parte" type="button" aria-label="Parte del día"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/></svg><span class="vl">Parte</span></button>`:""}
    ${conFiltros?`<button class="vfil ${activos?"on":""}" data-act="filtros" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span class="vl">Filtros</span>${activos?`<span class="dot"></span>`:""}</button></div>`:""}${extra}</div>`;
}
const avisoFiltros = () => { const a = filtrosActivos().filter(x=>x!=="sin capital" && !/días$/.test(x)); return a.length ? `<div class="filtrado"><span>Filtrando: <b>${a.join(", ")}</b></span><button class="linkbtn" data-act="limpiar" type="button">Quitar filtros</button></div>` : ""; };

