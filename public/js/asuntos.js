/* ================= Seguir un asunto =================
   Un conflicto largo (el biogás de Cantalejo, la huelga de autobuses…) sale en muchas noticias sueltas durante semanas.
   Con «Seguir» en una noticia se crea un asunto: su pueblo y unas palabras clave sacadas del titular (se pueden quitar
   y añadir). La sección Asuntos junta en una línea de tiempo todo lo que coincide, de los datos actuales y del archivo,
   y marca lo que ha llegado desde la última vez que se miró. Se guarda en este dispositivo. */
const AS_VACIAS = new Set(("para pero como sobre tras ante entre desde hasta durante segun contra este esta estos estas ese esa eso "
  + "segovia segoviano segoviana segovianos segovianas provincia provincial ayuntamiento junta nuevo nueva nuevos nuevas hace tiene tienen "
  + "dice pide piden reclama reclaman exige exigen sigue siguen hasta todo toda todos todas otra otro otros otras ademas tambien sera "
  + "anos dias horas semana mes manana ayer hoy este primer primera").split(" "));
const asNorm = s => norm(String(s || "")).replace(/[^a-z0-9ñ ]+/g, " ");
const asRaiz = w => w.slice(0, 6);
// Palabras clave: las más significativas del titular (sin el nombre del pueblo ni palabras vacías)
function asClaves(titulo, pueblo){
  const pp = new Set(asNorm(pueblo).split(/\s+/));
  const out = [];
  for (const w of asNorm(titulo).split(/\s+/)) if (w.length >= 4 && !AS_VACIAS.has(w) && !pp.has(w) && !/^\d+$/.test(w)) { const r = asRaiz(w); if (!out.includes(r)) out.push(r); }
  return out.slice(0, 5);
}
const asuntos = () => store.get("asuntos", []);
const guardaAsuntos = l => store.set("asuntos", l);
const CONCRETO_AS = m => m && !["Provincia", "General"].includes(m);
// Una noticia es del asunto si es de su pueblo (o de la provincia) y tiene al menos dos de sus palabras clave
function asCoincide(a, n){
  if (CONCRETO_AS(a.pueblo) && n.municipio !== a.pueblo && n.municipio !== "Provincia") return false;
  if (!a.claves.length) return false;
  const t = " " + asNorm(n.titulo + " " + (n.resumen || "")) + " ";
  const hits = a.claves.filter(k => t.includes(" " + k)).length;
  return hits >= Math.min(2, a.claves.length);
}
function asNoticias(a, news){
  const vistos = new Set(), out = [];
  for (const n of [...news, ...(arc.news || [])]) if (!vistos.has(n._key) && asCoincide(a, n)) { vistos.add(n._key); out.push(n); }
  return out.sort((x, y) => String(y.publicado || y._dia).localeCompare(String(x.publicado || x._dia)));
}
const asEsNueva = (a, n) => new Date(n.publicado || n._dia).getTime() > (a.visto || 0);
const asNuevas = (a, news) => asNoticias(a, news).filter(n => asEsNueva(a, n)).length;
const asDe = n => asuntos().find(a => a.semilla === n._key || asCoincide(a, n));

function seguirAsunto(k){
  const n = tarjetas.get(k); if (!n) return;
  const ya = asDe(n);
  if (!ya){
    const a = { id: "a" + Date.now().toString(36), nombre: n.titulo, pueblo: n.municipio || "", claves: asClaves(n.titulo, n.municipio), semilla: n._key, creado: Date.now(), visto: Date.now() };
    guardaAsuntos([a, ...asuntos()]);
    aviso("Siguiendo el asunto. Lo tienes en «Asuntos»");
  }
  abrirSub({ t: "asuntos" });
}
// Al abrir la sección se recuerda qué era nuevo (para marcarlo) y se da por visto
let asAntes = null;
function asMarcaVisto(){
  const l = asuntos(); asAntes = Object.fromEntries(l.map(a => [a.id, a.visto || 0]));
  guardaAsuntos(l.map(a => ({ ...a, visto: Date.now() })));
}
function asAccion(act, b){
  const l = asuntos(), i = l.findIndex(a => a.id === b.dataset.a); if (i < 0) return;
  const a = l[i];
  if (act === "asQuita") a.claves = a.claves.filter(k => k !== b.dataset.k);
  else if (act === "asDeja") { if (!confirm(`¿Dejar de seguir «${a.nombre}»?`)) return; l.splice(i, 1); }
  else if (act === "asNombre") { const v = prompt("Nombre del asunto", a.nombre); if (!v) return; a.nombre = v.trim().slice(0, 120); }
  else if (act === "asMas") { st.asMas = st.asMas === a.id ? null : a.id; render(true); return; }
  guardaAsuntos(l); render(true);
}
function asAnade(form){
  const l = asuntos(), a = l.find(x => x.id === form.dataset.a); if (!a) return;
  const w = asNorm(form.querySelector("input").value).trim().split(/\s+/).filter(x => x.length >= 3).map(asRaiz);
  for (const r of w) if (!a.claves.includes(r)) a.claves.push(r);
  guardaAsuntos(l); render(true);
}
const asFecha = n => { const d = new Date(n.publicado || n._dia); return isNaN(d) ? "" : d.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" }); };
function viewAsuntos(news){
  if (arc.estado === "no") setTimeout(cargaArchivo, 0);   // también lo antiguo
  const l = asuntos();
  let h = `<section class="subhero"><h1>Asuntos</h1><p>Lo que sigues, con todas sus noticias en orden. ${l.length ? plural(l.length, "asunto", "asuntos") + "." : ""}</p></section><div class="feed">`;
  if (!l.length) return h + `<div class="empty"><b>Aún no sigues ningún asunto</b>En cualquier noticia, pulsa el botón <b>Seguir</b> (el del ojo): se creará un asunto con su pueblo y sus palabras clave, y aquí verás todo lo que vaya saliendo sobre él.</div></div>`;
  for (const a of l){
    const lista = asNoticias(a, news), antes = asAntes ? asAntes[a.id] : a.visto, nuevas = lista.filter(n => new Date(n.publicado || n._dia).getTime() > (antes || 0)).length;
    const ver = st.asMas === a.id ? lista : lista.slice(0, 12);
    h += `<section class="asunto">
      <div class="as-cab"><div><h3>${esc(a.nombre)}</h3><span>${CONCRETO_AS(a.pueblo) ? esc(a.pueblo) + " · " : ""}${plural(lista.length, "noticia", "noticias")}${nuevas ? ` · <b class="as-nuevas">${plural(nuevas, "nueva", "nuevas")}</b>` : ""}${arc.estado === "cargando" ? " · buscando en el archivo…" : ""}</span></div>
        <button class="linkbtn" type="button" data-act="asNombre" data-a="${a.id}">Renombrar</button><button class="linkbtn" type="button" data-act="asDeja" data-a="${a.id}">Dejar de seguir</button></div>
      <div class="as-claves"><span>Palabras clave:</span>${a.claves.map(k => `<button type="button" class="as-k" data-act="asQuita" data-a="${a.id}" data-k="${esc(k)}" title="Quitar">${esc(k)}… ×</button>`).join("")}
        <form class="as-mas" data-a="${a.id}"><input type="text" placeholder="Añadir palabra" aria-label="Añadir palabra clave" maxlength="30"><button type="submit">+</button></form></div>
      ${lista.length ? `<ol class="as-linea">${ver.map(n => { const m = mediosDe(n)[0] || {}; const nueva = new Date(n.publicado || n._dia).getTime() > (antes || 0);
        return `<li class="${n.relevancia === "alta" ? "alta" : ""} ${nueva ? "nueva" : ""}"><span class="as-f">${esc(asFecha(n))}</span><div><a href="${esc(safeUrl(m.url) || "#")}" target="_blank" rel="noopener" data-k="${esc(n._key)}">${esc(n.titulo)}</a><span>${esc(n.municipio || "")}${m.nombre ? " · " + esc(m.nombre) : ""}${nueva ? ` · <b>nueva</b>` : ""}</span></div></li>`; }).join("")}</ol>`
        + (lista.length > 12 ? `<button class="btn ghost as-todas" type="button" data-act="asMas" data-a="${a.id}">${st.asMas === a.id ? "Ver menos" : `Ver las ${lista.length}`}</button>` : "")
        : `<div class="empty small">Ninguna noticia coincide. Prueba a quitar alguna palabra clave.</div>`}
    </section>`;
  }
  return h + `</div>`;
}
// Aviso en la portada: novedades en los asuntos que se siguen
function avisoAsuntos(news){
  const l = asuntos(); if (!l.length) return "";
  const con = l.map(a => [a, asNuevas(a, news)]).filter(([, k]) => k);
  if (!con.length) return "";
  return `<button class="as-aviso" type="button" data-act="asuntos"><b>Novedades en lo que sigues:</b> ${con.slice(0, 3).map(([a, k]) => `«${esc(a.nombre.length > 60 ? a.nombre.slice(0, 57) + "…" : a.nombre)}» (${k})`).join(" · ")}${con.length > 3 ? ` y ${con.length - 3} más` : ""} ›</button>`;
}
document.addEventListener("submit", e => { const f = e.target.closest && e.target.closest("form.as-mas"); if (!f) return; e.preventDefault(); seguro("Asuntos", () => asAnade(f)); });
