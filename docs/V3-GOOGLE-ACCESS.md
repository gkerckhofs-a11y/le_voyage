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

`node --test tests/access/*.test.mjs` : 15 tests réussis. Nouveaux tests : pages/API protégées, refus Basic, autre compte, email non vérifié, mauvais fournisseur, jeton ancien/invalide, origine/CSRF, changement de profil, cookie unique Hosting, déconnexion, révocation et expiration. Fournisseur d’identité simulé dans ces tests : aucune connexion personnelle Google n’est simulée comme une preuve réelle.

`node --check scripts/serve-staging.mjs`, `node --check src/server/test-access/access.js`, `git diff --check` réussis. CI, version déployée et recette navigateur à compléter.

La connexion complète avec le compte personnel nécessite une action du propriétaire dans l’écran Google. Aucun mot de passe Google ou code de connexion ne doit être transmis au développeur.

## Sources techniques

Google/Firebase, documentation consultée le 27 octobre 2026 : [connexion Google](https://firebase.google.com/docs/auth/web/google-signin), [configuration des fournisseurs par CLI](https://firebase.google.com/docs/auth/configure-providers-cli), [sessions serveur et révocation](https://firebase.google.com/docs/auth/admin/manage-cookies), [cookie Hosting `__session`](https://firebase.google.com/docs/hosting/manage-cache).
