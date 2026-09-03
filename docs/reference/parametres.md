# Paramètres de l'interface

| Contrôle | Élément | Plage | Effet |
| --- | --- | --- | --- |
| Libre / Points / Masque | `#mode-freehand` / `#mode-points` / `#mode-mask` | — | Mode de création : tracé continu au pointeur, pose de nœuds un par un, ou définition de la zone de travail — voir [Définir une zone de travail](../how-to/definir-une-zone-de-travail.md). |
| Terminer le tracé | `#finish-points` | — | Visible seulement en mode Points ; finalise la liane en cours (équivalent à un double-clic). |
| Terminer le masque | `#finish-mask` | — | Visible seulement en mode Masque ; valide la zone de travail (au moins 3 points posés). |
| Effacer le masque | `#clear-mask` | — | Retire la zone de travail définie, indépendamment du bouton Effacer (qui n'efface que les lianes). |
| Motifs (ordre, échelle, jitter) | `#motif-list` | — | Séquence de motifs qui se répète le long de la tige, un `<li class="motif-row">` par motif — voir [Séquencer les motifs](../how-to/sequencer-des-motifs.md). Pour chaque motif : case active (on/off, au moins un reste actif — si tous sont décochés, le premier de la liste redevient actif), flèches ↑/↓ pour réordonner la séquence, échelle propre (4–40 px, avant le facteur propre au motif `scaleFactor` et le rétrécissement vers les extrémités de la tige), jitter propre (0–100, variation aléatoire d'échelle/angle/décalage d'attache — évite l'effet « tampon »). |
| Densité des points | `#density` | 0–100 | Épsilon de simplification RDP appliqué aux tracés à main levée : 0 = très simplifié (peu de points, `epsilon = 12px`), 100 = suit la main de près (`epsilon = 0.5px`). Sans effet en mode Points, où chaque clic est un nœud. |
| Espacement | `#spacing` | 8–60 px | Distance moyenne en longueur d'arc entre deux instances de motif consécutives (partagée par tous les motifs de la séquence). |
| Épaisseur tige | `#thickness` | 1–20 px | Largeur maximale de la tige, au centre de la liane (elle s'affine vers les deux extrémités quel que soit ce réglage). |
| Annuler / Rétablir | `#undo` / `#redo` | — | Ctrl+Z / Ctrl+Y (ou Cmd sur Mac). Annule/rétablit la création d'une liane, un déplacement de nœud ou un effacement — pas les réglages de curseurs ni de motifs, trop fréquents pour être pertinents en historique. |

Tous ces contrôles, motifs compris, s'appliquent à la liane **actuellement
sélectionnée** en plus de définir les réglages du prochain tracé — voir
[Éditer une liane existante](../how-to/editer-une-liane.md).
