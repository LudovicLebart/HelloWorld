# Vignes & Arabesques

Outil web pour dessiner des motifs de vignes/arabesques procéduraux : on trace une
ligne directrice à la souris ou au doigt, un moteur procédural l'habille de feuilles,
volutes et fleurs selon des règles réglables, avec un export SVG en chemins fermés
pour la découpe CNC/laser (pensé pour l'incrustation en lutherie).

**Démo en ligne :** [ludoviclebart.github.io/HelloWorld](https://ludoviclebart.github.io/HelloWorld/)
— aucune installation nécessaire, fonctionne sur téléphone.

## Démarrage local

```bash
npm install
npm run dev      # serveur de développement
npm run build    # build de production dans dist/
```

## Documentation

- [Tracer sa première liane](docs/tutorials/premiere-liane.md) — tutoriel de prise en main.
- [Guides pratiques](docs/how-to/) — exporter pour CNC/laser, éditer une liane, ajouter un motif.
- [Référence](docs/reference/) — architecture des modules, paramètres de l'interface.
- [Explications](docs/explanation/) — le modèle procédural, pourquoi des nœuds Bézier éditables.
- [`TODO.md`](TODO.md) — état d'avancement et prochaines étapes.

## Déploiement

Chaque push sur `master` redéploie automatiquement sur GitHub Pages via
`.github/workflows/deploy-pages.yml`.
