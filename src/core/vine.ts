import type { CurveSample, EditableNode, Point } from "./types";
import { simplifyRDP } from "./simplify";
import { autoHandles, buildCurveFromNodes } from "./spline";
import { buildStemPolygon, polygonToPath } from "./stem";
import { placeBrush, type BrushOptions, type BrushPlacement } from "./brush";

export interface VineParams {
  stemWidth: number;
  brush: BrushOptions;
  /** Faux pour une branche : sa racine ne s'amincit pas, elle reste pleine largeur pour se fondre dans sa tige parente. */
  taperStart?: boolean;
  taperEnd?: boolean;
}

export interface VineRenderData {
  curve: CurveSample[];
  /** Polygone brut de la tige (avant sérialisation), réutilisé tel quel pour la fusion à une jonction — voir junction.ts. */
  stemPolygon: Point[];
  stemPathD: string;
  leaves: BrushPlacement[];
}

/** Simplifie un tracé brut à main levée en nœuds éditables (poignées auto-lissées). */
export function nodesFromStroke(rawPoints: Point[], simplifyEpsilon: number): EditableNode[] {
  const controlPoints = simplifyRDP(rawPoints, simplifyEpsilon);
  return autoHandles(controlPoints);
}

/** Convertit une suite de points posés un par un (mode "Points") en nœuds éditables. */
export function nodesFromClicks(points: Point[]): EditableNode[] {
  return autoHandles(points);
}

/** Recalcule la tige et les feuilles à partir de l'état courant des nœuds — appelé à la création comme à chaque édition. */
export function regenerateVine(nodes: EditableNode[], params: VineParams): VineRenderData {
  const curve = buildCurveFromNodes(nodes);
  const taper = { taperStart: params.taperStart, taperEnd: params.taperEnd };
  const stemPolygon = buildStemPolygon(curve, params.stemWidth, taper);
  return {
    curve,
    stemPolygon,
    stemPathD: polygonToPath(stemPolygon),
    leaves: placeBrush(curve, { ...params.brush, taperStart: params.taperStart, taperEnd: params.taperEnd }),
  };
}

/** Forme persistable d'une liane : juste assez pour la reconstruire (nœuds,
    liane parente éventuelle, paramètres utilisés) — tout le reste (curve,
    polygone, feuilles) est dérivé et se recalcule via regenerateVine(). */
export interface SerializedVine {
  id: string;
  nodes: EditableNode[];
  parentId?: string;
  params: VineParams;
}

/** Sérialise un ensemble de lianes (undo/redo comme sauvegarde locale utilisent le même format). */
export function serializeVines(
  vines: Map<string, { nodes: EditableNode[]; parentId?: string; params: VineParams }>,
): string {
  const list: SerializedVine[] = [...vines].map(([id, v]) => ({
    id,
    nodes: v.nodes,
    parentId: v.parentId,
    params: v.params,
  }));
  return JSON.stringify(list);
}

function isPoint(v: unknown): v is Point {
  return typeof v === "object" && v !== null && typeof (v as Point).x === "number" && typeof (v as Point).y === "number";
}

function isEditableNode(v: unknown): v is EditableNode {
  if (typeof v !== "object" || v === null) return false;
  const n = v as EditableNode;
  return isPoint(n.point) && isPoint(n.handleIn) && isPoint(n.handleOut);
}

function isSerializedVine(v: unknown): v is SerializedVine {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    Array.isArray(o.nodes) &&
    o.nodes.every(isEditableNode) &&
    (o.parentId === undefined || typeof o.parentId === "string") &&
    typeof o.params === "object" &&
    o.params !== null
  );
}

/**
 * Désérialise un instantané en validant sa forme — une chaîne corrompue,
 * vide ou d'un format incompatible (schéma antérieur, donnée altérée) donne
 * `null` plutôt que d'exploser plus loin dans le pipeline de régénération,
 * pour qu'une sauvegarde locale invalide ne puisse jamais bloquer le
 * démarrage de l'application.
 */
export function deserializeVines(json: string): SerializedVine[] | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed) || !parsed.every(isSerializedVine)) return null;
    return parsed;
  } catch {
    return null;
  }
}
