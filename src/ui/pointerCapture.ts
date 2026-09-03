import type { Point } from "../core/types";
import { TAP_DRAG_THRESHOLD } from "../config";

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

export interface StemDragCallbacks {
  /** Pointerdown suivi d'un pointerup sans déplacement significatif : sélectionner la liane. */
  onTap: () => void;
  onBranchStart?: (point: Point) => void;
  onBranchMove: (points: Point[]) => void;
  onBranchEnd: (points: Point[]) => void;
  /** Double-clic sur la tige : insérer un nouveau nœud à cet endroit. */
  onInsertNode?: (point: Point) => void;
}

/**
 * Attache à un élément de tige le geste "tirer une branche" : un simple tap
 * sélectionne la liane pour édition (comportement existant), mais dès que le
 * pointeur se déplace au-delà d'un petit seuil, le geste devient un tracé de
 * branche à part entière — capturé sur la tige elle-même (donc suivi même
 * une fois le pointeur sorti de sa fine silhouette). C'est le geste
 * principal pour créer une branche : bien plus fiable que viser une zone de
 * quelques pixels à côté de la tige.
 */
export function attachStemDrag(svg: SVGSVGElement, stem: SVGPathElement, callbacks: StemDragCallbacks): void {
  stem.addEventListener("pointerdown", (e: PointerEvent) => {
    e.stopPropagation();
    if (e.button !== undefined && e.button !== 0) return;
    stem.setPointerCapture(e.pointerId);

    const startClient = { x: e.clientX, y: e.clientY };
    let dragging = false;
    let points: Point[] = [];

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!dragging) {
        if (Math.hypot(ev.clientX - startClient.x, ev.clientY - startClient.y) < TAP_DRAG_THRESHOLD) return;
        dragging = true;
        points = [svgPointFromEvent(svg, e)];
        callbacks.onBranchStart?.(points[0]);
      }
      points.push(svgPointFromEvent(svg, ev));
      callbacks.onBranchMove(points);
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      stem.removeEventListener("pointermove", onMove);
      stem.removeEventListener("pointerup", onUp);
      stem.removeEventListener("pointercancel", onUp);
      if (dragging) {
        callbacks.onBranchEnd(points);
      } else {
        callbacks.onTap();
      }
    };

    stem.addEventListener("pointermove", onMove);
    stem.addEventListener("pointerup", onUp);
    stem.addEventListener("pointercancel", onUp);
  });

  // Toujours stoppée (même sans onInsertNode) : sans quoi un double-clic sur la tige
  // fuiterait vers le double-clic du canevas qui termine un tracé en mode "Points".
  stem.addEventListener("dblclick", (e: MouseEvent) => {
    e.stopPropagation();
    callbacks.onInsertNode?.(svgPointFromEvent(svg, e));
  });
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
