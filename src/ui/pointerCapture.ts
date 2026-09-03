import type { Point } from "../core/types";

export interface StrokeCallbacks {
  onStrokeStart?: (point: Point) => void;
  onStrokeMove?: (points: Point[]) => void;
  onStrokeEnd?: (points: Point[]) => void;
}

/** Convertit les coordonnées écran d'un événement en coordonnées du repère SVG (indépendant du zoom / de la taille écran). */
export function svgPointFromEvent(svg: SVGSVGElement, e: { clientX: number; clientY: number }): Point {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: e.clientX, y: e.clientY };
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

/**
 * Capture un tracé au pointeur (souris, stylet ou doigt — unifiés par la
 * Pointer Events API) sur un élément SVG, et restitue les points bruts en
 * coordonnées du repère SVG. Retourne une fonction pour détacher les écouteurs.
 */
export function attachPointerCapture(svg: SVGSVGElement, callbacks: StrokeCallbacks): () => void {
  let activePointerId: number | null = null;
  let points: Point[] = [];

  function onPointerDown(e: PointerEvent) {
    if (activePointerId !== null) return;
    if (e.button !== undefined && e.button !== 0) return;

    activePointerId = e.pointerId;
    svg.setPointerCapture(e.pointerId);
    points = [svgPointFromEvent(svg, e)];
    callbacks.onStrokeStart?.(points[0]);
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    points.push(svgPointFromEvent(svg, e));
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

export interface ClickToPlaceCallbacks {
  onAdd: (point: Point) => void;
  onFinish: () => void;
}

/**
 * Mode "point par point" : chaque clic/tap ajoute un nœud, un double-clic
 * (ou double-tap) termine le tracé. Une petite tolérance de mouvement évite
 * qu'un léger tremblement soit interprété comme un drag plutôt qu'un tap.
 */
export function attachClickToPlace(svg: SVGSVGElement, callbacks: ClickToPlaceCallbacks): () => void {
  function onClick(e: MouseEvent) {
    callbacks.onAdd(svgPointFromEvent(svg, e));
  }
  function onDblClick() {
    callbacks.onFinish();
  }

  svg.addEventListener("click", onClick);
  svg.addEventListener("dblclick", onDblClick);

  return () => {
    svg.removeEventListener("click", onClick);
    svg.removeEventListener("dblclick", onDblClick);
  };
}
