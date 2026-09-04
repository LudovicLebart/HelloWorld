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
      longueur totale de la tige (arabesque : jamais de segment nu ni surchargé). */
  spacing: 90,
  /** Fraction de la longueur totale laissée nue à chaque extrémité — jamais de volute exactement à
      la racine ou à la pointe de la tige. */
  marginFraction: 0.08,
  /** Nombre de tours de chaque volute générée. */
  turns: 1.6,
  /** Taux de décroissance du rayon par radian (r = r0·e^(-b·θ)) — plus grand = volute qui se
      resserre plus vite vers son centre. */
  growthRate: 0.15,
  /** Rayon de départ de la première volute, en multiple de l'épaisseur de la tige parente. */
  startRadiusFactor: 3.5,
  /** Facteur de décroissance géométrique du rayon de départ appliqué à chaque volute suivante le
      long de la tige (rinceau classique : chaque volute plus petite que la précédente). */
  sizeDecay: 0.85,
  /** Angle (radians) entre la tangente de la tige parente et la tangente de départ d'une volute —
      jamais un raccord tout droit. */
  launchAngle: Math.PI / 2.4,
  /** Échantillons par tour de spirale. */
  samplesPerTurn: 10,
  /** Fenêtre (en échantillons de courbe, de part et d'autre du point d'accroche) utilisée pour
      estimer le sens de courbure local de la tige — détermine le côté choisi (voir
      `curvatureThreshold`). Une fenêtre trop étroite est sensible au bruit d'un tracé à main levée. */
  curvatureWindow: 6,
  /** Sous ce seuil (produit vectoriel des tangentes avant/après), la tige est considérée localement
      droite : le côté retombe sur une simple alternance plutôt que sur la courbure (indéfinie sur un
      segment droit). */
  curvatureThreshold: 1e-3,
};
