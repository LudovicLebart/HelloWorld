import type { CurveSample, Point } from "./types";

const DENSE_STEPS_PER_SEGMENT = 16;

// Paramétrisation centripète (alpha = 0.5) : contrairement à la variante
// uniforme, elle ne produit ni boucle ni surtension quand les points de
// contrôle sont espacés de façon très inégale — exactement le cas d'un
// tracé à main levée simplifié par RDP (dense dans les virages, épars
// dans les portions droites). C'est ce qui rend la courbe "douce" plutôt
// que cabossée près des changements de direction marqués.
const CENTRIPETAL_ALPHA = 0.5;

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function knotStep(t: number, p0: Point, p1: Point): number {
  const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  // Plancher non nul : évite une division par zéro quand deux points
  // coïncident (notamment les points fantômes dupliqués aux extrémités).
  return t + Math.max(Math.pow(dist, CENTRIPETAL_ALPHA), 1e-6);
}

function centripetalCatmullRom(p0: Point, p1: Point, p2: Point, p3: Point, u: number): Point {
  const t0 = 0;
  const t1 = knotStep(t0, p0, p1);
  const t2 = knotStep(t1, p1, p2);
  const t3 = knotStep(t2, p2, p3);
  const t = t1 + u * (t2 - t1);

  const a1 = lerp(p0, p1, (t - t0) / (t1 - t0));
  const a2 = lerp(p1, p2, (t - t1) / (t2 - t1));
  const a3 = lerp(p2, p3, (t - t2) / (t3 - t2));
  const b1 = lerp(a1, a2, (t - t0) / (t2 - t0));
  const b2 = lerp(a2, a3, (t - t1) / (t3 - t1));
  return lerp(b1, b2, (t - t1) / (t2 - t1));
}

/**
 * Interpole une spline de Catmull-Rom centripète à travers tous les points
 * de contrôle fournis, en dupliquant les extrémités pour que la courbe
 * passe bien par le premier et le dernier point.
 */
function denseCatmullRom(controlPoints: Point[]): Point[] {
  if (controlPoints.length < 2) return controlPoints.slice();
  if (controlPoints.length === 2) return controlPoints.slice();

  const pts = [controlPoints[0], ...controlPoints, controlPoints[controlPoints.length - 1]];
  const dense: Point[] = [pts[1]];

  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    for (let step = 1; step <= DENSE_STEPS_PER_SEGMENT; step++) {
      dense.push(centripetalCatmullRom(p0, p1, p2, p3, step / DENSE_STEPS_PER_SEGMENT));
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
