// Base de datos de cuentas (SQLite que trae Node). Las cookies van cifradas con AES-256-GCM
// usando X_CLAVE de usuarios/.env. Solo x.mjs llama a cookiesDe(): el resto de la herramienta no las ve.
import { DatabaseSync } from "node:sqlite";
import { chmodSync } from "node:fs";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { CLAVE, RUTA_DB, MODO_ENTORNO } from "./config.mjs";

const db = new DatabaseSync(RUTA_DB);
if (RUTA_DB !== ":memory:") try { chmodSync(RUTA_DB, 0o600); } catch {}   // solo la lee tu usuario del sistema
db.exec(`
  CREATE TABLE IF NOT EXISTS cuentas (
    id INTEGER PRIMARY KEY,
    usuario TEXT NOT NULL UNIQUE COLLATE NOCASE,  -- @ sin la arroba
    nombre TEXT, foto TEXT,
    secreto TEXT NOT NULL,                         -- cookies cifradas
    ultimos4 TEXT,                                 -- últimos 4 caracteres de auth_token (lo único que se enseña)
    estado TEXT NOT NULL DEFAULT 'conectada',      -- conectada | caducada | limitada
    detalle TEXT,
    comprobada TEXT,                               -- fecha ISO de la última comprobación
    limitada_hasta INTEGER,                        -- ms: X pidió esperar hasta entonces
    lectura INTEGER NOT NULL DEFAULT 0,            -- 1 = la que se usa para leer
    creada TEXT NOT NULL
  );`);

function cifra(obj) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", CLAVE, iv);
  const datos = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return "v1:" + Buffer.concat([iv, c.getAuthTag(), datos]).toString("base64");
}
function descifra(txt) {
  const b = Buffer.from(String(txt).replace(/^v1:/, ""), "base64");
  const d = createDecipheriv("aes-256-gcm", CLAVE, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"));
}

const PUBLICO = "id, usuario, nombre, foto, ultimos4, estado, detalle, comprobada, limitada_hasta, lectura, creada";
const limpia = f => f && { ...f, lectura: Boolean(f.lectura) };

export const lista = () => db.prepare(`SELECT ${PUBLICO} FROM cuentas ORDER BY lectura DESC, usuario`).all().map(limpia);
export const una = id => limpia(db.prepare(`SELECT ${PUBLICO} FROM cuentas WHERE id = ?`).get(id));

// Solo para x.mjs
export function cookiesDe(id) {
  const f = db.prepare("SELECT secreto FROM cuentas WHERE id = ?").get(id);
  if (!f) return null;
  try { return descifra(f.secreto); } catch { return { error: "No se puede descifrar (¿ha cambiado X_CLAVE en .env?)" }; }
}

// Alta o reconexión (si el @ ya existe, se le cambian las cookies)
export function guarda({ usuario, nombre, foto, cookies }) {
  const ya = db.prepare("SELECT id FROM cuentas WHERE usuario = ?").get(usuario);
  const ahora = new Date().toISOString(), u4 = cookies.auth_token.slice(-4);
  if (ya) {
    db.prepare(`UPDATE cuentas SET nombre = ?, foto = ?, secreto = ?, ultimos4 = ?, estado = 'conectada', detalle = NULL,
      comprobada = ?, limitada_hasta = NULL WHERE id = ?`).run(nombre ?? null, foto ?? null, cifra(cookies), u4, ahora, ya.id);
    return una(ya.id);
  }
  const primera = !db.prepare("SELECT 1 FROM cuentas WHERE lectura = 1").get();
  const r = db.prepare(`INSERT INTO cuentas (usuario, nombre, foto, secreto, ultimos4, comprobada, lectura, creada)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(usuario, nombre ?? null, foto ?? null, cifra(cookies), u4, ahora, primera ? 1 : 0, ahora);
  return una(Number(r.lastInsertRowid));
}

export function actualiza(id, cambios) {
  const campos = Object.keys(cambios).filter(k => ["nombre", "foto", "estado", "detalle", "comprobada", "limitada_hasta"].includes(k));
  if (!campos.length) return;
  db.prepare(`UPDATE cuentas SET ${campos.map(k => k + " = ?").join(", ")} WHERE id = ?`).run(...campos.map(k => cambios[k] ?? null), id);
}

export function usarParaLeer(id) {
  if (!una(id)) return false;
  db.exec("BEGIN");
  db.prepare("UPDATE cuentas SET lectura = 0").run();
  db.prepare("UPDATE cuentas SET lectura = 1 WHERE id = ?").run(id);
  db.exec("COMMIT");
  return true;
}

export function quita(id) {
  const era = una(id);
  db.prepare("DELETE FROM cuentas WHERE id = ?").run(id);
  if (era?.lectura) { const otra = db.prepare("SELECT id FROM cuentas ORDER BY estado = 'conectada' DESC, id LIMIT 1").get(); if (otra) usarParaLeer(otra.id); }
  return Boolean(era);
}

// GitHub Actions: la cuenta de lectura sale de los secretos
if (MODO_ENTORNO) guarda({ usuario: "lectura", cookies: { auth_token: process.env.X_AUTH_TOKEN.trim(), ct0: process.env.X_CT0.trim() } });
