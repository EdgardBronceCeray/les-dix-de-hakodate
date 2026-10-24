# Les Dix de Hakodate · L'aventure de De Nicol · 海戦

**Le jeu officiel de la bande dessinée « Les Dix de Hakodate »** (Night Workers) : *L'aventure de De Nicol*, combats de mer en Ezo, décembre 1868 - juin 1869.

**Pour jouer : double-clic sur `index.html`.** Rien à installer, tout fonctionne hors ligne, dans Chrome, Edge ou Firefox récents.
(Si le navigateur fait des histoires avec les fichiers locaux : `python -m http.server 8777` dans ce dossier, puis <http://localhost:8777>.)

Pour partager le jeu, il faut envoyer tout le dossier (`index.html`, `css/`, `js/`, `img/`), pas seulement `index.html`.

Le jeu est rendu en 3D temps réel dans le navigateur (WebGL, avec la bibliothèque Three.js, incluse dans `js/lib/`). Au premier lancement, la préparation de la mer et des îles prend quelques secondes.

Ceci est la **version 6, première mise à jour** (voir juste en dessous). Les versions précédentes sont gardées telles quelles :

- `version-6-premiere-livraison/` : la version 6 telle qu'elle a été livrée la première fois (les villages et les villes de la côte, les forts, les châteaux, les forêts du corsaire) ;
- `version-5-mise-a-jour-3/` : la version 5 après sa troisième mise à jour (l'équilibre du corsaire : chantier, chasse, autonomie, éperon, sièges) ;
- `version-5-mise-a-jour-2/` : la version 5 après sa deuxième mise à jour (au moyen et au difficile, des batteries qui tiennent tête à l'artillerie) ;
- `version-5-mise-a-jour-1/` : la version 5 après sa première mise à jour (trois difficultés pour le corsaire, De Nicol à l'écran-titre) ;
- `version-5-premiere-livraison/` : la version 5 telle qu'elle a été livrée la première fois (jeu allégé, sous-titre, fond de mer sans grésillement) ;
- `version-4-mise-a-jour-6/` : la version 4 après sa sixième mise à jour (échouage, navire à la forme de ses achats, abordage sur Entrée, tourbillons de l'arcade) ;
- `version-4-mise-a-jour-5/` : la version 4 après sa cinquième mise à jour (débarquement, appel à l'aide, forts avancés, cinq ateliers, coup de boutoir, abordage en mesure) ;
- `version-4-mise-a-jour-4/` : la version 4 après sa quatrième mise à jour (trente ports, les arsenaux et la flotte) ;
- `version-4-mise-a-jour-3/` : la version 4 après sa troisième mise à jour (le corsaire mis en scène, cartels du chantier, chavirage rattrapable) ;
- `version-4-mise-a-jour-2/` : la version 4 après sa deuxième mise à jour (corsaire refait, chantier, barre des voiliers) ;
- `version-4-mise-a-jour-1/` : la version 4 après sa première mise à jour (arcade moins généreuse, calmar qui traque, Kōtetsu visible) ;
- `version-4-premiere-livraison/` : la version 4 telle qu'elle a été livrée la première fois ;
- `version-3-mise-a-jour-3/` : la version 3 après sa troisième mise à jour (récit en images, générique de fin, Kōtetsu refait) ;
- `version-3-mise-a-jour-2/` : la version 3 après sa deuxième mise à jour (mode histoire revu, déblocages, fin de l'arcade) ;
- `version-3-mise-a-jour-1/` : la version 3 après sa première mise à jour (dix crans d'amélioration, ombres des nuages, reflets) ;
- `version-3-premiere-livraison/` : la version 3 telle qu'elle a été livrée la première fois ;
- `version-1/` : la première version jouable ;
- `version-2/` : la version 2 (cadence de tir, débris variés, caméra qui monte avec la vitesse, graphismes au maximum) ;
- `version-2-navires/` : la version 2 avec les navires refaits (roues à aubes, voiles, canons, équipage) ;
- `ancienne-version-arcade/`, `ancienne-version-simulation/`, `ancienne-version-2d/`, `ancienne-version-3d/` : les essais d'avant.

## La première mise à jour de la version 6

**Les voiles du corsaire, comme sur les navires de l'époque.** Jusqu'ici, chaque cran de voiles grandissait les mâts et les vergues : au dixième, des voiles deux fois et demie plus hautes et plus larges que nature, gonflées comme des ballons, comme aucun navire n'en a jamais porté. Désormais la mâture garde sa taille (elle s'élance à peine, d'un et demi pour cent par cran), et chaque cran ajoute des voiles, celles que portaient les navires de l'époque, chacune à sa place :

- **sur un navire à voiles carrées** (brick, corvette, frégate), au départ les huniers, les basses voiles, la brigantine, la trinquette et le grand foc ; puis, d'un cran à l'autre : les perroquets et le clin-foc ; les cacatois ; des voiles d'étai entre les mâts, et un foc de plus ; les bonnettes de hunier ; les bonnettes basses ; les contre-cacatois, sur un mât de flèche au-dessus du perroquet ; les bonnettes de perroquet ; d'autres voiles d'étai, plus haut ; les bonnettes de cacatois ; et pour finir, au grand mât seulement, une dernière petite voile au-dessus du contre-cacatois, comme le clipper Lightning en portait une en 1854. Les bonnettes ne s'établissent qu'au mât de misaine et au grand mât, jamais à l'artimon ;
- **sur un cotre ou une goélette**, au départ les voiles auriques, la trinquette et le grand foc ; puis les flèches ; un hunier carré, qui sur une goélette prend la place de la flèche du mât de misaine (c'est la goélette à hunier) ; le clin-foc ; une fortune carrée sous le hunier ; un perroquet ; les bonnettes de hunier ; un foc de plus ; les bonnettes basses ; les bonnettes de perroquet ; et un cacatois. La goélette à deux mâts devient ainsi un brick-goélette, ses voiles carrées à l'avant, sa voile aurique au grand mât ; le cotre porte, comme les cotres de guerre et de la douane du XVIIIe siècle, une basse voile, un hunier et un perroquet carrés, et leurs bonnettes.

Une voile qu'on n'a pas achetée n'est pas à bord, ni sa vergue (jusqu'ici, les vergues des perroquets et des cacatois étaient déjà là, voiles serrées). Au chantier, la description des voiles dit ce qu'ajoutera le prochain cran (« Au prochain cran : les bonnettes de hunier »), et la vue de la mâture recule un peu pour la montrer jusqu'à la pomme du grand mât. Le cartel « À l'époque » parle du Champion of the Seas, qui fila 465 milles en un jour en décembre 1854, un record, sans rien porter au-dessus de ses cacatois.

**Un peu moins d'allure par cran.** Plus haute, chaque voile est plus petite que la précédente : le premier cran rapporte autant que 18 % de la toile de départ, et chacun des suivants 1,4 point de moins (jusqu'ici : 20 % par cran jusqu'au cinquième, 9 % au-delà). La vitesse de fiche, au chantier :

| Navire | 5 crans, avant | après | 10 crans, avant | après |
|---|---|---|---|---|
| Coque de noix, deux mâts | 234 | 222 | 257 | 243 |
| Cotre, un mât | 192 | 186 | 204 | 196 |
| Goélette, trois mâts | 306 | 287 | 341 | 319 |
| Brick | 264 | 252 | 287 | 273 |
| Corvette, trois mâts | 326 | 307 | 361 | 339 |
| Frégate, quatre mâts | 388 | 363 | 435 | 406 |
| La même, avec chaudière, deux paires de roues et machine au troisième cran | 528 | 515 | 540 | 537 |

Au plus, 7 % de moins pour une frégate à pleine voilure sans machine ; presque rien avec la machine, déjà près du plafond. Rien d'autre ne change : ni les prix, ni la tenue à la gîte, ni le pas des navires de l'ordinateur, qui règlent toujours leur chasse sur votre allure.

**Ce que ça coûte.** Presque rien : les deux bonnettes d'une même vergue, qui s'établissent ensemble, ne font plus qu'un seul maillage, leurs boute-hors un autre, et les voiles d'étai d'un même rang un seul. Mesurée image par image en 1280 × 720, une flotte de six frégates à pleine voilure demande 2 289 appels de dessin par image au lieu de 2 351 en version 6, pour 4 % de triangles en plus.

**Vérifié.** Toutes les coques, avec tous leurs nombres de mâts et tous les crans de voiles, avec et sans machine, se bâtissent sans erreur, et chaque cran ajoute au moins une voile (sur une goélette, au deuxième cran, le hunier carré remplace la flèche du mât de misaine). Les parties rejouées à l'identique (les neuf étapes de l'histoire, quatre parties d'arcade) donnent exactement les mêmes positions, les mêmes coups et les mêmes scores qu'en version 6 ; au corsaire aussi, tant qu'on n'a pas acheté de voiles : avec des voiles, seule l'allure change. Deux parties de vingt minutes du joueur automatique en corsaire, avec achats de voiles et images rendues, sans une erreur ; et sur deux autres parties, rejouées à l'identique en version 6 puis dans la mise à jour, il ne s'en tire pas plus mal avec un peu moins d'allure. Une quinzaine de navires regardés au chantier et en mer, de la coque de noix à la frégate.

## La version 6

**Les villages et les villes de la côte, refaits.** Dans l'histoire comme dans le corsaire, chaque lieu a désormais sa taille : hameau (Kamome-jima, Tanohata), village (Otobe, Yamada, Omoe, Kamiiso ; au corsaire, Akkeshi, Mihonoseki et Toba), bourg (Esashi, Miyako, et la plupart des ports du corsaire) ou ville (Hakodate, et les neuf grandes villes du corsaire). Chacun est bâti selon son rivage :

- **les rues** suivent la côte, une à quatre selon la taille du lieu, reliées par des ruelles, avec des passages vers la grève ;
- **les maisons** s'alignent des deux côtés, la façade sur la rue, chacune sur sa cour de terre battue ; dans les bourgs et les villes, les maisons de marchands, étroites et profondes, se serrent les unes contre les autres ; sur une pente, la maison se pose sur un soubassement de pierre ;
- **les toits** : de chaume, en croupe, dans les campagnes ; de bardeaux lestés de pierres en Ezo et dans le Nord ; de tuiles dans les bourgs et les villes ; près de l'eau, les entrepôts blancs (kura) ;
- un **temple** au-dessus du lieu, avec sa porte et ses pins ; un **sanctuaire** et son torii vermillon au bout du front de mer ; dans les bourgs et les villes, la **tour de guet du feu** dépasse des toits ;
- sur la grève, les **barques** tirées en rang et les **séchoirs à filets** ; des jetées de bois ; dans les villes, un **quai de pierre** le long du port ;
- derrière, des potagers, des arbres de jardin, et les **rizières**, en terrasses sur les pentes ; en Ezo, où l'on ne cultivait guère le riz, des champs secs.

**Six châteaux.** Les villes du corsaire dont le château avait encore son donjon en 1868 le montrent, sur une hauteur derrière la ville : Matsumae (le château de Fukuyama, achevé en 1854), Hiroshima (le bas de ses murs bardé de planches noires), Hagi, Wakayama (donjon rebâti en 1850), Kōchi et Uwajima. La cour du château sur sa plateforme de pierre, son mur blanc chaperonné de tuiles, ses deux tourelles, et le donjon, de trois à cinq étages, les poissons d'or au faîte.

**Les forts.** Les batteries des ports du corsaire sont maintenant des forts à la manière des daiba que le Japon élevait sur ses côtes dans les années 1850 et 1860 : une lunette de pierre en talus, la pointe vers la mer ; du côté de la mer, un rempart de terre gazonné, percé d'embrasures où quatre pièces sont sur leurs plateformes de bois, avec leurs piles de boulets ; derrière, le chemin de ronde, la poudrière, le corps de garde, la porte côté terre, le mât de signaux, des pins. Les forts avancés sont de petits pentagones à deux pièces ; posés sur une pointe que le rivage dessiné a adoucie, certains ont les pieds dans l'eau, comme les forts en mer de l'époque. Hakodate a le fort de Benten : un hexagone de pierre irrégulier, allongé comme une pièce de shōgi, ses quinze pièces tournées vers toute la rade, deux casernes, une poudrière, un magasin ; il prend la place de la longue jetée et de son phare, qui avançaient au milieu de la rade. Le fort de Benten paraît aussi dans les deux dernières étapes de l'histoire, au bord de la baie, près du haut-fond où le Banryū vint s'échouer. Les forts ont gardé exactement leur emprise : on les touche, on s'y échoue et on les canonne comme avant.

**Les forêts du corsaire.** Elles ne poussaient que dans le nord de Hokkaidō : les 16 000 arbres de la carte se plantaient en la parcourant du nord vers le sud, et il n'en restait plus passé les premières lignes ; le réglage qui devait les répandre sur tout le Japon n'arrivait pas jusqu'au relief. Les voici sur tout le Japon, et deux fois plus nombreuses : 36 000.

**Ce que ça coûte.** Mesuré image par image, en 1280 × 720, qualité maximale :

| Scène | Triangles, avant | après | Temps d'une image |
|---|---|---|---|
| Menu (la flotte devant Hakodate) | 1,13 million | 1,13 million | pareil |
| Histoire, Yamada | 1,41 million | 1,41 million | pareil |
| Arcade | 172 000 | 170 000 | pareil |
| Corsaire, au chantier | 321 000 | 608 000 | 8 % de plus |
| Corsaire, en mer | 319 000 | 640 000 | 6 % de plus |
| Corsaire, devant Kanazawa | 374 000 | 724 000 | 14 % de plus |

Dans l'histoire, les nouveaux villages ne coûtent pas plus que les anciens : chacun est un seul maillage. Au corsaire, la carte graphique dessine environ deux fois plus de triangles, surtout pour les forêts, qui couvrent désormais tout le Japon, et pour les villes ; le processeur n'en fait pas plus. Si l'ordinateur peine, le jeu allège toujours son image tout seul. Une traversée se prépare en un peu moins d'une seconde de plus, et prend une quarantaine de mégaoctets de mémoire en plus. (Temps mesurés dans un rendu logiciel, sans carte graphique : sur un vrai ordinateur, tout va bien plus vite, et l'écart compte moins.)

**Vérifié.** Les parties rejouées à l'identique (les neuf étapes de l'histoire, quatre parties d'arcade, deux traversées du corsaire) donnent exactement les mêmes positions, les mêmes coups et les mêmes scores qu'en version 5 : rien ne change au jeu, ni l'emprise des forts. Deux parties de vingt minutes du joueur automatique en corsaire, sans une erreur. Les villages de toutes les cartes de l'histoire et des trente et un ports du corsaire se bâtissent sans erreur (de 4 maisons pour le hameau de Kamome-jima à plus de 200 pour Kagoshima), et une quinzaine ont été regardés en jeu et de près, en hiver (Esashi), au printemps et en été (Hakodate).

## La troisième mise à jour de la version 5

Elle ne touche que le corsaire : l'histoire et l'arcade restent à l'identique. Le facile n'est plus tout à fait la traversée d'avant : il reste le plus généreux, mais on n'y a plus tout pour presque rien.

**Le chantier coûte plus cher.** Les pièces qui rendent vite un navire rapide ou redoutable ont un prix de base plus haut (la coque, les mâts, les voiles, les pièces de chasse, la chaudière, les roues, l'éperon), et tous les prix du chantier, comme ceux des navires de l'arsenal, sont multipliés selon la difficulté : par 1,5 en facile, par 2 au moyen, par 2,8 au difficile.

| Pièces d'or | Avant | Facile | Moyen | Difficile |
|---|---|---|---|---|
| Le cotre (premier cran de coque) | 90 | 180 | 240 | 335 |
| Toute la coque, jusqu'à la frégate | 2 240 | 4 905 | 6 540 | 9 155 |
| Les dix crans de voiles | 5 165 | 10 950 | 14 600 | 20 445 |
| Les trois crans d'éperon | 1 400 | 3 900 | 5 200 | 7 280 |
| Le premier navire de l'arsenal | 300 | 450 | 600 | 840 |
| Tout le chantier, au plus haut | 44 875 | 76 260 | 101 680 | 142 350 |

**Qui vous chasse force l'allure.** Un navire qui vous a pris en chasse pousse sa toile et sa machine : jusqu'à 85 % de votre vitesse en facile, 93 % au moyen, autant que vous au difficile, sans jamais dépasser 1,45 fois, 1,7 fois et 2 fois sa propre allure. La chasse finie, il reprend son pas. Un navire plus rapide s'échappe donc toujours, mais bien moins vite ; au difficile, un navire à peine plus rapide que son chasseur ne le sème plus en ligne droite. Mesuré en ligne droite, le chasseur parti à 300 derrière vous :

| Le chasseur, à pleine allure | Avant | Facile | Moyen | Difficile |
|---|---|---|---|---|
| Derrière une frégate aux voiles, roues et machine au plus haut (270) : le Mōshun, qui file 110 de lui-même | 110 | 159 | 187 | 220 |
| Derrière un navire à la moitié des voiles, sans machine (182) : un chasseur qui file 103 à 136 de lui-même | le sien | 149 | 169 | 181 |

Avec la moitié des voiles, on distançait un chasseur de 50 à 80 par seconde ; désormais d'une trentaine en facile, d'une dizaine au moyen, et plus du tout au difficile : il faut virer, combattre ou gagner un port.

**L'autonomie est plus courte.** Une grande coque n'allonge plus autant les vivres et le charbon, et la difficulté les use plus vite : de 10 % en facile, 30 % au moyen, 60 % au difficile (rien, 5 et 12 % auparavant). Une frégate sans cales tenait la mer 7 min 30 en facile (7 min au moyen, 6 min 30 au difficile) ; elle la tient désormais 5 min 30, 4 min 30 et 3 min 30. Les cales sont là pour qui veut tenir longtemps (chaque cran, 20 % de plus). Le chantier affiche l'autonomie de la difficulté de la traversée.

**L'éperon, plus cher et moins brutal.** Il coûte près de trois fois plus en facile (voir plus haut), et son coup est borné : il ne grandit plus au-delà d'une bonne allure, l'avantage d'un navire plus lourd est plafonné, la cuirasse y ajoute moins, et l'éperon au plus haut multiplie le coup par 1,9 au lieu de 2,8. Mesuré avec une frégate cuirassée (cinq crans) à l'éperon au plus haut, lancée à 212 avec le coup de boutoir sur un navire par le travers : le choc valait de 600 à 900 de coque, de quoi couler d'un coup n'importe quel navire de la mer ; il en vaut désormais de 55 à 85.

**Planté sur l'éperon.** Un navire trop solide pour couler sous le choc reste planté sur votre étrave : il la suit, ne manœuvre plus et ne tire plus le canon, et l'abordage commence (la même réglette : Entrée quand le curseur passe dans l'or ; sa mousqueterie vous coûte toujours de la coque). Le porter freine votre navire (30 % de son allure au plus). On se dégage en reculant (↓) ; il se dégage seul au bout de quinze secondes si l'abordage n'en est pas à la moitié, et au plus tard au bout de quarante, ou si la côte s'en mêle.

**Les ports sans défense tombent.** Une escadre de siège se laissait détourner de sa route : par l'alarme d'un port que vous attaquiez, ou dès qu'elle vous voyait. Elle vous prenait en chasse, vous la couliez, et le port « tenait » sans avoir été défendu ; le délai au bout duquel elle se lasse courait même pendant sa route. Désormais elle va droit à son port : elle ne vous prend en chasse que si vous venez sur elle (à moins de 520) ou si vous tirez sur l'un des siens, elle n'entend plus l'alarme des autres ports, et ses cinq minutes de siège ne comptent que devant la rade. Une escadre qui n'est jamais arrivée n'a rien assiégé : pas de « le port a tenu ». Mesuré : cinq ports à vous, sans défense, vous au large, dix sièges de suite : les dix ports tombent ; avec des batteries de deuxième ou de troisième niveau, la moitié des sièges échouent. Et quand vous attaquez le port d'où une escadre de siège vient de partir, elle poursuit sa route (elle partait vous chasser).

**Vérifié.** L'histoire et l'arcade, rejouées à l'identique (les neuf étapes, quatre parties), donnent exactement les mêmes positions, les mêmes coups et les mêmes scores qu'avant. En corsaire, la chasse, l'éperon (le choc, le navire planté et son abordage), les sièges et l'alarme ont été mesurés dans les trois difficultés, le chantier aussi (ses prix, l'autonomie affichée). Vingt-sept parties du joueur automatique (de vingt et de quarante minutes, depuis la coque de noix et en conquête, au canon et à l'éperon, dans les trois difficultés) se sont jouées sans une erreur ; en conquête, avec un navire déjà fort, il prend en moyenne 2,2 ports en facile, 1 au moyen, aucun au difficile, et se fait couler 9, 12 et 24 fois en quarante minutes.

## La deuxième mise à jour de la version 5

**Au moyen et au difficile, les batteries tiennent tête à votre artillerie.** Une batterie ne grandissait qu'avec la menace (la force d'ensemble de votre navire et les ports pris), bien moins vite que votre bordée, qui est le nombre de canons multiplié par le calibre : une frégate bien armée la faisait taire en quelques bordées. Désormais, au moyen et au difficile, il lui faut au moins 9 et 12 bordées du navire que vous menez quand tous les boulets portent (16 et 21 pour une grande ville), quel que soit son armement. Mieux armé, on ne tire plus moins de bordées : on les tire plus vite (les canonniers) et l'on encaisse mieux (la cuirasse). Les navires de votre flotte tirent toujours avec vous, et les forts avancés suivent leur batterie. Le facile ne change pas.

Mesuré en jeu, avec une frégate à l'artillerie au plus haut (sept canons par bord, calibre et canonniers au maximum), stoppée par le travers d'une batterie, à 330 ; environ deux boulets sur trois portent :

| | Facile | Moyen | Difficile |
|---|---|---|---|
| Un port (Matsumae, Aomori) | 7 bordées, 7 s | 13 bordées, 13 s | 17 bordées, 17 s |
| Une grande ville (Niigata, Kanazawa) | 15 bordées, 15 s | 28 bordées, 28 s | 37 bordées, 38 s |

Avec un navire peu armé, comme le brick du début, rien ne change : sa batterie tenait déjà plus longtemps que ce plancher.

Le joueur automatique, en conquête (un navire déjà fort, qui attaque les ports et continue d'acheter ; six parties de quarante minutes par difficulté), prend en moyenne 2 ports en facile, 0,7 au moyen et 0,2 au difficile, et se fait couler 11, 11 et 20 fois. C'est un pilote de test, bien moins habile qu'un joueur : ce qui compte, c'est l'écart d'une difficulté à l'autre.

**Vérifié.** En facile, les parties rejouées à l'identique (les neuf étapes de l'histoire, quatre parties d'arcade, deux traversées du corsaire, et quatre parties de vingt minutes du joueur automatique, où il encaisse, coule, aborde, éperonne et prend un port) donnent exactement les mêmes positions, les mêmes coups et les mêmes scores qu'en version 5.

## La première mise à jour de la version 5

**Trois difficultés pour le corsaire.** Le menu du corsaire a une ligne de plus, « Difficulté : ‹ Facile › », qu'on change avec ← → (Entrée la fait tourner aussi). Elle vaut pour la prochaine nouvelle traversée ; la traversée en cours garde la sienne, qui s'écrit dans la description de « Reprendre », dans la pause et sur l'écran de fin. Le facile est la traversée d'avant, à l'identique.

| | Facile | Moyen | Difficile |
|---|---|---|---|
| Coque des navires ennemis | telle quelle | 15 % plus solide | 30 % plus solide |
| Leurs coups (sur vous, votre flotte et vos forts ; abordage et éperon compris) | tels quels | 15 % plus forts | 35 % plus forts |
| Cadence de tir (navires, batteries, forts, assiégeants) | telle quelle | 10 % plus vive | 20 % plus vive |
| Navires en mer | tels quels | un de plus, qui sortent 10 % plus souvent | trois de plus, qui sortent 20 % plus souvent |
| Leurs crans | tels quels | gagnés 15 % plus vite | un cran d'avance au départ, et gagnés 30 % plus vite |
| Prise en chasse | dès que votre navire menace (une coque et deux canons, à peu près) | un peu plus tôt (une coque et un canon), et de 10 % plus loin | plus tôt encore (une coque, ou deux canons), et de 25 % plus loin |
| Batteries et forts avancés | tels quels | 20 % plus solides | 45 % plus solides |
| Secours et sièges | tels quels | sièges 15 % plus fréquents | un navire de plus dans chaque escadre, sièges 30 % plus fréquents |
| Abordage | tel quel | 10 % plus serré | 20 % plus serré |
| Or (coffres, prises, magasins, tribut) | tel quel | 10 % de moins | 20 % de moins |
| Vivres et charbon | tels quels | s'épuisent 5 % plus vite | s'épuisent 12 % plus vite |

Les prix du chantier ne changent pas. Chaque difficulté a son record et sa coche « Le Japon a déjà été pris » (le record d'avant devient celui du facile) ; l'écran-titre montre le record de la difficulté choisie.

Éprouvé avec le joueur automatique, un pilote de test bien moins habile qu'un joueur (il va chercher les coffres jusque sous les batteries), en parties de quarante minutes : neuf par difficulté depuis la coque de noix (au canon, à l'éperon, à l'abordage), six pour la conquête, avec un navire déjà fort qui attaque les ports et continue d'acheter.

| | Facile | Moyen | Difficile |
|---|---|---|---|
| Depuis la coque de noix : navires perdus | 6,4 | 6,4 | 11,4 |
| Depuis la coque de noix : or gagné | 7 600 | 7 600 | 6 300 |
| Conquête : ports pris | 2,3 | 0,7 | 0,5 |
| Conquête : navires perdus | 9,5 | 11,7 | 17,8 |
| Conquête : premier port pris | après 13 min | après 18 min | après 27 min |

Au moyen, le début ressemble au facile (plus de navires à combattre, autant de pertes) ; c'est la conquête qui se durcit : les batteries tiennent, et les escadres de secours font mal. Au difficile, le début est rude aussi.

**De Nicol à l'écran-titre.** Tout à droite, debout au-dessus de la ligne des touches : Henri de Nicol en pied, tel que la bande dessinée le dessine (son personnage, détouré de son papier). Il entre en fondu avec l'écran-titre et ne bouge pas quand on change la langue, la musique ou le son. Il ne paraît que sur un écran assez large (plus de 960 points, et plus allongé que 3:2) : sur un écran plus carré, il cacherait le Kaiten.

**Le menu du corsaire tient sur l'écran**, de 600 à 1 080 lignes, avec sa ligne de plus : un peu plus large, son texte prend moins de lignes. Il débordait déjà en 1920 × 950 (un écran 1080p avec les barres du navigateur).

**Vérifié.** Les parties rejouées à l'identique (les neuf étapes de l'histoire, quatre parties d'arcade, deux traversées du corsaire en facile) donnent exactement les mêmes positions, les mêmes coups et les mêmes scores qu'en version 5. Le parcours du menu en trois langues : changer de difficulté, partir, la pause, couler, reprendre, gagner, repartir depuis l'écran de fin, les records séparés. L'écran-titre et le menu du corsaire à une dizaine de tailles d'écran.

## La version 5

**Le sous-titre.** Le jeu s'appelle désormais *Les Dix de Hakodate · L'aventure de De Nicol* : à l'écran-titre, sous le nom, entre les deux filets d'or (les années passent au-dessus, à côté du sceau), au début du générique et dans l'onglet du navigateur ; en anglais *De Nicol's Adventure*, en japonais ド・ニコルの冒険.

**Le jeu allégé.** Rien ne change à ce qu'on voit ni aux règles : les mêmes images, les mêmes navires, les mêmes parties. Le jeu demande seulement beaucoup moins à l'ordinateur.

- **Les ombres ne se dessinent plus qu'une fois par image.** La carte des ombres du soleil (4096 × 4096 points) était recalculée à chaque passe de l'image : deux fois, dont une pour rien.
- **Les forêts sont découpées en carrés.** Les arbres d'une carte (16 000 sur le Japon du corsaire, 6 500 dans l'archipel de l'arcade et du menu, 5 000 dans chaque carte de l'histoire) formaient un seul bloc, dessiné en entier à chaque passe dès qu'un coin de la carte paraissait ; rangés par carrés, seuls ceux qui sont dans le champ (de l'image, de l'ombre ou du reflet) sont dessinés. Les éboulis de même.
- **Les navires, en bien moins de morceaux.** Les canons d'un même bord sont fondus en une seule batterie (le recul d'une bordée reste le même), les mantelets des sabords aussi une fois ouverts, et toutes les pièces de matière unie d'un navire (bois, fer, laiton, peintures, toile serrée, équipage) en un seul maillage dont chaque sommet porte sa couleur, sa rugosité et son éclat. Un navire se dessine en deux à trois fois moins d'ordres : 31 au lieu de 81 pour le Kaiten, 85 au lieu de 145 pour un corsaire tout gréé.
- **Les reflets** : la caméra miroir, sous l'eau, écarte elle-même ce qui est immergé (un cadrage oblique), au lieu d'un plan de coupe ajouté à chaque matière. La carte graphique a douze programmes de moins à préparer au lancement (35 au lieu de 47), donc un démarrage plus court et moins d'à-coups quand un objet nouveau paraît ; et le reflet se dessine sans rejeter les points un à un.
- **La mer** calcule l'ombre des nuages une fois au lieu de deux près des côtes ; **les particules** n'envoient plus à la carte graphique que celles qui sont vivantes.
- **L'image s'allège plus vite quand l'ordinateur peine** : le jeu en juge sur deux secondes et demie au lieu de cinq à dix, descend de deux paliers d'un coup s'il le faut, et veille aussi dans les menus (sous 25 images par seconde).

Mesuré image par image, en 1280 × 720, qualité maximale :

| Scène | Ordres de dessin, avant | après | Triangles, avant | après |
|---|---|---|---|---|
| Menu (la flotte devant Hakodate) | 1 576 | 884 (44 % de moins) | 3,73 millions | 1,13 million (70 % de moins) |
| Histoire, Yamada | 415 | 272 (34 % de moins) | 2,85 millions | 1,37 million (52 % de moins) |
| Arcade | 676 | 341 (50 % de moins) | 216 000 | 171 000 (21 % de moins) |
| Corsaire, au chantier | 456 | 315 (31 % de moins) | 4,80 millions | 1,51 million (69 % de moins) |
| Corsaire, en mer | 803 | 460 (43 % de moins) | 547 000 | 319 000 (42 % de moins) |
| Corsaire, devant Kanazawa | 956 | 517 (46 % de moins) | 666 000 | 358 000 (46 % de moins) |

Le temps que met le processeur à préparer chaque image baisse de 25 à 44 % selon la scène. Les images ont été comparées point par point avec celles de la version 4, sur dix scènes (menu, histoire, arcade avec ses mantelets qui s'ouvrent et une bordée, la nuit, le corsaire au chantier, en mer et devant un port) : sur 9,2 millions de points, 3 900 diffèrent (0,04 %), presque tous dans les reflets des navires, que les vagues brouillent de toute façon, et le plus souvent de quelques tons sur 255 : rien que l'œil puisse voir. Les parties rejouées à l'identique (les neuf étapes de l'histoire, quatre parties d'arcade, deux traversées du corsaire) donnent exactement les mêmes positions, les mêmes coups et les mêmes scores.

**Le son.** Le fond de mer et de vent ne grésille plus. Il était tiré d'un bruit blanc, au souffle aigu, qui bouclait toutes les deux secondes avec un raccord ; c'est maintenant un bruit plus sourd, sans raccord, où le ressac va et vient avec la houle, et le vent ne siffle vraiment que dans la tempête : par temps maniable, le souffle aigu est près de quatre fois plus faible, pour un fond aussi présent. Un limiteur, en bout de chaîne, évite que le son sature quand une bordée, une explosion et la musique tombent ensemble.

## La sixième mise à jour de la version 4

Tout se passe dans le mode corsaire, sauf les tourbillons de l'arcade et l'ordre du menu ; le mode histoire ne change pas.

- **Le menu** présente le mode corsaire avant l'arcade.
- **L'échouage.** Au ralenti, toucher la côte ou un fort (batterie ou fort avancé) abîme la coque et stoppe la machine ; à bonne allure, droit dessus (plus de la moitié de la pleine allure), le navire s'y brise : il est perdu d'un coup, couché sur la roche (« Échoué ! »). En glissant le long du bord, on s'en tire mieux. Quand on court sur la terre trop vite pour s'arrêter à temps, la vigie crie « Terre devant ! » et la cloche sonne. Les forts ne se traversent plus.
- **Le navire prend la forme de ce qu'on achète.** La coque s'allonge avec les cales et le nombre de canons, s'élargit avec la cuirasse, se hausse avec les cales et s'abaisse sous la cuirasse lourde. La cuirasse va maintenant jusqu'à ses huit crans à l'image : la ceinture monte jusqu'au plat-bord, une seconde tourelle à l'arrière, un blockhaus. L'éperon s'allonge à chaque cran, et son étrave se barde de fer au dernier. La machine hausse et élargit les cheminées ; l'hélice paraît à l'étambot (deux, trois puis quatre pales) avec le bâti qui la hisse ; le gouvernail déborde de l'étambot, et une seconde roue s'ajoute ; les pompes se dressent au pied du grand mât ; une deuxième puis une troisième mitrailleuse, à la poupe et sur le rouf ; une embarcation de plus par cran de chaloupes ; les servants des pièces (canonniers) et les abordeurs en chemise rouge, sabre au poing, garnissent le pont ; le nid de pie de la vigie, puis sa longue-vue, puis un second nid au mât de misaine.
- **Au chantier, la vue suit ce qu'on choisit** : toute la toile pour les mâts, les voiles et la vigie ; pour le reste, la coque, voiles serrées, de plus près.
- **L'abordage se frappe sur Entrée** (quand le curseur passe dans l'or) : Espace reste au tir, même bord à bord.
- **Arcade : des tourbillons un peu plus grands et plus forts.** Pris dans le sens du courant, ils dévient le navire et le lancent (« lancé par le courant ! », l'élan dure un peu après la sortie) ; à contre-courant, ils le freinent et l'aspirent ; leur œil aspire, freine, fait tourner le navire et ronge la coque, puis le lâche. Le dessin montre le sens du courant et l'œil.
- Corrigé : au-delà du cinquième cran de cuirasse, les plaques disparaissaient de la coque ; le titre de fin disait « Le Mouette ».

## La cinquième mise à jour de la version 4

Tout se passe dans le mode corsaire ; l'arcade et le mode histoire ne changent pas.

- **Le débarquement se mérite.** On ne débarque plus du milieu de la rade : il faut approcher de la plage devant la ville (le cercle doré, à une encablure de la grève) et stopper. Les chaloupes partent alors du navire et rament vers la grève ; il faut une quinzaine de secondes, davantage pour une grande ville, moins avec des chaloupes, des abordeurs et la flotte autour. Tant qu'un navire ennemi armé est à portée de la plage, les chaloupes attendent. Entrée ne débarque plus tout de suite.
- **Un port attaqué appelle à l'aide.** Au premier coup sur sa batterie ou ses forts, les navires des environs accourent, et une escadre de secours part du port ennemi voisin (une flèche rouge la montre au bord de l'écran) ; une seconde part quand la batterie tombe. Plus la menace monte, et plus la ville est grande, plus l'escadre est forte.
- **Des batteries plus solides**, qui se réparent lentement si on les laisse une demi-minute : il faut s'y reprendre à plusieurs bordées, mais ce qui est fait n'est pas tout à fait perdu quand il faut d'abord chasser l'escadre de secours.
- **Des forts avancés.** Deux autour des neuf grandes villes, un autour de dix autres ports, sur les pointes qui commandent les approches. Ils tirent aussi, de leur côté : soit votre navire est assez solide pour encaisser le feu de trois batteries à la fois, soit vous les faites taire un à un avant de vous occuper du port. Ils se réparent eux aussi, et passent à vous avec le port.
- **Le chantier, en cinq ateliers** (← → pour passer de l'un à l'autre) : coque et voilure, artillerie, machine, défense, équipage. Une centaine de crans au lieu de trente-neuf : les voiles montent jusqu'à dix crans, la cuirasse jusqu'à huit, les abordeurs jusqu'à six, l'éperon et la Gatling jusqu'à trois ; et dix pièces nouvelles, le doublage de cuivre (plus d'allure, et le cuivre luit sous la flottaison), le gouvernail (on vire plus court), les pièces et obus (plus de portée, plus de dégâts, et les canons changent sous vos yeux, des pièces lisses aux canons rayés Armstrong), les canonniers (on recharge plus vite), la machine (plus de vapeur, moins de charbon), l'hélice, les pompes et les charpentiers (la coque se refait en mer, jusqu'aux trois quarts), les chaloupes (on débarque plus vite), les cales et les vivres (plus d'autonomie), la vigie et la longue-vue (les navires qui vous chassent, et plus de coffres, signalés au bord de l'écran).
- **« Prendre la mer », un vrai bouton**, toujours visible sous la liste du chantier. Quand la bourse ne permet plus rien, le curseur y va de lui-même ; la première fois, une ligne dit comment faire. Échap y mène aussi.
- **Éperonner : le coup de boutoir.** Deux appuis sur ↑ coup sur coup donnent un élan bref qui arme l'éperonnage ; sans lui, on ne fait que heurter l'autre navire. Le coup grandit avec la vitesse, l'éperon, la cuirasse, et le poids de votre navire contre le sien.
- **L'abordage en mesure.** Bord à bord, une réglette paraît au-dessus du navire : frappez Espace quand le curseur passe dans l'or. Chaque coup juste fait avancer l'abordage, un coup raté le recule. Plus le navire d'en face est fort par rapport au vôtre, plus l'or est étroit, le curseur vif et les coups à réussir nombreux ; vos abordeurs aident. Pendant l'abordage, Espace ne tire plus.
- **La peinture se voit enfin** : la couleur de la coque changeait dans la liste, pas sur le navire.
- De nouveaux cartels « À l'époque » au chantier, pour chaque nouvelle pièce (voir « Ce qui est exact »).

## La quatrième mise à jour de la version 4

Tout se passe dans le mode corsaire ; l'arcade et le mode histoire ne changent pas.

- **Trente ports à prendre au lieu de seize**, à leur place sur la carte : aux seize du début s'ajoutent Esashi, Akkeshi, Hachinohe, Akita, Chōshi, Shimizu, Kanazawa, Wakayama, Mihonoseki, Hagi, Hiroshima, Uwajima, Ōita et Hakata. Le Japon est à vous au trentième.
- **Prendre un port, sans chercher la touche.** Une fois sa batterie réduite au silence, il suffit d'entrer dans le cercle doré de sa rade et d'y rester : une jauge « Débarquement » se remplit en quelques secondes (plus vite avec des abordeurs, et avec la flotte autour), et le port est à vous. Entrée débarque tout de suite.
- **Le chantier se voit.** Dans un port à vous, une invite s'affiche au-dessus du navire : « Entrée : le chantier de Matsumae ». La première fois qu'on quitte le chantier, un mot rappelle comment y revenir.
- **Une flotte.** Cinq grandes villes ont un arsenal : Edo (Shinagawa), Ōsaka (son port de Hyōgo), Kanazawa, Hiroshima et Kagoshima (un cercle d'or les marque sur la mini-carte). Une fois la ville prise, son arsenal arme un navire de plus, un cotre, qu'on fait grandir à n'importe quel chantier comme le sien : la Mouette, le Cormoran, l'Albatros, le Goéland, le Pétrel. Ils vous suivent en ligne de file, dans votre sillage, tirent leur bordée sur l'ennemi par le travers (et sur les batteries), ramassent les coffres qu'ils croisent ; l'ennemi les prend pour cibles, eux aussi. Au chantier, ← → change de navire : on choisit celui qu'on améliore, on peut passer à son bord, et lui donner sa consigne (suivre la flotte, ou rester à quai, où il défend le port). Un navire trop touché quitte la ligne et se replie sur le port à vous le plus proche ; réparé, il rallie la flotte. Si le navire que vous menez coule, vous passez à bord d'un autre : la traversée ne s'arrête qu'avec le dernier.
- **Plus de monde à mesure qu'on avance.** Le nombre de navires ennemis grandit avec les ports pris et avec votre flotte, et ils viennent de plus en plus souvent en escadre, deux, trois ou quatre à la file ; les sièges sont plus nombreux et plus forts. Chaque navire ennemi, lui, grandit un peu moins qu'avant : c'est le nombre qui fait la difficulté.
- De nouveaux cartels « À l'époque » au chantier : les arsenaux (Ishikawajima, Nagasaki, Yokosuka), la ligne de file, la marque du chef d'escadre, le navire mouillé sous les batteries.
- Un grand navire engagé dans une crique trop étroite pour y virer n'y reste plus pris : au bout de quelques secondes, il est remis à flot au plus près. Et au chantier, une coque qui grandit à son poste reprend une place où elle ne touche ni la rive ni ses voisins.

## La troisième mise à jour de la version 4

- **Le mode corsaire est présenté comme une mise en scène des navires de l'époque.** Dans les années 1860, la marine change d'âge : la vapeur s'ajoute à la voile, l'hélice remplace les roues à aubes, le fer couvre le bois. Le menu le dit, une plaque de laiton remplace l'ancien tampon, et l'écran de victoire rappelle que cette conquête n'a existé que sur la carte (le gouvernement d'Ezo se rendit le 27 juin 1869), mais que la coque, la machine et les armes du navire sont bien celles de l'époque.
- **Au chantier, un cartel « À l'époque »**, sous la liste, comme au musée : pour chaque coque et chaque pièce, ce qu'elle était alors, avec un navire ou un fait de l'époque. Le cotre des douaniers et des pilotes ; la goélette Banryū, l'ancien yacht Emperor ; le brick, gréement du Kōtetsu ; le Kaiten et le Kasuga, corvettes à roues ; le Kaiyō Maru, frégate construite à Dordrecht et perdue devant Esashi ; les six mâts du Great Eastern ; la Gloire, le Monitor et le Virginia ; l'éperon à Lissa ; l'abordage de Miyako ; la Gatling, contestée à Miyako ; le fort de Benten (voir « Ce qui est exact »).
- **Le chavirage, plus lent et rattrapable.** La gîte se prend en une seconde et demie environ ; couché à fond, le navire a encore un instant pour se relever si l'on lâche la barre (la jauge tremble, « il se couche : lâchez la barre ! »), et un « Rattrapé de justesse ! » salue le sauvetage. Avec la coque de noix à pleine allure, un demi-tour brutal fait rougir la jauge sans chavirer si l'on lâche la barre au bout ; un tour complet la couche. La première fois, un conseil explique la jauge.
- **Les navires de l'ordinateur se présentent** la première fois qu'un type paraît dans la traversée : « En vue : le Kasuga, corvette à roues ».
- **L'aide en pause parle du corsaire** (l'or, le chantier, les ports) au lieu des caisses de l'arcade, et le menu du corsaire tient sur un écran de 720 lignes.

## La deuxième mise à jour de la version 4

- **Le mode corsaire refait de fond en comble.** Plus de niveaux ni de caisses : on part de Hakodate sur une coque de noix avec soixante pièces d'or, on pille, et l'on construit son navire pièce par pièce au chantier d'un port à soi, sous ses yeux. Trois façons de vaincre (le canon, l'éperon, l'abordage), une autonomie à surveiller (les vivres, et le charbon de la machine), des ports à prendre, à fortifier et à défendre, et tout le Japon à conquérir (voir plus bas).
- **La barre des voiliers, en corsaire.** Un voilier gîte dans les virages. Virer court à pleine allure le couche à vue d'œil (la jauge de gîte s'allume sous le navire et rougit, la coque craque), et s'il insiste, il chavire et coule. Pour éviter cela : réduire l'allure avant de virer, ou lâcher la barre quand la jauge rougit. La conduite agressive d'avant ne revient qu'avec une coque forte (le brick, au chantier). Les roues à aubes tiennent le navire droit. L'arcade et le mode histoire ne changent pas.
- **Le Kōtetsu** se gagne toujours en finissant l'arcade, ou désormais en prenant huit ports en corsaire.

## La première mise à jour de la version 4

- **Moins de caisses peintes dans les derniers niveaux de l'arcade.** Au niveau 8, on pouvait en voir huit à la fois, et un choc ne coûtait plus rien. Il y avait deux raisons : les caisses et les prises d'un niveau restaient dans le champ au niveau suivant, et s'y accumulaient ; et chaque débris brisé avait sa chance d'en lâcher une. Désormais chaque niveau repart de zéro, les débris n'en lâchent plus que quelques-unes par niveau (de moins en moins), jamais plus de trois à la fois sur l'eau, et les caisses peintes finissent par couler si on ne va pas les chercher (elles s'enfoncent et leur halo clignote juste avant). Les premiers niveaux restent aussi généreux qu'avant.
- **Le calmar géant vous traque** au lieu de paraître une fois : il chasse, bondit, renonce et revient (voir plus bas).
- **Le Kōtetsu se voit dans la flotte** avant d'être gagné : le choix du navire le montre, marqué « à gagner », avec ce qui le débloque. Il ne s'affichait pas, si bien qu'on ne savait pas qu'il existait.

## Ce qui change dans la version 4

- **Un nouveau mode : Corsaire.** La même chasse aux caisses que l'arcade, mais sur une grande carte du Japon, de Hokkaidō à Kyūshū, avec dix-sept ports à leur vraie place, contre des navires et des ports menés par l'ordinateur. (Il a été refait de fond en comble dans la deuxième mise à jour : voir plus haut, et plus bas.)
- **L'arcade ne garde que le mode classique.** La mer ouverte s'en va : c'est le mode Corsaire qui offre maintenant une vraie mer avec ses côtes.
- **Les grandes bêtes de la mer**, tirées du folklore, viennent de temps en temps prendre la place d'une partie des débris, en arcade comme en corsaire : la baleine d'Ebisu, le calmar géant, et Akkorokamui, la pieuvre rouge des récits aïnous (voir plus bas).
- **Les améliorations se voient sur les navires.** À chaque cran de canons, de nouvelles pièces sortent : les sabords s'ouvrent un à un sur les flancs, des pièces de chasse s'ajoutent à l'avant, des pièces de retraite à l'arrière, et les canons sont un peu plus gros pour se voir d'en haut. À chaque cran de voilure, on établit plus de toile : d'abord les huniers et la brigantine, puis les basses voiles, les perroquets, les cacatois, et pour finir les bonnettes, tendues au bout de leurs boute-hors ; la toile se gonfle un peu plus à chaque cran. La machine fume de plus en plus épais et de plus en plus souvent (pour le Kaiten, qui ne marche qu'à la vapeur, encore davantage). Dans le mode histoire, les navires gardent leur armement et leur voilure d'époque.
- Le générique de fin cite ses nouvelles sources : la carte de Natural Earth, et le folklore des grandes bêtes.
- Deux flèches qui montraient presque le même endroit au bord de l'écran se superposaient : il n'en reste qu'une, vers la caisse la plus proche.

## La troisième mise à jour de la version 3

- **Le récit en images.** Avant chaque étape, quelques cases de la bande dessinée, reprises sans leurs bulles, racontent ce qui y mène, comme une petite projection : l'image glisse lentement, une légende en trois langues l'accompagne, avec le tome d'où elle vient. ← → pour feuilleter, Entrée pour avancer, Échap pour passer. Il s'affiche tout seul la première fois qu'on ouvre une étape, puis reste à revoir depuis les ordres de mission (« Le récit en images »).
- **La suite en images.** Après la première victoire d'une étape, la suite de l'histoire en quelques cases, avant le bilan : à Miyako, l'étrave sur le flanc du Kōtetsu, les hommes qui sautent, Nicol touché, Kōga tué, Arai à la barre ; à Tanohata, l'échouage et l'explosion ; à Hakodate, le Chōyō qui saute... On ne la montre pas avant, pour ne rien gâcher. Le bilan permet de la revoir.
- **Le cyclone (étape 3) charrie enfin ses débris.** Sacs de charbon jetés du pont, tonneaux, espars arrachés, embarcations emportées arrivent sans cesse par l'avant, poussés par le vent, et de plus en plus serrés : on les brise au canon de chasse (Espace) sans quitter le secteur vert. Il y avait aussi un défaut : la mer de cette étape était un petit carré, et les débris restaient collés à ses bords sans jamais atteindre le navire.
- **Yamada (étape 4) : six barques** à renvoyer au lieu de quatre.
- **Miyako (étape 5) : une flotte impériale plus mordante.** Le Kōtetsu riposte plus vite ; quand l'abordage est bien engagé, l'alarme gagne la rade et le Kasuga ouvre le feu depuis son mouillage ; à la sortie, la poursuite part plus tôt, voit plus loin et tire plus souvent.
- **Le Kōtetsu refait.** Coque basse aux murailles franchement rentrées, éperon à fleur d'eau et étrave qui remonte en arrière ; casemate blindée en fer à cheval derrière l'étrave, avec le 300 livres Armstrong en chasse et ses trois sabords ; tourelle fixe ovale à l'arrière, avec les deux 70 livres en retraite ; plaques rivées ; passerelle volante d'un bord à l'autre ; cheminée noire rivée ; gréement de brick ramené à trois voiles par mât ; ancres à l'écubier, sans bossoir de bois.
- **Le générique de fin**, en trois langues, pour faire connaître la bande dessinée : il défile après l'épilogue du mode histoire (premier choix de l'écran d'épilogue) et à la fin de l'arcade, puis une dernière carte présente les cinq tomes avec leurs couvertures françaises (L'équipe, Collache, Hijikata, Arai, Les absents), les auteurs, Night Workers, et « En vente sur Amazon ». Entrée va droit à la dernière carte, Échap revient au menu. Le générique est aussi sur l'écran-titre, sous le nom « La bande dessinée ».
- Les ordres de mission rangent leurs choix sur une ligne (Appareiller, Le récit en images, Retour), pour tenir en 720 lignes.

## La deuxième mise à jour de la version 3

- **Le mode histoire revu en détail.** Chaque étape se joue maintenant en plusieurs temps. À chaque temps, une carte d'ordres s'affiche en bas de l'écran, la ligne d'objectif change, et des flèches et des cercles nommés montrent où aller (« bord à bord », « héler », « abordage », « la plage de Tanohata »...). Quand on se trompe, un conseil s'écrit sous l'objectif (« Trop vite pour charbonner : stoppez la machine », « Le vent est par le travers »...). Les ordres de mission donnent le déroulé de l'étape, temps par temps, et la pause rappelle les ordres en cours.
- **Plus d'étapes bouclées en trente secondes.** Les cartes de Yamada, Miyako, Tanohata, Otobe et Hakodate sont plus grandes, et les étapes courtes ont gagné des temps qui suivent l'histoire : à Miyako, la poursuite à la sortie de la baie ; à Tanohata, le Kaiten qui file sans répondre et le Kōtetsu qui met en joue ; à Hakodate, le combat jusqu'à la dernière munition puis l'échouage sous le fort de Benten. Même jouées au plus vite, elles durent d'une à deux minutes.
- **Yamada, rendue compréhensible.** On rejoint le Kaiten, on stoppe dans le cercle doré à son flanc, et le charbon passe tant qu'on y reste. Quand une barque quitte le village, une carte d'ordres le dit, une flèche rouge la montre et un cercle « héler » l'entoure : il suffit de passer près d'elle pour la renvoyer, puis on revient se ranger.
- **Les étapes se débloquent une à une** : chaque étape réussie ouvre la suivante.
- **Les navires de l'arcade se gagnent dans le mode histoire.** Au départ, seul le Chiyodagata est à vous. Le cyclone réussi donne le Takao, Miyako donne le Kaiten, la baie de Hakodate donne le Banryū. Les navires pas encore gagnés se voient dans la flotte, avec ce qui les débloque.
- **L'arcade a une fin** : dix niveaux. Les finir, en classique ou en mer ouverte, donne un cinquième navire, **le Kōtetsu**, l'ancien Stonewall, lent et lourd à la barre mais cuirassé. On peut ensuite continuer aussi loin qu'on veut.
- **Plus de drapeau japonais sur les navires**, sauf sur le Kōtetsu gagné en arcade, qui porte le Hinomaru. Restent les pavillons d'emprunt des ruses : américain sur le Kaiten, russe sur le Takao.
- **Classique et mer ouverte mieux expliqués** dans le menu de l'arcade (la mer ouverte a laissé la place au mode corsaire dans la version 4).
- **Un navire ne reste plus coincé** entre une épave et la côte (cela pouvait arriver près du Shinsoku, dans la taba-kaze) : la coque racle et finit par glisser vers le large.

## La première mise à jour de la version 3

- **Dix crans d'amélioration au lieu de cinq**, pour la voilure, la coque et les canons. Les cinq premiers gardent leur effet ; les cinq suivants, cerclés d'or dans l'interface, rapportent un peu moins chacun, pour que le navire continue de grandir sans devenir intouchable. Au-delà du cinquième cran : une voile de plus à établir (cran 6), une pièce de chasse de plus (cran 7), une pièce de plus par bordée (cran 8), deux pièces de retraite qui tirent par l'arrière (cran 9), et toujours un peu plus d'allure, de coque, de blindage et de cadence.
- **Le Kaiten ne marche plus à la voile**, et le jeu le respecte jusqu'au bout : chez lui, la caisse verte n'est plus « voilure » mais **« machine »**, avec son icône. Chaque cran pousse les feux : il gagne en allure et en barre, et ses deux cheminées fument plus épais à mesure. Un choc lui coûte « un cran de machine ». Sa brigantine reste serrée sur la corne, tenue par ses palans de garde et l'écoute de gui.
- **Les ombres des nuages** passent sur la mer, sur les côtes, les forêts et les navires, poussées par le vent.
- **Les reflets** : les coques, les mâts, les voiles et les côtes se reflètent dans l'eau, brouillés par les vagues. Ils se voient surtout dans les vues de côté des menus ; en jeu, vu d'en haut, ils restent discrets.
- **La profondeur de champ** dans les menus, comme à travers un objectif : le navire montré est net, le lointain et le tout proche s'adoucissent.

## Ce qui change dans la version 3

- **Le titre** est celui de la bande dessinée, dans les trois langues : *Les Dix de Hakodate*, *The Ten of Hakodate*, 箱館の十人.
- **Trois langues**, français, anglais et japonais, au choix sur l'écran-titre (← → sur la ligne « Langue ») ; le choix est gardé. Tout suit : menus, fiches des navires, ordres de mission, récits, interface en jeu, noms sur les cartes.
- **La musique**, composée pour le jeu : koto, shakuhachi, shamisen et taiko d'un côté, fifre, caisse claire, clairon et cordes de l'autre, les deux mondes qui se rencontrent. Un thème pour les menus, un pour les ordres de mission, un pour la mer, un pour le combat, et deux éclats pour la victoire et la défaite. Elle se coupe à part dans le menu ; M coupe tout.
- **Le mode histoire** passe de cinq à neuf étapes, réécrites d'après la charte historique et la bible de la bande dessinée (voir plus bas).
- **Le monde n'a plus de bord.** Au-delà de la carte, la brume monte ; si l'on insiste, on s'égare : la brume se referme, puis se lève, et l'on se retrouve à la lisière, le cap sur ce qu'on cherchait.
- **Chaque choc coûte une amélioration** : en plus de la coque, un cran de voilure, de coque ou de canons. La caisse passe par-dessus bord et dérive quelques secondes : on peut la rattraper avant qu'elle coule.
- **Le Kaiten** est refait d'après la gravure du *Tour du Monde* et la photographie d'avant 1868, dans son état de 1869 (voir plus bas).
- **Les flèches du choix du navire** vont enfin dans le bon sens : la flèche droite fait glisser la vue vers la droite, quelle que soit la route de la flotte.
- **Encore plus d'image** : fumée de charbon en volutes éclairées par le soleil, noire au sortir des cheminées puis grisaillant ; mer de tempête striée d'écume ; ronds de pluie sur l'eau ; éclairs qui illuminent la scène ; bastingages à hamacs, ancres aux bossoirs.

---

## Trois façons de jouer

**Mode histoire.** Neuf étapes sur les vraies côtes, chacune avec ses ordres de mission avant le départ (et le déroulé, temps par temps), une citation d'Eugène Collache quand il y était, et, à la fin, « ce qui s'est passé ». Chaque étape réussie ouvre la suivante ; certaines donnent un navire de plus pour l'arcade.

**Mode corsaire.** Les navires de l'époque, mis en scène : une coque de noix, de l'or à piller, un chantier où l'on construit son navire pièce par pièce, bientôt une flotte, et tout le Japon à prendre, trente ports, sur une grande carte (voir plus bas).

**Mode arcade.** Une cargaison s'est perdue au milieu des débris : il faut repêcher toutes les caisses du niveau pour passer au suivant, sans que la coque tombe à zéro. À chaque niveau, il y a plus de débris, ils dérivent plus vite, et les brûlots arrivent plus souvent ; à partir du quatrième, des tourbillons (pris dans le sens du courant, ils lancent le navire ; à contre-courant, ils l'aspirent vers leur œil, qui ronge la coque). Les charpentiers réparent un peu la coque entre deux niveaux. Dix niveaux pour finir l'arcade ; on peut ensuite continuer. Le navire reste toujours au centre de l'écran, et c'est la mer qui défile autour de lui. Pas de terre ni de carte : un champ de débris fermé, d'à peu près trois écrans, qui se referme sur lui-même (ce qui sort d'un côté revient de l'autre). Tout se joue d'un coup d'œil.

Les navires de l'arcade se gagnent : le Chiyodagata au départ, le Takao, le Kaiten et le Banryū dans le mode histoire (étapes 3, 5 et 9), le Kōtetsu en finissant l'arcade (dix niveaux) ou en prenant huit ports en corsaire. En corsaire, on ne choisit pas son navire : on le construit.

Un navire n'est pas une moto : sans amélioration, il ne file qu'à la moitié de sa vitesse de fiche, il lui faut quelques secondes pour prendre son erre, et il vire posément, mieux quand il a de la vitesse. Chaque caisse de voilure lui rend de l'allure, de la reprise et de la barre (pour le Kaiten, c'est une caisse de machine). Chaque sorte de caisse monte jusqu'à dix crans.

**La gîte (corsaire seulement).** Un voilier se couche dans les virages, d'autant plus qu'il va vite et que la barre est franche. Une jauge s'allume alors sous le navire : verte, orange, puis rouge ; au rouge, la coque craque et « lâchez la barre ! » s'écrit dessous. La gîte se prend en une seconde et demie environ ; couché à fond, le navire a encore un instant pour se relever (la jauge tremble) : si l'on tient le virage au-delà, il chavire. Avec la coque de noix à pleine allure, un demi-tour brutal fait rougir la jauge, et l'on s'en tire en lâchant la barre au bout (« Rattrapé de justesse ! ») ; un tour complet la couche. Aux trois quarts de l'allure, on vire sans risque. À partir du brick, on peut de nouveau virer court à pleine allure. Chaque paire de roues à aubes rend la barre plus vive et le navire plus stable.

## Le mode corsaire : les navires de l'époque, mis en scène

Dans les années 1860, la marine change d'âge : la vapeur s'ajoute à la voile, l'hélice remplace les roues à aubes, le fer couvre le bois. Le mode corsaire met ces navires en scène. On part de **Hakodate** sur une **coque de noix**, avec soixante pièces d'or, et le chantier s'ouvre aussitôt. Pas de niveaux : la mer devient plus dure à mesure que votre navire et votre domaine grandissent.

- **L'or.** Des coffres flottent çà et là (des flèches dorées montrent les plus proches) ; un débris brisé en lâche parfois un petit ; un navire coulé laisse remonter son or en coffres ; un navire pris à l'abordage en donne deux fois plus, d'un coup ; un port pris livre ses magasins ; vos ports versent un tribut, qu'on touche en y relâchant. Les navires de l'ordinateur repêchent eux aussi les coffres : on retrouve cet or dans leur cale.
- **Le chantier.** Dans le cercle vert d'un port à vous, Entrée ouvre le chantier. Il a cinq ateliers (← → pour passer de l'un à l'autre) ; ↑ ↓ pour choisir une pièce, Entrée pour l'acheter : le navire change sous vos yeux, et chaque cran coûte plus cher que le précédent (et tout coûte plus cher au moyen et au difficile). **Coque et voilure** : la **coque** (coque de noix, cotre, goélette, brick, corvette, frégate) décide combien de mâts, de canons et de roues on peut porter ; les **mâts**, les **voiles** (dix crans : une voile de plus à chaque cran, jusqu'à couvrir le navire de toile, comme un clipper), le **doublage de cuivre**, le **gouvernail**. **Artillerie** : les **canons en bordée**, les **pièces et obus** (des pièces lisses aux canons rayés Armstrong), les **canonniers**, les **pièces de chasse et de retraite**, la **mitrailleuse Gatling** (elle tire seule sur ce qui approche). **Machine** : la **chaudière** (avec ses cheminées), la **machine**, les **roues à aubes** (jusqu'à trois paires), l'**hélice**. **Défense** : la **cuirasse** (huit crans, jusqu'au caisson blindé, à la tourelle et au-delà), l'**éperon**, les **pompes et charpentiers** (la coque se refait en mer, jusqu'aux trois quarts). **Équipage** : les **abordeurs**, les **chaloupes**, les **cales et vivres**, la **vigie et longue-vue**. La **peinture** est gratuite (← →). Sous la liste, « **Prendre la mer** » quitte le chantier. La vue suit la pièce choisie : toute la toile pour les mâts, les voiles et la vigie, la coque de près pour le reste ; et le navire change de forme à chaque cran (voir la sixième mise à jour). À droite s'affichent les qualités du navire : vitesse, barre, tenue à la gîte, coque, canons, cuirasse, autonomie. Au chantier, on répare tout, on refait le plein de vivres et de charbon, on touche le tribut, et la traversée est enregistrée. Celui qui veut aller vite peut s'offrir toute la toile d'un clipper et trois paires de roues ; celui qui veut cogner, une cuirasse et un éperon. Sous la liste, un **cartel « À l'époque »** dit ce qu'était la pièce choisie (pour la coque, celle qu'on achèterait), avec un navire ou un fait de l'époque.
- **Trois façons de vaincre un navire.** Au **canon**, comme partout. À l'**éperon** : foncez droit sur lui et, juste avant le choc, deux appuis sur ↑ coup sur coup, le coup de boutoir (sans lui, on ne fait que heurter) ; le choc grandit comme le carré de la vitesse (jusqu'à une bonne allure) et avec le poids de votre navire contre le sien (dans une certaine mesure), et la cuirasse et l'éperon le renforcent tout en épargnant votre étrave ; un navire trop solide pour couler reste planté sur l'éperon, et on l'aborde (↓ pour se dégager) ; l'éperon brise aussi les débris de face. À l'**abordage** : bord à bord, une réglette paraît au-dessus du navire, et l'on frappe Entrée quand le curseur passe dans l'or ; chaque coup juste fait avancer la jauge, un coup raté la recule (plus l'ennemi est fort par rapport à vous, plus c'est serré ; vos abordeurs, une grande coque et un ennemi déjà touché aident). Le navire est alors à vous, avec son or, ses vivres et son charbon ; un équipage de prise le ramène au port. Pendant l'abordage, Espace tire toujours, et sa mousqueterie vous coûte de la coque.
- **La côte et les forts.** Au ralenti, les toucher abîme la coque et stoppe la machine ; à bonne allure, droit dessus, le navire s'échoue et il est perdu. La vigie crie « Terre devant ! » quand on y court trop vite pour s'arrêter.
- **L'autonomie.** Une jauge ambrée, dans la plaque du navire, dit combien de minutes il reste avant de devoir rentrer au port. Les vivres s'épuisent avec le temps passé en mer, et une machine y ajoute son charbon, d'autant plus vite qu'on la pousse. À vide, le navire n'avance plus qu'au tiers de sa vitesse. On refait le plein dans ses ports ; un navire pris à l'abordage regarnit la cambuse, et les coffres d'une épave aussi, un peu. Une plus grande coque emporte un peu plus de vivres, les cales bien davantage ; au moyen et au difficile, tout s'épuise plus vite.
- **Les ports.** Trente ports, d'Akkeshi à Kagoshima, ont leur batterie. Tirez dessus (passez-la par le travers : toute la bordée part sur elle), et l'alarme appelle les navires armés des environs, et le port appelle à l'aide : une escadre de secours part du port ennemi voisin, une seconde quand la batterie tombe. Les grandes villes et dix autres ports ont aussi un ou deux forts avancés sur leurs pointes, qui tirent de leur côté ; on les fait taire, ou on encaisse. Les batteries et les forts se réparent, lentement, si on les laisse ; un fort réduit au silence le reste, tant que la ville n'a pas relevé sa batterie. Réduite au silence, la batterie lâche quelques coffres, et le port se prend : approchez de la plage devant la ville (le cercle doré) et stoppez ; les chaloupes débarquent les hommes (une jauge se remplit, une quinzaine de secondes, plus pour une grande ville, et rien ne se fait tant qu'un navire ennemi armé est à portée de la plage). Il devient un port à vous : chantier, réparations, vivres et charbon, tribut. Mais l'ennemi envoie des escadres reprendre les ports mal défendus (une flèche rouge montre le port assiégé) : au chantier de chaque port, on le fortifie (trois niveaux de batteries, qui tirent sur les navires ennemis). Une batterie solide tient seule ; un port sans défense tombe en trente secondes, et il faut le reprendre. L'escadre de siège va droit à son port : elle ne vous prend en chasse que si vous venez sur elle ou si vous tirez sur l'un des siens. Hakodate, avec le Goryōkaku et le fort de Benten, ne tombe pas. Trente ports pris, et le Japon est à vous (on peut continuer ensuite).
- **La flotte.** Cinq grandes villes ont un arsenal (Edo par Shinagawa, Ōsaka par Hyōgo, Kanazawa, Hiroshima, Kagoshima) : une fois la ville prise, son chantier propose d'armer un navire de plus, un cotre avec une pièce par bord (de plus en plus cher : le premier coûte 450 pièces d'or en facile, 600 au moyen, 840 au difficile). Chacun a son nom, la Mouette, le Cormoran, l'Albatros, le Goéland, le Pétrel, et le même chantier que le vôtre. Ils vous suivent en ligne de file, chacun dans le sillage du précédent ; celui qui traîne trop loin, hors de vue, rallie la ligne. Ils tirent leur bordée sur l'ennemi par le travers et sur les batteries, leurs pièces de chasse sur celui qui est devant, leur mitrailleuse sur ce qui approche ; ils ramassent les coffres qu'ils croisent, et se réparent dans vos ports. L'ennemi les prend pour cibles, eux aussi ; celui qui a perdu les trois quarts de sa coque quitte la ligne et se replie sur le port à vous le plus proche (on ne le poursuit plus), puis, réparé, rallie la flotte en queue de ligne. Au chantier, ← → sur la ligne « Navire » change le navire montré et amélioré ; on peut passer à son bord (c'est lui que vous menez, et les autres le suivent), et lui donner sa consigne : suivre la flotte, ou rester à quai, où il tire sur les navires ennemis qui approchent et aide la batterie pendant un siège (si le port tombe, il se replie sur le port à vous le plus proche). Si le navire que vous menez coule, vous passez à bord d'un autre de la flotte : la traversée ne s'arrête qu'avec le dernier navire.
- **Les navires de l'ordinateur.** Le Hiryū et le Mōshun au début, puis le Kasuga, le Chōyō et enfin le Kōtetsu à mesure que la menace monte, font route d'un port ennemi à l'autre et gagnent des crans avec le temps : leur nom et leur total de crans s'écrivent au-dessus d'eux. Tant que votre navire ne menace personne, ils vous laissent passer (une coque de noix ne vaut pas un boulet) ; attaquez-les, ou armez-vous, et ils vous prennent en chasse à vue, en forçant l'allure pour ne pas se laisser distancer. Le transport Hiryū, désarmé, s'enfuit. La première fois qu'un type de navire paraît dans la traversée, il se présente sous l'objectif : « En vue : le Kasuga, corvette à roues ». Plus vous dépensez au chantier, plus vous prenez de ports et plus votre flotte grandit, plus ils sont nombreux (jusqu'à vingt-six en mer à la fois), mieux armés, et plus les batteries ennemies sont solides. À partir de trois ports pris, ils viennent de plus en plus souvent en escadre : un chef de file et deux ou trois navires dans son sillage.
- **Couler n'est pas tout perdre.** Tant qu'il reste un navire à la flotte, on passe à son bord. Le dernier coulé, on reprend au dernier port enregistré (le dernier chantier quitté, ou le dernier port pris), avec l'or et les navires de ce moment-là. « Nouvelle traversée » repart de la coque de noix.
- **Trois difficultés.** Au menu du corsaire, la ligne « Difficulté » se règle avec ← → : facile (pour apprendre, le plus généreux), moyen ou difficile (voir les mises à jour de la version 5 ; au moyen et au difficile, une batterie tient au moins 9 et 12 bordées, si bien armé que soit votre navire ; le chantier coûte 1,5, 2 ou 2,8 fois son prix de base). Elle vaut pour la traversée qu'on commence ; celle qui est en cours garde la sienne. Chaque difficulté a son record.
- **La mini-carte** montre les ports (vert : à vous ; or : à prendre ; rouge : en alarme, ou assiégé s'il clignote ; un cercle d'or autour des villes à arsenal), votre flotte (petits triangles verts), les navires de l'ordinateur (rouges quand ils chassent, orange quand ils assiègent, verts les prises) et les coffres.

## Les grandes bêtes de la mer

De temps en temps, en arcade (à partir du deuxième niveau) et en corsaire, une grande bête de la mer croise la route, et le champ compte alors un peu moins de débris.

- **La baleine.** Elle souffle, fait route sans hâte, sonde en levant la queue, et parfois saute hors de l'eau près du navire. Les pêcheurs du Japon y voyaient Ebisu, le dieu qui pousse le poisson vers les côtes : on ne la chasse pas (tirée, elle sonde, effrayée), mais la croiser de près porte bonheur, et un saut aussi. La heurter coûte de la coque.
- **Le calmar géant** (en arcade à partir du troisième niveau, en corsaire du deuxième) **vous traque.** On le voit venir sous l'eau : une ombre, l'arête de son manteau qui fend la surface, un sillage en V ; hors de l'écran, une flèche rouge montre où il est. Il nage un peu moins vite que le navire à toute vapeur : tant qu'on garde de l'erre et qu'on le laisse sur l'arrière, il ne rattrape pas ; dès qu'on ralentit ou qu'on vire pour une caisse, il regagne du terrain. Quand il est assez près, il se ramasse (des bulles crèvent la surface, « il va bondir : virez ! »), puis bondit droit sur le navire : en virant à ce moment-là, on le laisse passer (« esquivé ! »). Quelques boulets le font aussi renoncer : la bordée part d'elle-même s'il passe par le travers, et les pièces de retraite le touchent quand il suit dans le sillage. S'il saisit le navire, le choc fait passer une caisse par-dessus bord (en corsaire, un coffre d'or), il ralentit le navire et ronge la coque : feu à bout portant (Espace) pour lui faire lâcher prise. Au bout d'une vingtaine de secondes sans vous prendre, il renonce et replonge ; mais il revient, tant qu'on ne l'a pas vaincu (il faut plusieurs combats). En corsaire, il ne monte pas dans les petits fonds : longer la côte le fait renoncer, comme l'abri de Hakodate.
- **Akkorokamui**, la pieuvre rouge géante de la baie d'Uchiura dans les récits aïnous, si grande que la mer et le ciel rougissent autour d'elle. En corsaire, elle hante la baie d'Uchiura, au nord de Hakodate (cercle rouge pointillé sur la mini-carte) ; en arcade, elle paraît à partir du sixième niveau. Ses bras s'abattent sur le pont et retiennent le navire. Vaincue, elle laisse deux prises (en corsaire, de l'or, comme le calmar) ; sinon, elle finit par replonger.

## Commandes

Tout se joue au clavier, sans souris. La vue reste centrée sur le navire : à l'arrêt, on le voit d'un peu plus près, et plus il va vite, plus la caméra monte.

| Touche | Effet |
| --- | --- |
| ↑ | Machine en avant. La manette reste où on la laisse : le navire continue sur son erre. En corsaire, deux appuis coup sur coup : le coup de boutoir, pour éperonner. |
| ↓ | Ralentir, stopper, puis battre en arrière. En corsaire, dégage aussi le navire planté sur l'éperon. |
| ← → | La barre. Le navire vire mieux quand il a de l'erre. Embossé (le Kaiten en batterie), il pivote lentement sur ses amarres. |
| Espace | Feu. Les pièces de chasse tirent devant ; si un ennemi est par le travers, toute la bordée part de ce côté. |
| Entrée | En corsaire : dans un port à vous, le chantier (une invite s'affiche au-dessus du navire) ; à l'abordage, frapper la mesure, quand le curseur passe dans l'or. |
| P ou Échap | Pause (avec le rappel des ordres en cours, en mode histoire). |
| M | Couper ou rétablir tout le son. |

ZQSD et WASD fonctionnent aussi. Dans les menus : flèches pour choisir, Entrée pour valider, Échap pour revenir.

## Le mode histoire

Les dates sont grégoriennes, comme le veut la charte de la bande dessinée ; la date lunaire de l'ère Meiji est donnée à côté. Aucune parole n'est prêtée à Brunet, et rien n'est tenu pour vrai sur la seule foi de celui qui parle de lui-même.

1. **Le naufrage du Kaiyō Maru** (29 décembre 1868, rade d'Esashi). Repêcher dix caisses de la cargaison du vaisseau amiral échoué, dans la neige, avant qu'elles ne se brisent sur les roches ; l'épave se disloque et en lâche d'autres.
2. **La taba-kaze** (quelques jours plus tard). Le vent du large revient, jette le Shinsoku à la côte et pousse tout vers la terre.
3. **Le cyclone** (nuit du 3 au 4 mai 1869, au large de la côte de Nambu). Le Takao, avec l'aspirant Collache à bord, dans la queue d'un cyclone : le vent fait le tour du compas, il faut tenir la cape, l'étrave dans le secteur vert face au vent, sans pousser la machine. Les débris arrivent par l'avant : on les brise au canon de chasse. *Donne le Takao pour l'arcade.*
4. **Faux pavillons à Yamada** (5 mai 1869, baie de Yamada). Le Kaiten sous pavillon américain, le Takao sous pavillon russe (le pavillon de Saint-André). Avec le Takao : rejoindre le Kaiten, stopper dans le cercle à son flanc pour prendre le charbon et réparer la machine, et aller héler les six barques du village dès qu'elles s'en détachent. Trois barques au Kaiten, et la ruse est éventée.
5. **Miyako : l'abordage** (6 mai 1869). Le Kaiten entre dans la baie sous pavillon américain sans tirer ; tout près du Kōtetsu, la bannière étoilée descend, l'étrave monte sur le flanc du cuirassé, et il faut tenir le contact pendant l'abordage, qui échoue comme en 1869 (Nicol touché, Kōga tué). Arai prend la barre, et l'on s'échappe vers le nord, poursuivi par la flotte impériale qui a poussé les feux. *Donne le Kaiten pour l'arcade.*
6. **L'échouage du Takao** (6 mai 1869, côte de Tanohata). La machine ne donne plus que trois nœuds. On fait route vers Miyako ; le Kaiten ressort de la baie et file au nord sans répondre aux signaux ; l'escadre impériale appareille. Il faut virer de bord et gagner la plage de Tanohata en faisant une embardée chaque fois que le Kōtetsu met en joue (une ligne rouge le montre), puis tenir le temps que l'équipage encloue les canons, brise la machine et mette le feu au navire.
7. **Débarquement à Otobe** (vers le 20 mai 1869). Recueillir les cinq chaloupes le long de la côte, la dernière sous les canons d'Otobe, malgré les canonnières ; chaque chaloupe en remorque ralentit le navire.
8. **Le Kaiten en batterie** (16 juin 1869, baie de Hakodate). Échoué près du fort de Benten, le Kaiten ne bouge plus : il pivote sur ses amarres et tient jusqu'au soir, soutenu par la soupe sucrée aux haricots d'Arai. Les navires impériaux trop touchés se retirent, désemparés : ce jour-là, aucun ne coula.
9. **Baie de Hakodate** (20 juin 1869). Le Banryū seul contre la flotte : entamer le Chōyō jusqu'à ce qu'un obus trouve sa soute, combattre ensuite toute l'escadre tant qu'il reste des munitions (elles se comptent), puis échouer le Banryū sur le haut-fond sous le fort de Benten. *Donne le Banryū pour l'arcade.*

Puis un **épilogue** : la reddition de Goryōkaku le 27 juin, le départ des Français sur le Coëtlogon le 10 juin, Collache retrouvant ses compagnons à Yokohama, et les dix noms.

## Les navires

Ils sont modelés à la même échelle : le Kaiten (70 m) est plus de deux fois plus long que le Chiyodagata (30 m). Chacun a sa coque peinte, son pont, ses roues à aubes ou son hélice, ses cheminées, ses canons dans de vrais sabords, ses embarcations, sa mâture, son gréement et son équipage. Les voiles sont établies quand on fait route et serrées à l'arrêt.

**Les pavillons.** Les navires ne portent pas de pavillon, sauf les pavillons d'emprunt des ruses de mai 1869 (américain sur le Kaiten, russe sur le Takao) et le Kōtetsu gagné en arcade, qui porte le Hinomaru. Pour mémoire : selon les sources japonaises, le Kaiten amena le pavillon américain à Miyako et hissa le Hinomaru avant d'aborder ; le jeu montre seulement la bannière étoilée qui descend.

Le **Kaiten** est refait d'après la gravure du *Tour du Monde* et la photographie d'avant 1868 : roues un peu en avant du milieu, avec leur tambour en éventail doré ; **deux cheminées** de part et d'autre des tambours ; batterie de cinq sabords par bord, trois en arrière des roues et deux en avant, le 50 livres sur pivot à l'avant ; embarcations aux bossoirs de l'arrière ; bastingages à hamacs ; long beaupré.

**Ses mâts en 1869.** La planche « Les trois navires » de la bande dessinée et la notice japonaise du Kaiten (回天丸) disent la même chose : le typhon qui suivit la sortie de Shinagawa lui cassa le **mât de misaine et le grand mât** ; on lui planta **un mât court à l'avant**, et il cessa de naviguer à la voile (« 前部に短いマストを立てたのみで、帆を用いることはしなくなった »). Il est donc montré avec son artimon intact (la brigantine serrée contre la corne), le tronçon brisé du grand mât, et à l'avant un mât de fortune jumelé au tronçon de l'ancienne misaine, avec une vergue courte pour les signaux. Les témoins disaient qu'il ressemblait à un monitor cuirassé. Comme il ne portait plus de voile, ses voiles ne s'établissent jamais, et sa caisse d'amélioration verte est celle de la machine.

Une remarque sur la planche : elle date le typhon d'« août 1868 », qui est le mois lunaire. En grégorien, la flotte quitta Shinagawa le 4 octobre 1868 et le typhon la dispersa quelques jours plus tard.

Le **Kōtetsu** de l'arcade est l'ancien Stonewall, construit à Bordeaux pour les Confédérés, acheté par le shogunat et livré au nouveau gouvernement en 1869 : le cuirassé que le Kaiten tenta d'aborder à Miyako. Il est modelé d'après sa silhouette connue : coque basse à éperon et murailles rentrées, casemate blindée à l'avant (le 300 livres Armstrong), tourelle fixe à l'arrière (les deux 70 livres), une cheminée entre deux mâts gréés en brick. Les plaques, la passerelle et les petits détails sont dessinés pour le jeu.

## Ce qui est exact, et ce qui ne l'est pas

**Exact**

- Les côtes : Esashi, Kamome-jima (redevenue une île, sans les digues modernes), Otobe, Miyako, Yamada, la baie de Hakodate, d'après le trait de côte du *Kokudo Sūchi Jōhō* (MLIT, limites communales N03). Pour Tanohata, la version simplifiée de ces mêmes limites, plus grossière. Le relief est imaginé à partir du trait de côte.
- Le déroulé de mai 1869 : départ de Hakodate le 2 mai, cyclone, ralliement le 5 dans la baie de Yamada sous pavillons américain et russe, charbon pris bord à bord, nanushi tenu au large, panne du Takao, attaque du 6 mai, Takao rattrapé par le Kōtetsu et le Kasuga, équipage débarqué près de Tanohata (commandant Furukawa Setsuzō) après avoir brûlé le navire, d'après le récit de Collache (1874) et les sources japonaises.
- À Miyako : le plan proposé par Nicol, mis au point par Arai et Kōga, approuvé par Brunet et Enomoto ; le pont du Kaiten trois mètres au-dessus de celui du Kōtetsu ; Kōga tué, Nicol touché de deux balles ; Arai prenant la barre ; la flotte impériale lancée aussitôt à la poursuite. La Gatling est donnée pour ce qu'elle est : contestée.
- Les cartels « À l'époque » du chantier du mode corsaire : le Kaiyō Maru, vaisseau amiral d'Enomoto, construit à Dordrecht (Pays-Bas) et perdu devant Esashi le 28 décembre 1868 ; la Gloire, lancée en 1859, premier cuirassé de haute mer ; le duel du Monitor et du Virginia à Hampton Roads, le 9 mars 1862 ; le Re d'Italia coulé à l'éperon par l'Erzherzog Ferdinand Max à Lissa, le 20 juillet 1866 ; le Great Eastern, lancé en 1858, ses six mâts, ses roues et son hélice ; la mitrailleuse Gatling, brevetée le 4 novembre 1862 (à Miyako, contestée, comme dans le mode histoire) ; le fort de Benten, achevé en 1863 à l'entrée du port de Hakodate ; le Kōtetsu, premier cuirassé de la marine japonaise, conçu comme bélier cuirassé, gréé en brick, avec son Armstrong de 300 livres ; le Banryū, ancien yacht Emperor offert au shogun en 1858 ; le Kaiten, ancienne corvette prussienne Danzig, et le Kasuga, à roues.
- La carte du Japon du mode corsaire : le trait de côte de Natural Earth (domaine public), en projection conique conforme, avec les îles de plus de 4 km², et les ports à leur place (pour Akita, son port de Tsuchizaki ; pour Nagoya, trop au fond de la baie d'Ise pour le jeu, aucun port).
- Les nouveaux cartels de la quatrième mise à jour : le chantier d'Ishikawajima, ouvert à Edo en 1853 ; la fonderie de Nagasaki, bâtie avec des ingénieurs hollandais et achevée en 1861 ; l'arsenal de Yokosuka, construit par le shogunat avec l'ingénieur français Léonce Verny ; la flotte d'Enomoto quittant Shinagawa début octobre 1868 ; le Kaiten, à Hakodate en juin 1869 : trop atteint pour manœuvrer, il fut échoué sur un haut-fond et se battit encore en batterie flottante, avec le fort de Benten.
- Les cartels de la cinquième mise à jour : la frégate Alarm, premier navire de la Royal Navy doublé de cuivre en entier (1761), et le laiton de George Muntz (brevet de 1832) ; la roue de gouvernail, officiellement adoptée par la marine française en 1709, et l'appareil à gouverner à vapeur de John McFarlane Gray (brevet de 1866) ; le canon à obus de Paixhans, éprouvé en 1824 contre le vaisseau Pacificateur, et Sinope, le 30 novembre 1853 ; l'école de canonnage de la Royal Navy à bord de l'Excellent, à Portsmouth, en juin 1830 ; la machine compound de Randolph et Elder (brevet de 1853), sur le Brandon en 1854 ; le Rattler à hélice tirant à reculons l'Alecto à roues, le 3 avril 1845, et le Napoléon de Dupuy de Lôme, lancé en 1850 ; la pompe à chaîne de William Cole et du capitaine John Bentinck (brevet de 1771) ; le débarquement de Shimonoseki, le 20 juillet 1863 (la Sémiramis et le Tancrède de Benjamin Jaurès, 250 hommes), et l'assaut allié des 5 et 6 septembre 1864 ; les 12 000 francs versés en 1810 à Nicolas Appert pour publier son procédé de conserves, et le jus de citron de la Royal Navy contre le scorbut dès 1795 ; la lentille achromatique de John Dollond (brevet de 1758) et le nid-de-pie de William Scoresby père, mentionné dès 1807.
- Les voiles du corsaire et leur place sur les mâts, des basses voiles aux contre-cacatois, avec les voiles d'étai entre les mâts et les bonnettes, au mât de misaine et au grand mât (on n'en établissait pas à l'artimon) ; la goélette à hunier, dont le hunier carré remplace la flèche du mât de misaine, et sa fortune carrée ; le brick-goélette ; les cotres de guerre et de la douane du XVIIIe siècle, avec leur basse voile, leur hunier et leur perroquet carrés, et leurs bonnettes. Le clipper Lightning portait en 1854, au grand mât, une voile au-dessus du contre-cacatois, petite, de peu d'utilité, et que les matelots détestaient ; le Champion of the Seas, qui fila 465 milles d'un midi à l'autre les 10 et 11 décembre 1854, record d'une journée à la voile jusqu'en 1984, ne portait rien au-dessus de ses cacatois.
- Les châteaux du corsaire : seules les six villes dont le château avait encore son donjon en 1868 en montrent un. Matsumae (le château de Fukuyama, achevé en 1854, brûlé en 1949), Hiroshima (détruit en 1945 ; le bas de ses murs était bardé de planches noires), Hagi (démoli après l'ordre de 1874), Wakayama (rebâti en 1850, détruit en 1945), Kōchi et Uwajima (toujours debout). Kanazawa n'avait plus le sien depuis l'incendie de 1602, Kagoshima n'en eut jamais.
- Le fort de Benten : un hexagone de pierre irrégulier, allongé comme une pièce de shōgi, armé de quinze grosses pièces, achevé en 1863 à la pointe du cap de Benten et démoli en 1896.
- En Ezo, on ne cultivait guère le riz en 1868 : les villages y ont des champs secs.
- Le gouvernement d'Ezo est appelé ainsi : le mot « république » n'apparaît dans aucun document d'Enomoto et des siens.
- Le Kaiten échoué volontairement près du fort de Benten le 16 juin 1869. Le 20 juin, le Chōyō coulé en deux minutes par un obus du Banryū dans sa soute ; le Banryū se battant ensuite jusqu'à épuisement de ses munitions, puis échoué sur un haut-fond sous le fort de Benten, son équipage brisant la machine et rejoignant le fort (son capitaine, Matsuoka Bankichi, avait interdit qu'on y mît le feu). Sur la fin du Kaiten le 20 juin, le jeu dit que la bande dessinée suit le récit où Arai y mit le feu, et qu'une source japonaise l'attribue aux Impériaux.

**Arrangé pour le jeu**

- La côte est réduite et les navires gardent leur taille, comme dans les jeux de marine d'autrefois.
- Les vitesses, la tenue de la coque, la cadence de tir, la durée des étapes sont celles d'un jeu d'arcade.
- Les barques du village de Yamada qu'on va héler, la soupe qui répare la coque, les chaloupes d'Otobe, la haute mer du cyclone, le Kōtetsu qui met en joue le Takao et l'embardée qui fait passer son boulet à côté, et les munitions comptées du Banryū sont des inventions de jeu autour de faits attestés.
- Dans les étapes, aucun navire impérial ne coule, sauf le Chōyō : trop touchés, ils se retirent.
- L'archipel du fond des menus est inventé.
- Les villages et les villes sont bâtis sur un même modèle, selon leur rivage : leurs rues, leurs temples, la place de leur château ne sont pas ceux de la vraie ville. Les forts des ports sont tous de deux modèles (la lunette et le petit fort avancé), à la manière des daiba de l'époque ; seul le fort de Benten a sa forme, et sa place, au corsaire comme dans l'histoire (près du haut-fond du Banryū), est celle que le jeu lui donne, pas celle d'un plan.
- Le mode corsaire est une mise en scène : le corsaire, son chantier, ses mélanges de pièces, sa flotte et ses noms, les arsenaux donnés aux cinq grandes villes, les forts avancés et les escadres de secours, et la conquête du Japon sont inventés. Les types de navires et les pièces du chantier sont ceux de l'époque, et ce qu'en disent les cartels est exact (voir plus haut). La carte et l'emplacement des ports sont vrais. Les navires y sont bien plus grands que la carte ne le voudrait (sinon on ne les verrait pas), et les petites îles sont omises.
- L'ordre dans lequel on achète les voiles est celui du jeu : à bord, on établissait toute la voilure ordinaire avant les bonnettes et les voiles les plus hautes, réservées au beau temps. Un cotre qui porte un cacatois est une liberté du jeu.
- La gîte dans les virages est réelle ; le chavirage d'un petit voilier qui tient un virage serré à pleine allure est exagéré pour le jeu.
- Les grandes bêtes viennent du folklore : Ebisu et la baleine dans les croyances des pêcheurs, Akkorokamui dans les récits aïnous de la baie d'Uchiura. Leur taille est celle des légendes.

## L'image

Définition jusqu'au double de l'écran, ombres très fines qui suivent la vue, occlusion ambiante, halos lumineux. La mer a ses rides qui accrochent le soleil, l'écume au ras des coques, un sillage en chevrons, des moutons et des traînées d'écume par gros temps, des ronds de pluie, et près des côtes un fond de sable où dansent les caustiques ; les vagues déferlent sur les plages. La fumée de charbon roule en volutes éclairées par le soleil. Les ombres des nuages glissent sur la mer, les terres et les navires. Les coques, les mâts et les côtes se reflètent dans l'eau. Dans les menus, la mise au point se fait sur le navire montré. Des goélands tournent au-dessus des navires.

Si l'ordinateur peine, le jeu allège tout seul son image, par paliers (les reflets partent les premiers) : il en juge en deux secondes et demie. Sur un portable, branchez le secteur : les navigateurs brident souvent la carte graphique sur batterie.

## Le récit en images

Les images viennent des planches de lettrage de la bande dessinée (tomes 1 à 4), où les bulles sont posées à part : on y retrouve donc les cases sans texte. Elles sont dans `img/recit/`. Les légendes du jeu ne reprennent pas les textes des bulles ; elles suivent la même charte que le reste du jeu (dates grégoriennes, aucune parole inventée pour Brunet). Une seule image ne vient pas des dessins de la BD : la gravure du *Tour du Monde* (1874) reprise dans le tome 2, signalée comme telle.

## Fichiers

- `index.html`, `css/style.css`
- `js/lib/three.min.js` : Three.js (licence MIT, voir `three-LICENSE.txt`)
- `js/core.js` : outils communs et clavier
- `js/lang.js` : les trois langues
- `js/music-data.js` : la musique (Ogg Opus, encodée dans le fichier pour marcher hors ligne)
- `js/audio.js` : sons synthétisés et lecteur de musique
- `js/data.js` : navires, objets de l'arcade, difficulté, déblocages
- `js/stages.js` : les neuf étapes, leurs temps et leurs ordres, et l'épilogue, en trois langues
- `js/recit.js` : le récit en images (quelles cases, dans quel ordre, leurs légendes) et sa projection
- `img/recit/` : les cases de la bande dessinée, sans bulles
- `js/credits.js` : le générique de fin et la carte des cinq tomes
- `img/couv/` : les couvertures françaises des cinq tomes
- `img/nicol.webp` : De Nicol en pied, d'après son personnage dans la bande dessinée, pour l'écran-titre
- `js/maps.js` : les côtes du mode histoire, en mètres
- `js/japan.js` : la carte du Japon du mode corsaire (d'après Natural Earth), ses trente et un ports et la baie d'Uchiura
- `js/entities.js` : le moteur commun (navire, tir, effets)
- `js/models.js`, `js/debris.js` : brûlots, caisses, chaloupes, épaves, débris
- `js/ships3d.js` : les navires en 3D
- `js/render3d.js` : la mer, la lumière, l'écume, la fumée, les particules, le post-traitement
- `js/terrain.js` : le relief, les falaises, les forêts
- `js/villages.js` : les villages, les bourgs et les villes de la côte (rues, maisons, temples, sanctuaires, grèves, rizières), les châteaux, et les forts
- `js/world.js` : collisions, ennemis, tir, objets, brume du bord du monde, caméra
- `js/arcade.js`, `js/story.js` : l'arcade et le mode histoire ; dans `story.js`, les règles de chaque étape
- `js/corsaire.js` : le mode corsaire (or et coffres, éperon et abordage, autonomie, navires de l'ordinateur et leurs routes, batteries, prise des ports, sièges, traversée enregistrée)
- `js/shipyard.js` : le chantier du corsaire (les pièces, leurs prix, les qualités du navire, l'écran du chantier)
- `js/fleet.js` : la flotte du corsaire (les arsenaux, les navires qui suivent en ligne de file, leur tir, ceux qui restent à quai ou vont se faire réparer, le passage d'un navire à l'autre)
- `js/creatures.js` : les grandes bêtes de la mer (baleine, calmar géant, Akkorokamui)
- `js/hud.js` : interface en jeu, carte d'ordres, conseils, mini-carte, flèches, rose du vent
- `js/menu.js` : les écrans
- `js/game.js` : la boucle et la flotte en ligne de file du fond des menus
