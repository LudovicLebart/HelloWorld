// Les typings publiés par le package déclarent des exports nommés
// (`export function union`, etc.) qui n'existent pas dans le bundle ESM
// réellement livré (`dist/polygon-clipping.esm.js`) — celui-ci n'exporte
// qu'un objet par défaut `{ union, intersection, xor, difference }`. Ce
// complément de déclaration (fusionné avec le fichier .d.ts du package)
// ajoute l'export par défaut manquant sans toucher aux types déjà corrects
// (Pair/Ring/Polygon/MultiPolygon, réutilisés ici tels quels).
declare module "polygon-clipping" {
  interface PolygonClippingApi {
    union: typeof union;
    intersection: typeof intersection;
    xor: typeof xor;
    difference: typeof difference;
  }

  const polygonClipping: PolygonClippingApi;
  export default polygonClipping;
}
