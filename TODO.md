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
- [ ] Charger de vrais fichiers `.svg` externes comme motifs, plutôt que des
      silhouettes générées en interne (`src/assets/*.ts`) — nécessaire pour que
      quelqu'un d'autre que le développeur puisse ajouter un motif sans toucher au code
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
- [ ] Nœud « coin » (poignées indépendantes, non miroir) en plus du nœud lisse actuel
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
- [ ] Export séparé par motif (toutes les feuilles ensemble, toutes les volutes
      ensemble, etc.), utile si chaque motif va dans un matériau différent

## Infrastructure

- [x] App web TypeScript + SVG natif (Vite), aucune installation nécessaire
- [x] Déploiement continu vers GitHub Pages sur push `master`
- [ ] Tests automatisés (aujourd'hui : vérifications manuelles ad hoc en cours de
      développement, rien qui tourne en CI)
- [ ] PWA / usage hors-ligne sur téléphone (aujourd'hui : site web classique, nécessite
      une connexion pour charger la page)

## Hors-scope pour l'instant

Idées écartées ou reportées volontairement, pour ne pas recréer un Illustrator
générique — voir [`docs/explanation/modele-procedural.md`](docs/explanation/modele-procedural.md) :

- Édition manuelle de la géométrie interne d'un motif (ex. déplacer un pétale
  individuellement) — casserait la valeur procédurale de l'outil.
- Import/édition de fichiers SVG arbitraires comme squelette de départ.
