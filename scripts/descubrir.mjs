// Diagnóstico: busca el RSS de cada medio desde los servidores de GitHub
import { writeFileSync } from "node:fs";
const MEDIOS = {
  "Tribuna de Segovia": "https://www.tribunasegovia.com/",
  "El Día de Segovia": "https://www.eldiasegovia.es/",
  "Segovia al día": "https://segoviaaldia.es/",
  "El Nordeste de Segovia": "https://www.elnordestedesegovia.es/",
  "Segovia Directo": "https://segoviadirecto.com/",
  "Segovia 24/7": "https://segovia247.es/",
  "Diario de Castilla y León": "https://www.diariodecastillayleon.es/segovia/",
  "COPE Segovia": "https://www.cope.es/emisoras/castilla-y-leon/segovia-provincia/segovia/noticias",
  "Cadena SER Segovia": "https://cadenaser.com/castilla-y-leon/",
  "Onda Cero Segovia": "https://www.ondacero.es/emisoras/castilla-y-leon/segovia/",
  "Europa Press CyL": "https://www.europapress.es/castilla-y-leon/",
  "ICAL": "https://www.agenciaical.es/",
  "RTVCyL": "https://www.rtvcyl.es/",
  "Acueducto2": "https://www.acueducto2.com/",
  "El Adelantado": "https://www.eladelantado.com/",
  "Subdelegación Segovia": "https://www.mpr.gob.es/prencom/notas/Paginas/subdelegaciones/segovia.aspx",
  "Diputación Segovia": "https://www.dipsegovia.es/",
  "Junta CyL comunicacion": "https://comunicacion.jcyl.es/",
  "Ayto Cuéllar": "https://www.aytocuellar.es/",
  "Ayto El Espinar": "https://www.aytoelespinar.com/",
  "Ayto Real Sitio": "https://www.realsitiodesanildefonso.es/",
};
const CAND = ["feed/", "rss/", "rss", "rss.xml", "feed", "?feed=rss2", "index.rss", "rss/portada.xml", "rss/segovia.xml", "rss/ultimas-noticias", "?format=feed&type=rss", "feeds/posts/default?alt=rss", "sitemap-news.xml", "news-sitemap.xml", "sitemap_news.xml"];
const UA = { "user-agent": "Mozilla/5.0 (compatible; PrensaSegovia/1.0; +https://prensasegovia.github.io/prensasegovia/)" };
async function get(u) {
  try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(15000) });
    const t = await r.text(); return { status: r.status, url: r.url, ct: r.headers.get("content-type") || "", t }; }
  catch (e) { return { status: 0, err: String(e.message || e) }; }
}
const esFeed = r => r.status === 200 && /<(rss|feed|urlset)[\s>]/i.test(r.t.slice(0, 3000));
const out = {};
for (const [nombre, home] of Object.entries(MEDIOS)) {
  const h = await get(home);
  const res = { home: h.status, final: h.url, err: h.err, declarados: [], validos: [] };
  if (h.t) {
    for (const m of h.t.matchAll(/<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]*>/gi)) {
      const href = (m[0].match(/href=["']([^"']+)/) || [])[1]; if (href) res.declarados.push(new URL(href, h.url).href);
    }
    res.titulo = (h.t.match(/<title>([^<]{0,120})/i) || [])[1];
    res.rssEnlaces = [...new Set([...h.t.matchAll(/href=["']([^"']*(rss|feed)[^"']*)["']/gi)].map(m => { try { return new URL(m[1], h.url).href; } catch { return null; } }).filter(Boolean))].slice(0, 15);
  }
  const base = h.url || home;
  const pruebas = [...res.declarados, ...CAND.map(c => new URL(c, base).href), ...CAND.slice(0, 6).map(c => new URL(c, new URL(base).origin + "/").href)];
  for (const u of [...new Set(pruebas)]) {
    const r = await get(u);
    if (esFeed(r)) res.validos.push({ u, items: (r.t.match(/<(item|entry|url)[\s>]/gi) || []).length, ultimo: (r.t.match(/<(pubDate|updated|lastmod|news:publication_date)>([^<]+)/i) || [])[2] });
    if (res.validos.length >= 4) break;
  }
  out[nombre] = res; console.log(nombre, res.home, res.validos.map(v => v.u).join(" | "));
}
writeFileSync("diag/feeds.json", JSON.stringify(out, null, 1));
