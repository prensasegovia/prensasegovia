// Avisos al móvil (Web Push): después de cada actualización, a cada compañero suscrito
// le llega como mucho UN aviso con lo nuevo que encaja con lo que eligió.
//
// Necesita:
//  - el secreto AVISOS del repositorio: "clavePrivadaVAPID|token" (lo pone Josemi en GitHub)
//  - public/avisos.json con { publica, url } (clave pública VAPID y dirección del Apps Script)
// Si falta algo, no hace nada (la actualización de noticias sigue igual).
import { readFile, writeFile, unlink } from "node:fs/promises";
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
// Una noticia ya avisada no se repite aunque se rehaga con otro id: también se recuerdan sus enlaces
const yaAvisada = n => ya.has("n:" + n.id) || (n.medios || []).some(m => m.url && ya.has("u:" + m.url));
const noticias = datos.dias.flatMap(d => d.noticias || []).filter(n => n.id && !yaAvisada(n) && new Date(n.publicado || 0).getTime() > haceHoras(36));
const periodicos = (per.noticias || []).filter(n => n.url && !ya.has("p:" + n.url) && new Date(n.publicado || 0).getTime() > haceHoras(36));
for (const n of datos.dias.flatMap(d => d.noticias || [])) { if (n.id) ya.add("n:" + n.id); for (const m of n.medios || []) if (m.url) ya.add("u:" + m.url); }
for (const n of per.noticias || []) if (n.url) ya.add("p:" + n.url);
let saludadosFin = null;
const guarda = () => writeFile(new URL(RUTA_AVISADAS, raiz), JSON.stringify({ claves: [...ya].slice(-8000), saludados: saludadosFin ? [...saludadosFin] : (avisadas?.saludados || []) }));

// Suscripciones guardadas en el Apps Script
let subs = [];
try {
  const r = await fetch(conf.url + "?accion=lista&token=" + encodeURIComponent(token.trim()), { redirect: "follow" });
  const j = await r.json(); subs = Array.isArray(j.subs) ? j.subs : [];
} catch (e) { console.log("Avisos: no se pudo leer la lista de suscritos:", e.message); await guarda(); process.exit(0); }
const tipo = e => /web\.push\.apple\.com/.test(e) ? "iPhone" : /fcm\.googleapis|android\.googleapis/.test(e) ? "Android/Chrome" : /mozilla/.test(e) ? "Firefox" : /notify\.windows/.test(e) ? "Edge" : "otro";
const porTipo = {}; for (const sb of subs) porTipo[tipo(sb.endpoint)] = (porTipo[tipo(sb.endpoint)] || 0) + 1;
console.log(`Avisos: ${subs.length} móviles apuntados (${Object.entries(porTipo).map(([k, v]) => v + " " + k).join(", ")})`);
for (const sb of subs) console.log(`  · ${tipo(sb.endpoint)} …${String(sb.endpoint).slice(-8)} · prefs ${JSON.stringify(sb.prefs || {})}`);

// Aviso de prueba a todos (se pide dejando datos/aviso-prueba.json; se borra al enviarlo)
try {
  const prueba = JSON.parse(await readFile(new URL("datos/aviso-prueba.json", raiz), "utf8"));
  let ok = 0;
  // Puede ser un aviso o una lista de avisos ({titulo, texto, tag, vista})
  for (const pr of (Array.isArray(prueba) ? prueba : [prueba])) for (const sb of subs.filter(x => !pr.solo || String(x.endpoint).endsWith(pr.solo))) {
    try { await webpush.sendNotification({ endpoint: sb.endpoint, keys: sb.keys }, JSON.stringify({ title: pr.titulo || "Prensa Segovia · Prueba", body: pr.texto || "Así se ven los avisos.", url: (conf.app || "./") + (pr.vista ? "#" + pr.vista : ""), tag: pr.tag || "prensa-segovia-prueba" }), { TTL: 3600 }); ok++; } catch (e) { console.log("Avisos: fallo en la prueba:", e.statusCode || e.message); }
  }
  await unlink(new URL("datos/aviso-prueba.json", raiz));
  console.log(`Avisos: prueba enviada a ${ok} de ${subs.length}`);
} catch (e) { if (e.code !== "ENOENT") console.log("Avisos: prueba:", e.message); }

// Bienvenida: al que acaba de activar los avisos le llega uno de prueba, así sabe que le funciona
const appUrl0 = conf.app || "https://prensasegovia.github.io/prensasegovia/";
const corto = e => e.slice(-24);
const saludados = new Set(avisadas?.saludados || []);
const caducadas0 = [];
for (const sb of subs) {
  if (saludados.has(corto(sb.endpoint))) continue;
  const p = sb.prefs || {};
  const que = (p.nivel === "importantes" ? "lo importante" : "todas las noticias de interés") + (p.capital === false ? ", sin Segovia capital" : "") + (Array.isArray(p.periodicos) ? (p.periodicos.length ? " y lo nuevo de " + (p.periodicos.length === 1 ? p.periodicos[0] : p.periodicos.length + " periódicos") : "") : p.periodicos ? " y lo nuevo de Periódicos" : "");
  try {
    await webpush.sendNotification({ endpoint: sb.endpoint, keys: sb.keys }, JSON.stringify({ title: "Prensa Segovia · Avisos activados ✓", body: `Te avisaremos aquí de ${que}. Puedes cambiarlo en Filtros y ajustes.`, url: appUrl0, tag: "prensa-segovia-hola" }), { TTL: 24 * 3600 });
    saludados.add(corto(sb.endpoint));
  } catch (e) { if (e.statusCode === 404 || e.statusCode === 410) caducadas0.push(sb.endpoint); else console.log("Avisos: fallo en la bienvenida:", e.statusCode || e.message); }
}
for (const k of [...saludados]) if (!subs.some(sb => corto(sb.endpoint) === k)) saludados.delete(k);
console.log(`Avisos: ${[...saludados].length} con bienvenida enviada`);
saludadosFin = saludados;

if (primeraVez) { await guarda(); console.log("Avisos: primera vez, se marca lo actual como ya avisado."); process.exit(0); }
// De noche (23:00–7:00, hora de Madrid) no se avisa: lo nuevo se guarda sin marcar y sale todo junto en la primera pasada desde las 7
const horaMadrid = Number(new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "numeric", hourCycle: "h23" }).format(new Date()));
if ((horaMadrid >= 23 || horaMadrid < 7) && (noticias.length || periodicos.length)) {
  await writeFile(new URL(RUTA_AVISADAS, raiz), JSON.stringify({ claves: avisadas?.claves || [], saludados: [...saludados] }));
  console.log(`Avisos: de noche (${horaMadrid} h); ${noticias.length} noticias y ${periodicos.length} de periódicos esperan a las 7.`); process.exit(0);
}
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
  // periodicos: lista de medios marcados (o true = todos, como era antes)
  const quiere = n => p.periodicos === true || (Array.isArray(p.periodicos) && p.periodicos.includes(n.medio));
  const perMias = p.periodicos ? periodicos.filter(n => quiere(n) && (p.capital !== false || (!esCapital(n) && n.municipio && n.municipio !== "General"))) : [];
  if (p.nivel === "ninguna") mias = [];
  if (!mias.length && !perMias.length) continue;
  // Dos avisos distintos, para que se vea de un vistazo qué es cada cosa:
  //  · «De interés»: lo que ha pasado el filtro del servicio (Noticias). Suena siempre.
  //  · «Periódicos»: lo que publican los periódicos marcados. Se va sustituyendo en vez de acumularse.
  const envios = [];
  if (mias.length) {
    const alta = mias.filter(n => n.relevancia === "alta"), resto = mias.length - alta.length;
    const lineas = [...alta, ...mias.filter(n => n.relevancia !== "alta")].map(n => `${n.relevancia === "alta" ? "⚠ " : ""}${lugar(n)} — ${n.titulo}`);
    // Una sola: el título dice el pueblo y debajo va el titular entero
    const titulo = mias.length === 1 ? `De interés · ${alta.length ? "Importante · " : ""}${lugar(mias[0])}`
      : `De interés · ${mias.length} ${mias.length === 1 ? "nueva" : "nuevas"}${alta.length ? ` (${alta.length === 1 ? "1 importante" : alta.length + " importantes"})` : ""}`;
    envios.push({ title: titulo, body: mias.length === 1 ? mias[0].titulo : lineas.slice(0, 3).join("\n") + (lineas.length > 3 ? `\n…y ${lineas.length - 3} más` : ""),
      url: appUrl + "#noticias", tag: "ps-interes-" + Date.now(), renotify: true, urgency: alta.length ? "high" : "normal" });
  }
  if (perMias.length) {
    const medios = [...new Set(perMias.map(n => n.medio))];
    const lineas = perMias.map(n => medios.length === 1 ? n.titulo : `${n.medio}: ${n.titulo}`);
    envios.push({ title: perMias.length === 1 ? `Periódicos · ${perMias[0].medio}` : `Periódicos · ${perMias.length} ${perMias.length === 1 ? "nueva" : "nuevas"}${medios.length === 1 ? " en " + medios[0] : ""}`,
      body: lineas.slice(0, 3).join("\n") + (lineas.length > 3 ? `\n…y ${lineas.length - 3} más` : ""),
      url: appUrl + "#periodicos", tag: "ps-periodicos", renotify: false, urgency: "low" });
  }
  for (const m of envios) {
    if (process.env.AVISOS_VER) console.log("—", s.endpoint.slice(-12), "|", m.title, "|", m.body.replace(/\n/g, " / "));
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.tag, renotify: m.renotify }), { TTL: 6 * 3600, urgency: m.urgency });
      enviados++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { caducadas.push(s.endpoint); break; }
      else console.log("Avisos: fallo al enviar a", tipo(s.endpoint), ":", e.statusCode || e.message, String(e.body || "").slice(0, 200));
    }
  }
}
if (caducadas.length) {
  try { await fetch(conf.url, { method: "POST", body: JSON.stringify({ accion: "borrar", token: token.trim(), endpoints: caducadas }), headers: { "Content-Type": "text/plain" } }); } catch {}
}
await guarda();
console.log(`Avisos: ${noticias.length} noticias y ${periodicos.length} de periódicos nuevas · ${subs.length} suscritos · ${enviados} avisos enviados · ${caducadas.length} caducados`);
