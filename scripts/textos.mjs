// Texto completo de las noticias de pago, preparado por la tarea de GitHub.
// Aquí no hay CORS: se baja el HTML del periódico, se limpia y se guarda en public/textos/<id>.json.
// El lector de la web lo abre al instante; Jina queda solo de respaldo para lo que aún no esté.
import { readFile, writeFile, mkdir, readdir, unlink, appendFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseHTML } from "linkedom";

const DIR = new URL("../public/textos/", import.meta.url);
const ESTADO = new URL("../datos/textos.json", import.meta.url);
const HORAS_VENTANA = 72;   // solo noticias publicadas en las últimas 72 h
const DIAS_GUARDAR = 21;    // lo mismo que guarda datos.json
const INTENTOS_MAX = 3;     // si un periódico no deja, se deja de insistir
const TEXTO_MINIMO = 300;   // por debajo no se considera noticia (muro o página rara)
const ESPERA = 20000;
const A_LA_VEZ = 4;
const MUESTRA = process.env.MUESTRA === "1"; // en pruebas: enseña el principio de cada texto en el registro
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// El lector calcula el mismo identificador en el navegador (SHA-1 de la dirección, 16 primeros caracteres)
export const idDe = url => createHash("sha1").update(String(url).trim()).digest("hex").slice(0, 16);

// Líneas que no son noticia aunque estén dentro del cuerpo
const RUIDO = /^(esta funcionalidad es exclusiva|reporta un error|comentar es una ventaja|¿ya eres suscriptor|ya eres suscriptor|inicia sesi[óo]n|suscr[íi]bete|l[íi]mite de sesiones|te puede interesar|lee tambi[ée]n|publicidad|noticia relacionada|si eres suscriptor|para seguir leyendo|contenido exclusivo)/i;
const limpiaEspacios = t => String(t || "").replace(/\s+/g, " ").trim();

// Marca de corte de la entradilla de Vocento («1,7 millones ... de euros»): fuera
const sinCorte = t => t.replace(/ ?\.\.\.(?= [a-záéíóúüñ])/g, "");
const vale = t => t.length > 30 && !RUIDO.test(t);

// Cuerpo de la noticia en el HTML: el elemento cuyos párrafos HIJOS DIRECTOS suman más texto
// (así no se cuelan los resúmenes de noticias relacionadas, que van más anidados), más los
// párrafos hijos directos de su padre (la entradilla de Vocento va un nivel por encima).
function cuerpoHtml(doc) {
  const puntos = new Map();
  for (const p of doc.querySelectorAll("p")) {
    const t = limpiaEspacios(p.textContent);
    if (vale(t) && p.parentElement) puntos.set(p.parentElement, (puntos.get(p.parentElement) || 0) + t.length);
  }
  let mejor = null, max = 0;
  for (const [el, n] of puntos) if (n > max) { mejor = el; max = n; }
  if (!mejor) return [];
  const raiz = mejor.parentElement || mejor;
  const vistos = new Set();
  return [...raiz.querySelectorAll("p")]
    .filter(p => p.parentElement === mejor || p.parentElement === raiz)
    .map(p => sinCorte(limpiaEspacios(p.textContent)))
    .filter(t => vale(t) && !vistos.has(t) && vistos.add(t));
}
// Cuerpo de JSON-LD (algunos periódicos lo traen entero ahí aunque la página lo corte)
function trocea(cuerpo) {
  const { document } = parseHTML(`<div>${String(cuerpo).replace(/<br\s*\/?>|<\/p>/gi, "\n")}</div>`);
  const plano = (document.querySelector("div")?.textContent || "")
    // Párrafos pegados sin espacio («detenciones.Las diligencias»): ahí empieza párrafo nuevo
    .replace(/([a-záéíóúüñ\d)»”"])([.!?…]|[.!?]»)([«“"¿¡]?[A-ZÁÉÍÓÚÑ])/g, "$1$2\n$3");
  // aquí no se descartan párrafos cortos: en el cuerpo de JSON-LD son texto de la noticia
  return plano.split(/\n+/).map(t => sinCorte(limpiaEspacios(t))).filter(t => t.length > 1 && !RUIDO.test(t));
}

export function limpia(html) {
  const { document: doc } = parseHTML(html);
  const meta = p => doc.querySelector(`meta[property="${p}"]`)?.getAttribute("content") || doc.querySelector(`meta[name="${p}"]`)?.getAttribute("content") || "";

  // Datos estructurados: titular, fecha y, a veces, el cuerpo entero
  let ld = {};
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const j = JSON.parse(s.textContent);
      for (const it of [].concat(j, j && j["@graph"] || []).flat()) {
        if (it && /Article/i.test([].concat(it["@type"] || "").join(" "))) { ld = it; break; }
      }
    } catch { /* JSON-LD roto: se ignora */ }
    if (ld["@type"]) break;
  }
  const titulo = limpiaEspacios(ld.headline || meta("og:title") || doc.querySelector("h1")?.textContent || "");
  const fecha = ld.datePublished || meta("article:published_time") || "";

  // Quitar ruido. A diferencia del navegador, aquí NO se quita [class*="paywall"]: en El Norte y ABC
  // (Vocento) el cuerpo entero de la noticia va dentro de un <div class="paywall">.
  ["script", "style", "nav", "header", "footer", "aside", "form", "noscript", "iframe"].forEach(s =>
    doc.querySelectorAll(s).forEach(e => e.remove()));
  doc.querySelectorAll('[class*="cookie"],[class*="subscribe"],[class*="newsletter"]')
    .forEach(e => e.remove());

  const mejor = cuerpoHtml(doc);
  let lista = mejor, via = "html";
  // JSON-LD solo si el HTML se queda corto (página cortada o rara): el HTML conserva los párrafos
  if (ld.articleBody) {
    const deLd = trocea(ld.articleBody), nH = lista.join("").length, nL = deLd.join("").length;
    if (nL > nH * 1.3 || (nH < TEXTO_MINIMO && nL > nH)) { lista = deLd; via = "json-ld"; }
  }
  return { titulo, fecha, texto: lista.join("\n\n"), via };
}

async function descarga(url) {
  const ctl = new AbortController(); const reloj = setTimeout(() => ctl.abort(), ESPERA);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "es-ES,es;q=0.9" },
      redirect: "follow", signal: ctl.signal
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const bytes = new Uint8Array(await r.arrayBuffer());
    // Juego de caracteres: el de la cabecera, el de la página o UTF-8
    let cs = (r.headers.get("content-type") || "").match(/charset=([\w-]+)/i)?.[1];
    if (!cs) cs = new TextDecoder("latin1").decode(bytes.slice(0, 4000)).match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
    try { return new TextDecoder(cs || "utf-8").decode(bytes); } catch { return new TextDecoder("utf-8").decode(bytes); }
  } finally { clearTimeout(reloj); }
}

async function leeJSON(u, porDefecto) { try { return JSON.parse(await readFile(u, "utf8")); } catch { return porDefecto; } }

async function main() {
  await mkdir(DIR, { recursive: true });
  const ahora = Date.now();
  const estado = await leeJSON(ESTADO, {});
  const datos = await leeJSON(new URL("../public/datos.json", import.meta.url), {});
  const per = await leeJSON(new URL("../public/periodicos.json", import.meta.url), {});
  const reciente = f => { const t = new Date(f).getTime(); return !isNaN(t) && ahora - t < HORAS_VENTANA * 36e5; };

  // Noticias de pago recientes (Noticias y Periódicos)
  const candidatas = new Map();
  for (const dia of Object.values(datos.dias || {})) for (const n of dia.noticias || []) {
    if (!reciente(n.publicado || dia.fecha)) continue;
    for (const m of n.medios || []) if (m.pago && /^https?:\/\//i.test(m.url || "")) candidatas.set(m.url.trim(), n.titulo || "");
  }
  for (const n of per.noticias || []) if (n.pago && /^https?:\/\//i.test(n.url || "") && reciente(n.publicado)) candidatas.set(n.url.trim(), n.titulo || "");

  const hechos = new Set((await readdir(DIR)).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)));
  const cola = [...candidatas.keys()].filter(u => {
    const id = idDe(u);
    return !hechos.has(id) && !((estado[id]?.intentos || 0) >= INTENTOS_MAX);
  });
  console.log(`Noticias de pago recientes: ${candidatas.size} · ya preparadas: ${candidatas.size - cola.length} · por descargar: ${cola.length}`);

  const informe = [];
  let i = 0;
  const trabajador = async () => {
    while (i < cola.length) {
      const url = cola[i++]; const id = idDe(url); const host = new URL(url).hostname.replace(/^www\./, "");
      let motivo = "";
      try {
        const r = limpia(await descarga(url));
        if (r.texto.length >= TEXTO_MINIMO) {
          await writeFile(new URL(`${id}.json`, DIR), JSON.stringify({
            url, titulo: r.titulo || candidatas.get(url), fecha: r.fecha, texto: r.texto, via: r.via, descargado: new Date().toISOString()
          }));
          estado[id] = { url, ok: true, ultimo: new Date().toISOString() };
          informe.push(`OK   ${host} · ${r.texto.split("\n\n").length} párrafos, ${r.texto.length} caracteres (${r.via}) · ${url}`);
          if (MUESTRA) console.log(`\n--- ${url}\n${r.titulo}\n${r.texto.slice(0, 1200)}\n[...] ${r.texto.slice(-300)}\n`);
          continue;
        }
        motivo = `texto corto (${r.texto.length})`;
      } catch (e) { motivo = e.name === "AbortError" ? "sin respuesta" : e.message; }
      const prev = estado[id] || {};
      estado[id] = { url, ok: false, intentos: (prev.intentos || 0) + 1, ultimo: new Date().toISOString(), motivo };
      informe.push(`MAL  ${host} · ${motivo} · intento ${estado[id].intentos}/${INTENTOS_MAX} · ${url}`);
    }
  };
  await Promise.all(Array.from({ length: A_LA_VEZ }, trabajador));

  // Limpieza: fuera lo que ya no está en el histórico
  const limite = ahora - DIAS_GUARDAR * 864e5;
  let borrados = 0;
  for (const f of (await readdir(DIR)).filter(f => f.endsWith(".json"))) {
    const j = await leeJSON(new URL(f, DIR), null);
    if (!j || new Date(j.descargado).getTime() < limite) { await unlink(new URL(f, DIR)); borrados++; }
  }
  for (const [id, e] of Object.entries(estado)) if (new Date(e.ultimo).getTime() < limite) delete estado[id];
  await writeFile(ESTADO, JSON.stringify(estado, null, 1));

  const ok = informe.filter(l => l.startsWith("OK")).length;
  const resumen = `Textos nuevos: ${ok} · fallidos: ${informe.length - ok} · borrados por antiguos: ${borrados}`;
  console.log(informe.join("\n") + "\n" + resumen);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `### Textos completos\n${resumen}\n\n\`\`\`\n${informe.join("\n")}\n\`\`\`\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
