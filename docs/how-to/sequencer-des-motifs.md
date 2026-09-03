# Séquencer les motifs

## Réordonner la séquence

Chaque motif (Feuille, Volute, Fleur) a sa propre rangée dans le panneau **Motifs**.
Les flèches **↑** / **↓** déplacent une rangée dans la liste ; l'ordre affiché est
l'ordre dans lequel les motifs alternent le long de la tige, en boucle (par exemple
Volute → Feuille → Volute → Feuille... si seuls ces deux-là sont actifs). La flèche du
haut disparaît pour la première rangée, celle du bas pour la dernière.

## Régler l'échelle et le jitter par motif

Chaque rangée porte son propre curseur **Échelle** (taille de base, en pixels) et son
propre curseur **Jitter** (variation aléatoire d'échelle, d'angle et de décalage
d'attache — 0 = aucune variation, 100 = forte). Une fleur peut ainsi rester grande et
régulière pendant qu'une volute voisine reste petite et irrégulière, sans réglage
global commun aux deux.

## Activer/désactiver un motif

La case à cocher de chaque rangée l'inclut ou l'exclut de la séquence. Au moins un
motif reste toujours actif : décocher le dernier motif actif n'a aucun effet, la
séquence garde le premier motif de la liste plutôt que de se retrouver vide.

## Portée des réglages

Comme les autres curseurs de rendu (Espacement, Épaisseur tige), la séquence de motifs
s'applique à la liane **actuellement sélectionnée** en plus de définir les réglages du
prochain tracé — voir [Éditer une liane existante](editer-une-liane.md). Réordonner ou
régler un motif ne crée pas d'étape d'annulation (Ctrl+Z), au même titre que les autres
curseurs de rendu.
