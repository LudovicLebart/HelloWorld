export interface Point {
  x: number;
  y: number;
}

/**
 * Nœud éditable du squelette : un point d'ancrage plus ses deux poignées
 * de contrôle Bézier (en coordonnées absolues, comme dans Illustrator/
 * Inkscape). Par défaut les poignées sont placées automatiquement pour
 * un rendu lisse, mais l'utilisateur peut les faire glisser individuellement.
 */
export interface EditableNode {
  point: Point;
  handleIn: Point;
  handleOut: Point;
}

/** Point échantillonné sur la spline, avec le repère local de la courbe en ce point. */
export interface CurveSample {
  point: Point;
  tangent: Point; // vecteur unitaire
  normal: Point; // vecteur unitaire, perpendiculaire à la tangente
  /** Longueur d'arc cumulée depuis le début de la courbe. */
  arcLength: number;
  /** Position normalisée le long de la courbe, de 0 (début) à 1 (fin). */
  t: number;
}
