// Límites de los municipios de Segovia para el mapa de Pueblos → public/mapa/municipios.json
// Origen: la misma geometría que usa Atalaya (segovia.json, límites municipales del IGN), aligerada:
// contorno simplificado (unos 60 m), coordenadas a 4 decimales y sin puntos repetidos.
// Uso: node scripts/mapa-municipios.mjs /ruta/a/segovia.json
import { readFileSync, writeFileSync } from "node:fs";
const origen = process.argv[2] || new URL("../../mapa-objetivos-segovia/segovia.json", import.meta.url);
const g = JSON.parse(readFileSync(origen, "utf8"));
const r = x => Math.round(x * 1e4) / 1e4;
// Simplificación (Douglas-Peucker) con tolerancia de unos 60 m: el contorno se ve igual y pesa mucho menos
const TOL = 0.0006;
function dp(pts) {
  if (pts.length < 5) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  let max = 0, k = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i], dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    if (d > max) { max = d; k = i; }
  }
  return max > TOL ? [...dp(pts.slice(0, k + 1)).slice(0, -1), ...dp(pts.slice(k))] : [pts[0], pts[pts.length - 1]];
}
const anillo = a => { const v = dp(a); return (v.length >= 4 ? v : a).map(([x, y]) => [r(x), r(y)]).filter((p, i, w) => !i || p[0] !== w[i - 1][0] || p[1] !== w[i - 1][1]); };
const geom = gm => gm.type === "Polygon" ? { type: "Polygon", coordinates: gm.coordinates.map(anillo) }
  : { type: "MultiPolygon", coordinates: gm.coordinates.map(p => p.map(anillo)) };
const salida = {
  type: "FeatureCollection",
  // «Común de Sepúlveda y Riaza» no es un municipio: se pinta, pero no se puede elegir
  features: g.municipios.features.map(f => ({ type: "Feature", properties: { id: f.properties.id, n: f.properties.n, ...(/^Común de/.test(f.properties.n) ? { comun: 1 } : {}) }, geometry: geom(f.geometry) })),
  provincia: geom(g.provincia.geometry),
};
writeFileSync(new URL("../public/mapa/municipios.json", import.meta.url), JSON.stringify(salida));
console.log(salida.features.length, "municipios");
