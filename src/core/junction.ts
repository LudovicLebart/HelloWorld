import polygonClipping from "polygon-clipping";
import type { Point } from "./types";
import { polygonToPath } from "./stem";

function toRing(points: Point[]): [number, number][] {
  const ring = points.map((p): [number, number] => [p.x, p.y]);
  ring.push(ring[0]); // anneau fermé : premier == dernier point (convention attendue par polygon-clipping)
  return ring;
}

/**
 * Fusionne plusieurs polygones de tige qui se chevauchent (une branche
 * embarquée dans sa tige parente, voir `TaperOptions.taperStart` dans
 * stem.ts) en un seul contour net, sans double-trait à la jonction — c'est
 * ce qui rend une découpe CNC/Laser propre plutôt que deux tracés qui se
 * recouvrent. Rendu ici en un unique `d` (un sous-chemin par polygone
 * résultant ; en pratique un seul si les tiges se touchent vraiment).
 */
export function unionStemPolygons(polygons: Point[][]): string {
  const nonEmpty = polygons.filter((p) => p.length >= 3);
  if (nonEmpty.length === 0) return "";
  if (nonEmpty.length === 1) return polygonToPath(nonEmpty[0]);

  const [first, ...rest] = nonEmpty.map((p) => [toRing(p)]);
  const merged = polygonClipping.union(first, ...rest);

  return merged
    .map((polygon) => polygon.map((ring) => polygonToPath(ring.map(([x, y]) => ({ x, y })))).join(" "))
    .join(" ");
}
