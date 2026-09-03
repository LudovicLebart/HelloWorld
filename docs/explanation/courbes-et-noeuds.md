# Des points au squelette éditable

L'historique de ce choix vaut la peine d'être gardé : deux versions antérieures ont
été essayées et remplacées avant la version actuelle.

## Version 1 — Catmull-Rom uniforme

Le premier moteur simplifiait le tracé (RDP) puis interpolait directement les points
de contrôle avec une spline de Catmull-Rom à paramétrisation **uniforme**. Ça
fonctionnait pour un tracé régulier, mais les points issus de RDP sont par nature très
inégalement espacés (denses dans les virages serrés, épars sur les portions droites).
Or la paramétrisation uniforme suppose implicitement un espacement égal entre points :
sur des données inégales, elle produit des surtensions et des boucles près des
changements de direction marqués.

## Version 2 — Catmull-Rom centripète

Correctif ciblé : passer à la paramétrisation **centripète** (`alpha = 0.5`), la
solution standard documentée pour ce problème précis. Le tracé est net, sans boucle ni
cabossage — voir l'historique Git pour l'implémentation (`t^alpha` comme pas de
nœud). Mais cette version gardait un défaut de fond : les points de contrôle n'étaient
que des points, sans tangente explicite ni possibilité d'édition — toute correction
obligeait à retracer entièrement.

## Version 3 (actuelle) — nœuds Bézier éditables

Le moteur actuel abandonne Catmull-Rom : chaque point de contrôle devient un
`EditableNode` avec deux poignées de contrôle explicites (`handleIn`/`handleOut`), et
la courbe entre deux nœuds consécutifs est un segment de Bézier cubique standard. Les
poignées sont calculées automatiquement à la création (`autoHandles()` dans
`src/core/spline.ts`) pour un rendu lisse équivalent aux versions précédentes — mais
elles sont maintenant des données de première classe que l'utilisateur peut faire
glisser, exactement comme un point d'ancrage Illustrator/Inkscape.

Cette version résout le même problème de fond que la paramétrisation centripète
(pas de surtension near un virage serré), pour une raison différente : les poignées ne
sont plus dérivées automatiquement d'un voisinage global, elles sont locales à chaque
segment et peuvent être corrigées une par une si le lissage automatique ne convient
pas à un endroit précis.

## Continuité lisse par défaut

Faire glisser une poignée déplace aussi son opposée en miroir (même distance,
direction opposée par rapport au point d'ancrage) — voir `nodeEditor.ts`. C'est le
comportement « point lisse » standard : il garantit qu'on ne peut pas créer de coin dur
par accident. Créer un vrai coin (poignées indépendantes, comme un point « coin » dans
Illustrator) n'est pas implémenté — voir [`TODO.md`](../../TODO.md).
