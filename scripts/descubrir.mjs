// Diagnóstico (4ª ronda): webs de los 208 ayuntamientos + instituciones y medio agrario
import { writeFileSync } from "node:fs";
import { MUNICIPIOS } from "./municipios.mjs";
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
async function get(u, ms = 10000) {
  try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(ms) }); return { status: r.status, url: r.url, t: await r.text() }; }
  catch (e) { return { status: 0, err: String(e.message || e).slice(0, 60) }; }
}
const esFeed = r => r.status === 200 && /<(rss|feed)[\s>]/i.test(r.t.slice(0, 3000));
const slug = m => m.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const out = { aytos: {}, otros: {} };
// 1) Ayuntamientos
const cola = [...MUNICIPIOS];
await Promise.all(Array.from({ length: 12 }, async () => {
  while (cola.length) {
    const m = cola.shift(); const s = slug(m);
    for (const home of [`https://www.${s}.es/`, `https://${s}.es/`, `https://www.ayto${s}.es/`, `https://www.ayuntamientode${s}.es/`]) {
      const h = await get(home, 8000);
      if (h.status !== 200 || !h.t || h.t.length < 2000) continue;
      const rss = [...new Set([...h.t.matchAll(/href=["']([^"']*(asset_publisher\/[^"'\/]+\/rss|\/feed\/?|rss[^"']*\.xml)[^"']*)["']/gi)].map(x => { try { return new URL(x[1].replace(/&amp;/g, "&"), h.url).href; } catch { return null; } }).filter(u => u && !/comments/.test(u)))];
      const validos = [];
      for (const u of rss.slice(0, 4)) { const r = await get(u, 8000); if (esFeed(r)) validos.push({ u, items: (r.t.match(/<(item|entry)[\s>]/gi) || []).length, ultimo: (r.t.match(/<(pubDate|updated)>([^<]+)/gi) || []).slice(1, 2).join("").replace(/<[^>]+>/g, ""), titulo: ([...r.t.matchAll(/<title>(?:<!\[CDATA\[)?([^<\]]{0,80})/gi)][1] || [])[1] }); }
      if (!validos.length) { const r = await get(new URL("feed/", h.url).href, 8000); if (esFeed(r)) validos.push({ u: new URL("feed/", h.url).href, items: (r.t.match(/<item[\s>]/gi) || []).length }); }
      out.aytos[m] = { home: h.url, validos };
      break;
    }
  }
}));
// 2) Otros
const OTROS = {
  "Agronews Segovia": ["https://www.agronewscastillayleon.com/category/castilla-y-leon/segovia/feed/", "https://www.agronewscastillayleon.com/segovia/feed/", "https://www.agronewscastillayleon.com/feed/"],
  "Delegación Gobierno CyL": ["https://mptmd.gob.es/portal/delegaciones_gobierno/delegaciones/castillaleon/actualidad/notas_de_prensa.html", "https://mptmd.gob.es/portal/footer/rss.html"],
  "Diputación": ["https://www.dipsegovia.es/noticias", "https://www.dipsegovia.es/"],
  "Guardia Civil": ["https://web.guardiacivil.es/es/prensa/noticias/index.html", "https://web.guardiacivil.es/es/prensa/noticias/rss"],
  "Junta CyL": ["https://comunicacion.jcyl.es/web/es/comunicacion-junta-castilla-leon.html"],
  "Ayto Segovia": ["https://www.segovia.es/"],
  "CCOO rss": ["https://castillayleon.ccoo.es/rss.xml"],
};
for (const [k, us] of Object.entries(OTROS)) {
  out.otros[k] = [];
  for (const u of us) {
    const r = await get(u, 15000);
    const enlaces = r.t ? [...new Set([...r.t.matchAll(/href=["']([^"']*(rss|feed|asset_publisher)[^"']*)["']/gi)].map(x => x[1].replace(/&amp;/g, "&")))].slice(0, 25) : [];
    out.otros[k].push({ u, status: r.status, final: r.url, feed: r.t ? esFeed(r) : false, items: r.t ? (r.t.match(/<item[\s>]/gi) || []).length : 0, muestra: r.t && esFeed(r) ? r.t.slice(0, 700) : undefined, enlaces });
  }
}
writeFileSync("diag/feeds4.json", JSON.stringify(out, null, 1));
console.log(Object.keys(out.aytos).length, "webs de ayuntamiento encontradas");
