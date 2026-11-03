# Phase 4 — Programmes de récompenses simulés

Date : 3 novembre 2026. Source : cahier V1.0, §§ 8, 11.2 et 13.2. Le fichier de référence à jour a été relu avant cette tranche. Les décisions VALIDÉES restent séparées des valeurs PROPOSÉES et À ARBITRER. Aucun déploiement n'est effectué.

## Résultat et fichiers

`src/cite/rewards.ts` ajoute un moteur pur de plans, provisions et déblocages. `src/server/cite-rewards.mjs` fournit les transactions et projections privées, via le magasin partagé `cite-store.mjs`. `src/cite/pilot-rewards.ts` contient seulement les valeurs fictives du scénario. Le pilote, son serveur local et `prototypes/la-cite/` affichent les droits simulés et permettent de tester les huit combinaisons des trois options.

Les écus ne financent pas les cadeaux : les deux ledgers sont indépendants. Activer/désactiver une récompense ne change ni les votes, ni les revenus, ni les bâtiments, ni les jauges. Un déblocage crée une allocation en centimes EUR de simulation ; il ne crée aucune commande, réservation de stock, facture ou obligation commerciale réelle. Le champ `moneyBasis: simulation-only` empêche de présenter ce plan comme un contrat abouti. La provision représente une enveloppe déclarée, pas une vérification de fonds bancaires.

## Règles explicites et provisoires

| Programme | Démonstration | Plafond / provision |
|---|---|---|
| Participation | À la fin, au moins `plafond(10 × Conseils éligibles / 13)` participations | Une attention de 10 € par personne ; tous les membres connus sur la saison sont provisionnés |
| Famille | Performance professionnelle moyenne normalisée ≥ 4 après au moins quatre semaines créditées ; ambitions 50 et 80 | Attentions de 20 €, 15 €, 25 € ; maximum deux par personne sur toute la saison |
| Fête | Niveau final du développement uniquement | Base 300 €, puis niveaux 40/60/80 à 500/750/1 000 € ; maximum 1 000 € |

Ces montants ne sont ni un tarif ni un budget validé commercialement. Le cumul de deux attentions familiales est une valeur de démonstration explicite, pas la résolution de l'arbitrage cumul/substitution du cahier. L'ordre des paliers configurés départage les paliers atteints le même jour ; sinon, le premier événement atteint est prioritaire. Le moteur accepte des conditions familiales alternatives (`any`) ou cumulatives (`all`) et une limite de cadeaux choisie explicitement.

Un bulletin d'abstention volontaire compte pour la participation ; une absence de bulletin ne compte pas. Un Conseil ne compte qu'une fois, même avec deux tours. Les Conseils auxquels la famille était suspendue sont exclus du dénominateur. La proratisation se fonde sur le roster figé à chaque ouverture, donc respecte les arrivées/départs enregistrés. Aucun Conseil éligible signifie aucune attention de participation. Le traitement des absences longues reste à définir ; aucun congé fictif n'est inféré.

Les résultats professionnels utilisent P, jamais les valeurs individuelles ni le nombre d'écus. Seules les semaines effectivement créditées sur données complètes sont prises en compte ; aucun score n'est inventé en cas de revenu de base. Les bénéficiaires familiaux sont figés à la première date d'atteinte : les arrivants ultérieurs ne reçoivent pas rétroactivement ce palier. Une réconciliation tardive retrouve cette date. Un mouvement entre familles ne permet pas de recevoir deux fois le même palier ; le plafond par personne reste global à la saison.

Une baisse ultérieure des jauges ne supprime pas une ambition atteinte ni son attention attribuée. La fête reste distincte : aucune allocation avant clôture des semaines et Conseils attendus, puis un seul niveau fondé sur la moyenne finale des cinq jauges, avec base garantie si l'option est active. Le choix niveau final / maximum demeure à arbitrer pour le produit commercial ; ce prototype n'accepte explicitement que `final`.

## Garde-fous et accès

Le plan doit être initialisé avant le premier Conseil. Il est ensuite immuable dans cette tranche : les modifications contractuelles et leur workflow d'audit ne sont pas encore implémentés. L'initialisation conserve auteur et date, et une répétition identique ne réinitialise rien. La provision couvre tous les collaborateurs connus, le coût des cadeaux familiaux les plus chers dans la limite du plafond, puis le niveau maximal de fête. Une enveloppe insuffisante est refusée. Les montants sont des entiers en centimes et les allocations restent dans les enveloppes de chaque programme.

Les capacités serveur sont distinctes : `citeRewardPlanManagement: [seasonId]` pour paramétrer, `citeRewardOperations: [seasonId]` pour consulter les bénéficiaires/budgets logistiques. Le rôle technique de gestion de saison seul n'accorde aucune de ces capacités. La réconciliation est une opération serveur du gestionnaire, sans montants ni bénéficiaires fournis par le client. Le collaborateur reçoit seulement ses propres droits ; le tableau collectif n'envoie ni la liste individuelle, ni les conditions secrètes, ni les budgets.

Comme les autres modules Cité, le service reste limité aux adaptateurs de test autorisés. Les transactions partagent le document privé, conservent les autres modules et empêchent les doubles allocations, y compris en concurrence. Aucun endpoint Firebase réel n'est enregistré. Dans le serveur local, le rôle fictif d'opérateur peut choisir les options seulement avant la première semaine et voit les allocations fictives. Il reste possible de choisir tous les personnages pour tester : ce sélecteur n'est pas une authentification client.

## Catalogue existant : réutilisation vérifiée dans le code

| Module existant | Capacité conservée | Intégration Cité restante |
|---|---|---|
| `src/server/master-sheets.mjs` | Source Sheets en lecture seule, configuration explicite, contrôle des cellules, taille et délai | Configurer un Master réel sur environnement isolé ; aucun accès Google réel n'est testé ici |
| `src/server/catalog-import.mjs` | Prévisualisation/confirmation, révision et audit des imports Sheets/CSV/XLSX | Raccorder les droits Cité au Cockpit sans réutiliser les anciens déclencheurs Voyage |
| `src/server/supplier-catalog.mjs` | Catalogue et propositions de composition | Décider des références et correspondances budgétaires |
| `src/server/gift-operations.mjs` et `gift-reservations.mjs` | Confirmation, commandes, coûts et stock | Adaptateur des déblocages Cité, préférences, bénéficiaires et règles HTVA/TVAC à définir |

Ces modules n'ont pas été modifiés. L'existence de leur code ne vaut pas validation d'une intégration Cité complète. Les droits de cadeaux simulés restent indépendants de leur workflow réel.

## Résultats et vérification

Le scénario complet conserve 960 écus gagnés, 459 dépensés et 501 restants. Avec les trois options fictives : 1 330 € provisionnés, 710 € alloués, dont 60 € de participation, 150 € familiaux et 500 € de fête ; six attentions de participation, huit attentions familiales et un niveau de fête. Ces chiffres portent sur la démonstration, pas sur une entreprise réelle.

Tests ciblés : huit tests du moteur récompenses, trois tests du service et un contrôle HTTP supplémentaire ; total Cité : 50 tests. Ils couvrent les huit combinaisons, les provisions pour 1/2/5/10 familles, les conditions alternatives/cumulatives, le prorata, l'abstention, les plafonds, la confidentialité, les accès révoqués, la concurrence et l'absence de débit d'écus. `npm run typecheck` complète les contrôles.

Neuf parcours Playwright sont prévus : trois scénarios sur ordinateur 1440/1920 et mobile 390, dont une option participation seule sans cadeau familial ni fête. Le résultat navigateur est à vérifier sur le commit publié. Les captures sont dans l'artefact `cite-prototype-evidence`.

## Suite

Restent : arbitrages P0 et budget commercial, vrais paramètres direction/Cockpit, adaptation et test du catalogue, logistique et préférences, intégration Firebase authentifiée avec tests émulateur, gestion des archives et test humain. La divergence GitHub/version Voyage déployée relevée en phase 0 doit être réconciliée avant toute publication. Aucune donnée client ni règle Firebase n'est modifiée ici.
