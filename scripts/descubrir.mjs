// Diagnóstico (19ª ronda): ¿qué aportan las búsquedas site: nuevas frente a las de siempre?
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
if (!existsSync("node_modules/fast-xml-parser")) execSync("npm ci --silent || npm install --silent", { stdio: "inherit" });
let src = readFileSync("scripts/actualizar.mjs", "utf8"); src = src.slice(0, src.lastIndexOf("\nmain()"));
writeFileSync("scripts/_c.mjs", src + "\nexport { BUSQUEDAS, clasifica, municipioDe, fueraDeProvincia, relleno, norm };");
const M = await import("./_c.mjs");
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
const NUEVAS = M.BUSQUEDAS.filter(q => q.startsWith("site:"));
const VIEJAS = M.BUSQUEDAS.filter(q => !q.startsWith("site:"));
const clave = t => M.norm(t).replace(/[^a-z0-9 ]/g, "").split(" ").filter(w => w.length > 3).slice(0, 7).join(" ");
async function lee(q) { const u = `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:3d")}&hl=es&gl=ES&ceid=ES:es`;
  try { const x = await (await fetch(u, { headers: UA })).text(); await new Promise(r => setTimeout(r, 500));
    return [...x.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<source[^>]*>([\s\S]*?)<\/source>/g)].map(m => ({ t: m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/ - [^-]+$/, ""), s: m[2] }));
  } catch { return []; } }
const viejas = new Map(), nuevas = new Map();
for (const q of VIEJAS) for (const i of await lee(q)) viejas.set(clave(i.t), i);
for (const q of NUEVAS) for (const i of await lee(q)) nuevas.set(clave(i.t), { ...i, q });
// lo que ya entra por fuentes propias (RSS)
const ya = new Set(); const d = JSON.parse(readFileSync("public/datos.json", "utf8")); const p = JSON.parse(readFileSync("public/periodicos.json", "utf8"));
for (const n of d.dias.flatMap(x => x.noticias)) ya.add(clave(n.titulo)); for (const n of p.noticias) ya.add(clave(n.titulo));
const soloNuevas = [...nuevas.entries()].filter(([k]) => !viejas.has(k) && !ya.has(k)).map(([, i]) => i);
const evalua = i => { const m = M.fueraDeProvincia(i.t, M.municipioDe(i.t)); const c = M.clasifica(i.t, "", m); const n = { titulo: i.t, categorias: c.categorias, municipio: m, relevancia: c.relevancia, medios: [{ nombre: i.s }] };
  const entra = !c.descartar && c.categorias.length && m !== "General" && !M.relleno(n); return { ...i, m, cats: c.categorias.join(","), entra }; };
const ev = soloNuevas.map(evalua);
writeFileSync("diag/dorks2.json", JSON.stringify({ viejas: viejas.size, nuevas: nuevas.size, soloNuevas: soloNuevas.length, entran: ev.filter(x => x.entra), noEntran: ev.filter(x => !x.entra).slice(0, 60).map(x => x.s + " | " + x.m + " | " + x.t.slice(0, 90)) }, null, 1));
