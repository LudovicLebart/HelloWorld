import type { CurveSample, Point } from "./types";
import { sampleCurvatureSpiral } from "./curvatureSpiral";
import { AUTO_BRANCH } from "../config";

export interface AutoBranchAttachment {
  point: Point;
  /** Tangente de la tige parente au point d'accroche (unitaire). */
  tangent: Point;
  /** Côté d'accroche : 1 = à droite de la tangente, -1 = à gauche (alternance). */
  side: 1 | -1;
}

/** Conjugué du nombre d'or — pas irrationnel utilisé pour perturber l'espacement des points
    d'accroche, afin d'éviter l'effet de grille d'un pas strictement régulier (même principe que la
    divergence phyllotactique — voir docs/explanation/principes-esthetiques.md). */
const GOLDEN_RATIO_CONJUGATE = (Math.sqrt(5) - 1) / 2;

/**
 * Choisit les points d'accroche de branches secondaires le long d'une tige déjà construite : le
 * nombre de points suit la longueur totale (une arabesque ne laisse ni vide ni surcharge, quelle que
 * soit la longueur du tracé), l'espacement de base est régulier mais perturbé par le nombre d'or
 * (jamais un pas mécaniquement identique), et les côtés alternent — voir
 * docs/explanation/principes-esthetiques.md.
 */
export function planAutoBranches(curve: CurveSample[]): AutoBranchAttachment[] {
  if (curve.length < 2) return [];
  const total = curve[curve.length - 1].arcLength;
  const { spacing, marginFraction } = AUTO_BRANCH;
  const count = Math.floor(total / spacing);
  if (count < 1) return [];

  const usableSpan = 1 - 2 * marginFraction;
  const step = usableSpan / (count + 1);
  const plans: AutoBranchAttachment[] = [];
  for (let i = 1; i <= count; i++) {
    const jitter = (((i * GOLDEN_RATIO_CONJUGATE) % 1) - 0.5) * step * 0.6;
    const t = Math.min(1, Math.max(0, marginFraction + step * i + jitter));
    const idx = Math.min(curve.length - 1, Math.max(0, Math.round(t * (curve.length - 1))));
    const sample = curve[idx];
    plans.push({ point: sample.point, tangent: sample.tangent, side: i % 2 === 0 ? 1 : -1 });
  }
  return plans;
}

function rotate(p: Point, cos: number, sin: number): Point {
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** Sous-ensemble de `AUTO_BRANCH` réglable en direct (curseurs de la barre d'outils, voir
    `autoBranchParams()` dans main.ts) plutôt que figé à sa valeur par défaut. */
export type AutoBranchShapeOverrides = Partial<
  Pick<typeof AUTO_BRANCH, "branchLengthFactor" | "endCurvatureFactor" | "curvatureExponent" | "sizeDecay">
>;

/**
 * Construit les points bruts (repère du canevas) d'une volute générée automatiquement à un point
 * d'accroche : raccord à un angle fixe par rapport à la tangente de la tige parente (jamais un
 * prolongement tout droit — `launchAngle`), sens d'enroulement selon le côté d'accroche, et taille
 * décroissant géométriquement à mesure que `generationIndex` avance le long de la tige (rinceau
 * classique : chaque volute plus petite que la précédente, et proportionnellement plus resserrée —
 * `sizeDecay` réduit `length` et resserre `endCurvature` d'un même facteur, une homothétie
 * cohérente plutôt qu'un simple raccourcissement). `stemWidth` sert d'échelle de référence pour que
 * la volute reste proportionnée à l'épaisseur de la tige qui la porte. `overrides` remplace
 * ponctuellement `branchLengthFactor`/`endCurvatureFactor`/`curvatureExponent`/`sizeDecay` sans
 * toucher aux valeurs par défaut de `AUTO_BRANCH`.
 */
export function buildAutoBranchPoints(
  attachment: AutoBranchAttachment,
  stemWidth: number,
  generationIndex: number,
  overrides?: AutoBranchShapeOverrides,
): Point[] {
  const { launchAngle, curveSteps } = AUTO_BRANCH;
  const { branchLengthFactor, endCurvatureFactor, curvatureExponent, sizeDecay } = { ...AUTO_BRANCH, ...overrides };
  const decay = Math.pow(sizeDecay, generationIndex);
  const length = stemWidth * branchLengthFactor * decay;
  const endCurvature = endCurvatureFactor / (stemWidth * decay);
  const spiral = sampleCurvatureSpiral({
    length,
    endCurvature,
    curvatureExponent,
    steps: curveSteps,
    clockwise: attachment.side === -1,
  });

  const mainAngle = Math.atan2(attachment.tangent.y, attachment.tangent.x);
  const desiredAngle = mainAngle + attachment.side * launchAngle;
  const localAngle = Math.atan2(spiral.startTangent.y, spiral.startTangent.x);
  const rotation = desiredAngle - localAngle;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return spiral.points.map((p) => {
    const r = rotate(p, cos, sin);
    return { x: r.x + attachment.point.x, y: r.y + attachment.point.y };
  });
}
