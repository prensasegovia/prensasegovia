/* ================= Lector del texto completo ================= */
const LECTOR_ESPERA = 25000;
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
async function abreLector(jina, original, img) {
  const capa = $("#lector"); if (!capa) return;
  let medio = "Texto completo";
  try { medio = new URL(original).hostname.replace(/^www\./, ""); } catch (e) {}
  capa.hidden = false; document.body.classList.add("leyendo");
  capa.innerHTML = `<div class="lbar"><span class="lmedio">${e2(medio)}</span><button data-lc="cerrar" type="button" aria-label="Cerrar">✕</button></div><div class="lcarga">Abriendo la noticia completa…</div>`;
  try {
    const ctl = new AbortController(); const reloj = setTimeout(() => ctl.abort(), LECTOR_ESPERA);
    const r = await fetch(jina, { signal: ctl.signal }); clearTimeout(reloj);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const { titulo, fecha, html } = pintaMarkdown(await r.text());
    const f = fechaLegible(fecha);
    capa.innerHTML = `<div class="lbar"><span class="lmedio">${e2(medio)}</span><button data-lc="cerrar" type="button" aria-label="Cerrar">✕</button></div>
      <article class="lcuerpo"><h1>${enLinea(titulo) || "Noticia"}</h1>${f ? `<div class="lfirma">${e2(f)}</div>` : ""}${img ? `<img class="lhero" src="${e2(img)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}${html}
      <div class="lpie"><a class="btn" href="${e2(original)}" target="_blank" rel="noopener">Abrir en el periódico</a><button class="btn ghost" data-lc="cerrar" type="button">Cerrar</button></div></article>`;
    capa.scrollTop = 0;
  } catch (e) {
    capa.innerHTML = `<div class="lmal"><p>El lector no ha respondido (${e2(e.message)}).</p><a class="btn" href="${e2(jina)}" target="_blank" rel="noopener">Abrirlo de otra forma</a><br><button class="btn ghost" data-lc="cerrar" type="button">Cerrar</button></div>`;
  }
}
function cierraLector() { const c = $("#lector"); if (!c) return; c.hidden = true; c.innerHTML = ""; document.body.classList.remove("leyendo"); }
$("#lector").addEventListener("click", e => { if (e.target.dataset.lc === "cerrar" || e.target.id === "lector") cierraLector(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#lector").hidden) cierraLector(); });
