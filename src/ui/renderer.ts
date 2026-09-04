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
  path.setAttribute("class", `motif-instance ${motif.className ?? ""}`.trim());
  path.setAttribute("d", motif.pathD);
  // Un motif interne résout sa couleur via sa classe CSS (voir style.css) ; un motif
  // chargé depuis un .svg externe n'a pas de règle dédiée, sa couleur est portée
  // directement par le motif (voir assets/motifs.ts).
  if (motif.fill) path.setAttribute("fill", motif.fill);
  const deg = (leaf.angle * 180) / Math.PI;
  const scale = leaf.scale * motif.scaleFactor;
  path.setAttribute("transform", `translate(${leaf.position.x},${leaf.position.y}) rotate(${deg}) scale(${scale})`);
  return path;
}

const MASK_CLIP_PATH_ID = "vines-mask-clip";

export class Renderer {
  private svg: SVGSVGElement;
  private vinesLayer: SVGGElement;
  private liveStroke: SVGPolylineElement;
  private maskClipShape: SVGPolygonElement;
  private maskOutline: SVGPolygonElement;
  private vines = new Map<string, VineGroup>();

  constructor(svg: SVGSVGElement) {
    this.svg = svg;

    const defs = document.createElementNS(SVG_NS, "defs");
    const clipPath = document.createElementNS(SVG_NS, "clipPath");
    clipPath.setAttribute("id", MASK_CLIP_PATH_ID);
    this.maskClipShape = document.createElementNS(SVG_NS, "polygon");
    clipPath.appendChild(this.maskClipShape);
    defs.appendChild(clipPath);
    this.svg.appendChild(defs);

    this.vinesLayer = document.createElementNS(SVG_NS, "g");
    this.vinesLayer.setAttribute("id", "vines");
    this.svg.appendChild(this.vinesLayer);

    this.maskOutline = document.createElementNS(SVG_NS, "polygon");
    this.maskOutline.setAttribute("class", "mask-outline");
    this.maskOutline.setAttribute("hidden", "");
    this.svg.appendChild(this.maskOutline);

    this.liveStroke = document.createElementNS(SVG_NS, "polyline");
    this.liveStroke.setAttribute("class", "live-stroke");
    this.svg.appendChild(this.liveStroke);
  }

  setLiveStroke(points: Point[] | null): void {
    this.liveStroke.setAttribute("points", points ? pointsToPolylineAttr(points) : "");
  }

  /**
   * Définit (ou retire) la zone de travail : les lianes affichées sont
   * recadrées en direct via `clip-path` (pas de recalcul de géométrie à
   * chaque frame). L'export, lui, découpe réellement les contours par
   * intersection booléenne — voir junction.ts — pour ne jamais dépendre
   * d'un `clip-path` que tous les logiciels de découpe ne savent pas lire.
   */
  setMask(polygon: Point[] | null): void {
    if (polygon && polygon.length >= 3) {
      const attr = pointsToPolylineAttr(polygon);
      this.maskClipShape.setAttribute("points", attr);
      this.maskOutline.setAttribute("points", attr);
      this.maskOutline.removeAttribute("hidden");
      this.vinesLayer.setAttribute("clip-path", `url(#${MASK_CLIP_PATH_ID})`);
    } else {
      this.maskOutline.setAttribute("hidden", "");
      this.vinesLayer.removeAttribute("clip-path");
    }
  }

  /**
   * Crée une nouvelle liane vide sous l'identifiant fourni par l'appelant
   * (qui doit rester stable pour un instantané restauré — undo/redo,
   * rechargement depuis le stockage local). `callbacks` gère les gestes sur
   * sa tige : un tap la sélectionne pour édition, un drag en tire une
   * branche (voir `attachStemDrag`).
   */
  createVine(id: string, callbacks: StemDragCallbacks): void {
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

  /** Retire une seule liane du canevas (groupe SVG et gestes attachés) — sert par exemple à
      remplacer un lot de volutes auto-générées par un nouveau plutôt que de l'empiler, voir
      generateAutoBranches() dans main.ts. Sans effet si l'id est déjà absent. */
  removeVine(id: string): void {
    const vine = this.vines.get(id);
    if (!vine) return;
    vine.group.remove();
    this.vines.delete(id);
  }

  /**
   * Construit un document SVG autonome à partir de grappes déjà fusionnées
   * (une grappe = une liane racine et ses branches, contour de tige unique) —
   * reconstruit depuis les données plutôt que cloné depuis le DOM live,
   * puisque l'affichage en direct garde une tige distincte par liane (pour
   * la sélection au clic) alors que l'export doit livrer un contour soudé,
   * sans double-trait à la jonction. Voir junction.ts.
   *
   * Contrairement à l'affichage en direct (groupé par liane, pour la
   * sélection au clic), l'export regroupe TOUTES les tiges de TOUTES les
   * grappes dans un unique calque `#layer-stem`, et sépare les motifs par
   * type — un calque `#layer-<motifId>` par motif effectivement utilisé
   * (`#layer-leaf`, `#layer-volute`, ...), plutôt qu'un unique calque
   * mélangeant tous les motifs — pour pouvoir découper en un seul lot tout
   * ce qui va dans un même matériau, sans avoir à regrouper manuellement
   * liane par liane ni trier motif par motif dans le logiciel de découpe.
   * Voir docs/how-to/exporter-pour-cnc-laser.md.
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

    const stemLayer = document.createElementNS(SVG_NS, "g");
    stemLayer.setAttribute("id", "layer-stem");
    const leafLayersByMotif = new Map<string, SVGGElement>();

    function leafLayerFor(motifId: string): SVGGElement {
      let layer = leafLayersByMotif.get(motifId);
      if (!layer) {
        layer = document.createElementNS(SVG_NS, "g");
        layer.setAttribute("id", `layer-${motifId}`);
        leafLayersByMotif.set(motifId, layer);
      }
      return layer;
    }

    for (const cluster of clusters) {
      const stem = document.createElementNS(SVG_NS, "path");
      stem.setAttribute("class", "stem-path");
      stem.setAttribute("d", cluster.stemPathD);
      stemLayer.appendChild(stem);

      for (const leaves of cluster.leafGroups) {
        for (const leaf of leaves) {
          leafLayerFor(leaf.motifId).appendChild(createLeafElement(leaf));
        }
      }
    }

    svg.appendChild(stemLayer);
    for (const layer of leafLayersByMotif.values()) svg.appendChild(layer);

    return new XMLSerializer().serializeToString(svg);
  }
}
