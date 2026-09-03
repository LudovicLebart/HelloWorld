import type { Point } from "../core/types";

export interface StrokeCallbacks {
  onStrokeStart?: (point: Point) => void;
  onStrokeMove?: (points: Point[]) => void;
  onStrokeEnd?: (points: Point[]) => void;
}

/**
 * Capture un tracé au pointeur (souris, stylet ou doigt — unifiés par la
 * Pointer Events API) sur un élément SVG, et restitue les points bruts en
 * coordonnées du repère SVG (indépendant du zoom / de la taille écran).
 * Retourne une fonction pour détacher les écouteurs.
 */
export function attachPointerCapture(svg: SVGSVGElement, callbacks: StrokeCallbacks): () => void {
  let activePointerId: number | null = null;
  let points: Point[] = [];

  function toSvgPoint(e: PointerEvent): Point {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: e.clientX, y: e.clientY };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function onPointerDown(e: PointerEvent) {
    if (activePointerId !== null) return;
    if (e.button !== undefined && e.button !== 0) return;

    activePointerId = e.pointerId;
    svg.setPointerCapture(e.pointerId);
    points = [toSvgPoint(e)];
    callbacks.onStrokeStart?.(points[0]);
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    points.push(toSvgPoint(e));
    callbacks.onStrokeMove?.(points);
  }

  function endStroke(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    callbacks.onStrokeEnd?.(points);
    points = [];
  }

  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", endStroke);
  svg.addEventListener("pointercancel", endStroke);

  return () => {
    svg.removeEventListener("pointerdown", onPointerDown);
    svg.removeEventListener("pointermove", onPointerMove);
    svg.removeEventListener("pointerup", endStroke);
    svg.removeEventListener("pointercancel", endStroke);
  };
}
