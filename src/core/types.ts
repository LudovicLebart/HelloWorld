export interface Point {
  x: number;
  y: number;
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
