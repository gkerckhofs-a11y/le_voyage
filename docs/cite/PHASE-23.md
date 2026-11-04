# Phase 23 — Prévisualisation Firebase accessible, 4 novembre 2026

Après accord explicite de l’utilisateur pour la modification IAM, le droit `roles/run.invoker` à `allUsers` a été ajouté au seul service `voyage-test-cite` du projet `rc-voyage-test-20261027`. La garde Google et les autorisations de saison restent actives. Aucun autre service n’a reçu cet accès.

## Version publiée

- URL de connexion : https://rc-voyage-test-20261027--cite-pilot-rb5ff9f6.web.app/test-access
- Canal Firebase Hosting : `cite-pilot`, version `6d348c10230926a5`, expiration le 11 novembre 2026 à 09:24 UTC.
- Cloud Run : `voyage-test-cite-00002-fcx`, région `europe-west1`.
- Image et construction : mêmes empreinte et build que la phase 22. La seconde révision ne change que les origines de prévisualisation dans l’environnement.
- Le premier canal préparé a été remplacé avant communication de son lien : des réponses 404 obtenues avant publication restaient en cache. Le nouveau canal a été publié avant toute vérification HTTP de ses pages.

## Vérifications distantes réalisées

À 09:26 UTC, sur l’adresse finale :

| Requête anonyme | Résultat |
|---|---|
| `/test-access` | 200, page de connexion, `private, no-store` |
| `/test-access/config` | 200, origine canonique exacte, cookie HttpOnly/Secure/SameSite=Lax |
| `/api/cite/admin` | 401, aucune donnée administrative |
| `/cite-admin.html` | 303 vers la page de connexion |

Dans le navigateur, le bouton « Continuer avec Google » est visible et activé. L’écran de connexion commun conserve pour le moment les textes historiques du Voyage. L’utilisateur doit ensuite ouvrir l’espace « La Cité — pilote de test » avec son compte Google propriétaire déjà autorisé.

Le pilote de seize semaines commence le 9 novembre 2026. Ses trois familles sont encore sans membres affectés ; aucun score, vote, financement ou cadeau n’a été ajouté. L’espace organisateur permet sa préparation. La recette distante complète après connexion Google reste à réaliser par le propriétaire ; les tests connectés décrits dans les phases précédentes sont ceux des émulateurs.

Le service historique `voyage-test` reste sur `voyage-test-00027-wbc`, avec son trafic inchangé. Aucun déploiement Hosting live ni modification du projet de production `le-voyage-f0ae3`.

## Traçabilité des sources

Le code réellement construit est le commit local réconcilié `05b2d51cfbfa0f0e3968a42753e13dc9307e72a3`, archivé dans le bucket privé indiqué en phase 22. Le bundle `gs://rc-voyage-test-20261027-build-source/cite-staging-reconciliation-05b2d51.bundle` conserve l’historique réconcilié jusqu’au rapport de la phase 22 (`e25b2bc`). La branche de revue GitHub conserve le socle historique antérieur ; les fichiers historiques restaurés et leurs images sont dans cette archive et ce bundle. Ne pas confondre le dernier commit de la PR avec les sources de l’image publiée.
