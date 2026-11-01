// Diagnóstico (9ª ronda): HoyCyL y otras fuentes que han salido en búsquedas
import { writeFileSync } from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
const C = ["https://hoycyl.com/feed/", "https://hoycyl.com/category/segovia/feed/", "https://hoycyl.com/segovia/feed/", "https://hoycyl.com/tag/segovia/feed/", "https://hoycyl.com/"];
const out = {};
for (const u of C) {
  try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(15000) }); const t = await r.text();
    const feed = /<(rss|feed)[\s>]/i.test(t.slice(0, 2000));
    out[u] = { s: r.status, final: r.url, feed, items: feed ? (t.match(/<item[\s>]/gi) || []).length : 0, segovia: (t.match(/segovia/gi) || []).length,
      titulos: feed ? [...t.matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi)].slice(1, 12).map(x => x[1].trim()) : [],
      enlaces: feed ? [] : [...new Set([...t.matchAll(/href=["']([^"']*(feed|rss|segovia)[^"']*)["']/gi)].map(x => x[1]))].slice(0, 20) };
  } catch (e) { out[u] = { err: String(e.message).slice(0, 60) }; }
}
writeFileSync("diag/feeds9.json", JSON.stringify(out, null, 1));
