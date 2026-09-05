import type { Point } from "./types";

export interface LogSpiralOptions {
  /** Nombre de tours de la spirale. */
  turns: number;
  /** Taux de décroissance du rayon par radian (r = startRadius·e^(-growthRate·θ)) — voir
      `curvatureRampPower` pour comment ce taux se répartit le long du parcours angulaire. */
  growthRate: number;
  /** Rayon au point de départ (θ = 0). */
  startRadius: number;
  /** Échantillons par tour. */
  samplesPerTurn: number;
  /** Sens d'enroulement : true = horaire, false = anti-horaire. */
  clockwise: boolean;
  /** Retarde la décroissance du rayon vers la fin du parcours angulaire plutôt que de la répartir
      uniformément (0 = spirale log classique, auto-similaire : la courbure croît au même rythme
      relatif à chaque tour). À 0, une volute a déjà visiblement fait plusieurs tours serrés dès son
      premier tour — un "escargot" dès l'attache. Positif, l'essentiel du rayon reste proche de
      `startRadius` (courbure quasi nulle, la volute se courbe doucement comme une simple branche qui
      s'incurve) sur la majeure partie du parcours, le resserrement en coquille ne devenant visible
      que sur la toute dernière portion — voir la dérivation dans le corps de la fonction. Le rayon
      final (à θ = turns·2π) reste inchangé par rapport à la spirale classique : seule la *répartition*
      de la décroissance le long du parcours change, pas son total. */
  curvatureRampPower: number;
}

export interface LogSpiralSample {
  /** points[0] est toujours à l'origine (0, 0). */
  points: Point[];
  /** Tangente unitaire au point de départ — sert à raccorder la spirale à une tangente donnée. */
  startTangent: Point;
}

/**
 * Échantillonne une spirale logarithmique en repère local : origine au point de départ, rayon
 * décroissant de `startRadius` vers 0 sur `turns` tours — la forme d'une volute qui se resserre en
 * s'enroulant sur elle-même, comme un rinceau classique (voir
 * docs/explanation/principes-esthetiques.md). L'appelant raccorde la spirale à une tige existante
 * en alignant `startTangent` sur la tangente voulue (rotation), puis en translatant l'origine sur le
 * point d'accroche.
 */
export function sampleLogSpiral(options: LogSpiralOptions): LogSpiralSample {
  const { turns, growthRate, startRadius, samplesPerTurn, clockwise, curvatureRampPower } = options;
  const totalSteps = Math.max(2, Math.round(turns * samplesPerTurn));
  const sign = clockwise ? -1 : 1;
  const totalTheta = turns * 2 * Math.PI;

  const raw: Point[] = [];
  for (let i = 0; i <= totalSteps; i++) {
    const theta = (i / samplesPerTurn) * 2 * Math.PI;
    // Fraction du parcours angulaire (0 au départ, 1 au dernier tour) élevée à une puissance : à
    // exposant 0 (curvatureRampPower nul), on retrouve exactement `growthRate·θ`, la spirale log
    // classique. Positif, la même décroissance totale (même rayon final qu'à exposant nul, pour un
    // même growthRate/turns) se retrouve concentrée vers u→1 : le rayon reste proche de
    // `startRadius` (courbure quasi nulle) sur la majeure partie du parcours.
    const u = totalTheta > 0 ? theta / totalTheta : 0;
    const decayExponent = growthRate * totalTheta * Math.pow(u, curvatureRampPower + 1);
    const radius = startRadius * Math.exp(-decayExponent);
    const angle = sign * theta;
    raw.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }

  const origin = raw[0];
  const points = raw.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y }));
  const dx = points[1].x - points[0].x;
  const dy = points[1].y - points[0].y;
  const len = Math.hypot(dx, dy) || 1;
  return { points, startTangent: { x: dx / len, y: dy / len } };
}
