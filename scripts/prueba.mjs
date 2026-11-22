// Banco de pruebas: aplica las reglas actuales a las noticias de los periódicos y a las descartadas
// Uso:
//   node scripts/prueba.mjs              → todas las noticias de Periódicos + casos aprendidos
//   node scripts/prueba.mjs --casos      → solo comprueba los casos aprendidos (scripts/casos.json)
//   node scripts/prueba.mjs extra.json   → añade más casos [{t, r, f, nolocal}]
// Casos aprendidos (scripts/casos.json): ejemplos reales marcados como «si» (debe entrar en Noticias) o «no»,
// con el motivo. En cada revisión del filtro se añaden los nuevos y todos tienen que seguir saliendo bien.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
const src = readFileSync(new URL("./actualizar.mjs", import.meta.url), "utf8").replace(/main\(\)\.catch[\s\S]*$/, "")
  + "\nexport { clasifica, municipioDe, relleno, eventoDe, fueraDeProvincia, FUERA, soloAyto, soloOrganizacion, conCuerpo, SOLO_SI_MENCIONA, MENCIONA_SEGOVIA };";
const tmp = new URL("./_tmp.mjs", import.meta.url);
writeFileSync(tmp, src);
const M = await import("./_tmp.mjs");
unlinkSync(tmp);
const soloCasos = process.argv.includes("--casos");
const archivoExtra = process.argv.slice(2).find(a => !a.startsWith("--"));

const evalua = c => {
  const medios = [{ nombre: c.f, url: "x" }];
  let m = c.m || M.fueraDeProvincia(c.t, M.municipioDe(c.t + " " + (c.r || "")));
  if (m === "General" && !c.nolocal && !M.FUERA.test(c.t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase())) m = "Segovia";
  // Como en la web: las webs de ayuntamientos y las notas de partidos y sindicatos se juzgan por el titular
  const nt = (c.t + " " + (c.r || "")).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Medios de los que solo vale lo que nombra Segovia o un pueblo (como en la web)
  if (M.SOLO_SI_MENCIONA.has(c.f) && !M.MENCIONA_SEGOVIA.test(nt)) return { ok: false, m, cats: "", rel: "baja", t: c.t, motivo: "no nombra Segovia" };
  // Con «a» (lo que se leyó del artículo) se aplica también lo que aporta el cuerpo, como en la web
  const k = M.conCuerpo(M.clasifica(c.t, c.r || "", m, M.soloAyto(medios) || M.soloOrganizacion(medios)), c.a, m, c.t);
  const n = { titulo: c.t, resumen: c.r || "", categorias: k.categorias, municipio: m, relevancia: k.relevancia, porTexto: k.porTexto, medios };
  Object.assign(n, M.eventoDe(c.t, c.r || "", new Date(), k.categorias));
  const rell = n.categorias.length > 0 && m !== "General" && M.relleno(n);
  const ok = n.categorias.length > 0 && m !== "General" && !rell;
  return { ok, m, cats: n.categorias.join(","), rel: k.relevancia, t: c.t, motivo: !n.categorias.length ? "sin tema" : m === "General" ? "fuera" : rell ? "relleno" : "" };
};

if (!soloCasos) {
  const per = JSON.parse(readFileSync(new URL("../public/periodicos.json", import.meta.url), "utf8")).noticias;
  const casos = per.map(n => ({ t: n.titulo, r: n.resumen || "", f: n.medio }));
  if (archivoExtra) for (const e of JSON.parse(readFileSync(archivoExtra, "utf8"))) casos.push(e);
  const out = casos.map(evalua);
  for (const o of out.sort((a, b) => b.ok - a.ok)) console.log(o.ok ? "SI " : "no ", (o.motivo || "").padEnd(8), o.m.slice(0, 12).padEnd(12), o.rel.slice(0, 1).toUpperCase(), o.cats.padEnd(28), o.t.slice(0, 95));
  console.log(out.filter(o => o.ok).length, "de", out.length);
}

// Casos aprendidos
const fichero = new URL("./casos.json", import.meta.url);
if (existsSync(fichero)) {
  const aprendidos = JSON.parse(readFileSync(fichero, "utf8"));
  const fallos = [];
  for (const c of aprendidos) {
    const o = evalua(c);
    // «rel»: relevancia esperada («alta», «media») o «no alta»
    const relBien = !c.rel || !o.ok || (c.rel === "no alta" ? o.rel !== "alta" : o.rel === c.rel);
    const bien = (c.espera === "si") === o.ok && (!c.pueblo || !o.ok || o.m === c.pueblo) && relBien;
    if (!bien) fallos.push({ c, o });
  }
  console.log(`\nCasos aprendidos: ${aprendidos.length - fallos.length} de ${aprendidos.length} bien`);
  for (const { c, o } of fallos) console.log(`  FALLA (esperaba ${c.espera}${c.pueblo ? " en " + c.pueblo : ""}${c.rel ? " " + c.rel : ""}; sale ${o.ok ? "si en " + o.m + " " + o.rel : "no, " + o.motivo}) ${c.t.slice(0, 80)}  [${c.motivo}]`);
  if (fallos.length) process.exitCode = 1;
}
