import type { CurveSample, Point } from "./types";

export interface TaperOptions {
  taperFraction?: number;
  /** Amincir vers une pointe à l'extrémité de départ (t=0). Faux pour une branche : sa racine doit rester pleine largeur pour bien s'enfoncer dans la tige parente. */
  taperStart?: boolean;
  /** Amincir vers une pointe à l'extrémité d'arrivée (t=1). */
  taperEnd?: boolean;
}

/**
 * Profil d'épaisseur de la tige le long de la courbe. Par défaut, large au
 * centre et amincie en pointe aux deux extrémités (lissage smoothstep) ;
 * chaque extrémité peut individuellement ne pas s'amincir — c'est le cas de
 * la racine d'une branche, qui doit rester pleine largeur pour se fondre
 * proprement dans la tige dont elle part (voir src/core/junction.ts).
 */
export function widthProfile(t: number, baseWidth: number, opts: TaperOptions = {}): number {
  const { taperFraction = 0.15, taperStart = true, taperEnd = true } = opts;
  const edgeStart = taperStart ? Math.min(1, t / taperFraction) : 1;
  const edgeEnd = taperEnd ? Math.min(1, (1 - t) / taperFraction) : 1;
  const factor = Math.min(edgeStart, edgeEnd);
  const eased = factor * factor * (3 - 2 * factor); // smoothstep
  return baseWidth * eased;
}

/**
 * Calcule le polygone (liste de points, non fermé) de la tige : les offsets
 * gauche puis droit (retour) le long des normales de la courbe. C'est un
 * contour plein (pas un simple trait épaissi), directement exploitable en
 * découpe CNC/Laser, et réutilisable tel quel pour une fusion booléenne
 * avec d'autres tiges à une jonction (voir junction.ts).
 */
export function buildStemPolygon(curve: CurveSample[], baseWidth: number, opts: TaperOptions = {}): Point[] {
  if (curve.length < 2) return [];

  const left: Point[] = [];
  const right: Point[] = [];

  for (const sample of curve) {
    const halfWidth = widthProfile(sample.t, baseWidth, opts) / 2;
    const { point, normal } = sample;
    left.push({ x: point.x + normal.x * halfWidth, y: point.y + normal.y * halfWidth });
    right.push({ x: point.x - normal.x * halfWidth, y: point.y - normal.y * halfWidth });
  }

  right.reverse();
  return [...left, ...right];
}

/** Sérialise un polygone (liste de points) en un sous-chemin SVG fermé. */
export function polygonToPath(polygon: Point[]): string {
  if (polygon.length === 0) return "";
  return `M ${polygon.map((p) => `${p.x},${p.y}`).join(" L ")} Z`;
}

/** Raccourci : polygone de la tige directement sérialisé en chemin SVG. */
export function buildStemPath(curve: CurveSample[], baseWidth: number, opts: TaperOptions = {}): string {
  return polygonToPath(buildStemPolygon(curve, baseWidth, opts));
}
