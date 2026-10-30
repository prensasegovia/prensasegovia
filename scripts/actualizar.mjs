// Recopila noticias de la provincia de Segovia desde RSS y Google Noticias,
// las clasifica por pueblo, tema y relevancia, y actualiza public/datos.json.
import { XMLParser } from "fast-xml-parser";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { MUNICIPIOS, AMBIGUOS, ALIAS, BARRIOS_CAPITAL } from "./municipios.mjs";

const SALIDA = new URL("../public/datos.json", import.meta.url);
const DIAS_HISTORICO = 21;
const HORAS_VENTANA = 72;          // se aceptan noticias publicadas en las últimas 72 h
const TZ = "Europe/Madrid";

/* ------------------------------------------------------------------ */
/* Fuentes                                                             */
/* ------------------------------------------------------------------ */
// Feeds directos de medios. Para cada uno se prueban varias direcciones y se usa la primera que funcione.
// todas: lee todas las URLs (no solo la primera que funcione). pueblo: municipio por defecto si la noticia no lo dice.
const FEEDS = [
  { nombre: "SegoviaUdaz", urls: ["https://segoviaudaz.es/feed/"] },
  { nombre: "esCuéllar", urls: ["https://escuellar.es/feed/"] },
  { nombre: "El Adelantado", urls: ["https://www.eladelantado.com/feed/", "https://www.eladelantado.com/rss/"] },
  { nombre: "Tribuna de Segovia", urls: ["https://www.tribunasegovia.com/rss.xml"] },
  { nombre: "El Día de Segovia", urls: ["http://www.eldiasegovia.es/rss/DSGProvincia.xml", "http://www.eldiasegovia.es/RSS/DSGlocal.xml", "http://www.eldiasegovia.es/RSS/DSGPortada.xml"], todas: true },
  { nombre: "El Norte de Castilla", urls: ["https://www.elnortedecastilla.es/rss/2.0/?section=segovia", "https://www.elnortedecastilla.es/rss/2.0/portada"], soloSiMenciona: true },
  { nombre: "Segovia Directo", urls: ["https://segoviadirecto.com/coverrss"] },
  { nombre: "Segovia 24/7", urls: ["http://segovia247.es/coverrss"] },
  { nombre: "Segovia al día", urls: ["https://segoviaaldia.es/coverrss"] },
  { nombre: "El Nordeste de Segovia", urls: ["https://www.elnordestedesegovia.es/noticias?format=feed&type=rss", "https://www.elnordestedesegovia.es/?view=featured&id=1&format=feed&type=rss"] },
  { nombre: "El Espinar Información", urls: ["https://www.elespinar.org/feeds/posts/default?alt=rss"], pueblo: "El Espinar" },
  { nombre: "La Granja-Valsaín", urls: ["https://www.lagranja-valsain.com/feed/"], pueblo: "Real Sitio de San Ildefonso" },
  { nombre: "Diario de Castilla y León", urls: ["https://www.diariodecastillayleon.es/rss/segovia.xml"] },
  { nombre: "COPE Segovia", urls: ["https://www.cope.es/rss/emisoras/castilla-y-leon/segovia-provincia/segovia.xml", "https://www.cope.es/api/es/emisoras/castilla-y-leon/segovia-provincia/segovia/news/rss.xml"], soloSiMenciona: true },
  { nombre: "Onda Cero Segovia", urls: ["https://www.ondacero.es/rss/8521.xml"] },
  { nombre: "Europa Press", urls: ["https://www.europapress.es/rss/rss.aspx?ch=283"], soloSiMenciona: true },
  { nombre: "Acueducto2", urls: ["https://www.acueducto2.com/feed/"] },
  // Ayuntamientos con noticias propias (actos, plenos, fiestas, avisos)
  { nombre: "Ayuntamiento de Cuéllar", urls: ["https://www.aytocuellar.es/feed/"], pueblo: "Cuéllar" },
  { nombre: "Ayuntamiento de Cantalejo", urls: ["https://www.cantalejo.es/home/-/asset_publisher/QGA6lS8CBHs5/rss"], pueblo: "Cantalejo" },
  { nombre: "Ayuntamiento de Riaza", urls: ["https://www.riaza.es/home/-/asset_publisher/hr5A/rss"], pueblo: "Riaza" },
  { nombre: "Ayuntamiento de Sepúlveda", urls: ["https://www.sepulveda.es/home/-/asset_publisher/hr5A/rss"], pueblo: "Sepúlveda" },
  { nombre: "Ayuntamiento de La Lastrilla", urls: ["https://www.lalastrilla.es/home/-/asset_publisher/Sd1Q/rss"], pueblo: "La Lastrilla" },
];

// Búsquedas en Google Noticias (cubren también radios, agencias y medios sin RSS propio)
const BUSQUEDAS = [
  // Temas (toda la provincia)
  '"Guardia Civil" Segovia',
  'Segovia detenido OR detenidos OR investigado OR investigados',
  'Segovia robo OR estafa OR agresión OR reyerta OR okupas',
  'Segovia accidente OR atropello OR incendio OR rescate OR fallecido',
  'Segovia concentración OR manifestación OR protesta OR movilización',
  'Segovia huelga OR paros OR sindicatos OR CCOO OR UGT',
  'Segovia "plataforma" vecinos OR vecinal OR "recogida de firmas"',
  'Segovia tractorada OR agricultores OR ganaderos protesta',
  'Segovia macrogranja OR biogás OR biometano OR fotovoltaica OR "planta solar" OR eólico',
  'Segovia pleno OR alcalde OR moción OR concejales',
  'Segovia fiestas OR encierros OR "concentración motera" OR festival',
  'Segovia visita ministro OR ministra OR presidente OR consejero OR delegado',
  'Segovia mitin OR "29N" OR campaña OR candidatos',
  'Segovia pintadas OR vandalismo OR ultras OR "extrema derecha" OR antifascista',
  'Segovia inmigrantes OR migrantes OR "centro de acogida" OR desalojo OR okupación',
  'Segovia "Subdelegación del Gobierno" OR subdelegado OR "Diputación de Segovia"',
  // Pueblos grandes y cabeceras de comarca
  '(Cuéllar OR "Navas de Oro" OR Samboal OR Chañe OR Fuentepelayo) Segovia',
  '("El Espinar" OR "San Rafael" OR "Navas de San Antonio" OR "Otero de Herreros") Segovia',
  '("La Granja" OR "San Ildefonso" OR Valsaín OR Torrecaballeros OR Trescasas) Segovia',
  '("Palazuelos de Eresma" OR "La Lastrilla" OR "San Cristóbal de Segovia" OR Hontanares) Segovia',
  '(Cantalejo OR Turégano OR Cantimpalos OR Carbonero OR Escalona) Segovia',
  '(Riaza OR Ayllón OR Sepúlveda OR Boceguillas OR Prádena OR Navafría) Segovia',
  '("Nava de la Asunción" OR Coca OR "Santa María la Real de Nieva" OR Bernardos OR Navalmanzano) Segovia',
  '(Villacastín OR "Valverde del Majano" OR Abades OR Martín Muñoz OR Lastras) Segovia',
  '(Fuentidueña OR Sacramenia OR Aguilafuente OR Mozoncillo OR Zarzuela) Segovia',
];
// Solo se aceptan resultados de Google Noticias de estos medios (o de cualquiera con "Segovia" o "Castilla" en el nombre)
const MEDIOS_OK_RE = /segovia|castilla|cuellar|nordeste|adelantado|norte de castilla|ical|europa press|cope|cadena ser|onda cero|rtvcyl|la 8|cyltv|el espanol|el mundo|abc|la razon|20 ?minutos|rtve|eldiario|el pais|efe|infolibre|la sexta|antena 3|telecinco|cuatro|el confidencial|okdiario|libertad digital|vozpopuli|nius|la vanguardia|el periodico|publico|huffpost|niusdiario|noticiascyl|tribuna|guardia civil|interior|ministerio|junta|diputacion|ayuntamiento|subdelegacion|112/;
const MEDIOS_OK = { test: m => MEDIOS_OK_RE.test(m) && !NO_ESPANA.test(m) };
const GRUPOS_PUEBLOS = (() => {
  const nombres = MUNICIPIOS.map(m => m.includes(" ") || AMBIGUOS.has(m) ? `"${m}"` : m);
  const g = []; for (let i = 0; i < nombres.length; i += 12) g.push(`(${nombres.slice(i, i + 12).join(" OR ")}) Segovia`);
  return g;
})();
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
  if (!/<(rss|feed|rdf:RDF|urlset)[\s>]/i.test(txt.slice(0, 3000))) throw new Error("no es un feed");
  return txt;
}

function items(xml) {
  const d = parser.parse(xml);
  // Sitemap de noticias de Google (El Día de Segovia no tiene RSS)
  if (d?.urlset) {
    const urls = d.urlset.url; const txt = v => typeof v === "object" && v !== null ? (v["#text"] ?? "") : (v ?? "");
    return (Array.isArray(urls) ? urls : [urls]).map(u => ({
      titulo: limpia(txt(u?.["news:news"]?.["news:title"])), url: String(txt(u?.loc)).trim(),
      fecha: new Date(txt(u?.["news:news"]?.["news:publication_date"]) || txt(u?.lastmod) || Date.now()), texto: "", fuente: "",
    })).filter(x => x.titulo && /^https?:\/\//.test(x.url));
  }
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
  return /segovia/.test(n) ? "Segovia" : "General";
}

const PATRONES = {
  policial: /guardia civil|policia|detenid|detencion|arrest|investigad|robo|robar|hurto|estafa|timo|droga|marihuana|cocaina|juzgado|tribunal|audiencia provincial|condena|juicio|prision|carcel|penitenciari|agresion|agredid|violencia de genero|maltrato|delito|operacion|okupa|atraco|sustraccion|incautad|furtiv|apunal|reyerta|pelea|altercado|seprona|antidroga|narcotrafico/,
  social: /concentracion|manifestacion|protesta|huelga|paros|plataforma|movilizacion|moviliza|reivindica|pancarta|sindicat|ccoo|\bugt\b|\bcgt\b|\bcsif\b|\bstecyl\b|asociacion vecinal|vecinos (denuncian|protestan|reclaman|se oponen|se movilizan|exigen)|recogida de firmas|firmas contra|marea blanca|se oponen|cacerolada|encierro|tractorada|asaja|\bupa\b|\bcoag\b|union de campesinos|ecologistas|alegaciones|\bere\b|\berte\b|despidos|cierre de la (empresa|fabrica|planta)|comite de empresa|ultra|extrema (derecha|izquierda)|antifa|fascis|pintadas|vandal|disturbios|radical|yihad|terroris|centro de acogida|refugiados|okupa|ocupacion ilegal|desalojo|desahucio/,
  // Temas que solo interesan si hay conflicto (rechazo vecinal, alegaciones, moratorias...)
  proyecto: /macrogranja|granja porcina|biogas|biometano|fotovoltaic|planta solar|parque solar|placas solares|eolic|aerogenerador|mineria|cantera|vertedero|depuradora|linea de alta tension|agricultores|ganaderos|inmigrant|migrantes|temporeros|convenio|colectivo/,
  autoridades: /visita (del|de la|de los) (ministr|president|rey|reina|delegad|consejer|vicepresident|secretari)|visitara|ministr[oa] .{0,40}(segovia|visita)|felipe vi|\bel rey\b|la reina|princesa leonor|manueco|presidente de la junta|delegado del gobierno|subdelegad[oa] del gobierno|mitin|campana electoral|acto electoral|cierre de campana|candidat|cabeza de lista|abascal|feijoo|pedro sanchez|yolanda diaz|ministerio del interior|director general de la guardia civil/,
  politica: /pleno|alcalde|alcaldesa|concejal|oposicion|cortes de castilla|consejer|subdelegad|delegado del gobierno|procurador|senador|diputad[oa]s? (provincial|nacional)|\bministr|\bpp\b|psoe|\bvox\b|podemos|izquierda unida|por avila|elecciones|electoral|mocion|dimision|dimite|cese|denuncia (el|la) (pp|psoe|vox|grupo)|partido popular|partido socialista|gobierno municipal|equipo de gobierno/,
  emergencias: /accidente|colision|choque|salida de via|atropell|herid|fallec|muere|murio|incendio|fuego|bomberos|rescat|112|desaparecid|inundacion|nevada|temporal|aviso (amarillo|naranja|rojo)|corte de (la )?carretera|trafico|\bdgt\b|\ba-1\b|\ba-6\b|\bap-6\b|\bap-61\b|n-110|n-603|cl-6\d\d|sg-\d|evacuad|derrumbe|explosion/,
  economia: /empresa|empleo|paro registrado|inversion|millones de euros|industria|agricultor|ganader|poligono|comercio|negocio|turismo|hosteleria|subvencion|ayudas|precio/,
  sociedad: /sanidad|centro de salud|consultorio|hospital|colegio|instituto|educacion|vivienda|mayores|residencia|despoblacion|servicios sociales|universidad|medico/,
  cultura: /fiesta|fiestas|concierto|festival|teatro|exposicion|feria|romeria|procesion|halloween|certamen|museo|cine|libro|patrimonio|musica|danza|tradicion/,
  deportes: /futbol|gimnastica segoviana|baloncesto|balonmano|atletismo|carrera popular|maraton|ciclismo|liga|campeonato|club deportivo|tenis|padel|deportista|jornada \d/,
};
// Deportes y cultura no interesan salvo que haya un suceso
const DEPORTE = /gimnastica segoviana|\bsegoviana\b|segosala|futbol|baloncesto|balonmano|voleibol|atletismo|ciclismo|\bliga\b|jornada \d|derbi|\bgol(es)?\b|victoria|derrota|empate|clasificacion|campeonato|torneo|seminci|exposicion|libro|novela|teatro|cine\b|museo/;
const EVENTO = /fiestas? (patronales|de |en honor|del )|encierros?|toros|capea|concentracion motera|festival|concierto|romeria|carrera popular|marcha (popular|reivindicativa)|cabalgata|verbena|penas|botellon|halloween|feria (de |del )|partido de alto riesgo|multitudinari/;
const ALTA = /tractorada|corte de (la )?(carretera|via)|encierro|despidos|\bere\b|cierre de la|ultra|extrema|antifa|fascis|pintadas|vandal|disturbios|altercado|radical|yihad|terroris|desalojo|desahucio|ocupacion ilegal|visita (del|de la) (ministr|president|rey|reina)|felipe vi|mitin|recogida de firmas|plataforma|cacerolada|detenid|detien|detencion|arrest|guardia civil (ha )?(detenido|investiga|esclarece|desarticula)|operacion|fallec|muere|murio|mortal|herido grave|incendio|desaparecid|rescat|concentracion|manifestacion|protesta|huelga|movilizacion|okupa|agresion|violencia de genero|reyerta|apunal|evacuad|plataforma .* (contra|rechaza)|corte de (la )?carretera/;

const CONFLICTO = /rechaz|oposicion|se oponen|en contra|contra (la|el|los|las)|alegaciones|plataforma|vecinos|protesta|moratoria|frenar|paraliz|suspende|denuncia|polemica|recurso|tribunal|concentracion|manifestacion/;
function clasifica(titulo, texto, municipio) {
  const t = norm(titulo + " " + texto);
  const tt = norm(titulo);
  const UTILES = ["policial", "social", "politica", "emergencias", "autoridades"];
  if (DEPORTE.test(tt) && !/detenid|agresion|pelea|reyerta|herid|incidentes|violencia/.test(t)) return { categorias: [], relevancia: "baja" };
  let categorias = UTILES.filter(k => PATRONES[k].test(tt));
  // Energía, macrogranjas, campo, inmigración...: cuentan como conflicto solo si hay rechazo o protesta
  if (!categorias.includes("social") && PATRONES.proyecto.test(t) && CONFLICTO.test(t)) categorias.unshift("social");
  if (!categorias.length) categorias = UTILES.filter(k => PATRONES[k].test(t)).slice(0, 2);
  if (EVENTO.test(tt) || (!categorias.length && EVENTO.test(t))) categorias.push("eventos");
  categorias = categorias.slice(0, 3);
  let relevancia = "baja";
  if (ALTA.test(t) && categorias.some(c => ["policial", "social", "emergencias", "autoridades"].includes(c))) relevancia = "alta";
  else if (categorias.length) relevancia = "media";
  // Previsiones y avisos generales (peligro de incendios, operación salida...) no son urgentes
  if (relevancia === "alta" && /peligro|riesgo|preve|prevision|prevencion|campana de|operacion (salida|especial)|recomendaciones/.test(tt) && !/detenid|herid|fallec|muere/.test(tt)) relevancia = "media";
  if (municipio === "Segovia" && relevancia === "alta") relevancia = "media";
  return { categorias, relevancia };
}

/* Fecha de convocatoria: "el próximo sábado", "el 14 de noviembre", "a las 19:00" */
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
const CONVOCA = /convoca|manifesta|concentrara|protestara|movilizara|convocatoria|concentrac|manifestac|huelga|paros|pleno|marcha|protesta|movilizac|tractorada|caravana|encierro|mitin|visita|visitara|acto |asamblea|recogida de firmas|cacerolada|celebrara|tendra lugar|se celebra|fiestas|encierros|concentracion motera|festival|romeria/;
const LETRA_MES = { E: 0, F: 1, S: 8, O: 9, N: 10, D: 11 }; // 11N, 4D... (solo letras sin ambigüedad)
const AGENDA_TITULO = /convoca|manifesta|concentrac|protesta|huelga|paros|tractorada|caravana|encierro|cacerolada|mitin|visita|visitara|pleno|asamblea|marcha|movilizac|recogida de firmas|fiestas|encierros|concentracion motera|festival|romeria|acto (de|en|por)|homenaje|vigilia/;
function eventoDe(titulo, texto, publicada, categorias = []) {
  if (!categorias.some(c => ["social", "autoridades", "politica", "eventos"].includes(c))) return {};
  const tt = norm(titulo);
  if (!AGENDA_TITULO.test(tt)) return {};
  const t = norm(titulo + " " + texto);
  const tOrig = titulo + " " + texto;
  const base = new Date(fechaMadrid(publicada) + "T12:00:00");
  const conAnio = f => { if (f < base) f.setFullYear(f.getFullYear() + 1); return (f - base) / 864e5 > 120 ? null : f; };
  let f = null, m;
  if ((m = t.match(/\b(?:del?|el|los dias|dias)?\s*(\d{1,2})(?:\s*(?:y|al|-|a)\s*\d{1,2})?\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/))) {
    f = new Date(base); f.setMonth(MESES.indexOf(m[2]), +m[1]); f = conAnio(f);
  } else if ((m = tOrig.match(/\b(\d{1,2})([EFSOND])\b/))) {
    f = new Date(base); f.setMonth(LETRA_MES[m[2]], +m[1]); f = conAnio(f);
  } else if ((m = t.match(/\b(?:este|el proximo|proximo|el)\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)(?:,?\s*(?:dia\s*)?(\d{1,2}))?\b/))) {
    f = new Date(base);
    if (m[2]) { f.setDate(+m[2]); if (f < base) f.setMonth(f.getMonth() + 1); }
    else { const delta = (DIAS.indexOf(m[1]) - f.getDay() + 7) % 7; f.setDate(f.getDate() + delta); }
  } else if ((m = t.match(/\b(?:el|este|proximo)\s+dia\s+(\d{1,2})\b/))) {
    f = new Date(base); f.setDate(+m[1]); if (f < base) f.setMonth(f.getMonth() + 1);
  } else if (/\b(hoy|esta tarde|esta noche|este mediodia)\b/.test(tt)) f = new Date(base);
  else if (/\bmanana\b/.test(tt) && !/esta manana/.test(tt)) { f = new Date(base); f.setDate(f.getDate() + 1); }
  // Solo es convocatoria si el titular anuncia algo que va a pasar (no crónicas de lo ya ocurrido)
  const convocatoria = /convoca|llama(n)? a|anuncia|se concentrar(a|an)|se manifestar(a|an)|movilizar(a|an)|protestar(a|an)|secundar|visitara|participara|celebrara|preparan|proxim[oa]|mitin|tractorada|huelga (el|del|los|indefinida|general)|paros (el|los|del)|recogida de firmas/.test(tt);
  if (!f) return convocatoria ? { convocatoria: true } : {};
  const h = t.match(/a las (\d{1,2})(?:[:.,](\d{2}))?\s*(?:h|horas)?/) || t.match(/\b(\d{1,2})[:.](\d{2})\s*(?:h|horas)\b/);
  const out = { fecha_evento: f.toISOString().slice(0, 10) };
  if (convocatoria) out.convocatoria = true;
  if (h && +h[1] < 24) out.hora_evento = String(h[1]).padStart(2, "0") + ":" + (h[2] ?? "00");
  return out;
}

const MENCIONA_SEGOVIA = new RegExp("segovia|" + MUNICIPIOS.filter(m => !AMBIGUOS.has(m) && m.length > 5).map(m => reEsc(norm(m))).join("|"));

/* ------------------------------------------------------------------ */
/* Agrupar duplicados                                                  */
/* ------------------------------------------------------------------ */
const VACIAS = new Set("el la los las un una unos unas de del al a en y o u que se su sus por para con sin sobre tras ante entre como mas lo le les es son ha han segovia segoviano segoviana provincia".split(" "));
// Palabras distintas que en un titular significan lo mismo (para reconocer la misma noticia contada por varios medios)
const SINONIMOS = { carce: "carce", prisi: "carce", penit: "carce", presi: "carce", lesio: "herid", herid: "herid", heric: "herid", inter: "preso", recl: "preso", reclu: "preso", preso: "preso", presos: "preso",
  incid: "alter", alter: "alter", agred: "agres", agres: "agres", detie: "deten", deten: "deten", arres: "deten", autob: "autob", bus: "autob", buses: "autob", urban: "urban",
  fallec: "muert", falle: "muert", muere: "muert", muert: "muert", murio: "muert", sinie: "accid", accid: "accid", colis: "accid", choqu: "accid" };
const tokens = s => new Set(norm(s).replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter(w => w.length > 2 && !VACIAS.has(w)).map(w => SINONIMOS[w.slice(0, 5)] || SINONIMOS[w] || w.slice(0, 5)));
// Si la noticia viene de un medio o ayuntamiento de un pueblo y no nombra otro, es de ese pueblo
const conPueblo = (m, pueblo) => pueblo && !CONCRETO(m) ? pueblo : m;
const CONCRETO = m => m && !["Segovia", "Provincia", "General"].includes(m);
// Dos titulares son la misma noticia si se parecen mucho, o si son del mismo pueblo,
// de días cercanos y comparten al menos 2 palabras significativas (además del nombre del pueblo).
// Un titular que trae un cambio (se suspende, hay un detenido, fallece...) no se junta con el anterior: es otra noticia
const DESARROLLO = /suspend|desconvoc|aplaz|cancel|detenid|detien|fallec|muere|murio|acuerdo|levanta|finaliza|termina|desalojad|condena|absuel/;
function mismaNoticia(a, b) {
  if (parecido(a.tk, b.tk) >= 0.55) return true;
  if (a.titulo && b.titulo && DESARROLLO.test(norm(a.titulo)) !== DESARROLLO.test(norm(b.titulo))) return false;
  const dias = Math.abs(new Date(a.dia) - new Date(b.dia)) / 864e5;
  if (CONCRETO(a.municipio) && a.municipio === b.municipio && dias <= 2) {
    const pueblo = tokens(a.municipio);
    let comun = 0; for (const w of a.tk) if (!pueblo.has(w) && b.tk.has(w)) comun++;
    if (comun >= 2) return true;
  }
  // Capital o provincia: mismo día y al menos 3 palabras clave en común
  if (!CONCRETO(a.municipio) && !CONCRETO(b.municipio) && dias === 0) {
    let comun = 0; for (const w of a.tk) if (b.tk.has(w)) comun++;
    if (comun >= 3) return true;
  }
  return false;
}
// Nombre único para cada medio ("Tribuna de Segovia." y "Tribuna de Segovia" son el mismo)
const CANON = { segoviaudaz: "SegoviaUdaz", escuellar: "esCuéllar", tribunadesegovia: "Tribuna de Segovia", eldiadesegovia: "El Día de Segovia",
  eladelantado: "El Adelantado", eladelantadodesegovia: "El Adelantado", elnortedecastilla: "El Norte de Castilla", segoviadirectocom: "Segovia Directo",
  segoviadirecto: "Segovia Directo", cope: "COPE Segovia", copesegovia: "COPE Segovia", cadenaser: "Cadena SER", ondacero: "Onda Cero Segovia",
  diariodecastillayleon: "Diario de Castilla y León", diariodecastillayleonsegovia: "Diario de Castilla y León", europapress: "Europa Press",
  elconfidencialdigital: "El Confidencial Digital", confidencialdigital: "El Confidencial Digital", segovia247: "Segovia 24/7", rtvees: "RTVE", lagranjavalsain: "La Granja-Valsaín", segoviaaldia: "Segovia al día", diariodecastillayleonsegovia2: "Diario de Castilla y León", ondacerosegovia: "Onda Cero Segovia", acueducto2: "Acueducto2", acueducto2com: "Acueducto2" };
const canonMedio = n => CANON[norm(n).replace(/[^a-z0-9]/g, "")] || String(n).replace(/[.\s]+$/, "");
function juntaMedios(destino, origen) {
  for (const m of origen) {
    const nombre = canonMedio(m.nombre);
    if (!destino.some(x => x.url === m.url || canonMedio(x.nombre) === nombre) && destino.length < 5) destino.push({ ...m, nombre });
  }
  const vistos = new Set();
  const unicos = destino.map(x => ({ ...x, nombre: canonMedio(x.nombre) }))
    .filter(x => { const k1 = "n:" + x.nombre, k2 = "u:" + x.url; if (vistos.has(k1) || vistos.has(k2)) return false; vistos.add(k1); vistos.add(k2); return true; });
  destino.splice(0, destino.length, ...unicos);
}
// Páginas automáticas o de relleno que no son noticias
// Artículos de opinión, cartas y blogs: no son noticias
const OPINION = /\/(opinion|opiniones|tribuna|blogs?|cartas?-al-director|cartas-de-los-lectores|columnistas?|firmas)\//;
const BASURA = /^(el tiempo en|calidad del aire|prevision (del tiempo|meteorologica)|horoscopo|loteria|resultados? (de la )?(loteria|bonoloto|primitiva|euromillones)|esquelas?|farmacias de guardia|cartelera)/;
const NO_ESPANA = /mexico|argentina|colombia|chile|peru|venezuela|tlaxcala|puebla|uruguay|ecuador|bolivia|paraguay|guatemala|honduras|panama|costa rica|cuba|dominicana|miami/;
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
    let ok = false, error = "", n = 0;
    for (const url of f.urls) {
      try {
        const its = items(await descarga(url));
        for (const it of its) {
          if (f.soloSiMenciona && !MENCIONA_SEGOVIA.test(norm(it.titulo + " " + it.texto))) continue;
          if (OPINION.test(it.url)) continue;
          brutos.push({ ...it, medio: f.nombre, directo: true, pueblo: f.pueblo }); n++;
        }
        ok = true; if (!f.todas) break;
      } catch (e) { error = e.message; }
    }
    estado.push(ok ? { fuente: f.nombre, ok: true, noticias: n } : { fuente: f.nombre, ok: false, error });
  }

  // 2) Google Noticias
  let gTotal = 0, gFallos = 0;
  const turno = new Date().getUTCHours() % 3;
  const busquedas = [...BUSQUEDAS, ...GRUPOS_PUEBLOS.filter((_, i) => i % 3 === turno)];
  for (const q of busquedas) {
    try {
      for (const it of items(await descarga(gnews(q)))) {
        let titulo = it.titulo, medio = (it.fuente || "Google Noticias").replace(/[.\s]+$/, "");
        if (it.fuente && titulo.endsWith(" - " + it.fuente)) titulo = titulo.slice(0, -(it.fuente.length + 3));
        const texto = norm(it.texto) === norm(it.titulo) || norm(it.texto).startsWith(norm(titulo)) ? "" : it.texto;
        if (!MEDIOS_OK.test(norm(medio)) || BASURA.test(norm(titulo)) || /^opinion\b|^tribuna\b|carta al director/.test(norm(titulo))) continue;
        if (!MENCIONA_SEGOVIA.test(norm(titulo + " " + texto))) continue;
        brutos.push({ ...it, titulo, texto, medio, directo: false }); gTotal++;
      }
    } catch (e) { gFallos++; }
    await new Promise(r => setTimeout(r, 900));
  }
  estado.push({ fuente: "Google Noticias", ok: gFallos < busquedas.length, noticias: gTotal, error: gFallos ? `${gFallos} búsquedas fallidas` : undefined });

  // 3) Filtrar por fecha y agrupar duplicados (las de medios directos primero: traen mejor enlace y entradilla)
  const recientes = brutos.filter(b => !isNaN(b.fecha) && b.fecha >= limite && b.fecha <= new Date(ahora.getTime() + 36e5))
                          .sort((a, b) => (b.directo - a.directo) || (b.fecha - a.fecha));
  const grupos = [];
  for (const b of recientes) {
    const tk = tokens(b.titulo);
    if (tk.size < 2) continue;
    const yo = { tk, titulo: b.titulo, municipio: conPueblo(municipioDe(b.titulo + " " + b.texto), b.pueblo), dia: fechaMadrid(b.fecha) };
    const g = grupos.find(g => mismaNoticia(g, yo));
    if (g) {
      juntaMedios(g.medios, [{ nombre: b.medio, url: b.url }]);
      if (!g.texto && b.texto) g.texto = b.texto;
      if (b.fecha < g.fecha) g.fecha = b.fecha;
    } else grupos.push({ ...yo, pueblo: b.pueblo, titulo: b.titulo, texto: b.texto, fecha: b.fecha, medios: [{ nombre: canonMedio(b.medio), url: b.url }] });
  }

  // 4) Clasificar
  const nuevas = grupos.map(g => {
    const resumen = g.texto ? recorta(g.texto) : "";
    const municipio = conPueblo(municipioDe(g.titulo + " " + resumen), g.pueblo);
    const { categorias, relevancia } = clasifica(g.titulo, resumen, municipio);
    const evento = eventoDe(g.titulo, resumen, g.fecha, categorias);
    return {
      ...evento,
      id: hash(norm(g.titulo)),
      titulo: g.titulo, resumen, categorias, municipio, relevancia, ...(g.pueblo ? { pueblo_fuente: g.pueblo } : {}),
      medios: g.medios,
      publicado: g.fecha.toISOString(),
      hora: horaMadrid(g.fecha),
      _dia: fechaMadrid(g.fecha),
    };
  });

  // Fuera lo que no es de interés (deportes, cultura, economía...) y lo que no menciona Segovia ni ningún pueblo
  const interesa = n => n.categorias.length > 0 && n.municipio !== "General";
  const antes = nuevas.length;
  for (let i = nuevas.length - 1; i >= 0; i--) if (!interesa(nuevas[i])) nuevas.splice(i, 1);
  console.log(`Descartadas por no ser de interés: ${antes - nuevas.length}`);

  // 5) Fusionar con el histórico
  let previo = { dias: [] };
  try { previo = JSON.parse(await readFile(SALIDA, "utf8")); } catch {}
  const porDia = new Map((previo.dias || []).map(d => [d.fecha, { ...d, noticias: [...(d.noticias || [])] }]));
  const existentes = [...porDia.values()].flatMap(d => d.noticias.map(n => ({ n, tk: tokens(n.titulo), titulo: n.titulo, municipio: n.municipio, dia: d.fecha })));
  let añadidas = 0;
  for (const n of nuevas) {
    const yo = { tk: tokens(n.titulo), titulo: n.titulo, municipio: n.municipio, dia: n._dia };
    const ya = existentes.find(e => e.n.id === n.id || mismaNoticia(e, yo));
    if (ya) { // añade enlaces de otros medios a la que ya estaba
      if (n.publicado && (!ya.n.publicado || n.publicado < ya.n.publicado)) { ya.n.publicado = n.publicado; ya.n.hora = n.hora; }
      if (!ya.n.resumen && n.resumen) ya.n.resumen = n.resumen;
      juntaMedios(ya.n.medios, n.medios);
      continue;
    }
    const { _dia, ...limpio } = n;
    if (!porDia.has(_dia)) porDia.set(_dia, { fecha: _dia, noticias: [] });
    porDia.get(_dia).noticias.push(limpio);
    existentes.push({ n: limpio, ...yo });
    añadidas++;
  }

  // 5a) Limpieza del histórico con las reglas actuales (pueblo, medios de fuera, páginas de relleno)
  const DIRECTOS = new Set(FEEDS.map(f => canonMedio(f.nombre)));
  const ahoraHM = horaMadrid(ahora), hoyF = fechaMadrid(ahora);
  for (const d of porDia.values()) {
    d.noticias = d.noticias.filter(n => {
      // Sin fecha de publicación real (noticias de las primeras cargas): fuera, se vuelven a recoger con su fecha correcta
      if (!n.publicado) return false;
      if (BASURA.test(norm(n.titulo))) return false;
      juntaMedios(n.medios, []);
      n.medios = n.medios.filter(m => DIRECTOS.has(m.nombre) || MEDIOS_OK.test(norm(m.nombre)));
      if (!n.medios.length || n.medios.every(m => OPINION.test(m.url))) return false;
      const nuevo = conPueblo(municipioDe(n.titulo + " " + (n.resumen || "")), n.pueblo_fuente);
      if (CONCRETO(nuevo) || n.municipio !== "Provincia") n.municipio = nuevo;
      const c = clasifica(n.titulo, n.resumen || "", n.municipio);
      n.categorias = c.categorias; n.relevancia = c.relevancia;
      delete n.fecha_evento; delete n.hora_evento; delete n.convocatoria;
      if (n.publicado) Object.assign(n, eventoDe(n.titulo, n.resumen || "", new Date(n.publicado), n.categorias));
      if (!interesa(n)) return false;
      if (n.municipio === "Segovia" && n.relevancia === "alta") n.relevancia = "media";
      return true;
    });
  }

  // 5b) Repaso de los últimos 4 días: junta duplicados que se colaron antes y unifica nombres de medios
  const desde = fechaMadrid(new Date(ahora.getTime() - 4 * 864e5));
  const NIVEL = { alta: 0, media: 1, baja: 2 };
  const recientesH = [...porDia.values()].filter(d => d.fecha >= desde).sort((a, b) => a.fecha.localeCompare(b.fecha))
    .flatMap(d => d.noticias.map(n => ({ n, d, tk: tokens(n.titulo), titulo: n.titulo, municipio: n.municipio, dia: d.fecha })));
  const borrar = new Set();
  for (let i = 0; i < recientesH.length; i++) {
    const a = recientesH[i]; if (borrar.has(a.n)) continue;
    juntaMedios(a.n.medios, []);
    for (let j = i + 1; j < recientesH.length; j++) {
      const b = recientesH[j]; if (borrar.has(b.n) || !mismaNoticia(a, b)) continue;
      juntaMedios(a.n.medios, b.n.medios);
      if (!a.n.resumen && b.n.resumen) a.n.resumen = b.n.resumen;
      if (b.n.publicado && (!a.n.publicado || b.n.publicado < a.n.publicado)) a.n.publicado = b.n.publicado;
      if (!a.n.fecha_evento && b.n.fecha_evento) { a.n.fecha_evento = b.n.fecha_evento; a.n.hora_evento = b.n.hora_evento; }
      if ((NIVEL[b.n.relevancia] ?? 2) < (NIVEL[a.n.relevancia] ?? 2)) a.n.relevancia = b.n.relevancia;
      borrar.add(b.n);
    }
  }
  for (const d of porDia.values()) d.noticias = d.noticias.filter(n => !borrar.has(n));
  if (borrar.size) console.log(`Duplicados unidos: ${borrar.size}`);

  // 5c) Cada noticia en el día en que se publicó de verdad
  for (const d of [...porDia.values()]) {
    for (const n of [...d.noticias]) {
      const dia = fechaMadrid(new Date(n.publicado));
      n.hora = horaMadrid(new Date(n.publicado));
      if (dia !== d.fecha) {
        d.noticias.splice(d.noticias.indexOf(n), 1);
        if (!porDia.has(dia)) porDia.set(dia, { fecha: dia, noticias: [] });
        porDia.get(dia).noticias.push(n);
      }
    }
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
