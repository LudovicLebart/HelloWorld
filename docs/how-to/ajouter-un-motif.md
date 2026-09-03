# Ajouter un nouveau motif

Guide développeur : comment ajouter un quatrième motif (par exemple une clé de sol ou
une vrille) à la séquence existante (feuille, volute, fleur).

## 1. Définir la géométrie locale

Créez `src/assets/<motif>.ts` qui exporte une constante `<MOTIF>_PATH_D : string` —
un `d` de `<path>` SVG en **coordonnées locales unitaires** :

- le point d'attache (là où le motif rejoint la tige) est à l'origine `(0, 0)` ;
- le motif s'étend nominalement vers `+x` sur une longueur de l'ordre de `1` ;
- le chemin doit être **fermé** (`Z`), jamais un simple trait — voir
  [Le modèle procédural](../explanation/modele-procedural.md#pourquoi-des-chemins-fermés).

Regardez `src/assets/leaf.ts` (le plus simple) ou `src/assets/volute.ts` (une
silhouette calculée par code plutôt qu'écrite à la main) pour deux styles
d'implémentation.

## 2. Enregistrer le motif

Dans `src/assets/motifs.ts`, ajoutez une entrée au tableau `MOTIFS` :

```ts
{ id: "vrille", label: "Vrille", pathD: VRILLE_PATH_D, scaleFactor: 1, className: "motif-vrille" }
```

`scaleFactor` compense les silhouettes qui paraissent plus grandes ou plus petites que
les autres à `scale` égal — ajustez-le à l'œil.

## 3. Styler et exposer dans l'interface

- Dans `src/style.css`, ajoutez une règle `.motif-vrille { fill: ...; }`.
- Dans `index.html`, ajoutez une rangée `<li class="motif-row" data-motif="vrille">` dans
  `#motif-list`, sur le même modèle que les trois existantes (flèches ↑/↓, case active,
  curseurs d'échelle et de jitter propres à ce motif) — voir
  [Séquencer les motifs](sequencer-des-motifs.md). Rien à toucher dans `src/main.ts` :
  `currentSequence()` lit dynamiquement les rangées de `#motif-list`, sans liste
  d'identifiants en dur.

## Ce qu'il ne faut pas faire

`src/core/` (le moteur — `spline.ts`, `stem.ts`, `brush.ts`, `vine.ts`) n'a aucune
connaissance des motifs eux-mêmes : il manipule des `motifId` (chaînes) sans savoir à
quoi elles correspondent visuellement. Seul `src/ui/renderer.ts` résout un `motifId`
en `pathD` via `getMotif()`. Ne faites pas remonter d'import de `src/assets/` dans
`src/core/` — voir [Architecture des modules](../reference/architecture.md).
