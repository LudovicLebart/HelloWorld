import type { Point } from "./types";

/**
 * Test point-dans-polygone par lancer de rayon (ray casting) — sert à
 * l'export pour ne garder que les motifs dont le point d'attache tombe dans
 * le masque (zone de travail) : voir docs/how-to/definir-une-zone-de-travail.md.
 * Le découpage du contour de tige lui-même se fait par intersection
 * booléenne dans junction.ts, pas ici — un motif reste entier ou disparaît,
 * il n'est jamais partiellement recoupé.
 */
export function isPointInMask(point: Point, mask: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = mask.length - 1; i < mask.length; j = i++) {
    const a = mask[i];
    const b = mask[j];
    const crosses = a.y > point.y !== b.y > point.y;
    if (crosses && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}
