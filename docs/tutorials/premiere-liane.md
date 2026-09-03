# Tracer sa première liane

Ce tutoriel vous fait dessiner une première liane complète, de la ligne directrice
jusqu'à l'export SVG, en une dizaine de minutes.

## 1. Ouvrir l'outil

Ouvrez [https://ludoviclebart.github.io/HelloWorld/](https://ludoviclebart.github.io/HelloWorld/)
dans un navigateur — desktop ou téléphone, aucune installation n'est nécessaire.

## 2. Tracer le squelette

Le mode **Libre** est actif par défaut (bouton en haut à gauche). Cliquez-glissez (ou
faites glisser le doigt sur téléphone) pour dessiner une courbe en S sur le canevas.
Relâchez : la tige et les feuilles apparaissent aussitôt le long du tracé.

Si le tracé vous semble trop hérissé de petits coudes, baissez le curseur
**Densité des points** avant de recommencer — il contrôle combien de points sont
gardés de votre geste.

## 3. Varier les motifs

En haut, trois cases à cocher — **Feuille**, **Volute**, **Fleur** — activent ou
retirent chaque motif de la séquence qui se répète le long de la tige. Décochez
« Volute » : les instances de volute disparaissent de la liane sélectionnée
immédiatement.

## 4. Ajuster l'habillage

Avec la liane encore sélectionnée (bordée par ses nœuds), essayez les curseurs
**Espacement**, **Échelle**, **Jitter** et **Épaisseur tige** : chacun met à jour le
rendu en direct, sans retracer.

## 5. Corriger une courbe

Cliquez sur la tige d'une liane pour afficher ses nœuds : des cercles rouges (points
d'ancrage) reliés à des carrés bleus (poignées de courbure). Faites glisser un cercle
rouge pour déplacer le point ; faites glisser un carré bleu pour courber localement la
liane sans changer sa position. Voir
[Éditer une liane existante](../how-to/editer-une-liane.md) pour aller plus loin.

Une erreur de geste ? Ctrl+Z (Cmd+Z sur Mac) ou le bouton ↶ annule la dernière
action ; Ctrl+Y ou ↷ la rétablit. Le canevas est aussi sauvegardé automatiquement
dans le navigateur — fermer l'onglet ou recharger la page ne perd rien.

## 6. Exporter

Cliquez sur **Exporter SVG**. Le fichier téléchargé contient des chemins fermés
(pas de simples traits), prêts pour une découpe CNC ou laser — voir
[Exporter pour CNC/laser](../how-to/exporter-pour-cnc-laser.md).

Vous savez maintenant tracer, varier et exporter une liane. Pour poser un squelette
nœud par nœud plutôt qu'à main levée, essayez le mode **Points** de la barre d'outils.
Pour faire naître une branche depuis cette liane, voir
[Créer une branche](../how-to/creer-une-branche.md).
