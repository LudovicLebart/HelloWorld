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
