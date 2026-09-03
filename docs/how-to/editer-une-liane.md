# Éditer une liane existante

## Sélectionner une liane

Cliquez sur la tige (la partie brune pleine) de la liane à modifier. Ses nœuds
apparaissent : cercles rouges (points d'ancrage) et carrés bleus (poignées de
courbure), reliés par de fines lignes bleues.

Cliquer sur une zone vide du canevas désélectionne la liane courante — c'est aussi ce
qui se passe automatiquement quand vous commencez un nouveau tracé.

## Déplacer un point

Faites glisser un cercle rouge. Le nœud se déplace, ses deux poignées le suivent (la
forme locale de la courbe autour du point ne change pas, seule sa position bouge). La
tige et les motifs se recalculent à chaque frame du glisser-déposer.

## Courber localement

Faites glisser un carré bleu (une poignée). La poignée opposée se déplace en miroir
pour garder une jonction lisse de part et d'autre du nœud — comme un point « lisse »
dans Illustrator ou Inkscape. Il n'y a pas encore de point « coin » (poignées
indépendantes) dans cette version.

## Ajouter ou retirer un point

Double-cliquez sur la tige, entre deux points d'ancrage, pour y insérer un nouveau
nœud (poignées recalculées localement pour lui et ses deux voisins immédiats — le
reste de la courbe ne bouge pas). Double-cliquez sur un cercle rouge pour retirer ce
nœud (au moins deux nœuds doivent toujours rester, sans quoi la courbe n'a plus de
sens : la suppression est ignorée si la liane n'en a plus que deux).

## Changer l'habillage d'une seule liane

Les curseurs **Espacement**, **Échelle**, **Jitter**, **Épaisseur tige** et les cases
à cocher de motifs s'appliquent à la liane actuellement sélectionnée : ajustez-les
pendant qu'une liane est sélectionnée pour ne modifier qu'elle. Sans sélection, ils ne
font que définir les réglages du **prochain** tracé.

## Limites actuelles

- Pas encore de point « coin » (poignées indépendantes, non miroir).
- La racine d'une branche n'est pas re-accrochée automatiquement si vous éditez
  ensuite les nœuds de la liane parente — voir
  [Créer une branche](creer-une-branche.md).
