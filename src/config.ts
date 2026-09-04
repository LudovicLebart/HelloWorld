/**
 * Constantes de configuration de l'application, centralisées ici pour que
 * rien de comparable ne traîne en dur ailleurs dans le code — clé de
 * stockage, profondeur d'historique, seuils de geste, plage de
 * simplification du tracé.
 */

/** Clé localStorage du canevas sauvegardé. Le suffixe de version permet de
    faire évoluer le format plus tard sans avoir à migrer les anciennes données :
    une clé différente ⇒ les anciennes données restent simplement ignorées. */
export const STORAGE_KEY = "vignes-arabesques:canvas-v1";

/** Nombre maximum d'étapes conservées dans l'historique annuler/rétablir. */
export const UNDO_LIMIT = 50;

/** Distance (px, repère SVG) sous laquelle un tracé qui démarre près d'une
    liane existante (sans toucher sa tige) s'accroche dessus et devient une
    branche — filet de sécurité secondaire au geste principal "tirer depuis
    la tige", voir attachStemDrag. */
export const BRANCH_SNAP_RADIUS = 16;

/** Distance (px écran) sous laquelle un pointerdown+up est un tap (sélection)
    plutôt qu'un drag (tracé) — utilisé pour distinguer les deux gestes sur
    une tige. */
export const TAP_DRAG_THRESHOLD = 5;

/** Plage d'epsilon de simplification RDP couverte par le curseur "Densité des
    points" : min = beaucoup de points (suit la main de très près), max = très
    simplifié (peu de points). */
export const DENSITY_EPSILON_RANGE = { min: 0.5, max: 12 };

/** Délai (ms) avant qu'un tap sur une ancre bascule le nœud lisse/coin — le temps de
    voir si un second clic arrive et en fait un double-clic (suppression du nœud) à la
    place, sans quoi les deux gestes se déclencheraient l'un après l'autre. */
export const ANCHOR_TAP_DELAY = 280;

/** Plages des curseurs "Échelle" et "Jitter" propres à chaque motif (voir #motif-list, ui/motifList.ts). */
export const MOTIF_SCALE_RANGE = { min: 4, max: 40 };
export const MOTIF_JITTER_RANGE = { min: 0, max: 100 };

/** Génération automatique de branches secondaires (volutes) sur la tige sélectionnée — voir
    core/branching.ts, core/logSpiral.ts et docs/explanation/principes-esthetiques.md pour les
    principes (rinceau classique, phyllotaxie, spirale logarithmique) dont ces valeurs découlent. */
export const AUTO_BRANCH = {
  /** Distance (px, longueur d'arc) visée entre deux points d'accroche — la densité réelle suit la
      longueur totale de la tige (arabesque : jamais de segment nu ni surchargé). Abaissé à 70
      (calibrage planche 3 du moodboard : tendeurs fins et nombreux) — voir
      docs/how-to/generer-des-volutes-automatiquement.md. */
  spacing: 70,
  /** Fraction de la longueur totale laissée nue à chaque extrémité — jamais de volute exactement à
      la racine ou à la pointe de la tige. */
  marginFraction: 0.08,
  /** Nombre de tours de chaque volute générée. Relevé à 2 (calibrage planche 3 : tendeurs qui
      s'enroulent un peu plus complètement que les grandes boucles de la planche 5). */
  turns: 2,
  /** Taux de décroissance du rayon par radian (r = r0·e^(-b·θ)) — plus grand = volute qui se
      resserre plus vite vers son centre. À 0.07, le rayon garde ~65 % de sa valeur par tour
      complet (contre ~39 % à l'ancienne valeur de 0.15) : une spirale nettement plus ouverte,
      aux boucles distinctes plutôt qu'une pelote serrée. */
  growthRate: 0.07,
  /** Rayon de départ de la première volute, en multiple de l'épaisseur de la tige parente. Abaissé
      à 2.2 (calibrage planche 3 : tendeurs fins, pas de grandes boucles affirmées). */
  startRadiusFactor: 2.2,
  /** Facteur de décroissance géométrique du rayon de départ appliqué à chaque volute suivante le
      long de la tige (rinceau classique : chaque volute plus petite que la précédente). */
  sizeDecay: 0.85,
  /** Angle (radians) entre la tangente de la tige parente et la tangente de départ d'une volute —
      jamais un raccord tout droit. */
  launchAngle: Math.PI / 2.4,
  /** Échantillons par tour de spirale. */
  samplesPerTurn: 10,
  /** Profondeur de récursion des volutes : une volute générée fait pousser ses propres volutes plus
      petites (mêmes règles, appliquées à sa propre courbe), jusqu'à ce niveau de profondeur — la
      « touffe » de spirales imbriquées visible sur les rinceaux Art nouveau plutôt qu'une volute
      isolée par embranchement. 0 désactive la récursion — valeur actuelle, calibrage planche 5 (pas
      de volutes visiblement imbriquées les unes dans les autres, juste des boucles simples). La
      décroissance géométrique du rayon (`sizeDecay`) fait naturellement diminuer la longueur d'arc
      de chaque niveau si la récursion est réactivée, donc une volute déjà petite n'a souvent pas
      assez de longueur pour produire elle-même un point d'accroche (voir `spacing`/`marginFraction`)
      — la récursion s'arrête d'elle-même avant la profondeur réglée dans la plupart des cas. */
  recursionDepth: 0,
};
