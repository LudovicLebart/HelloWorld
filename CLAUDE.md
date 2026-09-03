# Instructions pour Claude

Conventions à respecter pour toute contribution à ce dépôt, en plus de ce qui est
déjà documenté dans [`docs/`](docs/) (architecture, paramètres, guides).

## Configuration centralisée, jamais de valeur en dur

Toute constante ajustable (clé de stockage, seuil de geste, limite, plage de
valeurs...) vit dans [`src/config.ts`](src/config.ts) — jamais en dur, éparpillée
dans un fichier qui l'utilise. Avant d'ajouter un nombre "magique" ou une chaîne
de configuration, vérifier si elle appartient à `config.ts`, l'y ajouter si besoin,
puis l'importer depuis là où elle sert.

Ne s'applique pas aux constantes purement locales/visuelles sans valeur de
configuration réelle (ex. un rayon de poignée SVG en pixels dans `nodeEditor.ts`) —
la règle vise les valeurs qui *paramètrent le comportement de l'app*, pas les
détails de rendu.

## Un fichier, une responsabilité — pas de fichier fourre-tout

Ne jamais laisser un fichier (notamment `main.ts`) accumuler plusieurs
responsabilités indépendantes (état UI, undo/redo, persistance, export...).
Dès qu'une logique est isolable et réutilisable, l'extraire dans son propre
module :

- `src/core/` pour la logique pure (aucun accès au DOM) — voir `history.ts`
  (pile undo/redo générique) et `persistence.ts` (accès localStorage générique)
  comme exemples de cette séparation.
- `src/ui/` pour ce qui touche au DOM/SVG.

`main.ts` reste un orchestrateur qui câble ces modules entre eux — pas l'endroit
où vit la logique elle-même. Voir
[`docs/reference/architecture.md`](docs/reference/architecture.md) pour la carte
des modules actuelle.
