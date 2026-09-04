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
selon les mêmes règles — jusqu'au nombre de niveaux réglé sur le curseur **Récursion**
(2 par défaut). C'est ce qui donne des « touffes » de spirales imbriquées plutôt
qu'une volute isolée par embranchement, comme sur les rinceaux Art nouveau. La
récursion s'arrête naturellement avant cette profondeur la plupart du temps : la
décroissance géométrique de taille finit par produire une volute trop courte pour
porter elle-même un point d'accroche.

Cliquer une nouvelle fois sur **Volutes auto** sur la même liane **remplace** le lot
généré au clic précédent plutôt que d'en ajouter un autre par-dessus — pratique pour
ajuster un curseur et régénérer jusqu'à obtenir le rendu voulu, sans devoir tout
effacer à la main entre deux essais. Un seul clic peut créer de nombreuses branches
d'un coup, remplacement d'un lot précédent compris — un seul Ctrl+Z (ou clic sur
**Annuler**) restaure exactement l'état d'avant ce clic.

## Réglages

Cinq curseurs, à côté du bouton **Volutes auto**, ajustent la forme des volutes
générées — lus au moment du clic, sans effet sur les branches déjà en place tant
qu'on ne régénère pas :

- **Tours** — nombre de tours de chaque volute.
- **Resserrement** — vitesse à laquelle la spirale se referme sur son centre ; plus
  bas donne des boucles ouvertes et bien distinctes, plus haut une pelote plus serrée.
- **Taille de départ** — rayon de la première volute, en multiple de l'épaisseur de
  la tige qui la porte.
- **Décroissance** — à quel point chaque volute suivante (le long de la tige, ou
  récursivement à l'intérieur d'une volute) est plus petite que la précédente.
- **Récursion** — combien de niveaux de volutes-dans-des-volutes ; 0 désactive la
  récursion (une volute isolée par embranchement, comme avant son introduction).

L'espacement entre points d'accroche, la marge aux extrémités de la tige, l'angle de
raccord et la finesse d'échantillonnage de chaque spirale restent des constantes
fixes (`AUTO_BRANCH` dans `src/config.ts`) — moins déterminantes pour l'aspect général
que les cinq réglages ci-dessus, exposables plus tard si besoin.

## Limite connue

Retirer un lot pour le remplacer (voir Utilisation) ne suit que les branches
elles-mêmes auto-générées : une liane tracée à la main sur une volute auto-générée
n'est jamais supprimée, mais si son unique attache (cette volute) est retirée lors
d'un remplacement, elle se retrouve orpheline plutôt que réattachée automatiquement —
même nature que la racine de branche non ré-accrochée lors de l'édition de sa liane
parente (voir [Créer une branche](creer-une-branche.md)).
