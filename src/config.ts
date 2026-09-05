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
      longueur totale de la tige (arabesque : jamais de segment nu ni surchargé). Relevé à 220 : les
      volutes étant maintenant beaucoup plus longues (voir `startRadiusFactor`/`turns`), un espacement
      trop serré les ferait se chevaucher. */
  spacing: 220,
  /** Fraction de la longueur totale laissée nue à chaque extrémité — jamais de volute exactement à
      la racine ou à la pointe de la tige. */
  marginFraction: 0.08,
  /** Nombre de tours (en θ, l'angle qui paramètre la spirale — pas des boucles visuelles complètes :
      voir `startRadiusFactor` et `curvatureRampPower`) de chaque volute générée. Combiné à
      `curvatureRampPower`, ce nombre de tours reste modeste (3) : un enroulement complet dès le
      premier tour lirait comme un cercle fermé (bullseye), pas comme une branche qui s'incurve — voir
      `curvatureRampPower` pour la répartition de la courbure le long de ces tours. */
  turns: 3,
  /** Taux de décroissance du rayon par radian (r = r0·e^(-b·θ)) — plus grand = volute qui se
      resserre plus vite vers son centre, une fois combiné à `curvatureRampPower` qui retarde ce
      resserrement vers la fin du parcours plutôt que de l'étaler uniformément sur les `turns` tours. */
  growthRate: 0.13,
  /** Rayon de départ de la volute (à l'attache), en multiple de l'épaisseur de la tige parente.
      Fortement relevé (2.2 → 10) : à l'attache, un grand rayon donne une courbure quasi nulle
      (presque droite), qui augmente ensuite progressivement à mesure que le rayon décroît — voir
      `growthRate`. Une volute est maintenant une courbe longue, pas un petit coil compact. */
  startRadiusFactor: 10,
  /** Facteur de décroissance géométrique du rayon de départ appliqué à chaque volute suivante le
      long de la tige (rinceau classique : chaque volute plus petite que la précédente). */
  sizeDecay: 0.85,
  /** Angle (radians) entre la tangente de la tige parente et la tangente de départ d'une volute —
      jamais un raccord tout droit. */
  launchAngle: Math.PI / 2.4,
  /** Échantillons par tour de spirale. */
  samplesPerTurn: 10,
  /** Retarde la décroissance du rayon d'une volute vers la fin de son parcours angulaire plutôt que
      de la répartir uniformément — voir la doc de `LogSpiralOptions.curvatureRampPower`
      (core/logSpiral.ts) pour la dérivation exacte. 0 donnerait une spirale log classique
      auto-similaire : la courbure y croît au même rythme relatif à chaque tour, donc une volute a
      déjà visiblement tourné plusieurs fois sur elle-même dès son premier tour — un "escargot" dès
      l'attache. À 4, la même décroissance totale (même rayon final, calibré par `growthRate`/`turns`
      comme avant) se retrouve concentrée sur la toute dernière portion du parcours : la volute reste
      à grand rayon (une branche qui s'incurve doucement, sans même refermer son premier tour en
      cercle) sur l'essentiel de sa longueur, la rotation serrée sur elle-même n'intervenant que tard,
      sur la queue de la spirale. */
  curvatureRampPower: 4,
  /** Épaisseur de tige d'une volute auto-générée, en fraction de l'épaisseur de sa liane
      parente (curseur "Épaisseur tige") — une volute est une ramification plus fine que la tige
      qui la porte, jamais le même trait plein qu'elle. N'affecte que le rendu (largeur du
      polygone de tige, voir addVine dans main.ts) ; le rayon de la spirale elle-même continue de
      se baser sur l'épaisseur de la tige racine non réduite (voir startRadiusFactor et
      spawnAutoBranches), pour que la taille des volutes ne se mette pas à décroître deux fois. */
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
