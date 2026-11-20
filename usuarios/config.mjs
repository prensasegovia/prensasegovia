// Ajustes de la sección Usuarios. Todo sale de usuarios/.env (que no se sube a GitHub).
// La primera vez, si no hay clave de cifrado, se crea una al azar y se guarda en .env.
import { existsSync, appendFileSync, chmodSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const aqui = p => fileURLToPath(new URL(p, import.meta.url));
const ENV = aqui(".env");

// En GitHub Actions la sesión llega por secretos (X_AUTH_TOKEN y X_CT0): todo va en memoria y no se escribe nada en disco
export const MODO_ENTORNO = Boolean(process.env.X_AUTH_TOKEN && process.env.X_CT0);
if (MODO_ENTORNO) process.env.X_CLAVE ||= randomBytes(32).toString("base64");
if (!MODO_ENTORNO && existsSync(ENV)) process.loadEnvFile(ENV);
if (!process.env.X_CLAVE) {
  const clave = randomBytes(32).toString("base64");
  const antes = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
  appendFileSync(ENV, `${antes && !antes.endsWith("\n") ? "\n" : ""}# Clave para cifrar las sesiones de X. Sin ella no se pueden leer las cuentas guardadas: haz copia.\nX_CLAVE=${clave}\n`, { mode: 0o600 });
  process.env.X_CLAVE = clave;
  console.log("Usuarios: creada una clave de cifrado nueva en usuarios/.env (haz copia de ese archivo).");
}
if (!MODO_ENTORNO) try { chmodSync(ENV, 0o600); } catch {}

export const CLAVE = Buffer.from(process.env.X_CLAVE, "base64");
if (CLAVE.length !== 32) throw new Error("X_CLAVE en usuarios/.env debe ser de 32 bytes en base64 (borra la línea y se crea otra).");

export const RUTA_DB = MODO_ENTORNO ? ":memory:" : process.env.USUARIOS_DB || aqui("usuarios.db");
export const HOST = process.env.HOST || "127.0.0.1";
export const PUERTO = Number(process.env.PUERTO) || 4321;
export const CLAVE_PAGINA = process.env.USUARIOS_CLAVE || "";        // obligatoria si la página se abre fuera de este ordenador
export const MINUTOS_COMPROBACION = Number(process.env.MINUTOS_COMPROBACION) || 30;
export const ESPERA_MAX_MIN = Number(process.env.ESPERA_MAX_MIN) || 20; // si X pide esperar más que esto, se avisa en vez de esperar
export const LOCAL = ["127.0.0.1", "localhost", "::1"].includes(HOST);

// ¿Se puede abrir una ventana de navegador delante de quien usa la página?
// Solo si la página es local y la máquina tiene pantalla. Se puede forzar con USUARIOS_PANTALLA=si|no.
export const HAY_PANTALLA = process.env.USUARIOS_PANTALLA
  ? /^(si|sí|1|true)$/i.test(process.env.USUARIOS_PANTALLA)
  : LOCAL && (process.platform !== "linux" || Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY));
