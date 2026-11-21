/* Periódicos: todas las noticias de los tres principales, sin filtro de temas (sin deportes ni opinión) */
const PER_ORDEN = ["El Adelantado","El Norte de Castilla","El Día de Segovia","Tribuna de Segovia","Segovia Directo","Segovia 24/7","Diario de Castilla y León","Acueducto2","SegoviaUdaz","esCuéllar","El Nordeste de Segovia","COPE Segovia","Onda Cero Segovia"];
// Periódicos que llegan (en el orden de arriba, los nuevos al final)
const perTodos = () => { const hay = [...new Set(st.periodicos.map(n=>n.medio))]; return [...PER_ORDEN.filter(m=>hay.includes(m)), ...hay.filter(m=>!PER_ORDEN.includes(m)).sort()]; };
// Los que cada uno quiere ver (null = todos)
const perSel = () => { const s = store.get("perSel", null); return Array.isArray(s) ? s : null; };
const perVisible = m => { const s = perSel(); return !s || s.includes(m); };
// Periódicos funciona como un quiosco: sin contadores de «por leer». Solo se marca con un punto
// lo que ha llegado desde la visita anterior, y se señala lo que ya está en Noticias (de interés).
let perCorte = null, ocultoDesde = 0;
const fijaCortePer = () => { perCorte = store.get("perUltima", null) ?? Date.now(); };
const llegoPer = n => perCorte !== null && n._lleg > perCorte && !st.seen.has(n._key); // abierta: sin punto
let enPer = false; // dentro de Periódicos en esta visita
// Sin capital en Periódicos: fuera la capital y lo que no es de la provincia (otras provincias, Junta en general...)
const perFueraCap = n => st.sinCapital && (isCapital(n) || !n.municipio || n.municipio==="General");
let idxInt = null, idxIntBase = null;
function indiceInteres(){
  const base = allNews(); if (idxInt && idxIntBase===base) return idxInt;
  idxInt = new Map(); idxIntBase = base;
  for (const n of base) for (const m of (n.medios||[])) if (m.url) idxInt.set(m.url, n);
  return idxInt;
}
function periodicosNews(){
  const idx = indiceInteres();
  return st.periodicos.filter(n=>perVisible(n.medio)).map(n=>{ const d = new Date(n.publicado); return { ...n, titulo:sinGritos(n.titulo||""), _lleg:new Date(n.llegada||n.publicado).getTime(), _int:idx.get(n.url)||null, _key:"p:"+n.url, _ts:d.getTime(), _dia:iso(d), hora:d.toLocaleTimeString("es-ES",{timeZone:TZ,hour:"2-digit",minute:"2-digit",hour12:false}), _cats:[], relevancia:"baja", medios:[{nombre:n.medio,url:n.url,...(n.pago?{pago:true}:{})}] }; });
}
// Día elegido en Periódicos ("todos" o AAAA-MM-DD) y la lista de días con noticias
const perDias = () => [...new Set(periodicosNews().map(n=>n._dia))].sort().reverse();
const perPasa = n => !perFueraCap(n) && (!st.perDia || st.perDia==="todos" || n._dia===st.perDia);
const fechaCorta = d => new Date(d+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short", day:"numeric", month:"short"}).replace(/\./g,"");
const nomDia = d => { const t = today(); const f = fechaCorta(d); if (d===t) return "Hoy, " + f; if (d===addDays(t,-1)) return "Ayer, " + f; return f.replace(/^\p{L}/u, c=>c.toUpperCase()); };
const nomDiaCorto = d => { const t = today(); if (d===t) return "Hoy"; if (d===addDays(t,-1)) return "Ayer"; return fechaCorta(d).replace(/ [a-z]+$/,"").replace(/^\p{L}/u, c=>c.toUpperCase()); };
const rangoPer = () => { const d = perDias(); if (!d.length) return ""; const a = d[d.length-1], b = d[0]; const f = x => new Date(x+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric", month:"short"}).replace(".",""); return `${d.length} ${d.length===1?"día":"días"}: ${f(a)} – ${f(b)}`; };
function chipsDias(){
  const dias = perDias(); if (dias.length < 2) return "";
  const cnt = d => periodicosNews().filter(n=>!(st.sinCapital && isCapital(n)) && (st.periodico==="todos"||n.medio===st.periodico) && (d==="todos"||n._dia===d)).length;
  const cur = st.perDia || "todos";
  return `<div class="chips dias" id="chipsDias">${["todos",...dias].map(d=>`<button class="chip" data-dia="${d}" aria-pressed="${cur===d}" type="button">${d==="todos"?"7 días":esc(nomDiaCorto(d))}<span class="c">${cnt(d)}</span></button>`).join("")}</div>`;
}
// Ordenador: periódico y día en desplegables dentro de la barra (sin columna derecha)
function selectsPeriodicos(){
  const all = periodicosNews();
  const delDia = n => !perFueraCap(n) && (!st.perDia || st.perDia==="todos" || n._dia===st.perDia);
  const delPer = n => !perFueraCap(n) && (st.periodico==="todos" || n.medio===st.periodico);
  const op = (v, txt, l, cur) => `<option value="${esc(v)}" ${cur===v?"selected":""}>${esc(txt)} · ${l.length}</option>`;
  const pers = ["todos", ...perTodos().filter(perVisible)];
  const dias = ["todos", ...perDias()];
  return `<label class="psel"><span>Periódico</span><select id="selPer">${pers.map(m=>op(m, m==="todos"?"Todos":m, all.filter(n=>delDia(n) && (m==="todos"||n.medio===m)), st.periodico)).join("")}</select></label>
    <label class="psel"><span>Día</span><select id="selDia">${dias.map(d=>op(d, d==="todos"?"Últimos 7 días":nomDia(d), all.filter(n=>delPer(n) && (d==="todos"||n._dia===d)), st.perDia||"todos")).join("")}</select></label>
    <button class="vfil pel" data-act="perElegir" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span class="vl">Elegir</span></button>`;
}
const cuandoVisita = ts => { const d = new Date(ts), di = iso(d), h = d.toLocaleTimeString("es-ES",{timeZone:TZ,hour:"2-digit",minute:"2-digit"}); return (di===today()?"hoy":di===addDays(today(),-1)?"ayer":fechaCorta(di))+" a las "+h; };
function viewPeriodicos(){
  const all = periodicosNews();
  const list = all.filter(n=>st.periodico==="todos" || n.medio===st.periodico).filter(perPasa);
  const de = m => all.filter(n=>(m==="todos"||n.medio===m) && perPasa(n));
  const cnt = m => de(m).length;
  const bur = () => "";
  // Cada entrada en Periódicos es una visita: el punto marca lo llegado desde la anterior
  if (!enPer){ fijaCortePer(); enPer = true; }
  store.set("perUltima", Date.now());
  const llegadas = list.some(llegoPer);
  let h = `<div class="sect pertit"><h2>Periódicos</h2><span class="aux">Últimos 7 días · sin deporte salvo incidentes</span></div>
    ${barraVista(false, `<div class="vacc">${esPC()?selectsPeriodicos():""}</div>`)}<div class="chips" id="chips">
      <button class="chip elegir" data-act="perElegir" type="button" aria-expanded="${!!st.perPanel}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>Elegir${perSel()?` <span class="c">${perSel().length}/${perTodos().length}</span>`:""}</button>
      <button class="chip" data-per="todos" aria-pressed="${st.periodico==="todos"}" type="button">Todos<span class="c">${cnt("todos")}</span>${bur("todos")}</button>
      ${perTodos().filter(perVisible).map(m=>`<button class="chip" data-per="${esc(m)}" aria-pressed="${st.periodico===m}" type="button">${esc(m)}<span class="c">${cnt(m)}</span>${bur(m)}</button>`).join("")}
    </div>${chipsDias()}${st.perPanel ? panelPeriodicos() : ""}<div class="feed">${st.periodico!=="todos" || (st.perDia && st.perDia!=="todos")?`<div class="perfil">Viendo ${st.periodico!=="todos"?`solo <b>${esc(st.periodico)}</b>`:"<b>todos los periódicos</b>"}${st.perDia && st.perDia!=="todos"?` · <b>${esc(nomDia(st.perDia).toLowerCase())}</b>`:""} <button class="linkbtn" data-act="perVerTodo" type="button">Ver todo</button></div>`:""}
    <div class="pernota">${llegadas?`<span><i class="pdot"></i>Llegado desde tu última visita (${esc(cuandoVisita(perCorte))})</span>`:""}</div>`;
  if (!st.periodicos.length) return h + `<div class="empty"><b>Cargando periódicos…</b>Las noticias aparecen en la próxima actualización.</div></div>`;
  if (!list.length) return h + `<div class="empty"><b>Sin noticias</b>No hay noticias con este filtro.</div></div>`;
  // Por días y por hora, sin reordenar por visto/no visto
  return h + porDias(list, "", {per:true}) + `</div>`;
}

function panelPeriodicos(){
  const todos = perTodos(), sel = perSel() || todos;
  const dia = st.perDia && st.perDia!=="todos" ? st.perDia : null;
  const lista = st.periodicos.map(x=>({...x, _dia: iso(new Date(x.publicado))})).filter(x=>!perFueraCap(x) && (!dia || x._dia===dia));
  const n = m => lista.filter(x=>x.medio===m).length;
  const cuando = dia ? nomDia(dia).toLowerCase() : "los últimos 7 días";
  return `<div class="perpanel"><div class="pph"><b>¿Qué periódicos quieres ver?</b><span>El número es lo que ha publicado cada uno ${dia?"":"en "}${esc(cuando)}${st.sinCapital?", sin la capital":""}. Se guarda en este ${esPC()?"ordenador":"móvil"}.</span></div>
    <div class="ppl">${todos.map(m=>`<label class="ppi"><input type="checkbox" data-perm="${esc(m)}" ${sel.includes(m)?"checked":""}><span>${esc(m)}</span><span class="c">${n(m)}</span></label>`).join("")}</div>
    <div class="ppb"><button class="linkbtn" data-act="perTodos" type="button">Marcar todos</button><button class="btn" data-act="perListo" type="button">Listo</button></div></div>`;
}
