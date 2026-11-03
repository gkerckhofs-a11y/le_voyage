# Phase 3 — Cité évolutive et démonstration locale

Date : 3 novembre 2026. Référence : cahier des charges V1.0 du même jour. Cette tranche prolonge les phases 1 et 2 sans déployer ni remplacer l'application historique.

## Implémentation vérifiable

- `src/cite/city-state.ts` et `city.ts` : cinq jauges bornées, développement global, ambitions secrètes réparties automatiquement entre les branches, paliers 50/80 conservés après une baisse, crises préengagées et reproductibles, protections et bâtiments endommagés.
- `src/cite/councils.ts` : crise appliquée avant tout bulletin à l'ouverture du Conseil, observation des ambitions après résolution et réparation financée d'un bâtiment existant sans duplication.
- `src/server/cite-city.mjs` : initialisation transactionnelle avec graine serveur aléatoire, contrôles d'appartenance et projection de la seule ambition familiale autorisée. Les services économiques et les Conseils conservent cet état privé dans la même transaction.
- `src/cite/pilot.ts` : entreprise fictive, trois familles de deux personnes et seize semaines accélérées. Quatre Conseils : bibliothèque/hôpital, caserne oui/non, incendie avec caserne puis jardin, ateliers non financés.
- `prototypes/la-cite/` et `src/server/cite-prototype.mjs` : interface locale, cité SVG simple, jauges, rôles fictifs, bulletins, promesses, gains, constructions et historique. Le scénario peut être joué manuellement ou automatiquement.

## Exécuter la démonstration

Avec Node 24 et les dépendances installées :

```sh
node scripts/serve-cite-prototype.mjs
```

Ouvrir `http://127.0.0.1:4175`. L'opérateur avance les semaines et clôture les votes/financements. Chaque personne fictive vote ; le premier membre de chaque famille est délégué au financement. Le bouton automatique rejoue le scénario déterministe depuis une salle vierge. Recommencer efface seulement cette salle fictive en mémoire.

Le sélecteur permet volontairement d'incarner toutes les personnes fictives. Il ne constitue pas une authentification client et ne garantit donc pas le secret entre les testeurs de cette même démonstration. Les réponses de chaque rôle omettent toutefois les évaluations, les bulletins des autres et leurs ambitions. La graine fixe du pilote n'est pas un secret de production.

Le serveur refuse les environnements de production/Cloud Run, écoute uniquement 127.0.0.1 et contrôle Host, origine, cookie de session, CSRF et révision de la salle. Les sessions sont limitées à 32 ; redémarrer le serveur remet la salle et les sessions à zéro. Aucun endpoint de ce prototype n'est raccordé au serveur Firebase existant.

## Paramètres explicitement provisoires

Les jauges commencent à 40 pour le scénario. Le développement est la moyenne arrondie des cinq jauges. Un protecteur intact divise les pertes par deux, arrondies vers le bas en valeur absolue. Les événements sont prévus aux Conseils 3 et 9 lorsque la saison les comporte. Le catalogue de dégâts, les effets des bâtiments et les textes narratifs sont des valeurs de test, sans arbitrage définitif.

Les ambitions sont équilibrées entre les cinq branches, sans répétition avant épuisement. Une jauge initiale déjà au seuil valide son palier dès l'initialisation. Les étapes atteintes persistent ; elles ne déclenchent aucun cadeau commercial. Une protection construite après une crise ou endommagée lors de celle-ci n'atténue pas rétroactivement cet événement.

## Résultats de référence

Le pilote automatique produit 960 écus gagnés, 459 dépensés, 501 conservés (120, 155 et 226 par famille), trois bâtiments et un développement de 43. Le dernier projet échoue sans débit. La famille solvable qui n'a pas contribué au Conseil 2 perd seulement son vote au Conseil 3 et peut toujours financer ce dernier.

Validation ciblée : `node --test tests/cite/*.test.mjs` (38 tests), `npm run typecheck`, puis `npx playwright test --config playwright.cite.config.mjs` (six parcours : automatique et premier Conseil manuel sur deux tailles ordinateur et une taille mobile). La CI conserve les captures et traces sous l'artefact `cite-prototype-evidence`. Le résultat des parcours navigateur doit être vérifié sur le commit publié avant de les déclarer réussis.

## Limites et suite

Les trois options commerciales de récompense, leurs plafonds, les budgets et l'intégration du catalogue Cockpit/Google Sheets restent à implémenter. La démonstration locale utilise les moteurs purs ; les services Firestore ont des tests transactionnels avec substitut, pas encore une validation sur émulateur ou environnement Firebase réel. Les routes authentifiées, l'interface client réelle, les archives de saison et les arbitrages ouverts du cahier des charges restent à traiter.

La divergence entre les sources GitHub historiques et la version Voyage réellement publiée demeure documentée en phase 0. Réconcilier ces sources avant toute intégration ou publication. Aucun déploiement, changement de règles Firebase ni modification de données client n'est effectué dans cette tranche.
