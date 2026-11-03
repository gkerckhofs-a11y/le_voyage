# Phase 11 — Administration authentifiée des performances et clôtures

3 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14. Cahier des charges V1.0 ; barèmes, quorum et autres paramètres ouverts restent provisoires.

## Parcours livré

L'espace `cite-admin` est séparé des membres et du Cockpit cadeaux. Un compte explicitement autorisé par `citeSeasonManagement` peut saisir les notes professionnelles familiales déjà normalisées entre 1 et 5, clôturer chaque famille/semaine, clôturer un tour de vote et clôturer le financement. La sélection d'entreprise/saison est issue de la session authentifiée ; la famille ciblée est validée dans cette saison côté serveur.

Le calendrier serveur contrôle les fenêtres : pas de saisie future, pas de clôture de semaine future, pas de clôture anticipée de vote ou de financement. Les boutons désactivés reflètent ces droits, mais le serveur reste autoritaire. La saisie professionnelle est immuable sans workflow de correction distinct. La conversion de CA/objectifs bruts reste À ARBITRER ; aucune échelle métier nouvelle n'est introduite.

Les clôtures réutilisent `recordPerformance`, `closeFamilyWeek`, `closeVote` et `closeFunding`. Le revenu familial n'est crédité qu'une fois. Une semaine sans données suffisantes conserve la politique configurée (`defer` dans les fixtures). Un projet sous-financé échoue sans prélèvement ; un projet financé crée le bâtiment, débite les écus et actualise les jauges une fois. Le second tour et les suspensions restent ceux du moteur précédent, y compris les exceptions d'une famille unique.

Chaque modification nouvelle ajoute une entrée privée `managementAudit` avec acteur authentifié, date de jeu, opération et identifiants concernés, sans copier les notes. Pas de nouvelle entrée pour un envoi identique ou une clôture déjà appliquée. Limite explicite du prototype : 2 000 entrées, puis refus avant écriture. Les récompenses, lorsqu'un plan existe, sont synchronisées dans la même transaction : un échec annule aussi le crédit/débit et la construction.

## Confidentialité

La projection administrative expose les notes professionnelles des familles, leurs bourses et crédits, la Cité publique et les résultats familiaux clôturés. Elle ne retourne ni autoévaluations individuelles, ni bulletins personnels/rosters, ni ambitions secrètes, ni graine ou crises futures. Aucun écran de détail individuel n'est ajouté. Les contrôles de droit sont refaits à chaque requête et transaction. Une page déjà affichée est purgée au prochain accès serveur refusé ; pas de canal temps réel.

## Fichiers

- `src/server/cite-admin.mjs` : projections de gestion et mutations transactionnelles, audit et synchronisation des récompenses.
- `src/server/cite-admin-http.mjs` : GET `/api/cite/admin`, POST `/performance`, `/close-week`, `/close-vote`, `/close-funding` sous ce préfixe ; espace dédié, CSRF et corps exact obligatoires.
- `src/server/firebase-http.mjs`, `src/server/workspaces.mjs`, `src/web/workspaces.ts` : intégration du nouvel espace, destination autorisée, séparation des routes et rotation de session existante.
- `web/cite-admin.html`, `.css`, `web/assets/cite/admin.js` : choix de semaine, formulaires familiaux, clôtures et état construit/abandonné, ordinateur/mobile ; retrait des données lors d'une révocation.
- `src/cite/economy.ts` : égalité canonique indépendante de l'ordre des champs Firestore pour les réenvois de notes professionnelles et personnelles. Les valeurs numériques et règles économiques ne changent pas.
- `src/server/cite-cockpit-demo.mjs` : compte administrateur fictif distinct, espaces Fondateurs (vote non clôturable à sa date de jeu) et Régisseurs (financement prêt à clôturer au 8 mars 2027). Trois engagements de 51 écus couvrent 153 écus ; les revenus de la quatrième semaine sont encore à clôturer. Gardes émulateur/projet/K_SERVICE conservées.
- `tests/cite/admin.test.mjs` : huit cas ciblés, droits/confidentialité, notes immuables, doubles clôtures, financement incomplet, rollback des récompenses, CSRF et ordre Firestore.
- `tests/cite-emulator/cockpit-http.test.mjs` : deux nouveaux parcours Auth/Firestore, séparation, rotation, CSRF, révocation et clôtures concurrentes.
- `tests/cite-cockpit-browser/admin.spec.mjs` : saisie/rechargement/crédit/construction et clôtures prématurées/révocation, sur ordinateur et mobile.
- Liste publique stricte et workflow ciblé : trois nouveaux fichiers publics autorisés explicitement et chemin des pages admin ajouté.

## Vérifications et limites

95 tests Cité réussis localement ; TypeScript, build et liste publique stricte réussis. Les résultats des intégrations et captures navigateur sont consignés dans la PR après exécution CI, sans les présumer réussis.

Aucun déploiement, donnée client, règle Firebase ou achat réel modifié. Cette tranche ne crée pas les entreprises, saisons, invitations ou affectations ; elle n'édite pas les définitions des Conseils et ne les ouvre pas automatiquement. Les clôtures sont manuelles et datées, sans ordonnanceur. Restent le calendrier administrable, le workflow de correction auditée, la conservation/export, le pilote humain et les arbitrages P0. La divergence historique GitHub/version publiée doit être réconciliée avant publication.
