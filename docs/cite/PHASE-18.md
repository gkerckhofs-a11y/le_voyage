# Phase 18 — Accueil des collaborateurs avant démarrage

4 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14. Source : V1.0, §§ 2.4, 9.1, 9.2 et 12. Aucun arbitrage P0 supplémentaire.

## Problème corrigé

Un collaborateur affecté à un futur pilote pouvait sélectionner son espace et ouvrir Mes choix, mais Notre Cité refusait toute lecture tant que son appartenance datée n'avait pas commencé. L'écran présentait alors cet accès légitime comme indisponible et nécessitait un rechargement pour repartir. Le parcours d'affectation de la phase 17 indiquait pourtant une préparation possible avant le premier lundi.

## Résultat

GET `/api/cite/family` renvoie maintenant une projection `phase: upcoming` pour un membre explicitement affecté à un pilote dont le premier lundi est futur, lorsque son appartenance commence exactement ce lundi et couvre cette date. La projection contient uniquement la date courante de jeu, la date de démarrage, le nom de la Cité, le nom de sa famille et son propre statut de délégué au financement.

Le navigateur affiche un accueil avec sa famille, son premier lundi, un lien pour préparer Mes choix et l'explication du calendrier. Il ne génère ni formulaire de rituel, ni bulletin, ni financement. La vue commune n'est pas proposée avant démarrage. Aucune bourse, jauge, ambition secrète, note, historique ou donnée de Conseil/crise n'est transférée dans cette réponse. La lecture ne modifie aucun état.

Les écritures hebdomadaires, votes et engagements restent refusés côté serveur avant le premier lundi. La nouvelle exception n'est utilisable que par la lecture ; elle n'est pas contrôlable depuis une commande client. Elle ne couvre ni une autre famille, ni une autre entreprise, ni une future arrivée générique en cours de saison, ni une appartenance terminée. Les sessions et autorisations existantes restent obligatoires.

À partir du premier lundi, la lecture redevient le parcours habituel `phase: active`, selon l'appartenance datée et les fenêtres existantes. Le bouton Actualiser suffit : aucun transfert de données, migration de compte ou changement d'espace n'est requis. La première autoévaluation suit les règles normales et ne crédite rien à elle seule. Les votes et financements restent liés au calendrier des Conseils, sans ouverture anticipée.

L'interface masque l'accueil et reconstruit les sections de jeu au démarrage. Si une réponse d'attente succède à une vue active en environnement de test, les valeurs privées précédemment affichées sont retirées du DOM. Un retrait d'affectation supprime l'accueil et son lien de préparation lors du prochain accès serveur, comme pour le parcours actif. Pas de canal temps réel ni d'actualisation automatique.

## Fichiers et vérification

- `src/server/cite-family.mjs` : autorisation limitée de lecture avant démarrage et deux phases de projection.
- `web/cite-family.html`, `.css`, `web/assets/cite/family.js` : accueil, préparation des choix, purge des valeurs et transition vers le jeu.
- Le test d'affectation de la phase 17 attend désormais l'accueil avant le lundi, puis l'éligibilité normale à partir de cette date.
- Six tests ciblés : projection minimale sans écriture, confidentialité, blocage de toutes les actions, délégation personnelle, éligibilité au lundi et refus des portées/appartenances incorrectes.
- Deux intégrations Auth/Firestore : accueil après sélection réelle du nouvel espace, absence d'écriture et révocation ; réponse active des scénarios existants conservée.
- Trois parcours navigateur, ordinateur/mobile : accueil et aller-retour Mes choix, révocation et retrait du lien, transition vers la première autoévaluation. Le test de transition avance uniquement le calendrier de sa fixture isolée, sans route d'accélération dans l'application.

Vérifications locales réussies : 143 tests Cité, 22 intégrations HTTP Auth/Firestore, TypeScript, compilation web et liste publique stricte. Les six parcours navigateur d’accueil, révocation et transition sur ordinateur/mobile ont réussi ; les deux parcours de transition ont été exécutés séparément après leur ajout. La capture mobile de l’accueil a été inspectée. Les quatre workflows du précédent `11d3d5d` sont réussis ; la CI du nouveau commit reste à vérifier.

## Limites

Le flux concerne seulement les pilotes de quatre Conseils et leurs affectations initiales. Pas d'invitation ni de création de compte, aucun changement des règles de vote/revenus/récompenses, aucune ouverture automatique des Conseils. Restent les arrivées/départs en cours de saison et les autres fonctions d'exploitation.

Aucun déploiement, donnée client, achat ou règle Firebase modifié. La réconciliation GitHub/version Voyage historiquement publiée reste obligatoire avant publication.
