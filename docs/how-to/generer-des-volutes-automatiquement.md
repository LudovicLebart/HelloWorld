# Générer des volutes automatiquement

Plutôt que de tracer chaque embranchement à la main, le bouton **Volutes auto**
habille une liane sélectionnée de branches secondaires générées algorithmiquement —
voir [Ce qui rend une arabesque gracieuse](../explanation/principes-esthetiques.md)
pour les principes (spirale logarithmique, rinceau, phyllotaxie) dont les règles
appliquées sont issues.

## Utilisation

Sélectionnez une liane (tap sur sa tige) puis cliquez sur **Volutes auto**. Des
branches en forme de volute apparaissent le long de la tige sélectionnée, chacune
raccordée par une tangente, en alternance gauche/droite, décroissant en taille à
mesure qu'on avance le long de la tige. Chaque branche est une liane comme une autre :
éditable nœud par nœud, exportable, habillable par le séquenceur de motifs.

Chaque volute générée fait à son tour pousser ses propres volutes, plus petites,
selon les mêmes règles — jusqu'à deux niveaux de récursion supplémentaires par défaut
(`AUTO_BRANCH.recursionDepth`). C'est ce qui donne des « touffes » de spirales
imbriquées plutôt qu'une volute isolée par embranchement, comme sur les rinceaux Art
nouveau. La récursion s'arrête naturellement avant cette profondeur la plupart du
temps : la décroissance géométrique de taille finit par produire une volute trop
courte pour porter elle-même un point d'accroche.

Un seul clic sur **Volutes auto** peut créer de nombreuses branches d'un coup,
récursion comprise — un seul Ctrl+Z (ou clic sur **Annuler**) les retire toutes en même
temps.

## Ce qui est actuellement fixe

Ce premier prototype ne propose pas encore de réglages dédiés : la densité, la taille
de départ, le taux de resserrement de la spirale, l'angle de raccord et la profondeur
de récursion sont des constantes dans `AUTO_BRANCH` (`src/config.ts`). Si le rendu ne
convient pas pour un tracé donné, effacez les branches générées (annuler) et retracez
la liane parente avec une épaisseur de tige différente — `AUTO_BRANCH.startRadiusFactor`
dérive la taille des volutes de cette épaisseur.

## Limite connue

Le bouton régénère un lot figé une fois pour toutes : relancer **Volutes auto** sur une
liane qui a déjà des branches auto-générées en ajoute de nouvelles au même endroit
approximatif plutôt que de remplacer les précédentes.
