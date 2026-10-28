# V5 R6H — avenants financiers du cockpit

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise vérifié : `6c46e61d77c9637fffb652307ebe85e5c59e218e`. Source : cahier V5 §7.5, continuité des confirmations R6B/R6C. Code et parcours fictifs vérifiés ; aucun déploiement.

## Comportement livré

Clem peut enregistrer un ajustement signé d'achat, d'emballage ou de transport avec référence et motif. Les coûts effectifs et la marge incluent les avenants ; les coûts initiaux, la confirmation, ses lignes SKU et prix unitaires restent intacts. Chaque écriture conserve auteur, date, révision, montants avant/après et référence de la confirmation. Une correction passe par un nouvel ajustement inverse, sans modifier ni supprimer l'historique.

Le serveur exige une confirmation version 1 ou 2, une habilitation cadeau actuelle sur la campagne et une révision concordante. Il refuse les coûts finaux négatifs, le dépassement du budget confirmé, les champs injectés et les montants non entiers en centimes. Limites : vingt avenants par dossier, plafond existant de mille révisions. Un identifiant de mutation déjà appliqué reste idempotent même après des opérations ultérieures ; réutilisé avec un contenu différent, il est refusé.

Les avenants sont conservés pendant les étapes logistiques et restent possibles après livraison, sans rouvrir le suivi logistique livré. Les commandes historiques sans instantané ne reçoivent pas d'historique inventé. L'interface bloque une nouvelle saisie après réponse incertaine jusqu'au rechargement de la fiche.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, cartes, seuils, règles Firestore, droits des autres espaces, catalogue et préférences confirmées, main et production. Export agenda minimal sans données financières.
- **Modifié** : `src/server/gift-operations.mjs`, `src/server/firebase-http.mjs`, `src/web/cockpit.ts`, `web/cockpit.html`, `.github/workflows/firebase-emulators.yml`, `tests/firebase/gift-operations.test.mjs`, `tests/firebase/catalog-order-lines.test.mjs`, `tests/firebase-browser/gift-operations.spec.mjs`.
- **Nouveau** : `src/server/gift-amendments.mjs`, `tests/gift-amendments.test.mjs`, `tests/firebase-browser/gift-amendments.spec.mjs`, ce rapport et deux captures R6H.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/gift-amendments.test.mjs` : **2/2**, centimes signés, bornes, budget, conservation de l'original, confirmation et limite d'historique.
- `node --test tests/firebase/gift-operations.test.mjs tests/firebase/catalog-order-lines.test.mjs` : **10/10**, concurrence, reprise idempotente, retrait de droits, autre entreprise, projection équipe, lignes figées, conservation pendant incident/livraison et correction après livraison.
- `npx playwright test --config playwright.local-check.config.mjs gift-amendments.spec.mjs gift-operations.spec.mjs catalog-order-lines.spec.mjs preference-freeze.spec.mjs` : **8/8**, desktop 1440/mobile 390, aperçu signé, réponse perdue, rechargement sans doublon, contre-écriture, refus d'un employé et régressions du suivi/préférences.
- Les deux commandes intégrées sont exécutées dans `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Données fictives isolées, aucun appel de production.
- Premier passage navigateur : 4/8. Un sélecteur global trouvait les deux champs achat ; il cible désormais le formulaire initial. Le test d'accès envoyait un corps vide rejeté en 400 ; il envoie maintenant un avenant valide et vérifie le refus 403. Second passage : 8/8.
- Chromium local 141 ; configuration locale temporaire supprimée avant commit. Navigateur verrouillé en CI. Anciennes captures régénérées restaurées. SHA final et résultats CI liés dans la PR.

Captures de l'historique inspectées : [desktop](evidence/v5-r6h-amendments-desktop.png), [mobile](evidence/v5-r6h-amendments-mobile.png). Aucun débordement horizontal constaté. Kiosque inchangé, sans nouvelle capture.

## Limites et suite

Ajustements agrégés uniquement : pas de substitution de SKU, de recalcul fiscal, de facture, de justificatif joint ni de paiement. La cohérence commerciale des montants reste à valider ; ces écritures ne constituent pas une comptabilité certifiée. Les vingt avenants sont une limite technique explicite, pas une politique de rétention commerciale.

Le connecteur Sheets réel demeure à configurer et à tester dans un staging isolé ; politique de rétention à préciser. Prochaine tranche fonctionnelle : R7, anticipation des compositions, budgets, risques de stock et délais, en réemployant les services existants. Puis R8 et R9. R6H n'est pas la dernière tranche : le porteur sera prévenu avant le passage au déploiement test. Aucune URL de test revalidée, aucun merge main, aucune migration ni production modifiée.
