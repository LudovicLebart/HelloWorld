import "./style.css";
import type { EditableNode, Point } from "./core/types";
import { nodesFromStroke, nodesFromClicks, regenerateVine, type VineParams } from "./core/vine";
import { attachPointerCapture, attachClickToPlace } from "./ui/pointerCapture";
import { Renderer } from "./ui/renderer";
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
}

const vines = new Map<string, VineState>();
let selectedId: string | null = null;
let pendingClickPoints: Point[] = [];
let detachInteraction: () => void = () => {};

const MIN_EPSILON = 0.5; // px : beaucoup de points, suit la main de très près
const MAX_EPSILON = 12; // px : très simplifié, peu de points

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

function deselect(): void {
  selectedId = null;
  nodeEditor.hide();
}

function selectVine(id: string): void {
  selectedId = id;
  const vine = vines.get(id);
  if (!vine) return;
  nodeEditor.show(vine.nodes, () => {
    const { stemPathD, leaves } = regenerateVine(vine.nodes, currentParams());
    renderer.updateVine(id, stemPathD, leaves);
  });
}

function createVineFromNodes(nodes: EditableNode[]): void {
  if (nodes.length < 2) return;
  const id = renderer.createVine(() => selectVine(id));
  vines.set(id, { nodes });
  const { stemPathD, leaves } = regenerateVine(nodes, currentParams());
  renderer.updateVine(id, stemPathD, leaves);
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
  createVineFromNodes(nodes);
}

function setMode(next: Mode): void {
  detachInteraction();
  pendingClickPoints = [];
  renderer.setLiveStroke(null);
  deselect();

  modeFreehandButton.classList.toggle("active", next === "freehand");
  modePointsButton.classList.toggle("active", next === "points");
  finishButton.hidden = next !== "points";

  if (next === "freehand") {
    detachInteraction = attachPointerCapture(svg, {
      onStrokeStart: () => deselect(),
      onStrokeMove: (points) => renderer.setLiveStroke(points),
      onStrokeEnd: (points) => {
        renderer.setLiveStroke(null);
        createVineFromNodes(nodesFromStroke(points, currentEpsilon()));
      },
    });
  } else {
    detachInteraction = attachClickToPlace(svg, {
      onAdd: (p) => {
        if (selectedId) deselect();
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
  if (!selectedId) return;
  const vine = vines.get(selectedId);
  if (!vine) return;
  const { stemPathD, leaves } = regenerateVine(vine.nodes, currentParams());
  renderer.updateVine(selectedId, stemPathD, leaves);
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

exportButton.addEventListener("click", () => {
  const svgString = renderer.exportSVG();
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `liane-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
});

setMode("freehand");
