/* ================= Lector del texto completo ================= */
// Orden: 1) descarga local del periódico; 2) solo si falla por red o CORS, Jina (servicio externo); 3) si no hay texto, aviso
const LECTOR_ESPERA = 25000;   // tiempo máximo para Jina
const LOCAL_ESPERA = 10000;    // tiempo máximo para la descarga local
const TEXTO_MINIMO = 300;      // por debajo, se considera que no hay noticia (muro o página rara)
let turnoLector = 0;           // evita que una respuesta tardía pise otra noticia abierta después
const e2 = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const uOk = u => /^https?:\/\//i.test(u) ? e2(u) : "";
// Lo que va después de la noticia: se corta ahí
const COLA = /^(comenta\b|comentarios|te puede interesar|lo m[áa]s le[íi]do|noticias? relacionadas?|m[áa]s noticias|suscr[íi]bete|share article|temas relacionados|temas\s*$|etiquetas|vocento|678 socios)/i;
// Avisos y menús de la web: se descartan
const BASURA = /^(configura tu navegaci[óo]n|rechazar y pagar|aceptar y seguir|aceptar y pagar|pol[íi]tica de cookies|aviso legal|inicia sesi[óo]n|comparte|share|imprimir|publicidad|enviar por|guarda en|lee tambi[ée]n|newsletter)/i;
// Texto de la línea sin enlaces, imágenes, almohadillas ni viñetas
const plano = l => l.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/^#{1,6}\s+/, "").replace(/^(\*|-|\d+\.)\s+/, "").trim();
const norma = s => s.toLowerCase().replace(/[^a-z0-9áéíóúüñ]+/g, " ").trim();
// Se empieza en el primer párrafo de verdad (tras el titular, si la página lo trae) y se corta al llegar a la cola
function recortaNoticia(lineas, titulo) {
  const t = lineas.map(l => l.trim());
  const nt = norma(titulo || "").slice(0, 40);
  let desde = nt ? t.findIndex(l => /^#\s/.test(l) && norma(plano(l)).startsWith(nt)) : -1;
  if (desde < 0) desde = 0;
  const largo = n => (l, k) => k >= desde && plano(l).length >= n && !BASURA.test(plano(l));
  let i = t.findIndex(largo(180));
  if (i < 0) i = t.findIndex(largo(120));
  if (i < 0) i = desde;
  const out = [];
  for (let k = i; k < t.length; k++) {
    const l = t[k];
    if (!l) { out.push(l); continue; }
    const p = plano(l);
    if (/^noticia relacionada/i.test(p)) { // se salta el titular y la foto que la acompañan
      while (k + 1 < t.length) { const s = t[k + 1]; if (s && (plano(s).length >= 180 || /^#{1,6}\s/.test(s))) break; k++; }
      continue;
    }
    if (COLA.test(p)) break;
    if (BASURA.test(p)) continue;
    out.push(l);
  }
  return out.slice(0, 300);
}
function enLinea(t) {
  return e2(t)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (m, alt, u) => uOk(u) ? `<img class="limg" src="${uOk(u)}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">` : "")
    .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (m, tx, u) => uOk(u) ? `<a href="${uOk(u)}" target="_blank" rel="noopener">${tx}</a>` : tx)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}
function pintaMarkdown(md) {
  const i = md.indexOf("Markdown Content:");
  const cab = i >= 0 ? md.slice(0, i) : "";
  const cuerpo = i >= 0 ? md.slice(i + 17) : md;
  const titulo = (cab.match(/^Title:\s*(.+)$/m) || [])[1] || "";
  const fecha = (cab.match(/^Published Time:\s*(.+)$/m) || [])[1] || "";
  const salida = []; let lista = null; let parrafo = [];
  const cierraP = () => { if (parrafo.length) { salida.push(`<p>${enLinea(parrafo.join(" "))}</p>`); parrafo = []; } };
  const cierraL = () => { if (lista) { salida.push(`<ul>${lista.join("")}</ul>`); lista = null; } };
  for (const linea of recortaNoticia(cuerpo.split(/\r?\n/), titulo)) {
    const t = linea.trim();
    if (!t) { cierraP(); cierraL(); continue; }
    if (/^#{1,6}\s+/.test(t)) { cierraP(); cierraL(); salida.push(`<h2>${enLinea(t.replace(/^#{1,6}\s+/, ""))}</h2>`); continue; }
    if (/^(\*|-|\d+\.)\s+/.test(t)) { cierraP(); (lista ||= []).push(`<li>${enLinea(t.replace(/^(\*|-|\d+\.)\s+/, ""))}</li>`); continue; }
    if (/^>\s?/.test(t)) { cierraP(); cierraL(); salida.push(`<blockquote>${enLinea(t.replace(/^>\s?/, ""))}</blockquote>`); continue; }
    cierraL(); parrafo.push(t);
  }
  cierraP(); cierraL();
  return { titulo, fecha, html: salida.join("") };
}
function fechaLegible(f) {
  const d = new Date(f);
  if (!f || isNaN(d)) return f || "";
  return `${fmtLong(f.slice(0, 10))} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} h`;
}
/* 1) Descarga local: baja el HTML del periódico y lo limpia aquí mismo.
   Si el navegador la bloquea (red o CORS), fetch lanza un error y se pasa a Jina. */
async function obtenerTextoLocal(url, signal) {
  const res = await fetch(url, { headers: { 'Accept': 'text/html' }, signal });
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // quitar ruido
  ['script','style','nav','header','footer','aside','form'].forEach(s =>
    doc.querySelectorAll(s).forEach(e => e.remove()));
  doc.querySelectorAll('[class*="cookie"],[class*="subscribe"],[class*="paywall"],[class*="newsletter"]')
    .forEach(e => e.remove());

  // buscar el contenedor del cuerpo
  const cuerpo = doc.querySelector('article, [itemprop="articleBody"], .article-body, .cuerpo-noticia');
  if (!cuerpo) return '';

  return Array.from(cuerpo.querySelectorAll('p'))
    .map(p => p.textContent.trim())
    .filter(t => t.length > 30)
    .join('\n\n');
}
/* 2) Jina (servicio externo): solo se llama si la descarga local ha fallado por red o CORS */
async function obtenerConJina(jina, signal) {
  const r = await fetch(jina, { signal });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return pintaMarkdown(await r.text());
}
async function conEspera(ms, tarea) {
  const ctl = new AbortController(); const reloj = setTimeout(() => ctl.abort(), ms);
  try { return await tarea(ctl.signal); } finally { clearTimeout(reloj); }
}
const textoPlano = html => (new DOMParser().parseFromString(html, "text/html").body.textContent || "").trim();
// Titular de la tarjeta de la que se ha abierto el lector (la descarga local solo devuelve el texto)
const tituloTarjeta = url => {
  const c = [...document.querySelectorAll("article.card[data-href]")].find(c => c.dataset.href === url);
  return (c && c.querySelector("h4") && c.querySelector("h4").textContent.trim()) || "";
};
async function abreLector(jina, original, img) {
  const capa = $("#lector"); if (!capa) return;
  const turno = ++turnoLector;
  let medio = "Texto completo";
  try { medio = new URL(original).hostname.replace(/^www\./, ""); } catch (e) {}
  const barra = `<div class="lbar"><span class="lmedio">${e2(medio)}</span><button data-lc="cerrar" type="button" aria-label="Cerrar">✕</button></div>`;
  const abrirOriginal = `<a class="btn" href="${e2(original)}" target="_blank" rel="noopener">Abrir en el periódico</a>`;
  const sigueAbierto = () => turno === turnoLector && !capa.hidden;
  const pinta = (tituloHtml, fecha, cuerpoHtml, externo) => {
    if (!sigueAbierto()) return;
    capa.innerHTML = `${barra}
      <article class="lcuerpo"><h1>${tituloHtml || "Noticia"}</h1>${fecha ? `<div class="lfirma">${e2(fecha)}</div>` : ""}${externo ? `<div class="lexterno">Obtenido con servicio externo</div>` : ""}${img ? `<img class="lhero" src="${e2(img)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}${cuerpoHtml}
      <div class="lpie">${abrirOriginal}<button class="btn ghost" data-lc="cerrar" type="button">Cerrar</button></div></article>`;
    capa.scrollTop = 0;
  };
  const avisa = texto => {
    if (!sigueAbierto()) return;
    capa.innerHTML = `${barra}<div class="lmal"><p class="aviso">${texto}</p>${abrirOriginal}<br><button class="btn ghost" data-lc="cerrar" type="button">Cerrar</button></div>`;
  };
  capa.hidden = false; document.body.classList.add("leyendo");
  capa.innerHTML = `${barra}<div class="lcarga">Abriendo la noticia completa…</div>`;

  // 1) Local primero
  let texto = null;
  try { texto = await conEspera(LOCAL_ESPERA, s => obtenerTextoLocal(original, s)); }
  catch (e) { texto = null; } // error de red o CORS: entonces, y solo entonces, Jina
  if (texto !== null) {
    if (!texto || texto.length < TEXTO_MINIMO) {
      avisa("Texto no disponible en local (posible muro en servidor). Abre la noticia en el medio original.");
      return;
    }
    pinta(e2(tituloTarjeta(original)), "", texto.split(/\n\n+/).map(p => `<p>${e2(p)}</p>`).join(""), false);
    return;
  }

  // 2) Jina, solo porque la local ha fallado
  try {
    const { titulo, fecha, html } = await conEspera(LECTOR_ESPERA, s => obtenerConJina(jina, s));
    if (textoPlano(html).length < TEXTO_MINIMO) throw new Error("texto corto");
    pinta(enLinea(titulo) || e2(tituloTarjeta(original)), fechaLegible(fecha), html, true);
  } catch (e) {
    // 3) Han fallado las dos
    avisa("No se ha podido obtener el texto, ni en local ni con el servicio externo. Abre la noticia en el medio original.");
  }
}
function cierraLector() { const c = $("#lector"); if (!c) return; c.hidden = true; c.innerHTML = ""; document.body.classList.remove("leyendo"); }
$("#lector").addEventListener("click", e => { if (e.target.dataset.lc === "cerrar" || e.target.id === "lector") cierraLector(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#lector").hidden) cierraLector(); });
