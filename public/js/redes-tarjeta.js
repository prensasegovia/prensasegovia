/* ===== Redes · tarjeta común (Prensa Segovia y Atalaya) =====
   Este archivo es el MISMO en las dos webs: el original está en prensasegovia/public/js/redes-tarjeta.js y Atalaya
   recibe una copia exacta con datos/sincronizar_redes.js. No depende de nada de ninguna de las dos webs, así que
   funciona igual en el navegador y en los scripts de Node (para preparar la copia de Atalaya).

   Qué hay aquí:
   - El formato común de una publicación (rsNorm): lo que devuelva cada red se pasa a este formato.
   - La tarjeta (tarjeta): cómo se pinta una publicación, igual en las dos webs.
   - La ficha para informes (ficha): texto con red, perfil, fecha y hora, enlace, texto y cifras.
   - Utilidades de fechas (siempre en hora peninsular), búsqueda sin tildes y texto con enlaces.

   Formato que se espera del servidor (/api/feed?red=…&usuario=…). Lo que falte simplemente no se muestra:
   { perfiles:[{ usuario, nombre, avatar, seguidores, siguiendo, total, verificado, bio }], errores:[{ error }],
     posts:[{ id, url, usuario, autor, avatar, verificado, fecha, texto, imagenes:[], video, esVideo, duracion,
              tipo:"post|carrusel|reel|video|retuit|respuesta|cita|compartido|historia|directo", fijado, editado,
              respuestaA, repostDe:{ autor, usuario }, cita:{ autor, usuario, texto, url, fecha, imagen },
              enlace:{ url, titulo, dominio, imagen }, ubicacion, musica, colaboradores:[],
              metricas:{ likes, respuestas, compartidos, vistas, guardados } }] }

   Un perfil (lista compartida): { id, r:"ig|fb|x|tt", u:"@usuario" (o nombre de página en Facebook), n:"Nombre", g:"Grupo",
   m:"40xxx" (código INE del pueblo, opcional), av:true|false (aviso) }. La clave estable de un perfil es «r|usuario». */
(function (raiz) {
  const RED = {
    ig: { n: "Instagram", c: "#D6336C", api: "instagram", url: u => `https://www.instagram.com/${u}/`, tag: w => `https://www.instagram.com/explore/tags/${w}/`, men: u => `https://www.instagram.com/${u}/`,
      nom: { likes: "Me gusta", respuestas: "Comentarios", compartidos: "Compartidos", vistas: "Reproducciones", guardados: "Guardados", pub: "publicación" } },
    fb: { n: "Facebook", c: "#1877F2", api: "facebook", url: u => `https://www.facebook.com/${u}/`, tag: w => `https://www.facebook.com/hashtag/${w}`, men: u => `https://www.facebook.com/${u}`,
      nom: { likes: "Reacciones", respuestas: "Comentarios", compartidos: "Veces compartido", vistas: "Reproducciones", guardados: "Guardados", pub: "publicación" } },
    x: { n: "X", c: "#111111", api: "x", url: u => `https://x.com/${u}`, tag: w => `https://x.com/hashtag/${w}`, men: u => `https://x.com/${u}`,
      nom: { likes: "Me gusta", respuestas: "Respuestas", compartidos: "Reposts", vistas: "Visualizaciones", guardados: "Guardados", pub: "tuit" } },
    tt: { n: "TikTok", c: "#FE2C55", api: "tiktok", url: u => `https://www.tiktok.com/@${u}`, tag: w => `https://www.tiktok.com/tag/${w}`, men: u => `https://www.tiktok.com/@${u}`,
      nom: { likes: "Me gusta", respuestas: "Comentarios", compartidos: "Compartidos", vistas: "Reproducciones", guardados: "Guardados", pub: "vídeo" } }
  };
  const TIPO = { reel: "Reel", video: "Vídeo", carrusel: "Carrusel", retuit: "Repost", respuesta: "Respuesta", cita: "Cita", compartido: "Compartido", historia: "Historia", directo: "Directo" };
  const TZ = "Europe/Madrid";
  const SVG = {
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M16.8 3.6c-1.9 0-3.6 1-4.8 2.6-1.2-1.6-2.9-2.6-4.8-2.6C4.3 3.6 2 6 2 9c0 5.6 8.5 11 10 11.5 1.5-.5 10-5.9 10-11.5 0-3-2.3-5.4-5.2-5.4z"/></svg>`,
    com: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M20.7 16.2A9.5 9.5 0 1 0 17 20.1L21.5 21z"/></svg>`,
    rep: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>`,
    ojo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
    guarda: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
    abre: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>`,
    todos: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>`,
    ok: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    enlace: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>`,
    ficha: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></svg>`,
    pin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 3l6 6-3 1-3 3 .5 4.5L13 20l-4-4-5 5-1-1 5-5-4-4 2.5-2.5L11 9l3-3z"/></svg>`,
    lugar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`,
    musica: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    resp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 5 5v6"/></svg>`,
    verif: `<svg viewBox="0 0 24 24" aria-label="Cuenta verificada"><path fill="#1D9BF0" d="M12 1.5l2.6 1.9 3.2-.2 1 3 2.7 1.8-.9 3.1.9 3.1-2.7 1.8-1 3-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3-2.7-1.8.9-3.1-.9-3.1 2.7-1.8 1-3 3.2.2z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M7.8 12.2l2.8 2.8 5.6-5.8"/></svg>`,
    buscar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`
  };
  const ICO_M = { likes: SVG.heart, respuestas: SVG.com, compartidos: SVG.rep, vistas: SVG.ojo, guardados: SVG.guarda };

  /* ---------- Básicos ---------- */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const usr = u => String(u || "").replace(/^@/, "");
  const clave = p => p.r + "|" + usr(p.u).toLowerCase(); // clave estable de un perfil (no cambia aunque cambie su id)
  const urlPerfil = (r, u) => RED[r].url(r === "fb" ? usr(u) : encodeURIComponent(usr(u)));
  const plural = (n, a, b) => `${Number(n).toLocaleString("es-ES")} ${n === 1 ? a : b}`;
  const num = n => n == null ? "—" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(".", ",") + " M" : n >= 1e4 ? Math.round(n / 1e3) + " mil" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".", ",") + " mil" : String(n);
  const exacto = n => n == null ? "" : Number(n).toLocaleString("es-ES");
  const iniciales = n => String(n || "").replace(/[·|].*$/, "").replace(/^@/, "").split(/[\s._-]+/).filter(w => /^[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(w) && !/^(de|del|la|el|los|las|y)$/i.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
  // Icono de cada red: un círculo con su color y su inicial (cada web puede poner el suyo con opciones.icono)
  const icono = r => `<span class="rs-ico" style="background:${RED[r].c}" title="${RED[r].n}">${{ ig: "IG", fb: "f", x: "X", tt: "♪" }[r]}</span>`;

  /* ---------- Fechas: siempre en hora peninsular, aunque el ordenador esté en otra zona ---------- */
  const F = (f, o) => new Date(f).toLocaleString("es-ES", { timeZone: TZ, ...o });
  const hora = f => F(f, { hour: "2-digit", minute: "2-digit" });
  const corta = f => F(f, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const larga = f => { const t = F(f, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
  const diaClave = f => F(f, { year: "numeric", month: "2-digit", day: "2-digit" });
  const dia = f => { const k = diaClave(f); if (k === diaClave(Date.now())) return "Hoy"; if (k === diaClave(Date.now() - 864e5)) return "Ayer";
    const mismo = F(f, { year: "numeric" }) === F(Date.now(), { year: "numeric" });
    const t = F(f, mismo ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "long", day: "numeric", month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
  const hace = f => { const s = (Date.now() - new Date(f)) / 1000; if (!(s >= 0) || s > 7 * 86400) return "";
    return s < 60 ? "ahora mismo" : s < 3600 ? `hace ${Math.round(s / 60)} min` : s < 86400 ? `hace ${Math.round(s / 3600)} h` : `hace ${Math.round(s / 86400)} d`; };
  const dur = s => s > 0 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "";

  /* ---------- Búsqueda: sin distinguir mayúsculas ni tildes, y resaltando lo encontrado ---------- */
  const sinTilde = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const qRe = q => { q = String(q || "").trim(); if (!q) return null;
    const m = { a: "aáàäâ", e: "eéèëê", i: "iíìïî", o: "oóòöô", u: "uúùüû", n: "nñ", c: "cç" };
    return new RegExp(sinTilde(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[aeiounc]/g, ch => `[${m[ch]}]`), "giu"); };
  const escM = (s, re) => { s = String(s ?? ""); if (!re) return esc(s); let out = "", ult = 0;
    s.replace(re, (m, i) => { out += esc(s.slice(ult, i)) + `<mark>${esc(m)}</mark>`; ult = i + m.length; return m; });
    return out + esc(s.slice(ult)); };
  const casa = (o, q) => { const t = sinTilde(q).trim(); if (!t) return true;
    return [o.texto, o.autor, o.usuario, o.p && o.p.n, o.p && o.p.g, o.ubicacion, o.musica, o.respuestaA, o.cita && o.cita.texto, o.cita && o.cita.usuario, o.enlace && o.enlace.titulo, o.repostDe && o.repostDe.usuario, ...(o.colaboradores || [])]
      .some(v => v && sinTilde(v).includes(t)); };
  // Texto con enlaces, #etiquetas y @menciones que llevan a la red de la publicación
  function texto(t, red, re) {
    const R = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)»])|(^|[\s(¡¿«])([#@])([\p{L}\p{N}_.]*[\p{L}\p{N}_])/gu;
    let out = "", ult = 0, m; t = String(t || "");
    while ((m = R.exec(t))) {
      out += escM(t.slice(ult, m.index), re);
      if (m[1]) out += `<a href="${esc(m[1])}" target="_blank" rel="noopener noreferrer">${escM(m[1].replace(/^https?:\/\/(www\.)?/, "").slice(0, 60) + (m[1].length > 68 ? "…" : ""), re)}</a>`;
      else out += esc(m[2]) + `<a href="${esc((m[3] === "#" ? RED[red].tag : RED[red].men)(encodeURIComponent(m[4])))}" target="_blank" rel="noopener noreferrer">${m[3]}${escM(m[4], re)}</a>`;
      ult = m.index + m[0].length;
    }
    return out + escM(t.slice(ult), re);
  }

  /* ---------- Formato común ---------- */
  // x: publicación tal como llega; p: perfil; img: cómo convertir la ruta de una imagen (el Worker da rutas propias /api/img…)
  function rsNorm(x, p, img) {
    img = img || (s => s || "");
    const red = p.r, usuario = usr(x.usuario || p.u), fecha = x.fecha || x.date || "";
    return { k: red + ":" + (x.id || x.url || usuario + fecha), red, p, id: x.id || "", url: x.url || urlPerfil(red, p.u),
      usuario, autor: x.autor || "", avatar: img(x.avatar), verificado: !!x.verificado, fecha,
      texto: String(x.texto || "").trim(), imagenes: (x.imagenes || []).map(img).filter(Boolean), video: img(x.video),
      esVideo: !!(x.esVideo || x.video || /^(reel|video)$/.test(x.tipo || "")), duracion: +x.duracion || 0,
      tipo: x.tipo || "", fijado: !!x.fijado, editado: !!x.editado, respuestaA: x.respuestaA ? usr(x.respuestaA) : "",
      repostDe: x.repostDe && x.repostDe.usuario ? { autor: x.repostDe.autor || "", usuario: usr(x.repostDe.usuario) } : null,
      cita: x.cita && (x.cita.texto || x.cita.url) ? { ...x.cita, usuario: usr(x.cita.usuario), imagen: img(x.cita.imagen) } : null,
      enlace: x.enlace && x.enlace.url ? { ...x.enlace, imagen: img(x.enlace.imagen), dominio: x.enlace.dominio || (String(x.enlace.url).match(/^https?:\/\/(?:www\.)?([^/]+)/) || [])[1] || "" } : null,
      ubicacion: x.ubicacion || "", musica: x.musica || "", colaboradores: (x.colaboradores || []).map(usr).filter(Boolean),
      m: x.metricas || x.m || {} };
  }
  const nombreDe = o => o.autor && o.autor.toLowerCase() !== o.usuario.toLowerCase() ? o.autor : ((o.p && o.p.n) || o.usuario);

  /* ---------- La tarjeta ----------
     opciones: { re (búsqueda a resaltar), nuevo (true/false), icono(r), avatar(o) → html de la foto, img: "propia" para
     que Atalaya cargue las imágenes con data-propia, acciones: html extra en el pie } */
  function media(o, op) {
    const imgs = o.imagenes, url = esc(o.url), d = dur(o.duracion);
    const im = (s, lazy) => op.img === "propia" ? `<img data-propia="${esc(s)}" alt="">` : `<img${lazy ? ' loading="lazy"' : ""} src="${esc(s)}" alt="" referrerpolicy="no-referrer">`;
    const ab = (s, lazy) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${im(s, lazy)}</a>`;
    if (o.video) return `<div class="rs-media"><video controls preload="none" playsinline src="${esc(o.video)}"${imgs[0] ? ` poster="${esc(imgs[0])}"` : ""}></video></div>`;
    if (!imgs.length) return o.esVideo ? `<a class="rs-media rs-sinimg" href="${url}" target="_blank" rel="noopener noreferrer">${SVG.play}<span>Ver el vídeo en ${RED[o.red].n}${d ? " · " + d : ""}</span></a>` : "";
    if (o.red === "x" && imgs.length > 1 && imgs.length <= 4) return `<div class="rs-media rs-mosaico n${imgs.length}">${imgs.map((s, i) => ab(s, i > 0)).join("")}</div>`;
    if (imgs.length > 1) return `<div class="rs-media"><div class="rs-car">${imgs.map((s, i) => ab(s, i > 0)).join("")}</div><span class="rs-cnt">1/${imgs.length}</span>`
      + `<button class="rs-flecha izq" data-rs="car" data-v="-1" aria-label="Anterior">‹</button><button class="rs-flecha der" data-rs="car" data-v="1" aria-label="Siguiente">›</button></div>`
      + `<div class="rs-puntos">${imgs.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div>`;
    return `<div class="rs-media">${ab(imgs[0], true)}${o.esVideo ? `<span class="rs-vid">${SVG.play}${d ? `<b>${d}</b>` : ""}</span>` : ""}</div>`;
  }
  function tarjeta(o, op) {
    op = op || {}; const re = op.re || null, ico = op.icono || icono, R = RED[o.red], N = R.nom, p = o.p || {};
    const men = u => esc(R.men(encodeURIComponent(u)));
    const perfil = esc(urlPerfil(o.red, o.usuario)), url = esc(o.url), nombre = nombreDe(o);
    const tipo = o.red === "tt" && o.tipo === "video" ? "" : TIPO[o.tipo] || (o.esVideo && o.red !== "tt" ? "Vídeo" : ""); // en TikTok todo es vídeo
    const ctx = [o.fijado && `<span>${SVG.pin}Fijado</span>`,
      o.repostDe && `<span>${SVG.rep}${esc(p.n || o.usuario)} ha reposteado a <a href="${men(o.repostDe.usuario)}" target="_blank" rel="noopener noreferrer">@${esc(o.repostDe.usuario)}</a></span>`,
      !o.repostDe && o.tipo === "retuit" && `<span>${SVG.rep}Repost</span>`,
      o.respuestaA && `<span>${SVG.resp}En respuesta a <a href="${men(o.respuestaA)}" target="_blank" rel="noopener noreferrer">@${esc(o.respuestaA)}</a></span>`].filter(Boolean).join("");
    const t = o.texto, largo = t.length > 280 || (t.match(/\n/g) || []).length > 4;
    const extras = [o.ubicacion && `<span>${SVG.lugar}${escM(o.ubicacion, re)}</span>`, o.musica && `<span>${SVG.musica}${escM(o.musica, re)}</span>`,
      o.colaboradores.length && `<span>Con ${o.colaboradores.map(c => `<a href="${men(c)}" target="_blank" rel="noopener noreferrer">@${esc(c)}</a>`).join(", ")}</span>`,
      o.editado && `<span>Editado</span>`].filter(Boolean).join("");
    const imgP = s => op.img === "propia" ? `<img data-propia="${esc(s)}" alt="">` : `<img loading="lazy" src="${esc(s)}" alt="" referrerpolicy="no-referrer">`;
    const cita = o.cita ? `<a class="rs-cita" href="${esc(o.cita.url || o.url)}" target="_blank" rel="noopener noreferrer"><span class="who"><b>${esc(o.cita.autor || "@" + o.cita.usuario)}</b>${o.cita.usuario ? ` @${esc(o.cita.usuario)}` : ""}${o.cita.fecha ? ` · ${esc(corta(o.cita.fecha).slice(0, 10))}` : ""}</span>`
      + (o.cita.texto ? `<span class="t">${escM(o.cita.texto, re)}</span>` : "") + (o.cita.imagen ? imgP(o.cita.imagen) : "") + `</a>` : "";
    const enl = o.enlace ? `<a class="rs-enlace" href="${esc(o.enlace.url)}" target="_blank" rel="noopener noreferrer">${o.enlace.imagen ? imgP(o.enlace.imagen) : ""}<span><small>${esc(o.enlace.dominio)}</small><b>${escM(o.enlace.titulo || o.enlace.url, re)}</b></span></a>` : "";
    const met = ["respuestas", "compartidos", "likes", "vistas", "guardados"].map(k => { const n = o.m[k];
      return n == null || n < 0 ? "" : `<span class="k" title="${exacto(n)} ${N[k].toLowerCase()}">${ICO_M[k]}<b>${num(n)}</b><i>${N[k]}</i></span>`; }).join("");
    const txt = t ? `<div class="rs-txt${largo ? " corto" : ""}">${texto(t, o.red, re)}</div>${largo ? `<button class="rs-mas" data-rs="mas">Ver más</button>` : ""}` : "";
    const arriba = o.red === "x" || o.red === "fb"; // en X y Facebook el texto va encima de las fotos; en Instagram y TikTok, debajo
    const av = op.avatar ? op.avatar(o) : o.avatar ? imgP(o.avatar) : `<span>${esc(iniciales(nombre))}</span>`;
    return `<article class="rs-post${op.nuevo ? " nuevo" : ""}" data-r="${o.red}" data-k="${esc(o.k)}">`
      + (ctx ? `<div class="rs-ctx">${ctx}</div>` : "")
      + `<header><a class="av" href="${perfil}" target="_blank" rel="noopener noreferrer">${av}</a>`
      + `<div class="who"><a class="nom" href="${perfil}" target="_blank" rel="noopener noreferrer">${escM(nombre, re)}</a>${o.verificado ? `<span class="verif">${SVG.verif}</span>` : ""}${op.nuevo ? `<span class="rs-nuevo">Nuevo</span>` : ""}`
      + `<small>${ico(o.red)}<span>@${escM(o.usuario, re)}${p.g ? " · " + esc(p.g) : ""}</span></small></div>`
      + (tipo ? `<span class="rs-tipo">${esc(tipo)}</span>` : "")
      + `<a class="abre" href="${url}" target="_blank" rel="noopener noreferrer" title="Abrir en ${R.n}" aria-label="Abrir en ${R.n}">${SVG.abre}</a></header>`
      + (arriba ? txt : "") + media(o, op) + cita + enl + (arriba ? "" : txt)
      + (extras ? `<div class="rs-extra">${extras}</div>` : "")
      + (met ? `<div class="rs-met">${met}</div>` : "")
      + `<footer><time datetime="${esc(o.fecha)}" title="${esc(corta(o.fecha))} (hora peninsular)">${esc(larga(o.fecha))}, ${esc(hora(o.fecha))}${hace(o.fecha) ? " · " + esc(hace(o.fecha)) : ""}</time>`
      + `<span class="rs-acc">${op.acciones || ""}<button data-rs="enlace" title="Copiar el enlace de la ${N.pub}" aria-label="Copiar enlace">${SVG.enlace}</button><button data-rs="ficha" title="Copiar la ficha completa (red, perfil, fecha y hora, enlace, texto y cifras) para un informe" aria-label="Copiar ficha">${SVG.ficha}</button></span></footer></article>`;
  }

  /* ---------- Ficha para informes ---------- */
  function ficha(o, op) {
    op = op || {}; const N = RED[o.red].nom, L = [], nfotos = o.imagenes.length, p = o.p || {};
    L.push(`Red: ${RED[o.red].n}`);
    L.push(`Perfil: ${nombreDe(o)} (@${o.usuario})${p.g ? " · " + p.g : ""}${o.verificado ? " · verificado" : ""}`);
    if (op.fichaAtalaya) L.push(`Ficha en Atalaya: ${op.fichaAtalaya}`);
    L.push(`Fecha de publicación: ${corta(o.fecha)} (hora peninsular)`);
    const tp = TIPO[o.tipo] || (o.esVideo ? "Vídeo" : nfotos > 1 ? "Carrusel" : "Publicación");
    L.push(`Tipo: ${tp}${o.esVideo && o.duracion ? ` (${dur(o.duracion)})` : ""}${nfotos ? ` · ${plural(nfotos, "imagen", "imágenes")}` : ""}${o.fijado ? " · fijado" : ""}${o.editado ? " · editado" : ""}`);
    L.push(`Enlace: ${o.url}`);
    if (o.repostDe) L.push(`Repost de: @${o.repostDe.usuario}`);
    if (o.respuestaA) L.push(`En respuesta a: @${o.respuestaA}`);
    if (o.ubicacion) L.push(`Ubicación: ${o.ubicacion}`);
    if (o.musica) L.push(`Sonido: ${o.musica}`);
    if (o.colaboradores.length) L.push(`Con: ${o.colaboradores.map(c => "@" + c).join(", ")}`);
    L.push(`Texto:\n${o.texto || "(sin texto)"}`);
    if (o.cita) L.push(`Cita a ${o.cita.autor || ""} (@${o.cita.usuario}): ${o.cita.texto || ""}${o.cita.url ? "\n" + o.cita.url : ""}`);
    if (o.enlace) L.push(`Enlace compartido: ${o.enlace.titulo || ""}\n${o.enlace.url}`);
    const cif = ["likes", "respuestas", "compartidos", "vistas", "guardados"].filter(k => o.m[k] != null && o.m[k] >= 0).map(k => `${N[k]}: ${exacto(o.m[k])}`);
    if (cif.length) L.push(`Cifras (a ${corta(op.leido || Date.now())}): ${cif.join(" · ")}`);
    L.push(`Consultado: ${corta(Date.now())} · ${op.origen || "Prensa Segovia"}`);
    return L.join("\n");
  }
  const copia = (t, avisa) => { avisa = avisa || (() => {}); const plan = () => { const a = document.createElement("textarea"); a.value = t; a.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(a); a.select();
      try { avisa(document.execCommand("copy")); } catch (e) { avisa(false); } a.remove(); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(() => avisa(true), plan); else plan(); };

  // Botones de la propia tarjeta (carrusel y «Ver más»): funcionan igual en las dos webs
  if (typeof document !== "undefined") {
    document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-rs]"); if (!b) return;
      if (b.dataset.rs === "car"){ const c = b.parentElement.querySelector(".rs-car"); if (c) c.scrollBy({ left: c.clientWidth * (+b.dataset.v || 1), behavior: "smooth" }); }
      else if (b.dataset.rs === "mas"){ const c = b.previousElementSibling; if (c) c.classList.remove("corto"); b.remove(); } });
    document.addEventListener("scroll", e => { const c = e.target; if (!(c instanceof Element) || !c.classList.contains("rs-car")) return;
      const i = Math.round(c.scrollLeft / (c.clientWidth || 1)), m = c.parentElement, cnt = m.querySelector(".rs-cnt"), pts = m.nextElementSibling;
      if (cnt) cnt.textContent = `${i + 1}/${c.children.length}`;
      if (pts && pts.classList.contains("rs-puntos")) [...pts.children].forEach((d, j) => d.classList.toggle("on", j === i)); }, true);
  }

  const RS = { RED, TIPO, SVG, esc, usr, clave, urlPerfil, plural, num, exacto, iniciales, icono, hora, corta, larga, diaClave, dia, hace, dur,
    sinTilde, qRe, escM, casa, texto, rsNorm, nombreDe, tarjeta, ficha, copia };
  raiz.RedesTarjeta = RS;
  if (typeof module !== "undefined" && module.exports) module.exports = RS;
})(typeof window !== "undefined" ? window : globalThis);
