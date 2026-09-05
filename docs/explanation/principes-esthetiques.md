# Ce qui rend une arabesque gracieuse

L'étape 2 (le brush) sait déjà habiller une ligne tracée à la main de feuilles, volutes
et fleurs selon des règles réglables (séquence, échelle, jitter — voir
[Le modèle procédural](modele-procedural.md)). L'étape suivante va plus loin :
faire générer *automatiquement* les courbes secondaires elles-mêmes (volutes,
ramifications) à partir d'une ou deux courbes tracées par l'utilisateur, plutôt que de
seulement les habiller. Avant de choisir un algorithme, cette page rassemble ce que la
littérature (histoire de l'ornement, botanique, CAO) dit de ce qui rend une courbe ou un
enchaînement de courbes gracieux — pour que les règles du générateur soient déduites de
principes identifiés, pas inventées au hasard.

## La spirale logarithmique : la forme des volutes naturelles

Coquillages, crosses de fougère, vrilles de vigne, volutes de violon — toutes ces
volutes naturelles suivent (approximativement) une spirale logarithmique
`r = a·e^(bθ)`, pas une spirale d'Archimède (pas constant) ni un simple arc de cercle.
Sa propriété clé : elle est *auto-similaire*, la même à toute échelle — une droite
depuis le centre la coupe toujours sous le même angle, quel que soit le rayon. C'est une
courbe de *croissance*, pas une forme statique qu'on aurait dessinée puis mise à
l'échelle. Le paramètre `b` (taux de croissance par radian) est le seul degré de liberté
qui distingue une volute serrée d'une volute lâche.

## La ligne de beauté (Hogarth) : le S plutôt que l'arc simple

Dans *The Analysis of Beauty* (1753), Hogarth avance qu'une ligne serpentine (en S, deux
inflexions) retient l'œil en « chasse » — il la parcourt progressivement — alors qu'un
arc de courbure constante ou une droite se lisent d'un coup et n'offrent rien à
découvrir. Le motif du *whiplash* de l'Art nouveau (tiges, vrilles, ailes d'insectes)
reprend directement ce principe : une courbe asymétrique, à plusieurs inflexions,
plutôt qu'un arc régulier répété.

## La fairness en CAO : un critère mesurable, pas seulement esthétique

Le pendant technique du point précédent : en conception de courbes (typographie,
carrosserie), une courbe est dite *fair* (élégante) quand sa courbure varie
*doucement* — peu d'extrema, peu d'inflexions parasites, variation la plus monotone
possible. C'est calculable (intégrale du carré de la dérivée de courbure) et donne un
critère objectif pour décider si un tracé brut doit être lissé avant d'être densifié en
branches, plutôt que de reproduire fidèlement chaque tremblement de la main.

## La phyllotaxie : l'angle d'or contre l'effet de grille

Les plantes espacent leurs feuilles à un angle de divergence d'environ 137,5° (l'angle
d'or) plutôt qu'à un pas constant — précisément parce qu'un pas rationnel simple (1/2,
1/3, 1/4 de tour) produit des alignements et des collisions, alors que l'angle d'or,
irrationnel, garantit un remplissage sans répétition perceptible. Un argument direct
contre un espacement uniforme naïf pour le placement des embranchements secondaires le
long d'une tige.

## Le rinceau classique : alternance, tangence, décroissance

Le rinceau (acanthe grecque et romaine, repris à la Renaissance) est la forme
ornementale la plus proche de ce que l'outil vise : une tige sinueuse dont des volutes
secondaires se détachent en alternance (gauche/droite) à intervalles réguliers, chacune
raccordée à la tige mère par une tangente (jamais un angle vif), et chacune plus petite
que la précédente par un facteur à peu près constant — une décroissance géométrique,
pas un jitter aléatoire autour d'une taille moyenne.

## L'arabesque islamique : rythme et continuité, jamais de vide

Au-delà de la géométrie à compas (étoiles, polygones), le principe de composition de
l'arabesque est la continuité rythmée : la ligne ne doit jamais sembler s'arrêter net,
et la densité d'ornement doit remplir l'espace disponible de façon régulière plutôt que
laisser un vide résiduel en bout de tracé. Un critère utile pour caler automatiquement
*combien* d'embranchements secondaires générer en fonction de la longueur du tracé
utilisateur, plutôt que d'en fixer un nombre arbitraire.

## Synthèse : ce qu'on en tire pour le générateur

Cinq principes, cinq traductions en règles de génération :

1. **Courbure croissante en fonction de la longueur d'arc** — les volutes générées
   automatiquement suivent une loi κ(s) = endCurvature·(s/length)^curvatureExponent
   (une spirale d'Euler/clothoïde généralisée), plutôt qu'une spirale logarithmique
   classique paramétrée par un angle polaire — voir la note en fin de section pour
   pourquoi ce choix.
2. **Ligne de beauté / fairness** — la tige principale, une fois simplifiée (RDP), est
   évaluée (voire relissée) selon la variation de sa courbure avant d'être densifiée :
   peu d'extrema plutôt que fidélité brute au tremblement de la main.
3. **Angle d'or** — l'espacement des embranchements secondaires le long de la tige suit
   un rythme dérivé du nombre d'or plutôt qu'un pas constant.
4. **Rinceau** — chaque volute fille se raccorde à sa mère par une tangente (continuité
   C1, jamais d'angle vif) et décroît géométriquement par rapport à sa mère.
5. **Arabesque** — la densité d'embranchement se cale sur la longueur totale du tracé,
   pour ne jamais laisser un segment de tige nu ni sur-charger un segment court.

C'est la base du prototype (`core/branching.ts`, `core/curvatureSpiral.ts`) : un module qui
prend la tige existante (`core/spline.ts`) et génère des branches secondaires en
appliquant ces règles, avant d'habiller le résultat avec le brush existant
(`core/brush.ts`) — voir
[Générer des volutes automatiquement](../how-to/generer-des-volutes-automatiquement.md).

Un principe de conduite du bonsaï (jamais une branche vers le côté concave d'une
courbure du tronc) avait un temps été retenu ici comme sixième règle, et le côté
d'un embranchement dérivé de la courbure locale de la tige en conséquence. Écarté
après examen d'un moodboard de références (arabesques Art nouveau, rinceaux) : ces
compositions ne suivent pas cette contrainte — volutes et vrilles s'enroulent
librement des deux côtés, y compris vers le creux d'un virage. Le côté d'un
embranchement reste donc une simple alternance gauche/droite (voir 3).

**Pourquoi une spirale logarithmique classique ne suffisait pas (principe 1)** : la
première version du prototype paramétrait la spirale par un angle polaire θ fixé
d'avance (`r = r0·e^(-bθ)`, échantillonné à pas d'angle constant sur `turns` tours).
Une tentative de correction (`curvatureRampPower`, retarder la décroissance du *rayon*
vers la fin du parcours angulaire) n'a pas suffi : θ restait la coordonnée de dessin
elle-même, avançant à pas constant indépendamment de la loi de rayon — la courbe
bouclait donc toujours intégralement `turns` fois autour de l'origine, quel que soit
`growthRate`/`curvatureRampPower`, qui ne pilotaient que la vitesse de décroissance du
rayon le long de ce parcours déjà figé, pas la rotation totale elle-même. Plus
profondément : une spirale log à taux constant est *auto-similaire* par construction
(courbure proportionnelle à `e^(bθ)`, qui croît au même rythme relatif à chaque tour)
— aucune reparamétrisation ne peut en sortir, la propriété d'auto-similarité interdit
structurellement un plateau de courbure quasi nulle suivi d'un resserrement tardif.
Résultat observé : un enroulement déjà visiblement serré dès le premier tour (un
"escargot" dès l'attache), au lieu d'une branche qui se courbe doucement d'abord et ne
se resserre qu'en fin de parcours — ce que montrent pourtant les références du
moodboard (grand arc ouvert à l'attache, rotation serrée réservée à la pointe).

Solution retenue (analyse conduite avec un agent dédié, comparant plusieurs modèles
candidats) : définir la courbe directement par une loi de courbure κ(s) en fonction de
la longueur d'arc s parcourue, plutôt que par un angle polaire fixé d'avance — une
spirale d'Euler/clothoïde généralisée, κ(s) = endCurvature·(s/length)^curvatureExponent,
intégrée numériquement (méthode du point milieu, voir `core/curvatureSpiral.ts`). À
`curvatureExponent = 1`, c'est une clothoïde classique : la courbure croît linéairement
avec la longueur parcourue, donc déjà quasi nulle au départ par construction
(continuité C1 **et** C2 avec la tige mère). Au-delà de 1, la montée en courbure est
explicitement retardée vers la toute dernière portion du parcours — le grand geste
presque droit suivi d'une rotation serrée tardive recherché. Candidats écartés :
reparamétrer la spirale log existante en longueur d'arc (cul-de-sac mathématique, ne
change pas la forme tracée — voir ci-dessus) ; un profil de courbure par easing
générique (strictement plus général mais sans bénéfice concret pour une UI à
curseurs) ; un arc large-rayon raccordé à une spirale log serrée (visuellement
plausible mais seulement C1 à la couture, un à-coup de courbure contraire au critère
de fairness du point 2).

## Sources

- [Golden spiral — Wikipedia](https://en.wikipedia.org/wiki/Golden_spiral)
- [Lutherie Myth/Science: Violin Scrolls are Based on the Golden Mean Spiral](https://liutaiomottola.com/myth/scroll.htm)
- [Line of beauty — Wikipedia](https://en.wikipedia.org/wiki/Line_of_beauty)
- [Hogarth's Line of Beauty: Why We Love the Serpentine Curve](https://www.lyonandturnbull.com/stories/hogarths-line-of-beauty)
- [Whiplash (decorative art) — Wikipedia](https://en.wikipedia.org/wiki/Whiplash_(decorative_art))
- [Geometric proportions: the underlying structure of Islamic geometric patterns — ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2095263512000635)
- [Arabesque Patterns in Art and Architecture](https://architecturecourses.org/design/arabesque-patterns)
- [Minimizing Curvature Variation for Aesthetic Surface Design — Berkeley EECS](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2008/EECS-2008-129.pdf)
- [Curvature and the fairness of curves and surfaces](https://www.academia.edu/14594390/Curvature_and_the_fairness_of_curves_and_surfaces)
- [Minimum variation log-aesthetic surfaces — ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2288430016301452)
- [Phyllotaxis & Fibonacci Sequence — Study.com](https://study.com/academy/lesson/phyllotaxis-spiral-fibonacci.html)
- [Biophysical optimality of the golden angle in phyllotaxis](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4607949/)
- [Rinceau — Wikipedia](https://en.wikipedia.org/wiki/Rinceau)
- [Acanthus (ornament) — Wikipedia](https://en.wikipedia.org/wiki/Acanthus_(ornament))
- [Interactive generation of procedural ornaments](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10403015)
- [Toward Procedural Decorative Ornamentation in Games](https://pcgworkshop.com/archive/whitehead2010procedural.pdf)
