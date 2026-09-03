import type { CurveSample, Point } from "./types";

const DENSE_STEPS_PER_SEGMENT = 16;

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/**
 * Interpole une spline de Catmull-Rom (Hermite interpolante) à travers
 * tous les points de contrôle fournis, en dupliquant les extrémités pour
 * que la courbe passe bien par le premier et le dernier point.
 */
function denseCatmullRom(controlPoints: Point[]): Point[] {
  if (controlPoints.length < 2) return controlPoints.slice();
  if (controlPoints.length === 2) return controlPoints.slice();

  const pts = [controlPoints[0], ...controlPoints, controlPoints[controlPoints.length - 1]];
  const dense: Point[] = [pts[1]];

  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    for (let step = 1; step <= DENSE_STEPS_PER_SEGMENT; step++) {
      dense.push(catmullRom(p0, p1, p2, p3, step / DENSE_STEPS_PER_SEGMENT));
    }
  }

  return dense;
}

function polylineLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return length;
}

/** Ré-échantillonne une polyligne dense à un pas régulier en longueur d'arc. */
function resampleEven(dense: Point[], step: number): Point[] {
  const total = polylineLength(dense);
  if (total === 0) return dense.slice(0, 1);

  const count = Math.max(2, Math.round(total / step));
  const result: Point[] = [dense[0]];

  let segIndex = 0;
  let segStart = dense[0];
  let segEnd = dense[1];
  let segLength = Math.hypot(segEnd.x - segStart.x, segEnd.y - segStart.y);
  let distIntoSeg = 0;
  let traveled = 0;

  for (let i = 1; i < count; i++) {
    const targetDist = (total * i) / (count - 1);
    while (traveled + segLength < targetDist && segIndex < dense.length - 2) {
      traveled += segLength;
      segIndex++;
      segStart = dense[segIndex];
      segEnd = dense[segIndex + 1];
      segLength = Math.hypot(segEnd.x - segStart.x, segEnd.y - segStart.y);
      distIntoSeg = 0;
    }
    distIntoSeg = targetDist - traveled;
    const ratio = segLength === 0 ? 0 : distIntoSeg / segLength;
    result.push({
      x: segStart.x + (segEnd.x - segStart.x) * ratio,
      y: segStart.y + (segEnd.y - segStart.y) * ratio,
    });
  }

  return result;
}

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/**
 * Construit le squelette final : interpole les points de contrôle simplifiés
 * en spline lisse, ré-échantillonne à pas régulier, puis calcule la tangente
 * et la normale exactes en chaque point (essentiel pour orienter tige et motifs).
 */
export function buildCurve(controlPoints: Point[], resampleStep = 4): CurveSample[] {
  if (controlPoints.length < 2) return [];

  const dense = denseCatmullRom(controlPoints);
  const points = resampleEven(dense, resampleStep);

  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = cumulative[cumulative.length - 1] || 1;

  return points.map((point, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tangent = normalize({ x: next.x - prev.x, y: next.y - prev.y });
    const normal = { x: -tangent.y, y: tangent.x };
    return {
      point,
      tangent,
      normal,
      arcLength: cumulative[i],
      t: cumulative[i] / total,
    };
  });
}
