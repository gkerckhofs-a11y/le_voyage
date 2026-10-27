# Accès Google à la préproduction — 27 octobre 2026

Reprise depuis `18332e6`, branche `work/v2-phase1-engine`, PR #1. Demande : remplacer l’identifiant/mot de passe partagé par le compte Google du propriétaire du projet de test. Le compte autorisé est configuré côté serveur, hors dépôt ; il a été identifié dans la connexion Firebase CLI existante. Production inchangée.

## Implémentation

- Fournisseur Google activé uniquement sur `rc-voyage-test-20261027`, avec les deux domaines Hosting du projet. Le fournisseur email/password des profils fictifs reste actif pour leurs échanges serveur internes.
- Page publique minimale « Continuer avec Google », redirection Firebase Auth sur le même domaine Hosting pour éviter une dépendance aux cookies tiers. SDK Firebase compat 12.0.0 chargé depuis le CDN officiel, sans nouvelle dépendance npm.
- Le serveur vérifie le jeton Firebase, sa révocation, `google.com`, l’adresse vérifiée et la liste explicite des testeurs autorisés. Authentification récente exigée (cinq minutes).
- Échange protégé par origine exacte et nonce CSRF lié au cookie de préconnexion. Nouvelle session opaque après authentification, cookie HttpOnly/Secure/SameSite=Lax. Validité maximale huit heures ; expiration et révocation vérifiées avant l’accès. Sessions en mémoire : une relance du serveur exige une reconnexion.
- Firebase Hosting transmet seulement le cookie `__session`. Celui-ci reste celui de l’accès Google ; le jeton du profil fictif est conservé côté serveur. Un cookie de démonstration seul ne déverrouille aucune page ni API.
- Le bouton de déconnexion du profil ferme aussi la session du serveur de test. Changer de profil reste possible sans reconnecter Google.
- En mode Google, aucun repli sur le mot de passe Basic. L’ancien mode reste dans le code uniquement pour revenir explicitement à une ancienne configuration si nécessaire.

Aucun mail, contact, calendrier ou document Google n’est demandé. Les données de jeu restent fictives ; les profils sont partagés entre testeurs autorisés. Une authentification Google réussie ne donne pas de droits sur Firestore client (règles toujours fermées).

## Vérifications et limites

`node --test tests/access/*.test.mjs` : 16 tests réussis. Nouveaux tests : pages/API protégées, refus Basic, autre compte, email non vérifié, mauvais fournisseur, jeton ancien/invalide, origine/CSRF, changement de profil, cookie unique Hosting, déconnexion, révocation et expiration. Fournisseur d’identité simulé dans ces tests : aucune connexion personnelle Google n’est simulée comme une preuve réelle.

`node --check scripts/serve-staging.mjs`, `node --check src/server/test-access/access.js`, `git diff --check` réussis. [CI accès](https://github.com/gkerckhofs-a11y/le_voyage/actions/runs/40549497900) réussie : 16 tests. Le compte Google réel n’est pas utilisé par les tests automatisés.

Premier déploiement `63a16c7` : le contrôle HTTP a détecté une boucle de redirection sur la page d’entrée, car Hosting transmet le Host du service Cloud Run. Correction `da6df82` : Host contrôlé parmi les origines serveur connues, origine navigateur canonique toujours exigée pour les POST ; canonicalisation côté navigateur pour l’accès direct au service. Nouveau test du Host de relais. Première recette Cloud `60830d0f-80c2-46a0-b807-b9606a042d1b` interrompue après cette détection, non présentée comme réussie.

Code corrigé `da6df8236f360608c5f437c30b033e05fb79baf1`. Construction Cloud `daaeb925-0702-4b43-8d2d-680b584f9e6b`, image `sha256:b78846a360cfb86445830e467295a16aec823abfae9e016e7893cd20a1351d7d`, révision prête `voyage-test-00006-rtm`. Mode serveur `google`, aucun mot de passe Basic injecté dans cette révision.

[CI Firebase](https://github.com/gkerckhofs-a11y/le_voyage/actions/runs/40549498133) réussie, ainsi que moteur et accès. Contrôle HTTP réel : `/connexion.html` redirige vers `/test-access` ; cette page répond 200 ; `/api/gifts/ops` répond 401 sans session et sans défi Basic. [Recette navigateur Cloud](https://console.cloud.google.com/cloud-build/builds;region=europe-west1/0a1eddc1-0923-4a57-a195-352bfed39c67?project=632904531433) réussie : `node scripts/smoke-google-access.mjs`, ordinateur 1440×900 et mobile 390×844. Vérification du refus des API sans session, chargement du SDK et bouton actif, navigation vers `accounts.google.com` sans erreur OAuth détectée. Aucun identifiant personnel saisi ; le retour après authentification réelle reste à valider par le propriétaire.

Captures inspectées : [ordinateur](evidence/google-access-desktop.png), [mobile](evidence/google-access-mobile.png). [Résultat horodaté](evidence/google-access-result.json), avec `accountLoginVerified: false` explicitement indiqué. La CI des cartes [40549498062](https://github.com/gkerckhofs-a11y/le_voyage/actions/runs/40549498062) et du moteur [40549498049](https://github.com/gkerckhofs-a11y/le_voyage/actions/runs/40549498049) sont aussi vertes. Aucune modification du cockpit ou du moteur métier.

La connexion complète avec le compte personnel nécessite une action du propriétaire dans l’écran Google. Aucun mot de passe Google ou code de connexion ne doit être transmis au développeur.

## Sources techniques

Google/Firebase, documentation consultée le 27 octobre 2026 : [connexion Google](https://firebase.google.com/docs/auth/web/google-signin), [configuration des fournisseurs par CLI](https://firebase.google.com/docs/auth/configure-providers-cli), [sessions serveur et révocation](https://firebase.google.com/docs/auth/admin/manage-cookies), [cookie Hosting `__session`](https://firebase.google.com/docs/hosting/manage-cache).
