// Prueba desde la terminal: lee los 5 últimos tuits de una cuenta pública con la cuenta de lectura.
//   cd usuarios && npm run prueba -- @NASA
import * as x from "./x.mjs";

const usuario = process.argv[2];
if (!usuario) { console.log("Uso: npm run prueba -- @cuenta"); process.exit(1); }
try {
  const r = await x.ultimosTuits(usuario, 5, { esperar: false });
  console.log(`Últimos ${r.tuits.length} tuits de @${r.usuario} (leídos con @${r.leidoCon}):\n`);
  for (const t of r.tuits) console.log(`· ${new Date(t.fecha).toLocaleString("es-ES")}  ${t.url}\n  ${t.texto.replace(/\n/g, "\n  ")}\n`);
} catch (e) {
  console.log(`No se pudo: ${e.message}`);
  process.exitCode = 1;
} finally { await x.cerrar(); }
