/* ================= Pueblos: mapa interactivo de la provincia =================
   Cada municipio se colorea según cuántas noticias tiene en el periodo elegido (con los mismos filtros que la lista)
   y se marca en rojo si alguna es importante. Al tocar un pueblo, debajo del mapa salen sus noticias.
   · Límites: public/mapa/municipios.json (se prepara con scripts/mapa-municipios.mjs).
   · Leaflet se carga solo al abrir Pueblos. Si no carga (sin conexión, bloqueado…), queda la lista de siempre.
   · El mapa se crea una vez y se conserva entre repintados: al volver a pintar la sección se recoloca, sin parpadeo. */
const LEAFLET = {
  js: ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="],
  css: ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="],
};
let mapaCarga = null;          // promesa: Leaflet + límites
let mapa = null, mapaEl = null, capaMunis = null, capaCifras = null;
let mapaConteo = {};           // { municipio: { n, a } } del último repintado
let mapaNoticias = [];         // noticias que cuentan en el mapa (mismos filtros que la lista)

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

// Colores del tema (claro u oscuro) leídos de las variables de la web
function mapaColores(){
  const v = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const oscuro = matchMedia("(prefers-color-scheme: dark)").matches ? document.documentElement.dataset.theme !== "light" : document.documentElement.dataset.theme === "dark";
  return { oscuro, linea: v("--line") || "#ccc", tinta: v("--ink") || "#222", fondo: v("--surface") || "#fff",
    verde: oscuro ? "#86CAB5" : "#1E4A3F", alta: oscuro ? "#FF7A6B" : "#C2362B", vacio: oscuro ? "#1d2622" : "#f3f5f2" };
}
const mapaNivel = n => n >= 6 ? .78 : n >= 3 ? .56 : n >= 1 ? .34 : 0;
function estiloMuni(f){
  const c = mapaColores(), k = mapaConteo[f.properties.n], sel = st.mapaSel === f.properties.n;
  if (f.properties.comun) return { color: c.linea, weight: .6, fillColor: c.vacio, fillOpacity: .5, dashArray: "2 3" };
  const n = k ? k.n : 0;
  return {
    color: sel ? c.tinta : k && k.a ? c.alta : c.linea,
    weight: sel ? 3 : k && k.a ? 2 : .8,
    fillColor: k && k.a ? c.alta : n ? c.verde : c.vacio,
    fillOpacity: n ? (k.a ? Math.max(.42, mapaNivel(n)) : mapaNivel(n)) : .55,
  };
}
// Punto para la cifra: el centro del municipio (de su rectángulo)
const puntoDe = capa => capa.getBounds().getCenter();

function mapaRecuento(news){
  mapaNoticias = news.filter(n => enRango(n) && pasa(n) && n.municipio && !["Provincia", "General"].includes(n.municipio));
  mapaConteo = {};
  for (const n of mapaNoticias){ const k = mapaConteo[n.municipio] ||= { n: 0, a: 0 }; k.n++; if (n.relevancia === "alta") k.a++; }
}

// Lo que sale debajo del mapa: las noticias del pueblo elegido
function mapaPanel(){
  const p = st.mapaSel;
  if (!p) return `<div class="mp-ayuda">Toca un pueblo en el mapa para ver sus noticias. Cuanto más intenso el color, más noticias; en rojo, los que tienen alguna importante.</div>`;
  const lista = mapaNoticias.filter(n => n.municipio === p).sort(porHora);
  const k = mapaConteo[p] || { n: 0, a: 0 };
  let h = `<div class="mp-cab"><div><h3>${esc(p)}</h3><span>${k.n ? plural(k.n, "noticia", "noticias") + (k.a ? ` · ${plural(k.a, "importante", "importantes")}` : "") + ` en ${st.rango} días` : `Sin noticias en ${st.rango} días`}</span></div>
    <button class="btn ghost" type="button" data-pueblo="${esc(p)}">Ver todo ›</button><button class="mp-x" type="button" data-act="mapaCierra" aria-label="Cerrar">×</button></div>`;
  h += lista.length ? `<div class="feed">${lista.slice(0, 5).map(n => card(n)).join("")}</div>` + (lista.length > 5 ? `<button class="btn ghost mp-mas" type="button" data-pueblo="${esc(p)}">Ver las ${lista.length} noticias de ${esc(p)} ›</button>` : "")
    : `<div class="empty"><b>Sin noticias recientes</b>Prueba con un periodo más largo o mira todo lo publicado de ${esc(p)}.<br><button class="btn ghost" type="button" data-pueblo="${esc(p)}">Abrir ${esc(p)}</button></div>`;
  return h;
}
function mapaElige(nombre, centrar){
  st.mapaSel = nombre || "";
  if (capaMunis) capaMunis.setStyle(estiloMuni);
  const pan = $("#mapaPanel"); if (pan) pan.innerHTML = seguro("el pueblo elegido", mapaPanel, cajaFallo);
  if (nombre && capaMunis){
    capaMunis.eachLayer(l => { if (l.feature.properties.n === nombre){ l.bringToFront(); if (centrar) mapa.fitBounds(l.getBounds(), { maxZoom: 11, padding: [30, 30] }); } });
    // En el móvil, que se vea el principio de la lista sin perder el mapa
    if (pan && !esPC()) setTimeout(() => { const r = pan.getBoundingClientRect(); if (r.top > innerHeight * .75) scrollBy({ top: r.top - innerHeight * .55, behavior: "smooth" }); }, 60);
  }
}

function pintaCifras(){
  if (!capaCifras) return;
  capaCifras.clearLayers();
  capaMunis.eachLayer(l => {
    const p = l.feature.properties, k = mapaConteo[p.n];
    if (!k || p.comun) return;
    const ic = L.divIcon({ className: "mp-cifra" + (k.a ? " alta" : ""), html: String(k.n), iconSize: null });
    L.marker(puntoDe(l), { icon: ic, keyboard: false, title: p.n }).on("click", () => mapaElige(p.n)).addTo(capaCifras);
  });
}

// Se llama después de pintar la sección Pueblos
function mapaMonta(news){
  const hueco = $("#mapaPueblos"); if (!hueco) return;
  mapaRecuento(news);
  const pan = $("#mapaPanel"); if (pan) pan.innerHTML = seguro("el pueblo elegido", mapaPanel, cajaFallo);
  // Mapa ya creado: se vuelve a colocar en su sitio y se recolorea
  if (mapa && mapaEl){
    hueco.replaceWith(mapaEl);
    mapa.invalidateSize();
    capaMunis.setStyle(estiloMuni); pintaCifras();
    return;
  }
  hueco.innerHTML = `<div class="mp-carga">Cargando el mapa…</div>`;
  preparaMapa().then(geo => {
    const sitio = $("#mapaPueblos"); if (!sitio) return;   // se cambió de sección mientras cargaba
    if (mapa && mapaEl){ sitio.replaceWith(mapaEl); mapa.invalidateSize(); return; }
    sitio.innerHTML = "";
    mapaEl = sitio;
    mapa = L.map(sitio, { zoomSnap: .25, attributionControl: true, scrollWheelZoom: false, zoomControl: true, minZoom: 7, maxZoom: 13 });
    mapa.attributionControl.setPrefix("").addAttribution("Límites: IGN");
    const c = mapaColores();
    L.geoJSON({ type: "Feature", geometry: geo.provincia }, { interactive: false, style: { color: c.tinta, weight: 2, fill: false, opacity: .55 } }).addTo(mapa);
    capaMunis = L.geoJSON(geo, {
      style: estiloMuni,
      onEachFeature: (f, l) => {
        if (f.properties.comun) { l.bindTooltip("Común de Sepúlveda y Riaza (no es un municipio)", { sticky: true }); return; }
        l.bindTooltip(() => { const k = mapaConteo[f.properties.n]; return `<b>${esc(f.properties.n)}</b><br>${k ? plural(k.n, "noticia", "noticias") + (k.a ? ` · ${plural(k.a, "importante", "importantes")}` : "") : "Sin noticias"}`; }, { sticky: true, direction: "top", className: "mp-tip" });
        l.on("click", () => mapaElige(f.properties.n));
      },
    }).addTo(mapa);
    capaCifras = L.layerGroup().addTo(mapa);
    mapa.fitBounds(capaMunis.getBounds(), { padding: [6, 6] });
    // Si cambia el tamaño (girar el móvil, ventana) y no hay un pueblo elegido, la provincia vuelve a encajar entera
    mapa.on("resize", () => { if (!st.mapaSel) mapa.fitBounds(capaMunis.getBounds(), { padding: [6, 6] }); });
    // La rueda del ratón solo amplía tras hacer clic en el mapa (si no, al bajar por la página se quedaría atrapada)
    mapa.on("click", () => mapa.scrollWheelZoom.enable()); mapa.on("mouseout", () => mapa.scrollWheelZoom.disable());
    pintaCifras();
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
  if (hay.length === 1) mapa.fitBounds(hay[0].getBounds(), { maxZoom: 11, padding: [30, 30] });
}
