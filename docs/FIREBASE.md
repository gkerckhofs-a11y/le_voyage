# Firebase — raccordement vérifié le 27 octobre 2026

Ce relevé complète l'inventaire initial de `PHASE-0.md`. Il décrit des lectures effectuées après l'autorisation de connexion de l'utilisateur, sans modification de service distant.

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

## Base de données et droits

`firestore:databases:list` retourne HTTP 403 : l'API Cloud Firestore n'a pas été utilisée dans ce projet ou est désactivée. L'existence, la région et la configuration d'une base ne sont donc pas vérifiables par cette lecture. Aucun service n'a été activé automatiquement.

La connexion et les lectures de métadonnées Firebase/Hosting sont confirmées. Elles ne prouvent pas que toutes les permissions d'administration, de création de base ou de déploiement soient disponibles.

## Vérifications exécutées

- `firebase projects:list --json` : succès ; projet identifié sans supposer son nom technique.
- `firebase apps:list --project le-voyage-f0ae3 --json` : succès ; une application web existante.
- `firebase hosting:sites:list --project le-voyage-f0ae3 --json` : succès ; site existant.
- `firebase hosting:channel:list --site le-voyage-f0ae3 --project le-voyage-f0ae3 --json` : succès avec un fichier de configuration temporaire d'inspection ; canal `live` retourné.
- `firebase firestore:databases:list --project le-voyage-f0ae3 --json` : échec HTTP 403 décrit ci-dessus.

Ce changement est documentaire : aucun test métier relancé. Le moteur reste celui du commit `753d281336f0856fb21974dfef9785268865d5aa`, dont les deux exécutions CI sont réussies (29 tests, vérification TypeScript et simulation reproductible).

## Suite

Préparer l'adaptateur Firestore et ses tests sur émulateur avec des données fictives ; vérifier l'idempotence transactionnelle et les accès par tenant. La sélection de la région, l'activation des services et la configuration du staging devront être explicites avant toute modification distante. L'accord de connexion n'autorise ni une fusion sur `main`, ni un déploiement de production.

Aucun code d'autorisation, jeton, clé privée ou mot de passe n'est enregistré dans le dépôt.
