// Diagnóstico (13ª ronda): estructura del sitemap de Segovia al día y de su coverrss
import { writeFileSync } from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
const out = {};
for (const u of ["https://segoviaaldia.es/sitemap.xml", "https://segoviaaldia.es/coverrss"]) {
  try { const t = await (await fetch(u, { headers: UA })).text(); out[u] = { len: t.length, ini: t.slice(0, 3500), urls: (t.match(/<url>/g) || []).length, newsTitle: (t.match(/news:title/g) || []).length }; } catch (e) { out[u] = String(e); }
}
try { const t = await (await fetch("https://segoviaaldia.es/", { headers: UA })).text(); out.portada = [...t.matchAll(/<a[^>]+href="([^"]*\/art\/\d+\/[^"]+)"[^>]*>([\s\S]{0,300}?)<\/a>/g)].slice(0, 30).map(m => m[1] + " | " + m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120)); } catch (e) { out.portada = String(e); }
writeFileSync("diag/medios3.json", JSON.stringify(out, null, 1));
