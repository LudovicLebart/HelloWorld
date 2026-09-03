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
