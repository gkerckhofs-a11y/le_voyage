# Phase 9 — Espace familial authentifié et vote interne

3 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14. Source : cahier des charges V1.0.

## Périmètre

Depuis Mes choix, le lien Notre Cité ouvre `/cite-family.html` dans le même espace membre et la même entreprise sélectionnée. Vue : bourse, crédits hebdomadaires, cinq jauges, développement global, bâtiments construits/endommagés, ambition de la famille, Conseil courant, projets/coûts/effets, bulletin personnel, résultats familiaux après clôture, financement collectif et conséquences. Rendu volontairement simple, sans carte complexe ni classement.

`src/server/cite-family.mjs` compose les projections existantes dans une transaction privée. La lecture et le vote exigent l'affectation serveur active et une appartenance datée à la famille. UID, entreprise, saison et famille ne peuvent pas être fournis dans la commande HTTP. `src/server/cite-member-http.mjs` expose GET `/api/cite/family` et POST `/api/cite/family/vote` exclusivement dans un espace `cite-member`, avec CSRF sur mutation. `firebase-http.mjs` branche ces routes. Aucun accès direct Firestore client ajouté.

Le moteur `castBallot` existant reste autoritaire : un bulletin immuable par personne et tour, seconde tentative identique idempotente, contradiction refusée, fenêtres et suspensions contrôlées. La projection contient uniquement le bulletin de l'acteur et son ambition ; ni bulletins des collègues, ni leurs évaluations, ni ambitions des autres familles, ni graine/crises futures. Les résultats affichés sont des voix familiales, pas des bulletins individuels.

`web/assets/cite/family.js`, `web/cite-family.html` et `.css` apportent le formulaire accessible et responsive. Le formulaire n'anticipe aucun résultat et ne finance/construit rien. Les données personnelles affichées sont supprimées si le serveur refuse ensuite l'accès. Les noms/contenus sont insérés avec textContent.

## Démonstration isolée

`cite-cockpit-demo.mjs` ajoute une troisième société fictive, **La Cité des Fondateurs**, tenant `fiction-cite-family`. Camille utilise le compte de démonstration membre déjà présent. Trois semaines créditées : 60 écus par famille ; premier Conseil ouvert le 1er mars 2027, bibliothèque ou hôpital, 153 écus par projet. Cette date est celle de jeu injectée par le serveur émulateur existant. La société et ses votes sont séparés des deux sociétés du Cockpit.

Le provisionnement reste exclusivement un script d'émulateur, avec les gardes projet/émulateurs/K_SERVICE existantes. Aucune route de création, réinitialisation ou accélération n'est exposée au collaborateur. Les deux scénarios Cockpit antérieurs sont conservés.

## Vérifications

- Tests ciblés : `tests/cite/family.test.mjs` (confidentialité, droits, concurrence/idempotence, fenêtres, suspension, une famille, HTTP/CSRF). Régression préférences et Cockpit HTTP.
- `tests/cite-emulator/cockpit-http.test.mjs` : nouveau parcours réel Auth/Firestore, votes concurrents, bulletin unique persistant, aucune dépense, séparation et rotation d'espace.
- `tests/cite-cockpit-browser/family.spec.mjs` : vote/rechargement, financement sans construction/débit, révocation, absence de débordement horizontal, ordinateur et mobile. Captures dans l'artefact CI existant.
- TypeScript, build et liste publique stricte (trois nouveaux fichiers publics explicitement autorisés). Workflow ciblé étendu aux pages familiales.

Les résultats exécutés et le commit sont consignés dans la PR ; les tests émulateur/navigateur ne sont pas réputés réussis avant leur exécution en CI.

## Limites et suite

Aucun déploiement, donnée client, commande ou changement de règles Firebase. Le frontal familial ne soumet pas encore le rituel hebdomadaire ni les engagements des délégués ; les services existent mais leur interface et les contrôles de délégation restent une tranche distincte. Pas encore de clôture/calendrier automatisé ou d'administration authentifiée du jeu : la transition de Conseil dans les tests est une opération de fixture serveur. Les quatre Conseils accélérés restent jouables dans le prototype local antérieur.

Barèmes, quorum, calendriers et seuils demeurent PROPOSÉS selon V1.0 ; cette tranche ne tranche aucun P0. La suspension et les règles de famille unique sont celles du moteur précédent. La réconciliation des sources déployées/GitHub décrite en Phase 0 reste requise avant publication.
