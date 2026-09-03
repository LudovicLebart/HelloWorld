# Le modèle procédural

## L'idée centrale : « on trace, ça pousse »

L'utilisateur ne dessine jamais une feuille, une volute ou une fleur — il dessine une
ligne directrice, et le moteur peuple cette ligne selon des règles (espacement,
échelle dégressive, jitter, séquence de motifs). C'est la valeur de l'outil : il n'est
pas un Illustrator de plus. Le jour où l'on commence à vouloir déplacer un pétale
individuellement à l'intérieur d'une fleur, on a quitté cette valeur — c'est pourquoi
l'édition non-destructive s'arrête au niveau des **nœuds du squelette**, jamais aux
motifs eux-mêmes.

## Nœuds vivants plutôt que dessin figé

Un tracé (à main levée ou clic par clic) ne produit pas directement un SVG final : il
produit une liste de `EditableNode` (point + poignées Bézier). Tant que la liane
existe, ces nœuds restent la source de vérité, et `regenerateVine()` (voir
[Architecture des modules](../reference/architecture.md)) recalcule tige et motifs à
chaque édition — glisser un point, glisser une poignée, changer un curseur.

C'est un choix architectural déliberé : l'alternative (« cuire » immédiatement le
tracé en chemins SVG statiques) est plus simple à écrire, mais interdit toute
correction ultérieure sans tout retracer — exactement ce que
[Éditer une liane existante](../how-to/editer-une-liane.md) devait rendre possible.

## Pourquoi des chemins fermés {#pourquoi-des-chemins-fermés}

La tige n'est jamais un `<path>` avec un `stroke-width` : c'est un polygone fermé,
calculé en offsettant la ligne centrale de part et d'autre le long de sa normale
(voir `buildStemPath` dans `src/core/stem.ts`). Un trait épaissi n'a pas de sens pour
une machine de découpe — seul un contour fermé en a un. Chaque motif suit la même
règle : `LEAF_PATH_D`, `FLOWER_PATH_D`, `VOLUTE_PATH_D` sont tous des chemins fermés,
jamais de simples traits.

## Séparation stricte moteur / rendu

`src/core/` ne sait pas ce qu'est une couleur, une police, ni même à quoi ressemble un
motif — il ne manipule que des coordonnées et des identifiants (`motifId`). C'est
`src/ui/renderer.ts` qui résout un `motifId` en silhouette SVG réelle. Cette séparation
(déjà identifiée dans le plan initial du projet comme condition pour éviter « l'usine
à gaz ») permettra, le jour venu, de remplacer le moteur de rendu SVG-DOM actuel par
autre chose (Canvas, WebGL, un export direct sans navigateur) sans toucher aux maths.
