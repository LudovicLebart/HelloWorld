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
public/
  icons/    icônes de l'app (manifest PWA, favicon) — voir plus bas
```

## `src/core/`

| Fichier | Rôle |
| --- | --- |
| `types.ts` | `Point`, `EditableNode` (nœud + poignées Bézier, `corner?: boolean` pour un nœud « coin » à poignées indépendantes), `CurveSample` (point échantillonné + tangente/normale/longueur d'arc). |
| `simplify.ts` | Ramer-Douglas-Peucker : réduit un tracé brut à ses points de contrôle significatifs. |
| `spline.ts` | `autoHandles()` calcule des poignées lissées par défaut ; `buildCurveFromNodes()` échantillonne la courbe de Bézier composite à pas régulier et calcule tangente/normale en chaque point. `insertNodeAt`/`removeNodeAt` ajoutent/retirent un nœud sur une liane existante (poignées relissées localement autour du point touché seulement — un nœud « coin » voisin n'est jamais relissé) ; `nearestSegmentIndex` trouve le segment le plus proche d'un point cliqué, pour choisir où insérer. `setNodeCorner()` bascule un nœud lisse/coin, réalignant les poignées en miroir au retour en lisse. |
| `stem.ts` | Profil d'épaisseur (`widthProfile`, fin aux extrémités) et génération du polygone fermé de la tige (`buildStemPath`). |
| `brush.ts` | `placeBrush()` : marche le long de la courbe par pas d'arc, calcule position/angle/échelle de chaque instance de motif et lui assigne un `motifId` selon la séquence active. `MotifSequenceEntry` porte l'échelle et le jitter propres à chaque motif — plus de réglage global unique, voir [Séquencer les motifs](../how-to/sequencer-des-motifs.md). |
| `vine.ts` | Point d'entrée du moteur : `nodesFromStroke`/`nodesFromClicks` (création) et `regenerateVine` (recalcul tige+motifs à partir des nœuds courants — appelé à la création comme à chaque édition). |
| `curvatureSpiral.ts` | `sampleCurvatureSpiral()` : échantillonne une volute en repère local à partir d'une loi de courbure κ(s) = endCurvature·(s/length)^curvatureExponent en fonction de la longueur d'arc parcourue (intégration numérique par point milieu), pas d'un angle polaire fixé d'avance — voir [Ce qui rend une arabesque gracieuse](../explanation/principes-esthetiques.md) pour pourquoi une spirale logarithmique classique ne peut structurellement pas produire le profil recherché (courbure quasi nulle au départ, resserrement tardif). Retourne aussi la tangente de départ (toujours `(1, 0)` par construction), pour que l'appelant puisse raccorder la volute à une tangente donnée. |
| `branching.ts` | Génération automatique de branches secondaires : `planAutoBranches()` choisit les points d'accroche le long d'une tige (densité proportionnelle à la longueur, espacement perturbé par le nombre d'or, alternance gauche/droite) ; `buildAutoBranchPoints()` construit les points bruts d'une volute (raccord tangent à `AUTO_BRANCH.launchAngle` de la tige parente, taille et courbure de pointe décroissant géométriquement le long de la tige) — voir [Ce qui rend une arabesque gracieuse](../explanation/principes-esthetiques.md). Son 4ᵉ paramètre optionnel (`overrides: AutoBranchShapeOverrides`) remplace ponctuellement `branchLengthFactor`/`endCurvatureFactor`/`curvatureExponent`/`sizeDecay` — c'est par là que les curseurs de `main.ts` (voir [Générer des volutes automatiquement](../how-to/generer-des-volutes-automatiquement.md)) rendent ces réglages ajustables en direct sans toucher aux valeurs par défaut de `AUTO_BRANCH`. Les points produits repassent par `autoHandles()`/`nodesFromClicks()` comme n'importe quel tracé : les branches générées restent des lianes normales, éditables comme les autres. |
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
| `pointerCapture.ts` | Unifie souris/stylet/tactile via la Pointer Events API ; `attachPointerCapture` pour le tracé libre, `attachClickToPlace` pour le mode « Points ». `exceedsDragThreshold()` (seuil `TAP_DRAG_THRESHOLD`) distingue un tap d'un drag — partagé entre `attachStemDrag` (ci-dessous) et `nodeEditor.ts`. |
| `renderer.ts` | Gère le DOM SVG : crée/actualise les groupes de liane, résout `motifId → pathD` via `getMotif()`, sérialise l'export. `removeVine(id)` retire une seule liane (groupe SVG + gestes) sans toucher aux autres — utilisé par `generateAutoBranches()` (main.ts) pour remplacer un lot de volutes auto-générées plutôt que l'empiler. `setMask()` pose/retire un `clip-path` SVG sur le calque des lianes pour le recadrage en direct (l'export, lui, découpe réellement la géométrie — voir `core/junction.ts`). `exportSVG()` regroupe toutes les tiges dans un calque `#layer-stem` et sépare les motifs un par un dans `#layer-<motifId>` (un calque par motif effectivement utilisé), couvrant tout le canevas — pas de groupe par liane comme à l'écran, voir [Exporter pour CNC/laser](../how-to/exporter-pour-cnc-laser.md). L'id `stem` est réservé (voir `assets/motifs.ts`) : aucun motif ne peut le revendiquer, pour ne jamais dupliquer `#layer-stem` à l'export. |
| `nodeEditor.ts` | Overlay d'édition (ancres + poignées glissables) pour la liane sélectionnée. Glisser une poignée l'applique immédiatement, sans seuil (pas de geste de tap à protéger sur une poignée). Un tap (mouvement sous `TAP_DRAG_THRESHOLD`, via `exceedsDragThreshold`) sur une ancre bascule son nœud lisse/coin, différé de `ANCHOR_TAP_DELAY` (config.ts) pour rester distinguable d'un double-clic (qui supprime le nœud) sur le même élément. |
| `motifList.ts` | Construit et interroge le DOM de `#motif-list` (une rangée par motif : ordre, activation, échelle, jitter) — pure DOM, aucun état applicatif ; `main.ts` y branche les gestionnaires d'événements (undo, sauvegarde, régénération). |

## `src/assets/`

| Fichier | Rôle |
| --- | --- |
| `leaf.ts`, `flower.ts`, `volute.ts` | Un `pathD` unitaire chacun (origine = point d'attache, extension vers `+x`) — motifs « internes », silhouettes calculées par code. |
| `motifs/*.svg` | Motifs « externes » : un fichier `.svg` par motif, chargé au build via `import.meta.glob` — voir [Ajouter un nouveau motif](../how-to/ajouter-un-motif.md). Aucune modification de code nécessaire pour en ajouter un. |
| `motifs.ts` | Registre `MOTIFS` (motifs internes + tous les `.svg` de `motifs/`) et `getMotif(id)` — seul point de couplage entre un `motifId` et son rendu (`pathD`, couleur, `scaleFactor`). |

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

## Tests automatisés

`npm test` (Vitest, environnement jsdom) exécute `src/core/*.test.ts` — un fichier de
test par module de `core/`, colocalisé avec le code qu'il couvre. Portent
volontairement sur `core/` uniquement (maths pures, sans DOM à simuler) : la géométrie
(simplification RDP, poignées auto-lissées et nœuds coin, profil d'épaisseur de la
tige, placement du brush, point-dans-masque), la fusion booléenne et son corner join
(`unionStemPolygons`), l'historique annuler/rétablir, la persistance localStorage
(défensive si indisponible), et la sérialisation d'un instantané de canevas
(round-trip, rejet d'une donnée corrompue ou de forme incompatible). `src/ui/` et
`main.ts` (DOM, gestes) restent vérifiés manuellement dans le navigateur — voir les
guides pratiques de `docs/how-to/`. Un push sur `master` fait tourner ces tests avant
le build et le déploiement (`.github/workflows/deploy-pages.yml`) : un test qui casse
bloque le déploiement.

## PWA / hors-ligne

`vite-plugin-pwa` (configuré dans `vite.config.ts`) génère au build un service worker
(`dist/sw.js`, stratégie `generateSW` de Workbox) qui précache tout le shell buildé
(JS, CSS, HTML, icônes) — l'app fonctionne hors-ligne dès la deuxième visite et
s'installe comme une app sur téléphone ou ordinateur, voir
[Installer l'app et l'utiliser hors-ligne](../how-to/installer-hors-ligne.md).
`registerType: "autoUpdate"` met à jour le service worker en tâche de fond à chaque
visite en ligne, sans action de l'utilisateur.

Le manifest (`manifest.webmanifest`, nom/icônes/couleurs/`display: standalone`) est
déclaré dans la même config plutôt qu'en fichier statique séparé — `id`/`start_url`/
`scope` valent tous `/HelloWorld/` (le sous-chemin d'hébergement GitHub Pages, voir
`base` dans `vite.config.ts`). Les icônes (`public/icons/`) sont un `.svg` (favicon,
sert aussi de source) et deux `.png` rasterisés (192×192, 512×512, plus un
`apple-touch-icon.png` 180×180) — aucune n'est déclarée « maskable », donc pas
besoin de marge de sécurité dans le dessin.

Le service worker n'est actif qu'en build de production (`npm run build` /
`vite preview`), jamais en `npm run dev` — évite qu'un cache de service worker
interfère avec le rechargement à chaud pendant le développement.
