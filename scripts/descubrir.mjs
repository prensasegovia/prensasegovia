// Diagnóstico (18ª ronda): búsquedas con operadores (site:, intitle:, -) en Google Noticias
import { writeFileSync, readFileSync } from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
const ya = new Set(JSON.parse(readFileSync("public/periodicos.json", "utf8")).noticias.map(n => n.titulo.toLowerCase().slice(0, 60)));
const datos = JSON.parse(readFileSync("public/datos.json", "utf8"));
for (const n of datos.dias.flatMap(d => d.noticias)) ya.add(n.titulo.toLowerCase().slice(0, 60));
const Q = [
  "site:cadenaser.com Segovia", "site:elespanol.com Segovia", "site:noticiascyl.com Segovia", "site:rtvcyl.es Segovia", "site:europapress.es Segovia",
  "site:lavanguardia.com Segovia", "site:20minutos.es Segovia", "site:larazon.es Segovia", "site:telesegovia.es", "site:eldiario.es Segovia", "site:infobae.com Segovia",
  "site:lavozdeelespinar.es", "site:elnordestedesegovia.es", "site:escuellar.es",
  'intitle:Segovia "Guardia Civil" -fútbol -baloncesto', 'intitle:Segovia (detenido OR detenida OR investigado OR herido OR fallecido) -fútbol',
  '(intitle:Cuéllar OR intitle:Espinar OR intitle:Cantalejo OR intitle:Riaza OR intitle:Sepúlveda OR intitle:Ayllón OR intitle:Coca) -fútbol -baloncesto',
  '(intitle:Carbonero OR intitle:Navafría OR intitle:Turégano OR intitle:Villacastín OR intitle:Fuentepelayo OR intitle:Navalmanzano OR intitle:Bernardos OR intitle:Prádena) -fútbol',
  'intitle:segoviano OR intitle:segoviana OR intitle:segovianos -Gimnástica -fútbol -baloncesto',
  '"provincia de Segovia" (vecinos OR plataforma OR protesta OR concentración) -fútbol',
];
const out = {};
for (const q of Q) {
  const u = `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:3d")}&hl=es&gl=ES&ceid=ES:es`;
  try { const x = await (await fetch(u, { headers: UA })).text();
    const its = [...x.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<source[^>]*>([\s\S]*?)<\/source>/g)].map(m => ({ t: m[1].replace(/ - [^-]+$/, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"'), s: m[2] }));
    const nuevas = its.filter(i => !ya.has(i.t.toLowerCase().slice(0, 60)));
    out[q] = { total: its.length, nuevas: nuevas.length, ej: nuevas.slice(0, 8).map(i => i.s + " | " + i.t.slice(0, 100)) };
  } catch (e) { out[q] = String(e.message); }
  await new Promise(r => setTimeout(r, 800));
}
writeFileSync("diag/dorks.json", JSON.stringify(out, null, 1));
