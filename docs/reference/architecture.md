# Architecture des modules

Trois dossiers, trois responsabilités strictement séparées — voir
[Le modèle procédural](../explanation/modele-procedural.md) pour le pourquoi de cette
séparation.

```
src/
  core/     maths pures, aucun accès au DOM, aucune connaissance du SVG-rendu
  ui/       DOM/SVG, aucune maths géométrique
  assets/   silhouettes de motifs en coordonnées locales unitaires
  config.ts constantes ajustables (clé de stockage, seuils de geste, limites) — jamais de valeur de ce type ailleurs en dur
  main.ts   orchestrateur : état de l'app, câblage core <-> ui
```

## `src/core/`

| Fichier | Rôle |
| --- | --- |
| `types.ts` | `Point`, `EditableNode` (nœud + poignées Bézier), `CurveSample` (point échantillonné + tangente/normale/longueur d'arc). |
| `simplify.ts` | Ramer-Douglas-Peucker : réduit un tracé brut à ses points de contrôle significatifs. |
| `spline.ts` | `autoHandles()` calcule des poignées lissées par défaut ; `buildCurveFromNodes()` échantillonne la courbe de Bézier composite à pas régulier et calcule tangente/normale en chaque point. `insertNodeAt`/`removeNodeAt` ajoutent/retirent un nœud sur une liane existante (poignées relissées localement autour du point touché seulement) ; `nearestSegmentIndex` trouve le segment le plus proche d'un point cliqué, pour choisir où insérer. |
| `stem.ts` | Profil d'épaisseur (`widthProfile`, fin aux extrémités) et génération du polygone fermé de la tige (`buildStemPath`). |
| `brush.ts` | `placeBrush()` : marche le long de la courbe par pas d'arc, calcule position/angle/échelle de chaque instance de motif et lui assigne un `motifId` selon la séquence active. |
| `vine.ts` | Point d'entrée du moteur : `nodesFromStroke`/`nodesFromClicks` (création) et `regenerateVine` (recalcul tige+motifs à partir des nœuds courants — appelé à la création comme à chaque édition). |
| `junction.ts` | `unionStemPolygons()` : fusionne par opération booléenne (bibliothèque `polygon-clipping`) les polygones de tige d'une liane et de ses branches en un seul contour, pour l'export — voir [Créer une branche](../how-to/creer-une-branche.md). Découpe aussi ce contour par intersection avec un masque optionnel (zone de travail — voir `mask.ts`). |
| `mask.ts` | `isPointInMask()` : test point-dans-polygone (lancer de rayon), utilisé à l'export pour ne garder que les motifs dont l'attache tombe dans la zone de travail — voir [Définir une zone de travail](../how-to/definir-une-zone-de-travail.md). |
| `history.ts` | `SnapshotHistory` : pile annuler/rétablir générique par instantanés (chaînes opaques) — aucune connaissance des lianes. |
| `persistence.ts` | `saveToStorage`/`loadFromStorage` : accès `localStorage` générique (clé + chaîne), toujours défensif (stockage indisponible = non fatal). |

`vine.ts` porte aussi `SerializedVine`/`CanvasSnapshot` et `serializeCanvas`/`deserializeCanvas`
— la forme persistable de tout le canevas (lianes et zone de travail) et sa validation :
une donnée corrompue ou de forme incompatible est écartée (`null`) avant d'atteindre le
pipeline de régénération, pour qu'un instantané invalide ne puisse jamais bloquer le
démarrage.

`core/` ne connaît que des chaînes `motifId` — jamais de `pathD` SVG ni de couleur, voir
[Ajouter un nouveau motif](../how-to/ajouter-un-motif.md).

## `src/ui/`

| Fichier | Rôle |
| --- | --- |
| `pointerCapture.ts` | Unifie souris/stylet/tactile via la Pointer Events API ; `attachPointerCapture` pour le tracé libre, `attachClickToPlace` pour le mode « Points ». |
| `renderer.ts` | Gère le DOM SVG : crée/actualise les groupes de liane, résout `motifId → pathD` via `getMotif()`, sérialise l'export. `setMask()` pose/retire un `clip-path` SVG sur le calque des lianes pour le recadrage en direct (l'export, lui, découpe réellement la géométrie — voir `core/junction.ts`). |
| `nodeEditor.ts` | Overlay d'édition (ancres + poignées glissables) pour la liane sélectionnée. |

## `src/assets/`

| Fichier | Rôle |
| --- | --- |
| `leaf.ts`, `flower.ts`, `volute.ts` | Un `pathD` unitaire chacun (origine = point d'attache, extension vers `+x`). |
| `motifs.ts` | Registre `MOTIFS` et `getMotif(id)` — seul point de couplage entre un `motifId` et son rendu. |

## Flux de données

```
geste utilisateur (souris/tactile/clics)
  → pointerCapture / clickToPlace          (ui, coordonnées SVG brutes)
  → findAttachment                         (main.ts, accroche à une liane voisine → parentId)
  → simplifyRDP + autoHandles              (core, → EditableNode[])
  → regenerateVine                         (core, à chaque édition aussi)
      → buildCurveFromNodes                (core, → CurveSample[])
      → buildStemPolygon + polygonToPath   (core, → polygone + path tige, sans amincir la racine d'une branche)
      → placeBrush                         (core, → BrushPlacement[] avec motifId)
  → renderer.updateVine                    (ui, résout motifId → pathD, écrit le DOM)
```

Un nœud reste vivant tant que sa liane existe : toute édition (glisser un point, une
poignée, changer un curseur) relance `regenerateVine` sur les mêmes nœuds — rien n'est
jamais figé avant l'export.

À l'écran, chaque liane (branches comprises) garde son propre `<path>` de tige
indépendant — c'est ce qui permet de cliquer précisément sur l'une d'elles pour la
sélectionner. Seul l'export regroupe les lianes reliées par une chaîne de branches et
fusionne leurs polygones via `unionStemPolygons()` en un contour unique.
