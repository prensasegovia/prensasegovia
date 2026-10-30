// Banco de pruebas: aplica las reglas actuales a las noticias de los periódicos y a las descartadas
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync(new URL("./actualizar.mjs", import.meta.url), "utf8").replace(/main\(\)\.catch[\s\S]*$/, "")
  + "\nexport { clasifica, municipioDe, relleno, eventoDe, fueraDeProvincia, FUERA };";
writeFileSync(new URL("./_tmp.mjs", import.meta.url), src);
const M = await import("./_tmp.mjs");
const per = JSON.parse(readFileSync(new URL("../public/periodicos.json", import.meta.url), "utf8")).noticias;
const casos = per.map(n => ({ t: n.titulo, r: n.resumen || "", f: n.medio }));
const extra = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : [];
for (const e of extra) casos.push(e);
const out = [];
for (const c of casos) {
  let m = M.fueraDeProvincia(c.t, M.municipioDe(c.t + " " + c.r));
  if (m === "General" && !c.nolocal && !M.FUERA.test(c.t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase())) m = "Segovia";
  const k = M.clasifica(c.t, c.r, m, false);
  const n = { titulo: c.t, resumen: c.r, categorias: k.categorias, municipio: m, relevancia: k.relevancia, porTexto: k.porTexto, medios: [{ nombre: c.f, url: "x" }] };
  Object.assign(n, M.eventoDe(c.t, c.r, new Date(), k.categorias));
  const ok = n.categorias.length > 0 && m !== "General" && !M.relleno(n);
  out.push({ ok, m, cats: n.categorias.join(","), rel: k.relevancia, t: c.t, motivo: !n.categorias.length ? "sin tema" : m === "General" ? "fuera" : M.relleno(n) ? "relleno" : "" });
}
for (const o of out.sort((a, b) => b.ok - a.ok)) console.log(o.ok ? "SI " : "no ", (o.motivo || "").padEnd(8), o.m.slice(0, 12).padEnd(12), o.rel.slice(0,1).toUpperCase(), o.cats.padEnd(28), o.t.slice(0, 95));
console.log(out.filter(o => o.ok).length, "de", out.length);
