# Architecture des modules

Trois dossiers, trois responsabilités strictement séparées — voir
[Le modèle procédural](../explanation/modele-procedural.md) pour le pourquoi de cette
séparation.

```
src/
  core/     maths pures, aucun accès au DOM, aucune connaissance du SVG-rendu
  ui/       DOM/SVG, aucune maths géométrique
  assets/   silhouettes de motifs en coordonnées locales unitaires
  main.ts   orchestrateur : état de l'app, câblage core <-> ui
```

## `src/core/`

| Fichier | Rôle |
| --- | --- |
| `types.ts` | `Point`, `EditableNode` (nœud + poignées Bézier), `CurveSample` (point échantillonné + tangente/normale/longueur d'arc). |
| `simplify.ts` | Ramer-Douglas-Peucker : réduit un tracé brut à ses points de contrôle significatifs. |
| `spline.ts` | `autoHandles()` calcule des poignées lissées par défaut ; `buildCurveFromNodes()` échantillonne la courbe de Bézier composite à pas régulier et calcule tangente/normale en chaque point. |
| `stem.ts` | Profil d'épaisseur (`widthProfile`, fin aux extrémités) et génération du polygone fermé de la tige (`buildStemPath`). |
| `brush.ts` | `placeBrush()` : marche le long de la courbe par pas d'arc, calcule position/angle/échelle de chaque instance de motif et lui assigne un `motifId` selon la séquence active. |
| `vine.ts` | Point d'entrée du moteur : `nodesFromStroke`/`nodesFromClicks` (création) et `regenerateVine` (recalcul tige+motifs à partir des nœuds courants — appelé à la création comme à chaque édition). |

`core/` ne connaît que des chaînes `motifId` — jamais de `pathD` SVG ni de couleur, voir
[Ajouter un nouveau motif](../how-to/ajouter-un-motif.md).

## `src/ui/`

| Fichier | Rôle |
| --- | --- |
| `pointerCapture.ts` | Unifie souris/stylet/tactile via la Pointer Events API ; `attachPointerCapture` pour le tracé libre, `attachClickToPlace` pour le mode « Points ». |
| `renderer.ts` | Gère le DOM SVG : crée/actualise les groupes de liane, résout `motifId → pathD` via `getMotif()`, sérialise l'export. |
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
  → simplifyRDP + autoHandles              (core, → EditableNode[])
  → regenerateVine                         (core, à chaque édition aussi)
      → buildCurveFromNodes                (core, → CurveSample[])
      → buildStemPath                      (core, → path tige)
      → placeBrush                         (core, → BrushPlacement[] avec motifId)
  → renderer.updateVine                    (ui, résout motifId → pathD, écrit le DOM)
```

Un nœud reste vivant tant que sa liane existe : toute édition (glisser un point, une
poignée, changer un curseur) relance `regenerateVine` sur les mêmes nœuds — rien n'est
jamais figé avant l'export.
