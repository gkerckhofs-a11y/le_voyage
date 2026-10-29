# V5 R6F — import XLSX contrôlé

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise vérifié : `aca75f0c47a155549c1df2890ff24ec5f81c4389`. Source produit : cahier Rouge Clémence V5 du 28 octobre 2026, §7.5, alternative CSV/XLSX au Master.

## Résultat

Le sélecteur du catalogue accepte maintenant CSV ou XLSX. La lecture XLSX produit des cellules textuelles transmises au validateur métier CSV existant : mêmes colonnes, contrôles, différences avant/après, références absentes conservées, archivage explicite, aperçu lié à l'auteur/révision et confirmation atomique/idempotente. L'historique distingue `xlsx-import`, conserve le nom source et l'empreinte SHA-256 du fichier original. Les archives de valeurs restent consultables et utilisables par le flux de restauration. Le fichier binaire complet n'est pas conservé.

Les SKU et autres champs textuels doivent être stockés comme texte : un SKU numérique avec format visuel à zéros est refusé, sans conversion devinée. Les colonnes numériques autorisent texte ou nombre simple ; un taux TVA numérique avec format Excel « pourcentage » est refusé. Exemple accepté : `6` pour 6 %. Les dates attendent du texte AAAA-MM-JJ. Aucun calcul de formule ni accès à une URL externe.

Périmètre explicite : une feuille visible, 100 produits, 19 colonnes maximum, 500 000 octets pour le XLSX et 120 000 octets de contenu tabulaire normalisé. Formules, valeurs d'erreur, dates Excel typées, textes enrichis, cellules fusionnées, lignes/colonnes masquées, macros, objets incorporés et liens externes sont refusés. Les mises en forme sans effet sur ces règles peuvent être présentes. Les colonnes facultatives absentes suivent le comportement CSV existant, visible dans l'aperçu.

La lecture vérifie l'archive ZIP avant interprétation : 64 entrées maximum, 2 Mo décompressés par entrée, 4 Mo au total, noms uniques, absence de chiffrement, entités XML et relations externes. Elle s'exécute dans un worker avec limites de tas JavaScript (128/16 Mio), arrêt après 10 secondes et au maximum deux lectures simultanées par processus. Ces limites ne prétendent pas borner toute la mémoire native de Node. Les droits sont vérifiés avant la lecture puis au moment de créer l'aperçu ; la route exige l'espace cadeaux et la protection CSRF existante.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, cartes, distances, seuils, commandes confirmées, permissions, règles Firestore, main et production. Aucun nouveau service distant.
- **Modifié** : `src/server/catalog-import.mjs`, `src/server/firebase-http.mjs`, `src/web/supplier-catalog.ts`, `web/catalogue.html`, `tests/firebase/supplier-catalog.test.mjs`, `tests/firebase-browser/catalog-import.spec.mjs`, `package.json`, `package-lock.json`, `.github/workflows/firebase-emulators.yml`.
- **Nouveau** : `src/server/catalog-xlsx.mjs`, `src/server/catalog-xlsx-worker.mjs`, `tests/catalog-xlsx.test.mjs`, `tests/helpers/master-xlsx.mjs`, `tests/firebase-browser/catalog-xlsx.spec.mjs`, ce rapport et deux captures `docs/evidence/v5-r6f-xlsx-*.png`.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/catalog-xlsx.test.mjs tests/catalog-import.test.mjs` : **6/6**. SKU texte exact, centimes/TVA/stock, formule avec résultat mémorisé, SKU numérique formaté, pourcentage Excel, feuilles multiples/masquées, lignes/colonnes masquées, fusion, bornes, lien externe, archive invalide/surdimensionnée, saturation des deux lecteurs puis libération.
- Sous émulateurs : `node --test tests/firebase/supplier-catalog.test.mjs tests/firebase/catalog-order-lines.test.mjs` : **11/11**, rejoués après mise à jour de la dépendance indirecte. Aperçu sans mutation, confirmation concurrente unique, provenance originale/empreinte, archive XLSX, import identique sans changement, formules refusées, droits révoqués avant décodage, régressions CSV/restauration/commandes confirmées.
- `npx playwright test --config playwright.local-check.config.mjs catalog-import.spec.mjs catalog-order-lines.spec.mjs catalog-xlsx.spec.mjs supplier-catalog.spec.mjs` : **8/8**, desktop 1440/mobile 390. Erreur de formule visible, aperçu, confirmation, historique/provenance XLSX, refus côté équipe, parcours existants. Le scénario XLSX seul a ensuite été rejoué : **2/2**, pour centrer la capture mobile au-dessus de la barre fixe ; pas de double comptage.
- Commandes intégrées enveloppées par `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Firestore Standard constaté. Chromium local 141 ; configuration temporaire supprimée avant commit. Navigateur verrouillé en CI.
- `git diff --check` réussi. Anciennes captures régénérées remises à leur version précédente. SHA final et résultats CI liés dans la PR.

Captures inspectées : [desktop](evidence/v5-r6f-xlsx-desktop.png), [mobile](evidence/v5-r6f-xlsx-mobile.png). Aucun débordement horizontal dans le scénario testé. Kiosque inchangé, sans nouvelle capture ciblée.

## Dépendances et références techniques

Ajout de `exceljs@4.4.0` et `yauzl@3.4.0`, versions exactes et verrouillage des dépendances. API de lecture vérifiée dans le README livré avec ExcelJS, section « Reading XLSX » ; contrôle des tailles ZIP documenté par [yauzl](https://github.com/thejoshwolfe/yauzl/blob/master/README.md), consulté le 28 octobre 2026.

Le premier `npm audit --omit=dev --json` signalait la dépendance indirecte UUID d'ExcelJS. Surcharge ciblée vers `uuid@11.1.1`, compatible avec l'appel CommonJS `v4` constaté dans ExcelJS ; tests rejoués après installation. Le second audit signale **0 vulnérabilité** sur ce périmètre au moment du contrôle, sans garantie générale d'absence de vulnérabilité. Référence : [GitHub Advisory Database, GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), mise à jour du 21 mai 2026, version 11.1.1 corrigée.

## Suite et limites

Ce lecteur vise un Master tabulaire simple, pas l'interprétation complète de tous les classeurs Excel. Les limites et refus sont affichés avant import. Google Sheets direct reste à raccorder, ainsi que les avenants financiers et la politique de rétention ; puis R7 anticipation, R8 réception/directeur, R9 recette intégrée/pilote. Aucune validation commerciale des prix/TVA.

Aucun déploiement, migration ou nouveau service payant. Aucune URL de test nouvellement constatée ; staging antérieur non revalidé. R6F n'est pas la dernière tranche ; le passage au déploiement test sera annoncé séparément.
