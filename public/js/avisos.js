/* ================= Avisos ================= */
// Abre Filtros y ajustes en el apartado de avisos; si se pide, activa directamente (el toque del usuario permite pedir el permiso)
function abreAvisos(activar){
  openSheet();
  const row = $("#rowAvisos"); row.classList.add("resalta"); setTimeout(()=>row.classList.remove("resalta"), 2200);
  setTimeout(()=>row.scrollIntoView({block:"center", behavior:"smooth"}), 150);
  if (activar && !$("#fPush").checked){ $("#fPush").checked = true; $("#fPush").dispatchEvent(new Event("change")); }
}
const avisosListos = () => !!(pushConf && pushConf.url && pushConf.publica);
const tarjetaAvisos = () => push.on || !avisosListos() || store.get("avisosNo", false) || !("serviceWorker" in navigator) ? "" :
  `<div class="avcard"><span class="avic">${I.bell}</span><span class="avt"><b>Avisos en el móvil</b>Te llega un aviso con lo nuevo aunque tengas la app cerrada.</span>
   <span class="avb"><button class="btn" data-act="avisosSi" type="button">Activar</button><button class="linkbtn" data-act="avisosNo" type="button">Ahora no</button></span></div>`;
/* Avisos al móvil (Web Push): se apunta este móvil en el Apps Script y GitHub envía los avisos tras cada actualización */
const push = Object.assign({ on:false, nivel:"todas", capital:true, periodicos:false }, store.get("push", {}));
let pushConf = null;
const b64aU8 = b => { const p = "=".repeat((4 - b.length % 4) % 4); const r = atob((b + p).replace(/-/g,"+").replace(/_/g,"/")); return Uint8Array.from(r, c=>c.charCodeAt(0)); };
const esIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
const esAndroid = () => /Android/i.test(navigator.userAgent);
// Navegadores metidos dentro de otras apps (WhatsApp, Instagram, Facebook, Telegram, Gmail...): no admiten avisos
const enOtraApp = () => /FBAN|FBAV|Instagram|Line\/|WhatsApp|Telegram|GSA\/|; wv\)/i.test(navigator.userAgent);
const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function pintaPush(msg, mal){
  $("#fPush").checked = push.on; $("#pushOpc").hidden = !push.on; $("#pushOk").hidden = !push.on; $(".avbox").classList.toggle("on", push.on);
  document.querySelectorAll("#segPushNivel button").forEach(x=>x.setAttribute("aria-pressed", x.dataset.v===push.nivel));
  $("#fPushCapTxt").textContent = st.sinCapital ? "Sin Segovia capital: como tienes puesto en la app." : "Con Segovia capital: como tienes puesto en la app."; pintaPushPer();
  const e = $("#pushEstado"); e.classList.toggle("mal", !!mal);
  e.textContent = msg ?? (esIOS() && !instalada() ? "En iPhone, primero añade la app a la pantalla de inicio (botón Compartir → «Añadir a pantalla de inicio») y ábrela desde allí." : "");
}
async function confPush(){ if (pushConf) return pushConf; try { pushConf = await (await fetch("avisos.json?t="+Date.now(), {cache:"no-store"})).json(); } catch(e){ pushConf = {}; } return pushConf; }
async function enviaAlta(sub){
  const c = await confPush(); if (!c.url) return false;
  try { await fetch(c.url, { method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ accion:"alta", sub: sub.toJSON(), prefs:{ nivel:push.nivel, capital:push.capital, periodicos: Array.isArray(push.periodicos) && push.periodicos.length ? push.periodicos : false } }) }); return true; } catch(e){ return false; }
}
const mismaClave = (sub, pub) => { try { const k = sub.options && sub.options.applicationServerKey; if (!k) return true;
  const a = new Uint8Array(k), b = b64aU8(pub); return a.length === b.length && a.every((x,i)=>x===b[i]); } catch(e){ return true; } };
async function activaPush(){
  const c = await confPush();
  if (!c.url || !c.publica){ pintaPush("Los avisos todavía no están en marcha: falta un último paso de configuración. En cuanto esté, podrás activarlos aquí.", true); return false; }
  if (esIOS() && !instalada()){ pintaPush(undefined, true); return false; }
  if (enOtraApp() || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)){
    pintaPush(esAndroid() ? "Estás dentro de otra app (WhatsApp, Instagram…) o en un navegador que no admite avisos. Abre la web en Chrome: menú ⋮ → «Abrir en Chrome» (o copia el enlace en Chrome) y actívalos allí."
      : esIOS() ? "Este navegador no admite avisos. En iPhone hace falta iOS 16.4 o posterior y abrir la app desde la pantalla de inicio (no desde WhatsApp)."
      : "Este navegador no admite avisos. Prueba con Chrome, Edge o Safari.", true); return false; }
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted"){ pintaPush(esAndroid() ? "Los avisos están bloqueados para esta web. En Chrome: toca el candado (o ⋮ → Información del sitio) → Permisos → Notificaciones → Permitir. Si la tienes instalada: mantén pulsado el icono → Información de la app → Notificaciones."
      : "Has bloqueado los avisos. Actívalos en los ajustes de notificaciones del móvil para esta app.", true); return false; }
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    // Si el móvil guardaba una suscripción hecha con otra clave, Google rechazaría los avisos: se renueva
    if (sub && !mismaClave(sub, c.publica)){ try { await sub.unsubscribe(); } catch(e){} sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: b64aU8(c.publica) });
    if (!(await enviaAlta(sub))) throw new Error("sin conexión");
    return true;
  } catch(e){
    const m = String(e && (e.name + " " + e.message) || e);
    pintaPush(/AbortError|push service|registration failed/i.test(m)
      ? "El móvil no ha podido conectar con el servicio de avisos de Google. Comprueba que Chrome está actualizado y que tienes los Servicios de Google Play; si usas ahorro de batería o datos, desactívalo un momento y vuelve a probar."
      : "No se han podido activar: " + (e.message || e), true);
    console.warn("push", e); return false; }
}
async function guardaPush(){ store.set("push", push); if (!push.on) return; const reg = await navigator.serviceWorker?.ready; const sub = await reg?.pushManager?.getSubscription(); if (sub) enviaAlta(sub); }
$("#fPush").addEventListener("change", async e=>{
  if (e.target.checked){ pintaPush("Activando…"); push.on = await activaPush(); store.set("push", push); pintaPush(push.on ? "Te llegará un aviso de prueba en la próxima actualización." : $("#pushEstado").textContent, !push.on); appbar(); }
  else {
    push.on = false; store.set("push", push); pintaPush("Desactivados en este móvil."); appbar();
    try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); const c = await confPush();
      if (sub){ if (c.url) fetch(c.url, { method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ accion:"baja", endpoint: sub.endpoint }) }); await sub.unsubscribe(); } } catch(e){}
  }
});
$("#segPushNivel").addEventListener("click", e=>{ const b=e.target.closest("button"); if(!b) return; push.nivel=b.dataset.v; pintaPush(); guardaPush(); });
// Los avisos usan el mismo «Con capital / Sin capital» que la app
function sincronizaCapPush(){ const cap = !st.sinCapital; if (push.capital !== cap){ push.capital = cap; guardaPush(); } if ($("#fPushCapTxt")) pintaPush(); }
sincronizaCapPush();
// Periódicos con aviso: cada uno marca los que quiere (ninguno, uno o varios)
function pintaPushPer(){
  const todos = perTodos(); if (!todos.length) return;
  if (push.periodicos === true) push.periodicos = todos.slice(); // antes era todo o nada
  if (!Array.isArray(push.periodicos)) push.periodicos = [];
  const sel = push.periodicos.filter(m=>todos.includes(m));
  $("#pushPerLista").innerHTML = todos.map(m=>`<button type="button" class="chip" data-m="${esc(m)}" aria-pressed="${sel.includes(m)}">${esc(m)}</button>`).join("");
  $("#pushPerRes").textContent = !sel.length ? "Ninguno marcado: solo te avisa de lo de interés (Noticias). Marca los periódicos de los que quieras aviso de todo lo que publiquen."
    : sel.length===1 ? `Te avisa de todo lo que publique ${sel[0]}.` : `Te avisa de todo lo que publiquen estos ${sel.length} periódicos.`;
}
$("#pushPerLista").addEventListener("click", e=>{ const b=e.target.closest("[data-m]"); if(!b) return;
  const m=b.dataset.m, l=Array.isArray(push.periodicos)?push.periodicos:[]; push.periodicos = l.includes(m) ? l.filter(x=>x!==m) : [...l, m];
  pintaPushPer(); guardaPush(); });
// Si el móvil renovó la suscripción por su cuenta, se vuelve a apuntar
(async ()=>{ if (!push.on || !("serviceWorker" in navigator)) return; try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); const c = await confPush(); if (sub && c.publica && !mismaClave(sub, c.publica) && Notification.permission==="granted"){ await activaPush(); return; } if (sub) enviaAlta(sub); else { push.on=false; store.set("push", push); } } catch(e){} })();
// Los avisos antiguos (solo con la app abierta) se sustituyen por estos
st.avisos = false;
function noticiasDe(j){
  const bak=[st.dias, cacheNews];
  st.dias=(j.dias||[]).filter(d=>d && d.fecha); cacheNews=null;
  const r=allNews(); st.dias=bak[0]; cacheNews=bak[1]; return r;
}
async function avisar(list){
  if (!st.avisos || !("Notification" in window) || Notification.permission!=="granted") return;
  const prev = store.get("avisadas", null);
  if (!prev){ store.set("avisadas", list.map(n=>n._key).slice(-1500)); return; }
  const ya = new Set(prev), desde = addDays(today(),-1), t = today();
  const nuevas = list.filter(n=>!ya.has(n._key) && n._dia>=desde && !(st.sinCapital && isCapital(n)) &&
    (n.relevancia==="alta" || (n.fecha_evento && n.fecha_evento>=t) || kwHits(n)));
  store.set("avisadas", [...prev, ...list.map(n=>n._key).filter(k=>!ya.has(k))].slice(-1500));
  if (!nuevas.length) return;
  const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration().catch(()=>null) : null;
  const muestra = (titulo, body, url, tag) => {
    const o = { body, icon:"iconoa-192.png", badge:"iconoa-96.png", tag, data:{url} };
    try { if (reg) reg.showNotification(titulo, o); else { const x=new Notification(titulo, o); x.onclick=()=>{ window.focus(); if(url) window.open(url,"_blank","noopener"); }; } } catch(e){}
  };
  const tipo = n => n.relevancia==="alta" ? "Importante" : (n.fecha_evento && n.fecha_evento>=t) ? `Agenda ${fmtCorto(n.fecha_evento)}` : "Palabra vigilada";
  if (nuevas.length > 3){
    muestra(`Prensa Segovia: ${nuevas.length} avisos nuevos`, nuevas.slice(0,4).map(n=>"• "+n.titulo).join("\n"), location.href.split("#")[0], "psg-resumen");
  } else for (const n of nuevas) muestra(`${tipo(n)} · ${n.municipio && n.municipio!=="General" ? n.municipio : "Provincia"}`, n.titulo, (mediosDe(n)[0]||{}).url || location.href, "psg-"+n._key);
}
$("#fKw").addEventListener("change", e=>{ st.soloKw=e.target.checked; saveF(); render(true); });
function addKw(){ const v=$("#kwIn").value.trim(); if(v && !st.kws.some(k=>norm(k)===norm(v))){ st.kws.push(v); saveF(); render(true); } $("#kwIn").value=""; syncSheet(); }
$("#kwAdd").addEventListener("click", addKw);
$("#kwIn").addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); addKw(); } });
$("#kws").addEventListener("click", e=>{ const b=e.target.closest("[data-i]"); if(!b) return; st.kws.splice(+b.dataset.i,1); saveF(); render(true); syncSheet(); });
$("#toastBtn").addEventListener("click", ()=>{ if (st.pending) applyData(st.pending); st.pending=null; $("#toast").classList.remove("show"); window.scrollTo({top:0,behavior:"smooth"}); });

