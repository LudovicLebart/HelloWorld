# Installer l'app et l'utiliser hors-ligne

Vignes & Arabesques est une PWA (Progressive Web App) : après une première visite en
ligne, elle s'installe comme une app et continue de fonctionner sans connexion —
utile en atelier, où le réseau n'est pas toujours fiable.

## Installer sur téléphone (Android/iOS) ou ordinateur

1. Ouvrez la [démo en ligne](https://ludoviclebart.github.io/HelloWorld/) au moins
   une fois, connexion active.
2. **Android (Chrome) :** menu ⋮ → « Installer l'application » (ou un bandeau
   d'installation apparaît automatiquement).
3. **iOS (Safari) :** bouton Partager → « Sur l'écran d'accueil ».
4. **Ordinateur (Chrome/Edge) :** icône d'installation dans la barre d'adresse, ou
   menu ⋮ → « Installer Vignes & Arabesques ».

L'app s'ouvre alors dans sa propre fenêtre, sans barre d'adresse de navigateur — comme
une app installée normalement.

## Ce qui marche hors-ligne

Tout : tracer, éditer les nœuds, changer les motifs, créer des branches, définir un
masque, annuler/rétablir, exporter un SVG. Rien dans l'app n'appelle de réseau une
fois la page chargée — l'export lui-même se fait entièrement dans le navigateur (pas
d'envoi du dessin à un serveur).

## Comment ça marche

Un service worker (généré au build par `vite-plugin-pwa`, voir
[Architecture des modules](../reference/architecture.md)) met en cache tout le code
de l'app (JS, CSS, icônes) dès la première visite. Les visites suivantes — même sans
réseau — chargent l'app depuis ce cache local. Vos lianes en cours, elles, sont
toujours sauvegardées dans le stockage local du navigateur (`localStorage`), comme
sans PWA — voir [Éditer une liane existante](editer-une-liane.md).

## Mettre à jour l'app installée

Le service worker vérifie une nouvelle version à chaque visite en ligne et l'installe
automatiquement pour la prochaine ouverture — aucune action requise. Si une mise à
jour semble bloquée, fermez complètement l'app installée puis rouvrez-la avec une
connexion active.
