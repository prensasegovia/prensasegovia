/* Parte del día: texto para pegar en WhatsApp o en un informe */
function textoParte(news){
  const ahora = Date.now(), t = today();
  const desde = st.parteDesde==="hoy" ? new Date(t+"T00:00:00").getTime() : ahora - 24*36e5;
  const base = news.filter(pasa);
  const rec = base.filter(n=>(n._ts||0) >= desde).sort(porHora);
  const imp = rec.filter(n=>n.relevancia==="alta");
  const ag = base.filter(n=>n.fecha_evento && n.fecha_evento>=t && n.fecha_evento<=addDays(t,7)).sort(porEvento);
  const resto = rec.filter(n=>n.relevancia!=="alta" && !ag.includes(n));
  const unicas = new Set([...imp, ...ag, ...resto].map(n=>n._key)).size;
  const lugar = n => n.municipio && n.municipio!=="General" ? n.municipio : "Provincia";
  const fuente = n => { const m = mediosDe(n)[0]; return m ? ` (${m.nombre})` + (st.parteLinks ? `\n  ${m.url}` : "") : ""; };
  const linea = n => `• ${lugar(n)} — ${n.titulo}${fuente(n)}`;
  const hora = new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",timeZone:TZ});
  let x = `*PARTE DE PRENSA · ${fmtLong(t)} · ${hora}*\n`;
  const f = filtrosActivos().filter(v=>!/días$/.test(v)); if (f.length) x += `_Filtro: ${f.join(", ")}_\n`;
  x += `_${st.parteDesde==="hoy"?"Noticias de hoy":"Últimas 24 horas"}_\n`;
  x += `\n*IMPORTANTE*\n` + (imp.length ? imp.map(linea).join("\n") : "• Nada destacado") + "\n";
  x += `\n*CONVOCATORIAS Y EVENTOS (próximos 7 días)*\n` + (ag.length ? ag.map(n=>`• ${cuando(n.fecha_evento,n.hora_evento)} · ${lugar(n)} — ${n.titulo}${fuente(n)}`).join("\n") : "• Sin convocatorias con fecha") + "\n";
  if (resto.length){
    x += `\n*RESTO DE NOTICIAS*\n`;
    for (const c of CATS){ const l = resto.filter(n=>n._cats[0]===c.k); if (l.length) x += `_${c.n}_\n` + l.map(linea).join("\n") + "\n"; }
    const otras = resto.filter(n=>!CAT[n._cats[0]]); if (otras.length) x += `_Otras_\n` + otras.map(linea).join("\n") + "\n";
  }
  return { x, n: unicas, imp, ag, resto };
}
/* Parte del día: el mismo contenido y orden que el texto que se copia (Importante, Convocatorias, Resto por temas),
   una línea por noticia, pero maquetado como un documento. Cada línea abre la noticia. */
function viewParte(news){
  const { x, n, imp, ag, resto } = textoParte(news);
  const lugar = m => m.municipio && m.municipio!=="General" ? m.municipio : "Provincia";
  const medio = m => { const md = mediosDe(m)[0]; return md ? ` <span class="md">· ${esc(md.nombre)}</span>` : ""; };
  const linea = (m, antes="") => { const md = mediosDe(m)[0], c = `${antes}<b class="lg">${esc(lugar(m))}</b> — <span class="ti">${esc(m.titulo)}</span>${medio(m)}`;
    return `<li>${md ? `<a href="${esc(md.url)}" target="_blank" rel="noopener" data-k="${esc(m._key)}">${c}</a>` : `<span>${c}</span>`}</li>`; };
  const t = today(), hora = new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",timeZone:TZ});
  const f = filtrosActivos().filter(v=>!/días$/.test(v));
  const grupos = [...CATS.map(c=>[c.n, resto.filter(m=>m._cats[0]===c.k)]), ["Otras", resto.filter(m=>!CAT[m._cats[0]])]].filter(([,l])=>l.length);
  const doc = `<div class="parte pd" id="parteTxt"><div class="pd-h"><b>Parte de prensa</b><span>${esc(cap(fmtLong(t)))} · ${hora}</span><small>${st.parteDesde==="hoy"?"Noticias de hoy":"Últimas 24 horas"}${f.length?` · Filtro: ${esc(f.join(", "))}`:""}</small></div>
    <section class="pd-s alta"><h4>Importante</h4>${imp.length ? `<ul>${imp.map(m=>linea(m)).join("")}</ul>` : `<p class="nada">Nada destacado</p>`}</section>
    <section class="pd-s ev"><h4>Convocatorias y eventos <small>próximos 7 días</small></h4>${ag.length ? `<ul>${ag.map(m=>linea(m, `<span class="cu">${esc(cuando(m.fecha_evento, m.hora_evento))}</span>`)).join("")}</ul>` : `<p class="nada">Sin convocatorias con fecha</p>`}</section>
    ${grupos.length ? `<section class="pd-s"><h4>Resto de noticias</h4>${grupos.map(([nom,l])=>`<h5>${esc(nom)}</h5><ul>${l.map(m=>linea(m)).join("")}</ul>`).join("")}</section>` : ""}</div>`;
  return `<section class="subhero"><h1>Parte del día</h1><p>Lo importante, la agenda de la semana y el resto. ${filtrosActivos().length?`Con estos filtros: <b>${esc(filtrosActivos().join(", "))}</b>.`:"Sin filtros: incluye todo."}</p></section>
  <div class="feed parte-wrap" style="padding-top:12px">
    <div class="seg" id="segParte"><button data-v="24h" type="button" aria-pressed="${st.parteDesde==="24h"}">Últimas 24 h</button><button data-v="hoy" type="button" aria-pressed="${st.parteDesde==="hoy"}">Solo hoy</button></div>
    <label class="sw" style="margin:12px 4px 0"><span class="h" style="margin:0;font-size:14.5px;color:var(--ink)">Incluir enlaces al copiar o enviar</span><input type="checkbox" id="parteLinks" ${st.parteLinks?"checked":""}></label>
    <textarea id="parteRaw" hidden>${esc(x)}</textarea>${doc}
    <div class="parte-acts"><button class="btn ghost" data-act="parteCopiar" type="button">Copiar</button><button class="btn" data-act="parteEnviar" type="button"><span class="solo-movil">Enviar…</span><span class="solo-pc">Abrir en WhatsApp</span></button></div>
    <p class="note" style="padding:0 4px">${plural(n,"noticia","noticias")} en el parte. Al copiarlo o enviarlo va como texto, listo para WhatsApp.</p>
  </div>`;
}
document.addEventListener("click", e=>{ const r = e.target.closest && e.target.closest(".parte.pd a[data-k]"); if (r) marcarAbierta(r.dataset.k); });
const GRUPOS_MEDIOS = ["Periódicos y digitales de Segovia","Comarcales y locales","Radio","Agencias y medios regionales","Instituciones","Partidos y sindicatos","Plataformas vecinales","Sector agrario","Ayuntamientos","Google Noticias","Otros"];
// Estado real de cada fuente: no basta con que responda; importa si publica y si aporta noticias de interés
const diasDesde = f => f ? Math.round((new Date(today() + "T12:00") - new Date(f + "T12:00")) / 864e5) : null;
const haceDias = f => { const d = diasDesde(f); return d === null ? "" : d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`; };
const PARADA_DIAS = 14;
function estadoFuente(f){
  if (!f.ok) return { c: "ko", t: "No responde ahora · sus noticias pueden llegar por Google Noticias" };
  const u = diasDesde(f.ultima), a = diasDesde(f.aporta);
  if (u !== null && u > PARADA_DIAS) return { c: "parada", t: `Parada: no publica nada desde ${haceDias(f.ultima)}` };
  const pub = f.ultima ? `publicó ${haceDias(f.ultima)}` : "";
  if (a === null) return { c: "cero", t: [pub, "ninguna noticia de interés en 3 semanas"].filter(Boolean).join(" · ") };
  return { c: a > 7 ? "cero" : "", t: `Última noticia de interés ${haceDias(f.aporta)}${pub && diasDesde(f.ultima) < a ? " · " + pub : ""}` };
}
function viewMedios(){
  const F = st.fuentes;
  const ok = F.filter(f=>f.ok).length;
  const est = F.map(estadoFuente), aportan = est.filter(e=>e.c==="").length, paradas = est.filter(e=>e.c==="parada").length;
  let h = `<section class="subhero"><h1>Medios y fuentes</h1><p>${F.length} fuentes revisadas cada 10 min (L-V, 8-15 h) o cada hora${st.actualizado?` · última revisión ${esc(st.actualizado.slice(11,16))}`:""}. ${ok} responden ahora · ${aportan} han aportado noticias esta semana${paradas?` · ${paradas} paradas`:""}.</p></section>
    <p class="note mleyenda" style="padding:0 20px"><span class="dot"></span> aporta noticias <span class="dot cero"></span> responde pero apenas aporta <span class="dot parada"></span> parada (no publica hace más de ${PARADA_DIAS} días) <span class="dot ko"></span> no responde</p>`;
  if (!F.length) return h + `<div class="empty"><b>Cargando…</b></div>`;
  for (const g of GRUPOS_MEDIOS){
    const l = F.filter(f=>(f.grupo||"Otros")===g);
    if (!l.length) continue;
    h += `<div class="mgroup"><h3>${esc(g)} <span style="font-weight:500;color:var(--muted);font-size:13.5px">· ${l.length}</span></h3>`;
    if (g==="Ayuntamientos"){
      const aOk = l.filter(f=>f.ok).length, aN = l.reduce((t,f)=>t+(f.noticias||0),0);
      h += `<p class="note" style="padding:0 4px">Webs municipales con noticias activas. ${aOk} de ${l.length} responden · ${aN} avisos leídos. Solo pasan los que son de interés (no bandos, plenos ordinarios ni trámites).</p><div class="aytos">` +
        l.map(f=>{ const e = estadoFuente(f); return `<a class="ayto" href="${esc(safeUrl(f.web)||"#")}" target="_blank" rel="noopener" title="${esc(e.t)}"><span class="dot ${e.c}"></span>${esc(f.fuente.replace("Ayuntamiento de ",""))}</a>`; }).join("") + `</div>`;
    } else if (g==="Google Noticias"){
      const f = l[0];
      h += `<div class="medio"><span class="dot ${f.ok?"":"ko"}"></span><div><b>Búsquedas en Google Noticias</b><span>${f.busquedas||""} búsquedas por temas y por los 208 municipios · ${f.noticias||0} resultados en la última revisión</span></div></div>`;
      if (st.viaGoogle.length) h += `<p class="note" style="padding:0 4px">Medios que llegan por esta vía: ${st.viaGoogle.map(([m,n])=>`${esc(m)} (${n})`).join(", ")}.</p>`;
    } else {
      // Primero las que aportan; las paradas y caídas, al final
      const orden = {"":0, cero:1, parada:2, ko:3};
      h += l.map(f=>({f, e:estadoFuente(f)})).sort((x,y)=>orden[x.e.c]-orden[y.e.c]).map(({f,e})=>`<a class="medio" href="${esc(safeUrl(f.web)||"#")}" target="_blank" rel="noopener"><span class="dot ${e.c}"></span><div><b>${esc(f.fuente)}</b><span>${esc(e.t)}</span></div>${I.ext.replace('<svg','<svg width="14" height="14"')}</a>`).join("");
    }
    h += `</div>`;
  }
  h += `<p class="foot">Además se leen por completo los textos de las noticias nuevas para detectar temas, convocatorias y lugares que no aparecen en el titular.</p>`;
  return h;
}

