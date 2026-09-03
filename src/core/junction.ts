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
 *
 * Même avec une seule tige (pas de branche), le polygone passe toujours par
 * `union()` : c'est ce qui répare le « vrai corner join » — le contour brut
 * d'une tige (offset de chaque côté de la courbe, voir `buildStemPolygon`)
 * peut légèrement s'auto-intersecter dans un virage très serré, et `union()`
 * normalise n'importe quel polygone (auto-intersectant ou non) en un jeu de
 * contours simples, sans recouvrement — exactement ce qu'exige une découpe
 * CNC/laser propre.
 *
 * Si `mask` est fourni (zone de travail définie par l'utilisateur — voir
 * docs/how-to/definir-une-zone-de-travail.md), le contour fusionné est en
 * plus découpé par intersection booléenne avec le masque : le tracé exporté
 * ne dépasse jamais de la zone, sans recourir à un `clip-path` SVG (que les
 * logiciels de découpe CNC/laser ne savent pas tous interpréter).
 */
export function unionStemPolygons(polygons: Point[][], mask?: Point[] | null): string {
  const nonEmpty = polygons.filter((p) => p.length >= 3);
  if (nonEmpty.length === 0) return "";

  const [first, ...rest] = nonEmpty.map((p) => toRing(p));
  let merged = polygonClipping.union([first], ...rest.map((ring) => [ring]));

  if (mask && mask.length >= 3) {
    merged = polygonClipping.intersection(merged, [toRing(mask)]);
  }

  return merged
    .map((polygon) => polygon.map((ring) => polygonToPath(ring.map(([x, y]) => ({ x, y })))).join(" "))
    .join(" ");
}
