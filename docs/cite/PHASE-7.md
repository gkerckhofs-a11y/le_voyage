# Phase 7 — Cockpit La Cité authentifié

Date : 3 novembre 2026. Référence : cahier V1.0, §§ 8.5, 9.4, 10 et 12. Le Cockpit Cité peut maintenant être ouvert depuis la connexion Firebase et le sélecteur d'espaces existants, avec préparation et réservation persistées dans Firestore de test. Aucun déploiement n'est effectué.

## Intégration et fichiers

| Fichier | Changement |
|---|---|
| `src/server/workspaces.mjs` | Nouveau type d'espace `cite-gifts`, destination et validation stricte d'entreprise/saison/famille |
| `src/server/cite-cockpit-http.mjs` | Contrôleur authentifié de lecture, préparation, revue, réouverture, réservation et libération |
| `src/server/firebase-http.mjs` | Enregistrement du contrôleur avec les sessions existantes et cloisonnement des routes |
| `src/server/cite-gift-preparation.mjs` | Noms de bénéficiaires lus dans l'entreprise autorisée, sans élargir la projection des préférences |
| `web/cite-cockpit.html`, `web/cite-cockpit.css`, `web/assets/cite/cockpit.js` | Écran du Cockpit, actualisation, déconnexion et traitement d'un accès retiré |
| `src/web/workspaces.ts`, `src/web/login.ts` | Ouverture du nouvel espace et intitulés de connexion adaptés au contexte Cité |
| `scripts/build-web.mjs` | Copie explicite des seuls éléments publics réutilisés du panneau Cité, sans serveur ni fixtures |
| `src/server/cite-cockpit-demo.mjs`, `scripts/serve-cite-cockpit.mjs` | Comptes et deux entreprises fictives, exclusivement sur émulateurs |

L'authentification, le stockage chiffré des sessions et la rotation des cookies/CSRF sont ceux de l'application existante. Le nouvel écran n'a ni sélecteur de personnage ni endpoint donnant un rôle par simple choix d'interface. Le widget de préparation est réutilisé depuis la même source que le prototype local ; seule son enveloppe authentifiée et sa persistance changent.

## Accès autorisé à une saison

Une entrée du répertoire serveur a la forme `{id, space: 'cite-gifts', tenantId, seasonId, familyId, label}`. Ce répertoire ne constitue jamais une autorisation en lui-même : la sélection vérifie une adhésion active à l'entreprise et la capacité `citeRewardOperations` pour la saison. La famille de contexte doit exister. Un ancien accès au Cockpit Voyage ne crée pas automatiquement cet accès Cité, et réciproquement.

La connexion provisionnée utilise les contrôles existants : identité Firebase vérifiée récemment, e-mail vérifié et espace effectivement autorisé. Aucune provision de rôle ou d'entreprise n'est exposée dans les nouvelles routes.

Après sélection, l'entreprise et la saison proviennent de la session serveur. Les commandes ne peuvent pas fournir ou remplacer leur périmètre. Chaque requête revalide l'espace et les droits ; une entrée retargetée dans le répertoire ne peut pas changer silencieusement le périmètre d'une session déjà ouverte.

Changer d'espace fait tourner cookie et CSRF. Un ancien cookie est refusé et un formulaire resté ouvert ne peut pas enregistrer dans la nouvelle entreprise avec son ancien CSRF. Les lectures ou modifications des anciennes routes métier sont refusées depuis l'espace Cité. Le sélecteur d'espaces et la déconnexion restent disponibles.

## Interface et données

`GET /api/cite/cockpit` fournit uniquement le nom de la cité, son périmètre autorisé, le CSRF et la projection logistique déjà limitée aux opérateurs. Les mutations `prepare`, `review`, `reopen`, `reserve`, `release` acceptent seulement une commande ; elles utilisent les services transactionnels des phases précédentes.

Le Cockpit affiche les noms enregistrés des bénéficiaires, leurs attentions, préférences utiles, propositions et disponibilités. Les notes individuelles, bulletins et objectifs secrets ne sont pas ajoutés. Les dates d'anniversaire et empreintes de préférences ne sont pas envoyées. Le widget conserve les verrouillages après revue/réservation.

Un rechargement relit les propositions enregistrées, sans les recréer. Après une erreur de mutation, l'interface recharge l'état serveur et ne réémet pas automatiquement l'action. Si l'accès disparaît, elle retire le panneau et les données affichées ; une session absente/expirée renvoie vers la connexion. Ce retrait d'interface ne remplace pas les refus serveur.

## Démonstration sur émulateurs

Préparer avec `npm run build:web`, puis lancer :

```sh
npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore "node scripts/serve-cite-cockpit.mjs"
```

Ouvrir `http://127.0.0.1:4176/connexion.html?app=cite`. Compte entièrement fictif : `cite-clem@example.test`, mot de passe `Fictitious-Cite-Only-42!`. Ces identifiants sont publics par conception et valables uniquement dans cet émulateur ; ils ne désignent aucun compte client réel.

Les deux espaces sont « La Cité des Ateliers » et « La Cité du Verger ». Le premier possède les trois options de récompense fictives, le second uniquement la participation. Les noms et le catalogue sont fictifs ; les dates de préparation sont fixées au scénario accéléré du 1er mars 2027. Le script ne peut pas s'exécuter sur Cloud Run ou hors des émulateurs explicitement attendus. Il ne réinitialise les données que sur option explicite de test, dans son propre périmètre fictif.

## Vérifications ciblées

71 tests Cité, TypeScript et compilation web vérifiés localement. Deux nouveaux tests du contrôleur couvrent l'espace sélectionné, les droits retirés, les CSRF périmés et les champs de périmètre/identité forgés.

La CI émulateur ajoute deux tests HTTP authentifiés aux deux tests transactionnels précédents : persistance, deux entreprises, cookie et formulaire obsolètes, déconnexion, retrait d'accès et répertoire retargeté. Les tests historiques `workspaces.test.mjs` et `provisioned-login.test.mjs` sont exécutés dans ce même environnement pour contrôler les chemins d'accès réutilisés.

Quatre parcours navigateur authentifiés sont prévus, sur ordinateur et mobile : connexion, préparation/réservation, rechargement persistant, changement d'entreprise, déconnexion et révocation d'une page ouverte. Ils complètent les quinze parcours du prototype local. Les résultats doivent être vérifiés sur le commit publié avant de les déclarer réussis. Les nouvelles captures sont dans `cite-authenticated-cockpit-evidence`.

## Limites et suite

Cette tranche est intégrée au serveur existant, mais reste autorisée seulement sur les adaptateurs de test. Elle ne publie pas l'application et ne réconcilie pas encore les sources GitHub historiques avec la version Voyage réellement déployée. Cette réconciliation demeure un préalable à une publication.

Le Cockpit Cité ne remplace pas encore l'ensemble du Cockpit historique : import Master/administration catalogue, paramétrage contractuel des plans, gestion des préférences depuis les affectations Cité et logistique de commande/réception/livraison restent à raccorder. Les routes publiques de jeu familial et d'organisation de la saison, archives et pilote humain restent aussi à traiter. Aucun achat, commande fournisseur ou traitement de données client réelles n'est effectué.
