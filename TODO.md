# Plan et avancement

Suit le découpage en 4 étapes du plan initial. `[x]` fait, `[ ]` à faire. Pour le
détail de ce qui existe déjà, voir [`docs/reference/architecture.md`](docs/reference/architecture.md).

## Étape 1 — Moteur vectoriel core (le squelette)

- [x] Acquisition du tracé (souris/stylet/tactile unifiés via Pointer Events)
- [x] Simplification RDP, avec densité réglable par l'utilisateur
- [x] Interpolation lisse (nœuds Bézier, poignées auto-lissées) — voir
      [`docs/explanation/courbes-et-noeuds.md`](docs/explanation/courbes-et-noeuds.md)
      pour l'historique des deux versions précédentes (Catmull-Rom uniforme puis
      centripète, toutes deux remplacées)
- [x] Tige en polygone fermé, épaisseur variable (fine aux extrémités)
- [x] Calcul exact de la tangente et de la normale en tout point
- [x] Vrai « corner join » quand deux segments de tige forment un angle très aigu :
      `unionStemPolygons()` (`core/junction.ts`) passe toujours par `union()`, même
      pour une liane seule sans branche — l'auto-intersection éventuelle du contour
      brut dans un virage très serré est ainsi normalisée en contours simples, sans
      recouvrement, à l'export

## Étape 2 — Système de brush paramétrique (l'habillage)

- [x] Plusieurs motifs (feuille, volute, fleur) au lieu d'un seul
- [x] Séquenceur : les motifs actifs alternent en boucle le long de la tige
- [x] Jitter (échelle, angle, décalage d'attache)
- [x] Échelle dégressive vers les extrémités de la liane
- [x] Angle variable par rapport à la tangente de la tige
- [x] Espacement réglable
- [x] Charger de vrais fichiers `.svg` externes comme motifs, plutôt que des
      silhouettes générées en interne (`src/assets/*.ts`) — tout `.svg` déposé dans
      `src/assets/motifs/` est chargé au build (`import.meta.glob`) et devient un
      motif disponible, aucun code à toucher. Voir
      [Ajouter un nouveau motif](docs/how-to/ajouter-un-motif.md)
- [x] Séquence personnalisable par l'utilisateur : flèches ↑/↓ par motif dans
      `#motif-list`, l'ordre du DOM fait foi (pas de tableau séparé à synchroniser) —
      voir [Séquencer les motifs](docs/how-to/sequencer-des-motifs.md)
- [x] Réglages (échelle, jitter) indépendants par motif plutôt que globaux à la
      séquence — `MotifSequenceEntry` dans `core/brush.ts`, plus de curseurs Échelle/
      Jitter globaux

## Étape 3 — Interaction & édition non-destructive (l'UX)

- [x] Édition de nœuds : sélection d'une liane, déplacement des points d'ancrage
- [x] Poignées Bézier éditables par nœud (glisser-déposer, continuité lisse en miroir)
- [x] Ajouter un nœud (double-clic sur la tige) / en retirer un (double-clic sur son
      ancre) sur une liane déjà tracée — poignées relissées localement seulement
      autour du point touché, au moins 2 nœuds toujours conservés
- [x] Mode « Points » : poser le squelette clic par clic plutôt qu'à main levée
- [x] Multi-tracés et connexions : démarrer un tracé à proximité d'une liane
      existante en fait une branche, ancrée dessus ; à l'export, les contours de
      tige de toute une grappe (liane + branches) sont fusionnés en un seul chemin
      par opération booléenne (`polygon-clipping`) — plus de double-trait à la
      jonction. Voir [`docs/how-to/creer-une-branche.md`](docs/how-to/creer-une-branche.md).
      Limite connue : la racine d'une branche n'est pas re-accrochée
      automatiquement si on édite ensuite les nœuds de la liane parente.
- [x] Masques d'écrêtage : définir une zone de travail (ex. la forme d'un pickguard)
      pour que les lianes ne dépassent jamais de la zone délimitée — mode « Masque »,
      recadrage en direct par `clip-path` SVG à l'écran, découpe réelle par
      intersection booléenne à l'export (les motifs hors zone sont omis en entier,
      jamais recoupés partiellement). Voir
      [`docs/how-to/definir-une-zone-de-travail.md`](docs/how-to/definir-une-zone-de-travail.md).
- [x] Nœud « coin » (poignées indépendantes, non miroir) en plus du nœud lisse actuel :
      tap sur une ancre pour basculer (repasser en lisse réaligne les poignées en
      miroir) — voir [Éditer une liane existante](docs/how-to/editer-une-liane.md)
- [x] Annuler/refaire (Ctrl+Z / Ctrl+Y, boutons dans la barre d'outils) : instantané
      complet avant chaque action structurelle (création, déplacement de nœud,
      effacement) — les réglages de curseurs ne créent pas d'étape d'annulation
- [x] Sauvegarde/reprise automatique (localStorage) : le canevas est repris tel quel
      au rechargement de la page ; l'historique d'annulation, lui, ne l'est pas

## Étape 4 — Export & production (le livrable)

- [x] Export SVG en chemins fermés (tige et motifs), jamais de traits épaissis
- [x] Calques globaux Tige/Feuilles couvrant tout le canevas (toutes lianes
      confondues), pour découper en un lot toutes les tiges dans un matériau et
      tous les motifs dans un autre (`#layer-stem`/`#layer-leaves`, plus de
      regroupement par liane à l'export) — voir
      [`docs/how-to/exporter-pour-cnc-laser.md`](docs/how-to/exporter-pour-cnc-laser.md)
- [x] Export séparé par motif (toutes les feuilles ensemble, toutes les volutes
      ensemble, etc.), utile si chaque motif va dans un matériau différent — un calque
      `#layer-<motifId>` par motif effectivement utilisé, plus de calque unique
      mélangeant tous les motifs

## Infrastructure

- [x] App web TypeScript + SVG natif (Vite), aucune installation nécessaire
- [x] Déploiement continu vers GitHub Pages sur push `master`
- [x] Tests automatisés : suite Vitest par module de `core/` (géométrie, fusion
      booléenne/corner join, historique, persistance, sérialisation), colocalisée en
      `src/core/*.test.ts` — voir [Architecture des modules](docs/reference/architecture.md#tests-automatisés).
      Tourne en CI (`npm test`) avant chaque build/déploiement, un test qui casse
      bloque le déploiement. `src/ui/`/`main.ts` restent vérifiés manuellement.
- [x] PWA / usage hors-ligne sur téléphone : manifest + service worker
      (`vite-plugin-pwa`, précache tout le shell buildé), installable sur l'écran
      d'accueil, fonctionne sans connexion une fois ouverte une première fois — voir
      [Installer l'app et l'utiliser hors-ligne](docs/how-to/installer-hors-ligne.md)

## Étape 5 — Génération procédurale de l'habillage (grâce/esthétique)

Faire générer automatiquement les courbes secondaires (volutes, ramifications) à partir
d'une ou deux courbes tracées, plutôt que de se limiter à habiller la ligne tracée par
l'utilisateur — voir
[Ce qui rend une arabesque gracieuse](docs/explanation/principes-esthetiques.md) pour
les principes retenus (spirale logarithmique, fairness, angle d'or, tangence,
décroissance géométrique).

- [x] Prototype : module de branchement automatique appliquant ces règles à une tige
      existante — `core/logSpiral.ts` (échantillonnage de spirale logarithmique) +
      `core/branching.ts` (points d'accroche, raccord tangent, décroissance
      géométrique), bouton **Volutes auto** dans la barre d'outils. Voir
      [Générer des volutes automatiquement](docs/how-to/generer-des-volutes-automatiquement.md).
      Prototype volontairement figé (constantes `AUTO_BRANCH`, pas de réglages dédiés
      ni de remplacement d'un lot déjà généré) — à affiner une fois la direction
      validée à l'usage.
Piste écartée : dériver le côté d'une volute de la courbure locale de la tige (jamais
vers le creux d'un virage, principe du bonsaï) — essayé puis retiré après examen du
moodboard ci-dessous, dont les références ne suivent pas cette contrainte. Voir la fin
de [Ce qui rend une arabesque gracieuse](docs/explanation/principes-esthetiques.md).

Pistes identifiées à partir d'un moodboard de références (volutes Art nouveau/rinceau,
voir la conversation du 2026-09-04) — non planifiées dans un ordre précis, à trier
quand on y revient :

- [x] Volutes récursives : une volute générée fait pousser sa propre volute plus
      petite (en cascade, profondeur limitée par `AUTO_BRANCH.recursionDepth`) plutôt
      qu'une volute isolée par point d'accroche — donne la « touffe » dense de
      spirales imbriquées visible dans la plupart des références. Implémenté dans
      `main.ts` (`spawnAutoBranches()`), en réappliquant `planAutoBranches()`/
      `buildAutoBranchPoints()` (`core/branching.ts`, inchangé) à la courbe de chaque
      branche nouvellement créée — aucune nouvelle logique dans `core/`. Voir
      [Générer des volutes automatiquement](docs/how-to/generer-des-volutes-automatiquement.md).
- [x] Forme de la spirale : à l'usage (test sur la version déployée), le resserrement
      par défaut (`growthRate`) donnait des volutes qui « tournent trop vite sur
      elles-mêmes » — pelotes serrées plutôt que boucles ouvertes et lisibles. Contraire
      à la piste envisagée ici (2-3 tours, plus serré) : la vraie correction était
      d'ouvrir la spirale (`growthRate` réduit de `0.15` à `0.07` par défaut). En plus
      du correctif, `turns`/`growthRate`/`startRadiusFactor`/`sizeDecay`/
      `recursionDepth` sont devenus des curseurs (`index.html`, à côté du bouton
      **Volutes auto**) plutôt que des constantes figées — `buildAutoBranchPoints()`
      (`core/branching.ts`) prend un 4ᵉ paramètre optionnel `overrides` pour ça,
      rétrocompatible (défaut = `AUTO_BRANCH` inchangé). Voir
      [Générer des volutes automatiquement](docs/how-to/generer-des-volutes-automatiquement.md).
- [x] Remplacer le lot plutôt que l'empiler : cliquer **Volutes auto** une deuxième
      fois sur la même liane retire d'abord le lot généré au clic précédent
      (`VineParams.autoGenerated` marque l'origine d'une liane, survit à l'undo/redo et
      au rechargement ; `Renderer.removeVine()` retire une liane individuelle du DOM ;
      `collectAutoDescendants()` dans `main.ts` retrouve tout le lot). Un seul pas
      d'annulation pour le retrait et la régénération. Limite connue : une liane
      tracée à la main sur une volute auto-générée devient orpheline si cette volute
      est retirée lors d'un remplacement — voir le how-to.
- [x] Génération automatique au tracé + curseurs live : plus besoin de cliquer
      **Volutes auto** — tracer une ligne (tige racine ou branche tirée à la main)
      lui donne ses volutes tout de suite (`regenerateAutoVolutes()` appelé depuis
      `createVineFromNodes()`, même pas d'annulation que le tracé), et les 5 curseurs
      de forme régénèrent en direct (`refreshAutoVolutes()`, même schéma que Épaisseur
      tige/Espacement : pas de pas d'annulation par micro-ajustement). Le bouton
      **Volutes auto** reste comme déclencheur manuel de secours (liane ancienne,
      après édition de nœuds).
      Barre d'outils simplifiée en même temps (« mode focus volutes », temporaire et
      réversible — voir les commentaires `hidden` dans `index.html`) : modes
      Points/Masque, séquenceur de motifs et curseur Espacement masqués pour laisser
      la place au dessin ; gardés visibles : Densité, Épaisseur tige, Volutes auto (+
      curseurs), Annuler/Rétablir, Effacer, Exporter SVG.
- [x] Galerie moodboard sauvegardée en Artifact (« Planches Volutes », 9 planches
      numérotées) — sert de guide pour caler les prochains réglages. Planche 5 (trait
      calligraphique pur, sans feuillage, quelques grandes boucles ouvertes) prise
      comme première cible : `AUTO_BRANCH.spacing` 90→160, `startRadiusFactor` 3.5→5,
      `recursionDepth` 2→0 (moins de volutes, plus grandes, sans imbrication) ; aucun
      motif actif par défaut (`core/brush.ts` et `main.ts` traitent désormais une
      séquence vide comme un état légitime, plus un repli défensif sur un motif par
      défaut).
- [x] Planche 3 (vrille fine, tendeurs nombreux, feuillage clairsemé) prise comme
      cible suivante — première passe par réglage seul, sans nouvelle logique
      `core/` : `AUTO_BRANCH.spacing` 160→70, `startRadiusFactor` 5→2.2, `turns`
      1.6→2 (tendeurs plus petits et plus fréquents) ; motif Feuille seul actif par
      défaut (Fleur/Volute-motif/Baie décochées) ; `Espacement` (brush) 26→40 pour
      garder le feuillage clairsemé plutôt que dense sur la tige principale.
      Volontairement pas encore de regroupement explicite de feuilles aux points
      d'embranchement (item suivant) — à réévaluer si ce réglage seul ne suffit pas.
- [x] Volutes plus fines, plus longues, courbure progressive : retour utilisateur
      sur le rendu déployé — les volutes devaient être plus fines que la tige qui
      les porte, beaucoup plus longues, et se courber doucement d'abord (grand arc
      quasi droit à l'attache) plutôt que de tourner déjà serré sur elles-mêmes dès
      le premier tour (« escargot »), la rotation serrée n'intervenant que tard, sur
      la toute dernière portion. Trois changements : (1) `AUTO_BRANCH.stemWidthFactor`
      (nouveau, 0.4) — `addVine()` dans `main.ts` réduit l'épaisseur d'une volute
      auto-générée à cette fraction de celle de sa tige porteuse, sans toucher au
      rayon de la spirale (qui reste basé sur l'épaisseur de la tige racine, voir
      `spawnAutoBranches`) ; (2) `LogSpiralOptions.curvatureRampPower` (nouveau,
      `core/logSpiral.ts`) — retarde la décroissance du rayon vers la fin du parcours
      angulaire plutôt que de la répartir uniformément (spirale log classique
      auto-similaire), voir la note ajoutée dans
      [Ce qui rend une arabesque gracieuse](docs/explanation/principes-esthetiques.md) ;
      (3) recalibrage `turns` (5 en cours de route, stabilisé à 3) / `growthRate`
      (0.07→0.13) / `curvatureRampPower` (4) trouvé par exploration numérique rapide
      (rendu de plusieurs combinaisons en SVG statique) plutôt qu'aller-retour complet
      dans l'app à chaque essai. `startRadiusFactor` (2.2→10) déjà relevé en route.
      Voir [Générer des volutes automatiquement](docs/how-to/generer-des-volutes-automatiquement.md).
- [x] Remplacement du modèle de courbe (spirale logarithmique → clothoïde généralisée) :
      malgré le recalibrage précédent, le résultat restait "loin de l'objectif" — un
      agent Sonnet dédié (lancé en tâche de fond, contexte complet : fichiers, historique,
      diagnostic préliminaire) a confirmé la cause racine : dans `sampleLogSpiral()`,
      l'angle polaire θ est directement la coordonnée de dessin et avance à pas constant
      sur `turns·2π` — la courbe boucle donc TOUJOURS intégralement `turns` fois autour
      de l'origine, quel que soit `growthRate`/`curvatureRampPower` (qui ne pilotaient que
      la vitesse de décroissance du *rayon* le long de ce parcours déjà figé). Une
      spirale log à taux constant étant en outre auto-similaire par construction, aucune
      reparamétrisation ne pouvait produire le profil recherché (courbure quasi nulle au
      départ, resserrement tardif) — voir la note détaillée dans
      [Ce qui rend une arabesque gracieuse](docs/explanation/principes-esthetiques.md).
      Remplacé `core/logSpiral.ts` par `core/curvatureSpiral.ts` : `sampleCurvatureSpiral()`
      définit la courbe par une loi de courbure κ(s) = endCurvature·(s/length)^curvatureExponent
      en fonction de la longueur d'arc s (spirale d'Euler/clothoïde généralisée), intégrée
      numériquement (méthode du point milieu) — κ(0) = 0 par construction, donc plus jamais
      d'« escargot » dès l'attache, quel que soit `curvatureExponent`. `AUTO_BRANCH` :
      `turns`/`growthRate`/`startRadiusFactor`/`curvatureRampPower`/`samplesPerTurn`
      remplacés par `branchLengthFactor`/`endCurvatureFactor`/`curvatureExponent`/
      `curveSteps` (60), calibrés par exploration numérique rapide (SVG statique, plusieurs
      combinaisons) plutôt qu'aller-retour complet dans l'app à chaque essai. Curseurs UI
      remaniés en conséquence (Tours + Taille de départ fusionnés en **Longueur** ;
      **Progressivité**, nouveau, remplace la constante fixe `curvatureRampPower`) —
      toujours 5 curseurs, même schéma live. `logSpiral.test.ts` remplacé par
      `curvatureSpiral.test.ts` (courbure discrète croissante et monotone, retardée par un
      `curvatureExponent` plus grand — remplace le test "le rayon décroît vers un centre
      fixe", qui n'avait plus de sens). `branching.test.ts` inchangé (aucune référence aux
      anciens noms de champs). Voir
      [Générer des volutes automatiquement](docs/how-to/generer-des-volutes-automatiquement.md).
- [x] Recalibrage du profil de courbure (`branchLengthFactor` 90→70, `endCurvatureFactor`
      0.7→0.35, `curvatureExponent` 4→2) : premier réglage de la clothoïde jugé "mieux mais
      loin de l'objectif" — le geste presque droit restait trop long, et une fois la
      courbure amorcée elle montait trop vite vers sa valeur finale ("la spirale va trop
      vite"). Nouvelle exploration numérique rapide (mêmes 6 candidats comparés en SVG
      statique) : réduire `curvatureExponent` raccourcit la fraction de longueur restant
      quasi droite avant que la courbure ne devienne perceptible ; réduire `endCurvatureFactor`
      en proportion réduit le nombre total de tours (≈ 2 → ≈ 1,3) pour une pointe qui
      s'ouvre en un coil net plutôt qu'un petit nœud très serré. Vérifié visuellement :
      geste initial nettement plus court, transition progressive vers un coil ouvert plutôt
      qu'un resserrement brutal en fin de parcours.
- [x] Angle de séparation et sens d'enroulement : retour utilisateur — l'angle de départ
      (`launchAngle`) semblait quasiment perpendiculaire à la tige (75°), alors que dans la
      nature une vrille ou un rameau secondaire se sépare plutôt à 45-70° ; réduit à 60°
      (`Math.PI / 2.4` → `Math.PI / 3`). Sens d'enroulement inversé : le coil se recourbait
      vers l'arrière, en direction de la racine de la tige, plutôt que de sembler "chercher
      à aller vers l'extérieur" (retour utilisateur). Cause : `buildAutoBranchPoints()`
      (`core/branching.ts`) faisait tourner la volute dans le MÊME sens que son premier
      écart par rapport à la tangente parente (`clockwise: attachment.side === -1`) —
      prolonger cet écart la fait recourber vers la racine. Inversé (`attachment.side ===
      1`) : la volute tourne dans le sens OPPOSÉ à son premier écart, donc le coil se
      referme du côté où la tige continue de croître plutôt que vers sa racine. Vérifié par
      une exploration géométrique dédiée (4 combinaisons angle/sens rendues en SVG
      statique, tige de repère dessinée en gris) avant application dans le vrai modèle,
      puis confirmé visuellement dans l'app : volutes qui s'écartent en diagonale nette et
      s'enroulent vers l'avant plutôt que de replier sur la tige.
      **Rejeté par l'utilisateur** ("non pas du tout") juste après déploiement — voir l'item
      suivant pour la suite (nouvelle image de référence, sens d'enroulement encore à revoir).
- [x] Base de la tige jamais effilée (forme triangle, pas fuseau) : `liveParams()`
      (`main.ts`) fixait `taperStart: !parentId` — la tige principale (sans parent) s'effilait
      donc à SA PROPRE base (le tout premier point tracé), en plus de sa pointe, un fuseau à
      deux pointes plutôt qu'un triangle. Une vraie tige de plante reste pleine largeur à la
      base (elle émerge du sol) et ne s'effile que vers sa pointe — même principe déjà
      appliqué à la racine d'une branche (`taperStart: false` quand `parentId` est défini,
      pour qu'elle s'enfonce pleine largeur dans sa tige parente). `taperStart` passe à
      `false` inconditionnellement : plus de distinction racine/branche, aucune liane ne
      s'effile jamais à son point de départ. Vérifié visuellement (base pleine largeur,
      pointe effilée, sur la tige principale comme sur les volutes).
- [x] Nouvelle image de référence : planche de conception "Art & Lutherie Canada" (motif de
      pickguard principal gravé or sur noyer, plus détails pont/médaillon) — remplace le
      moodboard "Planches Volutes" comme cible de calibrage principale, motif d'intérêt : le
      pickguard principal (grand format, "PJ" = pickguard). Ajoutée à la galerie Artifact
      existante (PL. 10, republiée à la même URL —
      https://claude.ai/code/artifact/f15240f7-dee2-4e51-a372-8eaae7ed6997).
- [x] Comparaison visuelle vs planche 10 : le motif de référence ne montre presque aucune
      branche secondaire (volute) sur toute la longueur de sa tige — l'essentiel du motif y est
      porté par le feuillage directement attaché à la tige principale (`core/brush.ts`), pas
      par des branches générées (`core/branching.ts`). Écart le plus flagrant identifié : nos
      volutes étaient beaucoup trop fréquentes (4-6 sur un tracé courant) et dominaient
      visuellement la composition. Sur demande explicite de netravailler qu'un seul élément à
      la fois : `AUTO_BRANCH.spacing` relevé de 220 à 900 — un tracé qui remplit l'essentiel du
      canevas ne produit plus qu'une volute isolée, parfois aucune, comme sur la référence.
      Vérifié visuellement sur un tracé long (une volute) et un tracé court (aucune volute).
      Écarts non traités dans ce tour (délibérément, un seul élément à la fois) : densité et
      forme des feuilles (plus fines/allongées sur la référence, motif porté par pétiole plutôt
      que par branche), présence d'un point de branchement terminal (motif arbre/logo).
- [ ] Feuilles groupées aux points d'embranchement (2 à 4 ensemble) plutôt
      qu'espacées uniformément le long de toute la tige comme le fait `placeBrush`
      aujourd'hui — changement plus profond, touche au brush existant (`core/brush.ts`),
      découplé aujourd'hui de `core/branching.ts`. Prochaine étape si le réglage seul
      (item précédent) reste visuellement trop éloigné de la planche 3.
- [ ] Épaisseur de trait variable dans une volute (plus épais à l'attache, effilé
      vers le centre du coil) — effet calligraphique observé sur plusieurs références ;
      touche au profil d'épaisseur de la tige (`core/stem.ts`), aujourd'hui uniforme le
      long d'une branche générée.

## Hors-scope pour l'instant

Idées écartées ou reportées volontairement, pour ne pas recréer un Illustrator
générique — voir [`docs/explanation/modele-procedural.md`](docs/explanation/modele-procedural.md) :

- Édition manuelle de la géométrie interne d'un motif (ex. déplacer un pétale
  individuellement) — casserait la valeur procédurale de l'outil.
- Import/édition de fichiers SVG arbitraires comme squelette de départ.
