# Créer une branche (jonction en Y)

## Le geste

En mode **Libre**, commencez un nouveau tracé à quelques pixels d'une liane
existante — juste à côté de sa tige, pas exactement dessus (cliquer sur la tige la
sélectionne pour l'édition plutôt que de démarrer un tracé). Si le point de départ
tombe à moins de 16 px d'un point de la liane existante, le nouveau tracé s'accroche
automatiquement dessus : sa racine est posée exactement sur le point le plus proche de
la tige parente, et devient une branche.

Le mode **Points** fonctionne de la même façon : c'est le tout premier clic qui décide
si le nouveau squelette est une branche ou une liane indépendante.

## Ce qui différencie une branche d'une liane normale

- Sa racine ne s'amincit pas comme le reste de la tige — elle reste pleine largeur,
  pour bien s'enfoncer dans le volume de la tige parente.
- Elle reste éditable comme n'importe quelle liane (nœuds, poignées, curseurs).
- Elle n'est **pas** recollée automatiquement si vous déplacez ensuite la tige
  parente — si l'écart devient visible, faites glisser son nœud racine pour la
  reposer sur la tige (voir [Éditer une liane existante](editer-une-liane.md)).

## Ce que ça change à l'export

À l'écran, la branche et sa liane parente sont simplement deux formes pleines qui se
recouvrent — invisible à l'œil puisqu'elles sont de la même couleur. Mais à
l'**export SVG**, toutes les lianes reliées par une chaîne de branches (une grappe) ont
leur contour de tige **fusionné en un seul chemin** par une opération booléenne
(bibliothèque `polygon-clipping`, voir
[`src/core/junction.ts`](../../src/core/junction.ts)) — pas de double-trait à la
jonction, indispensable pour une découpe CNC/laser propre. Voir
[Exporter pour CNC/laser](exporter-pour-cnc-laser.md).

Une branche qui ne recouvre plus du tout sa liane parente (nœud racine trop éloigné)
s'exporte comme un contour séparé plutôt que fusionné — la fusion suppose un vrai
chevauchement des deux polygones.
