# V5 R7N — frais et avoirs déclarés après annulation

29 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise sur `3e603cd1d0ff1078951c8ad623b13cdf3e88ed17`, HEAD distant identique et quatre workflows réussis vérifiés. Commit livré et CI finale consignés dans la PR. Aucun déploiement.

## Livré

Les commandes anticipées annulées intégralement avant rattachement peuvent recevoir une écriture de frais ou d'avoir déclarée par Clem. Nature, référence documentaire, motif, montants et confirmation explicite sont requis. Les trois postes restent achat, emballage et transport ; un frais augmente les coûts déclarés, un avoir les réduit. L'interface demande des valeurs positives puis applique le signe selon la nature et montre le total proposé. L'historique conserve auteur, date d'enregistrement, nature, référence, motif, ventilation, avant/après et empreinte de commande.

Le calcul réutilise `normalizeAmendment` et `planAmendment`, déjà utilisés pour les cadeaux acquis : centimes entiers, aucun poste négatif, budget confirmé respecté, vingt écritures au maximum. Les contraintes existantes ne sont pas assouplies. La réponse fournisseur acceptée, ses empreintes, le périmètre et la révision sont revérifiés dans la transaction. Le journal et la réservation sont écrits atomiquement. Les envois concurrents ont un seul gagnant ; le rejeu identique retrouve sa réponse sans réécrire une régularisation de stock ou une écriture ultérieure.

L'instantané d'origine et les prix unitaires restent intacts, même après modification du catalogue. Le total après écritures apparaît séparément dans les prévisions et la fiche acquise. Stock, inventaire Master, droits cadeaux et état d'annulation restent inchangés. Une commande déjà rattachée est refusée par cette nouvelle route : ses avenants restent dans le suivi acquis existant, sans deuxième registre financier.

La source est une déclaration de l'opérateur (`operator-declared-cancellation-costs`). Une référence documentaire n'est pas une pièce téléversée ni une vérification comptable externe. Aucun paiement, remboursement bancaire, facture client, retour physique, remplacement ou nouveau droit n'est enregistré automatiquement.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, campagnes, barèmes, profils, coûts et prix d'origine, Master, stock, règles Firebase, permissions, kiosque, service de calcul des avenants et suivi acquis existants, main et production.
- **Modifié** : `src/server/gift-reservations.mjs`, `src/server/firebase-http.mjs`, `src/web/gift-forecast.ts`, `src/web/cockpit.ts`, `tests/firebase/gift-reservations.test.mjs`, `tests/firebase-browser/gift-reservations.spec.mjs`.
- **Nouveau** : route privée `amend-cancelled-order`, métadonnée `cancellationRequest.finance` avec historique borné et journal dans les collections existantes, ce rapport et captures R7N. Aucune migration ni nouveau service.

## Vérifications réelles

Commandes : `npm run typecheck`, `npm run build:web`, `node --test tests/gift-amendments.test.mjs tests/visual/public-build.test.mjs` ; `node --test tests/firebase/gift-reservations.test.mjs tests/firebase/gift-operations.test.mjs` ; `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs gift-operations.spec.mjs gift-amendments.spec.mjs`.

Tests intégrés sous `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`, données fictives. OpenJDK 21.0.2 et Chromium Headless Shell 141 déjà présents ; configuration navigateur temporaire retirée avant commit. Dépendances verrouillées inchangées ; CI avec navigateur verrouillé. Captures historiques régénérées restaurées.

**Résultats finaux : 40/40 tests serveur, 10 parcours navigateur validés et 3/3 tests de calcul/build public, soit 53 cas ciblés. Typage et compilation réussis.** Premier passage navigateur : 9/10 ; un parcours de confirmation desktop a rencontré une page JSON d'erreur lors d'une reconstruction locale concurrente du build. Après fixation du build, reprise des parcours confirmation/annulation desktop/mobile : 4/4. Cette reprise vérifie aussi le message de refus d'un avoir excessif et efface les anciens messages de validation après modification de la saisie. Commande de reprise : `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs --grep "internal anticipated workflow: (confirm|cancel)"`.

Couverture : frais/avoirs, signes et centimes exacts, confirmation documentaire obligatoire, original/stock/Master/droits préservés, budget et coûts non négatifs, vingt écritures maximum, accès étrangers/révoqués, champs injectés, concurrence, reprise après réponse perdue, rejeu après régularisation du stock, refus d'une seconde comptabilité pour une commande rattachée et conservation des avenants acquis existants. CSRF et rôles employé/directeur refusés sur la nouvelle route. `git diff --check` réussi.

Cinq captures inspectées : [avoir desktop](evidence/v5-r7n-credit-desktop.png), [avoir mobile](evidence/v5-r7n-credit-mobile.png), [bouton mobile après défilement](evidence/v5-r7n-mobile-actions.png), [historique desktop](evidence/v5-r7n-history-desktop.png), [historique mobile](evidence/v5-r7n-history-mobile.png). Kiosque inchangé, aucune nouvelle capture kiosque.

## Limites et suite

L'avoir est une réduction déclarée des coûts, pas une preuve de remboursement bancaire. Pas de pièce jointe, de suivi de trésorerie, de recalcul fiscal, de suppression d'écriture ni d'augmentation automatique de budget. Les limites existantes de vingt avenants et mille révisions sont conservées. La commande annulée et le cadeau correspondant restent bloqués pour tout nouveau traitement logistique.

Suite : consolidation des engagements et traitement explicite des cadeaux annulés, puis R8 réception/directeur et R9 recette, dont Sheets réel. Aucune URL de test revalidée, aucun achat/envoi/paiement, aucune fusion main, migration ou modification production. R7N n'est pas la dernière tranche avant déploiement test.
