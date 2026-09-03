# Définir une zone de travail (masque)

Utile pour contraindre le motif à une forme précise à découper — par exemple le
contour d'un pickguard — sans avoir à surveiller manuellement les débordements.

## Tracer le masque

Cliquez sur **Masque** dans la barre d'outils, puis posez au moins trois points pour
dessiner le contour de la zone (clic par clic, comme en mode Points). Cliquez sur
**Terminer le masque** — ou faites un double-clic sur le dernier point — pour valider.
Le contour apparaît en pointillés, et l'outil repasse automatiquement en mode Libre.

## Effet immédiat

Une fois le masque défini, aucune liane (tige ou motif) ne s'affiche plus au-delà de
son contour — vous pouvez continuer à tracer et éditer normalement, y compris en
dépassant largement la zone : seul l'affichage à l'intérieur du masque est visible, le
reste du tracé existe toujours en mémoire (ses nœuds ne sont pas coupés, seul le rendu
l'est).

## À l'export

Le SVG exporté applique le même recadrage, mais pas de la même façon qu'à l'écran :
plutôt que de s'appuyer sur un `clip-path` SVG (que certains logiciels de découpe
CNC/laser ne savent pas interpréter), le contour de chaque tige est réellement découpé
par intersection booléenne avec le masque — un chemin fermé, propre, prêt à découper.
Un motif (feuille, volute, fleur) dont le point d'attache tombe hors du masque est
purement et simplement omis de l'export ; il n'est jamais découpé partiellement.

## Effacer le masque

Le bouton **Effacer le masque** retire la zone de travail (les lianes redeviennent
visibles en entier). Il est indépendant du bouton **Effacer**, qui n'efface que les
lianes : la zone de travail persiste tant que vous ne la retirez pas explicitement, y
compris après un rechargement de page.
