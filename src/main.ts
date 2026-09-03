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

const MIN_EPSILON = 0.5; // px : beaucoup de points, suit la main de très près
const MAX_EPSILON = 12; // px : très simplifié, peu de points
const BRANCH_SNAP_RADIUS = 16; // px : distance sous laquelle un nouveau tracé s'accroche à une liane existante
const STORAGE_KEY = "vignes-arabesques:canvas-v1";
const UNDO_LIMIT = 50;

function newVineId(): string {
  return `vine-${nextVineId++}`;
}

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

/** Recalcule tige+feuilles d'une liane à partir de ses nœuds courants, met en cache le résultat (params/curve/polygone/feuilles, réutilisés tels quels à l'export et à la persistance) et rafraîchit son rendu. */
function regenerateAndRender(id: string): void {
  const vine = vines.get(id);
  if (!vine) return;
  const params: VineParams = { ...currentParams(), taperStart: !vine.parentId, taperEnd: true };
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
    onChange: () => regenerateAndRender(id),
    onDragEnd: () => saveToStorage(),
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
  vines.set(id, { nodes, parentId, params: currentParams(), curve: [], stemPolygon: [], leaves: [] });
  regenerateAndRender(id);
  selectVine(id);
  saveToStorage();
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
// Pas d'étape d'annulation dédiée pour ces réglages (trop fréquents pour être pertinents en undo),
// mais le résultat est bien persisté.
function refreshSelectedVine(): void {
  if (!selectedId) return;
  regenerateAndRender(selectedId);
  saveToStorage();
}

for (const input of [spacingInput, scaleInput, jitterInput, thicknessInput]) {
  input.addEventListener("input", refreshSelectedVine);
}
for (const checkbox of Object.values(motifCheckboxes)) {
  checkbox.addEventListener("change", refreshSelectedVine);
}

clearButton.addEventListener("click", () => {
  if (vines.size === 0) return;
  pushUndo();
  renderer.clear();
  vines.clear();
  deselect();
  pendingClickPoints = [];
  saveToStorage();
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
//
// Chaque liane n'a besoin de conserver que ses nœuds, sa liane parente
// éventuelle et les paramètres utilisés pour la générer : tout le reste
// (curve, polygone de tige, feuilles) est dérivé et se recalcule à la
// restauration. Un instantané est donc juste la liste sérialisée de ces
// triplets — assez petit pour être dupliqué tel quel (chaîne JSON) à
// chaque étape d'annulation, sans jamais risquer d'alias entre l'état
// affiché et une entrée de l'historique.

interface SerializedVine {
  id: string;
  nodes: EditableNode[];
  parentId?: string;
  params: VineParams;
}

let undoStack: string[] = [];
let redoStack: string[] = [];

function snapshot(): string {
  const list: SerializedVine[] = [...vines].map(([id, v]) => ({
    id,
    nodes: v.nodes,
    parentId: v.parentId,
    params: v.params,
  }));
  return JSON.stringify(list);
}

function loadVines(list: SerializedVine[]): void {
  renderer.clear();
  vines.clear();
  deselect();
  for (const v of list) {
    wireVine(v.id);
    vines.set(v.id, { nodes: v.nodes, parentId: v.parentId, params: v.params, curve: [], stemPolygon: [], leaves: [] });
    regenerateAndRender(v.id);
  }
}

function updateUndoRedoButtons(): void {
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

/** À appeler juste avant toute mutation structurelle (nouvelle liane, déplacement de nœud, effacement). */
function pushUndo(): void {
  undoStack.push(snapshot());
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack = [];
  updateUndoRedoButtons();
}

function undo(): void {
  if (undoStack.length === 0) return;
  redoStack.push(snapshot());
  const prev = undoStack.pop()!;
  loadVines(JSON.parse(prev));
  saveToStorage();
  updateUndoRedoButtons();
}

function redo(): void {
  if (redoStack.length === 0) return;
  undoStack.push(snapshot());
  const next = redoStack.pop()!;
  loadVines(JSON.parse(next));
  saveToStorage();
  updateUndoRedoButtons();
}

function saveToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, snapshot());
  } catch {
    // Stockage indisponible (navigation privée, quota dépassé...) : tant pis, pas fatal.
  }
}

function loadFromStorage(): SerializedVine[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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

const restored = loadFromStorage();
if (restored && restored.length > 0) {
  loadVines(restored);
  // La reprise depuis le stockage local n'est pas elle-même une action annulable.
  nextVineId = restored.reduce((max, v) => Math.max(max, Number(v.id.split("-")[1]) || 0), 0) + 1;
}
updateUndoRedoButtons();
setMode("freehand");
