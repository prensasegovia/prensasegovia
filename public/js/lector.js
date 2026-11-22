/* ================= Lector del texto completo ================= */
const LECTOR_ESPERA = 25000;
const e2 = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const uOk = u => /^https?:\/\//i.test(u) ? e2(u) : "";
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
  for (const linea of cuerpo.split(/\r?\n/)) {
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
async function abreLector(jina, original) {
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
    capa.innerHTML = `<div class="lbar"><span class="lmedio">${e2(medio)}</span><button data-lc="cerrar" type="button" aria-label="Cerrar">✕</button></div>
      <article class="lcuerpo"><h1>${enLinea(titulo) || "Noticia"}</h1>${fecha ? `<div class="lfirma">${e2(fecha)}</div>` : ""}${html}
      <div class="lpie"><a class="btn" href="${e2(original)}" target="_blank" rel="noopener">Abrir en el periódico</a><button class="btn ghost" data-lc="cerrar" type="button">Cerrar</button></div></article>`;
    capa.scrollTop = 0;
  } catch (e) {
    capa.innerHTML = `<div class="lmal"><p>El lector no ha respondido (${e2(e.message)}).</p><a class="btn" href="${e2(jina)}" target="_blank" rel="noopener">Abrirlo de otra forma</a><br><button class="btn ghost" data-lc="cerrar" type="button">Cerrar</button></div>`;
  }
}
function cierraLector() { const c = $("#lector"); if (!c) return; c.hidden = true; c.innerHTML = ""; document.body.classList.remove("leyendo"); }
$("#lector").addEventListener("click", e => { if (e.target.dataset.lc === "cerrar" || e.target.id === "lector") cierraLector(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#lector").hidden) cierraLector(); });
