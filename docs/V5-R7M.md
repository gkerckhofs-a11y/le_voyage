# V5 R7M — régularisation des quantités après annulation

29 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise sur `84d0b2e875525991ddf4ba50d52d78c53f620771`, HEAD distant identique, quatre workflows réussis vérifiés. Commit livré et CI finale consignés dans la PR. Aucun déploiement.

## Livré

Après une annulation intégrale acceptée déclarée dans R7L, Clem peut prévisualiser puis confirmer la libération de l'affectation interne des quantités de cette commande. L'aperçu montre chaque SKU, quantité, stock Master, disponible avant/après et déficit restant. La confirmation exige une référence d'inventaire, un motif et la reconnaissance que l'inventaire Master affiché a été contrôlé après annulation et exclut les unités absentes ou retournées.

Il s'agit d'une déclaration de l'opérateur, pas d'une vérification physique par l'application. Le Master doit être corrigé auparavant si nécessaire. Les compteurs internes `counts` et `committed` diminuent uniquement des quantités de la commande concernée ; les autres réservations, commandes et consommations restent comptées. Aucun produit n'est ajouté au Master. Un déficit restant est affiché et n'est pas masqué par un réapprovisionnement fictif.

La transaction recontrôle habilitation, campagne, équipe, palier, révision, acceptation, empreintes de commande et éventuel rattachement logistique. Une commande consommée, livrée ou en incident après livraison est refusée. Catalogue incomplet, stock inconnu, SKU ambigu et compteurs incohérents sont refusés. L'empreinte d'aperçu est liée à l'opérateur, au périmètre, à la décision, à la révision Master et aux quantités concernées : un changement pertinent exige un nouvel aperçu. Les écritures du registre, de la réservation et du journal sont atomiques ; le rejeu identique est durable et ne libère jamais une nouvelle réservation ultérieure.

La commande historique conserve son statut technique `ordered`, son instantané et ses coûts. Le cadeau annulé reste bloqué, sans deuxième commande, consommation ni nouveau droit. La régularisation est distincte d'un retour physique, d'un avoir ou d'un remboursement. Le cockpit acquis et les prévisions affichent explicitement son état.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, calendrier, barèmes, profils, coûts figés, Master, règles Firebase, droits des quatre espaces, kiosque, main et production.
- **Modifié** : `src/server/gift-reservations.mjs`, `src/server/firebase-http.mjs`, `src/web/gift-forecast.ts`, `src/web/cockpit.ts`, `tests/firebase/gift-reservations.test.mjs`, `tests/firebase-browser/gift-reservations.spec.mjs`.
- **Nouveau** : deux routes privées d'aperçu/confirmation, métadonnée `cancellationRequest.stockRegularization` et journal dans les collections existantes, ce rapport et captures R7M. Aucune migration ni nouveau service.

## Vérifications réelles

Commandes : `npm run typecheck`, `npm run build:web`, `node --test tests/visual/public-build.test.mjs` ; `node --test tests/firebase/gift-reservations.test.mjs tests/firebase/gift-operations.test.mjs` ; reprise ciblée `node --test --test-name-pattern="stock regularization rejects" tests/firebase/gift-reservations.test.mjs` ; `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs gift-operations.spec.mjs`.

Tests intégrés sous `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`, données fictives. OpenJDK 21.0.2 et Chromium Headless Shell 141 déjà présents depuis R7L ; configuration navigateur temporaire retirée avant commit. Dépendances verrouillées inchangées ; CI avec navigateur verrouillé. Captures historiques régénérées restaurées.

**Résultats finaux : 37 cas serveur validés, 8/8 parcours navigateur et 1/1 contrôle du build public, soit 46 cas ciblés ; typage et compilation réussis.** Le premier passage serveur était à 36/37 : le dernier scénario employait deux horloges fictives différentes lors d'une nouvelle réservation dans l'autre campagne. Correction de la fixture uniquement, puis reprise ciblée réussie (1/1). Le premier passage navigateur était à 2/8 : les six échecs portaient sur les assertions finales d'accès, avec des corps invalides donnant 400 au lieu du 403 attendu. Après correction des corps de test aux schémas des deux nouvelles routes, les huit parcours passent entièrement. Aucun affaiblissement des validations serveur.

Couverture : annulation acceptée obligatoire, aperçu sans écriture, stock et coûts conservés, compteurs des autres commandes/consommations préservés, concurrence et rejeu durable, nouvelle réservation dans une autre campagne après libération, refus des versions périmées, stocks inconnus, registres ou liens incohérents, livraison/consommation, accès étrangers/révoqués et champs injectés. Navigateur : aperçu périmé après modification Master, confirmation explicite, réponse réseau perdue puis actualisation, cadeau acquis toujours bloqué, CSRF et refus employé/directeur. `git diff --check` réussi.

Cinq captures inspectées : [aperçu desktop](evidence/v5-r7m-preview-desktop.png), [aperçu mobile](evidence/v5-r7m-preview-mobile.png), [bouton mobile après défilement](evidence/v5-r7m-mobile-actions.png), [résultat desktop](evidence/v5-r7m-confirmed-desktop.png), [résultat mobile](evidence/v5-r7m-confirmed-mobile.png). Kiosque inchangé, aucune nouvelle capture kiosque.

## Limites et suite

Régularisation intégrale uniquement et non réversible dans cette tranche. La vérification de l'inventaire reste humaine ; aucune pièce jointe, constat physique de retour ni automatisation d'inventaire. Les finances et le remplacement du cadeau restent à traiter séparément. La limite existante de 1 000 révisions par réservation est conservée.

Suite : frais/avoirs/remboursements documentés et consolidation des engagements, traitement explicite des cadeaux annulés, puis R8/R9 et recette réelle Sheets. Aucune URL de test revalidée, aucun achat/envoi/paiement, aucune fusion main, migration ou modification production. R7M n'est pas la dernière tranche avant déploiement test.
