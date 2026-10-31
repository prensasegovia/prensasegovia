// Diagnóstico (6ª ronda): instituciones con notas de prensa y medios vecinos que cubren pueblos de Segovia
import { writeFileSync } from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "accept-language": "es-ES,es;q=0.9" };
async function get(u) { try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(15000) }); return { status: r.status, url: r.url, t: await r.text() }; } catch (e) { return { status: 0, err: String(e.message || e).slice(0, 80) }; } }
const esFeed = r => r.status === 200 && /<(rss|feed|rdf:RDF)[\s>]/i.test((r.t || "").slice(0, 3000));
const C = {
  "Diputación noticias": ["https://www.dipsegovia.es/noticias", "https://www.dipsegovia.es/es/noticias", "https://www.dipsegovia.es/noticias/-/asset_publisher/rss", "https://www.dipsegovia.es/home/-/asset_publisher/Sd1Q/rss"],
  "Subdelegación Segovia": ["https://mpt.gob.es/portal/delegaciones_gobierno/delegaciones/castillayleon/actualidad/notas_de_prensa.html", "https://mptmd.gob.es/portal/delegaciones_gobierno/delegaciones/castillayleon/actualidad/notas_de_prensa.html", "https://mptmd.gob.es/portal/delegaciones_gobierno/delegaciones/castillayleon/actualidad/notas_de_prensa.rss", "https://www.mptmd.gob.es/portal/delegaciones_gobierno/delegaciones/castillayleon/segovia.html"],
  "Guardia Civil prensa": ["https://web.guardiacivil.es/es/prensa/noticias/index.html", "https://web.guardiacivil.es/es/prensa/noticias/rss.xml", "https://web.guardiacivil.es/rss/noticias.xml", "https://www.guardiacivil.es/es/prensa/rss/index.html"],
  "Junta CyL comunicación": ["https://comunicacion.jcyl.es/web/es/comunicacion-junta-castilla-leon.html", "https://comunicacion.jcyl.es/web/es/buscador.html?q=Segovia", "https://comunicacion.jcyl.es/web/jcyl/Comunicacion/es/Plantilla100/1284177186046/_/_/_?rss=1"],
  "CyLTV / RTVCyL": ["https://www.rtvcyl.es/", "https://www.rtvcyl.es/rss/segovia.xml", "https://www.rtvcyl.es/Segovia", "https://www.cyltv.es/", "https://www.lasexta.com/rss/"],
  "El Mundo CyL": ["https://e00-elmundo.uecdn.es/elmundo/rss/castillayleon.xml", "https://www.elmundo.es/rss/castillayleon.xml"],
  "esCuéllar": ["https://escuellar.es/feed/", "https://www.escuellar.es/feed/", "https://escuellar.es/"],
  "Diario de Ávila": ["http://www.diariodeavila.es/rss/DAVProvincia.xml", "http://www.diariodeavila.es/RSS/DAVlocal.xml", "https://www.diariodeavila.es/listadorss"],
  "Diario de Valladolid": ["https://www.diariodevalladolid.es/rss/provincia", "https://www.diariodevalladolid.es/rss/", "https://www.diariodevalladolid.es/"],
  "El Norte Valladolid provincia": ["https://www.elnortedecastilla.es/rss/2.0/?section=valladolid/provincia", "https://www.elnortedecastilla.es/rss/2.0/?section=castillayleon"],
  "La Voz del Guadarrama / Sierra": ["https://www.guadarramanoticias.com/feed/", "https://www.lavozdelasierra.es/feed/", "https://sierrapress.es/feed/"],
  "Cadena SER CyL": ["https://cadenaser.com/rss/castilla-y-leon/", "https://cadenaser.com/tag/segovia/rss/", "https://cadenaser.com/castilla-y-leon/rss/"],
  "La 8 Segovia": ["https://www.la8segovia.es/", "https://www.rtvcyl.es/la8segovia"],
  "ICAL Segovia": ["https://www.agenciaical.es/segovia", "https://www.agenciaical.es/noticias/segovia", "https://www.agenciaical.es/"],
  "Ecologistas Segovia blog": ["https://ecologistassegovia.blogspot.com/feeds/posts/default", "https://www.ecologistasenaccion.org/ambito/segovia/feed/"],
  "Asociaciones y plataformas": ["https://www.salvemoselpinar.org/feed/", "https://plataformasegoviana.wordpress.com/feed/", "https://segoviaporelclima.wordpress.com/feed/", "https://mareablancasegovia.wordpress.com/feed/"],
};
const out = {};
for (const [k, us] of Object.entries(C)) {
  out[k] = [];
  for (const u of us) {
    const r = await get(u);
    const t = r.t || "";
    const feed = esFeed(r);
    const enlacesFeed = [...new Set([...t.matchAll(/href=["']([^"']*(rss|feed|\.xml)[^"']*)["']/gi)].map(x => x[1].replace(/&amp;/g, "&")))].filter(x => !/comment/.test(x)).slice(0, 15);
    // En páginas HTML: enlaces que parecen noticias (para poder leerlas sin RSS)
    const noticias = feed ? [] : [...new Set([...t.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{20,200}?)<\/a>/gi)].map(x => x[1] + " | " + x[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()))].filter(x => x.split(" | ")[1].length > 25).slice(0, 25);
    const titulos = feed ? [...t.matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi)].slice(1, 8).map(x => x[1].trim()) : [];
    out[k].push({ u, status: r.status, err: r.err, final: r.url, feed, items: feed ? (t.match(/<(item|entry)[\s>]/gi) || []).length : 0, menciones_segovia: (t.match(/segovia/gi) || []).length, ultimo: feed ? ((t.match(/<(pubDate|updated|dc:date)>([^<]+)/gi) || [])[1] || "").replace(/<[^>]+>/g, "") : "", titulos, enlacesFeed, noticias });
  }
}
writeFileSync("diag/feeds6.json", JSON.stringify(out, null, 1));
