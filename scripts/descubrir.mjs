// Diagnóstico (15ª ronda): webs de sindicatos, organizaciones agrarias y partidos de Segovia
import { writeFileSync } from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
const DOM = ["asajasegovia.com", "asajasegovia.es", "asajacyl.com", "uccl.es", "unioncampesinossegovia.es", "uccl-segovia.org", "upacyl.es", "upa.es", "coagcyl.es", "coag.org", "alianzaupacoag.es",
  "castillayleon.ccoo.es", "segovia.ccoo.es", "ugtcyl.es", "ugt.es", "cgtcyl.org", "cgt.org.es", "csif.es", "stecyl.net", "usocyl.es",
  "ppsegovia.es", "ppsegovia.com", "ppcyl.es", "pp.es", "psoesegovia.es", "psoesegovia.com", "psoecyl.es", "voxespana.es", "iusegovia.es", "izquierdaunidasegovia.es", "iucyl.es", "podemoscyl.info", "segoviaenmarcha.es", "sumar.info", "porsegoviaporlaespañavaciada.es", "espanavaciada.org", "upl.es", "xavila.es",
  "subdelegaciongobierno.es", "dipsegovia.es", "bopsegovia.es", "dipsegovia.es/bop"];
const out = {};
for (const d of DOM) {
  for (const path of ["/", "/feed/"]) {
    const u = "https://" + d + (d.includes("/") ? "" : "") + path.replace(/^\/$/, d.includes("/") ? "/" : "/");
    try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(15000) }); const t = await r.text();
      out[u] = { http: r.status, final: r.url, items: (t.match(/<item[\s>]/g) || []).length, seg: (t.match(/segovia/gi) || []).length,
        rss: [...t.matchAll(/<link[^>]+type="application\/(?:rss|atom)\+xml"[^>]*>/g)].map(m => m[0].match(/href="([^"]+)"/)?.[1]).slice(0, 4),
        tit: [...t.matchAll(/<item[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<pubDate>([^<]*)/g)].slice(0, 5).map(m => m[2].slice(5, 16) + " | " + m[1].slice(0, 90)),
        title: (t.match(/<title>([^<]{0,90})/) || [])[1] };
    } catch (e) { out[u] = String(e.message).slice(0, 60); }
  }
}
writeFileSync("diag/organizaciones.json", JSON.stringify(out, null, 1));
