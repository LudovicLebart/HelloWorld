import type { Motif } from "../assets/motifs";
import { MOTIF_JITTER_RANGE, MOTIF_SCALE_RANGE } from "../config";

/** Une rangée de la séquence de motifs actuellement affichée — voir index.html (#motif-list). */
export function motifRows(motifListEl: HTMLOListElement): HTMLLIElement[] {
  return [...motifListEl.querySelectorAll<HTMLLIElement>(".motif-row")];
}

/** Construit la rangée d'un motif (voir style.css .motif-row) : ordre, activation, échelle, jitter — un seul gabarit pour les motifs internes comme pour ceux chargés depuis un .svg externe (assets/motifs.ts). */
export function buildMotifRow(motif: Motif): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "motif-row";
  li.dataset.motif = motif.id;

  const order = document.createElement("div");
  order.className = "motif-order";
  const up = document.createElement("button");
  up.type = "button";
  up.className = "motif-up";
  up.setAttribute("aria-label", "Monter");
  up.textContent = "↑";
  const down = document.createElement("button");
  down.type = "button";
  down.className = "motif-down";
  down.setAttribute("aria-label", "Descendre");
  down.textContent = "↓";
  order.append(up, down);

  const activeLabel = document.createElement("label");
  activeLabel.className = "checkbox";
  const active = document.createElement("input");
  active.type = "checkbox";
  active.className = "motif-active";
  active.checked = true;
  activeLabel.append(active, document.createTextNode(` ${motif.label}`));

  const scaleLabel = document.createElement("label");
  const scale = document.createElement("input");
  scale.type = "range";
  scale.className = "motif-scale";
  scale.min = String(MOTIF_SCALE_RANGE.min);
  scale.max = String(MOTIF_SCALE_RANGE.max);
  scale.step = "1";
  scale.value = String(motif.defaultScale);
  scaleLabel.append("Échelle", scale);

  const jitterLabel = document.createElement("label");
  const jitter = document.createElement("input");
  jitter.type = "range";
  jitter.className = "motif-jitter";
  jitter.min = String(MOTIF_JITTER_RANGE.min);
  jitter.max = String(MOTIF_JITTER_RANGE.max);
  jitter.step = "1";
  jitter.value = "20";
  jitterLabel.append("Jitter", jitter);

  li.append(order, activeLabel, scaleLabel, jitterLabel);
  return li;
}

/** Active/désactive les flèches en bout de liste (rien à monter au-dessus du premier, rien à descendre sous le dernier). */
export function updateMotifOrderButtons(motifListEl: HTMLOListElement): void {
  const rows = motifRows(motifListEl);
  rows.forEach((li, i) => {
    li.querySelector<HTMLButtonElement>(".motif-up")!.disabled = i === 0;
    li.querySelector<HTMLButtonElement>(".motif-down")!.disabled = i === rows.length - 1;
  });
}
