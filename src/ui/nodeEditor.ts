import type { EditableNode, Point } from "../core/types";
import { svgPointFromEvent } from "./pointerCapture";
import { ANCHOR_TAP_DELAY } from "../config";

const SVG_NS = "http://www.w3.org/2000/svg";

type HandleKey = "handleIn" | "handleOut";

interface NodeElements {
  lineIn: SVGLineElement;
  lineOut: SVGLineElement;
  handleIn: SVGRectElement;
  handleOut: SVGRectElement;
  anchor: SVGCircleElement;
}

/**
 * Overlay d'édition non-destructive pour une liane sélectionnée : affiche
 * ses nœuds (ancres) et leurs poignées Bézier, tous glissables. Déplacer
 * une ancre translate le nœud entier (position) ; déplacer une poignée la
 * repositionne et reflète la poignée opposée pour garder une jonction
 * lisse (comportement "point lisse" à la Illustrator/Inkscape).
 *
 * Les éléments DOM sont créés une seule fois par nœud puis repositionnés
 * en place à chaque frame de drag : les recréer (ex. via replaceChildren)
 * ferait perdre la capture de pointeur en cours, puisque le navigateur la
 * relâche implicitement dès que l'élément capturé quitte le DOM.
 */
export interface NodeEditorCallbacks {
  /** Une fois, avant toute mutation : point d'accroche pour capturer un instantané "avant" (undo). */
  onDragStart?: () => void;
  /** À chaque frame du glisser-déposer : rendu en direct. */
  onChange: () => void;
  /** Une fois, au relâchement : point d'accroche pour persister le résultat final. */
  onDragEnd?: () => void;
  /** Double-clic sur une ancre : demande la suppression de ce nœud. */
  onRemoveNode?: (index: number) => void;
  /** Tap (pointerdown+up sans glisser) sur une ancre : bascule ce nœud lisse/coin. */
  onToggleCorner?: (index: number) => void;
}

export class NodeEditor {
  private svg: SVGSVGElement;
  private overlay: SVGGElement;
  private nodes: EditableNode[] = [];
  private elements: NodeElements[] = [];
  private callbacks: NodeEditorCallbacks | null = null;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
    this.overlay = document.createElementNS(SVG_NS, "g");
    this.overlay.setAttribute("id", "node-editor");
    this.svg.appendChild(this.overlay);
  }

  show(nodes: EditableNode[], callbacks: NodeEditorCallbacks): void {
    this.nodes = nodes;
    this.callbacks = callbacks;
    this.rebuild();
  }

  hide(): void {
    this.nodes = [];
    this.elements = [];
    this.callbacks = null;
    this.overlay.replaceChildren();
  }

  get isVisible(): boolean {
    return this.nodes.length > 0;
  }

  private rebuild(): void {
    this.overlay.replaceChildren();
    this.elements = this.nodes.map((_, i) => {
      const lineIn = this.makeLine();
      const lineOut = this.makeLine();
      const handleIn = this.makeHandle(i, "handleIn");
      const handleOut = this.makeHandle(i, "handleOut");
      const anchor = this.makeAnchor(i);
      this.overlay.append(lineIn, lineOut, handleIn, handleOut, anchor);
      return { lineIn, lineOut, handleIn, handleOut, anchor };
    });
    this.syncPositions();
  }

  /** Repositionne les éléments DOM existants d'après l'état courant de `nodes`, sans en recréer aucun. */
  private syncPositions(): void {
    this.nodes.forEach((node, i) => {
      const el = this.elements[i];
      this.setLine(el.lineIn, node.point, node.handleIn);
      this.setLine(el.lineOut, node.point, node.handleOut);
      this.setHandlePos(el.handleIn, node.handleIn);
      this.setHandlePos(el.handleOut, node.handleOut);
      el.anchor.setAttribute("cx", String(node.point.x));
      el.anchor.setAttribute("cy", String(node.point.y));
      el.anchor.classList.toggle("node-anchor-corner", !!node.corner);
    });
  }

  private makeLine(): SVGLineElement {
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("class", "handle-line");
    return line;
  }

  private setLine(line: SVGLineElement, a: Point, b: Point): void {
    line.setAttribute("x1", String(a.x));
    line.setAttribute("y1", String(a.y));
    line.setAttribute("x2", String(b.x));
    line.setAttribute("y2", String(b.y));
  }

  private makeAnchor(index: number): SVGCircleElement {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("class", "node-anchor");
    circle.setAttribute("r", "6");

    // Un tap et le premier clic d'un double-clic sont indiscernables au moment où ils
    // arrivent : la bascule lisse/coin est différée le temps de voir si un second clic
    // (donc un double-clic, qui supprime le nœud à la place) suit dans la foulée.
    let pendingToggle: ReturnType<typeof setTimeout> | null = null;

    this.attachDrag(
      circle,
      (delta) => {
        const n = this.nodes[index];
        n.point.x += delta.x;
        n.point.y += delta.y;
        n.handleIn.x += delta.x;
        n.handleIn.y += delta.y;
        n.handleOut.x += delta.x;
        n.handleOut.y += delta.y;
      },
      () => {
        // Comme dans attachDrag : si une autre interaction reconstruit l'overlay avant que
        // ce délai n'expire (ex. suppression d'un autre nœud entre-temps), `index` ne
        // désignerait plus le bon nœud dans le nouveau tableau — on abandonne proprement.
        const nodesAtTapStart = this.nodes;
        pendingToggle = setTimeout(() => {
          pendingToggle = null;
          if (this.nodes !== nodesAtTapStart) return;
          this.callbacks?.onToggleCorner?.(index);
        }, ANCHOR_TAP_DELAY);
      },
    );
    circle.addEventListener("dblclick", (e: MouseEvent) => {
      e.stopPropagation();
      if (pendingToggle !== null) {
        clearTimeout(pendingToggle);
        pendingToggle = null;
      }
      this.callbacks?.onRemoveNode?.(index);
    });
    return circle;
  }

  private makeHandle(index: number, which: HandleKey): SVGRectElement {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("class", "node-handle");
    rect.setAttribute("width", "10");
    rect.setAttribute("height", "10");
    this.attachDrag(rect, (delta) => {
      const n = this.nodes[index];
      const h = n[which];
      h.x += delta.x;
      h.y += delta.y;
      // Nœud « coin » : les poignées sont volontairement indépendantes, pas de miroir.
      if (n.corner) return;
      const mirror = which === "handleIn" ? n.handleOut : n.handleIn;
      mirror.x = n.point.x - (h.x - n.point.x);
      mirror.y = n.point.y - (h.y - n.point.y);
    });
    return rect;
  }

  private setHandlePos(rect: SVGRectElement, p: Point): void {
    const s = 5;
    rect.setAttribute("x", String(p.x - s));
    rect.setAttribute("y", String(p.y - s));
  }

  /** `onTap`, si fourni, se déclenche pour un pointerdown+up sans glisser (un simple clic/tap) — libre jusqu'ici, puisque `applyDelta` n'est alors jamais appelé. */
  private attachDrag(el: SVGGraphicsElement, applyDelta: (delta: Point) => void, onTap?: () => void): void {
    el.addEventListener("pointerdown", (e: PointerEvent) => {
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      // Référence figée au tableau de nœuds actif au démarrage du drag : si hide()/show()
      // en installe un autre entre-temps (sélection changée, undo, effacement...), la
      // comparaison ci-dessous permet d'abandonner proprement plutôt que de continuer à
      // muter un tableau qui n'est plus celui affiché.
      const nodesAtDragStart = this.nodes;
      let last = svgPointFromEvent(this.svg, e);
      let moved = false;

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId || this.nodes !== nodesAtDragStart) return;
        if (!moved) {
          moved = true;
          this.callbacks?.onDragStart?.();
        }
        const cur = svgPointFromEvent(this.svg, ev);
        applyDelta({ x: cur.x - last.x, y: cur.y - last.y });
        last = cur;
        this.syncPositions();
        this.callbacks?.onChange();
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        if (this.nodes !== nodesAtDragStart) return;
        if (moved) this.callbacks?.onDragEnd?.();
        else onTap?.();
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
    });
  }
}
