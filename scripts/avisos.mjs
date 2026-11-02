// Avisos al móvil (Web Push): después de cada actualización, a cada compañero suscrito
// le llega como mucho UN aviso con lo nuevo que encaja con lo que eligió.
//
// Necesita:
//  - el secreto AVISOS del repositorio: "clavePrivadaVAPID|token" (lo pone Josemi en GitHub)
//  - public/avisos.json con { publica, url } (clave pública VAPID y dirección del Apps Script)
// Si falta algo, no hace nada (la actualización de noticias sigue igual).
import { readFile, writeFile } from "node:fs/promises";
import webpush from "web-push";

const raiz = new URL("../", import.meta.url);
const lee = async (r, def) => { try { return JSON.parse(await readFile(new URL(r, raiz), "utf8")); } catch { return def; } };

const conf = await lee("public/avisos.json", {});
const [privada, token] = String(process.env.AVISOS || "").split("|");
if (!conf.publica || !conf.url || !privada || !token) { console.log("Avisos: sin configurar todavía, no se envía nada."); process.exit(0); }
try { webpush.setVapidDetails("mailto:prensa-bot@users.noreply.github.com", conf.publica, privada.trim()); }
catch (e) { console.log("Avisos: la clave del secreto AVISOS no es válida:", e.message); process.exit(0); }

const datos = await lee("public/datos.json", { dias: [] });
const per = await lee("public/periodicos.json", { noticias: [] });
const RUTA_AVISADAS = "datos/avisadas.json";
const avisadas = await lee(RUTA_AVISADAS, null);
const primeraVez = !avisadas;
const ya = new Set(avisadas?.claves || []);

const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esCapital = n => norm(n.municipio) === "segovia";
const lugar = n => n.municipio && n.municipio !== "General" ? n.municipio : "Provincia";
const haceHoras = h => Date.now() - h * 36e5;

// Lo nuevo desde la última vez (solo de las últimas 36 h, para no avisar de cosas viejas que reaparecen)
const noticias = datos.dias.flatMap(d => d.noticias || []).filter(n => n.id && !ya.has("n:" + n.id) && new Date(n.publicado || 0).getTime() > haceHoras(36));
const periodicos = (per.noticias || []).filter(n => n.url && !ya.has("p:" + n.url) && new Date(n.publicado || 0).getTime() > haceHoras(36));
for (const n of datos.dias.flatMap(d => d.noticias || [])) if (n.id) ya.add("n:" + n.id);
for (const n of per.noticias || []) if (n.url) ya.add("p:" + n.url);
let saludadosFin = null;
const guarda = () => writeFile(new URL(RUTA_AVISADAS, raiz), JSON.stringify({ claves: [...ya].slice(-4000), saludados: saludadosFin ? [...saludadosFin] : (avisadas?.saludados || []) }));

// Suscripciones guardadas en el Apps Script
let subs = [];
try {
  const r = await fetch(conf.url + "?accion=lista&token=" + encodeURIComponent(token.trim()), { redirect: "follow" });
  const j = await r.json(); subs = Array.isArray(j.subs) ? j.subs : [];
} catch (e) { console.log("Avisos: no se pudo leer la lista de suscritos:", e.message); await guarda(); process.exit(0); }
console.log(`Avisos: ${subs.length} móviles apuntados`);

// Bienvenida: al que acaba de activar los avisos le llega uno de prueba, así sabe que le funciona
const appUrl0 = conf.app || "https://prensasegovia.github.io/prensasegovia/";
const corto = e => e.slice(-24);
const saludados = new Set(avisadas?.saludados || []);
const caducadas0 = [];
for (const sb of subs) {
  if (saludados.has(corto(sb.endpoint))) continue;
  const p = sb.prefs || {};
  const que = (p.nivel === "importantes" ? "lo importante" : "todas las noticias de interés") + (p.capital === false ? ", sin Segovia capital" : "") + (p.periodicos ? " y lo nuevo de Periódicos" : "");
  try {
    await webpush.sendNotification({ endpoint: sb.endpoint, keys: sb.keys }, JSON.stringify({ title: "Prensa Segovia · Avisos activados ✓", body: `Te avisaremos aquí de ${que}. Puedes cambiarlo en Filtros y ajustes.`, url: appUrl0, tag: "prensa-segovia-hola" }), { TTL: 24 * 3600 });
    saludados.add(corto(sb.endpoint));
  } catch (e) { if (e.statusCode === 404 || e.statusCode === 410) caducadas0.push(sb.endpoint); else console.log("Avisos: fallo en la bienvenida:", e.statusCode || e.message); }
}
for (const k of [...saludados]) if (!subs.some(sb => corto(sb.endpoint) === k)) saludados.delete(k);
console.log(`Avisos: ${[...saludados].length} con bienvenida enviada`);
saludadosFin = saludados;

if (primeraVez) { await guarda(); console.log("Avisos: primera vez, se marca lo actual como ya avisado."); process.exit(0); }
if (!noticias.length && !periodicos.length) {
  if (caducadas0.length) try { await fetch(conf.url, { method: "POST", body: JSON.stringify({ accion: "borrar", token: token.trim(), endpoints: caducadas0 }), headers: { "Content-Type": "text/plain" } }); } catch {}
  await guarda(); console.log("Avisos: nada nuevo."); process.exit(0);
}

const appUrl = conf.app || "https://prensasegovia.github.io/prensasegovia/";
const caducadas = [...caducadas0];
let enviados = 0;
for (const s of subs.filter(x => !caducadas0.includes(x.endpoint))) {
  const p = s.prefs || {};
  // nivel: "todas" | "importantes" · capital: true/false · periodicos: true/false
  let mias = noticias.filter(n => (p.capital !== false || !esCapital(n)) && (p.nivel !== "importantes" || n.relevancia === "alta"));
  const perMias = p.periodicos ? periodicos.filter(n => p.capital !== false || !esCapital(n)) : [];
  if (p.nivel === "ninguna") mias = [];
  if (!mias.length && !perMias.length) continue;
  const alta = mias.filter(n => n.relevancia === "alta");
  const orden = [...alta, ...mias.filter(n => n.relevancia !== "alta")];
  const lineas = [...orden.map(n => `${lugar(n)} — ${n.titulo}`), ...perMias.map(n => `${n.medio}: ${n.titulo}`)];
  const total = lineas.length;
  const titulo = alta.length ? `⚠ ${alta.length === 1 ? "Importante" : alta.length + " importantes"}${total > alta.length ? ` y ${total - alta.length} más` : ""}`
    : mias.length ? `${mias.length} ${mias.length === 1 ? "noticia nueva" : "noticias nuevas"}${perMias.length ? ` · ${perMias.length} en periódicos` : ""}`
    : `${perMias.length} ${perMias.length === 1 ? "nueva en periódicos" : "nuevas en periódicos"}`;
  const cuerpo = lineas.slice(0, 3).join("\n") + (total > 3 ? `\n…y ${total - 3} más` : "");
  const vista = mias.length ? "noticias" : "periodicos";
  if (process.env.AVISOS_VER) console.log("—", s.endpoint.slice(-12), "|", titulo, "|", cuerpo.replace(/\n/g, " / "));
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title: "Prensa Segovia · " + titulo, body: cuerpo, url: appUrl + "#" + vista, tag: "prensa-segovia" }), { TTL: 6 * 3600, urgency: alta.length ? "high" : "normal" });
    enviados++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) caducadas.push(s.endpoint);
    else console.log("Avisos: fallo al enviar:", e.statusCode || e.message);
  }
}
if (caducadas.length) {
  try { await fetch(conf.url, { method: "POST", body: JSON.stringify({ accion: "borrar", token: token.trim(), endpoints: caducadas }), headers: { "Content-Type": "text/plain" } }); } catch {}
}
await guarda();
console.log(`Avisos: ${noticias.length} noticias y ${periodicos.length} de periódicos nuevas · ${subs.length} suscritos · ${enviados} avisos enviados · ${caducadas.length} caducados`);
