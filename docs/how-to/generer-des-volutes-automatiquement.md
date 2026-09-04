# Générer des volutes automatiquement

Tracer une ligne (à main levée, en mode Libre) l'habille automatiquement de branches
secondaires en forme de volute, générées algorithmiquement — voir
[Ce qui rend une arabesque gracieuse](../explanation/principes-esthetiques.md) pour
les principes (spirale logarithmique, rinceau, phyllotaxie) dont les règles
appliquées sont issues.

## Utilisation

Tracez une ligne : dès que le tracé se termine, des branches en forme de volute
apparaissent le long de la tige, chacune raccordée par une tangente, en alternance
gauche/droite, décroissant en taille à mesure qu'on avance le long de la tige — aucun
clic supplémentaire nécessaire. Cinq curseurs, à côté du bouton **Volutes auto**,
ajustent leur forme **en direct** : bouger l'un d'eux régénère aussitôt les volutes de
la liane sélectionnée, sans avoir à recliquer sur un bouton.

- **Tours** — nombre de tours de chaque volute.
- **Resserrement** — vitesse à laquelle la spirale se referme sur son centre ; plus
  bas donne des boucles ouvertes et bien distinctes, plus haut une pelote plus serrée.
- **Taille de départ** — rayon de la première volute, en multiple de l'épaisseur de
  la tige qui la porte (curseur **Épaisseur tige**).
- **Décroissance** — à quel point chaque volute suivante (le long de la tige, ou
  récursivement à l'intérieur d'une volute) est plus petite que la précédente.
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

## Ce qui reste fixe

L'espacement entre points d'accroche, la marge aux extrémités de la tige, l'angle de
raccord et la finesse d'échantillonnage de chaque spirale restent des constantes
fixes (`AUTO_BRANCH` dans `src/config.ts`) — moins déterminantes pour l'aspect général
que les cinq curseurs ci-dessus, exposables plus tard si besoin.

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
