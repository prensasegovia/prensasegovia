// Diagnóstico (12ª ronda): ¿qué medios publican sobre la provincia y no tenemos? + fuentes candidatas
import { writeFileSync } from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "accept": "application/rss+xml, application/xml, text/xml, text/html, */*" };
const out = { fuentesGoogle: {}, ejemplos: {}, candidatas: {} };
const Q = [];
out.fuentesGoogle = Object.fromEntries(Object.entries(out.fuentesGoogle).sort((a, b) => b[1] - a[1]));
const C = [
  "https://segoviaaldia.es/rss", "https://segoviaaldia.es/rss.xml", "https://segoviaaldia.es/feed", "https://segoviaaldia.es/index.rss", "https://segoviaaldia.es/coverrss?format=xml", "https://segoviaaldia.es/sitemap.xml", "https://segoviaaldia.es/sitemap-news.xml",
  "https://www.elespanol.com/rss/castilla-y-leon/segovia/", "https://www.elespanol.com/castilla-y-leon/segovia/", "https://www.elespanol.com/rss/castilla-y-leon/provincias/segovia/",
  "https://cadenaser.com/arc/outboundfeeds/rss/category/castilla-y-leon/segovia/?outputType=xml", "https://cadenaser.com/arc/outboundfeeds/rss/?outputType=xml", "https://cadenaser.com/castilla-y-leon/", "https://cadenaser.com/tag/segovia/", "https://cadenaser.com/arc/outboundfeeds/rss/tags/segovia/?outputType=xml",
  "https://www.larazon.es/castilla-y-leon/segovia/", "https://www.larazon.es/rss/castilla-y-leon.xml",
];
for (const u of C) {
  try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(20000) }); const t = await r.text();
    const items = (t.match(/<item[\s>]/g) || []).length + (t.match(/<entry[\s>]/g) || []).length;
    const tit = [...t.matchAll(/<item[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)].slice(0, 4).map(m => m[1].slice(0, 90));
    const rss = [...t.matchAll(/<link[^>]+type="application\/(?:rss|atom)\+xml"[^>]*>/g)].map(m => m[0].match(/href="([^"]+)"/)?.[1]).slice(0, 5);
    const seg = (t.match(/segovia/gi) || []).length;
    out.candidatas[u] = { http: r.status, final: r.url, items, segovia: seg, tit, rss, ini: /segoviaaldia/.test(u) ? t.slice(0, 600) : undefined, links: [...t.matchAll(/href="([^"]*(rss|feed|xml)[^"]*)"/gi)].map(m=>m[1]).slice(0,8) };
  } catch (e) { out.candidatas[u] = { error: String(e.message) }; }
}
writeFileSync("diag/medios2.json", JSON.stringify(out, null, 1));
