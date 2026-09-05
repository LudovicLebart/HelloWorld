import type { Point } from "./types";

export interface CurvatureSpiralOptions {
  /** Longueur d'arc totale de la volute (repère local, origine au point de départ). Le paramètre
      direct est la longueur, pas un nombre de tours : le nombre de tours visuels résulte de
      `endCurvature`/`curvatureExponent`, ce n'est plus un cadran à part. */
  length: number;
  /** Courbure (1/rayon de courbure instantané) atteinte en bout de parcours (s = length). Plus
      grand = pointe qui s'enroule plus serré. */
  endCurvature: number;
  /** Loi de courbure le long du parcours : κ(s) = endCurvature·(s/length)^curvatureExponent.
      À 1, la courbure croît linéairement avec la longueur parcourue (spirale d'Euler/clothoïde
      classique) — déjà quasi nulle au départ par construction (κ(0) = 0), donc un raccord tangent
      lisse (continu en position ET en courbure) avec la tige mère, sans le moindre "escargot" dès
      l'attache. Au-delà de 1, la montée en courbure est explicitement retardée vers la toute
      dernière portion du parcours plutôt que répartie sur toute la longueur : un grand geste
      presque droit qui ne se met à tourner serré sur lui-même que tard. */
  curvatureExponent: number;
  /** Pas de l'intégration numérique (méthode du point milieu) — pas de forme close dès que
      `curvatureExponent` ≠ 1, contrairement à une spirale logarithmique classique. */
  steps: number;
  /** Sens d'enroulement : true = horaire, false = anti-horaire. */
  clockwise: boolean;
}

export interface CurvatureSpiralSample {
  /** points[0] est toujours à l'origine (0, 0). */
  points: Point[];
  /** Tangente unitaire au point de départ — toujours (1, 0) par construction (le cap au départ,
      φ(0), est toujours nul : la courbe part le long de l'axe x local). Gardée dans l'interface
      pour que l'appelant continue de raccorder la volute à une tangente donnée par simple rotation,
      sans se soucier du modèle de courbe sous-jacent. */
  startTangent: Point;
}

/**
 * Échantillonne une volute en repère local à partir d'une loi de courbure en fonction de la
 * longueur d'arc parcourue plutôt que d'un angle polaire fixé d'avance — voir la note dans
 * docs/explanation/principes-esthetiques.md sur pourquoi une spirale logarithmique classique
 * (auto-similaire par construction) ne peut structurellement pas produire un plateau de courbure
 * quasi nulle suivi d'un resserrement tardif, quel que soit son paramétrage. Ici, la courbure
 * κ(s) = endCurvature·(s/length)^curvatureExponent est intégrée par la méthode du point milieu pour
 * produire le cap (angle de la tangente) puis la position : cap(s) = ∫₀ˢ κ(u)du,
 * position(s) = ∫₀ˢ (cos(cap(u)), sin(cap(u))) du. L'appelant raccorde la volute à une tige
 * existante en alignant `startTangent` sur la tangente voulue (rotation), puis en translatant
 * l'origine sur le point d'accroche.
 */
export function sampleCurvatureSpiral(options: CurvatureSpiralOptions): CurvatureSpiralSample {
  const { length, endCurvature, curvatureExponent, steps, clockwise } = options;
  const sign = clockwise ? -1 : 1;
  const ds = length / Math.max(1, steps);

  let cap = 0;
  let x = 0;
  let y = 0;
  const points: Point[] = [{ x: 0, y: 0 }];
  for (let i = 0; i < steps; i++) {
    const sMid = (i + 0.5) * ds;
    const kappaMid = sign * endCurvature * Math.pow(sMid / length, curvatureExponent);
    const capMid = cap + (kappaMid * ds) / 2;
    x += Math.cos(capMid) * ds;
    y += Math.sin(capMid) * ds;
    cap += kappaMid * ds;
    points.push({ x, y });
  }

  return { points, startTangent: { x: 1, y: 0 } };
}
