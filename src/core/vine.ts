import type { EditableNode, Point } from "./types";
import { simplifyRDP } from "./simplify";
import { autoHandles, buildCurveFromNodes } from "./spline";
import { buildStemPath } from "./stem";
import { placeBrush, type BrushOptions, type BrushPlacement } from "./brush";

export interface VineParams {
  stemWidth: number;
  brush: BrushOptions;
}

export interface VineRenderData {
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
  return {
    stemPathD: buildStemPath(curve, params.stemWidth),
    leaves: placeBrush(curve, params.brush),
  };
}
