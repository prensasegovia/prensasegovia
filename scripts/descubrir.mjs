// Diagnóstico (5ª ronda): medios candidatos con sección de Segovia
import { writeFileSync } from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
async function get(u) { try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(12000) }); return { status: r.status, url: r.url, t: await r.text() }; } catch (e) { return { status: 0, err: String(e.message || e).slice(0, 60) }; } }
const esFeed = r => r.status === 200 && /<(rss|feed)[\s>]/i.test((r.t || "").slice(0, 3000));
const C = {
  "NoticiasCyL Segovia": ["https://www.noticiascyl.com/segovia/feed/", "https://www.noticiascyl.com/t/segovia/feed/", "https://www.noticiascyl.com/category/segovia/feed/", "https://www.noticiascyl.com/feed/"],
  "El Español CyL Segovia": ["https://www.elespanol.com/castilla-y-leon/segovia/rss", "https://www.elespanol.com/rss/castilla-y-leon/segovia/", "https://www.elespanol.com/castilla-y-leon/"],
  "okdiario Segovia": ["https://okdiario.com/noticias/segovia/feed", "https://okdiario.com/castilla-leon/feed"],
  "Europa Press Segovia": ["https://www.europapress.es/rss/rss.aspx?ch=00283", "https://www.europapress.es/castilla-y-leon/segovia/", "https://www.europapress.es/rss/rss.aspx?ch=304"],
  "Segovia Sur": ["https://www.segoviasur.com/feed/", "https://segoviasur.com/feed/"],
  "La Razón CyL": ["https://www.larazon.es/rss/castilla-y-leon.xml", "https://www.larazon.es/castilla-y-leon/"],
  "ABC CyL": ["https://www.abc.es/rss/2.0/espana/castilla-leon/", "https://www.abc.es/espana/castilla-leon/"],
  "20minutos CyL": ["https://www.20minutos.es/rss/castilla-y-leon/", "https://www.20minutos.es/rss/"],
  "RTVE CyL": ["https://www.rtve.es/api/tematicas/castilla-y-leon.rss", "https://www.rtve.es/noticias/castilla-y-leon/"],
  "ICAL": ["https://www.agenciaical.es/", "https://www.agenciaical.es/feed"],
  "Heraldo-Diario Segovia": ["https://www.diariodesegovia.es/feed/", "https://diariodesegovia.es/"],
  "Segovia en Directo radio": ["https://www.radiosegovia.es/feed/", "https://cadenaser.com/rss/"],
  "eldiario.es CyL": ["https://www.eldiario.es/rss/castilla-y-leon/", "https://www.eldiario.es/castilla-y-leon/"],
  "Comunicación JCyL Segovia": ["https://comunicacion.jcyl.es/web/es/rss.html", "https://comunicacion.jcyl.es/web/jcyl/RSS/es/Plantilla100/1284184066930/_/_/_"],
};
const out = {};
for (const [k, us] of Object.entries(C)) {
  out[k] = [];
  for (const u of us) {
    const r = await get(u);
    const enlaces = r.t ? [...new Set([...r.t.matchAll(/href=["']([^"']*(rss|feed|\.xml)[^"']*)["']/gi)].map(x => x[1].replace(/&amp;/g, "&")))].filter(x => !/comment/.test(x)).slice(0, 12) : [];
    const items = esFeed(r) ? (r.t.match(/<(item|entry)[\s>]/gi) || []).length : 0;
    const seg = esFeed(r) ? (r.t.match(/segovia/gi) || []).length : 0;
    out[k].push({ u, status: r.status, final: r.url, feed: esFeed(r), items, menciones_segovia: seg, ultimo: esFeed(r) ? ((r.t.match(/<(pubDate|updated)>([^<]+)/gi) || [])[1] || "").replace(/<[^>]+>/g, "") : "", enlaces });
  }
}
writeFileSync("diag/feeds5.json", JSON.stringify(out, null, 1));
