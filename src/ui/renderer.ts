import type { Point } from "../core/types";
import type { BrushPlacement } from "../core/brush";
import { getMotif } from "../assets/motifs";
import { attachStemDrag, type StemDragCallbacks } from "./pointerCapture";

const SVG_NS = "http://www.w3.org/2000/svg";

function pointsToPolylineAttr(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

interface VineGroup {
  group: SVGGElement;
  stem: SVGPathElement;
  leavesLayer: SVGGElement;
}

export interface ExportCluster {
  /** Contour de tige déjà fusionné (une seule liane, ou plusieurs à une jonction en Y — voir junction.ts). */
  stemPathD: string;
  /** Les feuilles restent groupées par liane d'origine, même au sein d'une grappe fusionnée. */
  leafGroups: BrushPlacement[][];
}

function createLeafElement(leaf: BrushPlacement): SVGPathElement {
  const motif = getMotif(leaf.motifId);
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("class", `motif-instance ${motif.className}`);
  path.setAttribute("d", motif.pathD);
  const deg = (leaf.angle * 180) / Math.PI;
  const scale = leaf.scale * motif.scaleFactor;
  path.setAttribute("transform", `translate(${leaf.position.x},${leaf.position.y}) rotate(${deg}) scale(${scale})`);
  return path;
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

  /**
   * Crée une nouvelle liane vide et retourne son identifiant. `callbacks`
   * gère les gestes sur sa tige : un tap la sélectionne pour édition, un
   * drag en tire une branche (voir `attachStemDrag`).
   */
  createVine(callbacks: StemDragCallbacks): string {
    const id = `vine-${this.nextId++}`;
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "vine");
    group.dataset.vineId = id;

    const stemLayer = document.createElementNS(SVG_NS, "g");
    stemLayer.setAttribute("class", "layer-stem");
    const stem = document.createElementNS(SVG_NS, "path");
    stem.setAttribute("class", "stem-path");
    attachStemDrag(this.svg, stem, callbacks);
    // Garde pour le mode "point par point", qui écoute "click" plutôt que "pointerdown" :
    // un tap sur la tige ne doit pas aussi poser un nœud de tracé.
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
      vine.leavesLayer.appendChild(createLeafElement(leaf));
    }
  }

  clear(): void {
    this.vinesLayer.replaceChildren();
    this.vines.clear();
    this.setLiveStroke(null);
  }

  /**
   * Construit un document SVG autonome à partir de grappes déjà fusionnées
   * (une grappe = une liane racine et ses branches, contour de tige unique) —
   * reconstruit depuis les données plutôt que cloné depuis le DOM live,
   * puisque l'affichage en direct garde une tige distincte par liane (pour
   * la sélection au clic) alors que l'export doit livrer un contour soudé,
   * sans double-trait à la jonction. Voir junction.ts.
   */
  exportSVG(clusters: ExportCluster[]): string {
    const rect = this.svg.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("xmlns", SVG_NS);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const vinesLayer = document.createElementNS(SVG_NS, "g");
    vinesLayer.setAttribute("id", "vines");
    svg.appendChild(vinesLayer);

    for (const cluster of clusters) {
      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", "vine");

      const stemLayer = document.createElementNS(SVG_NS, "g");
      stemLayer.setAttribute("class", "layer-stem");
      const stem = document.createElementNS(SVG_NS, "path");
      stem.setAttribute("class", "stem-path");
      stem.setAttribute("d", cluster.stemPathD);
      stemLayer.appendChild(stem);
      group.appendChild(stemLayer);

      for (const leaves of cluster.leafGroups) {
        const leavesLayer = document.createElementNS(SVG_NS, "g");
        leavesLayer.setAttribute("class", "layer-leaves");
        for (const leaf of leaves) {
          leavesLayer.appendChild(createLeafElement(leaf));
        }
        group.appendChild(leavesLayer);
      }

      vinesLayer.appendChild(group);
    }

    return new XMLSerializer().serializeToString(svg);
  }
}
