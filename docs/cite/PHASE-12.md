# Phase 12 — Brouillons privés et publication des Conseils

3 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14. Référence : cahier des charges V1.0. Aucun arbitrage P0 supplémentaire considéré comme validé.

## Parcours

L'administrateur de saison prépare le prochain Conseil dans son espace authentifié. Le formulaire permet de renseigner un choix A/B ou oui/non, les dates du vote et du financement, les projets, leur catégorie tarifaire, leurs effets immédiats, le récit, la protection ou réparation éventuelle et la conséquence d'échec. Les coûts sont calculés côté serveur sur le nombre de familles de référence. Aucun prix client n'est accepté.

Le Conseil suivant utilise la quatrième semaine du prochain cycle configuré, dans la limite de treize Conseils et du calendrier effectivement présent. Les identifiants et la semaine sont attribués par le serveur. Les horaires restent les dates civiles du moteur précédent, avec fins exclusives ; cette tranche n'introduit pas d'heures ou d'ordonnanceur.

Le brouillon est privé, révisable et protégé par un numéro de révision. Un envoi identique réordonné par Firestore est idempotent. Deux administrateurs ne peuvent pas écraser silencieusement leurs modifications. Une modification non enregistrée désactive le bouton de publication. La vérification affiche la version enregistrée, les coûts et les effets. Deux projets de coût/protection/réparation comparables ne peuvent pas présenter une alternative strictement meilleure sur toutes les jauges sans contrepartie (invariant de conception V1.0).

Publier requiert le droit de gestion actif, la révision actuelle, la résolution du Conseil précédent et la fenêtre du premier tour. Le moteur revérifie les bâtiments déjà construits et les réparations. Le Conseil publié est figé, visible aux membres et votable selon leur éligibilité. Une tentative répétée ne recrée pas le Conseil, le roster, l'audit ou la crise. Les brouillons publiés sont conservés dans le document privé ; la préparation suivante ne réécrit pas leur définition.

Une crise préengagée est appliquée par le moteur à la publication du Conseil concerné, avant tout bulletin. Ni l'édition ni la prévisualisation ne déclenche ou ne révèle les crises futures. Si un plan de récompenses existe, il est synchronisé dans la même transaction que la publication et ses effets.

## Fichiers

- `src/cite/councils.ts` : expose une validation/préparation sans ouverture et compare les définitions canoniquement, indépendamment de l'ordre Firestore.
- `src/server/cite-council-planning.mjs` : prochain créneau, validation stricte, contrôle des prix/contenus et projection du brouillon.
- `src/server/cite-admin.mjs` : sauvegarde révisée, publication transactionnelle, conservation des brouillons et audit existant.
- `src/server/cite-admin-http.mjs` : POST `/api/cite/admin/save-draft` et `/publish-draft`, espace gestionnaire et CSRF obligatoires, portée issue de la session.
- `web/assets/cite/planning.js`, `web/assets/cite/admin.js`, `web/cite-admin.html`, `.css` : formulaire, relecture enregistrée et ouverture manuelle. Libellés explicites, contenus rendus avec textContent, publication désactivée pour un formulaire modifié.
- `src/server/cite-cockpit-demo.mjs` : société fictive « La Cité des Conseils », accessible au compte administrateur et au membre de démonstration. Aucun Conseil ouvert initialement, date de jeu du 1er mars 2027. Gardes émulateurs/projet/K_SERVICE inchangées.
- `tests/cite/planning.test.mjs` : sept cas ciblés de confidentialité, coûts pour 1/2/5/10 familles, concurrence, idempotence, calendrier, immutabilité, crise unique, mode famille unique et HTTP/droits.
- `tests/cite-emulator/cockpit-http.test.mjs` : deux nouveaux parcours réels Auth/Firestore, publication simultanée, vote après publication et révisions concurrentes.
- `tests/cite-cockpit-browser/planning.spec.mjs` : deux parcours ordinateur/mobile, brouillon/relecture/rechargement/publication/vote et conflits entre onglets.
- `tests/visual/public-build.test.mjs` : un nouveau fichier public de présentation explicitement autorisé, aucun module serveur exposé.

## Vérifications et limites

102 tests Cité, TypeScript, build et liste publique stricte réussis localement. Résultats des émulateurs et captures navigateur consignés dans la PR après exécution CI.

Aucun déploiement, donnée client, achat ou règle Firebase modifié. Un seul prochain brouillon est éditable à la fois ; les définitions déjà publiées ne sont pas corrigées par cet écran. Pas d'import en masse des treize Conseils, d'ouverture planifiée automatique, de clonage de scénario, d'illustrations ou de traitement des corrections après publication. Les effets différés supplémentaires restent à modéliser dans le catalogue. Les paramètres proposés de prix, quorum, calendrier et récompenses restent ceux de V1.0. La réconciliation GitHub/version historiquement publiée reste obligatoire avant déploiement.
