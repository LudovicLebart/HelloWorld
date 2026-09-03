import "./style.css";
import type { CurveSample, EditableNode, Point } from "./core/types";
import type { BrushPlacement } from "./core/brush";
import { nodesFromStroke, nodesFromClicks, regenerateVine, type VineParams } from "./core/vine";
import { unionStemPolygons } from "./core/junction";
import { attachPointerCapture, attachClickToPlace } from "./ui/pointerCapture";
import { Renderer, type ExportCluster } from "./ui/renderer";
import { NodeEditor } from "./ui/nodeEditor";

const svg = document.querySelector<SVGSVGElement>("#canvas")!;
const renderer = new Renderer(svg);
const nodeEditor = new NodeEditor(svg);

const spacingInput = document.querySelector<HTMLInputElement>("#spacing")!;
const scaleInput = document.querySelector<HTMLInputElement>("#scale")!;
const jitterInput = document.querySelector<HTMLInputElement>("#jitter")!;
const thicknessInput = document.querySelector<HTMLInputElement>("#thickness")!;
const densityInput = document.querySelector<HTMLInputElement>("#density")!;
const clearButton = document.querySelector<HTMLButtonElement>("#clear")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const modeFreehandButton = document.querySelector<HTMLButtonElement>("#mode-freehand")!;
const modePointsButton = document.querySelector<HTMLButtonElement>("#mode-points")!;
const finishButton = document.querySelector<HTMLButtonElement>("#finish-points")!;
const motifCheckboxes = {
  leaf: document.querySelector<HTMLInputElement>("#motif-leaf")!,
  volute: document.querySelector<HTMLInputElement>("#motif-volute")!,
  flower: document.querySelector<HTMLInputElement>("#motif-flower")!,
};

type Mode = "freehand" | "points";

interface VineState {
  nodes: EditableNode[];
  /** Liane dont celle-ci est une branche, le cas échéant — voir findAttachment(). */
  parentId?: string;
  /** Dernier rendu généré : mis en cache pour éviter tout recalcul (donc tout écart) entre l'écran et l'export. */
  curve: CurveSample[];
  stemPolygon: Point[];
  leaves: BrushPlacement[];
}

const vines = new Map<string, VineState>();
let selectedId: string | null = null;
let pendingClickPoints: Point[] = [];
let pendingParentId: string | null = null;
let pendingSnapPoint: Point | null = null;
let detachInteraction: () => void = () => {};

const MIN_EPSILON = 0.5; // px : beaucoup de points, suit la main de très près
const MAX_EPSILON = 12; // px : très simplifié, peu de points
const BRANCH_SNAP_RADIUS = 16; // px : distance sous laquelle un nouveau tracé s'accroche à une liane existante

function currentEpsilon(): number {
  const density = Number(densityInput.value); // 0 (épars) .. 100 (dense)
  return MAX_EPSILON - (density / 100) * (MAX_EPSILON - MIN_EPSILON);
}

function currentSequence(): string[] {
  const active = (Object.keys(motifCheckboxes) as Array<keyof typeof motifCheckboxes>).filter(
    (id) => motifCheckboxes[id].checked,
  );
  return active.length > 0 ? active : ["leaf"];
}

function currentParams(): VineParams {
  return {
    stemWidth: Number(thicknessInput.value),
    brush: {
      spacing: Number(spacingInput.value),
      baseScale: Number(scaleInput.value),
      jitter: Number(jitterInput.value) / 100,
      sequence: currentSequence(),
    },
  };
}

/** Recalcule tige+feuilles d'une liane à partir de ses nœuds courants, met en cache le résultat (curve/polygone/feuilles, réutilisés tels quels à l'export) et rafraîchit son rendu. */
function regenerateAndRender(id: string): void {
  const vine = vines.get(id);
  if (!vine) return;
  const { curve, stemPolygon, stemPathD, leaves } = regenerateVine(vine.nodes, {
    ...currentParams(),
    taperStart: !vine.parentId,
    taperEnd: true,
  });
  vine.curve = curve;
  vine.stemPolygon = stemPolygon;
  vine.leaves = leaves;
  renderer.updateVine(id, stemPathD, leaves);
}

/** Cherche le point le plus proche sur une liane existante : sert à accrocher le début d'un nouveau tracé pour en faire une branche. */
function findAttachment(point: Point): { parentId: string; point: Point } | null {
  let best: { parentId: string; point: Point; dist: number } | null = null;
  for (const [id, vine] of vines) {
    for (const sample of vine.curve) {
      const dist = Math.hypot(sample.point.x - point.x, sample.point.y - point.y);
      if (dist <= BRANCH_SNAP_RADIUS && (!best || dist < best.dist)) {
        best = { parentId: id, point: sample.point, dist };
      }
    }
  }
  return best ? { parentId: best.parentId, point: best.point } : null;
}

function deselect(): void {
  selectedId = null;
  nodeEditor.hide();
}

function selectVine(id: string): void {
  selectedId = id;
  const vine = vines.get(id);
  if (!vine) return;
  nodeEditor.show(vine.nodes, () => regenerateAndRender(id));
}

function createVineFromNodes(nodes: EditableNode[], parentId?: string): void {
  if (nodes.length < 2) return;
  const id = renderer.createVine({
    onTap: () => selectVine(id),
    // Tirer directement depuis la tige : le geste principal pour créer une
    // branche, bien plus fiable que viser une zone étroite à côté de la
    // tige (le point de départ est alors exactement là où le doigt/la
    // souris a touché la tige parente).
    onBranchMove: (points) => renderer.setLiveStroke(points),
    onBranchEnd: (points) => {
      renderer.setLiveStroke(null);
      createVineFromNodes(nodesFromStroke(points, currentEpsilon()), id);
    },
  });
  vines.set(id, { nodes, parentId, curve: [], stemPolygon: [], leaves: [] });
  regenerateAndRender(id);
  selectVine(id);
}

function finishPointsVine(): void {
  // Un double-clic déclenche aussi un "click" juste avant sur le même point :
  // on retire ce doublon pour ne pas laisser un micro-segment dégénéré en bout de tracé.
  if (pendingClickPoints.length >= 2) {
    const a = pendingClickPoints[pendingClickPoints.length - 1];
    const b = pendingClickPoints[pendingClickPoints.length - 2];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 3) pendingClickPoints.pop();
  }
  renderer.setLiveStroke(null);
  const nodes = nodesFromClicks(pendingClickPoints);
  pendingClickPoints = [];
  createVineFromNodes(nodes, pendingParentId ?? undefined);
  pendingParentId = null;
}

function setMode(next: Mode): void {
  detachInteraction();
  pendingClickPoints = [];
  pendingParentId = null;
  pendingSnapPoint = null;
  renderer.setLiveStroke(null);
  deselect();

  modeFreehandButton.classList.toggle("active", next === "freehand");
  modePointsButton.classList.toggle("active", next === "points");
  finishButton.hidden = next !== "points";

  if (next === "freehand") {
    detachInteraction = attachPointerCapture(svg, {
      onStrokeStart: (point) => {
        deselect();
        const attach = findAttachment(point);
        pendingParentId = attach?.parentId ?? null;
        pendingSnapPoint = attach?.point ?? null;
      },
      onStrokeMove: (points) => renderer.setLiveStroke(points),
      onStrokeEnd: (points) => {
        renderer.setLiveStroke(null);
        // Accroche le tout premier point du tracé exactement sur la liane parente,
        // pour garantir que la racine de la branche s'enfonce bien dans sa tige.
        const raw = pendingSnapPoint ? [pendingSnapPoint, ...points.slice(1)] : points;
        createVineFromNodes(nodesFromStroke(raw, currentEpsilon()), pendingParentId ?? undefined);
        pendingParentId = null;
        pendingSnapPoint = null;
      },
    });
  } else {
    detachInteraction = attachClickToPlace(svg, {
      onAdd: (p) => {
        if (selectedId) deselect();
        if (pendingClickPoints.length === 0) {
          const attach = findAttachment(p);
          pendingParentId = attach?.parentId ?? null;
          p = attach?.point ?? p;
        }
        pendingClickPoints.push(p);
        renderer.setLiveStroke(pendingClickPoints);
      },
      onFinish: () => {
        if (pendingClickPoints.length >= 2) finishPointsVine();
      },
    });
  }
}

modeFreehandButton.addEventListener("click", () => setMode("freehand"));
modePointsButton.addEventListener("click", () => setMode("points"));
finishButton.addEventListener("click", () => {
  if (pendingClickPoints.length >= 2) finishPointsVine();
});

// Ajuster un curseur ou une case à cocher met à jour la liane sélectionnée en direct (édition non-destructive).
function refreshSelectedVine(): void {
  if (selectedId) regenerateAndRender(selectedId);
}

for (const input of [spacingInput, scaleInput, jitterInput, thicknessInput]) {
  input.addEventListener("input", refreshSelectedVine);
}
for (const checkbox of Object.values(motifCheckboxes)) {
  checkbox.addEventListener("change", refreshSelectedVine);
}

clearButton.addEventListener("click", () => {
  renderer.clear();
  vines.clear();
  deselect();
  pendingClickPoints = [];
});

/** Remonte à la liane racine (celle sans parent) d'une chaîne de branches, pour regrouper toute la grappe à l'export. */
function rootOf(id: string): string {
  let current = id;
  const seen = new Set<string>();
  while (true) {
    const vine = vines.get(current);
    if (!vine?.parentId || seen.has(current)) return current;
    seen.add(current);
    current = vine.parentId;
  }
}

/** Groupe les lianes par grappe (racine + ses branches) et fusionne le contour de tige de chaque grappe. */
function buildExportClusters(): ExportCluster[] {
  const grouped = new Map<string, string[]>();
  for (const id of vines.keys()) {
    const root = rootOf(id);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root)!.push(id);
  }

  return [...grouped.values()].map((ids) => {
    const polygons = ids.map((id) => vines.get(id)!.stemPolygon);
    const leafGroups = ids.map((id) => vines.get(id)!.leaves);
    return { stemPathD: unionStemPolygons(polygons), leafGroups };
  });
}

exportButton.addEventListener("click", () => {
  const svgString = renderer.exportSVG(buildExportClusters());
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `liane-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
});

setMode("freehand");
