// Recolector de X para la zona Redes (lo lanza GitHub Actions cuando alguien abre Redes → X).
// 1. Pide al Apps Script la lista de perfiles de X que quiere ver la web.
// 2. Lee los últimos tuits de cada uno con la sesión de los secretos X_AUTH_TOKEN / X_CT0 (vía x.mjs).
// 3. Devuelve el resultado al Apps Script, que lo guarda en privado.
// El repositorio es público y sus registros también: aquí solo se escriben recuentos, nunca qué cuentas se siguen.
import { readFile } from "node:fs/promises";

const POR_PERFIL = 6;
const conf = JSON.parse(await readFile(new URL("../public/avisos.json", import.meta.url), "utf8"));
const token = String(process.env.AVISOS || "").split("|")[1]?.trim();
if (!conf.url || !token) { console.log("Redes X: falta la dirección del Apps Script o el secreto AVISOS."); process.exit(1); }
if (!process.env.X_AUTH_TOKEN || !process.env.X_CT0) { console.log("Redes X: faltan los secretos X_AUTH_TOKEN y X_CT0."); process.exit(1); }

const manda = cuerpo => fetch(conf.url, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ accion: "redesXGuardar", token, ...cuerpo }), redirect: "follow" })
  .then(r => r.json()).catch(e => ({ error: e.message }));

let usuarios = [];
try {
  const j = await (await fetch(`${conf.url}?accion=redesXLista&token=${encodeURIComponent(token)}`, { redirect: "follow" })).json();
  usuarios = Array.isArray(j.usuarios) ? j.usuarios : [];
} catch (e) { console.log("Redes X: no se pudo leer la lista del Apps Script:", e.message); process.exit(1); }
if (!usuarios.length) { console.log("Redes X: la lista está vacía, nada que leer."); process.exit(0); }

const x = await import("./x.mjs");
const corta = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;
const datos = {};
let estado = "ok", detalle = "", leidos = 0;
for (const u of usuarios) {
  try {
    const r = await x.ultimosTuits(u, POR_PERFIL, { esperar: true });
    datos[u.toLowerCase()] = { hora: Date.now(), tuits: r.tuits.map(t => ({ id: t.id, fecha: t.fecha, texto: corta(t.texto, 400), url: t.url, rt: t.retuit || undefined, fotos: t.fotos?.length ? t.fotos.slice(0, 2) : undefined })) };
    leidos++;
  } catch (e) {
    if (["caducada", "sin-cuenta"].includes(e.tipo)) { estado = "caducada"; detalle = "X ya no acepta la sesión de lectura: hay que renovar los secretos X_AUTH_TOKEN y X_CT0."; break; }
    if (e.tipo === "limitada") { estado = "limitada"; detalle = e.message.replace(/@\w+/, "la cuenta de lectura"); break; }
    datos[u.toLowerCase()] = { hora: Date.now(), error: corta(String(e.message), 160) };
  }
}
await x.cerrar();
const r = await manda({ datos, estado, detalle });
console.log(`Redes X: ${leidos} de ${usuarios.length} perfiles leídos · estado ${estado} · guardado ${r?.ok ? "sí" : "no (" + (r?.error || "?") + ")"}`);
if (!r?.ok) process.exitCode = 1;
