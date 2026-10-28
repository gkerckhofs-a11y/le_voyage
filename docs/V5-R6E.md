# V5 R6E — restauration contrôlée du catalogue

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise vérifié localement et sur GitHub : `7358f029e673c44acc4ed26bb6ca11e751e97094`. Source : cahier Rouge Clémence V5 du 28 octobre 2026, §7.5 ; continuité de l'archivage R6D. Environnement : émulateurs Auth/Firestore Standard `demo-rc-voyage`.

## Livré

Depuis une archive confirmée, Clem peut prévisualiser une restauration puis la confirmer avec un motif. L'aperçu compare les valeurs historiques au catalogue courant. Il est lié à son auteur, à la révision actuelle et à une durée d'une heure. La confirmation réutilise la transaction atomique/idempotente des imports et produit une **nouvelle révision**, avec type `catalog-restore` et référence à l'archive source. L'archive initiale reste intacte ; la restauration apparaît à son tour dans l'historique consultable.

Les références ajoutées après l'archive sont conservées sans modification. Une référence historique absente ou dont le SKU ne correspond plus bloque l'aperçu. La restauration ne supprime aucun produit. Le stock et la disponibilité courants sont conservés : les quantités historiques ne sont pas réintroduites. Si une ancienne référence ne possédait pas de métadonnées Master, les métadonnées actuelles sont conservées ; leur absence historique ne devient pas une suppression. Les prix, descriptions, saisons, délais, alternatives et statut actif/archivé peuvent revenir aux valeurs présentées dans l'aperçu. Les réactivations doivent donc être revues avant confirmation.

Un catalogue modifié après l'aperçu entraîne un refus, sans écriture partielle. Les droits sont revérifiés lors de chaque opération ; un autre auteur ne peut confirmer l'aperçu. La répétition de la même confirmation après une réponse réseau perdue ne l'applique qu'une fois. Les commandes déjà confirmées conservent leur composition, leurs lignes et leurs montants ; aucune écriture n'est effectuée sur leurs documents.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, carte, distances, seuils, règles Firestore, habilitations, format CSV, commandes confirmées, main et production.
- **Modifié** : `src/server/catalog-import.mjs`, `src/server/firebase-http.mjs`, `src/web/supplier-catalog.ts`, `web/catalogue.html`, `tests/firebase/supplier-catalog.test.mjs`, `tests/firebase/catalog-order-lines.test.mjs`, `tests/firebase-browser/catalog-import.spec.mjs`.
- **Nouveau** : ce rapport et deux captures `docs/evidence/v5-r6e-restore-*.png`.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/firebase/supplier-catalog.test.mjs tests/firebase/catalog-order-lines.test.mjs` : **10/10**. Restauration des prix et du statut, conservation du stock à zéro/disponibilité indisponible et des références ultérieures, archive source inchangée, révision et provenance, concurrence idempotente, aperçu périmé/expiré, autre auteur, révocation, absence de changement.
- Après ajout de l'assertion explicite sur une commande confirmée, `node --test tests/firebase/catalog-order-lines.test.mjs` : **2/2**. Le document projeté de la commande reste strictement identique après modification du catalogue puis restauration. Ces deux tests font partie des dix précédents ; ils ne sont pas comptés comme deux scénarios supplémentaires.
- `npx playwright test --config playwright.local-check.config.mjs catalog-import.spec.mjs catalog-order-lines.spec.mjs supplier-catalog.spec.mjs` : **6/6**, desktop 1440/mobile 390. Aperçu sans changement, modification du prix puis différences affichées, confirmation avec réponse perdue et répétition sans double révision, prix restauré, entrée d'historique et refus de la route depuis l'espace équipe. Parcours catalogue/import/commande existants conservés.
- Les commandes d'intégration sont enveloppées par `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Édition Standard constatée. Chromium local 141 ; configuration temporaire supprimée avant commit. Navigateur verrouillé en CI.
- `git diff --check` réussi. Résultats CI et SHA final reliés dans la PR. Anciennes captures régénérées par les tests remises à leur version précédente.

Captures inspectées : [desktop](evidence/v5-r6e-restore-desktop.png), [mobile](evidence/v5-r6e-restore-mobile.png). Pas de débordement horizontal dans le parcours testé. Kiosque inchangé, sans nouvelle capture ciblée.

## Limites et suite

Ce flux restaure une archive d'import existante, pas une sauvegarde générale ni chaque modification manuelle isolée. Il ne restaure pas le stock et ne corrige pas les commandes confirmées : les avenants financiers restent un flux distinct à développer. Aucune durée de rétention ou purge automatique n'est définie.

R6 reste partielle : Google Sheets direct, XLSX et avenants restent à traiter, puis R7 anticipation, R8 réception/directeur et R9 recette intégrée/pilote. Aucun déploiement, migration ou service payant ajouté. Aucune URL de test nouvellement constatée ; staging antérieur non revalidé. Ce n'est pas la dernière tranche ; le passage au déploiement test sera annoncé séparément.
