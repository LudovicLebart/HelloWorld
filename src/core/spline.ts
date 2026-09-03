import type { CurveSample, EditableNode, Point } from "./types";

const DENSE_STEPS_PER_SEGMENT = 16;

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/** Calcule les poignées lissées d'un point d'après ses voisins immédiats (tangente commune, longueur proportionnelle à la distance de chaque côté). */
function smoothedHandles(prev: Point, p: Point, next: Point, smoothing: number): Pick<EditableNode, "handleIn" | "handleOut"> {
  const tangent = normalize({ x: next.x - prev.x, y: next.y - prev.y });
  const distPrev = Math.hypot(p.x - prev.x, p.y - prev.y);
  const distNext = Math.hypot(next.x - p.x, next.y - p.y);
  return {
    handleIn: { x: p.x - tangent.x * distPrev * smoothing, y: p.y - tangent.y * distPrev * smoothing },
    handleOut: { x: p.x + tangent.x * distNext * smoothing, y: p.y + tangent.y * distNext * smoothing },
  };
}

/**
 * Calcule des poignées de contrôle par défaut pour une suite de points bruts
 * (typiquement issus de la simplification RDP), de façon à produire une
 * courbe lisse dès la création — chaque nœud reste ensuite librement
 * éditable (position et poignées) via l'éditeur de nœuds.
 */
export function autoHandles(points: Point[], smoothing = 0.25): EditableNode[] {
  return points.map((p, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    return { point: { x: p.x, y: p.y }, ...smoothedHandles(prev, p, next, smoothing) };
  });
}

/** Ré-applique des poignées lissées aux nœuds `center-1..center+1` (clampé aux bornes) — les autres nœuds ne sont pas touchés, ni un nœud « coin » (poignées volontairement indépendantes, voir EditableNode.corner). */
function resmoothAround(nodes: EditableNode[], center: number, smoothing: number): EditableNode[] {
  const result = [...nodes];
  for (const i of [center - 1, center, center + 1]) {
    if (i < 0 || i >= result.length || result[i].corner) continue;
    const prev = result[Math.max(0, i - 1)].point;
    const next = result[Math.min(result.length - 1, i + 1)].point;
    const p = result[i].point;
    result[i] = { ...result[i], ...smoothedHandles(prev, p, next, smoothing) };
  }
  return result;
}

/** Distance d'un point au segment [a, b] (projection bornée, contrairement à une distance à la droite infinie). */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Trouve l'index i du segment [nodes[i], nodes[i+1]] le plus proche d'un point — sert à choisir où insérer un nouveau nœud. */
export function nearestSegmentIndex(nodes: EditableNode[], point: Point): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < nodes.length - 1; i++) {
    const dist = distanceToSegment(point, nodes[i].point, nodes[i + 1].point);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/** Insère un nouveau nœud au milieu du segment de courbe [index, index+1] — poignées recalculées localement pour lui et ses voisins immédiats, les autres nœuds ne sont pas affectés. */
export function insertNodeAt(nodes: EditableNode[], index: number, smoothing = 0.25): EditableNode[] {
  const a = nodes[index];
  const b = nodes[index + 1];
  const point = bezierPoint(a.point, a.handleOut, b.handleIn, b.point, 0.5);
  const result = [...nodes];
  result.splice(index + 1, 0, { point, handleIn: point, handleOut: point });
  return resmoothAround(result, index + 1, smoothing);
}

/** Retire le nœud `index` — poignées de ses anciens voisins, désormais adjacents, recalculées localement. */
export function removeNodeAt(nodes: EditableNode[], index: number, smoothing = 0.25): EditableNode[] {
  const result = nodes.filter((_, i) => i !== index);
  return resmoothAround(result, index, smoothing);
}

/**
 * Bascule le nœud `index` entre lisse (poignées en miroir, comportement par
 * défaut) et coin (poignées indépendantes, pour un angle franc). Passer en
 * coin ne change aucune géométrie (les poignées restent où elles sont, seul
 * leur comportement au glisser-déposer change) ; repasser en lisse aligne
 * `handleOut` en miroir de `handleIn` à travers le point, pour que la courbe
 * redevienne effectivement lisse, pas seulement étiquetée comme telle.
 */
export function setNodeCorner(nodes: EditableNode[], index: number, corner: boolean): EditableNode[] {
  const result = [...nodes];
  const n = result[index];
  if (corner) {
    result[index] = { ...n, corner: true };
  } else {
    const handleOut = { x: 2 * n.point.x - n.handleIn.x, y: 2 * n.point.y - n.handleIn.y };
    result[index] = { ...n, corner: false, handleOut };
  }
  return result;
}

export function bezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/** Échantillonne densément la courbe de Bézier composite passant par tous les nœuds. */
function denseFromNodes(nodes: EditableNode[]): Point[] {
  if (nodes.length < 2) return nodes.map((n) => n.point);

  const dense: Point[] = [nodes[0].point];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    for (let step = 1; step <= DENSE_STEPS_PER_SEGMENT; step++) {
      dense.push(bezierPoint(a.point, a.handleOut, b.handleIn, b.point, step / DENSE_STEPS_PER_SEGMENT));
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
  let traveled = 0;

  for (let i = 1; i < count; i++) {
    const targetDist = (total * i) / (count - 1);
    while (traveled + segLength < targetDist && segIndex < dense.length - 2) {
      traveled += segLength;
      segIndex++;
      segStart = dense[segIndex];
      segEnd = dense[segIndex + 1];
      segLength = Math.hypot(segEnd.x - segStart.x, segEnd.y - segStart.y);
    }
    const distIntoSeg = targetDist - traveled;
    const ratio = segLength === 0 ? 0 : distIntoSeg / segLength;
    result.push({
      x: segStart.x + (segEnd.x - segStart.x) * ratio,
      y: segStart.y + (segEnd.y - segStart.y) * ratio,
    });
  }

  return result;
}

/**
 * Construit le squelette final à partir des nœuds éditables : échantillonne
 * la courbe de Bézier composite à pas régulier, puis calcule la tangente et
 * la normale exactes en chaque point (essentiel pour orienter tige et motifs).
 */
export function buildCurveFromNodes(nodes: EditableNode[], resampleStep = 4): CurveSample[] {
  if (nodes.length < 2) return [];

  const dense = denseFromNodes(nodes);
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
