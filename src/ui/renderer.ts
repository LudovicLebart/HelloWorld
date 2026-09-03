import type { Point } from "../core/types";
import type { BrushPlacement } from "../core/brush";
import { LEAF_PATH_D } from "../assets/leaf";

const SVG_NS = "http://www.w3.org/2000/svg";

function pointsToPolylineAttr(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

export class Renderer {
  private svg: SVGSVGElement;
  private vinesLayer: SVGGElement;
  private liveStroke: SVGPolylineElement;

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

  /** Ajoute une liane complète (tige + feuilles) comme groupe dans le calque des lianes. */
  addVine(stemPathD: string, leaves: BrushPlacement[]): SVGGElement {
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "vine");

    const stemLayer = document.createElementNS(SVG_NS, "g");
    stemLayer.setAttribute("class", "layer-stem");
    const stem = document.createElementNS(SVG_NS, "path");
    stem.setAttribute("class", "stem-path");
    stem.setAttribute("d", stemPathD);
    stemLayer.appendChild(stem);

    const leavesLayer = document.createElementNS(SVG_NS, "g");
    leavesLayer.setAttribute("class", "layer-leaves");
    for (const leaf of leaves) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", "leaf-instance");
      path.setAttribute("d", LEAF_PATH_D);
      const deg = (leaf.angle * 180) / Math.PI;
      path.setAttribute(
        "transform",
        `translate(${leaf.position.x},${leaf.position.y}) rotate(${deg}) scale(${leaf.scale})`,
      );
      leavesLayer.appendChild(path);
    }

    group.appendChild(stemLayer);
    group.appendChild(leavesLayer);
    this.vinesLayer.appendChild(group);
    return group;
  }

  clear(): void {
    this.vinesLayer.replaceChildren();
    this.setLiveStroke(null);
  }

  /** Sérialise le canevas en SVG autonome, prêt pour l'export (calques Tige / Feuilles séparés). */
  exportSVG(): string {
    const clone = this.svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll(".live-stroke").forEach((el) => el.remove());
    clone.setAttribute("xmlns", SVG_NS);

    const rect = this.svg.getBoundingClientRect();
    clone.setAttribute("width", String(Math.round(rect.width)));
    clone.setAttribute("height", String(Math.round(rect.height)));
    clone.setAttribute("viewBox", `0 0 ${Math.round(rect.width)} ${Math.round(rect.height)}`);

    return new XMLSerializer().serializeToString(clone);
  }
}
