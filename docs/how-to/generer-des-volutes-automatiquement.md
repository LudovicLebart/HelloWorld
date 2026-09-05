# Générer des volutes automatiquement

Tracer une ligne (à main levée, en mode Libre) l'habille automatiquement de branches
secondaires en forme de volute, générées algorithmiquement — voir
[Ce qui rend une arabesque gracieuse](../explanation/principes-esthetiques.md) pour
les principes (courbure croissante en fonction de la longueur d'arc, rinceau,
phyllotaxie) dont les règles appliquées sont issues.

Les volutes sont fines (voir **Épaisseur** plus bas), longues, et suivent une courbure
progressive : un grand arc ouvert, presque droit à l'attache, qui se resserre de plus
en plus, la rotation serrée sur elle-même n'intervenant que tard, sur la toute
dernière portion — comme une vraie vrille de vigne, pas un escargot déjà enroulé dès
l'attache. Ce comportement vient directement du modèle de courbe (`core/curvatureSpiral.ts`,
une spirale d'Euler/clothoïde généralisée) plutôt que d'un simple réglage de
constantes — voir la note dans principes-esthetiques.md sur pourquoi une spirale
logarithmique classique ne pouvait structurellement pas produire ce profil. Étape
précédente : planche 3 de la galerie « Planches Volutes » (moodboard publié en
Artifact — vrille fine, tendeurs fins et nombreux, feuillage clairsemé), elle-même
après planche 5 (trait calligraphique pur, sans feuillage, quelques grandes boucles
ouvertes) — toujours atteignables en ajustant les curseurs ci-dessous et en
décochant/cochant Feuille.

## Utilisation

Tracez une ligne : dès que le tracé se termine, des branches en forme de volute
apparaissent le long de la tige, chacune raccordée par une tangente, en alternance
gauche/droite, décroissant en taille à mesure qu'on avance le long de la tige — aucun
clic supplémentaire nécessaire. Cinq curseurs, à côté du bouton **Volutes auto**,
ajustent leur forme **en direct** : bouger l'un d'eux régénère aussitôt les volutes de
la liane sélectionnée, sans avoir à recliquer sur un bouton.

- **Longueur** — longueur d'arc totale de la première volute, en multiple de
  l'épaisseur de la tige qui la porte (curseur **Épaisseur tige**). Le nombre de
  tours visuels n'est plus un cadran à part : il résulte de la combinaison
  **Longueur**/**Resserrement**/**Progressivité**.
- **Resserrement** — courbure atteinte à la pointe de la volute ; plus haut donne une
  pointe qui s'enroule plus serré.
- **Progressivité** — à quel point la montée en courbure est retardée vers la fin du
  parcours plutôt qu'étalée uniformément sur toute la longueur. Bas (proche de 1),
  c'est une clothoïde classique (courbure qui croît régulièrement dès le départ) ;
  haut, l'essentiel de la longueur reste presque droite et la rotation serrée
  n'intervient que sur la toute dernière portion.
- **Décroissance** — à quel point chaque volute suivante (le long de la tige, ou
  récursivement à l'intérieur d'une volute) est plus petite — et proportionnellement
  plus resserrée — que la précédente.
- **Récursion** — chaque volute générée fait à son tour pousser ses propres volutes,
  plus petites, selon les mêmes règles, jusqu'à ce nombre de niveaux — la « touffe » de
  spirales imbriquées des rinceaux Art nouveau plutôt qu'une volute isolée par
  embranchement. 0 désactive la récursion. S'arrête souvent naturellement avant ce
  nombre : la décroissance de taille finit par produire une volute trop courte pour
  porter elle-même un point d'accroche.

Une branche tirée à la main depuis une tige existante obtient elle aussi ses propres
volutes, selon la même règle — tracer une ligne, toujours, donne des volutes.

Le bouton **Volutes auto** reste utile pour régénérer une liane plus ancienne (par
exemple reprise depuis une sauvegarde) ou après avoir déplacé un nœud à la main. Que
ce soit via le bouton ou un curseur, une régénération **remplace** le lot déjà présent
sur cette liane plutôt que de l'ajouter par-dessus.

Un tracé et ses volutes forment un seul pas d'annulation — un Ctrl+Z (ou clic sur
**Annuler**) les retire tous en même temps.

## Motifs actifs par défaut

Le panneau Motifs étant masqué (voir plus bas), aucune interaction n'est possible pour
changer les motifs actifs au démarrage : seul Feuille est coché (Fleur, Volute-motif et
Baie ne le sont pas), pour un feuillage clairsemé sans fleur ni baie. Décocher
totalement les motifs (comme pour calibrer sur la planche 5) reste un état légitime —
`placeBrush()` (`core/brush.ts`) et `currentSequence()` (`main.ts`) traitent une
séquence vide comme « pas de motif », pas comme un repli à corriger — mais demande de
modifier `main.ts` tant que le panneau reste masqué.

## Épaisseur

Une volute auto-générée est rendue avec une tige plus fine que celle qui la porte
(`AUTO_BRANCH.stemWidthFactor`, actuellement 0.4 — c'est-à-dire 40 % de l'épaisseur du
curseur **Épaisseur tige**) : une ramification, pas le même trait plein que la tige
principale. Ce facteur n'affecte que le rendu — la courbure de la spirale elle-même
continue de se baser sur l'épaisseur de la tige racine non réduite, pour que la taille
des volutes ne décroisse pas deux fois le long d'une même tige.

## Ce qui reste fixe

L'espacement entre points d'accroche, la marge aux extrémités de la tige, l'angle de
raccord et le pas d'intégration numérique de chaque volute (`curveSteps`) restent des
constantes fixes (`AUTO_BRANCH` dans `src/config.ts`) — moins déterminantes pour
l'aspect général que les cinq curseurs ci-dessus, exposables plus tard si besoin.

## Limite connue

Remplacer un lot ne suit que les branches elles-mêmes auto-générées : une liane tracée
à la main sur une volute auto-générée n'est jamais supprimée, mais si son unique
attache (cette volute) est retirée lors d'un remplacement, elle se retrouve orpheline
plutôt que réattachée automatiquement — même nature que la racine de branche non
ré-accrochée lors de l'édition de sa liane parente (voir
[Créer une branche](creer-une-branche.md)).

## Barre d'outils actuellement épurée

Le reste de la barre d'outils (modes Points/Masque, séquenceur de motifs, curseur
Espacement) est temporairement masqué pour laisser toute la place au dessin pendant
qu'on affine le rendu des volutes — voir la note dans `index.html`
(`<!-- Mode focus volutes -->`) pour ce qui est caché et comment le réactiver.
