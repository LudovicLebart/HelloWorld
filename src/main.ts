import "./style.css";
import type { CurveSample, EditableNode, Point } from "./core/types";
import type { BrushPlacement, MotifSequenceEntry } from "./core/brush";
import {
  nodesFromStroke,
  nodesFromClicks,
  regenerateVine,
  serializeCanvas,
  deserializeCanvas,
  insertNodeAt,
  removeNodeAt,
  nearestSegmentIndex,
  setNodeCorner,
  type VineParams,
  type CanvasSnapshot,
} from "./core/vine";
import { planAutoBranches, buildAutoBranchPoints, type AutoBranchShapeOverrides } from "./core/branching";
import { unionStemPolygons } from "./core/junction";
import { isPointInMask } from "./core/mask";
import { SnapshotHistory } from "./core/history";
import { saveToStorage as persistSnapshot, loadFromStorage as readPersistedSnapshot } from "./core/persistence";
import { attachPointerCapture, attachClickToPlace } from "./ui/pointerCapture";
import { Renderer, type ExportCluster } from "./ui/renderer";
import { NodeEditor } from "./ui/nodeEditor";
import { buildMotifRow, motifRows, updateMotifOrderButtons } from "./ui/motifList";
import { STORAGE_KEY, UNDO_LIMIT, BRANCH_SNAP_RADIUS, DENSITY_EPSILON_RANGE } from "./config";
import { MOTIFS } from "./assets/motifs";

const svg = document.querySelector<SVGSVGElement>("#canvas")!;
const renderer = new Renderer(svg);
const nodeEditor = new NodeEditor(svg);
const history = new SnapshotHistory(UNDO_LIMIT);

const spacingInput = document.querySelector<HTMLInputElement>("#spacing")!;
const thicknessInput = document.querySelector<HTMLInputElement>("#thickness")!;
const densityInput = document.querySelector<HTMLInputElement>("#density")!;
const clearButton = document.querySelector<HTMLButtonElement>("#clear")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const undoButton = document.querySelector<HTMLButtonElement>("#undo")!;
const redoButton = document.querySelector<HTMLButtonElement>("#redo")!;
const modeFreehandButton = document.querySelector<HTMLButtonElement>("#mode-freehand")!;
const modePointsButton = document.querySelector<HTMLButtonElement>("#mode-points")!;
const modeMaskButton = document.querySelector<HTMLButtonElement>("#mode-mask")!;
const autoBranchButton = document.querySelector<HTMLButtonElement>("#auto-branch")!;
const autoBranchTurnsInput = document.querySelector<HTMLInputElement>("#auto-branch-turns")!;
const autoBranchGrowthRateInput = document.querySelector<HTMLInputElement>("#auto-branch-growth-rate")!;
const autoBranchStartRadiusInput = document.querySelector<HTMLInputElement>("#auto-branch-start-radius")!;
const autoBranchSizeDecayInput = document.querySelector<HTMLInputElement>("#auto-branch-size-decay")!;
const autoBranchRecursionInput = document.querySelector<HTMLInputElement>("#auto-branch-recursion")!;
const finishButton = document.querySelector<HTMLButtonElement>("#finish-points")!;
const finishMaskButton = document.querySelector<HTMLButtonElement>("#finish-mask")!;
const clearMaskButton = document.querySelector<HTMLButtonElement>("#clear-mask")!;
const motifListEl = document.querySelector<HTMLOListElement>("#motif-list")!;

for (const motif of MOTIFS) {
  motifListEl.appendChild(buildMotifRow(motif));
}

// Mode focus volutes : le panneau Motifs est masqué (voir index.html), donc aucune interaction
// n'est possible pour décocher un motif — on démarre sans aucun motif actif (silhouette pure,
// visée : planche 5 du moodboard). currentSequence()/placeBrush() traitent désormais "aucun motif
// actif" comme un état légitime plutôt qu'un repli sur le premier motif.
for (const li of motifRows(motifListEl)) {
  li.querySelector<HTMLInputElement>(".motif-active")!.checked = false;
}

type Mode = "freehand" | "points" | "mask";

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

/** Zone de travail définie par l'utilisateur (mode Masque) — les lianes affichées et exportées ne dépassent jamais de ce contour, voir mask.ts et junction.ts. */
let mask: Point[] | null = null;
let pendingMaskPoints: Point[] = [];

function newVineId(): string {
  return `vine-${nextVineId++}`;
}

function currentEpsilon(): number {
  const density = Number(densityInput.value); // 0 (épars) .. 100 (dense)
  const { min, max } = DENSITY_EPSILON_RANGE;
  return max - (density / 100) * (max - min);
}

/** Lit la séquence de motifs dans l'ordre actuel du DOM (#motif-list) — un clic sur ↑/↓ réordonne les <li>, l'ordre du DOM fait foi. Chaque motif actif garde sa propre échelle/jitter. Aucune case cochée est un état légitime (silhouette sans feuillage, voir placeBrush()) — pas de repli sur la première rangée. */
function currentSequence(): MotifSequenceEntry[] {
  const rows = motifRows(motifListEl);
  const active = rows.filter((li) => li.querySelector<HTMLInputElement>(".motif-active")!.checked);
  return active.map((li) => ({
    motifId: li.dataset.motif!,
    scale: Number(li.querySelector<HTMLInputElement>(".motif-scale")!.value),
    jitter: Number(li.querySelector<HTMLInputElement>(".motif-jitter")!.value) / 100,
  }));
}

/** Les paramètres tels que les curseurs les affichent *maintenant* — pour une liane en cours de création ou d'édition live. */
function liveParams(parentId: string | undefined): VineParams {
  return {
    stemWidth: Number(thicknessInput.value),
    brush: {
      spacing: Number(spacingInput.value),
      sequence: currentSequence(),
    },
    taperStart: !parentId,
    taperEnd: true,
  };
}

/** Réglages de forme des volutes générées automatiquement, tels que les curseurs dédiés
    (#auto-branch-*) les affichent *maintenant* — lus au moment du clic sur "Volutes auto", pas liés
    à un rendu live continu (voir generateAutoBranches). `recursionDepth` est renvoyé séparément :
    il ne fait pas partie des overrides de buildAutoBranchPoints, il pilote directement la
    profondeur de récursion dans spawnAutoBranches. */
function autoBranchParams(): { shape: AutoBranchShapeOverrides; recursionDepth: number } {
  return {
    shape: {
      turns: Number(autoBranchTurnsInput.value),
      growthRate: Number(autoBranchGrowthRateInput.value),
      startRadiusFactor: Number(autoBranchStartRadiusInput.value),
      sizeDecay: Number(autoBranchSizeDecayInput.value),
    },
    recursionDepth: Number(autoBranchRecursionInput.value),
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
    onRemoveNode: (index) => removeNodeFromVine(id, index),
    onToggleCorner: (index) => toggleNodeCorner(id, index),
  });
}

/** Bascule un nœud lisse/coin (tap sur son ancre) et resélectionne pour rafraîchir l'éditeur de nœuds. */
function toggleNodeCorner(id: string, index: number): void {
  const vine = vines.get(id);
  if (!vine) return;
  pushUndo();
  vine.nodes = setNodeCorner(vine.nodes, index, !vine.nodes[index].corner);
  regenerateAndRender(id, liveParams(vine.parentId));
  selectVine(id);
  saveSnapshot();
}

/** Insère un nouveau nœud sur une liane existante (double-clic sur sa tige) et resélectionne pour rafraîchir l'éditeur de nœuds. */
function insertNodeIntoVine(id: string, point: Point): void {
  const vine = vines.get(id);
  if (!vine) return;
  pushUndo();
  const index = nearestSegmentIndex(vine.nodes, point);
  vine.nodes = insertNodeAt(vine.nodes, index);
  regenerateAndRender(id, liveParams(vine.parentId));
  selectVine(id);
  saveSnapshot();
}

/** Retire un nœud d'une liane existante (double-clic sur son ancre) — au moins 2 nœuds doivent rester pour garder une courbe valide. */
function removeNodeFromVine(id: string, index: number): void {
  const vine = vines.get(id);
  if (!vine || vine.nodes.length <= 2) return;
  pushUndo();
  vine.nodes = removeNodeAt(vine.nodes, index);
  regenerateAndRender(id, liveParams(vine.parentId));
  selectVine(id);
  saveSnapshot();
}

/** Câble les gestes de la tige (tap = sélection, drag = nouvelle branche, double-clic = insérer un nœud) — partagé entre création et restauration d'un instantané. */
function wireVine(id: string): void {
  renderer.createVine(id, {
    onTap: () => selectVine(id),
    onBranchMove: (points) => renderer.setLiveStroke(points),
    onBranchEnd: (points) => {
      renderer.setLiveStroke(null);
      createVineFromNodes(nodesFromStroke(points, currentEpsilon()), id);
    },
    onInsertNode: (point) => insertNodeIntoVine(id, point),
  });
}

/** Crée une liane sans étape d'annulation ni sauvegarde propres — pour un appelant qui gère lui-même
    ces deux effets autour d'un lot de créations (voir generateAutoBranches). `autoGenerated` marque
    une liane née de "Volutes auto" plutôt que tracée à la main — porté par `VineParams` (donc
    persisté, survit à l'undo/redo et au rechargement) pour que generateAutoBranches puisse
    reconnaître et remplacer un lot précédent, voir collectAutoDescendants(). */
function addVine(nodes: EditableNode[], parentId?: string, autoGenerated = false): string {
  const id = newVineId();
  wireVine(id);
  const params: VineParams = { ...liveParams(parentId), autoGenerated };
  vines.set(id, { nodes, parentId, params, curve: [], stemPolygon: [], leaves: [] });
  regenerateAndRender(id, params);
  return id;
}

/** Une ligne tracée obtient ses volutes tout de suite — pas de bouton à cliquer. S'applique aussi
    bien au premier tracé qu'à une branche tirée à la main depuis une tige existante (onBranchEnd
    appelle aussi createVineFromNodes) : tracer une ligne, toujours, donne des volutes. */
function createVineFromNodes(nodes: EditableNode[], parentId?: string): void {
  if (nodes.length < 2) return;
  pushUndo();
  const id = addVine(nodes, parentId);
  regenerateAutoVolutes(id);
  selectVine(id);
  saveSnapshot();
}

/** Descendants d'une liane, en largeur, en ne suivant que les branches auto-générées (voir
    addVine) — s'arrête à toute liane tracée à la main sans la retirer ni continuer derrière elle.
    Sert à retrouver le lot de volutes auto-générées d'un précédent clic sur "Volutes auto" pour le
    remplacer plutôt que l'empiler. Limite connue : une branche tracée à la main sur une volute
    auto-générée devient orpheline si cette volute est ensuite remplacée (parentId pointant vers une
    liane retirée) — même nature que la racine de branche non ré-accrochée déjà documentée. */
function collectAutoDescendants(rootId: string): string[] {
  const result: string[] = [];
  const frontier = [rootId];
  while (frontier.length > 0) {
    const current = frontier.pop()!;
    for (const [id, vine] of vines) {
      if (vine.parentId === current && vine.params.autoGenerated) {
        result.push(id);
        frontier.push(id);
      }
    }
  }
  return result;
}

/** Retire le lot de volutes auto-générées déjà présent sur `vineId` (voir collectAutoDescendants)
    et en fait pousser un nouveau selon les curseurs actuels — sans pas d'annulation ni sauvegarde
    propres, à la charge de l'appelant (création d'une liane, clic sur "Volutes auto", ou glisser un
    curseur en direct). Ne fait rien si la liane n'existe pas ou que sa courbe ne se prête à aucun
    point d'accroche (voir planAutoBranches). */
function regenerateAutoVolutes(vineId: string): void {
  const vine = vines.get(vineId);
  if (!vine || vine.curve.length < 2) return;
  const plans = planAutoBranches(vine.curve);
  for (const id of collectAutoDescendants(vineId)) {
    vines.delete(id);
    renderer.removeVine(id);
  }
  if (plans.length === 0) return;
  const { shape, recursionDepth } = autoBranchParams();
  spawnAutoBranches(plans, vineId, vine.params.stemWidth, 0, recursionDepth, shape);
}

/** Déclencheur manuel de secours pour regenerateAutoVolutes() — utile pour régénérer sur une liane
    plus ancienne (chargée depuis le stockage local, par exemple) ou après une édition de nœuds qui a
    changé la forme de la tige. Le flux principal (tracer une ligne, bouger un curseur) n'en a pas
    besoin, voir createVineFromNodes() et le câblage des curseurs #auto-branch-*. Un seul pas
    d'annulation pour tout le lot généré. */
function generateAutoBranches(): void {
  if (!selectedId) return;
  const vine = vines.get(selectedId);
  if (!vine) return;
  const hasNewPlans = vine.curve.length >= 2 && planAutoBranches(vine.curve).length > 0;
  const hasExistingBatch = collectAutoDescendants(selectedId).length > 0;
  if (!hasNewPlans && !hasExistingBatch) return;
  pushUndo();
  regenerateAutoVolutes(selectedId);
  saveSnapshot();
}

/** Régénère en direct les volutes de la liane sélectionnée quand on bouge l'un des curseurs
    #auto-branch-* — même schéma que refreshSelectedVine() pour Épaisseur tige/Espacement : pas de
    pas d'annulation par micro-ajustement, la sauvegarde attend le relâchement ("change"). */
function refreshAutoVolutes(): void {
  if (!selectedId) return;
  regenerateAutoVolutes(selectedId);
}

/** Crée les branches d'un lot de points d'accroche déjà planifiés puis, tant qu'il reste de la
    profondeur (`depthRemaining`), fait pousser récursivement les propres volutes de chaque branche
    créée sur sa propre courbe — la « touffe » de spirales imbriquées d'un rinceau, plutôt qu'une
    volute isolée par embranchement. `baseGenerationIndex` prolonge la décroissance géométrique de
    taille (`shape.sizeDecay`) d'un niveau de récursion à l'autre, pour qu'une volute petite-fille
    reste plus petite que sa mère, elle-même plus petite que la tige d'origine. */
function spawnAutoBranches(
  plans: ReturnType<typeof planAutoBranches>,
  parentId: string,
  stemWidth: number,
  baseGenerationIndex: number,
  depthRemaining: number,
  shape: AutoBranchShapeOverrides,
): void {
  plans.forEach((attachment, i) => {
    const generationIndex = baseGenerationIndex + i;
    const points = buildAutoBranchPoints(attachment, stemWidth, generationIndex, shape);
    const nodes = nodesFromClicks(points);
    if (nodes.length < 2) return;
    const branchId = addVine(nodes, parentId, true);
    if (depthRemaining <= 0) return;
    const childPlans = planAutoBranches(vines.get(branchId)!.curve);
    if (childPlans.length > 0) {
      spawnAutoBranches(childPlans, branchId, stemWidth, generationIndex + 1, depthRemaining - 1, shape);
    }
  });
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
  pendingMaskPoints = [];
  renderer.setLiveStroke(null);
  deselect();

  modeFreehandButton.classList.toggle("active", next === "freehand");
  modePointsButton.classList.toggle("active", next === "points");
  modeMaskButton.classList.toggle("active", next === "mask");
  finishButton.hidden = next !== "points";
  finishMaskButton.hidden = next !== "mask";

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
  } else if (next === "points") {
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
  } else {
    detachInteraction = attachClickToPlace(svg, {
      onAdd: (p) => {
        pendingMaskPoints.push(p);
        renderer.setLiveStroke(pendingMaskPoints);
      },
      onFinish: () => {
        if (pendingMaskPoints.length >= 3) finishMask();
      },
    });
  }
}

/** Termine le tracé du masque (au moins 3 points) et l'applique comme nouvelle zone de travail. */
function finishMask(): void {
  // Même garde qu'un tracé de liane : un double-clic ajoute aussi un point juste avant,
  // sur la même position — on retire ce doublon dégénéré.
  if (pendingMaskPoints.length >= 2) {
    const a = pendingMaskPoints[pendingMaskPoints.length - 1];
    const b = pendingMaskPoints[pendingMaskPoints.length - 2];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 3) pendingMaskPoints.pop();
  }
  if (pendingMaskPoints.length < 3) return;
  pushUndo();
  mask = pendingMaskPoints;
  pendingMaskPoints = [];
  renderer.setLiveStroke(null);
  renderer.setMask(mask);
  saveSnapshot();
  setMode("freehand");
}

modeFreehandButton.addEventListener("click", () => setMode("freehand"));
modePointsButton.addEventListener("click", () => setMode("points"));
modeMaskButton.addEventListener("click", () => setMode("mask"));
finishButton.addEventListener("click", () => {
  if (pendingClickPoints.length >= 2) finishPointsVine();
});
finishMaskButton.addEventListener("click", () => {
  if (pendingMaskPoints.length >= 3) finishMask();
});
autoBranchButton.addEventListener("click", generateAutoBranches);
clearMaskButton.addEventListener("click", () => {
  if (!mask) return;
  pushUndo();
  mask = null;
  renderer.setMask(null);
  saveSnapshot();
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

for (const input of [spacingInput, thicknessInput]) {
  input.addEventListener("input", refreshSelectedVine);
  input.addEventListener("change", () => saveSnapshot());
}

for (const input of [
  autoBranchTurnsInput,
  autoBranchGrowthRateInput,
  autoBranchStartRadiusInput,
  autoBranchSizeDecayInput,
  autoBranchRecursionInput,
]) {
  input.addEventListener("input", refreshAutoVolutes);
  input.addEventListener("change", () => saveSnapshot());
}

for (const li of motifRows(motifListEl)) {
  li.querySelector<HTMLInputElement>(".motif-active")!.addEventListener("change", () => {
    refreshSelectedVine();
    saveSnapshot();
  });
  for (const slider of li.querySelectorAll<HTMLInputElement>(".motif-scale, .motif-jitter")) {
    slider.addEventListener("input", refreshSelectedVine);
    slider.addEventListener("change", () => saveSnapshot());
  }
  // Réordonner ne crée pas d'étape d'annulation, comme les autres réglages de rendu — seul
  // l'ordre des <li> dans le DOM fait foi (voir currentSequence()), pas de tableau à synchroniser.
  li.querySelector<HTMLButtonElement>(".motif-up")!.addEventListener("click", () => {
    const prev = li.previousElementSibling;
    if (!prev) return;
    motifListEl.insertBefore(li, prev);
    updateMotifOrderButtons(motifListEl);
    refreshSelectedVine();
    saveSnapshot();
  });
  li.querySelector<HTMLButtonElement>(".motif-down")!.addEventListener("click", () => {
    const next = li.nextElementSibling;
    if (!next) return;
    motifListEl.insertBefore(next, li);
    updateMotifOrderButtons(motifListEl);
    refreshSelectedVine();
    saveSnapshot();
  });
}
updateMotifOrderButtons(motifListEl);

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
    const leafGroups = ids.map((id) =>
      mask ? vines.get(id)!.leaves.filter((leaf) => isPointInMask(leaf.position, mask!)) : vines.get(id)!.leaves,
    );
    return { stemPathD: unionStemPolygons(polygons, mask), leafGroups };
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

/** Reconstruit tout le canevas (lianes ET masque) à partir d'un instantané validé — nœuds/params historiques, jamais les curseurs actuels (voir regenerateAndRender). */
function loadVines(canvas: CanvasSnapshot | null): void {
  if (!canvas) return;
  renderer.clear();
  vines.clear();
  deselect();
  for (const v of canvas.vines) {
    wireVine(v.id);
    vines.set(v.id, { nodes: v.nodes, parentId: v.parentId, params: v.params, curve: [], stemPolygon: [], leaves: [] });
    regenerateAndRender(v.id, v.params);
  }
  mask = canvas.mask;
  renderer.setMask(mask);
}

function snapshot(): string {
  return serializeCanvas(vines, mask);
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
  loadVines(deserializeCanvas(prev));
  saveSnapshot();
  updateUndoRedoButtons();
}

function redo(): void {
  const next = history.redo(snapshot());
  if (!next) return;
  loadVines(deserializeCanvas(next));
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
const restored = deserializeCanvas(readPersistedSnapshot(STORAGE_KEY) ?? "");
if (restored && (restored.vines.length > 0 || restored.mask)) {
  try {
    loadVines(restored);
    nextVineId = restored.vines.reduce((max, v) => Math.max(max, Number(v.id.split("-")[1]) || 0), 0) + 1;
  } catch {
    renderer.clear();
    vines.clear();
    mask = null;
  }
}
updateUndoRedoButtons();
setMode("freehand");
