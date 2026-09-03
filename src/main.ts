import "./style.css";
import type { CurveSample, EditableNode, Point } from "./core/types";
import type { BrushPlacement } from "./core/brush";
import {
  nodesFromStroke,
  nodesFromClicks,
  regenerateVine,
  serializeVines,
  deserializeVines,
  type VineParams,
} from "./core/vine";
import { unionStemPolygons } from "./core/junction";
import { SnapshotHistory } from "./core/history";
import { saveToStorage as persistSnapshot, loadFromStorage as readPersistedSnapshot } from "./core/persistence";
import { attachPointerCapture, attachClickToPlace } from "./ui/pointerCapture";
import { Renderer, type ExportCluster } from "./ui/renderer";
import { NodeEditor } from "./ui/nodeEditor";
import { STORAGE_KEY, UNDO_LIMIT, BRANCH_SNAP_RADIUS, DENSITY_EPSILON_RANGE } from "./config";

const svg = document.querySelector<SVGSVGElement>("#canvas")!;
const renderer = new Renderer(svg);
const nodeEditor = new NodeEditor(svg);
const history = new SnapshotHistory(UNDO_LIMIT);

const spacingInput = document.querySelector<HTMLInputElement>("#spacing")!;
const scaleInput = document.querySelector<HTMLInputElement>("#scale")!;
const jitterInput = document.querySelector<HTMLInputElement>("#jitter")!;
const thicknessInput = document.querySelector<HTMLInputElement>("#thickness")!;
const densityInput = document.querySelector<HTMLInputElement>("#density")!;
const clearButton = document.querySelector<HTMLButtonElement>("#clear")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const undoButton = document.querySelector<HTMLButtonElement>("#undo")!;
const redoButton = document.querySelector<HTMLButtonElement>("#redo")!;
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
  /** Paramètres utilisés lors du dernier rendu — mis en cache pour que l'export et la persistance
      correspondent exactement à ce qui est affiché, même si les curseurs ont changé depuis. */
  params: VineParams;
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
let nextVineId = 1;

function newVineId(): string {
  return `vine-${nextVineId++}`;
}

function currentEpsilon(): number {
  const density = Number(densityInput.value); // 0 (épars) .. 100 (dense)
  const { min, max } = DENSITY_EPSILON_RANGE;
  return max - (density / 100) * (max - min);
}

function currentSequence(): string[] {
  const active = (Object.keys(motifCheckboxes) as Array<keyof typeof motifCheckboxes>).filter(
    (id) => motifCheckboxes[id].checked,
  );
  return active.length > 0 ? active : ["leaf"];
}

/** Les paramètres tels que les curseurs les affichent *maintenant* — pour une liane en cours de création ou d'édition live. */
function liveParams(parentId: string | undefined): VineParams {
  return {
    stemWidth: Number(thicknessInput.value),
    brush: {
      spacing: Number(spacingInput.value),
      baseScale: Number(scaleInput.value),
      jitter: Number(jitterInput.value) / 100,
      sequence: currentSequence(),
    },
    taperStart: !parentId,
    taperEnd: true,
  };
}

/**
 * Recalcule tige+feuilles d'une liane à partir de ses nœuds courants et des
 * `params` fournis explicitement, met en cache le résultat (curve/polygone/
 * feuilles/params, réutilisés tels quels à l'export et à la persistance) et
 * rafraîchit son rendu.
 *
 * `params` n'est jamais relu implicitement depuis les curseurs ici : c'est
 * à l'appelant de fournir soit `liveParams(...)` (création, édition en
 * direct — reflète les curseurs actuels), soit des params historiques
 * restaurés (undo/redo, reprise depuis le stockage local) — sans quoi
 * restaurer un instantané se ferait écraser aussitôt par les valeurs
 * actuelles des curseurs.
 */
function regenerateAndRender(id: string, params: VineParams): void {
  const vine = vines.get(id);
  if (!vine) return;
  const { curve, stemPolygon, stemPathD, leaves } = regenerateVine(vine.nodes, params);
  vine.params = params;
  vine.curve = curve;
  vine.stemPolygon = stemPolygon;
  vine.leaves = leaves;
  renderer.updateVine(id, stemPathD, leaves);
}

/** Cherche le point le plus proche sur une liane existante : sert d'accroche de secours pour un tracé qui démarre près d'une liane sans toucher sa tige. */
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
  nodeEditor.show(vine.nodes, {
    onDragStart: () => pushUndo(),
    onChange: () => regenerateAndRender(id, liveParams(vine.parentId)),
    onDragEnd: () => saveSnapshot(),
  });
}

/** Câble les gestes de la tige (tap = sélection, drag = nouvelle branche) — partagé entre création et restauration d'un instantané. */
function wireVine(id: string): void {
  renderer.createVine(id, {
    onTap: () => selectVine(id),
    onBranchMove: (points) => renderer.setLiveStroke(points),
    onBranchEnd: (points) => {
      renderer.setLiveStroke(null);
      createVineFromNodes(nodesFromStroke(points, currentEpsilon()), id);
    },
  });
}

function createVineFromNodes(nodes: EditableNode[], parentId?: string): void {
  if (nodes.length < 2) return;
  pushUndo();
  const id = newVineId();
  wireVine(id);
  const params = liveParams(parentId);
  vines.set(id, { nodes, parentId, params, curve: [], stemPolygon: [], leaves: [] });
  regenerateAndRender(id, params);
  selectVine(id);
  saveSnapshot();
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

// Ajuster un curseur ou une case à cocher met à jour la liane sélectionnée en direct
// (édition non-destructive). Pas d'étape d'annulation dédiée pour ces réglages (trop
// fréquents pour être pertinents en undo) ; la sauvegarde, elle, est différée jusqu'au
// relâchement ("change") pour un curseur — pas à chaque frame de glissement ("input").
function refreshSelectedVine(): void {
  if (!selectedId) return;
  const vine = vines.get(selectedId);
  if (!vine) return;
  regenerateAndRender(selectedId, liveParams(vine.parentId));
}

for (const input of [spacingInput, scaleInput, jitterInput, thicknessInput]) {
  input.addEventListener("input", refreshSelectedVine);
  input.addEventListener("change", () => saveSnapshot());
}
for (const checkbox of Object.values(motifCheckboxes)) {
  checkbox.addEventListener("change", () => {
    refreshSelectedVine();
    saveSnapshot();
  });
}

clearButton.addEventListener("click", () => {
  if (vines.size === 0) return;
  pushUndo();
  renderer.clear();
  vines.clear();
  deselect();
  pendingClickPoints = [];
  saveSnapshot();
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

// --- Annuler/rétablir + sauvegarde locale ------------------------------

/** Reconstruit tout le canevas à partir d'un instantané validé — nœuds ET params historiques, jamais les curseurs actuels (voir regenerateAndRender). */
function loadVines(list: ReturnType<typeof deserializeVines>): void {
  if (!list) return;
  renderer.clear();
  vines.clear();
  deselect();
  for (const v of list) {
    wireVine(v.id);
    vines.set(v.id, { nodes: v.nodes, parentId: v.parentId, params: v.params, curve: [], stemPolygon: [], leaves: [] });
    regenerateAndRender(v.id, v.params);
  }
}

function snapshot(): string {
  return serializeVines(vines);
}

function updateUndoRedoButtons(): void {
  undoButton.disabled = !history.canUndo;
  redoButton.disabled = !history.canRedo;
}

/** À appeler juste avant toute mutation structurelle (nouvelle liane, déplacement de nœud, effacement). */
function pushUndo(): void {
  history.push(snapshot());
  updateUndoRedoButtons();
}

function undo(): void {
  const prev = history.undo(snapshot());
  if (!prev) return;
  loadVines(deserializeVines(prev));
  saveSnapshot();
  updateUndoRedoButtons();
}

function redo(): void {
  const next = history.redo(snapshot());
  if (!next) return;
  loadVines(deserializeVines(next));
  saveSnapshot();
  updateUndoRedoButtons();
}

function saveSnapshot(): void {
  persistSnapshot(STORAGE_KEY, snapshot());
}

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
window.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  if (e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
    e.preventDefault();
    redo();
  }
});

// Reprise depuis le stockage local — jamais elle-même une action annulable. Une donnée
// corrompue ou de forme incompatible est déjà écartée par deserializeVines (→ null) ;
// on protège aussi contre un échec plus tardif dans la régénération (nœuds valides en
// forme mais géométriquement dégénérés, etc.) pour ne jamais empêcher setMode() de
// s'exécuter — sans quoi l'app démarrerait avec le tracé non câblé, inutilisable.
const restored = deserializeVines(readPersistedSnapshot(STORAGE_KEY) ?? "");
if (restored && restored.length > 0) {
  try {
    loadVines(restored);
    nextVineId = restored.reduce((max, v) => Math.max(max, Number(v.id.split("-")[1]) || 0), 0) + 1;
  } catch {
    renderer.clear();
    vines.clear();
  }
}
updateUndoRedoButtons();
setMode("freehand");
