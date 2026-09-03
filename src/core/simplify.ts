import type { Point } from "./types";

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  // Distance du point à la droite (a, b), via la projection scalaire.
  const cross = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  return cross / Math.sqrt(lengthSq);
}

/**
 * Algorithme de Ramer-Douglas-Peucker : réduit une polyligne bruitée
 * (points bruts du pointeur) à un sous-ensemble de points de contrôle,
 * en ne gardant que ceux qui s'écartent de plus de `epsilon` pixels
 * de la corde qu'ils simplifient.
 */
export function simplifyRDP(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points.slice();

  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyRDP(points.slice(0, index + 1), epsilon);
    const right = simplifyRDP(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}
