# La Cité — tranche 2 : Conseils et financement

Référence : cahier des charges V1.0 du 3 novembre 2026, §§4–7 et R02/R04–R08/R14/R15. Cette tranche conserve le moteur économique de la tranche 1 et n’ajoute aucune route HTTP ni interface publique. Aucun déploiement ou changement de données Firebase.

## Implémenté

- Un Conseil actif à la fois, aux semaines 4, 8, …, 52 au maximum ; pas de 14e Conseil automatique. Définition figée, coûts calculés à partir du nombre initial de familles. Fenêtres de vote et de financement explicites.
- Chaque collaborateur éligible exprime son bulletin confidentiel. Un bulletin immuable par personne et par tour ; répétition identique idempotente. Le serveur déduit l’UID du jeton, jamais d’un champ du navigateur.
- Une seule voix par famille, sans pondération par effectif. Égalité interne → abstention. Les abstentions sont exclues des voix exprimées du Conseil. La famille seule décide directement par son résultat interne.
- Égalité au Conseil → second tour dans la fenêtre prévue ; nouvelle égalité → échec. Une demande périmée de clôture du premier tour ne ferme jamais le second. Fenêtre de second tour manquée → échec identifié comme tel, sans prétendre qu’un second vote a eu lieu.
- Choix A/B et approbation oui/non. Vote favorable distinct du financement : pas de construction automatique. Refus ou absence de toute voix exprimée → conséquence d’échec déclarée sur le dilemme.
- Promesses financières révocables avant clôture, sans débit anticipé. Version par promesse familiale et identifiant de mutation protègent contre les formulaires périmés et les doubles clics. Montants entiers non négatifs, bornés à la bourse et au coût restant.
- À la clôture, construction si le coût est couvert à 100 % ; débit et création atomiques. Sinon aucun prélèvement, pas de construction et conséquence unique. Les fonds promis à un échec restent dans les bourses.
- Une famille solvable contribuant zéro à une construction perd son vote au Conseil suivant uniquement. Les familles insolvables sont exemptées ; un écu évite la sanction. Famille unique : sanction désactivée. Une famille suspendue peut encore financer ; les tests vérifient son rétablissement et l’absence de suspension permanente implicite.
- Les constructions sont enregistrées, les dépenses familiales archivées et les effets immédiats appliqués une seule fois aux cinq jauges, bornées entre 0 et 100.

## Règles provisoires explicites

Version `cite-councils-prototype-v1` : pas de quorum chiffré ; alerte de participation incomplète et échec si aucune famille n’exprime de voix ; un seul second tour ; bulletins consultatifs des familles suspendues désactivés ; surfinancement **refusé**, sans prélèvement ni proratisation arbitraire de l’excédent. Ces choix ne gèlent pas les arbitrages P0. Quand les promesses couvrent déjà le coût, une nouvelle contribution symbolique nécessite le retrait ou la réduction d’une promesse existante : cet effet de négociation doit être évalué pendant le test humain.

Le roster est figé à l’ouverture du Conseil. Les fenêtres sont exprimées en dates civiles, pas encore en horaires. Un deuxième vote interne autonome avant la clôture du premier tour n’est pas implémenté ; une égalité interne entraîne donc l’abstention, sauf nouveau vote dans le second tour du Conseil. Les procédures de changement d’affectation en cours de fenêtre restent à préciser.

Le financement utilise un délégué habilité explicitement par `citeFundingAssignments`, en plus de son affectation à la famille. Ce rôle de prototype ne remplace pas le vote individuel de tous les collaborateurs. La procédure commerciale de désignation reste à arbitrer. Un administrateur de saison sans cette affectation ne peut pas promettre les fonds d’une famille.

Les niveaux initiaux des jauges doivent être fournis explicitement à l’initialisation. La démonstration emploie 20/100, des effets de bâtiments et des pertes d’échec provisoires. Une seconde initialisation ne remet pas la cité à zéro. Le score global, les ambitions 50/80, les protections/crises, l’entretien et les trois programmes de récompenses ne sont pas ajoutés dans cette tranche.

## Confidentialité et transaction

`src/server/cite-store.mjs` centralise la vérification Firebase Admin, la relecture des droits et la transaction sur le même document privé que l’économie. Les gains hebdomadaires et les clôtures de financement ne peuvent donc pas s’écraser mutuellement. Les autres métadonnées du document sont conservées ; plafond de 800 000 octets.

Le service `cite-councils.mjs` ne renvoie ni évaluations, ni roster nominatif, ni ensemble des bulletins, ni empreintes de mutations, ni bourses étrangères. Avant clôture, aucune synthèse partielle des votes n’est publiée. Un membre voit son propre bulletin et ses propres engagements/dépenses ; la direction reçoit le tableau collectif sans ces données personnelles. Après clôture, les voix synthétiques des familles sont affichables pour expliquer la décision. Dans une famille d’une seule personne, cette voix familiale permet nécessairement de déduire son choix : limite à expliciter avant le pilote RH.

Les tests transactionnels emploient un adaptateur mémoire sérialisé ; la concurrence réelle Firestore, le routage HTTP, le CSRF et l’audit persistant des refus d’accès restent à vérifier lors du raccordement. Aucun accès navigateur à Firestore n’a été ouvert.

## Scénario accéléré de gouvernance

```sh
node scripts/simulate-cite-councils.mjs
```

Trois familles, seize semaines effectivement calculées, sans bourse injectée :

1. Bibliothèque ou dispensaire : bibliothèque adoptée et construite.
2. Réservoir oui/non : adopté et construit ; une famille solvable ne contribue pas et est suspendue au Conseil 3.
3. Pont ou marché : égalité puis deuxième égalité, échec sans paiement. Ce Conseil teste la gouvernance, **pas une crise**.
4. Ateliers : vote favorable, financement incomplet, échec sans prélèvement ; la famille suspendue a retrouvé son vote.

Les promesses utilisent uniquement les revenus déjà disponibles ; le revenu de la quatrième semaine est crédité après la résolution du Conseil. Résultat reproductible : 48 crédits, 960 écus gagnés, 306 dépensés, bourses finales 180/205/269, soit 654 écus conservés. Deux constructions. Aucun classement ajouté.

## Vérification et suite

```sh
npm run typecheck
node --test tests/cite/*.test.mjs
```

25 tests ciblés réussis localement : économie, tailles 1/2/5/10, secret des bulletins, majorités, abstentions, deux tours, oui/non, plafonds de financement, retraits, versions, sanctions, famille seule, scopes, droits révoqués, double clôture et crédit simultané à une dépense. La CI ciblée couvre désormais tous les modules serveur `cite-*.mjs` et les deux simulations.

Le pilote jouable complet reste à terminer : scène de cité, ambitions secrètes, crise modulée par un bâtiment protecteur, récompense simulée et interface de vote/financement. Le troisième Conseil de ce scénario technique devra être remplacé ou complété par la crise attendue. Les tests humains, le calendrier complet glissant et l’intégration Firebase ne sont pas déclarés terminés.
