# Phase 19 — Édition individuelle des Conseils futurs

4 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14. Source : V1.0, §§ 6, 9.4 et 11.2. Aucun arbitrage P0 supplémentaire.

## Parcours livré

L'administration propose un sélecteur « Conseil à préparer » pour tous les créneaux non publiés du calendrier configuré. Un Conseil futur peut être créé ou corrigé sans passer par une nouvelle modification du fichier d'import. Les définitions importées sont reprises avec leur révision actuelle ; les titres, projets, dates, effets et récits restent éditables dans le formulaire existant.

L'aperçu enregistré de chaque créneau est produit côté serveur : les coûts dépendent toujours du nombre de familles de référence, sans prix saisi par le client. Les révisions restent indépendantes par Conseil. Un changement concurrent ne peut pas écraser silencieusement un brouillon et le rechargement conserve le Conseil sélectionné, au moyen d'une ancre locale validée.

Le sélecteur est désactivé tant que le formulaire a des modifications non enregistrées. Le texte et l'état de vérification de l'import JSON sont conservés lors d'un simple changement de sélection, sans réactiver une confirmation devenue périmée. L'import global conserve son fonctionnement transactionnel et sa validation propres.

## Publication et confidentialité

La sélection d'un Conseil futur ne lui donne pas le droit d'être publié. Le bouton reste désactivé si ce n'est pas le prochain Conseil ; le serveur conserve son contrôle d'ordre, de résolution du Conseil précédent, de fenêtre de vote, de révision et de prérequis. Les Conseils déjà publiés disparaissent du sélecteur et leur réécriture reste refusée par l'API.

L'enregistrement cible le numéro dérivé de l'identifiant de Conseil validé par le serveur, dans la saison de la session. Il ne crée pas de Conseil ouvert, bulletin, crise, construction, crédit ou récompense. Les brouillons et aperçus restent réservés à l'administration autorisée ; aucun nouveau droit n'est accordé et les membres ne voient pas ces contenus futurs.

La capacité reste celle du calendrier configuré, avec au maximum treize Conseils. Les dates civiles et barèmes provisoires existants sont conservés. Les effets différés non encore modélisés, les corrections après publication et l'ordonnancement ne sont pas ajoutés.

## Fichiers et vérification

- `src/server/cite-admin.mjs` : enregistrement individuel sur un créneau futur explicitement validé, révision et audit par Conseil.
- `src/server/cite-council-planning.mjs` : trame, aperçu serveur et capacité de publication de chaque créneau futur.
- `web/assets/cite/planning.js` : sélection, reprise d'un brouillon, ancre locale, protection des modifications non enregistrées et maintien du texte d'import.
- Trois tests ciblés : coût et absence d'effet de bord d'un futur brouillon, révisions concurrentes/importées indépendantes, refus de sauter l'ordre ou de modifier un publié.
- Une intégration Auth/Firestore : persistance, concurrence, aperçu du futur, prochain créneau préservé et absence d'action de jeu.
- Deux nouveaux parcours navigateur, ordinateur/mobile : sauvegarde/rechargement d'une sélection future, texte d'import conservé, sélecteur verrouillé pendant l'édition, publication désactivée et conflit entre onglets. Les parcours de publication et d'import précédents restent dans la vérification du composant.

Vérifications locales réussies : 146 tests Cité, 23 intégrations HTTP Auth/Firestore, 10 parcours navigateur de préparation/publication/import sur ordinateur/mobile, TypeScript, compilation web et liste publique stricte. La capture mobile du sélecteur a été inspectée. Les quatre workflows du précédent `17dd4ac` sont réussis ; la CI du nouveau commit reste à vérifier.

Aucun déploiement, donnée client, achat ou règle Firebase modifié. La réconciliation GitHub/version Voyage historiquement publiée reste obligatoire avant publication.
