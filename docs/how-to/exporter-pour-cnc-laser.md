# Exporter pour CNC/laser

## Étapes

1. Composez votre motif (une ou plusieurs lianes).
2. Cliquez **Exporter SVG** dans la barre d'outils.
3. Le navigateur télécharge un fichier `liane-<timestamp>.svg`.

## Ce que contient le fichier

- Chaque liane est un groupe `<g class="vine">` distinct, contenant deux
  sous-groupes : `layer-stem` (la tige) et `layer-leaves` (les motifs).
- La tige est un unique `<path>` : un polygone fermé à épaisseur variable, pas un
  trait avec un `stroke-width` — indispensable pour qu'un logiciel de découpe (Inkscape,
  Illustrator, LightBurn…) le traite comme un contour de coupe et non comme une ligne
  centrale.
- Chaque motif (feuille, volute, fleur) est aussi un `<path>` fermé indépendant,
  positionné par un `transform="translate(...) rotate(...) scale(...)"`.
- L'overlay d'édition (nœuds, poignées) et l'aperçu de tracé en cours ne sont jamais
  inclus dans l'export.

## Limite actuelle : pas encore de calques globaux par matériau

Les calques `layer-stem`/`layer-leaves` existent **par liane**, pas globalement pour
tout le canevas. Pour découper par exemple toutes les tiges en laiton et toutes les
feuilles en nacre en un seul lot, il faut aujourd'hui sélectionner manuellement tous
les `layer-stem` (ou tous les `layer-leaves`) dans votre logiciel de découpe et les
regrouper vous-même. Un export avec deux calques couvrant tout le canevas est
prévu — voir [`TODO.md`](../../TODO.md).

## Retoucher avant découpe

Le SVG exporté s'ouvre normalement dans Inkscape ou Illustrator. Vous pouvez y :

- recolorer chaque motif par matériau (la couleur de remplissage exportée n'est
  qu'indicative, pas une consigne de découpe) ;
- vérifier qu'aucun contour ne se chevauche de façon problématique pour votre machine ;
- regrouper/renommer les calques selon la nomenclature de votre atelier.
