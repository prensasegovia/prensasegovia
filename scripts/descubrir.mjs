// Diagnóstico (8ª ronda): ¿podemos usar los modelos de IA de GitHub gratis desde Actions?
import { writeFileSync } from "node:fs";
const T = process.env.GITHUB_TOKEN;
const out = {};
const prueba = [
  "Detenido un joven en Cuéllar por agredir a dos personas en las fiestas",
  "El Nava se enreda en el último asalto",
  "La planta de biometano enfrenta posturas y aviva la polémica en Cantalejo",
  "Los jefes de dotación del servicio de bomberos perfeccionan sus técnicas",
];
const prompt = `Eres analista de la unidad de Información de la Guardia Civil en la provincia de Segovia. Para cada titular, responde SOLO un JSON array con objetos {"i":n,"interesa":true|false,"tema":"policial|movilizaciones|politica|medioambiente|emergencias|autoridades|eventos|ninguno","grave":true|false}. Interesa: sucesos, movilizaciones y conflictos sociales, extremismos, política y visitas de cargos, medio ambiente con conflicto, emergencias reales, grandes eventos. No interesa: deporte, cultura, trámites.\n` + prueba.map((t, i) => `${i}. ${t}`).join("\n");
for (const [k, url] of Object.entries({ usuario: "https://models.github.ai/inference/chat/completions", org: "https://models.github.ai/orgs/prensasegovia/inference/chat/completions" })) {
  for (const model of ["openai/gpt-4.1-mini", "openai/gpt-4o-mini"]) {
    try {
      const t0 = Date.now();
      const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json", Accept: "application/vnd.github+json" }, body: JSON.stringify({ model, temperature: 0, messages: [{ role: "user", content: prompt }] }), signal: AbortSignal.timeout(60000) });
      const txt = await r.text();
      out[`${k} ${model}`] = { status: r.status, ms: Date.now() - t0, limites: Object.fromEntries([...r.headers].filter(([h]) => /ratelimit|retry/i.test(h))), respuesta: txt.slice(0, 1500) };
    } catch (e) { out[`${k} ${model}`] = { err: String(e.message) }; }
  }
}
writeFileSync("diag/ia.json", JSON.stringify(out, null, 1));
