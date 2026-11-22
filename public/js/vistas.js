/* ================= Vistas ================= */
function viewNoticias(news){
  if (st.q) return viewBusqueda(news);
  const pool = news.filter(n=>enRango(n));
  const shown = pool.filter(pasa);
  const enNuevo = n => isNew(n) || (st.sesionNuevas && st.sesionNuevas.has(n._key));
  const nuevasTodas = shown.filter(enNuevo).sort(porHora);
  const vistas = shown.filter(n=>!enNuevo(n));
  const t = today();
  const alta = shown.filter(n=>n.relevancia==="alta");
  const pueblos = new Set(shown.filter(n=>esPueblo(n.municipio)).map(n=>n.municipio));
  const ag = (({ev,sinFecha})=>[...ev,...sinFecha])(agendaDe(news));
  const sum = st.primera && !nuevasTodas.length && shown.length ? `<b>${plural(shown.length,"noticia de interés","noticias de interés")}</b> en los últimos ${st.rango} días.` : nuevasTodas.length ? `<b>${plural(nuevasTodas.length,"noticia nueva","noticias nuevas")}</b> desde tu última visita.`
    : shown.length ? `Estás al día. ${plural(shown.length,"noticia","noticias")} en los últimos ${st.rango} días.` : "No hay noticias con los filtros actuales.";
  let h = `<section class="hero"><div class="day">${esc(fmtLong(t))}</div><div class="sum">${sum}</div>
    <div class="stats ${hayElecciones()?"s4":""}">
      <button class="stat ${alta.length?"alta":""}" data-act="imp" type="button"><div class="n">${alta.length}</div><div class="l"><span>Importantes</span>${I.chev}</div></button>
      <button class="stat" data-act="agenda" type="button"><div class="n">${ag.length}</div><div class="l"><span>Agenda</span>${I.chev}</div></button>
      <button class="stat" data-act="pueblos" type="button"><div class="n">${pueblos.size}</div><div class="l"><span>Pueblos</span>${I.chev}</div></button>${hayElecciones()?`
      <button class="stat elec ${store.get("elecVisto",0)?"":"nuevo"}" data-act="elec" type="button">${store.get("elecVisto",0)?"":`<span class="nuevotag">Nuevo</span>`}<div class="n">${elecNoticias(news).length}</div><div class="l" title="Elecciones del 29N: capital y provincia"><span>Elecciones</span>${I.chev}</div></button>`:""}
    </div>
    <button class="partebtn" data-act="parte" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/></svg>Parte del día<span>Resumen para copiar o enviar</span></button></section>`;
  const urg = nuevasTodas.filter(n=>n.relevancia==="alta").slice(0,8);
  // Lo que ya sale arriba en rojo no se repite en la lista
  const nuevas = nuevasTodas.filter(n=>!urg.includes(n));
  h += chipsBar(pool);
  if (urg.length){
    h += `<div class="sect"><h2>Importante y nuevo</h2>${!nuevas.length?`<button class="linkbtn" data-act="leido" type="button">Marcar como visto</button>`:""}</div><div class="rail">` +
      urg.map(n=>`<a class="urg ${urg.length===1?"alone":""}" data-k="${esc(n._key)}" ${mediosDe(n)[0]?`href="${esc(mediosDe(n)[0].url)}" target="_blank" rel="noopener"`:""} title="${esc((mediosDe(n)[0]||{}).nombre||"")}">
          <span class="where">${ICON(CAT[n._cats[0]]?.d||CAT.policial.d)}${esc(n.municipio && n.municipio!=="General"?n.municipio:(CAT[n._cats[0]]?.n||""))}</span>
          <h3>${esc(n.titulo)}</h3>
          <span class="when">${esc(cuando(n._dia,n.hora))}</span></a>`).join("") + `</div>`;
  }
  h += `<div class="feed">` + avisoFiltros();
  if (!shown.length) return h + `<div class="empty"><b>Nada con estos filtros</b>Prueba otro tema, amplía el periodo en Filtros o pulsa «Quitar filtros».<br><button class="btn ghost" data-act="limpiar" type="button">Quitar filtros</button></div></div>`;
  if (!nuevas.length && urg.length){
    // Todo lo nuevo es importante y ya está justo encima (con su «Marcar como visto»)
  } else if (nuevas.length){
    h += `<div class="newhead"><h3>Nuevo para ti <span class="cnt">${nuevasTodas.length}</span></h3><button class="linkbtn" data-act="leido" type="button"><span class="lg">Marcar todo como visto</span><span class="sm">Marcar vistas</span></button></div>`;
    h += nuevas.slice(0,3).map(n=>card(n)).join("") + tarjetaAvisos() + nuevas.slice(3).map(n=>card(n)).join("");
    h += `<div class="uptodate"><span>${I.check}Hasta aquí lo nuevo</span></div>`;
  } else {
    h += `<div class="uptodate"><span>${I.check}Estás al día: nada nuevo</span></div>`;
  }
  h += porDias(vistas, nuevasTodas.length ? " · ya visto" : "");
  return h + `</div><p class="foot">Se actualiza sola: cada 10 minutos de lunes a viernes de 8 a 15 h, y cada hora el resto. <button type="button" data-act="medios">Medios y fuentes</button></p>`;
}
function porDias(list, extra="", opts={}){
  const by = {}; for (const n of list) (by[n._dia] ||= []).push(n);
  let h = "";
  for (const d of Object.keys(by).sort().reverse()){
    const it = by[d].sort(porHora);
    h += `<div class="dayhead"><h3>${esc(fmtDayName(d))}${extra}</h3><span>${plural(it.length,"noticia","noticias")}</span></div>` + it.map(n=>card(n, opts)).join("");
  }
  return h;
}
function viewBusqueda(news){
  const words = norm(st.q).split(/\s+/).filter(Boolean);
  const coincide = n=>{ const t = norm([n.titulo,n.resumen,n.municipio,n.analisis?.extracto,n.analisis?.evento?.frase].join(" ")); return words.every(w=>t.includes(w)); };
  // Lo de interés incluye siempre el archivo (se carga solo, pesa poco)
  if (arc.estado==="no") setTimeout(cargaArchivo, 0);
  // "Todo lo publicado" se carga al elegirlo; en el ordenador, también de fondo para que se vea cuántas hay
  if ((st.ambito==="todo" || esPC()) && hem.estado==="no") setTimeout(cargaHemeroteca, 0);
  const interes = [...news.filter(coincide), ...(arc.estado==="ok" ? soloArchivo(news).filter(coincide) : [])].sort(porHora);
  const hemRes = hem.estado==="ok" ? resultadosHem(words) : null;
  const tab = (k, txt, n) => `<button class="stab" data-ambito="${k}" aria-pressed="${st.ambito===k}" type="button">${txt}${n!==null&&n!==undefined?`<span class="c">${n}</span>`:""}</button>`;
  let h = `<div class="sect"><h2>Buscar «${esc(st.q)}»</h2></div>
    <div class="stabs" role="tablist">${tab("interes","De interés", arc.estado==="cargando"?"…":interes.length)}${tab("todo","Todo lo publicado", hemRes?hemRes.length:null)}${tab("google","En Google")}</div>
    <p class="shelp">${st.ambito==="interes" ? "Noticias que la app seleccionó para la unidad, desde que empezó a funcionar." : st.ambito==="todo" ? "Todo lo que han publicado nuestros medios, también lo que la app descartó (deportes, cultura, trámites…)." : "Para buscar fuera de la app: en nuestros periódicos y webs (también años atrás) o en Google Noticias."}</p><div class="feed">`;
  if (st.ambito==="interes"){
    h += interes.length ? porDias(interes) : `<div class="empty"><b>Nada de interés con «${esc(st.q)}»</b>Prueba en <button class="linkbtn" data-ambito="todo" type="button">Todo lo publicado</button> o <button class="linkbtn" data-ambito="google" type="button">En Google</button>.</div>`;
    if (interes.length) h += `<div class="shint">¿No está lo que buscas? Mira en <button class="linkbtn" data-ambito="todo" type="button">Todo lo publicado</button> o <button class="linkbtn" data-ambito="google" type="button">En Google</button>.</div>`;
  } else if (st.ambito==="todo"){
    h += bloqueHemeroteca(words);
  } else {
    h += bloqueGoogle(st.q);
  }
  return h + `</div>`;
}

function viewAgenda(news){
  const t = today();
  const { ev, sinFecha } = agendaDe(news);
  let h = `<div class="sect"><h2>Agenda</h2><span class="aux">Convocatorias y actos próximos</span></div>`;
  h += chipsBar((({ev,sinFecha})=>[...ev,...sinFecha])(agendaDe(news,false))) + `<div class="feed agfeed">` + avisoFiltros();
  if (!ev.length && !sinFecha.length) return h + `<div class="empty"><b>No hay convocatorias próximas</b>Aquí salen las concentraciones, manifestaciones, huelgas, tractoradas, mítines, visitas oficiales y fiestas que la prensa anuncia con fecha.</div></div>`;
  const by = {}; for (const n of ev) (by[n.fecha_evento] ||= []).push(n);
  for (const d of Object.keys(by).sort()){
    const x = D(d);
    h += `<div class="ag-day"><div class="ag-date ${d===t?"today":""}"><div class="d">${x.getDate()}</div><div class="m">${esc(x.toLocaleDateString("es-ES",{month:"short"}).replace(".",""))}</div><div class="m">${esc(d===t?"hoy":x.toLocaleDateString("es-ES",{weekday:"short"}).replace(".",""))}</div></div><div>${by[d].map(n=>card(n,{noEv:true,hev:true,pub:true})).join("")}</div></div>`;
  }
  if (sinFecha.length){
    h += `<div class="dayhead"><h3>Anunciadas, fecha por confirmar</h3><span>${sinFecha.length}</span></div><p class="note" style="padding:0 4px">Convocatorias de los últimos 5 días en las que la noticia no da una fecha concreta.</p>`;
    h += sinFecha.map(n=>card(n)).join("");
  }
  return h + `</div>`;
}

function viewPueblos(news){
  const pool = news.filter(n=>enRango(n) && pasa(n) && esPueblo(n.municipio));
  const m = {};
  for (const n of pool){ const k=n.municipio; (m[k] ||= {n:0,a:0}); m[k].n++; if(n.relevancia==="alta") m[k].a++; }
  let list = Object.entries(m).sort((a,b)=> (b[1].a-a[1].a) || (b[1].n-a[1].n) || a[0].localeCompare(b[0],"es"));
  if (st.townQ) list = list.filter(([k])=>norm(k).includes(norm(st.townQ)));
  let h = `<div class="sect"><h2>Pueblos</h2><span class="aux">Últimos ${st.rango} días</span></div>
    <div class="mp-wrap"><div class="mapa-pueblos" id="mapaPueblos" role="region" aria-label="Mapa de pueblos de la provincia"></div><div class="mapa-panel" id="mapaPanel" aria-live="polite"></div></div>
    <div class="search">${I.search}<input id="townQ" type="search" placeholder="Buscar pueblo" value="${esc(st.townQ)}" autocomplete="off"></div><div class="towns">${avisoFiltros()}`;
  if (!list.length && st.townQ){
    const otros = [...new Set(news.filter(n=>esPueblo(n.municipio) && norm(n.municipio).includes(norm(st.townQ))).map(n=>n.municipio))];
    h += otros.length ? otros.map(k=>`<button class="town none" data-pueblo="${esc(k)}" type="button"><span class="name">${esc(k)}</span><span class="cnt">hace más de ${esc(st.rango)} días</span><span class="chev">›</span></button>`).join("")
      : `<div class="empty"><b>Sin noticias</b>No hay noticias de interés recientes de ese pueblo.<br><button class="btn ghost" data-act="buscapueblo" type="button">Buscar en todo lo publicado</button></div>`;
  } else if (!list.length) h += `<div class="empty"><b>Sin noticias de pueblos</b>En los últimos ${st.rango} días no hay noticias de interés de ningún pueblo.</div>`;
  h += list.map(([k,v])=>`<button class="town" data-pueblo="${esc(k)}" type="button"><span class="name">${esc(k)}</span>${v.a?`<span class="al">${plural(v.a,"importante","importantes")}</span>`:""}<span class="cnt">${v.n}</span><span class="chev">›</span></button>`).join("");
  return h + `</div>`;
}

function viewGuardadas(){
  const list = Object.values(st.favs).sort((a,b)=>b.t-a.t).map(f=>({...f.n, _key:f.n._key}));
  let h = `<div class="sect"><h2>Guardadas</h2><span class="aux">${plural(list.length,"noticia","noticias")}</span></div><div class="feed">`;
  if (!list.length) return h + `<div class="empty"><b>Aún no has guardado nada</b>Pulsa el marcador de cualquier noticia para tenerla aquí a mano. Se guardan en este dispositivo aunque la noticia ya no salga en el listado.</div></div>`;
  return h + list.map(n=>card(n)).join("") + `</div>`;
}

function viewPueblo(news, name){
  const t = today();
  const all = news.filter(n=>n.municipio===name).sort(porHora);
  const prox = all.filter(n=>n.fecha_evento && n.fecha_evento>=t);
  const alta = all.filter(n=>n.relevancia==="alta").length;
  let h = `<section class="subhero"><h1>${esc(name)}</h1><p>${plural(all.length,"noticia reciente","noticias recientes")}${alta?`, ${plural(alta,"importante","importantes")}`:""}.</p></section><div class="feed">`;
  if (prox.length) h += `<div class="dayhead"><h3>Próximas convocatorias</h3><span>${prox.length}</span></div>` + prox.map(n=>card(n,{hev:true})).join("");
  h += all.length ? porDias(all.filter(n=>!prox.includes(n))) : `<div class="empty"><b>Sin noticias</b>No hay noticias de interés recientes de ${esc(name)}.<br><button class="btn ghost" data-act="buscapueblo" data-q="${esc(name)}" type="button">Buscar «${esc(name)}» en todo lo publicado</button></div>`;
  return h + bloqueArchivo(news, n=>n.municipio===name, "de " + name) + `</div>`;
}
/* Elecciones 29N: todo lo electoral de la capital y la provincia en un apartado (sin el filtro de capital) */
const FIN_ELECCIONES = "2026-12-06";
const hayElecciones = () => today() <= FIN_ELECCIONES;
const ELEC_RE = /\b29n\b|29 de noviembre|elecciones|electoral|campana (del (pp|psoe|vox)|de (los|las) (candidat|elecciones))|candidat[oa]s? (al|a la|del|de la|por)|candidaturas?|cabeza de lista|\bmitin|junta electoral|\((vox|pp|psoe|sumar|podemos|iu|upl|se|frente amplio|xav)\)|pegada de carteles|cierre de campana|jornada de reflexion|papeletas|interventor|apoderad|voto por correo|mesas? electoral|escanos?|diputados por segovia|senador|feijoo|abascal|buxade|tellado|montserrat|bolanos|pedro sanchez|manueco|martinez-almeida|de los santos/;
const esElectoral = n => ELEC_RE.test(norm(n.titulo || ""));
const INI_ELECCIONES = "2026-11-01"; // todo lo de la precampaña y campaña, sin depender de 3/7/21 días
const elecNoticias = news => news.filter(n=>n._dia >= INI_ELECCIONES && esElectoral(n)).sort(porHora);
function elecPeriodicos(news){
  return periodicosNews().filter(n=>n._dia >= INI_ELECCIONES && n.municipio && n.municipio!=="General" && esElectoral(n) && !n._int).sort(porHora);
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
