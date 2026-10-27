# Firebase — base provisionnée le 27 octobre 2026

Ce relevé complète l'inventaire initial de `PHASE-0.md`. Après le raccordement en lecture, l'utilisateur a demandé de choisir une base adaptée à la suite de son passage à Blaze. La tranche provisionne une base vide ; elle ne publie pas l'application.

## Cible constatée

| Élément | Valeur vérifiée |
|---|---|
| Projet Firebase | `le-voyage-f0ae3` |
| Nom du projet | Le voyage |
| État | ACTIVE |
| Application web | `levoyage` |
| App ID | `1:885366322482:web:5ac461410494735993d32b` |
| Site Hosting | `le-voyage-f0ae3` |
| URL déclarée par Hosting | https://le-voyage-f0ae3.web.app |
| Canal Hosting | `live` |

L'existence du site et du canal n'atteste pas qu'une version de l'application V2 y soit déployée. Aucun déploiement n'a été réalisé dans cette session. Aucun canal de staging n'est retourné par la liste consultée.

## Choix et état vérifié

Cloud Firestore Standard en mode natif est retenu pour les collections par entreprise/campagne, les filtres du cockpit et les transactions nécessaires aux attributions idempotentes. Le moteur pur reste indépendant du stockage. Le choix régional `europe-west1` (Belgique) privilégie la proximité et le coût régional ; la région ne pourra pas être changée sur cette instance.

| Élément | Valeur relue après création |
|---|---|
| Facturation du projet | `billingEnabled: true` |
| API activée dans cette tranche | `firestore.googleapis.com` |
| Base | `projects/le-voyage-f0ae3/databases/(default)` |
| Création UTC | `2026-10-27T11:40:40.315387Z` |
| Édition / mode | `STANDARD` / `FIRESTORE_NATIVE` |
| Région | `europe-west1` |
| Protection contre la suppression | `DELETE_PROTECTION_ENABLED` |
| Restauration à un instant donné (PITR) | `POINT_IN_TIME_RECOVERY_DISABLED` |
| Collections de premier niveau | Aucune ; pas de page suivante |
| Règles personnalisées publiées | Aucune release retournée |
| Lecture anonyme d'un document / liste de collection | HTTP 403 `PERMISSION_DENIED` dans les deux cas |

La base conserve le refus d'accès client par défaut de la création CLI. Aucune règle permissive ni règle applicative n'a été publiée. Aucun document n'a été écrit. Les accès serveur dépendent des permissions IAM : le refus des accès anonymes ne constitue pas un test d'isolation entre clients authentifiés.

La protection contre la suppression n'est pas une sauvegarde. Sauvegardes planifiées, PITR, budget d'alerte, rôles IAM applicatifs et politique de conservation restent à préparer avant les données réelles. La localisation européenne ne vaut pas validation RGPD.

Sources techniques : [comparaison officielle des bases Firebase](https://firebase.google.com/docs/firestore/rtdb-vs-firestore), [régions Firestore](https://firebase.google.com/docs/firestore/locations).

## Vérifications exécutées

- `firebase projects:list --json` : succès ; projet identifié sans supposer son nom technique.
- `firebase apps:list --project le-voyage-f0ae3 --json` : succès ; une application web existante.
- `firebase hosting:sites:list --project le-voyage-f0ae3 --json` : succès ; site existant.
- `firebase hosting:channel:list --site le-voyage-f0ae3 --project le-voyage-f0ae3 --json` : succès avec un fichier de configuration temporaire d'inspection ; canal `live` retourné.
- `firebase firestore:databases:list --project le-voyage-f0ae3 --json` : HTTP 403 initial (API désactivée), puis succès avec liste vide après activation et avant création.
- API Cloud Billing `GET /v1/projects/le-voyage-f0ae3/billingInfo` : facturation active. Aucun changement de compte de facturation.
- `firebase firestore:locations --project le-voyage-f0ae3 --json` : succès ; `europe-west1` disponible.
- `firebase firestore:databases:create '(default)' --location europe-west1 --edition standard --delete-protection ENABLED --point-in-time-recovery DISABLED --project le-voyage-f0ae3 --non-interactive --json` : succès.
- API Firestore `GET /v1/projects/le-voyage-f0ae3/databases/(default)` : région, édition, mode et protection relus conformément au tableau.
- API Firestore `POST /v1/projects/le-voyage-f0ae3/databases/(default)/documents:listCollectionIds` avec `pageSize: 1` : liste vide. Cette opération ne crée pas de données.
- API Firebase Rules `GET /v1/projects/le-voyage-f0ae3/releases` : liste vide.
- Deux requêtes HTTP sans authentification : `GET .../documents/securityProbes/nonexistent` et `GET .../documents/securityProbes?pageSize=1` : refus HTTP 403, message `Missing or insufficient permissions.` Aucun document de test créé.
- Le premier essai de lecture utilisait un nom de collection réservé (`__access_probe__`) et a retourné HTTP 400 ; ce résultat ne prouvait rien sur les droits. Les deux contrôles précédents utilisent un chemin valide.

Le changement dans le dépôt est documentaire : `git diff --check` vérifié, aucun test métier relancé. Le moteur reste celui du commit `753d281336f0856fb21974dfef9785268865d5aa`, dont les deux exécutions CI sont réussies (29 tests, vérification TypeScript et simulation reproductible). Le workflow exclut les changements limités à la documentation.

## Suite

Tranche d'infrastructure rattachée à la phase 1 : choix et provisionnement couverts ; persistance métier durable et intégration non réalisés. Préparer l'adaptateur Firestore et ses tests sur émulateur avec des données fictives ; vérifier l'idempotence transactionnelle et les accès par tenant avant raccordement. Aucun écran V2 ni environnement applicatif de staging n'est livré par cette tranche. Aucun déploiement Hosting/Functions, aucune fusion sur `main` ; leur autorisation reste distincte.

Aucun code d'autorisation, jeton, clé privée ou mot de passe n'est enregistré dans le dépôt.
