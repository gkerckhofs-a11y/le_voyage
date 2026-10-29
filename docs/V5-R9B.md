# V5 — R9B : sessions partagées et chiffrées

Tranche du 29 octobre 2026. Branche `work/v2-phase1-engine`, PR #1. Parent vérifié : `1460cd6498bf657ef3ff9fd94ec93fbb14dd7dbe`. Le commit final et sa CI sont référencés dans la PR : https://github.com/gkerckhofs-a11y/le_voyage/pull/1.

## Périmètre

| État | Fichiers et comportement |
| --- | --- |
| Nouveau | `src/server/session-store.mjs` : stockage Firestore partagé, identifiant de document dérivé du cookie par SHA-256, contenu AES-256-GCM lié à cet identifiant, expiration vérifiée à chaque lecture. |
| Modifié | `src/server/firebase-http.mjs` : remplacement de la Map locale ; rotation atomique lors du changement d’espace, déconnexion partagée, cookie limité à la durée restante. |
| Nouveau | `tests/firebase/session-store.test.mjs` : chiffrement, altération, expiration, concurrence, remplacement du processus HTTP et déconnexion entre instances. |
| Nouveau | `tests/access/session-store-config.test.mjs` : refus du staging sans clé dédiée. |
| Nouveau | Ce rapport et quatre captures `docs/evidence/v5-r9b-*.png`. |
| Inchangé | Moteur métier, barèmes, quatre espaces et droits, règles Firestore, identité visuelle, configuration distante Firebase, production. |

Une session de 55 minutes survit au remplacement d’un processus serveur. Deux changements d’espace concurrents ne peuvent pas conserver deux sessions valides : une seule transaction gagne. Le jeton CSRF est renouvelé ; les anciennes requêtes sont refusées. Aucun jeton de rafraîchissement Firebase n’est stocké. Les autorisations métier restent vérifiées par les services existants.

## Vérifications réellement exécutées

- `npm run typecheck` : succès.
- `npm run build:web` : succès.
- `node --test tests/access/session-store-config.test.mjs tests/access/staging.test.mjs` : **5/5**.
- `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore 'node --test tests/firebase/session-store.test.mjs tests/firebase/workspaces.test.mjs tests/firebase/four-workspaces.test.mjs tests/firebase/limited-modes.test.mjs tests/firebase/http.test.mjs && npx playwright test --config playwright.local-check.config.mjs tests/firebase-browser/workspaces.spec.mjs tests/firebase-browser/limited-modes.spec.mjs tests/firebase-browser/invitation.spec.mjs'` : **9/9 serveur et 6/6 navigateur**.

Soit 20 tests ciblés distincts. Le navigateur local utilise Chromium 141 disponible dans cet environnement, avec une configuration temporaire supprimée après exécution ; la CI conserve sa configuration verrouillée. La première exécution de six tests serveur est incluse dans les neuf, sans double comptage. Aucune connexion à des données de production.

## Captures de régression inspectées

- [Espaces desktop](evidence/v5-r9b-spaces-desktop.png)
- [Espaces mobile](evidence/v5-r9b-spaces-mobile.png)
- [Kiosque desktop](evidence/v5-r9b-kiosk-desktop.png)
- [Kiosque mobile](evidence/v5-r9b-kiosk-mobile.png)

## Limites et suite

Ce résultat est codé et testé sur émulateur ; il n’est pas déployé. Le staging devra recevoir une clé stable `RC_SESSION_ENCRYPTION_KEY` de 256 bits (64 caractères hexadécimaux) avant tout démarrage de cette version. La clé publique de démonstration est réservée à l’adaptateur émulateur vérifié. L’absence de clé en staging bloque le démarrage. Une rotation de clé invalide les sessions précédentes ; aucun mécanisme de coexistence des clés n’est livré ici.

Les sessions expirées sont refusées mais leur purge physique reste à prévoir avant le pilote réel. Les erreurs de base ne basculent pas vers un stockage mémoire. Les accès actuels restent ceux du dispositif de démonstration : l’authentification réelle et le provisionnement des comptes constituent la prochaine tranche R9C. Les autres limites du rapport R9A restent ouvertes, notamment activation de campagne, validation KPI, branchement Master Sheets réel et recette distante.

Aucune URL distante n’a été revalidée pour cette tranche. Aucun merge main, migration, nouveau service payant ou déploiement Firebase n’a été effectué. La dernière tranche et le passage au déploiement de test seront annoncés après levée des prérequis et recette correspondante.

## Correctif après CI

Le premier commit R9B `6888940` a passé trois CI mais échoué sur le parcours invitation desktop (93 parcours navigateur réussis, un échec, deux ignorés). L’acceptation mettait encore à jour la portée de session en mémoire. Elle l’enregistre désormais dans le stockage partagé avec contrôle de version et expiration, sans renouveler le cookie afin de permettre la reprise après perte de réponse. Une session remplacée ne peut pas être recréée par cette mise à jour. Le test de régression du stockage et le parcours invitation desktop/mobile passent dans les commandes ciblées ci-dessus. Le statut de la CI du correctif est consigné dans la PR.
