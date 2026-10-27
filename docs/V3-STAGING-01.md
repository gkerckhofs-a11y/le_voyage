# Préproduction — préparation du 27 octobre 2026

## Autorisation et périmètre

À la demande de tester avant le cockpit cadeaux P0, création autorisée d’un projet Firebase séparé et préparation de son raccordement. Aucun accord pour activer la facturation. Départ réel : `90baa51b08253510d455d555ee55c3adbb503bb5`, branche `work/v2-phase1-engine`, PR #1. Aucun changement de main ou de la production `le-voyage-f0ae3`.

## Ressources réellement créées

- Projet Google Cloud et Firebase : `rc-voyage-test-20261027`, numéro `632904531433`, nom `Le Voyage Tests`.
- Lecture Cloud Billing : HTTP 200, `billingEnabled:false`.
- API Firestore activée pour ce projet seulement.
- Base `(default)` : Firestore Native Standard, région `europe-west1`, `freeTier:true`, protection contre la suppression activée, PITR désactivé. Création confirmée le 27 octobre 2026 à 16:04:36 UTC.
- Aucune donnée de démonstration ou donnée réelle chargée ; aucune migration depuis la production.

Console du projet : https://console.firebase.google.com/project/rc-voyage-test-20261027/overview

## Configuration et vérifications

`firebase/test.json` réutilise les règles existantes `firebase/firestore.rules` : tous les accès clients directs sont refusés. Cette configuration ne contient ni Hosting ni Functions ; la cible est toujours fournie explicitement avec `--project rc-voyage-test-20261027`.

Commandes exécutées :

```sh
firebase projects:create rc-voyage-test-20261027 --display-name 'Le Voyage Tests' --non-interactive --json
firebase firestore:databases:create '(default)' --location europe-west1 --edition standard --delete-protection ENABLED --point-in-time-recovery DISABLED --project rc-voyage-test-20261027 --non-interactive --json
firebase deploy --only firestore:rules --project rc-voyage-test-20261027 --config firebase/test.json --non-interactive --json
```

La première création a refusé le tiret typographique du nom d’affichage ; le nom ASCII a réussi. La première création de base a signalé une API Firestore désactivée ; après activation autorisée, création réussie. Déploiement des règles : succès confirmé par la CLI (code de sortie 0, statut `success`).

Lecture REST sans authentification de `tenants/probe` : HTTP 403 `PERMISSION_DENIED`, comme attendu. Ce contrôle ne remplace pas la future recette des comptes testeurs.

Validation locale du JSON et de sa portée Firestore uniquement : réussie ; `git diff --check` réussi. Aucun code applicatif modifié, aucune suite métier relancée. Les preuves applicatives restent celles de V3-D10 ; elles concernent les émulateurs, pas ce projet Cloud.

## Raccordement proposé avant ouverture aux testeurs

1. Conserver ce projet exclusivement pour les tests. Préparer une identité de service limitée à ce projet et des secrets distincts ; aucune clé privée dans Git.
2. Adapter le serveur Node existant pour Firestore/Auth Cloud avec cible de test explicitement autorisée. Ne pas retirer les gardes des émulateurs. Remplacer le sélecteur de profils ouvert par un accès réservé aux testeurs ; traiter les sessions pour plusieurs instances et le cookie derrière Hosting.
3. Construire un conteneur du serveur existant sur Cloud Run, région `europe-west1`, minimum zéro instance et maximum une instance pour ce pilote. Limiter les accès et mettre en place le suivi des coûts. Ce maximum ne constitue pas un plafond de dépenses.
4. Raccorder Firebase Hosting au serveur, puis charger uniquement les scénarios fictifs Lex EKHO/TPE. Vérifier connexion, questionnaires, clôture, rechargement, séparation des clients et absence de cadeaux futurs dans les réponses.
5. Fournir l’URL et les consignes de test après recette en ligne. Aucun lien présenté comme application opérationnelle avant cette vérification.

## Blocage financier explicite

Cloud Run exige un compte Cloud Billing associé au projet, même avec ses quotas gratuits. L’association fait passer le projet Firebase au forfait Blaze. Aucun compte de facturation associé et aucun service Cloud Run/Build/Artifact Registry activé dans cette tranche. Autorisation distincte requise avant ces opérations ; aucune promesse de coût nul.

Source officielle Google Firebase, consultée le 27 octobre 2026 : https://firebase.google.com/docs/hosting/cloud-run (section « Set up billing for your project »).

L’application n’est pas déployée. La création de l’infrastructure et le déploiement des règles ne constituent pas une recette de l’application en staging. Le cockpit cadeaux P0 reste suspendu pendant la préparation de cette version de test.
