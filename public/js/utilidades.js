/* ================= Utilidades ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
const safeUrl = u => /^https?:\/\//i.test(u||"") ? u : null;
// Fechas y horas siempre en hora de Madrid (la de los periódicos), aunque el móvil esté en otra zona horaria
const TZ = "Europe/Madrid";
let fmtDia; try { fmtDia = new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}); } catch(e){ fmtDia = null; }
const iso = d => { if (fmtDia) return fmtDia.format(new Date(d)); const x = new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,10); };
// "2026-10-31 22:05" (hora de Madrid) -> instante real
function madridMs(f, h, mi){
  const [y,mo,d] = f.split("-").map(Number), g = Date.UTC(y, mo-1, d, +h, +mi);
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:TZ,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).formatToParts(new Date(g)).map(x=>[x.type,x.value]));
    return g - (Date.UTC(+p.year, +p.month-1, +p.day, +p.hour, +p.minute) - g);
  } catch(e){ return new Date(`${f}T${h}:${mi}:00`).getTime(); }
}
const today = () => iso(new Date());
const addDays = (s,n) => { const d = new Date(s+"T12:00:00"); d.setDate(d.getDate()+n); return iso(d); };
const D = s => new Date(s+"T12:00:00");
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
const fmtLong = s => cap(D(s).toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}));
const fmtDayName = s => { const t=today(); if(s===t) return "Hoy"; if(s===addDays(t,-1)) return "Ayer"; if(s===addDays(t,1)) return "Mañana"; return fmtLong(s); };
const fmtCorto = s => { const t=today(); if(s===t) return "Hoy"; if(s===addDays(t,-1)) return "Ayer"; if(s===addDays(t,1)) return "Mañana"; return cap(D(s).toLocaleDateString("es-ES",{weekday:"short",day:"numeric",month:"short"}).replace(/\./g,"")); };
const cuando = (dia, hora) => `${fmtCorto(dia)}${hora?", "+hora:""}`;
const plural = (n, s, p) => `${n} ${n===1?s:p}`;
const store = {
  get(k,d){ try{ const v = localStorage.getItem("psg:"+k); return v==null?d:JSON.parse(v);}catch(e){return d;} },
  set(k,v){ try{ localStorage.setItem("psg:"+k, JSON.stringify(v)); }catch(e){} }
};
const esPueblo = m => !!m && !["segovia","provincia","general"].includes(norm(m));
const isCapital = n => norm(n.municipio)==="segovia";

