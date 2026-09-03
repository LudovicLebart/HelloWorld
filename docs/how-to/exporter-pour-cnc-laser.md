# Exporter pour CNC/laser

## Étapes

1. Composez votre motif (une ou plusieurs lianes).
2. Cliquez **Exporter SVG** dans la barre d'outils.
3. Le navigateur télécharge un fichier `liane-<timestamp>.svg`.

## Ce que contient le fichier

- Deux calques couvrent tout le canevas, toutes lianes confondues : `#layer-stem`
  (toutes les tiges) et `#layer-leaves` (tous les motifs) — sélectionnez l'un ou
  l'autre dans votre logiciel de découpe pour traiter en un seul lot tout ce qui va
  dans un même matériau, sans avoir à regrouper les lianes une par une.
- Chaque tige est un unique `<path>` : un polygone fermé à épaisseur variable, pas un
  trait avec un `stroke-width` — indispensable pour qu'un logiciel de découpe (Inkscape,
  Illustrator, LightBurn…) le traite comme un contour de coupe et non comme une ligne
  centrale. Une liane et ses branches partagent un seul contour soudé (voir
  [Créer une branche](creer-une-branche.md)) ; une liane sans branche n'occupe qu'un
  `<path>`.
- Chaque motif (feuille, volute, fleur) est aussi un `<path>` fermé indépendant dans
  `#layer-leaves`, positionné par un `transform="translate(...) rotate(...) scale(...)"`
  et gardant sa classe (`motif-leaf`/`motif-volute`/`motif-flower`) si vous voulez
  ensuite les distinguer par matériau à l'intérieur de ce calque.
- L'overlay d'édition (nœuds, poignées) et l'aperçu de tracé en cours ne sont jamais
  inclus dans l'export.

## Limite actuelle : pas encore de séparation par motif

`#layer-leaves` regroupe tous les motifs ensemble (feuilles, volutes, fleurs mêlées).
Pour découper chaque motif dans un matériau différent, il faut aujourd'hui trier par
classe CSS (`motif-leaf`, `motif-volute`, `motif-flower`) dans votre logiciel de
découpe. Un export qui les sépare directement en sous-calques est prévu — voir
[`TODO.md`](../../TODO.md).

## Retoucher avant découpe

Le SVG exporté s'ouvre normalement dans Inkscape ou Illustrator. Vous pouvez y :

- recolorer chaque motif par matériau (la couleur de remplissage exportée n'est
  qu'indicative, pas une consigne de découpe) ;
- vérifier qu'aucun contour ne se chevauche de façon problématique pour votre machine ;
- regrouper/renommer les calques selon la nomenclature de votre atelier.
