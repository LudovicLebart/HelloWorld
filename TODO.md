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
- [ ] Vrai « corner join » quand deux segments de tige forment un angle très aigu (cas
      limite non traité, l'offset peut légèrement se chevaucher)

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
- [ ] Séquence personnalisable par l'utilisateur (actuellement l'ordre feuille →
      volute → fleur est fixe, seule l'activation de chaque motif est réglable)
- [ ] Réglages (échelle, jitter) indépendants par motif plutôt que globaux à la séquence

## Étape 3 — Interaction & édition non-destructive (l'UX)

- [x] Édition de nœuds : sélection d'une liane, déplacement des points d'ancrage
- [x] Poignées Bézier éditables par nœud (glisser-déposer, continuité lisse en miroir)
- [x] Mode « Points » : poser le squelette clic par clic plutôt qu'à main levée
- [ ] Multi-tracés et connexions : dessiner une branche secondaire qui naît d'une
      branche principale, avec ajustement propre de l'épaisseur à la jonction —
      identifié dans le plan initial comme le plus gros défi mathématique du projet
      (opérations booléennes sur polygones, type bibliothèque Clipper)
- [ ] Masques d'écrêtage : définir une zone de travail (ex. la forme d'un pickguard)
      pour que les lianes ne dépassent jamais de la zone délimitée
- [ ] Nœud « coin » (poignées indépendantes, non miroir) en plus du nœud lisse actuel
- [ ] Annuler/refaire (undo/redo) — aucune action n'est réversible actuellement
- [ ] Sauvegarde/reprise (localStorage a minima) — tout le canevas est perdu au
      rechargement de la page

## Étape 4 — Export & production (le livrable)

- [x] Export SVG en chemins fermés (tige et motifs), jamais de traits épaissis
- [x] Séparation Tige/Feuilles en sous-calques, mais **par liane**
- [ ] Calques globaux Tige/Feuilles couvrant tout le canevas (toutes lianes
      confondues), pour découper en un lot toutes les tiges dans un matériau et
      tous les motifs dans un autre — voir
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
