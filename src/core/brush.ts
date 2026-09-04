import type { CurveSample, Point } from "./types";
import { widthProfile } from "./stem";

export interface BrushPlacement {
  position: Point;
  /** Angle absolu (radians) à appliquer au motif. */
  angle: number;
  scale: number;
  /** Identifiant du motif à dessiner à cet emplacement (voir src/assets/motifs.ts). */
  motifId: string;
}

/** Un maillon de la séquence : quel motif, avec son échelle et son jitter propres — voir docs/how-to/sequencer-des-motifs.md. */
export interface MotifSequenceEntry {
  motifId: string;
  /** Taille de base de ce motif, en pixels. */
  scale: number;
  /** Intensité du jitter propre à ce motif, 0 (aucun) à 1 (fort). */
  jitter: number;
}

export interface BrushOptions {
  /** Distance moyenne entre deux motifs, en pixels de longueur d'arc. */
  spacing: number;
  /** Angle de base entre la tige et un motif, en degrés. */
  baseAngleDeg?: number;
  /** Séquence de motifs à faire alterner le long de la tige (répétée en boucle, ordre choisi par l'utilisateur), chacun avec sa propre échelle et son propre jitter. */
  sequence: MotifSequenceEntry[];
  /** Comme pour la tige (voir stem.ts) : désactiver le rétrécissement à la racine d'une branche. */
  taperStart?: boolean;
  taperEnd?: boolean;
}

function angleOf(v: Point): number {
  return Math.atan2(v.y, v.x);
}

function sampleAtArcLength(curve: CurveSample[], arcLength: number, fromIndex: number): [CurveSample, number] {
  let i = fromIndex;
  while (i < curve.length - 1 && curve[i + 1].arcLength < arcLength) i++;
  return [curve[i], i];
}

/**
 * Marche le long du squelette par pas de longueur d'arc réguliers et
 * décide, à chaque étape, où et comment placer une instance du motif :
 * échelle dégressive vers les extrémités (le profil suit celui de la tige),
 * alternance gauche/droite le long de la tangente, et jitter pour casser
 * l'effet "tampon". Une séquence vide (aucun motif actif) est un état légitime — pas de
 * repli, aucun placement produit (voir le mode "focus volutes" de main.ts, qui vise
 * une silhouette pure sans feuillage).
 */
export function placeBrush(curve: CurveSample[], opts: BrushOptions): BrushPlacement[] {
  if (curve.length < 2 || opts.sequence.length === 0) return [];

  const { spacing, sequence } = opts;
  const baseAngleRad = ((opts.baseAngleDeg ?? 55) * Math.PI) / 180;
  const total = curve[curve.length - 1].arcLength;

  const placements: BrushPlacement[] = [];
  let side = 1;
  let searchIndex = 0;
  let seqIndex = 0;

  for (let d = spacing / 2; d < total; d += spacing) {
    const [sample, idx] = sampleAtArcLength(curve, d, searchIndex);
    searchIndex = idx;
    const entry = sequence[seqIndex % sequence.length];

    const taper = widthProfile(sample.t, 1, {
      taperFraction: 0.15,
      taperStart: opts.taperStart,
      taperEnd: opts.taperEnd,
    }); // 0..1, coïncide avec le profil de la tige
    const jitterScale = 1 + (Math.random() - 0.5) * entry.jitter * 0.6;
    const scale = entry.scale * (0.1 + 0.9 * taper) * jitterScale;

    const jitterAngle = (Math.random() - 0.5) * entry.jitter * (Math.PI / 3);
    const jitterSpacing = (Math.random() - 0.5) * entry.jitter * spacing * 0.4;

    const tangentAngle = angleOf(sample.tangent);
    const angle = tangentAngle + side * baseAngleRad + jitterAngle;

    const attachOffset = side * (scale * 0.25 + jitterSpacing * 0.2);
    const position: Point = {
      x: sample.point.x + sample.normal.x * attachOffset,
      y: sample.point.y + sample.normal.y * attachOffset,
    };

    placements.push({ position, angle, scale, motifId: entry.motifId });
    side = -side;
    seqIndex++;
  }

  return placements;
}
