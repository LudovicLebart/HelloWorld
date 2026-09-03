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

/** Dérive un identifiant sûr (lettres/chiffres/tirets ASCII) d'un nom de fichier — utilisé tel quel comme `data-motif` et comme `id` de calque à l'export (voir renderer.ts), qui doivent tous deux rester un nom XML valide (jamais d'espace ni d'accent). */
function slugify(raw: string): string {
  const slug = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents -> lettre de base (é -> e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "motif";
}

/**
 * Un motif externe est un simple fichier `.svg` avec un `<path>` : le point
 * d'attache est à l'origine `(0, 0)`, le motif s'étend vers `+x` sur une
 * longueur de l'ordre de `1` — voir docs/how-to/ajouter-un-motif.md. La
 * couleur (`fill` sur le `<path>`) et le facteur d'échelle
 * (`data-scale-factor` sur le `<svg>`) sont optionnels.
 */
function parseExternalMotifSource(source: string): Pick<Motif, "pathD" | "fill" | "scaleFactor"> | null {
  const pathD = /<path\b[^>]*\bd="([^"]+)"/.exec(source)?.[1];
  if (!pathD) return null;
  const fill = /<path\b[^>]*\bfill="([^"]+)"/.exec(source)?.[1];
  const scaleFactorRaw = /<svg\b[^>]*\bdata-scale-factor="([^"]+)"/.exec(source)?.[1];
  const parsedScaleFactor = scaleFactorRaw !== undefined ? Number(scaleFactorRaw) : 1;
  return { pathD, fill, scaleFactor: Number.isFinite(parsedScaleFactor) ? parsedScaleFactor : 1 };
}

function loadExternalMotifs(): Motif[] {
  const files = import.meta.glob("./motifs/*.svg", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
  // Le premier motif à revendiquer un identifiant gagne : un .svg externe nommé
  // "leaf.svg" ne peut jamais masquer silencieusement le motif interne "leaf", et deux
  // fichiers externes qui se slugifient vers le même id ne s'écrasent pas l'un l'autre.
  const seenIds = new Set(BUILTIN_MOTIFS.map((m) => m.id));
  const motifs: Motif[] = [];
  for (const [path, source] of Object.entries(files)) {
    const stem = path.split("/").pop()!.replace(/\.svg$/, "");
    const id = slugify(stem);
    if (seenIds.has(id)) continue;
    const parsed = parseExternalMotifSource(source);
    if (!parsed) continue;
    motifs.push({ id, label: humanizeId(stem), defaultScale: 16, ...parsed });
    seenIds.add(id);
  }
  return motifs;
}

export const MOTIFS: Motif[] = [...BUILTIN_MOTIFS, ...loadExternalMotifs()];

const byId = new Map(MOTIFS.map((m) => [m.id, m]));

export function getMotif(id: string): Motif {
  return byId.get(id) ?? MOTIFS[0];
}
