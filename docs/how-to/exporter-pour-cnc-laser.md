# Exporter pour CNC/laser

## Étapes

1. Composez votre motif (une ou plusieurs lianes).
2. Cliquez **Exporter SVG** dans la barre d'outils.
3. Le navigateur télécharge un fichier `liane-<timestamp>.svg`.

## Ce que contient le fichier

- `#layer-stem` couvre tout le canevas, toutes lianes confondues : toutes les tiges,
  sans avoir à les regrouper une par une.
- Un calque `#layer-<motif>` par motif effectivement utilisé (`#layer-leaf`,
  `#layer-volute`, `#layer-flower`, et un de plus pour chaque motif externe ajouté —
  voir [Ajouter un nouveau motif](ajouter-un-motif.md)) : toutes les instances d'un
  même motif, toutes lianes confondues, dans leur propre calque. Sélectionnez le
  calque voulu dans votre logiciel de découpe pour traiter en un seul lot tout ce qui
  va dans un même matériau — plus besoin de trier manuellement les tiges d'un côté et
  chaque motif de l'autre.
- Chaque tige est un unique `<path>` : un polygone fermé à épaisseur variable, pas un
  trait avec un `stroke-width` — indispensable pour qu'un logiciel de découpe (Inkscape,
  Illustrator, LightBurn…) le traite comme un contour de coupe et non comme une ligne
  centrale. Une liane et ses branches partagent un seul contour soudé (voir
  [Créer une branche](creer-une-branche.md)) ; une liane sans branche n'occupe qu'un
  `<path>`.
- Chaque motif est aussi un `<path>` fermé indépendant dans son calque, positionné par
  un `transform="translate(...) rotate(...) scale(...)"`.
- L'overlay d'édition (nœuds, poignées) et l'aperçu de tracé en cours ne sont jamais
  inclus dans l'export.

## Retoucher avant découpe

Le SVG exporté s'ouvre normalement dans Inkscape ou Illustrator. Vous pouvez y :

- recolorer chaque motif par matériau (la couleur de remplissage exportée n'est
  qu'indicative, pas une consigne de découpe) ;
- vérifier qu'aucun contour ne se chevauche de façon problématique pour votre machine ;
- regrouper/renommer les calques selon la nomenclature de votre atelier.
