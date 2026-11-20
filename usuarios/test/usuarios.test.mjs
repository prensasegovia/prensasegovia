// Pruebas sin conexión: cifrado de la base de datos y lectura de respuestas de X.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "usuarios-test-"));
process.env.USUARIOS_DB = join(dir, "t.db");
process.env.X_CLAVE = Buffer.alloc(32, 7).toString("base64");
const almacen = await import("../almacen.mjs");
const x = await import("../x.mjs");

const AUTH = "a1b2c3d4e5f6a7b8c9d0a1b2c3d4e5f6a7b8wxyz", CT0 = "f".repeat(64);

test("las cookies se guardan cifradas y solo se enseñan los 4 últimos", () => {
  const c = almacen.guarda({ usuario: "prueba", nombre: "Prueba", foto: null, cookies: { auth_token: AUTH, ct0: CT0 } });
  assert.equal(c.ultimos4, "wxyz");
  assert.equal(c.lectura, true, "la primera cuenta es la de lectura");
  const bruto = readFileSync(process.env.USUARIOS_DB);
  assert.ok(!bruto.includes(AUTH) && !bruto.includes(CT0), "en el archivo de la base de datos no aparecen en claro");
  assert.ok(!JSON.stringify(almacen.lista()).includes(AUTH), "la lista pública no las lleva");
  assert.deepEqual(almacen.cookiesDe(c.id), { auth_token: AUTH, ct0: CT0 });
});

test("reconectar el mismo @ sustituye la sesión, no duplica", () => {
  almacen.actualiza(almacen.lista()[0].id, { estado: "caducada" });
  const c = almacen.guarda({ usuario: "PRUEBA", cookies: { auth_token: "z".repeat(36) + "1234", ct0: CT0 } });
  assert.equal(almacen.lista().length, 1);
  assert.equal(c.estado, "conectada");
  assert.equal(c.ultimos4, "1234");
});

test("con otra clave no se descifra (y no revienta)", async () => {
  const otra = Buffer.alloc(32, 9);
  const { CLAVE } = await import("../config.mjs");
  const copia = Buffer.from(CLAVE); otra.copy(CLAVE);
  assert.ok(almacen.cookiesDe(almacen.lista()[0].id).error);
  copia.copy(CLAVE);
});

test("marcar otra para leer y quitar la de lectura", () => {
  const b = almacen.guarda({ usuario: "otra", cookies: { auth_token: AUTH, ct0: CT0 } });
  assert.equal(b.lectura, false);
  almacen.usarParaLeer(b.id);
  assert.equal(almacen.lista()[0].usuario, "otra");
  almacen.quita(b.id);
  assert.equal(almacen.lista()[0].lectura, true, "si se quita la de lectura, pasa a otra");
});

test("tuitsDeRespuesta saca los tuits, sin el fijado y con los RT marcados", () => {
  const tw = (id, txt, fecha, extra = {}) => ({ tweet_results: { result: { __typename: "Tweet", rest_id: id,
    core: { user_results: { result: { core: { screen_name: "NASA" } } } }, legacy: { id_str: id, full_text: txt, created_at: fecha, ...extra } } } });
  const resp = { data: { user: { result: { timeline: { timeline: { instructions: [
    { type: "TimelinePinEntry", entry: { content: { itemContent: tw("1", "fijado", "Mon Jan 01 10:00:00 +0000 2024") } } },
    { type: "TimelineAddEntries", entries: [
      { content: { itemContent: tw("2", "hola", "Wed Nov 19 10:00:00 +0000 2026") } },
      { content: { itemContent: { tweet_results: { result: { __typename: "TweetWithVisibilityResults", tweet: tw("3", "oculto", "Thu Nov 20 09:00:00 +0000 2026").tweet_results.result } } } } },
      { content: { itemContent: tw("4", "RT @x: algo", "Thu Nov 20 08:00:00 +0000 2026", { retweeted_status_result: { result: { legacy: { full_text: "algo entero" } } } }) } },
    ] } ] } } } } } };
  const t = x.tuitsDeRespuesta(resp);
  assert.deepEqual(t.map(a => a.id).sort(), ["2", "3", "4"]);
  assert.equal(t.find(a => a.id === "4").texto, "RT: algo entero");
  assert.equal(t.find(a => a.id === "2").url, "https://x.com/NASA/status/2");
});

test("conectarConCookies rechaza valores que no son cookies sin llegar a X", async () => {
  await assert.rejects(x.conectarConCookies("mi contraseña", CT0), /auth_token/);
  await assert.rejects(x.conectarConCookies(AUTH, ""), /ct0/);
});
