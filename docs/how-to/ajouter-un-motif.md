# Ajouter un nouveau motif

Deux façons d'ajouter un motif, selon ce que vous voulez dessiner. Dans les deux cas,
rien à toucher dans `index.html` ni `src/main.ts` : la barre d'outils (ordre, case
active, échelle, jitter — voir [Séquencer les motifs](sequencer-des-motifs.md))
construit une rangée par motif à partir du registre `src/assets/motifs.ts`.

## Cas courant : déposer un fichier `.svg`

Pour une silhouette fixe (une forme dessinée à la main dans Inkscape/Illustrator par
exemple), déposez le fichier dans `src/assets/motifs/` — c'est tout, aucun code à
écrire ni à toucher. Le nom du fichier (sans l'extension) devient l'identifiant du
motif et son libellé dans la barre d'outils (`vrille-double.svg` → « Vrille double »).

Contraintes sur le fichier, dans le même esprit que la géométrie locale des motifs
internes :

- un seul `<path d="...">` (le premier trouvé dans le fichier fait foi — un fichier
  avec plusieurs calques/formes doit être aplati en un seul chemin avant l'export) ;
- le point d'attache (là où le motif rejoint la tige) est à l'origine `(0, 0)` ;
- le motif s'étend nominalement vers `+x` sur une longueur de l'ordre de `1` ;
- le chemin doit être **fermé**, jamais un simple trait — voir
  [Le modèle procédural](../explanation/modele-procedural.md#pourquoi-des-chemins-fermés) ;
- `fill="#..."` sur le `<path>` fixe sa couleur (sinon noir par défaut) ;
- `data-scale-factor="1.1"` sur la balise `<svg>` racine ajuste sa taille perçue par
  rapport aux autres motifs à `scale` égal (silhouette qui paraît plus grande/petite
  que les autres) — optionnel, `1` par défaut.

Voir `src/assets/motifs/baie.svg` pour un exemple minimal. `assets/motifs.ts` charge
tous les `.svg` du dossier au build (`import.meta.glob`), donc un simple commit du
fichier suffit — un contributeur qui ne connaît pas le code du moteur peut ajouter un
motif.

## Cas silhouette calculée par code

Si la forme doit être générée par une formule plutôt que dessinée à la main (comme la
spirale de `volute.ts`, offsetée avec la même technique que la tige), créez
`src/assets/<motif>.ts` qui exporte une constante `<MOTIF>_PATH_D : string` — un `d`
de `<path>` SVG, mêmes contraintes de coordonnées locales que ci-dessus. Regardez
`src/assets/leaf.ts` (le plus simple) ou `src/assets/volute.ts` pour deux styles
d'implémentation. Puis ajoutez une entrée au tableau `BUILTIN_MOTIFS` dans
`src/assets/motifs.ts` :

```ts
{ id: "vrille", label: "Vrille", pathD: VRILLE_PATH_D, scaleFactor: 1, defaultScale: 16, className: "motif-vrille" }
```

`scaleFactor` compense les silhouettes qui paraissent plus grandes ou plus petites que
les autres à `scale` égal. Contrairement à un motif chargé depuis un `.svg` externe
(qui porte sa couleur via `fill`), un motif interne résout sa couleur via une règle
CSS dédiée : ajoutez `.motif-vrille { fill: ...; }` dans `src/style.css`.

## Ce qu'il ne faut pas faire

`src/core/` (le moteur — `spline.ts`, `stem.ts`, `brush.ts`, `vine.ts`) n'a aucune
connaissance des motifs eux-mêmes : il manipule des `motifId` (chaînes) sans savoir à
quoi elles correspondent visuellement. Seul `src/ui/renderer.ts` résout un `motifId`
en `pathD` (et sa couleur) via `getMotif()`. Ne faites pas remonter d'import de
`src/assets/` dans `src/core/` — voir [Architecture des modules](../reference/architecture.md).
