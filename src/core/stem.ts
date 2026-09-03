import type { CurveSample } from "./types";

/**
 * Profil d'épaisseur de la tige le long de la courbe : large au centre,
 * s'affinant en pointe vers les deux extrémités (lissage smoothstep).
 * `t` est la position normalisée 0..1 le long de la courbe.
 */
export function widthProfile(t: number, baseWidth: number, taperFraction = 0.15): number {
  const distFromEdge = Math.min(t, 1 - t); // 0 à une extrémité, 0.5 au centre
  const factor = Math.min(1, distFromEdge / taperFraction);
  const eased = factor * factor * (3 - 2 * factor); // smoothstep
  return baseWidth * eased;
}

/**
 * Génère le chemin SVG (polygone fermé) de la tige : un unique `path` défini
 * par les offsets gauche/droite le long des normales de la courbe. C'est un
 * contour plein (pas un simple trait épaissi), directement exploitable en
 * découpe CNC/Laser.
 */
export function buildStemPath(curve: CurveSample[], baseWidth: number, taperFraction = 0.15): string {
  if (curve.length < 2) return "";

  const left: string[] = [];
  const right: string[] = [];

  for (const sample of curve) {
    const halfWidth = widthProfile(sample.t, baseWidth, taperFraction) / 2;
    const { point, normal } = sample;
    left.push(`${point.x + normal.x * halfWidth},${point.y + normal.y * halfWidth}`);
    right.push(`${point.x - normal.x * halfWidth},${point.y - normal.y * halfWidth}`);
  }

  right.reverse();
  return `M ${left.join(" L ")} L ${right.join(" L ")} Z`;
}
