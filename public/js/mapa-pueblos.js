/* ================= Pueblos: mapa interactivo de la provincia =================
   Cada municipio se colorea según cuántas noticias tiene en el periodo elegido (con los mismos filtros que la lista)
   y en rojo si alguna es importante. Al tocar un pueblo, al lado (ordenador) o debajo (móvil) salen sus noticias.
   · Límites: public/mapa/municipios.json (se prepara con scripts/mapa-municipios.mjs).
   · Leaflet se carga solo al abrir Pueblos. Si no carga (sin conexión, bloqueado…), queda la lista de siempre.
   · El mapa se crea una vez y se conserva entre repintados: al volver a pintar la sección se recoloca, sin parpadeo. */
const LEAFLET = {
  js: ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="],
  css: ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="],
};
let mapaCarga = null;          // promesa: Leaflet + límites
let mapa = null, mapaEl = null, capaMunis = null, capaCifras = null, capaProv = null;
let mapaConteo = {};           // { municipio: { n, a } } del último repintado
let mapaNoticias = [];         // noticias que cuentan en el mapa (mismos filtros que la lista)
let mapaMovido = false;        // la persona ha movido o ampliado el mapa: no se reencuadra solo

function cargaLeaflet(){
  if (window.L) return Promise.resolve();
  const pon = (tag, attrs) => new Promise((ok, mal) => { const e = document.createElement(tag); Object.assign(e, attrs); e.crossOrigin = ""; e.onload = ok; e.onerror = () => mal(new Error("No se pudo cargar " + (attrs.src || attrs.href))); document.head.appendChild(e); });
  return Promise.all([
    pon("link", { rel: "stylesheet", href: LEAFLET.css[0], integrity: LEAFLET.css[1] }),
    pon("script", { src: LEAFLET.js[0], integrity: LEAFLET.js[1] }),
  ]);
}
function preparaMapa(){
  if (!mapaCarga) mapaCarga = Promise.all([cargaLeaflet(), fetch("mapa/municipios.json?v=1").then(r => { if (!r.ok) throw new Error("límites HTTP " + r.status); return r.json(); })])
    .then(([, geo]) => geo)
    .catch(e => { mapaCarga = null; throw e; });
  return mapaCarga;
}

// Paleta: escala de verdes por número de noticias y de rojos si hay alguna importante (claro y oscuro)
const MP_PALETA = {
  claro:  { vacio: "#E6EBE7", borde: "#C3CCC6", prov: "#4C5A55", tinta: "#16201D", verde: ["#B9D8CA", "#7DB59E", "#3F8169", "#1E4A3F"], rojo: ["#F7BCCB", "#EE7393", "#E0234F", "#A5163A"] },
  oscuro: { vacio: "#1A2320", borde: "#2E3A35", prov: "#9AA6A1", tinta: "#E7ECE9", verde: ["#24453B", "#2F6656", "#4F9A82", "#86CAB5"], rojo: ["#4A1A28", "#85263F", "#D42A56", "#FF2E63"] },
};
const mpOscuro = () => { const t = document.documentElement.dataset.theme; return t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); };
const mpPal = () => MP_PALETA[mpOscuro() ? "oscuro" : "claro"];
const mpPaso = n => n >= 8 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0;
function estiloMuni(f){
  const p = mpPal(), k = mapaConteo[f.properties.n], sel = st.mapaSel === f.properties.n;
  if (f.properties.comun) return { color: p.borde, weight: .6, fillColor: p.vacio, fillOpacity: .6, dashArray: "3 3" };
  if (!k) return { color: sel ? p.tinta : p.borde, weight: sel ? 2.5 : .7, fillColor: p.vacio, fillOpacity: 1 };
  const escala = k.a ? p.rojo : p.verde;
  return { color: sel ? p.tinta : mpOscuro() ? "#0E1412" : "#FFFFFF", weight: sel ? 3 : 1.2, fillColor: escala[mpPaso(k.n)], fillOpacity: 1 };
}
// Punto para la etiqueta: el centro del municipio (de su rectángulo)
const puntoDe = capa => capa.getBounds().getCenter();

function mapaRecuento(news){
  mapaNoticias = news.filter(n => enRango(n) && pasa(n) && n.municipio && !["Provincia", "General"].includes(n.municipio));
  mapaConteo = {};
  for (const n of mapaNoticias){ const k = mapaConteo[n.municipio] ||= { n: 0, a: 0 }; k.n++; if (n.relevancia === "alta") k.a++; }
}

// Al lado o debajo del mapa: las noticias del pueblo elegido (sin elegir, se ve la lista de pueblos de la sección)
function mapaPanel(){
  const p = st.mapaSel;
  if (!p) return `<div class="mp-ayuda"><b>Toca un pueblo</b> en el mapa o en la lista para ver sus noticias.</div>`;
  const lista = mapaNoticias.filter(n => n.municipio === p).sort(porHora);
  const k = mapaConteo[p] || { n: 0, a: 0 };
  let h = `<div class="mp-cab"><div><h3>${esc(p)}</h3><span>${k.n ? plural(k.n, "noticia", "noticias") + (k.a ? ` · ${plural(k.a, "importante", "importantes")}` : "") + ` en ${st.rango} días` : `Sin noticias en ${st.rango} días`}</span></div>
    <button class="btn ghost" type="button" data-pueblo="${esc(p)}">Ver todo ›</button><button class="mp-x" type="button" data-act="mapaCierra" aria-label="Cerrar">×</button></div>`;
  h += lista.length ? `<div class="feed">${lista.slice(0, 5).map(n => card(n)).join("")}</div>` + (lista.length > 5 ? `<button class="btn ghost mp-mas" type="button" data-pueblo="${esc(p)}">Ver las ${lista.length} noticias de ${esc(p)} ›</button>` : "")
    : `<div class="empty"><b>Sin noticias recientes</b>Prueba con un periodo más largo o mira todo lo publicado de ${esc(p)}.<br><button class="btn ghost" type="button" data-pueblo="${esc(p)}">Abrir ${esc(p)}</button></div>`;
  return h;
}
function encuadra(){ if (mapa && capaMunis){ mapa.invalidateSize(); mapa.fitBounds(capaMunis.getBounds(), { padding: [10, 10], animate: false }); } }
function mapaElige(nombre, centrar){
  st.mapaSel = nombre || "";
  if (capaMunis) capaMunis.setStyle(estiloMuni);
  pintaCifras();
  const pan = $("#mapaPanel"); if (pan) pan.innerHTML = seguro("el pueblo elegido", mapaPanel, cajaFallo);
  const li = $("#mpLista"); if (li) li.hidden = !!st.mapaSel;
  // Al cerrar el pueblo, el mapa vuelve a la provincia entera
  if (!nombre && mapa){ mapaMovido = false; mapa.fitBounds(capaMunis.getBounds(), { padding: [10, 10] }); }
  if (nombre && capaMunis){
    capaMunis.eachLayer(l => { if (l.feature.properties.n === nombre){ l.bringToFront(); if (centrar){ mapaMovido = true; mapa.fitBounds(l.getBounds(), { maxZoom: 10.5, padding: [40, 40] }); } } });
    // En el móvil, que se vea el principio de la lista sin perder el mapa
    if (pan && !esPC()) setTimeout(() => { const r = pan.getBoundingClientRect(); if (r.top > innerHeight * .75) scrollBy({ top: r.top - innerHeight * .55, behavior: "smooth" }); }, 60);
  }
}

// Etiquetas: cifra siempre; nombre del pueblo al acercar (o del elegido)
function pintaCifras(){
  if (!capaCifras || !capaMunis) return;
  capaCifras.clearLayers();
  capaMunis.eachLayer(l => {
    const p = l.feature.properties, k = mapaConteo[p.n], sel = st.mapaSel === p.n;
    if (p.comun || (!k && !sel)) return;
    const ic = L.divIcon({ className: "mp-eti" + (k && k.a ? " alta" : "") + (sel ? " sel" : "") + (!k ? " cero" : ""), html: `<div><b>${k ? k.n : 0}</b><span>${esc(p.n)}</span></div>`, iconSize: null });
    L.marker(puntoDe(l), { icon: ic, keyboard: false, title: p.n, zIndexOffset: sel ? 1000 : k ? k.n * 10 : 0 }).on("click", () => mapaElige(p.n)).addTo(capaCifras);
  });
}
const mpZoomClase = () => { if (mapaEl && mapa) mapaEl.classList.toggle("mp-cerca", mapa.getZoom() >= 9.5); };

// Se llama después de pintar la sección Pueblos
function mapaMonta(news){
  const hueco = $("#mapaPueblos"); if (!hueco) return;
  mapaRecuento(news);
  const pan = $("#mapaPanel"); if (pan) pan.innerHTML = seguro("el pueblo elegido", mapaPanel, cajaFallo);
  // Mapa ya creado: se vuelve a colocar en su sitio y se recolorea
  if (mapa && mapaEl){
    hueco.replaceWith(mapaEl);
    mapa.invalidateSize();
    if (!mapaMovido) encuadra();
    capaMunis.setStyle(estiloMuni); pintaCifras();
    return;
  }
  hueco.innerHTML = `<div class="mp-carga">Cargando el mapa…</div>`;
  preparaMapa().then(geo => {
    const sitio = $("#mapaPueblos"); if (!sitio) return;   // se cambió de sección mientras cargaba
    if (mapa && mapaEl){ sitio.replaceWith(mapaEl); encuadra(); return; }
    sitio.innerHTML = "";
    mapaEl = sitio;
    mapa = L.map(sitio, { zoomSnap: .25, zoomDelta: .5, attributionControl: true, scrollWheelZoom: false, zoomControl: true, minZoom: 7, maxZoom: 13, keyboard: false });
    mapa.attributionControl.setPrefix("").addAttribution("Límites municipales: IGN");
    capaMunis = L.geoJSON(geo, {
      style: estiloMuni,
      onEachFeature: (f, l) => {
        if (f.properties.comun) { l.bindTooltip("Común de Sepúlveda y Riaza (no es un municipio)", { sticky: true, className: "mp-tip" }); return; }
        l.bindTooltip(() => { const k = mapaConteo[f.properties.n]; return `<b>${esc(f.properties.n)}</b><br>${k ? plural(k.n, "noticia", "noticias") + (k.a ? ` · ${plural(k.a, "importante", "importantes")}` : "") : "Sin noticias"}`; }, { sticky: true, direction: "top", className: "mp-tip" });
        l.on("click", () => mapaElige(f.properties.n));
        // Resalte al pasar el ratón
        l.on("mouseover", () => { if (st.mapaSel !== f.properties.n) l.setStyle({ weight: 2.5, color: mpPal().tinta }); });
        l.on("mouseout", () => l.setStyle(estiloMuni(f)));
      },
    }).addTo(mapa);
    capaProv = L.geoJSON({ type: "Feature", geometry: geo.provincia }, { interactive: false, style: () => ({ color: mpPal().prov, weight: 2.2, fill: false, opacity: .9 }) }).addTo(mapa);
    capaCifras = L.layerGroup().addTo(mapa);
    // Leyenda
    const ley = L.control({ position: "bottomleft" });
    ley.onAdd = () => { const d = L.DomUtil.create("div", "mp-ley"); const p = mpPal();
      d.innerHTML = `<span>Menos</span>${p.verde.map(c => `<i style="background:${c}"></i>`).join("")}<span>Más</span><i class="r" style="background:${p.rojo[2]}"></i><span>Con importantes</span>`; return d; };
    ley.addTo(mapa);
    requestAnimationFrame(encuadra);
    // Si cambia el tamaño (girar el móvil, ventana) y nadie ha movido el mapa, la provincia vuelve a encajar entera
    mapa.on("resize", () => { if (!mapaMovido) encuadra(); });
    mapa.on("dragstart", () => { mapaMovido = true; });
    mapa.getContainer().addEventListener("wheel", () => { if (mapa.scrollWheelZoom.enabled()) mapaMovido = true; }, { passive: true });
    mapa.on("zoomend", mpZoomClase);
    mapa.zoomControl.getContainer().addEventListener("click", () => { mapaMovido = true; });
    // La rueda del ratón solo amplía tras hacer clic en el mapa (si no, al bajar por la página se quedaría atrapada)
    mapa.on("click", () => mapa.scrollWheelZoom.enable()); mapa.on("mouseout", () => mapa.scrollWheelZoom.disable());
    // Botón para volver a ver la provincia entera
    const ver = L.control({ position: "topleft" });
    ver.onAdd = () => { const b = L.DomUtil.create("button", "mp-todo"); b.type = "button"; b.title = "Ver toda la provincia"; b.textContent = "Provincia";
      L.DomEvent.on(b, "click", e => { L.DomEvent.stop(e); mapaMovido = false; encuadra(); }); return b; };
    ver.addTo(mapa);
    pintaCifras(); mpZoomClase();
    if (st.mapaSel) mapaElige(st.mapaSel);
  }).catch(e => {
    console.warn("[Prensa Segovia] Mapa de pueblos:", e);
    const sitio = $("#mapaPueblos"); if (sitio) sitio.innerHTML = `<div class="mp-carga">No se pudo cargar el mapa. La lista de pueblos sigue abajo.</div>`;
  });
}
// Buscar un pueblo en la caja de búsqueda: si solo queda uno, el mapa va a él
function mapaBusca(){
  if (!capaMunis || !st.townQ || st.townQ.length < 3) return;
  const q = norm(st.townQ), hay = []; capaMunis.eachLayer(l => { if (!l.feature.properties.comun && norm(l.feature.properties.n).includes(q)) hay.push(l); });
  if (hay.length === 1){ mapaMovido = true; mapa.fitBounds(hay[0].getBounds(), { maxZoom: 10.5, padding: [40, 40] }); }
}
// Cambio de tema claro/oscuro: se recolorea
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (capaMunis){ capaMunis.setStyle(estiloMuni); capaProv?.setStyle({ color: mpPal().prov }); } });
