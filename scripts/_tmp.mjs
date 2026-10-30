// Recopila noticias de la provincia de Segovia desde RSS y Google Noticias,
// las clasifica por pueblo, tema y relevancia, y actualiza public/datos.json.
import { XMLParser } from "fast-xml-parser";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { MUNICIPIOS, AMBIGUOS, ALIAS, BARRIOS_CAPITAL } from "./municipios.mjs";

const SALIDA = new URL("../public/datos.json", import.meta.url);
const DIAS_HISTORICO = 21;
const CACHE = new URL("../datos/analizadas.json", import.meta.url);
const HORAS_VENTANA = 72;          // se aceptan noticias publicadas en las últimas 72 h
const TZ = "Europe/Madrid";

/* ------------------------------------------------------------------ */
/* Fuentes                                                             */
/* ------------------------------------------------------------------ */
// Feeds directos de medios. Para cada uno se prueban varias direcciones y se usa la primera que funcione.
// Webs municipales con noticias activas en 2026 (encontradas revisando las 208 webs de ayuntamientos)
const AYUNTAMIENTOS_WEB = {"Aguilafuente": ["https://www.aguilafuente.es/home/-/asset_publisher/Sd1Q/rss"],"Arcones": ["https://www.arcones.es/home/-/asset_publisher/Sd1Q/rss"],"Ayllón": ["https://www.ayllon.es/home/-/asset_publisher/hr5A/rss"],"Bernardos": ["https://www.bernardos.es/feed/"],"Bernuy de Porreros": ["https://www.bernuydeporreros.es/home/-/asset_publisher/83tT/rss"],"Cantimpalos": ["https://www.cantimpalos.es/home/-/asset_publisher/KM33GUf3aML4/rss"],"Cedillo de la Torre": ["https://www.cedillodelatorre.es/home/-/asset_publisher/Sd1Q/rss"],"Chañe": ["https://www.chane.es/home/-/asset_publisher/Sd1Q/rss"],"Coca": ["https://www.coca.es/home/-/asset_publisher/Sd1Q/rss"],"Collado Hermoso": ["https://www.colladohermoso.es/home/-/asset_publisher/Sd1Q/rss"],"Duruelo": ["https://www.duruelo.es/home/-/asset_publisher/Sd1Q/rss"],"Escalona del Prado": ["https://www.escalonadelprado.es/home/-/asset_publisher/hr5A/rss"],"Espirdo": ["https://www.espirdo.es/home/-/asset_publisher/9AyG/rss"],"Fresno de Cantespino": ["https://www.fresnodecantespino.es/home/-/asset_publisher/r4Bp/rss"],"Fuente el Olmo de Fuentidueña": ["https://www.fuenteelolmodefuentiduena.es/home/-/asset_publisher/Sd1Q/rss"],"Fuentepelayo": ["https://www.fuentepelayo.es/home/-/asset_publisher/Sd1Q/rss"],"Fuenterrebollo": ["https://www.fuenterrebollo.es/home/-/asset_publisher/B92r/rss"],"Hontanares de Eresma": ["https://www.hontanaresdeeresma.es/home/-/asset_publisher/BwI6/rss"],"La Losa": ["https://www.lalosa.es/feed/"],"Labajos": ["https://www.labajos.es/home/-/asset_publisher/Sd1Q/rss"],"Lastras de Cuéllar": ["https://www.lastrasdecuellar.es/home/-/asset_publisher/ER3t/rss"],"Martín Muñoz de las Posadas": ["https://www.martinmunozdelasposadas.es/home/-/asset_publisher/u3LR/rss"],"Marugán": ["https://www.marugan.es/home/-/asset_publisher/1YZv/rss"],"Mozoncillo": ["https://www.mozoncillo.es/home/-/asset_publisher/hr5A/rss"],"Muñopedro": ["https://www.munopedro.es/home/-/asset_publisher/Sd1Q/rss"],"Nava de la Asunción": ["https://navadelaasuncion.org/feed/"],"Navafría": ["https://www.navafria.es/home/-/asset_publisher/Sd1Q/rss"],"Navalmanzano": ["https://www.navalmanzano.es/home/-/asset_publisher/X3h6/rss"],"Navas de Riofrío": ["https://www.navasderiofrio.es/home/-/asset_publisher/Sd1Q/rss"],"Navas de San Antonio": ["https://www.navasdesanantonio.es/home/-/asset_publisher/qv0K/rss"],"Ortigosa del Monte": ["https://www.ortigosadelmonte.es/home/-/asset_publisher/Sd1Q/rss"],"Otero de Herreros": ["https://oterodeherreros.es/feed/"],"Palazuelos de Eresma": ["https://palazuelosdeeresma.es/feed/"],"Pinarnegrillo": ["https://www.pinarnegrillo.es/home/-/asset_publisher/Sd1Q/rss"],"Prádena": ["https://www.pradena.es/home/-/asset_publisher/yCd5/rss"],"Sacramenia": ["https://www.sacramenia.es/home/-/asset_publisher/Sd1Q/rss"],"San Cristóbal de Cuéllar": ["https://www.sancristobaldecuellar.es/home/-/asset_publisher/Sd1Q/rss"],"San Cristóbal de Segovia": ["https://www.sancristobaldesegovia.es/home/-/asset_publisher/Sd1Q/rss","https://www.sancristobaldesegovia.es/home/-/asset_publisher/44OBUNgUJAZC/rss","https://www.sancristobaldesegovia.es/home/-/asset_publisher/A9Rer5EVgk4q/rss"],"Sauquillo de Cabezas": ["https://www.sauquillodecabezas.es/home/-/asset_publisher/Sd1Q/rss"],"Trescasas": ["https://www.aytotrescasas.es/feed/"],"Turégano": ["https://www.turegano.es/home/-/asset_publisher/Sd1Q/rss"],"Valseca": ["https://www.valseca.es/home/-/asset_publisher/kP7j/rss"],"Zarzuela del Monte": ["https://www.zarzueladelmonte.es/home/-/asset_publisher/Sd1Q/rss"]};
// todas: lee todas las URLs (no solo la primera que funcione). pueblo: municipio por defecto si la noticia no lo dice.
const FEEDS = [
  { nombre: "SegoviaUdaz", urls: ["https://segoviaudaz.es/feed/"], local: true },
  { nombre: "esCuéllar", urls: ["https://escuellar.es/feed/"], local: true },
  { nombre: "El Adelantado", urls: ["https://www.eladelantado.com/feed/", "https://www.eladelantado.com/rss/"], local: /\/(segovia|provincia|sucesos|local)\// },
  { nombre: "Tribuna de Segovia", urls: ["https://www.tribunasegovia.com/rss.xml"] },
  { nombre: "El Día de Segovia", urls: ["http://www.eldiasegovia.es/rss/DSGProvincia.xml", "http://www.eldiasegovia.es/RSS/DSGlocal.xml"], todas: true, local: true },
  { nombre: "El Día de Segovia", urls: ["http://www.eldiasegovia.es/RSS/DSGPortada.xml"] },
  { nombre: "El Norte de Castilla", urls: ["https://www.elnortedecastilla.es/rss/2.0/?section=segovia"], local: true },
  { nombre: "El Norte de Castilla", urls: ["https://www.elnortedecastilla.es/rss/2.0/portada"], soloSiMenciona: true },
  { nombre: "Segovia Directo", urls: ["https://segoviadirecto.com/coverrss"], local: true },
  { nombre: "Segovia 24/7", urls: ["http://segovia247.es/coverrss"], local: true },
  { nombre: "Segovia al día", urls: ["https://segoviaaldia.es/coverrss"] },
  { nombre: "El Nordeste de Segovia", urls: ["https://www.elnordestedesegovia.es/noticias?format=feed&type=rss", "https://www.elnordestedesegovia.es/?view=featured&id=1&format=feed&type=rss"] },
  { nombre: "El Espinar Información", urls: ["https://www.elespinar.org/feeds/posts/default?alt=rss"], pueblo: "El Espinar" },
  { nombre: "La Granja-Valsaín", urls: ["https://www.lagranja-valsain.com/feed/"], pueblo: "Real Sitio de San Ildefonso" },
  { nombre: "Diario de Castilla y León", urls: ["https://www.diariodecastillayleon.es/rss/segovia.xml"], local: true },
  { nombre: "COPE Segovia", urls: ["https://www.cope.es/rss/emisoras/castilla-y-leon/segovia-provincia/segovia.xml", "https://www.cope.es/api/es/emisoras/castilla-y-leon/segovia-provincia/segovia/news/rss.xml"], soloSiMenciona: true },
  { nombre: "Onda Cero Segovia", urls: ["https://www.ondacero.es/rss/8521.xml"], local: true },
  { nombre: "Europa Press", urls: ["https://www.europapress.es/rss/rss.aspx?ch=283"], soloSiMenciona: true },
  { nombre: "Acueducto2", urls: ["https://www.acueducto2.com/feed/"], local: true },
  { nombre: "Segovia Sur", urls: ["https://www.segoviasur.com/feed/"], local: true },
  // Medios regionales y nacionales: solo lo que menciona Segovia o un pueblo
  { nombre: "okdiario", urls: ["https://okdiario.com/noticias/segovia/feed"], soloSiMenciona: true },
  { nombre: "Europa Press", urls: ["https://www.europapress.es/rss/rss.aspx?ch=304"], soloSiMenciona: true },
  { nombre: "ABC Castilla y León", urls: ["https://www.abc.es/rss/2.0/espana/castilla-leon/"], soloSiMenciona: true },
  { nombre: "20minutos", urls: ["https://www.20minutos.es/rss/castilla-y-leon/"], soloSiMenciona: true },
  { nombre: "eldiario.es Castilla y León", urls: ["https://www.eldiario.es/rss/castilla-y-leon/"], soloSiMenciona: true },
  { nombre: "El Español Castilla y León", urls: ["https://www.elespanol.com/rss/castilla-y-leon/"], soloSiMenciona: true },
  // Partidos y sindicatos: solo cuentan movilizaciones, visitas, actos con fecha o noticias de un pueblo
  { nombre: "PP de Segovia", urls: ["https://ppsegovia.com/feed/"], tipo: "organizacion" },
  { nombre: "PSOE de Segovia", urls: ["https://www.psoesegovia.es/feed/"], tipo: "organizacion" },
  { nombre: "PP de Castilla y León", urls: ["https://www.ppcyl.es/feed/"], tipo: "organizacion", soloSiMenciona: true },
  { nombre: "STECyL", urls: ["https://stecyl.net/feed/"], tipo: "organizacion", soloSiMenciona: true },
  { nombre: "UGT Castilla y León", urls: ["https://ugtcyl.es/web/feed"], tipo: "organizacion", soloSiMenciona: true },
  // Ayuntamientos con noticias propias (actos, plenos, fiestas, avisos)
  { nombre: "Ayuntamiento de Cuéllar", urls: ["https://www.aytocuellar.es/feed/"], pueblo: "Cuéllar" },
  { nombre: "Ayuntamiento de Cantalejo", urls: ["https://www.cantalejo.es/home/-/asset_publisher/QGA6lS8CBHs5/rss"], pueblo: "Cantalejo" },
  { nombre: "Ayuntamiento de Riaza", urls: ["https://www.riaza.es/home/-/asset_publisher/hr5A/rss"], pueblo: "Riaza" },
  { nombre: "Ayuntamiento de Sepúlveda", urls: ["https://www.sepulveda.es/home/-/asset_publisher/hr5A/rss"], pueblo: "Sepúlveda" },
  { nombre: "Ayuntamiento de La Lastrilla", urls: ["https://www.lalastrilla.es/home/-/asset_publisher/Sd1Q/rss"], pueblo: "La Lastrilla" },
  { nombre: "Agronews Castilla y León", urls: ["https://www.agronewscastillayleon.com/feed/"], soloSiMenciona: true },
  ...Object.entries(AYUNTAMIENTOS_WEB).map(([pueblo, urls]) => ({ nombre: "Ayuntamiento de " + pueblo, urls, pueblo, todas: urls.length > 1, ayto: true })),
];


// Clasificación y web de cada fuente (para la sección Medios de la app)
const INFO_FUENTE = {
  "El Adelantado": ["Periódicos y digitales de Segovia", "https://www.eladelantado.com"],
  "El Norte de Castilla": ["Periódicos y digitales de Segovia", "https://www.elnortedecastilla.es/segovia/"],
  "El Día de Segovia": ["Periódicos y digitales de Segovia", "https://www.eldiasegovia.es"],
  "Tribuna de Segovia": ["Periódicos y digitales de Segovia", "https://www.tribunasegovia.com"],
  "SegoviaUdaz": ["Periódicos y digitales de Segovia", "https://segoviaudaz.es"],
  "Segovia Directo": ["Periódicos y digitales de Segovia", "https://segoviadirecto.com"],
  "Segovia 24/7": ["Periódicos y digitales de Segovia", "https://segovia247.es"],
  "Segovia al día": ["Periódicos y digitales de Segovia", "https://segoviaaldia.es"],
  "Acueducto2": ["Periódicos y digitales de Segovia", "https://www.acueducto2.com"],
  "esCuéllar": ["Comarcales y locales", "https://escuellar.es"],
  "El Nordeste de Segovia": ["Comarcales y locales", "https://www.elnordestedesegovia.es"],
  "El Espinar Información": ["Comarcales y locales", "https://www.elespinar.org"],
  "La Granja-Valsaín": ["Comarcales y locales", "https://www.lagranja-valsain.com"],
  "COPE Segovia": ["Radio", "https://www.cope.es/emisoras/castilla-y-leon/segovia-provincia/segovia/noticias"],
  "Onda Cero Segovia": ["Radio", "https://www.ondacero.es/emisoras/castilla-y-leon/segovia/"],
  "Diario de Castilla y León": ["Agencias y medios regionales", "https://www.diariodecastillayleon.es/segovia/"],
  "Europa Press": ["Agencias y medios regionales", "https://www.europapress.es/castilla-y-leon/"],
  "Agronews Castilla y León": ["Sector agrario", "https://www.agronewscastillayleon.com"],
  "Segovia Sur": ["Comarcales y locales", "https://www.segoviasur.com"],
  "okdiario": ["Agencias y medios regionales", "https://okdiario.com/noticias/segovia"],
  "ABC Castilla y León": ["Agencias y medios regionales", "https://www.abc.es/espana/castilla-leon/"],
  "20minutos": ["Agencias y medios regionales", "https://www.20minutos.es/castilla-y-leon/"],
  "eldiario.es Castilla y León": ["Agencias y medios regionales", "https://www.eldiario.es/castilla-y-leon/"],
  "El Español Castilla y León": ["Agencias y medios regionales", "https://www.elespanol.com/castilla-y-leon/"],
  "PP de Segovia": ["Partidos y sindicatos", "https://ppsegovia.com"],
  "PSOE de Segovia": ["Partidos y sindicatos", "https://www.psoesegovia.es"],
  "PP de Castilla y León": ["Partidos y sindicatos", "https://www.ppcyl.es"],
  "STECyL": ["Partidos y sindicatos", "https://stecyl.net"],
  "UGT Castilla y León": ["Partidos y sindicatos", "https://ugtcyl.es/web/"],
};
const infoFuente = f => f.nombre.startsWith("Ayuntamiento de ") ? ["Ayuntamientos", (f.urls[0].match(/^https?:\/\/[^/]+/) || [""])[0]] : (INFO_FUENTE[f.nombre] || ["Otros", ""]);

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
  'Segovia embalse OR pantano OR presa OR vertido OR contaminación OR sequía',
  'Segovia cantera OR vertedero OR "impacto ambiental" OR tala OR lobo OR "incendio forestal"',
  'Segovia pleno OR alcalde OR moción OR concejales',
  'Segovia fiestas OR encierros OR "concentración motera" OR festival',
  'Segovia visita ministro OR ministra OR presidente OR consejero OR delegado',
  'Segovia mitin OR "29N" OR campaña OR candidatos',
  'Segovia pintadas OR vandalismo OR ultras OR "extrema derecha" OR "extrema izquierda" OR antifascista OR neonazi',
  'Segovia banda OR bandas OR pandilla OR "delito de odio" OR racismo',
  'Segovia polémica OR tensión OR crispación OR abucheos OR "malestar vecinal"',
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
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "Accept": "application/rss+xml, application/xml, text/xml, */*", "Accept-Language": "es-ES,es;q=0.9" },
    signal: AbortSignal.timeout(20000), redirect: "follow",
  });
  let res = r;
  // Algunos servidores rechazan las cabeceras de lector de RSS: se reintenta como un navegador normal
  if (res.status === 403) res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" }, signal: AbortSignal.timeout(20000), redirect: "follow" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const txt = await res.text();
  if (!/<(rss|feed|rdf:RDF|urlset)[\s>]/i.test(txt.slice(0, 3000))) throw new Error("no es un feed");
  return txt;
}

// Foto de la noticia en el RSS: media:content, media:thumbnail, enclosure o la primera <img> del texto
function imagenDe(it) {
  const at = v => (Array.isArray(v) ? v[0] : v)?.["@url"];
  let u = at(it["media:content"]) || at(it["media:thumbnail"]) || (/image/.test((Array.isArray(it.enclosure) ? it.enclosure[0] : it.enclosure)?.["@type"] || "") ? at(it.enclosure) : "");
  if (!u) {
    const raw = [it["content:encoded"], it.description, it.content, it.summary].map(v => typeof v === "object" && v ? (v["#text"] ?? "") : (v ?? "")).join(" ")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    u = (raw.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1];
  }
  return limpiaImg(u);
}
function limpiaImg(u) {
  if (!u || typeof u !== "string") return "";
  u = u.trim().replace(/&amp;/g, "&").replace(/^\/\//, "https://").replace(/^http:\/\//, "https://");
  if (!/^https:\/\//.test(u) || /\.(svg|gif)(\?|$)|pixel|logo|avatar|gravatar|emoji|placeholder|1x1/i.test(u)) return "";
  return u;
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
  const lista = d?.rss?.channel?.item ?? d?.rss?.item ?? d?.feed?.entry ?? d?.["rdf:RDF"]?.item ?? [];
  return (Array.isArray(lista) ? lista : [lista]).map(it => {
    const txt = v => typeof v === "object" && v !== null ? (v["#text"] ?? "") : (v ?? "");
    let link = it.link;
    if (Array.isArray(link)) link = (link.find(l => l?.["@rel"] === "alternate") ?? link[0]);
    link = typeof link === "object" ? (link?.["@href"] ?? link?.["#text"]) : link;
    return {
      img: imagenDe(it),
      titulo: limpia(txt(it.title)),
      url: String(link ?? "").trim(),
      fecha: new Date(txt(it.pubDate) || txt(it.published) || txt(it.updated) || txt(it["dc:date"]) || Date.now()),
      sinFecha: !(txt(it.pubDate) || txt(it.published) || txt(it.updated) || txt(it["dc:date"])),
      texto: limpia(txt(it.description) || txt(it.summary) || txt(it["content:encoded"]) || txt(it.content)),
      cuerpo: limpia(txt(it["content:encoded"]) || txt(it.content) || ""),
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
  if (/\b(un|una|el|la|varios|algunos) (pueblos?|localidad(es)?|municipios?) (de (la provincia de )?segovia|segovian[oa]s?)|provincia de segovia/.test(norm(texto))) return "Provincia";
  if (unicos.includes("Segovia")) return "Segovia";
  const n = norm(texto);
  if (/\bprovincia\b|diputacion|pueblos de segovia|toda segovia|comarca|nordeste|tierra de pinares|campina segoviana|sierra de ayllon|alcaldes de la zona/.test(n)) return "Provincia";
  return /segovia/.test(n) ? "Segovia" : "General";
}

const PATRONES = {
  policial: /seguridad ciudadana|seguridad en las calles|inseguridad|guardia civil|policia|\bpresos?\b|reclus|funcionario de prisiones|lesiona a|detenid|detencion|arrest|investigad|robo|robar|roband|robaron|retienen|retenido|pillad[oa] (robando|in fraganti)|sorprendid[oa] (robando|cuando)|ladron|hurto|estafa|timo|droga|marihuana|cocaina|juzgado|tribunal|audiencia provincial|condena|juicio|prision|carcel|penitenciari|agresion|agredid|violencia de genero|maltrato|delito|operacion|okupa|atraco|sustraccion|incautad|furtiv|apunal|reyerta|pelea|altercado|seprona|antidroga|narcotrafico|bandas? (latina|juvenil|organizada|criminal|de (ladrones|delincuentes|atracadores|narcotraficantes))|trinitarios|dominican don|pandilla|clan familiar|grupo organizado|organizacion criminal|delito de odio|delitos de odio|racis|xenofob|homofob|amenaza|extorsion|ocupacion|okupad/,
  social: /concentracion|manifestacion|protesta|huelga|paros|\bparar\b|llamad[oa]s a (la huelga|parar|movilizarse|concentrarse)|plataforma|movilizacion|se moviliza|movilizan|movilizarse|movilizara|reivindica|pancarta|sindicat|ccoo|\bugt\b|\bcgt\b|\bcsif\b|\bstecyl\b|asociacion vecinal|vecinos (denuncian|protestan|reclaman|se oponen|se movilizan|exigen)|recogida de firmas|recoge(n)? firmas|firmas contra|marea blanca|se oponen|cacerolada|encierro|tractorada|asaja|\bupa\b|\bcoag\b|union de campesinos|ecologistas|alegaciones|\bere\b|\berte\b|despidos|cierre de la (empresa|fabrica|planta)|comite de empresa|\bultras\b|ultraderech|ultraizquierd|grupo ultra|extrema (derecha|izquierda)|antifa|fascis|pintadas|vandal|disturbios|radical|yihad|terroris|centro de acogida|refugiados|inmigra|migrante|temporeros|menores no acompanados|\bmenas?\b|patera|en situacion irregular|regularizacion|neonazi|nazi|esvastica|franquis|falange|anarquis|antisistema|abertzale|polemica|crispacion|tension|enfrentamiento|abuche|insultos|boicot|escrache|indignacion|indigna a|indignados|malestar|(vecinos|padres|familias|trabajadores|plantilla|agricultores|ganaderos|usuarios|hosteleros|comerciantes|sanitarios|medicos|enfermer\w+|profesores|docentes|alumnos|estudiantes|afectados|jubilados|pensionistas|taxistas|transportistas)( de [\w ]{2,30})? (critican|denuncian|protestan|reclaman|exigen|se quejan|muestran su malestar|se oponen|rechazan|se movilizan|alertan|estallan|se plantan)|okupa|ocupacion ilegal|desalojo|desahucio/,
  // Temas que solo interesan si hay conflicto (rechazo vecinal, alegaciones, moratorias...)
  proyecto: /macrogranja|granja porcina|biogas|biometano|fotovoltaic|planta solar|parque solar|placas solares|eolic|aerogenerador|mineria|cantera|vertedero|depuradora|linea de alta tension|agricultores|ganaderos|convenio|colectivo/,
  medioambiente: /biomasa|red de calor|central termica|calefaccion de distrito|energia renovable|renovables|hidrogeno verde|bateria de almacenamiento|embalse|pantano|\bpresas? (de|del)\b|\bazud|rio (eresma|cega|duraton|riaza|voltoya|moros|piron|adaja|zapardiel|pirón)|caudal|vertido|contamina|purines|nitratos|acuifero|sequia|restricciones de agua|cortes? de(l)? (suministro de )?agua|agua potable|abastecimiento de agua|depuradora|\bedar\b|macrogranja|granja (porcina|de cerdos|avicola|intensiva)|explotacion porcina|biogas|biometano|planta (solar|fotovoltaica|de biogas|de biometano|de residuos|de reciclaje|de hidrogeno)|parque (solar|eolico|fotovoltaico)|fotovoltaic|huerto solar|aerogenerador|eolico|linea de (muy )?alta tension|subestacion|cantera|mineria|\bmina\b|extraccion de|gravera|vertedero|residuos|incendios? forestal|quema de rastrojos|\btala\b|talas|deforestac|plantacion (de|forestal)|repoblacion|monte publico|\bpinos\b|resina|\blobos?\b|ataques? de lobo|especies? invasora|plaga|espacio natural|red natura|\bzepa\b|parque (nacional|natural)|guadarrama|hoces del (duraton|riaza)|impacto ambiental|evaluacion ambiental|declaracion de impacto|medio ?ambient|ecologist|cambio climatico|calidad del agua|fauna|biodiversidad/,
  autoridades: /visita (del|de la|de los|de) (ministr|president|rey|reina|delegad|subdelegad|consejer|vicepresident|secretari|director general|procurador|senador|diputad|candidat|lider|alcalde)|visitara|ministr[oa] .{0,40}(segovia|visita)|felipe vi|\bel rey\b|la reina|princesa leonor|manueco|presidente de la junta|delegado del gobierno|delegad[oa] de la junta|subdelegad[oa] del gobierno|mitin|campana electoral|acto electoral|acto de campana|cierre de campana|candidat|cabeza de lista|abascal|feijoo|pedro sanchez|yolanda diaz|ione belarra|irene montero|garcia-gallardo|pollan|carriedo|suarez-quinones|oscar puente|ministerio del interior|director general de la guardia civil|secretari[oa] de estado|comitiva|autoridades/,
  politica: /pleno|alcalde|alcaldesa|concejal|oposicion|cortes de castilla|consejer|subdelegad|delegado del gobierno|procurador|senador|diputad[oa]s? (provincial|nacional)|\bministr|\bpp\b|psoe|\bvox\b|podemos|izquierda unida|segovia en marcha|frente amplio|espana vaciada|por avila|elecciones|electoral|votantes|\bvoto\b|mocion|dimision|dimite|cese|denuncia (el|la) (pp|psoe|vox|grupo)|partido popular|partido socialista|gobierno municipal|equipo de gobierno/,
  emergencias: /accidente|colision|choque|salida de via|atropell|herid|fallec|muere|murio|incendio|fuego|bomberos|rescat|112|desaparecid|inundacion|nevada|temporal|aviso (amarillo|naranja|rojo)|corte de (la )?carretera|trafico|\bdgt\b|\ba-1\b|\ba-6\b|\bap-6\b|\bap-61\b|n-110|n-603|cl-6\d\d|sg-\d|evacuad|derrumbe|explosion/,
  economia: /empresa|empleo|paro registrado|inversion|millones de euros|industria|agricultor|ganader|poligono|comercio|negocio|turismo|hosteleria|subvencion|ayudas|precio/,
  sociedad: /sanidad|centro de salud|consultorio|hospital|colegio|instituto|educacion|vivienda|mayores|residencia|despoblacion|servicios sociales|universidad|medico/,
  cultura: /fiesta|fiestas|concierto|festival|teatro|exposicion|feria|romeria|procesion|halloween|certamen|museo|cine|libro|patrimonio|musica|danza|tradicion/,
  deportes: /futbol|gimnastica segoviana|baloncesto|balonmano|atletismo|carrera popular|maraton|ciclismo|liga|campeonato|club deportivo|tenis|padel|deportista|jornada \d/,
};
// Deportes y cultura no interesan salvo que haya un suceso
const DEPORTE = /colista|triunfo copero|\bcopero\b|\bel nava\b(?! de)|\bal nava\b(?! de)|entrenador|fichaj|\bjugador(es|as)?\b|goleador|(primera|segunda|tercera) (division|rfef|federacion)|division de honor|liga asobal|playoff|eliminatoria|copa del rey|\bsegosala\b|\bnava\b (se|cae|gana|vence|pierde|suma|empata)|unami|naturpellet|balonmano nava|cochinillo segoviano|bigmat|\bc\.?d\.? |\bcf\b|\bud\b |gimnastica segoviana|\bsegoviana\b|segosala|futbol|baloncesto|balonmano|voleibol|atletismo|ciclismo|\bliga\b|jornada \d|derbi|\bgol(es)?\b|victoria|derrota|empate|clasificacion|campeonato|torneo|seminci|exposicion|libro|novela|teatro|cine\b|museo/;
// Solo eventos que mueven mucha gente y pueden necesitar dispositivo de seguridad
const EVENTO = /fiestas (patronales|de |en honor|del )|fiesta patronal|encierros?|toros|capea|novillada|concentracion motera|motoristas|festival|macroconcierto|concierto multitudinario|romeria|carrera popular|marcha (popular|reivindicativa)|botellon|partido de alto riesgo|multitudinari|miles de (personas|visitantes|asistentes)|macrofiesta|rave|fiesta ilegal/;
// Ocio y planes sin interés para la unidad
const EVENTO_NO = /halloween|pasaje del terror|taller|concurso|disfraces|infantil|gastronom|jornadas|exposicion|mercado|cuentacuentos|ruta |visitas? guiada|charla|conferencia|presentacion|libro|cabalgata|contrato|feria de (ganado|artesania|muestras)|solidari/;
// IMPORTANTE (rojo): solo lo grave de verdad, y decidido por el titular
const ALTA = /detenid|detien|detencion|arrestad|agresion|agredid|apunal|acuchill|reyerta|pelea multitudinaria|tiroteo|disparo|violencia de genero|violencia machista|asesin|homicid|mata a|muerte violenta|cadaver|robo con violencia|atraco|okupa|ocupacion ilegal|banda (latina|juvenil|organizada|criminal)|trinitarios|organizacion criminal|delito de odio|operacion (de la guardia civil|antidroga|policial)|desarticula|incautad|narcotrafic|manifestacion|concentracion (de|contra|en|frente|ante|convocada)|se concentrar|se manifestar|convoca(n|do|da)? (una |la )?(concentracion|manifestacion|huelga|protesta|movilizacion|tractorada|marcha)|huelga (indefinida|general)|tractorada|corte de (la )?(carretera|via|autovia)|cortan la|encierro (de|en) protesta|se encierran|desalojo|desahucio|disturbios|altercados|enfrentamiento|cargas policiales|pintadas|\bultras\b|ultraderech|neonazi|esvastica|fallec|muere|murio|muertos?\b|mortal|herido grave|heridos graves|incendio|desaparecid|rescat|evacuad|explosion|derrumbe|visita (del|de la) (ministr|president|rey|reina|vicepresident)|felipe vi|\bel rey\b|mitin|vertido|peces muertos|muerte de peces/;
// Actos de recuerdo con carga política (franquismo, memoria histórica, terrorismo, partidos): sí son importantes
const ACTO_RECUERDO = /homenaje|recuerda a|en (el )?recuerdo|minutos? de silencio|aniversario|conmemora|ofrenda|misa|funeral|acto (de|en|por)|memoria de|placa|monumento|concentracion|exhumacion|fosa/;
const POLITIZADO = /franquis|falang|jose antonio|primo de rivera|\bcaidos\b|cruz de los caidos|memoria (historica|democratica)|fusilad|represaliad|represion|\bfosas?\b|exhumac|guerra civil|republican|brigadist|exaltacion|simbolog|18 de julio|\b20-?n\b|20 de noviembre|francisco franco|caudillo|dictadura|dictador|victimas del terrorismo|victimas de eta|\beta\b|\bultras?\b|neonazi|nostalgic|organizad[oa] por (vox|el pp|el psoe|podemos|iu|sumar|falange)|\bvox\b|carlist|monarquic|nacionalcatolic/;
// Nunca importante: actos de recuerdo y conmemoración (salvo los politizados)
const NO_ALTA = /homenaje|recuerda a|en (el )?recuerdo|minutos? de silencio|guarda silencio|aniversario|conmemora|ofrenda|misa|funeral|condolencias|luto|memoria de|placa en honor|aniversari/;

const SERVICIO = /operad[oa]s?\b|quirurgic|cirugia|intervenciones|sanidad|sanitari|hospital|centro de salud|consultorio|medic[oa]s?\b|urgencias|pediatr|ambulancia|colegio|escuela|instituto|aulas?\b|profesor|docente|transporte|autobus|\btren(es)?\b|cercanias|renfe|\bave\b|estacion|carretera|servicio postal|correos|cajero|banco|farmacia|residencia/;
const SERVICIO_MAL = /falta de|sin medico|sin pediatra|deficit|colapso|cierre|cierra|recorte|suprim|lista[s]? de espera|espera media|saturad|caos|retrasos|cancelacion|cancelad|denuncia|reclama|exige|quejas|abandono|olvido|indignac|precari|desmantel/;
const VISITA = /visita|visito|visitan|visitara|recorre|recorrio|recorrera|inaugur|presid(e|io|ira)|asist(e|io|ira)|acompan|se reun|reunion con|mitin|acto |participa|estara en|llega a|en su paso por/;
const CARGO = /ministr|president|vicepresident|consejer|delegad|subdelegad|secretari[oa] (de estado|general)|director general|procurador|senador|diputad|candidat|cabeza de lista|lider|portavoz nacional|el rey|la reina|felipe vi|princesa|manueco|abascal|feijoo|sanchez|yolanda diaz|alcalde de segovia/;
const CONFLICTO = /rechaz|oposicion|se oponen|en contra|contra (la|el|los|las)|alegaciones|plataforma|vecinos|protesta|moratoria|frenar|paraliz|suspende|denuncia|polemica|recurso|tribunal|concentracion|manifestacion/;
const PREVENTIVO = /preve|prevision|peligro|riesgo|recomendaciones|recomienda|operacion (salida|especial|retorno)|regulacion del trafico|corte(s)? (de )?trafico|bando|aviso amarillo|alerta amarilla|campana de|dispositivo especial|desplazamientos|accesos al cementerio|ruta/;
const SUCESO = /herid|fallec|muere|murio|muert|accidente|colision|choque|atropell|incendio (en|declarado|forestal en|de una|de un)|arde|rescat|desaparecid|evacu|derrumbe|explosion|calcinad|vuelco|salida de via/;
const CONFLICTO_POL = /polemica|critica|denuncia|enfrent|tension|dimi|censura|acusa|reprocha|bronco|crispa|abandona|expuls|imputad|querella|candidat|elecciones|electoral|29n|mitin|campana|protesta|exige|reclama|rechazo|pide la|tumba|bloque|veta|oposicion/;
function clasifica(titulo, texto, municipio, soloTitulo = false) {
  // Las webs de ayuntamientos se juzgan solo por el titular (sus textos son avisos y bandos)
  if (soloTitulo) texto = "";
  const t = norm(titulo + " " + texto);
  const tt = norm(titulo);
  const UTILES = ["policial", "social", "medioambiente", "politica", "emergencias", "autoridades"];
  if (DEPORTE.test(tt) && !/detenid|agresion|pelea|reyerta|herid|incidentes|violencia|protesta|firmas|concentracion|manifestacion|huelga|polemica|boicot|ultras\b/.test(tt)) return { categorias: [], relevancia: "baja", descartar: true };
  if (/^fs |\bf\.?s\.? |futbol sala|\bcd |\bud |\bcf |\bc\.d\.|club deportivo|segunda (division|rfef)|tercera (division|rfef)|regional preferente/.test(tt)) return { categorias: [], relevancia: "baja", descartar: true };
  let categorias = UTILES.filter(k => PATRONES[k].test(tt));
  // Visitas y actos de cualquier cargo político: verbo de visita/acto en el titular y un cargo en la noticia
  if (!categorias.includes("autoridades") && VISITA.test(tt) && CARGO.test(t)) categorias.unshift("autoridades");
  // Actos públicos de recuerdo o repulsa (minutos de silencio, vigilias, concentraciones de repulsa): gente en la calle
  if (!categorias.includes("social") && /minutos? de silencio|concentracion de (repulsa|condena)|vigilia|homenaje a (las )?victima|ofrenda floral|recuerda a .{0,40}con/.test(tt)) categorias.unshift("social");
  // Servicios públicos con problemas (sanidad, educación, transporte): fuente habitual de protestas
  if (!categorias.includes("social") && SERVICIO.test(tt) && SERVICIO_MAL.test(tt)) categorias.unshift("social");
  // Energía, macrogranjas, campo, inmigración...: cuentan como conflicto solo si hay rechazo o protesta
  if (!categorias.includes("social") && PATRONES.proyecto.test(t) && CONFLICTO.test(t)) categorias.unshift("social");
  const porTexto = !categorias.length;
  if (!categorias.length) categorias = UTILES.filter(k => k !== "medioambiente" && PATRONES[k].test(t)).slice(0, 2);
  if (/minutos? de silencio|guarda silencio|en (el )?recuerdo|homenaje|condolencias|luto/.test(tt)) categorias = categorias.filter(c => c !== "emergencias");
  if (EVENTO.test(tt) && !EVENTO_NO.test(tt)) categorias.push("eventos");
  categorias = categorias.slice(0, 3);
  let relevancia = "baja";
  const politizado = ACTO_RECUERDO.test(tt) && POLITIZADO.test(t);
  if (politizado) { categorias = [...new Set(["social", "politica", ...categorias])].slice(0, 3); relevancia = "alta"; }
  else if (ALTA.test(tt) && !NO_ALTA.test(tt) && categorias.some(c => ["policial", "social", "emergencias", "autoridades", "medioambiente"].includes(c))) relevancia = "alta";
  else if (categorias.includes("autoridades") && VISITA.test(tt) && CARGO.test(tt) && !NO_ALTA.test(tt)) relevancia = "alta";
  else if (categorias.length) relevancia = "media";
  // Relleno que no interesa aunque toque un tema útil:
  // - estadísticas electorales (votantes en el extranjero, censo, sorteo de mesas)
  if (/votantes|electores|censo electoral|\bcera\b|sorteo de (las )?mesas/.test(tt) && !categorias.some(c => ["policial", "social", "autoridades"].includes(c))) return { categorias: [], relevancia: "baja", descartar: true };
  // - avisos preventivos de tráfico y emergencias: solo cuentan los sucesos reales
  if (categorias.every(c => c === "emergencias") && PREVENTIVO.test(tt) && !SUCESO.test(tt)) return { categorias: [], relevancia: "baja", descartar: true };
  // - gestión municipal de la capital sin conflicto (contratos, ordenanzas, urbanismo...)
  if (municipio === "Segovia" && categorias.length && categorias.every(c => c === "politica") && !CONFLICTO_POL.test(tt)) return { categorias: [], relevancia: "baja", descartar: true };
  // Previsiones y avisos generales (peligro de incendios, operación salida...) no son urgentes
  if (relevancia === "alta" && /peligro|riesgo|preve|prevision|prevencion|campana de|operacion (salida|especial)|recomendaciones/.test(tt) && !/detenid|herid|fallec|muere/.test(tt)) relevancia = "media";
  if (municipio === "Segovia" && relevancia === "alta" && !politizado) relevancia = "media";
  return { categorias, relevancia, porTexto: porTexto && !politizado, noAlta: NO_ALTA.test(tt) && !politizado };
}

/* Fecha de convocatoria: "el próximo sábado", "el 14 de noviembre", "a las 19:00" */
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
const CONVOCA = /convoca|manifesta|concentrara|protestara|movilizara|convocatoria|concentrac|manifestac|huelga|paros|pleno|marcha|protesta|movilizac|tractorada|caravana|encierro|mitin|visita|visitara|acto |asamblea|recogida de firmas|cacerolada|celebrara|tendra lugar|se celebra|fiestas|encierros|concentracion motera|festival|romeria/;
const LETRA_MES = { E: 0, F: 1, S: 8, O: 9, N: 10, D: 11 }; // 11N, 4D... (solo letras sin ambigüedad)
const AGENDA_TITULO = /convoca|parar|paro (el|del|de)|llamad[oa]s a|jornada de (huelga|lucha|protesta)|manifesta|concentrac|protesta|huelga|paros|tractorada|caravana|encierro|cacerolada|mitin|visita|visitara|pleno|asamblea|marcha|movilizac|recogida de firmas|fiestas|encierros|concentracion motera|festival|romeria|acto (de|en|por)|homenaje|vigilia/;
function eventoDe(titulo, texto, publicada, categorias = []) {
  if (!categorias.some(c => ["social", "autoridades", "politica", "eventos"].includes(c))) return {};
  const tt = norm(titulo);
  if (!AGENDA_TITULO.test(tt)) return {};
  const t = norm(titulo + " " + texto);
  const tOrig = titulo + " " + texto;
  const base = new Date(fechaMadrid(publicada) + "T12:00:00");
  let pasada = false; // la fecha que cita ya ha pasado: es una crónica, no una convocatoria
  const conAnio = f => { if (f < base) { f.setFullYear(f.getFullYear() + 1); if ((f - base) / 864e5 > 120) pasada = true; } return (f - base) / 864e5 > 120 ? null : f; };
  let f = null, m;
  if ((m = t.match(/\b(?:del?|el|los dias|dias)?\s*(\d{1,2})(?:\s*(?:y|al|-|a)\s*\d{1,2})?\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/))) {
    f = new Date(base); f.setMonth(MESES.indexOf(m[2]), +m[1]); f = conAnio(f);
  } else if ((m = t.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/)) && +m[2] >= 1 && +m[2] <= 12) {
    f = new Date(+m[3], +m[2] - 1, +m[1], 12); if (f < base) pasada = true; if (f < base || (f - base) / 864e5 > 120) f = null;
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
  const convocatoria = /convoca|llama(n)? a|llamad[oa]s a|parar(a|an)? |pararan|jornada de (huelga|lucha|protesta)|pleno (extraordinario|ordinario)|anuncia|se concentrar(a|an)|se manifestar(a|an)|movilizar(a|an)|protestar(a|an)|secundar|visitara|participara|celebrara|preparan|proxim[oa]|mitin|tractorada|huelga (el|del|los|indefinida|general)|paros (el|los|del)|recogida de firmas/.test(tt);
  if (!f) return convocatoria && !pasada ? { convocatoria: true } : {};
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
  fallec: "muert", falle: "muert", muere: "muert", muert: "muert", murio: "muert", sinie: "accid", accid: "accid", colis: "accid", choqu: "accid", robar: "robo", roban: "robo", robo: "robo", robos: "robo", robad: "robo", hurto: "robo", coche: "vehic", vehic: "vehic", turis: "vehic", retie: "deten", reten: "deten" };
const tokens = s => new Set(norm(s).replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter(w => w.length > 2 && !VACIAS.has(w)).map(w => SINONIMOS[w.slice(0, 5)] || SINONIMOS[w] || w.slice(0, 5)));
// Si la noticia viene de un medio o ayuntamiento de un pueblo y no nombra otro, es de ese pueblo
const ORGANIZACIONES = new Set(FEEDS.filter(f => f.tipo === "organizacion").map(f => f.nombre));
const SOLO_SI_MENCIONA = new Set(FEEDS.filter(f => f.soloSiMenciona).map(f => f.nombre));
const PUEBLO_DE_FUENTE = new Map(FEEDS.filter(f => f.pueblo).map(f => [f.nombre, f.pueblo]));
const soloOrganizacion = medios => medios.every(m => ORGANIZACIONES.has(m.nombre));
const soloAyto = medios => medios.every(m => /^ayuntamiento/i.test(m.nombre));
// Noticias de otras provincias que se cuelan (accidentes en Ávila, pueblos de Valladolid cercanos...)
const FUERA = /\ben (avila|valladolid|madrid|soria|burgos|toledo|guadalajara|leon|salamanca|zamora|palencia)\b|\bva-\d|\bav-\d|campaspero|\biscar\b|penafiel|portillo|arevalo|navas del marques|cantalapiedra|olmedo/;
const fueraDeProvincia = (titulo, municipio) => !CONCRETO(municipio) && FUERA.test(norm(titulo)) ? "General" : municipio;
// Relleno que no aporta a la unidad aunque toque un tema de interés
const POL_CONFLICTO = /\bpp\b|psoe|\bvox\b|podemos|\bsumar\b|izquierda unida|\biu\b|segovia en marcha|por segovia|ciudadanos|oposicion|acusa|critica|denuncia|exige|reprocha|polemica|bronco|tension|dimision|dimite|reprobac|mocion de censura|29n|elecciones|candidat|campana|mitin|abucheo|insultos|enfrentamiento|rechazo vecinal|vecinos/;
const ESTADISTICA_ELECTORAL = /votantes|censo|electores|sorteo de (las )?mesas|mesas electorales|voto por correo|\bcera\b|voto exterior|en el extranjero|participacion/;
const PREVENTIVO_EMERG = /preve|prevision|peligro|riesgo|recomendacion|consejos|operacion (salida|especial|retorno)|regulacion del trafico|accesos al cementerio|cortes? (de|del) trafico|corte trafico|desvios|\bbando\b|ruta |campana de|dispositivo especial/;
const INCIDENTE = /accidente|herid|fallec|muere|murio|incendio (en|declarado|forestal en)|calcina|rescat|desaparecid|evacu|colision|atropell|vuelco|explosion|derrumbe|aviso (naranja|rojo)|alerta (naranja|roja)|nevada|inundac/;
function relleno(n) {
  const tt = norm(n.titulo), c = n.categorias;
  // Notas de prensa de partidos y sindicatos: solo movilizaciones, visitas, actos con fecha o de un pueblo
  if (soloOrganizacion(n.medios || []) && !/huelga|concentracion|manifestacion|movilizacion|protesta|paros|asamblea|mitin|visita|acto (de|en|con)|campana electoral|caravana|encierro|tractorada|recogida de firmas|cierre de campana/.test(tt)) return true;
  const solo = ks => c.length && c.every(k => ks.includes(k));
  // Trámites administrativos (compras, subvenciones, contratos, empleo público): no son noticias para la unidad
  if (/^(adquisicion|suministro|licitacion|contrato|contratacion|subvencion|ayudas?|bases|convocatoria de (plazas|empleo|bolsa|ayudas|subvenciones)|bolsa de empleo|oferta de empleo|obras de|proyecto de obras|aprobacion (inicial|definitiva)|exposicion publica|padron|tasas|impuesto|calendario fiscal)/.test(tt) && !c.some(k => ["policial", "social"].includes(k) && !soloAyto(n.medios || []))) return true;
  if (/\blicita\b|licitacion|adjudica|contrato de|pliego/.test(tt) && solo(["politica", "autoridades", "emergencias", "medioambiente"])) return true;
  // Periodismo de servicio (consejos, guías, precios): no son noticias para la unidad salvo sucesos o movilizaciones
  if (/^(ventajas|consejos|claves|trucos|como (ahorrar|calentar|elegir|hacer|preparar)|cuanto cuesta|el precio de|guia (para|de)|todo lo que|lo que (debes|tienes que)|asi (es|son|se|puedes)|estos son los mejores|que hacer|planes para|recomendaciones)/.test(tt) && !c.some(k => ["policial", "social"].includes(k))) return true;
  // Webs de ayuntamientos: los plenos ordinarios no aportan (los extraordinarios sí: mociones, dimisiones...)
  if (soloAyto(n.medios || []) && solo(["politica"]) && !/mocion de censura|dimision|dimite|toma de posesion|cese/.test(tt + " " + norm(n.resumen || ""))) return true;
  // Capital: el tema tiene que estar en el titular (o confirmado en el texto completo), no en palabras sueltas del resumen
  if (n.municipio === "Segovia" && n.porTexto && !n.analisis?.cats?.length) return true;
  // 1) Gestión municipal de la capital sin conflicto (contratos, ordenanzas, urbanismo...)
  if (n.municipio === "Segovia" && solo(["politica", "eventos"]) && !POL_CONFLICTO.test(tt)) return true;
  // 3) Estadísticas y trámites electorales (sí quedan candidaturas, mítines y visitas)
  if (ESTADISTICA_ELECTORAL.test(tt) && !/candidat|mitin|visita|campana|lista/.test(tt) && solo(["politica", "social", "autoridades"])) return true;
  // 2) Avisos preventivos de tráfico y emergencias (sí quedan los sucesos reales)
  if ((c.includes("emergencias") || c.includes("medioambiente")) && solo(["emergencias", "politica", "autoridades", "medioambiente"]) && PREVENTIVO_EMERG.test(tt) && !INCIDENTE.test(tt)) return true;
  return false;
}
const conPueblo = (m, pueblo) => pueblo && !CONCRETO(m) ? pueblo : m;
const CONCRETO = m => m && !["Segovia", "Provincia", "General"].includes(m);
// Dos titulares son la misma noticia si se parecen mucho, o si son del mismo pueblo,
// de días cercanos y comparten al menos 2 palabras significativas (además del nombre del pueblo).
// Un titular que trae un cambio (se suspende, hay un detenido, fallece...) no se junta con el anterior: es otra noticia
const DESARROLLO = /suspend|desconvoc|aplaz|cancel|detenid|detien|retien|retenid|fallec|muere|murio|acuerdo|levanta|finaliza|termina|desalojad|condena|absuel/;
// Si comparten el enlace de un artículo, son la misma noticia sin duda
const comparteUrl = (a, b) => (a.medios || []).some(m => (b.medios || []).some(x => x.url === m.url));
function mismaNoticia(a, b) {
  // Noticias de pueblos distintos nunca son la misma (p. ej. "Pleno extraordinario" en dos ayuntamientos)
  if (CONCRETO(a.municipio) && CONCRETO(b.municipio) && a.municipio !== b.municipio) return false;
  let comunes = 0; for (const w of a.tk) if (b.tk.has(w)) comunes++;
  if (parecido(a.tk, b.tk) >= 0.55 && comunes >= 3) return true;
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
  elconfidencialdigital: "El Confidencial Digital", confidencialdigital: "El Confidencial Digital", segovia247: "Segovia 24/7", rtvees: "RTVE", okdiario: "okdiario", okdiariocom: "okdiario", elespanol: "El Español Castilla y León", eldiarioes: "eldiario.es Castilla y León", abc: "ABC Castilla y León", abces: "ABC Castilla y León", "20minutos": "20minutos", "20minutoses": "20minutos", segoviasur: "Segovia Sur", ppsegovia: "PP de Segovia", psoesegovia: "PSOE de Segovia", stecyl: "STECyL", lagranjavalsain: "La Granja-Valsaín", segoviaaldia: "Segovia al día", diariodecastillayleonsegovia2: "Diario de Castilla y León", ondacerosegovia: "Onda Cero Segovia", acueducto2: "Acueducto2", acueducto2com: "Acueducto2" };
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
const BASURA = /^(resultados (de las )?elecciones|resultados electorales|el tiempo en|calidad del aire|prevision (del tiempo|meteorologica)|horoscopo|loteria|resultados? (de la )?(loteria|bonoloto|primitiva|euromillones)|esquelas?|farmacias de guardia|cartelera)/;
const NO_ESPANA = /mexico|argentina|colombia|chile|peru|venezuela|tlaxcala|puebla|uruguay|ecuador|bolivia|paraguay|guatemala|honduras|panama|costa rica|cuba|dominicana|miami/;
function parecido(a, b) {
  let comun = 0; for (const w of a) if (b.has(w)) comun++;
  return comun / Math.min(a.size, b.size || 1);
}

/* ------------------------------------------------------------------ */
/* Lectura del cuerpo de la noticia                                    */
/* ------------------------------------------------------------------ */
const ultimaImg = new Map(); // foto principal (og:image) de cada artículo leído
async function leeArticulo(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "Accept": "text/html" }, signal: AbortSignal.timeout(10000), redirect: "follow" });
    if (!r.ok) return "";
    let html = (await r.text()).slice(0, 600000);
    const og = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image/i) || [])[1];
    ultimaImg.set(url, limpiaImg(og));
    const art = html.match(/<article[\s\S]*?<\/article>/i); if (art && art[0].length > 1500) html = art[0];
    const ps = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => limpia(m[1])).filter(p => p.length > 60 && !/cookies|suscri|newsletter|todos los derechos|publicidad|comparte|whatsapp|telegram/i.test(p));
    return ps.join(" ").slice(0, 8000);
  } catch { return ""; }
}
// Indicios fuertes en el cuerpo (hacen falta al menos 2 menciones para contar)
const FUERTE = {
  policial: /ha(n)? (sido )?detenid|detenid[oa]s? (a|al|por|como|en|tras)|detencion de|guardia civil (ha )?(investiga|detiene|detuvo|esclarece|desarticula|busca)|agresion|apunal|reyerta|okupa|banda (latina|juvenil|organizada|criminal)|delito de odio|robo con (fuerza|violencia)|violencia de genero|atestado/g,
  social: /concentracion|manifestacion|huelga|tractorada|protesta|movilizacion|recogida de firmas|plataforma (vecinal|ciudadana|contra|en defensa|de afectados)|cacerolada|pintadas|neonazi|\bultras\b|ultraderech|ultraizquierd|extrema (derecha|izquierda)|antifascista|inmigra|migrantes|centro de acogida|desalojo|abuche|escrache|crispacion|enfrentamiento|alegaciones|se oponen|rechazo vecinal/g,
  autoridades: /visita (del|de la) (ministr|president|consejer|delegad|subdelegad|secretari)|visitara|mitin|acto electoral|campana electoral|acto de campana/g,
  medioambiente: /embalse|pantano|vertido|contamina|purines|macrogranja|biogas|biometano|planta (solar|fotovoltaica|de biogas)|parque (solar|eolico)|fotovoltaic|cantera|mineria|vertedero|incendio forestal|impacto ambiental|evaluacion ambiental|tala de|sequia|depuradora|linea de alta tension/g,
};
const CONVOCA_CUERPO = /convoca(n|do|da|dos|das)?\b|se concentrar(a|an)|se manifestar(a|an)|tendra lugar|visitara|mitin|huelga (el|los|indefinida)|tractorada|marcha (que|hasta)|partira|recorrera/;
function analizaCuerpo(titulo, cuerpo, publicada) {
  if (!cuerpo || cuerpo.length < 200) return { vacio: true, v: 3 };
  const t = norm(cuerpo.slice(0, 5000));
  const cats = [], pistas = [];
  for (const [k, re] of Object.entries(FUERTE)) {
    const m = [...t.matchAll(re)];
    if (m.length >= 2) { cats.push(k); pistas.push(m[0].index); }
  }
  // Frase que explica por qué interesa
  const frases = cuerpo.slice(0, 5000).split(/(?<=[.!?])\s+/);
  let extracto = "";
  if (cats.length) {
    const re = new RegExp(cats.map(k => FUERTE[k].source).join("|"));
    extracto = frases.find(f => re.test(norm(f)) && !norm(titulo).includes(norm(f).slice(0, 40))) || "";
  }
  // Convocatoria con fecha en el cuerpo
  let evento = null;
  for (const f of frases) {
    const nf = norm(f);
    if (!CONVOCA_CUERPO.test(nf)) continue;
    const e = eventoDe(f, "", publicada, ["social"]);
    if (e.fecha_evento && e.convocatoria) { evento = { fecha_evento: e.fecha_evento, ...(e.hora_evento ? { hora_evento: e.hora_evento } : {}), frase: recorta(f, 240) }; break; }
  }
  const muni = municipioDe(cuerpo.slice(0, 1500));
  // Dónde ocurre, según el texto (para titulares que no nombran ningún sitio)
  // Dónde ocurre: solo cuenta si Segovia o un pueblo aparecen en la entradilla (no una mención de pasada más abajo)
  let lugar = municipioDe(cuerpo.slice(0, 700));
  if (!(CONCRETO(lugar) || lugar === "Segovia")) lugar = "";
  return { v: 3, cats, extracto: extracto ? recorta(extracto, 240) : "", evento, pueblo: CONCRETO(muni) ? muni : "", lugar: lugar !== "General" ? lugar : "" };
}
// Lo que se guarda con la noticia (sin campos vacíos)
function limpiaAnalisis(a) {
  if (!a || a.vacio) return null;
  const o = {};
  if (a.cats?.length) o.cats = a.cats;
  if (a.extracto) o.extracto = a.extracto;
  if (a.evento) o.evento = a.evento;
  if (a.pueblo) o.pueblo = a.pueblo;
  if (a.lugar) o.lugar = a.lugar;
  if (a.v) o.v = a.v;
  return Object.keys(o).length ? o : null;
}
function conCuerpo(c, a, municipio) {
  if (c.descartar || !a?.cats?.length) return c;
  const categorias = [...new Set([...c.categorias, ...a.cats])].slice(0, 3);
  let relevancia = c.relevancia === "baja" ? "media" : c.relevancia;
  // El cuerpo solo sube a importante si la frase clave es grave y no es un acto de recuerdo
  if (!c.noAlta && a.extracto && ALTA.test(norm(a.extracto)) && !NO_ALTA.test(norm(a.extracto))) relevancia = "alta";
  if (municipio === "Segovia" && relevancia === "alta" && !politizado) relevancia = "media";
  return { categorias, relevancia, porTexto: false, noAlta: c.noAlta };
}
function eventoConCuerpo(titulo, resumen, publicada, categorias, a) {
  const e = eventoDe(titulo, resumen, publicada, categorias);
  if (e.fecha_evento || !a?.evento) return e;
  return { fecha_evento: a.evento.fecha_evento, ...(a.evento.hora_evento ? { hora_evento: a.evento.hora_evento } : {}), convocatoria: true };
}

/* ------------------------------------------------------------------ */
/* Periódicos: todas las noticias de los tres principales (sin deporte ni opinión) */
/* ------------------------------------------------------------------ */
const PERIODICOS = [
  { nombre: "El Adelantado", urls: ["https://www.eladelantado.com/feed/"] },
  { nombre: "El Norte de Castilla", urls: ["https://www.elnortedecastilla.es/rss/2.0/?section=segovia"] },
  { nombre: "El Día de Segovia", urls: ["http://www.eldiasegovia.es/RSS/DSGlocal.xml", "http://www.eldiasegovia.es/rss/DSGProvincia.xml"] },
];
const SALIDA_PERIODICOS = new URL("../public/periodicos.json", import.meta.url);
const NO_PERIODICO = /\/(deportes?|opinion|opiniones|tribuna|blogs?|cartas?-al-director|esquelas|obituarios|horoscopo)\//;
async function periodicos(ahora) {
  let previo = { noticias: [] };
  try { previo = JSON.parse(await readFile(SALIDA_PERIODICOS, "utf8")); } catch {}
  const porUrl = new Map((previo.noticias || []).map(n => [n.url, n]));
  const estado = [];
  for (const p of PERIODICOS) {
    let n = 0, ok = false;
    for (const url of p.urls) {
      try {
        for (const it of items(await descarga(url))) {
          if (NO_PERIODICO.test(it.url) || DEPORTE.test(norm(it.titulo)) || BASURA.test(norm(it.titulo))) continue;
          if (porUrl.has(it.url)) { const e = porUrl.get(it.url); if (!e.img && it.img) e.img = it.img; continue; }
          const texto = it.texto.replace(/La entrada .{0,400}? se public[oó] primero en .*$/i, "").trim();
          porUrl.set(it.url, { medio: p.nombre, ...(it.img ? { img: it.img } : {}), titulo: it.titulo, resumen: recorta(texto && norm(texto) !== norm(it.titulo) ? texto : ""), url: it.url, publicado: (isNaN(it.fecha) ? ahora : it.fecha).toISOString(), municipio: municipioDe(it.titulo + " " + texto) });
          n++;
        }
        ok = true;
      } catch {}
    }
    estado.push({ medio: p.nombre, ok, nuevas: n });
  }
  // Noticias sin foto: se toma la imagen principal del artículo (unas pocas por pasada)
  const sinFoto = [...porUrl.values()].filter(n => !n.img && !n.sinFoto).sort((a, b) => b.publicado.localeCompare(a.publicado)).slice(0, 15);
  await Promise.all(sinFoto.map(async n => { await leeArticulo(n.url); const im = ultimaImg.get(n.url); if (im) n.img = im; else n.sinFoto = true; }));

  // Se guardan los últimos 4 días
  const limite = ahora.getTime() - 4 * 864e5;
  const noticias = [...porUrl.values()].filter(n => new Date(n.publicado).getTime() >= limite && new Date(n.publicado).getTime() <= ahora.getTime() + 36e5)
    .sort((a, b) => b.publicado.localeCompare(a.publicado));
  await writeFile(SALIDA_PERIODICOS, JSON.stringify({ actualizado: `${fechaMadrid(ahora)} ${horaMadrid(ahora)}`, estado, noticias }));
  console.log("Periódicos:", estado.map(e => `${e.medio} ${e.ok ? "+" + e.nuevas : "FALLO"}`).join(", "), `· ${noticias.length} en total`);
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
  // Se leen 8 fuentes a la vez para que la actualización no se alargue
  const colaF = FEEDS.map((f, i) => [f, i]); const estadoF = [];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (colaF.length) {
      const [f, i] = colaF.shift();
      let ok = false, error = "", n = 0;
      for (const url of f.urls) {
        try {
          const its = items(await descarga(url));
          // Feeds sin fecha (Tribuna): solo las más recientes, que se fechan con la hora en que aparecen
          for (const it of its.filter((x, k) => !x.sinFecha || k < 12)) {
            if (f.soloSiMenciona && !MENCIONA_SEGOVIA.test(norm(it.titulo + " " + it.texto))) continue;
            if (OPINION.test(it.url)) continue;
            brutos.push({ ...it, medio: f.nombre, directo: true, pueblo: f.pueblo, local: f.local === true || (f.local instanceof RegExp && f.local.test(it.url)) }); n++;
          }
          ok = true; if (!f.todas) break;
        } catch (e) { error = e.message; }
      }
      const [grupo, web] = infoFuente(f);
      estadoF[i] = ok ? { fuente: f.nombre, grupo, web, ok: true, noticias: n } : { fuente: f.nombre, grupo, web, ok: false, error };
    }
  }));
  // Segundo intento, con calma, para las que han fallado (algunos servidores frenan muchas peticiones seguidas)
  let reintentos = 0;
  for (let i = 0; i < FEEDS.length; i++) {
    if (estadoF[i]?.ok || reintentos >= 10) continue;
    reintentos++;
    const f = FEEDS[i];
    await new Promise(r => setTimeout(r, 1500));
    for (const url of f.urls) {
      try {
        let n = 0;
        for (const it of items(await descarga(url)).filter((x, k) => !x.sinFecha || k < 12)) {
          if (f.soloSiMenciona && !MENCIONA_SEGOVIA.test(norm(it.titulo + " " + it.texto))) continue;
          if (OPINION.test(it.url)) continue;
          brutos.push({ ...it, medio: f.nombre, directo: true, pueblo: f.pueblo, local: f.local === true || (f.local instanceof RegExp && f.local.test(it.url)) }); n++;
        }
        estadoF[i] = { ...estadoF[i], ok: true, noticias: n }; delete estadoF[i].error; break;
      } catch (e) { estadoF[i] = { ...estadoF[i], ok: false, error: e.message }; }
    }
  }
  // Un mismo medio con varios canales (portada y sección local) se muestra una vez
  for (const e of estadoF) { const ya = estado.find(x => x.fuente === e.fuente); if (ya) { ya.ok = ya.ok || e.ok; ya.noticias = (ya.noticias || 0) + (e.noticias || 0); if (ya.ok) delete ya.error; } else estado.push({ ...e }); }

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
  estado.push({ fuente: "Google Noticias", grupo: "Google Noticias", web: "https://news.google.com", busquedas: busquedas.length, ok: gFallos < busquedas.length, noticias: gTotal, error: gFallos ? `${gFallos} búsquedas fallidas` : undefined });
  // Medios que llegan a través de Google Noticias (los que no leemos directamente)
  const directos = new Set(FEEDS.map(f => canonMedio(f.nombre)));
  const viaGoogle = {};
  for (const b of brutos) if (!b.directo) { const m = canonMedio(b.medio); if (!directos.has(m)) viaGoogle[m] = (viaGoogle[m] || 0) + 1; }

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
      if ((b.cuerpo || "").length > (g.cuerpo || "").length) g.cuerpo = b.cuerpo;
      if (!g.img && b.img) g.img = b.img;
      if (b.local) g.local = true;
      if (b.fecha < g.fecha) g.fecha = b.fecha;
    } else grupos.push({ ...yo, pueblo: b.pueblo, titulo: b.titulo, texto: b.texto, cuerpo: b.cuerpo, img: b.img, local: b.local, fecha: b.fecha, medios: [{ nombre: canonMedio(b.medio), url: b.url }] });
  }

  // 3b) Leer el cuerpo de las noticias nuevas: lo interesante no siempre está en el titular
  let cache = {};
  try { cache = JSON.parse(await readFile(CACHE, "utf8")); } catch {}
  let previoTmp = { dias: [] };
  try { previoTmp = JSON.parse(await readFile(SALIDA, "utf8")); } catch {}
  const conocidas = new Set((previoTmp.dias || []).flatMap(d => d.noticias.flatMap(n => n.medios.map(m => m.url))));
  const analizada = u => cache[u] && cache[u].v === 3; // las de versiones anteriores se vuelven a leer
  const pendientes = grupos.filter(g => !g.medios.some(m => conocidas.has(m.url) || analizada(m.url)));
  let leidas = 0;
  const cola = pendientes.slice(0, 80);
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (cola.length) {
      const g = cola.shift();
      let cuerpo = g.cuerpo && g.cuerpo.length > 400 ? g.cuerpo : "";
      const url = g.medios.map(m => m.url).find(u => !/news\.google\./.test(u));
      if (!cuerpo && url) { cuerpo = await leeArticulo(url); if (cuerpo) leidas++; }
      if (!g.img && url && ultimaImg.get(url)) g.img = ultimaImg.get(url);
      const a = analizaCuerpo(g.titulo, cuerpo, g.fecha);
      for (const m of g.medios) cache[m.url] = { ...a, t: Date.now() };
    }
  }));
  // Lo ya analizado en pasadas anteriores también cuenta
  for (const g of grupos) { const m = g.medios.find(m => analizada(m.url)); if (m) g.analisis = cache[m.url]; }
  console.log(`Cuerpos leídos: ${leidas} de ${pendientes.length} noticias nuevas`);

  // 4) Clasificar
  const nuevas = grupos.map(g => {
    const resumen = g.texto ? recorta(g.texto) : "";
    const a = limpiaAnalisis(g.analisis);
    let municipio = conPueblo(municipioDe(g.titulo + " " + resumen), g.pueblo);
    if (a?.pueblo && (municipio === "General" || municipio === "Provincia")) municipio = a.pueblo;
    else if (municipio === "General" && a?.lugar && a.lugar !== "Provincia") municipio = a.lugar;
    municipio = fueraDeProvincia(g.titulo, municipio);
    if (municipio === "General" && g.local && !FUERA.test(norm(g.titulo))) municipio = "Segovia"; // sección local de un medio de Segovia
    const { categorias, relevancia, porTexto } = conCuerpo(clasifica(g.titulo, resumen, municipio, soloAyto(g.medios) || soloOrganizacion(g.medios)), a, municipio);
    const evento = eventoConCuerpo(g.titulo, resumen, g.fecha, categorias, a);
    return {
      ...evento,
      id: hash(norm(g.titulo)),
      titulo: g.titulo, resumen, categorias, municipio, relevancia, ...(porTexto ? { porTexto: true } : {}), ...(g.pueblo ? { pueblo_fuente: g.pueblo } : {}),
      ...(a ? { analisis: a } : {}),
      ...(g.img ? { img: g.img } : {}),
      ...(g.local ? { local: true } : {}),
      medios: g.medios,
      publicado: g.fecha.toISOString(),
      hora: horaMadrid(g.fecha),
      _dia: fechaMadrid(g.fecha),
    };
  });

  // Fuera lo que no es de interés (deportes, cultura, economía...) y lo que no menciona Segovia ni ningún pueblo
  const interesa = n => n.categorias.length > 0 && n.municipio !== "General" && !relleno(n);
  const antes = nuevas.length;
  // Registro de lo descartado en esta pasada (para revisar que el filtro no tire nada bueno)
  const motivo = n => !n.categorias.length ? "sin tema" : n.municipio === "General" ? "fuera de Segovia" : "relleno";
  const descartadas = nuevas.filter(n => !interesa(n)).map(n => ({ m: motivo(n), t: n.titulo, p: n.municipio, c: n.categorias, f: n.medios[0]?.nombre }));
  await writeFile(new URL("../datos/descartadas.json", import.meta.url), JSON.stringify({ hora: horaMadrid(ahora), total: nuevas.length, descartadas }, null, 0));
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
    const ya = existentes.find(e => e.n.id === n.id || comparteUrl(e.n, n) || mismaNoticia(e, yo));
    if (ya) { // añade enlaces de otros medios a la que ya estaba
      if (n.publicado && (!ya.n.publicado || n.publicado < ya.n.publicado)) { ya.n.publicado = n.publicado; ya.n.hora = n.hora; }
      if (!ya.n.resumen && n.resumen) ya.n.resumen = n.resumen;
      if (!ya.n.analisis && n.analisis) ya.n.analisis = n.analisis; // otro medio cuenta más en el cuerpo
      if (!ya.n.img && n.img) ya.n.img = n.img;
      if (n.local) ya.n.local = true;
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
      // Fuentes regionales que solo valen si mencionan Segovia o un pueblo
      if (n.medios.every(m => SOLO_SI_MENCIONA.has(m.nombre)) && !MENCIONA_SEGOVIA.test(norm(n.titulo + " " + (n.resumen || "")))) return false;
      // El pueblo por defecto lo da la fuente actual (no lo guardado)
      const pf = [...new Set(n.medios.map(m => PUEBLO_DE_FUENTE.get(m.nombre)).filter(Boolean))];
      if (pf.length === 1) n.pueblo_fuente = pf[0]; else delete n.pueblo_fuente;
      if (!n.analisis) { const m = n.medios.find(m => cache[m.url]); if (m) n.analisis = limpiaAnalisis(cache[m.url]); }
      if (!n.analisis) delete n.analisis;
      // Lo leído del cuerpo se revalida con las reglas actuales sobre la frase guardada
      if (n.analisis?.cats && n.analisis.extracto) { const ne = norm(n.analisis.extracto); n.analisis.cats = n.analisis.cats.filter(k => new RegExp(FUERTE[k].source).test(ne)); if (!n.analisis.cats.length) delete n.analisis.cats; }
      let nuevo = conPueblo(municipioDe(n.titulo + " " + (n.resumen || "")), n.pueblo_fuente);
      if (n.analisis?.pueblo && (nuevo === "General" || nuevo === "Provincia")) nuevo = n.analisis.pueblo;
      else if (nuevo === "General" && n.analisis?.lugar && n.analisis.lugar !== "Provincia") nuevo = n.analisis.lugar;
      n.municipio = nuevo;
      n.municipio = fueraDeProvincia(n.titulo, n.municipio);
      if (n.municipio === "General" && n.local && !FUERA.test(norm(n.titulo))) n.municipio = "Segovia";
      // Webs municipales de otro pueblo que se agruparon por error
      if (CONCRETO(n.municipio)) { const m2 = n.medios.filter(m => !/^Ayuntamiento de /.test(m.nombre) || m.nombre === "Ayuntamiento de " + n.municipio); if (m2.length) n.medios = m2; }
      const c = conCuerpo(clasifica(n.titulo, n.resumen || "", n.municipio, soloAyto(n.medios) || soloOrganizacion(n.medios)), n.analisis, n.municipio);
      n.categorias = c.categorias; n.relevancia = c.relevancia;
      if (c.porTexto) n.porTexto = true; else delete n.porTexto;
      delete n.fecha_evento; delete n.hora_evento; delete n.convocatoria;
      Object.assign(n, eventoConCuerpo(n.titulo, n.resumen || "", new Date(n.publicado), n.categorias, n.analisis));
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
      const b = recientesH[j]; if (borrar.has(b.n) || !(comparteUrl(a.n, b.n) || mismaNoticia(a, b))) continue;
      if (CONCRETO(b.n.municipio) && !CONCRETO(a.n.municipio)) a.n.municipio = b.n.municipio; // se queda el pueblo concreto
      // Si la otra es de un día posterior (la historia ha avanzado), se queda el titular más reciente
      if (b.dia > a.dia && b.n.publicado) { for (const k of ["titulo", "resumen", "publicado", "hora", "id", "analisis", "img"]) if (b.n[k]) a.n[k] = b.n[k]; a.n.medios = [...b.n.medios]; }
      juntaMedios(a.n.medios, b.n.medios);
      if (!a.n.resumen && b.n.resumen) a.n.resumen = b.n.resumen;
      if (!a.n.img && b.n.img) a.n.img = b.n.img;
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
  // Las noticias viejas se borran, salvo las que anuncian algo que todavía no ha pasado (siguen en la agenda)
  for (const d of porDia.values()) if (d.fecha < corte) d.noticias = d.noticias.filter(n => n.fecha_evento && n.fecha_evento >= hoy);
  const dias = [...porDia.values()].filter(d => d.fecha >= corte || d.noticias.length).sort((a, b) => b.fecha.localeCompare(a.fecha));
  // Caché de cuerpos analizados: 5 días
  for (const [u, v] of Object.entries(cache)) if (Date.now() - (v.t || 0) > 5 * 864e5) delete cache[u];
  await writeFile(CACHE, JSON.stringify(cache));

  // Noticias de interés sin foto: se toma la imagen principal del artículo (unas pocas por pasada)
  const sinFotoN = dias.flatMap(d => d.noticias).filter(n => !n.img && !n.sinFoto).slice(0, 12);
  await Promise.all(sinFotoN.map(async n => {
    const u = n.medios.map(m => m.url).find(x => !/news\.google\./.test(x));
    if (!u) { n.sinFoto = true; return; }
    await leeArticulo(u); const im = ultimaImg.get(u); if (im) n.img = im; else n.sinFoto = true;
  }));
  const salida = {
    actualizado: `${hoy} ${horaMadrid(ahora)}`,
    fuentes: estado,
    via_google: Object.entries(viaGoogle).sort((a, b) => b[1] - a[1]).slice(0, 40),
    dias,
  };
  await writeFile(SALIDA, JSON.stringify(salida, null, 0));
  try { await periodicos(ahora); } catch (e) { console.log("Periódicos: error", e.message); }
  console.log(`Noticias leídas: ${brutos.length}. Agrupadas: ${grupos.length}. Nuevas añadidas: ${añadidas}.`);
  for (const e of estado) console.log(` - ${e.fuente}: ${e.ok ? "ok (" + e.noticias + ")" : "FALLO " + e.error}`);
}


export { clasifica, municipioDe, relleno, eventoDe, fueraDeProvincia, FUERA };