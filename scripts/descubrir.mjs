// Diagnóstico (3ª ronda): sindicatos, colectivos y partidos de Segovia
import { writeFileSync } from "node:fs";
const MEDIOS = {
  "CCOO CyL": "https://castillayleon.ccoo.es/", "CCOO Segovia": "https://castillayleon.ccoo.es/Segovia",
  "UGT CyL": "https://www.ugtcyl.es/", "UGT Segovia": "https://ugtsegovia.es/",
  "STECyL": "https://www.stecyl.net/", "CSIF CyL": "https://www.csif.es/es/autonomico/castilla-y-leon",
  "CGT CyL": "https://cgtcyl.org/", "USO CyL": "https://www.usocyl.es/",
  "ASAJA Segovia": "https://www.asajasegovia.com/", "UPA CyL": "https://www.upacyl.es/", "UCCL": "https://www.uccl.es/", "COAG CyL": "https://www.coagcyl.es/",
  "Ecologistas en Acción": "https://www.ecologistasenaccion.org/", "Ecologistas Segovia": "https://www.ecologistasenaccion.org/ambito/segovia/",
  "PP Segovia": "https://ppsegovia.es/", "PP Segovia 2": "https://www.ppsegovia.com/", "PSOE Segovia": "https://psoesegovia.es/", "PSOE Segovia 2": "https://www.psoesegovia.es/",
  "IU Segovia": "https://iusegovia.org/", "Podemos CyL": "https://castillayleon.podemos.info/", "Vox": "https://www.voxespana.es/noticias",
  "Segovia en Marcha": "https://segoviaenmarcha.es/", "PP CyL": "https://www.ppcyl.es/", "PSOE CyL": "https://www.psoecyl.es/",
  "Por Segovia": "https://www.porsegovia.es/", "Segovia Sanidad Pública": "https://sanidadpublicasegovia.wordpress.com/",
  "Marea Blanca Segovia": "https://mareablancasegovia.wordpress.com/", "Diputación noticias": "https://www.dipsegovia.es/noticias",
};
const CAND = ["feed/", "rss", "rss.xml", "feed", "?feed=rss2", "index.php?format=feed&type=rss"];
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
async function get(u) {
  try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(12000) }); return { status: r.status, url: r.url, t: await r.text() }; }
  catch (e) { return { status: 0, err: String(e.message || e) }; }
}
const esFeed = r => r.status === 200 && /<(rss|feed)[\s>]/i.test(r.t.slice(0, 3000));
const out = {};
await Promise.all(Object.entries(MEDIOS).map(async ([nombre, home]) => {
  const h = await get(home);
  const res = { home: h.status, final: h.url, err: h.err, declarados: [], validos: [] };
  if (h.t) for (const m of h.t.matchAll(/<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]*>/gi)) {
    const href = (m[0].match(/href=["']([^"']+)/) || [])[1]; if (href) try { res.declarados.push(new URL(href.replace(/&amp;/g, "&"), h.url).href); } catch {}
  }
  const base = h.url || home;
  for (const u of [...new Set([...res.declarados.filter(d => !/comments/.test(d)), ...CAND.map(c => new URL(c, base).href)])]) {
    const r = await get(u);
    if (esFeed(r)) { res.validos.push({ u, items: (r.t.match(/<(item|entry)[\s>]/gi) || []).length, ultimo: (r.t.match(/<(pubDate|updated)>([^<]+)/i) || [])[2], titulos: [...r.t.matchAll(/<title>(?:<!\[CDATA\[)?([^<\]]{0,90})/gi)].slice(1, 4).map(m => m[1]) }); break; }
  }
  out[nombre] = res; console.log(nombre, res.home, res.validos.map(v => v.u).join(" | "));
}));
writeFileSync("diag/feeds3.json", JSON.stringify(out, null, 1));
