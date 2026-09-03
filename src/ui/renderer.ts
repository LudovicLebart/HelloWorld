import type { Point } from "../core/types";
import type { BrushPlacement } from "../core/brush";
import { LEAF_PATH_D } from "../assets/leaf";

const SVG_NS = "http://www.w3.org/2000/svg";

function pointsToPolylineAttr(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

interface VineGroup {
  group: SVGGElement;
  stem: SVGPathElement;
  leavesLayer: SVGGElement;
}

export class Renderer {
  private svg: SVGSVGElement;
  private vinesLayer: SVGGElement;
  private liveStroke: SVGPolylineElement;
  private vines = new Map<string, VineGroup>();
  private nextId = 1;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
    this.vinesLayer = document.createElementNS(SVG_NS, "g");
    this.vinesLayer.setAttribute("id", "vines");
    this.svg.appendChild(this.vinesLayer);

    this.liveStroke = document.createElementNS(SVG_NS, "polyline");
    this.liveStroke.setAttribute("class", "live-stroke");
    this.svg.appendChild(this.liveStroke);
  }

  setLiveStroke(points: Point[] | null): void {
    this.liveStroke.setAttribute("points", points ? pointsToPolylineAttr(points) : "");
  }

  /** Crée une nouvelle liane vide et retourne son identifiant ; `onSelect` est appelé au clic sur sa tige. */
  createVine(onSelect: () => void): string {
    const id = `vine-${this.nextId++}`;
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "vine");
    group.dataset.vineId = id;

    const stemLayer = document.createElementNS(SVG_NS, "g");
    stemLayer.setAttribute("class", "layer-stem");
    const stem = document.createElementNS(SVG_NS, "path");
    stem.setAttribute("class", "stem-path");
    // pointerdown : sélectionne sans laisser le tracé libre démarrer un nouveau tracé.
    // click : même garde pour le mode "point par point", qui écoute "click" plutôt que "pointerdown".
    stem.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      onSelect();
    });
    stem.addEventListener("click", (e) => e.stopPropagation());
    stemLayer.appendChild(stem);

    const leavesLayer = document.createElementNS(SVG_NS, "g");
    leavesLayer.setAttribute("class", "layer-leaves");

    group.appendChild(stemLayer);
    group.appendChild(leavesLayer);
    this.vinesLayer.appendChild(group);

    this.vines.set(id, { group, stem, leavesLayer });
    return id;
  }

  /** Remplace le contenu (tige + feuilles) d'une liane existante — appelé à chaque édition de ses nœuds. */
  updateVine(id: string, stemPathD: string, leaves: BrushPlacement[]): void {
    const vine = this.vines.get(id);
    if (!vine) return;

    vine.stem.setAttribute("d", stemPathD);

    vine.leavesLayer.replaceChildren();
    for (const leaf of leaves) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", "leaf-instance");
      path.setAttribute("d", LEAF_PATH_D);
      const deg = (leaf.angle * 180) / Math.PI;
      path.setAttribute(
        "transform",
        `translate(${leaf.position.x},${leaf.position.y}) rotate(${deg}) scale(${leaf.scale})`,
      );
      vine.leavesLayer.appendChild(path);
    }
  }

  clear(): void {
    this.vinesLayer.replaceChildren();
    this.vines.clear();
    this.setLiveStroke(null);
  }

  /** Sérialise le canevas en SVG autonome, prêt pour l'export (calques Tige / Feuilles séparés). */
  exportSVG(): string {
    const clone = this.svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll(".live-stroke, #node-editor").forEach((el) => el.remove());
    clone.setAttribute("xmlns", SVG_NS);

    const rect = this.svg.getBoundingClientRect();
    clone.setAttribute("width", String(Math.round(rect.width)));
    clone.setAttribute("height", String(Math.round(rect.height)));
    clone.setAttribute("viewBox", `0 0 ${Math.round(rect.width)} ${Math.round(rect.height)}`);

    return new XMLSerializer().serializeToString(clone);
  }
}
