// Recopila noticias de la provincia de Segovia desde RSS y Google Noticias,
// las clasifica por pueblo, tema y relevancia, y actualiza public/datos.json.
import { XMLParser } from "fast-xml-parser";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { MUNICIPIOS, AMBIGUOS, ALIAS, BARRIOS_CAPITAL } from "./municipios.mjs";

const SALIDA = new URL("../public/datos.json", import.meta.url);
const DIAS_HISTORICO = 30;
const HORAS_VENTANA = 72;          // se aceptan noticias publicadas en las últimas 72 h
const TZ = "Europe/Madrid";

/* ------------------------------------------------------------------ */
/* Fuentes                                                             */
/* ------------------------------------------------------------------ */
// Feeds directos de medios. Para cada uno se prueban varias direcciones y se usa la primera que funcione.
const FEEDS = [
  { nombre: "SegoviaUdaz", urls: ["https://segoviaudaz.es/feed/"] },
  { nombre: "esCuéllar", urls: ["https://escuellar.es/feed/"] },
  { nombre: "El Adelantado", urls: ["https://www.eladelantado.com/feed/", "https://www.eladelantado.com/rss/"] },
  { nombre: "Tribuna de Segovia", urls: ["https://www.tribunasegovia.com/rss/", "https://www.tribunasegovia.com/feed/", "https://www.tribunasegovia.com/rss"] },
  { nombre: "El Día de Segovia", urls: ["https://www.eldiasegovia.es/rss/", "https://www.eldiasegovia.es/rss/portada.xml", "https://www.eldiasegovia.es/feed/"] },
  { nombre: "El Norte de Castilla", urls: ["https://www.elnortedecastilla.es/rss/2.0/?section=segovia", "https://www.elnortedecastilla.es/rss/2.0/portada"], soloSiMenciona: true },
  { nombre: "Segovia al día", urls: ["https://segoviaaldia.es/rss/", "https://segoviaaldia.es/feed/", "https://segoviaaldia.es/rss"] },
  { nombre: "El Nordeste de Segovia", urls: ["https://www.elnordestedesegovia.es/?format=feed&type=rss", "https://www.elnordestedesegovia.es/index.php?format=feed&type=rss"] },
  { nombre: "El Espinar Información", urls: ["https://www.elespinar.org/feeds/posts/default?alt=rss"] },
  { nombre: "Diario de Castilla y León", urls: ["https://www.diariodecastillayleon.es/rss/segovia/", "https://www.diariodecastillayleon.es/segovia/rss/"], soloSiMenciona: true },
];

// Búsquedas en Google Noticias (cubren también radios, agencias y medios sin RSS propio)
const BUSQUEDAS = [
  'Segovia',
  '"Guardia Civil" Segovia',
  'Segovia detenido OR detenidos OR investigado',
  'Segovia accidente OR incendio OR rescate OR herido',
  'Segovia concentración OR manifestación OR protesta OR huelga',
  'Segovia pleno OR alcalde OR ayuntamiento',
  'Cuéllar Segovia',
  '"El Espinar" OR "San Rafael" Segovia',
  '"La Granja" OR "San Ildefonso" OR Valsaín Segovia',
  '(Cantalejo OR Riaza OR Sepúlveda OR Ayllón OR Boceguillas) Segovia',
  '(Villacastín OR "Nava de la Asunción" OR "Carbonero el Mayor" OR "Navas de Oro") Segovia',
  '("Palazuelos de Eresma" OR "La Lastrilla" OR "San Cristóbal de Segovia" OR Torrecaballeros) Segovia',
  '(Turégano OR Fuentepelayo OR Aguilafuente OR Cantimpalos OR Pedraza) Segovia',
  '("Santa María la Real de Nieva" OR Coca OR Bernardos OR Navalmanzano) Segovia',
];
// Solo se aceptan resultados de Google Noticias de estos medios (o de cualquiera con "Segovia" o "Castilla" en el nombre)
const MEDIOS_OK = /segovia|castilla|cuellar|nordeste|adelantado|norte de castilla|ical|europa press|cope|cadena ser|onda cero|rtvcyl|la 8|cyltv|el espanol|el mundo|abc|la razon|20 ?minutos|rtve|eldiario|el pais|efe|infolibre|la sexta|antena 3|telecinco|cuatro|el confidencial|okdiario|libertad digital|vozpopuli|nius|la vanguardia|el periodico|publico|huffpost|niusdiario|noticiascyl|tribuna|guardia civil|interior|ministerio|junta|diputacion|ayuntamiento|subdelegacion|112/;
const gnews = q => `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:3d")}&hl=es&gl=ES&ceid=ES:es`;

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const limpia = html => String(html ?? "")
  .replace(/<!\[CDATA\[|\]\]>/g, "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;(?=#?\w+;)/g, "&")
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();
const recorta = (s, n = 260) => s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n)) + "…";
const hash = s => createHash("sha1").update(s).digest("hex").slice(0, 12);
const fechaMadrid = d => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const horaMadrid = d => new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", textNodeName: "#text", cdataPropName: false, processEntities: false, htmlEntities: false });

async function descarga(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PrensaSegovia/1.0; +https://github.com)", "Accept": "application/rss+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(20000), redirect: "follow",
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const txt = await r.text();
  if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(txt.slice(0, 2000))) throw new Error("no es un feed");
  return txt;
}

function items(xml) {
  const d = parser.parse(xml);
  const lista = d?.rss?.channel?.item ?? d?.feed?.entry ?? d?.["rdf:RDF"]?.item ?? [];
  return (Array.isArray(lista) ? lista : [lista]).map(it => {
    const txt = v => typeof v === "object" && v !== null ? (v["#text"] ?? "") : (v ?? "");
    let link = it.link;
    if (Array.isArray(link)) link = (link.find(l => l?.["@rel"] === "alternate") ?? link[0]);
    link = typeof link === "object" ? (link?.["@href"] ?? link?.["#text"]) : link;
    return {
      titulo: limpia(txt(it.title)),
      url: String(link ?? "").trim(),
      fecha: new Date(txt(it.pubDate) || txt(it.published) || txt(it.updated) || txt(it["dc:date"]) || Date.now()),
      texto: limpia(txt(it.description) || txt(it.summary) || txt(it["content:encoded"]) || txt(it.content)),
      fuente: limpia(txt(it.source)),
    };
  }).filter(x => x.titulo && /^https?:\/\//.test(x.url));
}

/* ------------------------------------------------------------------ */
/* Clasificación                                                       */
/* ------------------------------------------------------------------ */
const MUNIS = [
  ...MUNICIPIOS.map(m => [m, m]),
  ...Object.entries(ALIAS).map(([a, m]) => [a, m]),
  ...BARRIOS_CAPITAL.map(b => [b, "Segovia"]),
].sort((a, b) => b[0].length - a[0].length);
const MUNI_RE = MUNIS.map(([nombre, municipio]) => {
  const n = reEsc(nombre);
  const pre = AMBIGUOS.has(nombre) ? "(?:\\b(?:en|de|a|desde|hacia|vecinos de|localidad de|municipio de|pueblo de)\\s)" : "(?:^|[^\\p{L}])";
  return { municipio, re: new RegExp(pre + "(" + n + ")(?![\\p{L}])", "u") };
});

const PERMITIDOS_ANTES = new Set(["Ayuntamiento","Villa","Comunidad","Tierra","Real","Sitio","Plaza","Colegio","Instituto","Club","Diputación","Alcalde","Alcaldesa","Centro","Hoces","Castillo","Feria","Fiestas","Polígono","Calle","Carretera","Puerto","Estación","Mancomunidad","Partido","Juzgado","Cuartel","Puesto","Municipio","Pueblo","Localidad","Noticias","Vecinos","Segovia","Provincia","Hoy","Ayer"]);
function municipioDe(texto) {
  let t = " " + texto + " ";
  const hallados = [];
  for (const { municipio, re } of MUNI_RE) {
    const m = t.match(re);
    if (m) {
      const antes = t.slice(Math.max(0, m.index + m[0].indexOf(m[1]) - 30), m.index + m[0].indexOf(m[1]));
      const prev = antes.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)[\s-]+$/u);
      const esApellido = prev && !PERMITIDOS_ANTES.has(prev[1]);
      if (municipio && !esApellido) hallados.push(municipio);
      t = t.replace(m[1], " ".repeat(m[1].length)); // evita que "Nieva" vuelva a contar dentro de "Santa María la Real de Nieva"
    }
  }
  const unicos = [...new Set(hallados)];
  const pueblos = unicos.filter(m => m !== "Segovia");
  if (pueblos.length === 1) return pueblos[0];
  if (pueblos.length > 1) return "Provincia";
  if (unicos.includes("Segovia")) return "Segovia";
  const n = norm(texto);
  if (/\bprovincia\b|diputacion|pueblos de segovia|toda segovia|comarca/.test(n)) return "Provincia";
  return /segovia/.test(n) ? "Segovia" : "Provincia";
}

const PATRONES = {
  policial: /guardia civil|policia|detenid|detencion|arrest|investigad|robo|robar|hurto|estafa|timo|droga|marihuana|cocaina|juzgado|tribunal|audiencia provincial|condena|juicio|prision|carcel|penitenciari|agresion|agredid|violencia de genero|maltrato|delito|operacion|okupa|atraco|sustraccion|incautad|furtiv|apunal|reyerta|pelea|seprona|antidroga|narcotrafico/,
  social: /concentracion|manifestacion|protesta|huelga|paros parciales|plataforma|colectivo|movilizacion|reivindica|pancarta|sindicat|ccoo|ugt|asociacion vecinal|vecinos (denuncian|protestan|reclaman|se oponen)|recogida de firmas|marea blanca|en contra de|se oponen|rechazo vecinal|cacerolada|encierro de protesta/,
  politica: /pleno|alcalde|alcaldesa|concejal|ayuntamiento|diputacion|junta de castilla|cortes de castilla|consejer|subdelegad|delegado del gobierno|procurador|senador|diputad[oa]|ministr|\bpp\b|psoe|\bvox\b|podemos|izquierda unida|ciudadanos|elecciones|mocion|presupuesto municipal|ordenanza|partido popular|partido socialista/,
  emergencias: /accidente|colision|choque|salida de via|atropell|herid|fallec|muere|murio|incendio|fuego|bomberos|rescat|112|desaparecid|inundacion|nevada|temporal|aviso (amarillo|naranja|rojo)|corte de (la )?carretera|trafico|\bdgt\b|\ba-1\b|\ba-6\b|\bap-6\b|\bap-61\b|n-110|n-603|cl-6\d\d|sg-\d|evacuad|derrumbe|explosion/,
  economia: /empresa|empleo|paro registrado|inversion|millones de euros|industria|agricultor|ganader|poligono|comercio|negocio|turismo|hosteleria|subvencion|ayudas|precio/,
  sociedad: /sanidad|centro de salud|consultorio|hospital|colegio|instituto|educacion|vivienda|mayores|residencia|despoblacion|servicios sociales|universidad|medico/,
  cultura: /fiesta|fiestas|concierto|festival|teatro|exposicion|feria|romeria|procesion|halloween|certamen|museo|cine|libro|patrimonio|musica|danza|tradicion/,
  deportes: /futbol|gimnastica segoviana|baloncesto|balonmano|atletismo|carrera popular|maraton|ciclismo|liga|campeonato|club deportivo|tenis|padel|deportista|jornada \d/,
};
const ALTA = /detenid|detien|detencion|arrest|guardia civil (ha )?(detenido|investiga|esclarece|desarticula)|operacion|fallec|muere|murio|mortal|herido grave|incendio|desaparecid|rescat|concentracion|manifestacion|protesta|huelga|movilizacion|okupa|agresion|violencia de genero|reyerta|apunal|evacuad|plataforma .* (contra|rechaza)|corte de (la )?carretera/;

function clasifica(titulo, texto, municipio) {
  const t = norm(titulo + " " + texto);
  const tt = norm(titulo);
  let categorias = Object.keys(PATRONES).filter(k => PATRONES[k].test(tt));
  if (!categorias.length) categorias = Object.keys(PATRONES).filter(k => PATRONES[k].test(t)).slice(0, 2);
  if (!categorias.length) categorias = ["sociedad"];
  categorias = categorias.slice(0, 3);
  let relevancia = "baja";
  if (ALTA.test(t) && categorias.some(c => ["policial", "social", "emergencias"].includes(c))) relevancia = "alta";
  else if (categorias.some(c => ["policial", "social", "emergencias", "politica"].includes(c))) relevancia = "media";
  if (municipio === "Segovia" && relevancia === "alta") relevancia = "media";
  return { categorias, relevancia };
}

/* Fecha de convocatoria: "el próximo sábado", "el 14 de noviembre", "a las 19:00" */
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
function eventoDe(titulo, texto, publicada) {
  const t = norm(titulo + " " + texto);
  if (!/convoca|concentracion|manifestacion|huelga|pleno|marcha|protesta|celebrara|tendra lugar|se celebra|movilizacion|paros/.test(t)) return {};
  const base = new Date(fechaMadrid(publicada) + "T12:00:00");
  let f = null;
  const m = t.match(/\b(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/);
  if (m) {
    f = new Date(base); f.setMonth(MESES.indexOf(m[2]), +m[1]);
    if (f < base) f.setFullYear(f.getFullYear() + 1);
    if ((f - base) / 864e5 > 90) f = null;
  } else {
    const d = t.match(/\b(este|el proximo|proximo|el) (lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);
    if (d) { f = new Date(base); const delta = (DIAS.indexOf(d[2]) - f.getDay() + 7) % 7 || 7; f.setDate(f.getDate() + delta); }
    else if (/\b(hoy|esta tarde|esta manana)\b/.test(t)) f = new Date(base);
    else if (/\bmanana\b/.test(t) && !/esta manana/.test(t)) { f = new Date(base); f.setDate(f.getDate() + 1); }
  }
  if (!f) return {};
  const h = t.match(/a las (\d{1,2})(?:[:.](\d{2}))?\s*(?:h|horas)?/);
  const out = { fecha_evento: f.toISOString().slice(0, 10) };
  if (h && +h[1] < 24) out.hora_evento = String(h[1]).padStart(2, "0") + ":" + (h[2] ?? "00");
  return out;
}

const MENCIONA_SEGOVIA = new RegExp("segovia|" + MUNICIPIOS.filter(m => !AMBIGUOS.has(m) && m.length > 5).map(m => reEsc(norm(m))).join("|"));

/* ------------------------------------------------------------------ */
/* Agrupar duplicados                                                  */
/* ------------------------------------------------------------------ */
const VACIAS = new Set("el la los las un una unos unas de del al a en y o u que se su sus por para con sin sobre tras ante entre como mas lo le les es son ha han segovia segoviano segoviana provincia".split(" "));
const tokens = s => new Set(norm(s).replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter(w => w.length > 2 && !VACIAS.has(w)));
function parecido(a, b) {
  let comun = 0; for (const w of a) if (b.has(w)) comun++;
  return comun / Math.min(a.size, b.size || 1);
}

/* ------------------------------------------------------------------ */
/* Principal                                                           */
/* ------------------------------------------------------------------ */
async function main() {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() - HORAS_VENTANA * 36e5);
  const estado = [];
  const brutos = [];

  // 1) Feeds de medios
  for (const f of FEEDS) {
    let ok = false, error = "";
    for (const url of f.urls) {
      try {
        const its = items(await descarga(url));
        let n = 0;
        for (const it of its) {
          if (f.soloSiMenciona && !MENCIONA_SEGOVIA.test(norm(it.titulo + " " + it.texto))) continue;
          brutos.push({ ...it, medio: f.nombre, directo: true }); n++;
        }
        estado.push({ fuente: f.nombre, ok: true, noticias: n }); ok = true; break;
      } catch (e) { error = e.message; }
    }
    if (!ok) estado.push({ fuente: f.nombre, ok: false, error });
  }

  // 2) Google Noticias
  let gTotal = 0, gFallos = 0;
  for (const q of BUSQUEDAS) {
    try {
      for (const it of items(await descarga(gnews(q)))) {
        let titulo = it.titulo, medio = (it.fuente || "Google Noticias").replace(/[.\s]+$/, "");
        if (it.fuente && titulo.endsWith(" - " + it.fuente)) titulo = titulo.slice(0, -(it.fuente.length + 3));
        const texto = norm(it.texto) === norm(it.titulo) || norm(it.texto).startsWith(norm(titulo)) ? "" : it.texto;
        if (!MEDIOS_OK.test(norm(medio))) continue;
        if (!MENCIONA_SEGOVIA.test(norm(titulo + " " + texto))) continue;
        brutos.push({ ...it, titulo, texto, medio, directo: false }); gTotal++;
      }
    } catch (e) { gFallos++; }
    await new Promise(r => setTimeout(r, 700));
  }
  estado.push({ fuente: "Google Noticias", ok: gFallos < BUSQUEDAS.length, noticias: gTotal, error: gFallos ? `${gFallos} búsquedas fallidas` : undefined });

  // 3) Filtrar por fecha y agrupar duplicados (las de medios directos primero: traen mejor enlace y entradilla)
  const recientes = brutos.filter(b => !isNaN(b.fecha) && b.fecha >= limite && b.fecha <= new Date(ahora.getTime() + 36e5))
                          .sort((a, b) => (b.directo - a.directo) || (b.fecha - a.fecha));
  const grupos = [];
  for (const b of recientes) {
    const tk = tokens(b.titulo);
    if (tk.size < 2) continue;
    const g = grupos.find(g => parecido(g.tk, tk) >= 0.6);
    if (g) {
      if (!g.medios.some(m => norm(m.nombre) === norm(b.medio)) && g.medios.length < 5) g.medios.push({ nombre: b.medio, url: b.url });
      if (!g.texto && b.texto) g.texto = b.texto;
      if (b.fecha < g.fecha) g.fecha = b.fecha;
    } else grupos.push({ tk, titulo: b.titulo, texto: b.texto, fecha: b.fecha, medios: [{ nombre: b.medio, url: b.url }] });
  }

  // 4) Clasificar
  const nuevas = grupos.map(g => {
    const resumen = g.texto ? recorta(g.texto) : "";
    const municipio = municipioDe(g.titulo + " " + resumen);
    const { categorias, relevancia } = clasifica(g.titulo, resumen, municipio);
    return {
      id: hash(norm(g.titulo)),
      titulo: g.titulo, resumen, categorias, municipio, relevancia,
      ...eventoDe(g.titulo, resumen, g.fecha),
      medios: g.medios,
      hora: horaMadrid(g.fecha),
      _dia: fechaMadrid(g.fecha),
    };
  });

  // 5) Fusionar con el histórico
  let previo = { dias: [] };
  try { previo = JSON.parse(await readFile(SALIDA, "utf8")); } catch {}
  const porDia = new Map((previo.dias || []).map(d => [d.fecha, { ...d, noticias: [...(d.noticias || [])] }]));
  const existentes = [...porDia.values()].flatMap(d => d.noticias.map(n => ({ n, tk: tokens(n.titulo) })));
  let añadidas = 0;
  for (const n of nuevas) {
    const tk = tokens(n.titulo);
    const ya = existentes.find(e => e.n.id === n.id || parecido(e.tk, tk) >= 0.6);
    if (ya) { // añade enlaces de otros medios a la que ya estaba
      for (const m of n.medios) if (!ya.n.medios.some(x => norm(x.nombre) === norm(m.nombre)) && ya.n.medios.length < 5) ya.n.medios.push(m);
      continue;
    }
    const { _dia, ...limpio } = n;
    if (!porDia.has(_dia)) porDia.set(_dia, { fecha: _dia, noticias: [] });
    porDia.get(_dia).noticias.push(limpio);
    existentes.push({ n: limpio, tk });
    añadidas++;
  }
  const hoy = fechaMadrid(ahora);
  if (!porDia.has(hoy)) porDia.set(hoy, { fecha: hoy, noticias: [] });
  porDia.get(hoy).generado = horaMadrid(ahora);
  const corte = fechaMadrid(new Date(ahora.getTime() - DIAS_HISTORICO * 864e5));
  const dias = [...porDia.values()].filter(d => d.fecha >= corte).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const salida = {
    actualizado: `${hoy} ${horaMadrid(ahora)}`,
    fuentes: estado,
    dias,
  };
  await writeFile(SALIDA, JSON.stringify(salida, null, 0));
  console.log(`Noticias leídas: ${brutos.length}. Agrupadas: ${grupos.length}. Nuevas añadidas: ${añadidas}.`);
  for (const e of estado) console.log(` - ${e.fuente}: ${e.ok ? "ok (" + e.noticias + ")" : "FALLO " + e.error}`);
}

main().catch(e => { console.error(e); process.exit(1); });
