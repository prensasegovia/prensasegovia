// Servidor de la sección Usuarios: página + API + comprobación automática de las sesiones de X.
// Arranque: cd usuarios && npm start  →  http://127.0.0.1:4321
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import { HOST, PUERTO, LOCAL, CLAVE_PAGINA, MINUTOS_COMPROBACION } from "./config.mjs";
import * as x from "./x.mjs";

if (!LOCAL && !CLAVE_PAGINA) {
  console.error("Usuarios: la página se abriría fuera de este ordenador (HOST=" + HOST + ") sin contraseña. Pon USUARIOS_CLAVE en usuarios/.env.");
  process.exit(1);
}

const PAGINA = new URL("./pagina.html", import.meta.url);
const json = (res, codigo, datos) => { res.writeHead(codigo, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(datos)); };
const fallo = (res, e) => json(res, e?.tipo === "limitada" ? 429 : e?.tipo ? 400 : 500, { error: e?.message || "Error" , tipo: e?.tipo || "interno", hasta: e?.hasta });

function autorizado(req) {
  if (!CLAVE_PAGINA) return true;
  const m = /^Basic (.+)$/.exec(req.headers.authorization || "");
  const dada = Buffer.from(m ? Buffer.from(m[1], "base64").toString().replace(/^[^:]*:/, "") : "");
  const buena = Buffer.from(CLAVE_PAGINA);
  return dada.length === buena.length && timingSafeEqual(dada, buena);
}

async function cuerpo(req) {
  let t = "";
  for await (const trozo of req) { t += trozo; if (t.length > 10_000) throw Object.assign(new Error("Demasiado grande"), { tipo: "x" }); }
  try { return JSON.parse(t || "{}"); } catch { return {}; }
}

// Lo que pinta la página (nunca lleva cookies: solo los últimos 4 caracteres)
const estado = () => {
  const cuentas = x.cuentas();
  return { cuentas, pantalla: x.hayPantalla, conexion: x.estadoConexion(), caducadas: cuentas.filter(c => c.estado === "caducada").map(c => ({ id: c.id, usuario: c.usuario })), cadaMinutos: MINUTOS_COMPROBACION };
};

const servidor = createServer(async (req, res) => {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
  if (!autorizado(req)) { res.writeHead(401, { "www-authenticate": 'Basic realm="Usuarios"' }); return res.end("Hace falta la contraseña"); }
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store",
        "content-security-policy": "default-src 'self'; img-src 'self' https://pbs.twimg.com https://abs.twimg.com data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'" });
      return res.end(await readFile(PAGINA));
    }
    if (!url.pathname.startsWith("/api/")) { res.writeHead(404); return res.end(); }
    // Otras webs abiertas en el navegador no pueden usar esta API: la página manda siempre esta cabecera
    if (req.headers["x-usuarios"] !== "1") return json(res, 403, { error: "Petición no permitida" });

    if (req.method === "GET" && url.pathname === "/api/estado") return json(res, 200, estado());
    if (req.method === "POST" && url.pathname === "/api/conectar") return json(res, 202, x.conectarConNavegador());
    if (req.method === "POST" && url.pathname === "/api/cookies") {
      const b = await cuerpo(req);
      const c = await x.conectarConCookies(b.auth_token, b.ct0);
      return json(res, 200, { cuenta: c });
    }
    if (req.method === "GET" && url.pathname === "/api/prueba") return json(res, 200, await x.ultimosTuits(url.searchParams.get("usuario"), 5, { esperar: false }));

    const m = /^\/api\/cuentas\/(\d+)(?:\/(comprobar|lectura))?$/.exec(url.pathname);
    if (m) {
      const id = Number(m[1]);
      if (req.method === "POST" && m[2] === "comprobar") return json(res, 200, { cuenta: await x.comprobar(id) });
      if (req.method === "POST" && m[2] === "lectura") return json(res, x.usarParaLeer(id) ? 200 : 404, estado());
      if (req.method === "DELETE" && !m[2]) return json(res, x.quitar(id) ? 200 : 404, estado());
    }
    json(res, 404, { error: "No existe" });
  } catch (e) {
    if (!e?.tipo) console.error("Usuarios:", String(e?.message || e).split("\n")[0]);
    fallo(res, e);
  }
});

servidor.listen(PUERTO, HOST, () => {
  console.log(`Usuarios: abre http://${HOST.includes(":") ? `[${HOST}]` : HOST}:${PUERTO}  (${x.hayPantalla ? "con ventana para conectar" : "sin pantalla: se conecta pegando las cookies"})`);
});

// Comprobación automática de todas las sesiones
let comprobando = false;
async function ronda() {
  if (comprobando) return; comprobando = true;
  try { await x.comprobarTodas(); } catch (e) { console.error("Usuarios: fallo comprobando:", e.message); } finally { comprobando = false; }
}
setTimeout(ronda, 10e3);
setInterval(ronda, MINUTOS_COMPROBACION * 60e3);

for (const s of ["SIGINT", "SIGTERM"]) process.on(s, async () => { await x.cerrar(); process.exit(0); });
