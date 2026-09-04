import type { Point } from "./types";

export interface LogSpiralOptions {
  /** Nombre de tours de la spirale. */
  turns: number;
  /** Taux de décroissance du rayon par radian (r = startRadius·e^(-growthRate·θ)). */
  growthRate: number;
  /** Rayon au point de départ (θ = 0). */
  startRadius: number;
  /** Échantillons par tour. */
  samplesPerTurn: number;
  /** Sens d'enroulement : true = horaire, false = anti-horaire. */
  clockwise: boolean;
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
  const { turns, growthRate, startRadius, samplesPerTurn, clockwise } = options;
  const totalSteps = Math.max(2, Math.round(turns * samplesPerTurn));
  const sign = clockwise ? -1 : 1;

  const raw: Point[] = [];
  for (let i = 0; i <= totalSteps; i++) {
    const theta = (i / samplesPerTurn) * 2 * Math.PI;
    const radius = startRadius * Math.exp(-growthRate * theta);
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
