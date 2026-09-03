import { LEAF_PATH_D } from "./leaf";
import { FLOWER_PATH_D } from "./flower";
import { VOLUTE_PATH_D } from "./volute";

export interface Motif {
  id: string;
  label: string;
  pathD: string;
  /** Ajustement de taille propre au motif, appliqué en plus de l'échelle du brush (certaines silhouettes doivent être perçues un peu plus grandes/petites pour paraître de la même taille que les autres). */
  scaleFactor: number;
  className: string;
}

export const MOTIFS: Motif[] = [
  { id: "leaf", label: "Feuille", pathD: LEAF_PATH_D, scaleFactor: 1, className: "motif-leaf" },
  { id: "volute", label: "Volute", pathD: VOLUTE_PATH_D, scaleFactor: 0.9, className: "motif-volute" },
  { id: "flower", label: "Fleur", pathD: FLOWER_PATH_D, scaleFactor: 1.15, className: "motif-flower" },
];

const byId = new Map(MOTIFS.map((m) => [m.id, m]));

export function getMotif(id: string): Motif {
  return byId.get(id) ?? MOTIFS[0];
}
