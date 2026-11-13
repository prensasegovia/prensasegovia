// Diagnóstico (17ª ronda): cuentas de Segovia en Bluesky (API pública)
import { writeFileSync } from "node:fs";
const out = {};
for (const q of ["segovia", "segoviano", "cuéllar", "cuellar", "el espinar", "la granja segovia", "cantalejo", "riaza", "sepúlveda", "pp segovia", "psoe segovia", "vox segovia", "iu segovia", "ccoo segovia", "ugt segovia", "asaja", "uccl", "plataforma segovia", "ayuntamiento segovia", "diputación segovia", "concejal segovia", "alcalde segovia", "procurador segovia"]) {
  try { const r = await fetch("https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?limit=40&q=" + encodeURIComponent(q)); const j = await r.json();
    for (const a of j.actors || []) out[a.handle] = { nombre: a.displayName, desc: (a.description || "").replace(/\s+/g, " ").slice(0, 160), q };
  } catch (e) { out["ERR " + q] = String(e.message); }
}
// seguidores y posts para filtrar inactivas
for (const h of Object.keys(out).filter(h => !h.startsWith("ERR"))) {
  try { const p = await (await fetch("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=" + h)).json(); out[h].seguidores = p.followersCount; out[h].posts = p.postsCount;
    const f = await (await fetch("https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?limit=1&actor=" + h)).json(); out[h].ultimo = f.feed?.[0]?.post?.indexedAt?.slice(0, 10); } catch (e) {}
}
writeFileSync("diag/bluesky.json", JSON.stringify(out, null, 1));
