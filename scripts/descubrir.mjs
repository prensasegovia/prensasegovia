// Diagnóstico (10ª ronda): ¿hay versión gratuita en Google Noticias de las noticias de pago?
import { writeFileSync } from "node:fs";
const T = ["La planta de biometano enfrenta posturas y aviva la polémica en Cantalejo", "Una recogida de firmas 'online' exige recuperar paradas suprimidas de autobús en Segovia", "Nueva jornada de caos e incertidumbre en los trenes de Segovia tras la huelga de maquinistas", "PSOE y Frente Amplio registran candidatura conjunta al Senado por Segovia", "Caos, nervios y retrasos en la estación de Segovia por la huelga y la tragedia ferroviaria", "La capacidad de hospitalizaciones sigue invariable seis años después del colapso de la covid", "Diez partidos buscarán su escaño por Segovia en el Congreso en las elecciones del 29N", "Alrededor de 2.600 profesores de Segovia están llamados a parar el 4 de noviembre", "Grupos de tractores cruzan Segovia camino de la manifestación de Madrid"];
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
const out = {};
for (const t of T) {
  const pal = t.replace(/["'«»“”‘’:,.¿?¡!()]/g, " ").split(/\s+/).filter(w => w.length > 3).slice(0, 7);
  out[t] = {};
  for (const [k, q] of Object.entries({ siete: pal.join(" "), cinco: pal.slice(0, 5).join(" ") + " Segovia", exacta: '"' + t.split(/\s+/).slice(0, 6).join(" ") + '"' })) {
    for (const w of ["when:7d", ""]) {
      const u = `https://news.google.com/rss/search?q=${encodeURIComponent(q + (w ? " " + w : ""))}&hl=es&gl=ES&ceid=ES:es`;
      try { const x = await (await fetch(u, { headers: UA })).text();
        out[t][k + " " + (w || "sin")] = [...x.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<source[^>]*>([\s\S]*?)<\/source>/g)].slice(0, 8).map(m => m[2] + " | " + m[1].slice(0, 110));
      } catch (e) { out[t][k] = String(e.message); }
      await new Promise(r => setTimeout(r, 800));
    }
  }
}
writeFileSync("diag/gratis.json", JSON.stringify(out, null, 1));
