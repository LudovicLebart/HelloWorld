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
    core/branching.ts, core/curvatureSpiral.ts et docs/explanation/principes-esthetiques.md pour les
    principes (rinceau classique, phyllotaxie, courbure croissante en fonction de la longueur d'arc)
    dont ces valeurs découlent. */
export const AUTO_BRANCH = {
  /** Distance (px, longueur d'arc) visée entre deux points d'accroche — la densité réelle suit la
      longueur totale de la tige (arabesque : jamais de segment nu ni surchargé). Relevé à 220 : les
      volutes étant maintenant beaucoup plus longues (voir `branchLengthFactor`), un espacement
      trop serré les ferait se chevaucher. */
  spacing: 220,
  /** Fraction de la longueur totale laissée nue à chaque extrémité — jamais de volute exactement à
      la racine ou à la pointe de la tige. */
  marginFraction: 0.08,
  /** Longueur d'arc totale d'une volute de génération 0, en multiple de l'épaisseur de la tige
      parente — le paramètre direct est la longueur, pas un nombre de tours (voir
      `core/curvatureSpiral.ts` : le nombre de tours visuels résulte de `endCurvatureFactor`/
      `curvatureExponent`, ce n'est plus un cadran à part). Remplace l'ancien `startRadiusFactor`.
      Réduit (90 → 70) : à 90, le geste presque droit initial restait visiblement trop long avant
      que la moindre courbure ne devienne perceptible (retour utilisateur sur le rendu déployé). */
  branchLengthFactor: 70,
  /** Courbure atteinte à la pointe de la volute (s = longueur totale), en multiple de
      `1/épaisseur de la tige parente` — plus grand = pointe qui s'enroule plus serré. Remplace
      `growthRate`. Réduit (0.7 → 0.35) avec `curvatureExponent` (voir plus bas) : ensemble, ils
      réduisent le nombre total de tours (≈ 2 → ≈ 1,3) pour une pointe qui s'ouvre en un coil net
      plutôt qu'un petit nœud très serré. */
  endCurvatureFactor: 0.35,
  /** Loi de courbure le long du parcours : κ(s) = endCurvature·(s/longueur)^curvatureExponent — voir
      `core/curvatureSpiral.ts` pour la dérivation. À 1, la courbure croît linéairement avec la
      longueur parcourue (spirale d'Euler/clothoïde classique) : déjà quasi nulle au départ par
      construction, donc pas d'« escargot » dès l'attache même à exposant 1. Au-delà de 1, la montée
      en courbure est explicitement retardée vers la dernière portion du parcours : un geste presque
      droit qui ne se met à tourner serré sur lui-même que plus tard, sur la queue de la volute —
      remplace `curvatureRampPower`, mais agit enfin sur la courbure réelle plutôt que sur un rayon
      découplé de la rotation totale (voir la note dans principes-esthetiques.md sur pourquoi une
      spirale logarithmique classique ne pouvait structurellement pas produire ce profil, quel que
      soit son paramétrage). Réduit (4 → 2) avec `endCurvatureFactor` : à 4, une fois la courbure
      enfin amorcée elle montait trop vite vers sa valeur finale (« la spirale va trop vite » — même
      retour utilisateur) ; à 2, la transition reste progressive au lieu de se resserrer d'un coup
      en fin de parcours. */
  curvatureExponent: 2,
  /** Facteur de décroissance géométrique appliqué à la longueur (et, en proportion inverse, à la
      courbure de pointe — voir `buildAutoBranchPoints` dans core/branching.ts) de chaque volute
      suivante le long de la tige (rinceau classique : chaque volute plus petite que la précédente,
      et proportionnellement plus resserrée). */
  sizeDecay: 0.85,
  /** Angle (radians) entre la tangente de la tige parente et la tangente de départ d'une volute —
      jamais un raccord tout droit. */
  launchAngle: Math.PI / 2.4,
  /** Pas de l'intégration numérique de la courbe (méthode du point milieu) — remplace
      `samplesPerTurn`, qui n'a plus de sens puisqu'il n'y a plus de tours fixés d'avance. */
  curveSteps: 60,
  /** Épaisseur de tige d'une volute auto-générée, en fraction de l'épaisseur de sa liane
      parente (curseur "Épaisseur tige") — une volute est une ramification plus fine que la tige
      qui la porte, jamais le même trait plein qu'elle. N'affecte que le rendu (largeur du
      polygone de tige, voir addVine dans main.ts) ; la courbure de la spirale elle-même continue de
      se baser sur l'épaisseur de la tige racine non réduite (voir branchLengthFactor/
      endCurvatureFactor et spawnAutoBranches), pour que la taille des volutes ne se mette pas à
      décroître deux fois. */
  stemWidthFactor: 0.4,
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
