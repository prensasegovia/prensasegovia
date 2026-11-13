// Diagnóstico (16ª ronda): Vox, UCCL, COAG, CCOO, Podemos, IU Segovia, Telegram y Bluesky
import { writeFileSync } from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
const U = ["https://iusegovia.es/sg/feed/", "https://www.voxespana.es/noticias/feed", "https://www.voxespana.es/feed", "https://www.voxespana.es/rss", "https://voxcastillayleon.es/feed/", "https://www.voxcyl.es/feed/",
  "https://www.uccl.es/feed/", "https://uccl.es/", "https://unioncampesinoscyl.es/feed/", "https://www.uccl.org/feed/", "https://coagcastillayleon.es/feed/", "https://www.coagcyl.org/feed/", "https://coag.org/feed/",
  "https://castillayleon.ccoo.es/rss", "https://castillayleon.ccoo.es/rss.xml", "https://castillayleon.ccoo.es/Noticias", "https://www.ccoo.es/rss/",
  "https://podemoscastillayleon.es/feed/", "https://castillayleon.podemos.info/feed/", "https://cgtcyl.org/feed/", "https://www.cgt.org.es/feed/",
  "https://www.dipsegovia.es/bop/", "https://www.dipsegovia.es/bop/rss", "https://www.dipsegovia.es/rss",
  "https://t.me/s/ppsegovia", "https://t.me/s/voxsegovia", "https://t.me/s/psoesegovia", "https://bsky.app/profile/psoesegovia.bsky.social/rss",
  "https://nitter.net/ppsegovia/rss", "https://rss.app/", "https://www.facebook.com/ppsegovia", "https://x.com/ppsegovia"];
const out = {};
for (const u of U) {
  try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(15000) }); const t = await r.text();
    out[u] = { http: r.status, final: r.url, items: (t.match(/<item[\s>]/g) || []).length + (t.match(/tgme_widget_message_text/g) || []).length, seg: (t.match(/segovia/gi) || []).length,
      rss: [...t.matchAll(/<link[^>]+type="application\/(?:rss|atom)\+xml"[^>]*>/g)].map(m => m[0].match(/href="([^"]+)"/)?.[1]).slice(0, 4),
      tit: [...t.matchAll(/<item[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<pubDate>([^<]*)/g)].slice(0, 4).map(m => m[2].slice(5, 16) + " | " + m[1].slice(0, 90)),
      title: (t.match(/<title>([^<]{0,90})/) || [])[1], links: /bop|ccoo/.test(u) ? [...t.matchAll(/href="([^"]*(rss|feed|xml|pdf|anuncio|boletin)[^"]*)"/gi)].map(m => m[1]).slice(0, 10) : undefined };
  } catch (e) { out[u] = String(e.message).slice(0, 60); }
}
writeFileSync("diag/organizaciones2.json", JSON.stringify(out, null, 1));
