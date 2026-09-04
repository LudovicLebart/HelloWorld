# Générer des volutes automatiquement

Plutôt que de tracer chaque embranchement à la main, le bouton **Volutes auto**
habille une liane sélectionnée de branches secondaires générées algorithmiquement —
voir [Ce qui rend une arabesque gracieuse](../explanation/principes-esthetiques.md)
pour les principes (spirale logarithmique, rinceau, phyllotaxie) dont les règles
appliquées sont issues.

## Utilisation

Sélectionnez une liane (tap sur sa tige) puis cliquez sur **Volutes auto**. Des
branches en forme de volute apparaissent le long de la tige sélectionnée, chacune
raccordée par une tangente, décroissant en taille à mesure qu'on avance le long de la
tige. Le côté (gauche/droite) de chaque branche suit le sens de courbure de la tige à
cet endroit — toujours vers l'extérieur d'un virage, jamais vers son creux, comme en
art du bonsaï (voir [Ce qui rend une arabesque gracieuse](../explanation/principes-esthetiques.md#lart-du-bonsaï-jamais-une-branche-vers-le-creux)) ;
sur un tronçon localement droit, où cette notion n'a pas de sens, les côtés alternent
simplement. Chaque branche est une liane comme une autre : éditable nœud par nœud,
exportable, habillable par le séquenceur de motifs.

Un seul clic sur **Volutes auto** peut créer plusieurs branches d'un coup — un seul
Ctrl+Z (ou clic sur **Annuler**) les retire toutes en même temps.

## Ce qui est actuellement fixe

Ce premier prototype ne propose pas encore de réglages dédiés : la densité, la taille
de départ, le taux de resserrement de la spirale et l'angle de raccord sont des
constantes dans `AUTO_BRANCH` (`src/config.ts`). Si le rendu ne convient pas pour un
tracé donné, effacez les branches générées (annuler) et retracez la liane parente avec
une épaisseur de tige différente — `AUTO_BRANCH.startRadiusFactor` dérive la taille des
volutes de cette épaisseur.

## Limite connue

Le bouton régénère un lot figé une fois pour toutes : relancer **Volutes auto** sur une
liane qui a déjà des branches auto-générées en ajoute de nouvelles au même endroit
approximatif plutôt que de remplacer les précédentes.
