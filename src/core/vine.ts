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
