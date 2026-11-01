// Diagnóstico (7ª ronda): por qué 3 webs WordPress devuelven HTTP 415
import { writeFileSync } from "node:fs";
const URLS = ["https://ppsegovia.com/feed/", "https://www.lalosa.es/feed/", "https://navadelaasuncion.org/feed/"];
const H = {
  rss: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "Accept": "application/rss+xml, application/xml, text/xml, */*", "Accept-Language": "es-ES,es;q=0.9" },
  nav: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" },
  html: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "es-ES,es;q=0.9", "Accept-Encoding": "gzip, deflate, br" },
  feedly: { "User-Agent": "Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)" },
  nada: {},
};
const out = {};
for (const base of URLS) {
  out[base] = {};
  for (const u of [base, base.replace(/\/feed\/$/, "/?feed=rss2"), base.replace(/\/feed\/$/, "/wp-json/wp/v2/posts?per_page=5&_fields=id,date,link,title")]) {
    for (const [k, h] of Object.entries(H)) {
      try { const r = await fetch(u, { headers: h, redirect: "follow", signal: AbortSignal.timeout(15000) }); const t = await r.text();
        out[base][u.slice(base.length - 6) + " " + k] = { s: r.status, feed: /<(rss|feed)[\s>]/i.test(t.slice(0, 2000)), json: t.trim().startsWith("["), len: t.length, server: r.headers.get("server"), muestra: t.slice(0, 160) };
      } catch (e) { out[base][u.slice(base.length - 6) + " " + k] = { err: String(e.message).slice(0, 60) }; }
    }
  }
}
writeFileSync("diag/feeds7.json", JSON.stringify(out, null, 1));
