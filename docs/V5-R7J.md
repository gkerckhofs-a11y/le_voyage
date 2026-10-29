# V5 R7J — réconciliation explicite des consommations

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise sur `0e088907638b36d2757ffab697baa268ce057fbb`, HEAD distant identique et quatre workflows réussis vérifiés. SHA livré et CI finale dans la PR. Aucun déploiement.

## Fonctionnement

Le catalogue privé propose un aperçu de réconciliation par SKU exact. Il montre stock Master déclaré, unités indisponibles, consommations à réconcilier, réservations conservées dont commandes, disponible avant/après et déficit restant. L'aperçu ne modifie rien. Une quantité Master inconnue ou un registre incohérent bloque l'opération.

Clem indique une référence de contrôle d'inventaire et un motif, puis confirme que le Master affiché exclut déjà toutes les consommations de l'aperçu. Cette vérification est déclarative et humaine : aucun comptage physique ou échange fournisseur n'est prétendu. Les droits catalogue existants sont revérifiés, sans élargissement des rôles.

La transaction retranche uniquement les consommations du SKU du total indisponible et remet à zéro son sous-compteur consommé. Toutes les réservations et commandes encore affectées restent déduites ; les autres SKU sont conservés. Exemple testé : stock déclaré 8, indisponible 7 dont consommé 4 → réservations conservées 3 (dont commandes 2), disponible de 1 à 5. Si le Master n'indique que 1 unité, les 3 réservations restent conservées et le déficit de 2 reste visible.

La quantité Master, les produits, prix, commandes, coûts et preuves de consommation restent inchangés. Une nouvelle révision catalogue et deux traces (audit catalogue et journal idempotent) enregistrent auteur, date, motif, référence d'inventaire et états avant/après. Le détail du stock est consultable dans l'historique catalogue. L'augmentation de révision invalide les aperçus catalogue/import/proposition antérieurs ; aucun import n'effectue automatiquement cette réconciliation.

L'empreinte de l'aperçu dépend de l'auteur, de la révision catalogue et des compteurs du SKU. Changement de catalogue ou mouvement affectant ces compteurs → nouvelle prévisualisation obligatoire. Une réponse perdue peut être rejouée avec la même demande. Un ancien rejeu de consommation ne redéduit pas des unités déjà réconciliées.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, campagnes, droits cadeaux, profils, confirmations/coûts, quantité Master, permissions directeur/équipe/kiosque, règles Firebase, main et production. Pas de migration.
- **Modifié** : `src/server/supplier-catalog.mjs`, `src/server/firebase-http.mjs`, `src/web/supplier-catalog.ts`, `tests/firebase/gift-reservations.test.mjs`, `tests/visual/public-build.test.mjs`.
- **Nouveau** : `src/server/stock-reconciliation.mjs`, `src/web/stock-reconciliation.ts`, `tests/firebase/stock-reconciliation.test.mjs`, `tests/firebase-browser/stock-reconciliation.spec.mjs`, ce rapport et captures R7J. Journal privé `stockReconciliations` sous le catalogue existant.

## Vérifications

Commandes exécutées : `npm run typecheck`, `npm run build:web`, `node --test tests/visual/public-build.test.mjs` ; puis `node --test tests/firebase/stock-reconciliation.test.mjs tests/firebase/supplier-catalog.test.mjs tests/firebase/gift-reservations.test.mjs` et `npx playwright test --config playwright.local-check.config.mjs stock-reconciliation.spec.mjs catalog-import.spec.mjs`.

Tests intégrés sous `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`, données fictives. Configuration Chromium locale temporaire retirée avant commit ; anciennes captures régénérées restaurées.

Premier contrôle du build : nouveau module frontal absent de la liste explicite du test. Liste mise à jour avec ce seul module public ; le code serveur n'est pas publié. Premier passage intégré : 28 tests serveur réussis, desktop réussi, deux échecs mobile dus au nettoyage de la fixture navigateur (catalogue restauré mais audit ajouté non retiré, collision de révision suivante). Nettoyage des seuls journaux créés par cette fixture corrigé. Une tentative séparée du test de cycle complet a rencontré un émulateur Auth non joignable ; ce test a ensuite été inclus dans le rejeu intégré.

**Résultats finaux : typecheck/build réussis, 29/29 tests serveur, 4/4 parcours navigateur desktop/mobile et 1/1 contrôle du build public, soit 34 tests ciblés réussis.** `git diff --check` réussi. Captures inspectées. Couverture : aperçu sans écriture, conservation des réservations/commandes/autres SKU, déficit, révision périmée, consentement obligatoire, audit, concurrence et rejeu durable, droits révoqués, refus employé/directeur et CSRF, import/restauration préservés et cycle complet après consommation réelle fictive.

Captures : [panneau desktop](evidence/v5-r7j-reconciliation-desktop.png), [panneau mobile](evidence/v5-r7j-reconciliation-mobile.png), [actions mobile après défilement](evidence/v5-r7j-reconciliation-mobile-actions.png). Le panneau mobile long peut croiser la navigation fixe dans la capture de l'élément ; la capture du viewport après défilement montre les commandes accessibles. Kiosque inchangé, pas de nouvelle capture kiosque.

## Limites et suite

Réconciliation totale par SKU, pour des consommations déjà déclarées. Pas de retour fournisseur, annulation, réconciliation partielle ni écriture vers Google Sheets. L'inventaire doit être vérifié par Clem avant validation ; aucune détection automatique d'un stock Master déjà net. L'historique des commandes conserve la consommation initiale ; le journal catalogue explique sa réconciliation.

Suite : retours/annulations et consolidation des engagements, puis R8/R9 et recette Google Sheets réelle. Aucune URL de test revalidée, aucun achat/envoi/paiement, déploiement ou modification production. Cette tranche n'est pas la dernière avant déploiement test.
