# Master Google Sheets — configuration serveur

28 octobre 2026. Ce raccordement n'est pas activé sur un serveur distant par la tranche R6G. Aucun fichier Google réel n'a été interrogé.

## Configuration

Le point d'entrée de staging `scripts/serve-staging.mjs` accepte une seule source catalogue explicitement configurée :

| Variable serveur | Valeur attendue |
|---|---|
| `RC_MASTER_SHEETS_ID` | Identifiant réel du classeur validé pour ce Master, pas une URL |
| `RC_MASTER_SHEETS_TAB` | Nom exact de l'onglet contenant le tableau |
| `RC_MASTER_SHEETS_LABEL` | Libellé lisible affiché à Clem (80 caractères maximum) |

Sans les trois variables, si elles sont toutes absentes, le connecteur reste désactivé et CSV/XLSX restent disponibles. Une configuration partielle ou invalide refuse le démarrage. Aucun identifiant de classeur ou onglet n'est fourni dans le code de staging.

L'authentification utilise Application Default Credentials via `google-auth-library@11.3.1`, avec le scope `https://www.googleapis.com/auth/spreadsheets.readonly`. Avant une recette réelle, il faut identifier l'identité serveur, lui donner la lecture du fichier retenu et vérifier l'accès à l'API Sheets dans l'environnement isolé. Aucun compte, clé, partage, activation d'API ou droit n'est créé par cette implémentation. Ne pas supposer que les identifiants Firebase actuels suffisent pour Sheets : l'accès réel reste à valider. Aucun secret ou identifiant de fichier n'est envoyé dans les formulaires du navigateur.

Le serveur construit l'URL Google et le nom d'onglet A1 lui-même. Les clients ne peuvent fournir ni URL, ni identifiant, ni plage. La requête utilise exclusivement `GET spreadsheets.get`, sans écriture Google, avec refus des redirections et des réponses dépassant 1 000 000 octets. Lecture interrompue après 10 secondes ; une seule lecture simultanée par source dans le processus.

## Tableau attendu et cycle de synchronisation

L'onglet doit contenir les mêmes colonnes que le CSV documenté dans le cockpit, avec les en-têtes en première ligne : 100 produits et 19 colonnes maximum. SKU/identifiants au format texte ; taux TVA en nombre simple, par exemple 6 pour 6 %, sans format pourcentage. Dates en texte AAAA-MM-JJ. Les formules et valeurs calculées, cellules fusionnées, lignes/colonnes masquées et onglet masqué sont refusés. Les colonnes inconnues et incohérences métier restent contrôlées par le validateur CSV.

L'onglet entier est demandé, avec un masque de champs limité aux valeurs nécessaires et aux métadonnées de contrôle. Le lecteur ne tronque pas silencieusement un Master plus grand pour faire passer sa validation. Des mises en forme éloignées des données peuvent donc conduire à un refus si elles gonflent la réponse ou les dimensions : utiliser un onglet tabulaire dédié et simple.

Clem clique « Lire le Master et prévisualiser », examine les différences, puis confirme avec un motif. La lecture seule ne modifie pas le catalogue. La confirmation applique les valeurs de cet aperçu, pas une nouvelle lecture Google. Si le Master a changé depuis, relancer une lecture. L'aperçu expire après une heure et un changement de révision du catalogue bloque sa confirmation. Les références absentes sont conservées. Les commandes déjà confirmées ne sont pas réécrites.

L'archive garde la date de lecture, le libellé, l'onglet, une empreinte de la référence serveur et une empreinte des valeurs normalisées. Ce n'est pas un numéro de révision Google ni une conservation du classeur complet. La synchronisation reste manuelle ; aucune tâche périodique n'est créée.

## Démonstration isolée

`scripts/serve-firebase.mjs` utilise explicitement un transport simulé via `demo-master-sheets.mjs`. Le cockpit l'annonce comme « Master fictif (émulateur) ». Aucun appel Google et aucune recherche d'identifiants ADC n'ont lieu avec ce transport. Le script de staging n'utilise pas cette simulation.

## Références consultées

- Google, [Sheets API — spreadsheets.get](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get), consulté le 28 octobre 2026 : masque de champs, plage et scope de lecture.
- Google, [Google Auth Library Node.js](https://googleapis.dev/nodejs/google-auth-library/latest/), consulté le 28 octobre 2026 : Application Default Credentials pour l'identité applicative.
- Google, [Application Default Credentials](https://docs.cloud.google.com/docs/authentication/application-default-credentials), consulté le 28 octobre 2026 : disponibilité des identifiants et scopes selon l'environnement.
