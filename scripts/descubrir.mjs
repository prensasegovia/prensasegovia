// Diagnóstico (2ª ronda): páginas de RSS de los medios, desde los servidores de GitHub
import { writeFileSync } from "node:fs";
const URLS = ["https://castillayleon.ccoo.es/", "https://castillayleon.ccoo.es/rss", "https://segovia.ccoo.es/", "https://www.ugtcyl.es/", "https://www.ugtcyl.es/feed/", "https://ugt-cyl.es/", "https://www.ecologistasenaccion.org/segovia/", "https://www.ecologistasenaccion.org/feed/", "https://www.ppsegovia.com/", "https://ppsegovia.es/", "https://www.psoesegovia.es/", "https://psoesegovia.es/feed/", "https://www.voxespana.es/", "https://www.voxespana.es/noticias/rss", "https://iusegovia.es/", "https://www.iusegovia.org/", "https://podemossegovia.info/", "https://segoviaenmarcha.es/", "https://www.asajasegovia.com/", "https://www.asajasegovia.com/feed/", "https://ucsegovia.es/", "https://www.uniondecampesinos.com/", "https://www.ccoo.es/rss", "https://csif.es/es/rss", "https://www.stecyl.net/feed/", "https://www.cgt.org.es/feed/", "https://www.ugt.es/rss.xml", "https://www.subdelegaciongobierno.es/", "https://www.dipsegovia.es/web/guest/noticias"];
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
const out = {};
for (const u of URLS) {
  let r;
  try { const x = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(20000) }); r = { status: x.status, final: x.url, t: await x.text() }; }
  catch (e) { out[u] = { err: String(e.message || e) }; continue; }
  const feed = /<(rss|feed|urlset|rdf:RDF)[\s>]/i.test(r.t.slice(0, 3000));
  const enlaces = [...new Set([...r.t.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1].replace(/&#x2F;/g, "/").replace(/&amp;/g, "&")).filter(h => /rss|feed|\.xml/i.test(h)))].slice(0, 40);
  out[u] = { status: r.status, final: r.final, feed, items: feed ? (r.t.match(/<(item|entry|url)[\s>]/gi) || []).length : undefined,
    muestra: feed ? r.t.slice(0, 1500) : undefined, enlaces, titulo: (r.t.match(/<title>([^<]{0,120})/i) || [])[1] };
  console.log(u, r.status, feed);
}
writeFileSync("diag/feeds3.json", JSON.stringify(out, null, 1));
