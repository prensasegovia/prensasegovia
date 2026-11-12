// Diagnóstico (11ª ronda): ¿qué medios publican sobre la provincia y no tenemos? + fuentes candidatas
import { writeFileSync } from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "accept": "application/rss+xml, application/xml, text/xml, text/html, */*" };
const out = { fuentesGoogle: {}, ejemplos: {}, candidatas: {} };
const Q = ["Segovia", "Segovia provincia", "Cuéllar", "El Espinar", "Cantalejo", "Riaza", "Sepúlveda", "Ayllón", "Carbonero el Mayor", "San Ildefonso La Granja", "Navas de Oro", "Villacastín", "Coca Segovia", "Nava de la Asunción", "Santa María la Real de Nieva", "Palazuelos de Eresma", "San Cristóbal de Segovia", "Turégano", "Guardia Civil Segovia", "elecciones 29N Segovia", "candidatos Segovia Cortes", "mitin Segovia", "campaña electoral Segovia", "Junta Electoral Segovia", "Subdelegación Gobierno Segovia"];
for (const q of Q) {
  const u = `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:7d")}&hl=es&gl=ES&ceid=ES:es`;
  try { const x = await (await fetch(u, { headers: UA })).text();
    for (const m of x.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<source url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/g)) {
      const k = m[3] + " | " + m[2]; out.fuentesGoogle[k] = (out.fuentesGoogle[k] || 0) + 1;
      (out.ejemplos[k] ||= []).length < 3 && out.ejemplos[k].push(q + " → " + m[1].slice(0, 110));
    }
  } catch (e) { out.fuentesGoogle["ERROR " + q] = String(e.message); }
  await new Promise(r => setTimeout(r, 700));
}
out.fuentesGoogle = Object.fromEntries(Object.entries(out.fuentesGoogle).sort((a, b) => b[1] - a[1]));
const C = [
  "https://cadenaser.com/castilla-y-leon/segovia/", "https://cadenaser.com/rss/castilla-y-leon/segovia/", "https://cadenaser.com/feed/castilla-y-leon/segovia/", "https://feeds.cadenaser.com/segovia", "https://cadenaser.com/emisora/radio-segovia/", "https://cadenaser.com/emisora/radio-cuellar/",
  "https://www.noticiascyl.com/t/segovia/feed/", "https://www.noticiascyl.com/segovia/feed/", "https://www.noticiascyl.com/feed/",
  "https://www.cyltv.es/rss/segovia", "https://www.rtvcyl.es/segovia", "https://www.rtvcyl.es/rss/segovia.xml",
  "https://www.telesegovia.es/feed/", "https://telesegovia.es/feed/",
  "https://www.rtve.es/api/tematicas/123030/noticias.rss", "https://www.rtve.es/noticias/castilla-y-leon/",
  "https://segoviaaldia.es/coverrss", "https://segoviaaldia.es/feed/", "https://segoviaaldia.es/",
  "https://www.20minutos.es/rss/castilla-y-leon/", "https://www.elespanol.com/rss/castilla-y-leon/", "https://www.agronewscastillayleon.com/feed/",
  "https://www.europapress.es/rss/rss.aspx?ch=283", "https://www.europapress.es/castilla-y-leon/",
  "https://www.lagacetadesegovia.es/feed/", "https://www.segoviaporsuspueblos.es/feed/", "https://puebloenpueblo.com/blog-feed.xml",
  "https://www.elcorreodeburgos.com/rss/", "https://www.leonoticias.com/rss/2.0/portada",
  "https://www.ical.es/feed/", "https://www.subdelegaciongobierno.es/segovia", "https://www.lamoncloa.gob.es/",
  "https://www.jcyl.es/web/es/actualidad.html", "https://comunicacion.jcyl.es/web/jcyl/Comunicacion/es/Plantilla100/1284877983892/_/_/_?asm=jcyl&rss=1",
  "https://www.segovia.es/rss", "https://www.vox.es/rss.xml", "https://iuclm.es/feed/",
];
for (const u of C) {
  try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(20000) }); const t = await r.text();
    const items = (t.match(/<item[\s>]/g) || []).length + (t.match(/<entry[\s>]/g) || []).length;
    const tit = [...t.matchAll(/<item[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)].slice(0, 4).map(m => m[1].slice(0, 90));
    const rss = [...t.matchAll(/<link[^>]+type="application\/(?:rss|atom)\+xml"[^>]*>/g)].map(m => m[0].match(/href="([^"]+)"/)?.[1]).slice(0, 5);
    const seg = (t.match(/segovia/gi) || []).length;
    out.candidatas[u] = { http: r.status, final: r.url, items, segovia: seg, tit, rss };
  } catch (e) { out.candidatas[u] = { error: String(e.message) }; }
}
writeFileSync("diag/medios.json", JSON.stringify(out, null, 1));
