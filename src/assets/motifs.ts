import { LEAF_PATH_D } from "./leaf";
import { FLOWER_PATH_D } from "./flower";
import { VOLUTE_PATH_D } from "./volute";

export interface Motif {
  id: string;
  label: string;
  pathD: string;
  /** Ajustement de taille propre au motif, appliqué en plus de l'échelle du brush (certaines silhouettes doivent être perçues un peu plus grandes/petites pour paraître de la même taille que les autres). */
  scaleFactor: number;
  /** Taille de base à proposer par défaut sur le curseur "Échelle" de ce motif (voir index.html), en pixels. */
  defaultScale: number;
  /** Motif interne (`src/assets/*.ts`) : résout la couleur via une règle CSS dédiée. Absente pour un motif chargé depuis un .svg externe, qui utilise `fill` à la place. */
  className?: string;
  /** Couleur de remplissage explicite — motifs chargés depuis un .svg externe (voir `./motifs/*.svg`), qui n'ont pas de règle CSS dédiée à écrire. */
  fill?: string;
}

const BUILTIN_MOTIFS: Motif[] = [
  { id: "leaf", label: "Feuille", pathD: LEAF_PATH_D, scaleFactor: 1, defaultScale: 16, className: "motif-leaf" },
  { id: "volute", label: "Volute", pathD: VOLUTE_PATH_D, scaleFactor: 0.9, defaultScale: 14, className: "motif-volute" },
  { id: "flower", label: "Fleur", pathD: FLOWER_PATH_D, scaleFactor: 1.15, defaultScale: 18, className: "motif-flower" },
];

/** Rend un identifiant de fichier ("liseron-des-champs") lisible en libellé ("Liseron des champs"). */
function humanizeId(id: string): string {
  const words = id.replace(/[-_]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Un motif externe est un simple fichier `.svg` avec un `<path>` : le point
 * d'attache est à l'origine `(0, 0)`, le motif s'étend vers `+x` sur une
 * longueur de l'ordre de `1` — voir docs/how-to/ajouter-un-motif.md. La
 * couleur (`fill` sur le `<path>`) et le facteur d'échelle
 * (`data-scale-factor` sur le `<svg>`) sont optionnels.
 */
function parseExternalMotif(id: string, source: string): Motif | null {
  const pathD = /<path\b[^>]*\bd="([^"]+)"/.exec(source)?.[1];
  if (!pathD) return null;
  const fill = /<path\b[^>]*\bfill="([^"]+)"/.exec(source)?.[1];
  const scaleFactor = Number(/<svg\b[^>]*\bdata-scale-factor="([^"]+)"/.exec(source)?.[1] ?? "1");
  return { id, label: humanizeId(id), pathD, scaleFactor, defaultScale: 16, fill };
}

function loadExternalMotifs(): Motif[] {
  const files = import.meta.glob("./motifs/*.svg", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
  const motifs: Motif[] = [];
  for (const [path, source] of Object.entries(files)) {
    const id = path.split("/").pop()!.replace(/\.svg$/, "");
    const motif = parseExternalMotif(id, source);
    if (motif) motifs.push(motif);
  }
  return motifs;
}

export const MOTIFS: Motif[] = [...BUILTIN_MOTIFS, ...loadExternalMotifs()];

const byId = new Map(MOTIFS.map((m) => [m.id, m]));

export function getMotif(id: string): Motif {
  return byId.get(id) ?? MOTIFS[0];
}
