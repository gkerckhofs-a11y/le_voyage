# LA CITÉ
## Cahier des charges fonctionnel et ludique — V1.0

**Rouge Clémence** · **3 novembre 2026** · **Document de cadrage avant développement**

**Nom commercial :** « La Cité ». **Instance personnalisée :** « La Cité [Entreprise] » (exemple : « La Cité Lex Ekho »).  
**Statut :** V1 de référence. Les décisions déjà prises sont distinguées des hypothèses à valider par tests.  
**Périmètre :** règles du jeu, parcours collaborateur, administration, cadeaux, moteur narratif, données, tests et livraison.

> **La promesse.** Pendant une saison d'un an, les collaborateurs incarnent des familles fondatrices. Leurs résultats et leur autoévaluation font entrer des écus dans les caisses des familles. Tous les quatre lundis, ils discutent d'un dilemme, votent pour l'avenir de la cité, puis négocient le financement du projet retenu. Bâtiments, crises et arbitrages transforment durablement cinq jauges de la cité. Selon les options souscrites, la participation individuelle, les résultats familiaux et la réussite collective sont récompensés par Rouge Clémence.

### Comment lire ce cahier des charges

- **VALIDÉ** : règle exprimée ou acceptée dans les échanges de conception ; elle constitue le socle du projet.
- **PROPOSÉ** : paramètre de conception initial, utilisable pour prototypage, qui doit être confirmé.
- **À ARBITRER** : question non tranchée, à résoudre avant gel des règles ou contractualisation.
- Les chiffres relatifs aux tarifs, à la fréquence des crises et aux paliers sont des **hypothèses de simulation**, pas des résultats commerciaux garantis.

---

# 1. Vision, objectifs et limites

## 1.1. Positionnement — VALIDÉ

« La Cité » est une expérience d'entreprise collaborative, légère et narrative, inspirée des jeux de dilemmes. Le jeu vise trois usages simultanés : mobiliser chacun autour d'un rendez-vous hebdomadaire court ; créer des échanges entre collègues grâce à des choix difficiles et des négociations ; valoriser les contributions par des attentions Rouge Clémence, selon les choix de la direction.

L'entreprise choisit le nom de sa cité, la date de démarrage et, à terme, un univers graphique dans un catalogue proposé. Le jeu est indépendant de tout univers donné : mêmes règles et mêmes cinq jauges, décors et textes narratifs adaptés. Le premier univers de référence peut être une cité historique ou imaginaire en construction.

## 1.2. Principes non négociables — VALIDÉ

- **Une cité par entreprise et par saison**, construite collectivement ; les équipes sont des familles fondatrices.
- **Une saison de douze mois**, lancée à la date choisie par l'entreprise. La saison suivante crée une nouvelle cité ; les archives de la précédente sont conservées.
- **Un rituel court chaque lundi** : contribution aux cinq dimensions de performance/valeurs de l'entreprise, quelle que soit leur déclinaison locale.
- **Treize Conseils**, espacés de quatre semaines ; le calendrier tient compte des 52 ou 53 rendez-vous hebdomadaires possibles sur douze mois.
- **Une voix par famille au Conseil**, issue d'un vote interne des collaborateurs ; la taille d'une famille ne multiplie pas son pouvoir politique.
- **Vote d'abord, financement ensuite** : un bâtiment n'est construit que si le projet est adopté et que ses ressources sont intégralement réunies.
- **Financement libre et négociable** : toutes les familles ne sont pas obligées d'apporter la même somme.
- **Conséquences réelles** : un projet abandonné faute de financement fait perdre des points de prospérité ; les crises sont influencées par les investissements antérieurs.
- **Objectifs familiaux secrets**, attribués par l'application, liés à une jauge de la cité (seuils 50 et 80 à prototyper pour les cadeaux de l'option familiale).
- **Trois programmes de récompenses facultatifs et combinables** : participation individuelle, performance familiale, fête collective. La direction en active une, deux ou trois.
- **Une entreprise avec une seule famille est un cas pleinement pris en charge.**

## 1.3. Ce que le produit n'est plus — VALIDÉ

Le produit ne repose plus sur un circuit de jeu de l'oie, des voitures, des kilomètres, un compteur de cases, une course ou un classement permanent des équipes. La carte ou la vue de la cité sert à représenter les effets des choix ; elle ne représente pas une distance parcourue. Le nom « Le Voyage » est historique et ne doit pas apparaître dans la nouvelle interface commerciale.

# 2. Organisation du jeu et calendrier

## 2.1. Entités

- **Entreprise** : cliente de Rouge Clémence ; possède des saisons successives et une configuration RH/ludique.
- **Saison** : une cité, un univers visuel, une configuration d'indicateurs et de récompenses, treize Conseils et des archives.
- **Famille** : équipe de 1 à N collaborateurs, avec une bourse d'écus, un objectif secret et une voix au Conseil.
- **Collaborateur** : membre actif d'une famille ; peut répondre au rituel du lundi et voter individuellement.
- **Conseil** : cycle de quatre semaines concluant un dilemme, un vote collectif et, si nécessaire, un financement.
- **Bâtiment / infrastructure** : actif visible doté d'un coût, d'effets sur les jauges et éventuellement d'une protection contre les événements.

## 2.2. Semaine type — VALIDÉ pour le principe, PROPOSÉ pour les horaires

Chaque lundi, les collaborateurs remplissent une autoévaluation très courte (objectif de conception : moins de trois minutes). Les indicateurs professionnels de la semaine sont saisis par la direction, un responsable délégué, ou importés si une source fiable est connectée. Le moteur calcule un revenu **par famille**, crédite sa bourse une seule fois et met à jour son historique.

Durant le cycle, les familles voient le dilemme à venir, peuvent en discuter pendant les pauses et consulter le projet de cité. Aucun atelier présentiel, animateur ou réunion synchrone n'est exigé. Des rappels discrets peuvent être activés par l'entreprise.

## 2.3. Conseil toutes les quatre semaines — PROPOSÉ pour l'ordonnancement

1. **Semaines 1 à 3 :** gains hebdomadaires, état de la cité, indices narratifs éventuels et préparation informelle.
2. **Début semaine 4 :** publication du dilemme et des projets éligibles, avec coûts et effets identifiables.
3. **Milieu semaine 4 :** vote interne des collaborateurs ; synthèse en une voix par famille ; résolution du vote du Conseil.
4. **Fin semaine 4 :** engagements financiers des familles sur le projet choisi, modifiables jusqu'à la clôture.
5. **Clôture :** construction ou échec ; application atomique des coûts, conséquences et nouvelles jauges ; archive du Conseil et mise à jour graphique.

Les horaires exacts, fuseaux, délais d'ouverture, rappels et clôtures sont configurables. Une saison comporte **13 Conseils** aux semaines 4, 8, 12, …, 52 ; une éventuelle 53e échéance hebdomadaire est traitée par une règle de calendrier explicite et ne déclenche pas automatiquement un 14e Conseil.

## 2.4. Changements de membres — VALIDÉ pour l'équité, PROPOSÉ pour la procédure

L'arrivée ou le départ d'un collaborateur n'augmente ni ne diminue mécaniquement les écus du seul fait de l'effectif : le revenu dépend de moyennes, pas d'une somme de notes individuelles. Les droits à voter et les possibilités de récompenses individuelles sont calculés selon les périodes où la personne était éligible. Tout déplacement d'un collaborateur entre familles est daté et audité ; aucun revenu hebdomadaire ni vote clôturé n'est recalculé rétroactivement sans correction administrative tracée.

# 3. Indicateurs personnalisables et revenus en écus

## 3.1. Deux catégories d'indicateurs — VALIDÉ

L'entreprise choisit librement le nombre et le libellé de ses critères : actes, dossiers, chiffre d'affaires, qualité, collaboration, valeurs, etc. Pour éviter que ce choix ne modifie l'équilibrage, les critères sont regroupés en **Performance professionnelle P** et **Valeurs V**. Chaque catégorie produit toujours un score normalisé entre 1 et 5 ; plusieurs sous-critères au sein d'une même catégorie se combinent par une moyenne (ou une pondération interne totalisant 100 %, si configurée et gelée en début de saison).

Les scores individuels de valeurs restent confidentiels. Le résultat professionnel peut être commun à une famille et ramené à un taux d'atteinte de ses objectifs, non à un chiffre d'affaires brut. Les seuils exacts de conversion du taux d'atteinte en note 1–5 sont **à arbitrer et tester** ; ils ne doivent pas pouvoir être modifiés librement pendant la saison.

## 3.2. Formule universelle — PROPOSÉ, accepté comme base de simulation

**Score hebdomadaire de la famille :** S = 0,40 × P + 0,60 × V.  
**Gain en écus :** E = arrondi(5 × S), borné entre 5 et 25 écus par semaine et par famille.

- Pondération **40 % performance / 60 % valeurs** identique pour toutes les entreprises au lancement.
- Le minimum de cinq écus constitue un revenu de base **sur une semaine effectivement calculée**. En cas d'absence totale d'informations, le traitement est à arbitrer (par défaut recommandé : cinq écus de base, aucun complément non justifié, et alerte administrative).
- Les collaborateurs ne gagnent pas chacun cinq à vingt-cinq écus : **une seule bourse familiale** est créditée à partir de la moyenne de la famille.
- L'arrondi utilisé doit être défini de manière unique et testée (proposition : 0,5 arrondi à l'entier supérieur pour des valeurs non négatives).

### Exemple chiffré

| Famille | Collaborateurs | P (/5) | V (/5) | S (/5) | Revenu hebdomadaire |
|---|---:|---:|---:|---:|---:|
| Bâtisseurs | 2 | 3,0 | 4,0 | 3,6 | 18 écus |
| Marchands | 8 | 3,0 | 4,0 | 3,6 | 18 écus |
| Érudits | 5 | 4,0 | 4,5 | 4,3 | 22 écus |

La formule ne dépend donc pas du nombre de personnes. L'agrégation doit documenter qui a répondu et quel indicateur de performance est utilisé, sans exposer les notes des individus aux autres membres.

## 3.3. Paramètres à figer par saison

- Pondérations globales des catégories ; définition et barèmes de normalisation des objectifs ; taux de participation minimal souhaité pour les autoévaluations.
- Nombre initial de familles de référence et éventuellement plafond de revenus/écus conservables (non validé).
- Politique des absences, congés, données manquantes, doublons et corrections après clôture.
- Les calculs doivent être **reproductibles, versionnés et journalisés** pour audit et tests de non-régression.

# 4. Économie et catalogue de bâtiments

## 4.1. Tarification dépendant du potentiel, jamais du gain constaté — VALIDÉ

Les bâtiments sont tarifés en proportion du nombre de familles et des **revenus potentiels de référence**, pas des revenus réellement obtenus. Une famille performante ne doit pas subir une inflation automatique parce qu'elle gagne plus d'écus.

**Base de simulation :** 15 écus par famille et par semaine, soit 60 écus de revenu de référence par famille sur un cycle de quatre semaines.  
**R = 60 × N**, où N est le nombre de familles de référence au lancement de la saison.

| Catégorie | Coefficient proposé | Coût avec 1 famille | 2 familles | 5 familles | 10 familles |
|---|---:|---:|---:|---:|---:|
| Petit projet | 0,85 × R | 51 | 102 | 255 | 510 |
| Projet standard | 1,35 × R | 81 | 162 | 405 | 810 |
| Grand projet | 1,85 × R | 111 | 222 | 555 | 1 110 |

**Statut : PROPOSÉ.** Ces prix sont des points de départ de simulations, pas une économie définitivement équilibrée. Les coûts par bâtiment peuvent également inclure des prérequis, des dépenses d'entretien ou des coûts futurs explicités sur la fiche avant vote.

## 4.2. Règles économiques — VALIDÉ pour la logique

- Chaque famille possède une bourse distincte ; pas de droit automatique de transfert d'écus entre familles hors d'un financement commun prévu par le moteur.
- Une contribution est un **engagement révocable avant clôture** : les écus ne sont débités que si le projet est construit.
- Un projet se réalise si et seulement si le vote a été validé et les contributions acceptées couvrent **100 % du coût**. Le surplus éventuel n'est pas débité ; il faut définir comment l'application limite ou réduit les promesses excédentaires.
- Si le financement échoue, **aucune contribution n'est débitée**, le bâtiment ne naît pas et les jauges subissent la conséquence narrative prévue.
- Une famille qui dispose d'au moins un écu et apporte **zéro** à un projet effectivement construit perd son droit de vote au Conseil suivant ; une famille sans ressources est exemptée. Le droit est rétabli après un Conseil. Une contribution symbolique d'un écu reste suffisante au regard de la règle exprimée ; toute contribution minimale serait une nouvelle décision produit.
- Les actions sont atomiques, protégées contre les doubles clics, et consultables dans l'historique.

## 4.3. Catalogue initial à produire — PROPOSÉ

Le catalogue doit couvrir des arbitrages entre les cinq jauges et inclure des protections ayant une valeur différée : Grand Marché, Bibliothèque, Hôpital, Jardin public, Murailles, Caserne, Réservoir d'eau, Ateliers, Logements, Théâtre, Archives et Pont. Chaque bâtiment comporte : identifiant, nom et illustration, catégorie tarifaire, effets immédiats, effets différés, protections, prérequis, incompatibilités (terrain unique), état visible et phrase narrative de construction/abandon.

**Invariante de game design :** aucune alternative ne doit être strictement dominante sur toutes les jauges, tous les coûts et tous les risques. Une construction efficace aujourd'hui doit pouvoir avoir un coût d'opportunité demain.

# 5. Gouvernance et votes

## 5.1. Vote interne de la famille — VALIDÉ pour le principe

Chaque collaborateur autorisé exprime **un vote individuel confidentiel** sur le dilemme du Conseil. Le résultat majoritaire exprimé produit **une seule voix** pour la famille, quelle que soit sa taille. Si les voix sont à égalité, la famille s'abstient au Conseil, sauf si un second vote interne est organisé dans la fenêtre prévue. Aucune personne ne peut voter au nom d'une autre sans délégation explicitement encadrée.

Le vote interne d'une famille suspendue peut, à titre de proposition, être organisé à titre consultatif, mais il ne produit pas de voix au Conseil pendant la suspension.

## 5.2. Vote du Conseil — VALIDÉ

- Une voix par famille **ayant le droit de voter** ; abstentions hors des suffrages exprimés.
- Majorité simple des voix exprimées pour sélectionner le projet A/B ou valider un oui/non.
- En cas d'égalité, possibilité d'une seconde négociation et d'un nouveau vote. Si l'égalité persiste, aucun projet n'est adopté et la conséquence d'échec s'applique.
- Les décisions et les abstentions sont archivées ; l'identité du vote individuel reste masquée.
- Un projet adopté par le vote n'est **pas** construit automatiquement : financement séparé et obligatoire si un coût est prévu.

**À ARBITRER :** quorum minimal de participation interne et inter-familiale, gestion des voix absentes, durée de reprise d'un vote égal, traitement d'un Conseil sans aucune voix exprimée. Proposition par défaut pour le prototype : pas de quorum chiffré, mais une alerte de faible participation et échec si aucune voix n'est exprimée.

## 5.3. Famille seule — VALIDÉ pour le mode, PROPOSÉ pour détails

Une entreprise peut avoir **une seule famille**, comportant une ou plusieurs personnes. Le vote interne des collaborateurs constitue directement la décision de la cité, sans étape artificielle de Conseil à plusieurs familles. Les coûts utilisent N = 1. Les objectifs familiaux sont adaptés à une famille unique. Les négociations avec d'autres familles, les duels et la sanction de suspension du vote sont **désactivés**, car la suspension bloquerait l'ensemble du jeu. Le financement reste possible uniquement dans la limite de la bourse de la famille ; un manque de ressources entraîne un échec avec conséquences, sans sanction politique.

# 6. Dilemmes, conséquences et crises

## 6.1. Structure narrative — VALIDÉ pour le principe

Chaque Conseil propose un dilemme bref, rédigé pour être compris en deux minutes. Il juxtapose des intérêts réellement concurrents. Le modèle initial alterne : choix entre deux projets, approbation oui/non d'un investissement, et gestion de crises. Une hypothèse de répartition à tester sur treize Conseils est **7 arbitrages A/B, 4 oui/non et 2 Conseils de crise**.

Chaque proposition précise ce qui est connu avant vote (coût, conséquences probables, conditions) et distingue les incertitudes des effets certains. Une mauvaise décision ou un financement manqué peut modifier l'état de la cité, faire perdre de précieux indicateurs et réduire la perspective d'une fête collective plus généreuse si cette option est activée.

## 6.2. Catalogue d'événements — PROPOSÉ

Deux ou trois crises majeures par saison : attaque de barbares, incendie, épidémie, sécheresse, tremblement de terre, etc. Les crises ne sont pas toutes une simple baisse de points ; elles peuvent endommager un bâtiment, proposer un dilemme d'urgence ou déclencher un coût de réparation lors du prochain Conseil.

| Crise | Bâtiment protecteur | Effets possibles sans protection |
|---|---|---|
| Attaque de barbares | Murailles | Économie et Infrastructures en baisse |
| Épidémie | Hôpital | Bien-être en baisse |
| Incendie | Caserne | Infrastructures et bâtiment touchés |
| Sécheresse | Réservoir | Environnement et Économie en baisse |
| Tremblement de terre | Structures renforcées | Dégradations et réparations |

Le moteur doit vérifier les protections présentes **au moment de l'événement**. Une protection réduit le dommage selon une règle explicite et versionnée. Les tirages aléatoires doivent être **reproductibles en environnement de test** (graine / identifiant d'événement), plafonnés et indépendants des choix personnels des administrateurs.

## 6.3. Conséquences différées et redressement

Construire le marché peut ouvrir un commerce futur, mais dégrader l'environnement ; construire des murailles protège contre une attaque qui n'aura peut-être pas lieu. Le jeu doit conserver un petit nombre de variables de récit (ex. alliances, terrain central occupé, protection civile) pouvant modifier un dilemme ultérieur. Il doit toujours exister des décisions de réparation ou de redressement, **sans annuler automatiquement toutes les conséquences**.

# 7. Cité, cinq jauges et indice global

## 7.1. Jauges communes — VALIDÉ

**Économie, Bien-être, Culture, Infrastructures, Environnement.** Elles sont notées sur 100 et évoluent grâce aux projets, crises et conséquences différées. Les indicateurs de revenus propres à l'entreprise sont distincts de ces cinq jauges ; un CA élevé n'augmente pas directement la jauge Économie sans action de jeu prévue.

## 7.2. Développement global — VALIDÉ pour le principe, PROPOSÉ pour la formule

Une **jauge de Développement de la Cité** synthétise les cinq jauges et sert au récit de la cité et, si l'option collective est souscrite, aux paliers de la fête. Hypothèse de V1 : moyenne arithmétique des cinq jauges, arrondie, avec un mécanisme à étudier limitant la note finale si une branche s'effondre. Les pondérations, paliers et éventuel plancher sont **à calibrer**, pas à présenter comme des faits établis.

Le tableau de bord présente l'état actuel de la cité, les cinq jauges, l'indice global, les derniers bâtiments, crises et décisions. Des animations discrètes illustrent les évolutions sans masquer les chiffres ni créer de compétition nominative.

## 7.3. Ambitions familiales secrètes — VALIDÉ

Chaque famille reçoit automatiquement et secrètement **une branche de prospérité** à favoriser, avec un premier palier de 50 % puis un second de 80 %. La famille voit son ambition ; les autres familles ne connaissent pas sa cible. La distribution essaie de répartir les branches entre familles (doublons possibles au-delà de cinq familles). Les récompenses sont débloquées au **premier franchissement** du seuil et ne sont pas retirées si la jauge redescend.

L'ambition secrète n'est pas un droit automatique à des cadeaux si l'entreprise n'a pas souscrit et financé la récompense familiale correspondante. Les seuils existent comme objectifs ludiques même en absence de cadeau.

# 8. Récompenses modulaires Rouge Clémence

## 8.1. Choix de la direction — VALIDÉ

La direction choisit librement **une, deux ou trois options** à financer pour la saison. Le moteur de jeu et les cinq jauges restent identiques, même si une option de récompense est inactive.

| Option commerciale | Bénéficiaire | Déclencheur | Règle budgétaire |
|---|---|---|---|
| 1. Engagement individuel | Collaborateur | Participation aux votes internes | Nombre maximal de bénéficiaires éligibles provisionné |
| 2. Performance familiale | Tous les membres de la famille | Résultats familiaux et/ou ambitions secrètes paramétrées | Paliers, coût unitaire, effectifs éligibles et enveloppe provisionnés |
| 3. Réussite collective | Toute l'entreprise | Niveau de Développement de la Cité en fin de saison | Réception de base et options d'amélioration plafonnées |

## 8.2. Participation individuelle — VALIDÉ pour l'objectif

L'entreprise peut récompenser les collaborateurs qui prennent part aux votes de leur famille. **Proposition de seuil :** participer à 10 des 13 Conseils auxquels ils étaient éligibles, avec proratisation pour les arrivées/départs et règles explicites pour les absences longues. La réponse choisie n'a aucune influence sur le cadeau ; seule la participation vérifiable compte. Un collaborateur ne gagne pas un cadeau parce qu'il vote du « bon » côté.

## 8.3. Performance familiale — VALIDÉ pour le principe, paramétrage à finaliser

L'entreprise fixe des paliers d'atteinte de ses objectifs professionnels et peut intégrer les deux paliers d'ambition secrète (50 % et 80 %) dans ce **même programme budgété**. Le cahier des charges doit permettre des conditions alternatives ou cumulatives, avec plafond de cadeaux. **À ARBITRER :** les cadeaux d'ambition secrète remplacent-ils ou complètent-ils les cadeaux de performance familiale par défaut ? Aucun cumul illimité n'est autorisé sans choix explicite de la direction et provision du budget maximal.

## 8.4. Fête des Fondateurs — VALIDÉ

La fête est **facultative** ; si elle n'est pas activée, aucun événement ni budget collectif n'est automatiquement dû. Si elle est activée, un niveau de réception de base est garanti par le contrat ; les niveaux supérieurs sont débloqués par la prospérité finale de la cité, avec des prestations et un plafond financier prédéfinis. La jauge continue d'exister si l'entreprise ne souscrit pas à la fête.

**À ARBITRER :** paliers du score global (par exemple 40 / 60 / 80), critères de limitation si une jauge s'effondre, logique fondée sur le **niveau final** ou sur le plus haut niveau atteint pendant la saison. Le contrat doit être explicite sur ce point.

## 8.5. Cockpit cadeaux / exécution

Clémence gère le catalogue produits, les préférences, les stocks/équivalents, le budget, le planning, les bénéficiaires, les commandes et les livraisons. Une importation du catalogue depuis un **Master Google Sheets** fait partie des capacités héritées à conserver, après vérification de l'existant. Les cadeaux peuvent rester secrets jusqu'au déblocage ; la fiche logistique complète n'est visible que pour les personnes habilitées. Toute modification de budget et de paliers après lancement doit être auditée et limitée contractuellement.

# 9. Expérience utilisateur et interface

## 9.1. Collaborateur — rituel court

Écran d'accueil : identité de la cité, dernier changement visible, état de sa famille et action de la semaine. Lundi : autoévaluation, confirmation de contribution, réponse à la question éventuelle. En période de Conseil : contexte du dilemme, deux options lisibles, vote interne, statut « la famille a voté ». Le système n'exige ni présence simultanée ni longs textes. L'invitation à discuter se fait hors de l'application, pendant des pauses informelles.

## 9.2. Famille — espace collectif

Bourse d'écus, historique des gains et engagements, objectif secret de la famille (non visible des autres), résultats agrégés dans le respect des règles d'accès, résultat de son vote interne, décision du Conseil, proposition de contribution et confirmation du financement. Une famille peut discuter oralement ou via ses outils existants ; aucune messagerie interne n'est requise pour la V1.

## 9.3. Cité — tableau de bord public à l'entreprise

Vue visuelle de la cité construite, cinq jauges, indice global, bâtiments présents et endommagés, grande décision en cours et historique synthétique. La direction peut suivre les indicateurs agrégés et le calendrier, sans voir les votes individuels ni les ambitions secrètes des autres familles. Les archives des saisons passées sont consultables en lecture seule.

## 9.4. Direction et organisation

La direction paramètre ses critères/objectifs (avec garde-fous sur les coefficients), choisit les options de récompense et finance son programme. L'organisateur Rouge Clémence crée l'entreprise, la saison, les familles, les invitations, l'univers, les dates et supervise les exceptions. Les rôles doivent être distincts pour limiter les accès aux données individuelles.

## 9.5. Direction artistique — PROPOSÉ

La cité doit évoluer visuellement par petites étapes (bâtiments, quartiers, réparations), en privilégiant un style reconnaissable, sobre et engageant plutôt qu'une carte géographique ou un plateau de cases. La V1 peut utiliser une scène illustrée composée d'éléments superposés avant de développer un moteur de carte complexe. L'univers est une couche graphique/narrative, pas un changement de règles.

# 10. Quatre espaces applicatifs

La réorganisation reprend les quatre domaines de responsabilité imaginés pour Rouge Clémence, mais les adapte à « La Cité ».

| Espace | Responsabilités principales | Rôles |
|---|---|---|
| **Cockpit Clémence** | Catalogue, import Sheets, budgets, paliers, cadeaux, livraisons, fête | Gestion cadeaux autorisée |
| **Dashboard organisateur** | Multientreprise, saisons, familles, invitations, univers, contenus, incidents, audits | Administrateur Rouge Clémence |
| **Front collaborateurs et familles** | Autoévaluations, vote interne, bourse, ambition secrète, financement, histoire | Membre de famille |
| **Front direction** | Paramètres métier, statistiques agrégées, choix des options, état de la cité, rapports | Responsable d'entreprise |

Des accès spécifiques en lecture seule peuvent être créés pour un responsable de famille ; ils ne doivent pas casser le vote secret des collaborateurs. Le système doit fonctionner sur mobile et sur ordinateur ; mobile d'abord pour le rituel et les votes.

# 11. Modèle de données et règles du moteur

## 11.1. Entités minimales

- `companies` : identifiant, nom commercial, identité, fuseau, responsables, statut contractuel.
- `seasons` : entreprise, début/fin, état, version des règles, univers, familles de référence, configuration et archive.
- `families`, `memberships` : identité publique de famille, statut, affectation datée, droits de vote.
- `metric_definitions`, `weekly_submissions`, `family_weekly_scores`, `ledger_entries` : critères, réponses personnelles, moyennes, calculs et crédit d'écus.
- `city_state`, `city_gauges`, `building_templates`, `buildings` : jauges, bâtiments, prérequis, protections et état de représentation.
- `councils`, `dilemmas`, `internal_ballots`, `family_council_votes`, `funding_pledges`, `resolutions` : dossier de Conseil, votes confidentiels, engagements et résultat.
- `event_templates`, `season_events`, `narrative_flags` : crises, tirage, conséquences et conditions narratives.
- `secret_objectives` : famille, jauge cible, seuils, progression et visibilités.
- `reward_plans`, `reward_milestones`, `reward_unlocks`, `catalog_items`, `fulfillment_orders`, `party_tiers` : promesses contractuelles, budgets et logistique.
- `city_snapshots`, `audit_events` : état archivé et journal des opérations sensibles.

## 11.2. Invariants techniques

- Un revenu par famille et par semaine au maximum, avec mécanisme de correction tracé.
- Une voix de Conseil par famille éligible ; un bulletin interne par collaborateur éligible et par tour.
- Un projet ne débite des écus qu'une fois, après vote valide et financement intégral.
- Aucun solde négatif ; engagements simultanés plafonnés aux fonds disponibles.
- Les suspensions de vote s'appliquent au **Conseil suivant uniquement**, pas à toute la saison.
- Un même seuil de cadeau ne peut être débloqué qu'une fois pour un bénéficiaire et une saison.
- Les données de vote individuel et les objectifs secrets sont protégés par des règles d'accès côté serveur, pas seulement masqués dans l'interface.
- Un Conseil clôturé et une saison archivée ne sont pas réécrits silencieusement ; toute correction est explicitement auditée.

## 11.3. Infrastructure et reprise de l'existant

Le contexte de développement antérieur utilise **GitHub et Firebase**. Avant toute migration, auditer le dépôt réellement accessible, les environnements Firebase existants, l'authentification, les droits Firestore, les intégrations Google Sheets et les composants réutilisables. Ne pas écraser l'ancienne application ni affirmer que le code actuel implémente déjà les fonctions de La Cité sans inspection.

L'architecture cible doit séparer le moteur pur des règles (calculs, votes, financements, résolution) des écrans et des contenus narratifs ; utiliser des opérations serveur transactionnelles pour les effets financiers et les résolutions ; prévoir tests automatisés, environnement de démonstration isolé et journalisation.

# 12. Qualité, confidentialité et accessibilité

## 12.1. Confidentialité et gouvernance des données

Les autoévaluations individuelles et bulletins internes doivent être confidentiels. Les moyennes familiales peuvent permettre d'inférer un score individuel dans une famille de très petite taille : prévoir des règles d'affichage adéquates et documenter les accès de la direction. Les objectifs secrets sont invisibles aux autres familles, sauf divulgation volontaire par les joueurs. Les administrateurs techniques n'accèdent au contenu sensible qu'en cas de besoin justifié et avec traçabilité.

Prévoir information claire des participants, contrôle de conservation, export et suppression selon la politique applicable, restrictions d'accès par entreprise et par saison, et vérification juridique des traitements de données de collaborateurs avant déploiement. Cette V1 est un document fonctionnel, pas une analyse de conformité juridique.

## 12.2. Accessibilité et simplicité

Interface lisible sur téléphone, contrastes suffisants, pictogrammes toujours doublés de texte, clavier et lecteurs d'écran pris en charge, animations désactivables. L'essentiel du rituel doit être réalisable en **2 à 3 minutes** ; le vote ne demande qu'un choix court. Aucun mécanisme ne doit exiger une réunion supplémentaire ni l'utilisation d'une application de messagerie dédiée.

# 13. Recette et simulation — critères d'acceptation

| Test | Situation | Résultat attendu |
|---|---|---|
| R01 | Deux familles de 2 et 8 personnes ont les mêmes notes | Même revenu d'écus |
| R02 | Entreprise à 1 famille | Vote interne suffit, pas de suspension bloquante |
| R03 | Famille 3/5 en P et 4/5 en V | S = 3,6/5 ; gain = 18 écus |
| R04 | Projet voté, financement incomplet | Aucun débit ; pas de bâtiment ; conséquences appliquées une fois |
| R05 | Projet voté et intégralement financé | Débit unique, bâtiment créé, jauges actualisées |
| R06 | Famille solvable contribuant zéro au projet construit | Suspension au Conseil suivant, puis rétablissement |
| R07 | Famille sans ressource, contribution zéro | Aucune suspension automatique |
| R08 | Égalité au Conseil puis nouvelle égalité | Échec selon règle de second tour |
| R09 | Membre rejoint une famille en cours de saison | Aucun revenu ni vote passé modifié ; éligibilité future exacte |
| R10 | Deux crises identiques avec/sans murailles | Dégâts inférieurs avec la protection, selon règle versionnée |
| R11 | Ambition secrète Culture atteint 50 puis redescend | Déblocage enregistré une fois ; pas de retrait du cadeau |
| R12 | Seule l'option « participation » est souscrite | Aucun cadeau familial ou fête contractuellement dû |
| R13 | Saison se termine, nouvelle saison créée | Nouvelle cité et nouvelles bourses ; archives précédentes préservées |
| R14 | Deux validations simultanées de financement | Ni débit doublé ni solde négatif |
| R15 | Membre d'une autre entreprise tente d'accéder aux votes secrets | Accès serveur refusé et journalisé |

## 13.1. Plan de simulation économique avant gel

Tester au minimum les entreprises de **1, 2, 5 et 10 familles**, sur 52 semaines, avec distributions réalistes de revenus faibles, moyens et élevés ; variations d'effectifs ; refus stratégiques de contribution ; répartition de bourses inégales ; deux à trois crises ; protections acquises ou non. Mesurer : constructions réussies sur 13 Conseils, dispersion des réserves, fréquence des blocages, satisfaction des ambitions 50/80, cinq jauges finales, niveau de la fête, fréquence des suspensions et participation aux votes.

Ne pas présenter un barème comme « équilibré » uniquement parce qu'une simulation automatisée atteint 9 ou 10 constructions : il faut effectuer au moins une **partie pilote avec de vrais participants**, car les négociations humaines et les alliances peuvent modifier fortement les résultats.

## 13.2. Scénario pilote

Un pilote de **4 Conseils** (16 semaines simulées, condensées en session d'essai) doit tester : un projet A/B, une décision oui/non, une crise évitable par un bâtiment, un défaut de financement ; au moins une famille plus riche et une autre moins riche ; une ambition secrète ; la résolution des votes et une attribution de cadeau simulée. Les interactions doivent pouvoir être menées de manière asynchrone.

# 14. Périmètre de développement et ordre de livraison

**Tranche 0 — Audit et fondations.** Inspecter le code et les accès existants, confirmer la stratégie de migration, établir modèle de données et règles de confidentialité, créer environnement de test.

**Tranche 1 — Moteur économique.** Configuration des critères, réponses hebdomadaires, calcul des moyennes, ledger d'écus, familles de tailles variables et tests unitaires.

**Tranche 2 — Conseils et financement.** Dilemmes, vote interne confidentiel, vote de Conseil, double tour, suspensions, contributions, clôture atomique et historiques.

**Tranche 3 — Développement de la cité.** Cinq jauges, indice global, catalogue des bâtiments, rendu de la cité, ambitions secrètes et conséquences différées.

**Tranche 4 — Crises et récit.** Tirage des événements, protections, effets, branches narratives et outils de création/gestion des dilemmes.

**Tranche 5 — Récompenses et exploitation.** Trois options contractuelles, Cockpit Clémence, catalogue Google Sheets, gestion des déblocages, logistique et paliers de fête.

**Tranche 6 — Pilote et déploiement.** Batterie de simulations ciblées, test humain, corrections UX, sécurité des accès, monitoring, documentation et mise en production progressive.

# 15. Registre des arbitrages encore ouverts

Ces éléments ne doivent pas être implicitement considérés comme validés par le présent document.

| Priorité | Sujet | Proposition V1 / décision attendue |
|---|---|---|
| P0 | Normalisation CA / objectifs | Échelle 1–5 centrale et testée ; définir les seuils d'atteinte |
| P0 | Données manquantes le lundi | Revenu minimum, relance, politique d'absence et seuil de réponses |
| P0 | Quorum et calendrier de vote | Pourcentage minimal, horaires, règle d'un second tour et absence totale de voix |
| P0 | Définition de la « contribution nulle » | À confirmer que 1 écu suffit pour éviter la suspension (conforme à la règle actuelle) |
| P0 | Récompenses familiales | Arbitrer cumul ou substitution des cadeaux performance / ambitions 50–80 |
| P0 | Indice global et fête | Formule, limitation si jauge très basse, paliers et score final vs maximum |
| P1 | Début des jauges et ambition 50/80 | Niveaux initiaux, équilibrage de l'accès aux cinq branches |
| P1 | Crises | 2 ou 3, calendrier, protections, amplitudes et probabilité |
| P1 | Modifications du nombre de familles | Recalibrage administratif contrôlé ou gel des coûts en saison |
| P1 | Catalogue initial et narrative | Écrire et tester 13 Conseils, bâtiments et conséquences différées |
| P1 | Degré de personnalisation visuelle | Un univers de lancement, autres variantes lors des saisons suivantes |
| P2 | Animation des objectifs secrets | Révélation volontaire ou secret permanent pendant/après la saison |
| P2 | Politique d'archivage | Conservation, export, durée, accès aux anciennes cités |

## Décision de passage en développement

La V1 autorise **un prototype de moteur de jeu et une maquette de la cité**, mais n'autorise pas encore la contractualisation des taux de cadeaux, de la formule de fête ou du catalogue final sans arbitrer les points P0 et vérifier les coûts par simulations et tests humains.

---

**Document de référence :** décisions de conception recueillies dans cette conversation, consolidées le **3 novembre 2026**. Aucune donnée de terrain ni étude de marché externe n'est présentée comme vérifiée dans ce cahier des charges.
