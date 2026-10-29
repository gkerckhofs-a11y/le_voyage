# V5 R6C — lignes catalogue et prix unitaires confirmés

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise vérifié : `9c660f3d5071f7a3aab9bbbdf63d3b4bd84a83ca`. Source : V5 §7.5, conservation des références, libellés et coûts. Aucun déploiement ni migration ; émulateurs Auth/Firestore Standard `demo-rc-voyage` uniquement.

## Livré

Une proposition reprise dans le cockpit conserve désormais des lignes structurées : référence interne, SKU exact (zéros initiaux inclus), quantité, fournisseur, libellé, prix unitaire et total en centimes, version du catalogue, TVA connue ou explicitement inconnue. Clem peut ajuster les quantités avant confirmation. Le serveur relit le catalogue dans la transaction et refuse les montants ou libellés falsifiés, les versions périmées et les produits incompatibles avec disponibilité, délai, saison, sans-alcool ou stock déclaré. Une sélection est bornée à dix références distinctes et cent unités par ligne.

Un changement du catalogue avant confirmation impose une nouvelle revue de la proposition. Au passage « À commander » → « À recevoir », l'instantané version 2 conserve toutes les lignes et leur version source. Les changements ultérieurs du Master, incidents et reprises ne réécrivent pas cet original. Après confirmation, aucune nouvelle lecture du catalogue n'est nécessaire pour poursuivre le suivi.

Les compositions libres et les instantanés version 1 restent compatibles. Aucun SKU n'est déduit d'un texte historique. Le passage explicite d'une sélection structurée à une composition libre est possible seulement avant confirmation et journalisé. Un ancien client omettant le nouveau champ conserve les lignes existantes. Les données restent limitées au cockpit habilité ; aucun nouveau droit ou champ financier dans les projections équipe.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, cartes, seuils, budgets de campagne, règles Firestore, préférences R5, main et production. Aucun achat/envoi.
- **Modifié** : `src/server/gift-operations.mjs`, `src/server/firebase-http.mjs`, `src/server/supplier-catalog.mjs`, `src/web/cockpit.ts`, `web/cockpit.html`, `web/cockpit.css` et filtre de déclenchement `.github/workflows/firebase-emulators.yml`.
- **Nouveau** : `src/server/catalog-lines.mjs`, `tests/catalog-lines.test.mjs`, `tests/firebase/catalog-order-lines.test.mjs`, `tests/firebase-browser/catalog-order-lines.spec.mjs`, ce rapport et deux captures `docs/evidence/v5-r6c-lines-*.png`.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/catalog-lines.test.mjs tests/composition.test.mjs` : **6/6**.
- `node --test tests/firebase/catalog-order-lines.test.mjs tests/firebase/gift-operations.test.mjs tests/firebase/supplier-catalog.test.mjs` : **11/11**. Prix et fournisseur falsifiés, champs injectés, révision périmée, confirmation concurrente idempotente, import avec prix/TVA/libellé/archivage modifiés sans effet sur l'original, incident/reprise, ancien client, détachement audité, absence dans le flux équipe et révocation.
- `npx playwright test --config playwright.local-check.config.mjs catalog-order-lines.spec.mjs beneficiaries.spec.mjs gift-operations.spec.mjs preference-freeze.spec.mjs supplier-catalog.spec.mjs` : **10/10**. Quantité modifiable, coût serveur, réponse perdue puis rechargement de la confirmation unique, lignes verrouillées, compatibilité des parcours bénéficiaires, préférences, catalogue et livraison. Fixture de nouvelle commande isolée par entreprise et par test.
- Les deux commandes d'intégration sont enveloppées par `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Édition Standard constatée au démarrage. Chromium local 141 ; configuration locale temporaire supprimée avant commit. Navigateur verrouillé en CI.
- Captures inspectées : [desktop 1440](evidence/v5-r6c-lines-desktop.png), [mobile 390](evidence/v5-r6c-lines-mobile.png). Pas de débordement horizontal. Captures ciblées du bloc de lignes ; kiosque inchangé, aucune nouvelle capture ciblée. `git diff --check` réussi. Résultats CI et SHA final consignés dans la PR.

## Limites et suite

Le stock déclaré est contrôlé mais **ni réservé ni décrémenté** : la réservation et son risque relèvent de R7. La base HTVA importée est conservée telle que déclarée ; les produits historiques gardent une base fiscale inconnue. Aucun calcul fiscal supplémentaire ni validation commerciale des montants.

Restent dans R6 : Google Sheets autorisé côté serveur, import XLSX, rétention/restauration et flux distinct d'avenants financiers. Puis R7 anticipation, R8 réception/directeur, R9 recette intégrée et pilote simulé. Aucune URL de test nouvellement constatée ; staging antérieur non revalidé. R6C n'est pas la dernière tranche : le passage au déploiement test sera annoncé séparément.
