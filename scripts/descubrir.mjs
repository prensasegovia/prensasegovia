// Diagnóstico (14ª ronda): La Voz de El Espinar
import { writeFileSync } from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
const out = {};
for (const u of ["https://lavozdeelespinar.es/feed/", "https://lavozdeelespinar.es/", "https://lavozdeelespinar.es/sitemap.xml", "https://lavozdeelespinar.es/news-sitemap.xml"]) {
  try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }); const t = await r.text();
    out[u] = { http: r.status, items: (t.match(/<item[\s>]/g) || []).length, tit: [...t.matchAll(/<item[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<pubDate>([^<]*)/g)].slice(0, 12).map(m => m[2].slice(5, 22) + " | " + m[1].slice(0, 100)), rss: [...t.matchAll(/<link[^>]+type="application\/(?:rss|atom)\+xml"[^>]*>/g)].map(m => m[0].match(/href="([^"]+)"/)?.[1]).slice(0, 5), ini: r.status !== 200 ? t.slice(0, 300) : undefined };
  } catch (e) { out[u] = String(e.message); }
}
writeFileSync("diag/medios4.json", JSON.stringify(out, null, 1));
