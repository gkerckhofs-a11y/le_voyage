# V5 R7F — autorisation interne d'achat anticipé

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise locale et distante : `fcd8d27d90c0c61d540701038f2811541a28c67b`, quatre workflows réussis. Source : Rouge Clémence / Le Ludificateur, cahier V5 du 28 octobre 2026, §7.2, §7.3 et §7.6. SHA livré et CI finale consignés dans la PR. Aucun déploiement.

## Livré

Une réservation active peut recevoir une autorisation interne d'achat anticipé. Clem fournit une référence, un motif et reconnaît explicitement le risque de dépenses si le cadeau n'est finalement pas acquis. Le montant n'est pas fourni par le navigateur : le serveur le reprend de la composition réservée après contrôle de son actualité, de sa revue, du budget configuré et du stock déclaré couvrant les réservations.

L'autorisation reste une décision interne datée. Elle conserve montant, budget de référence, auteur, date et versions de réservation/proposition. Les changements ultérieurs du catalogue ne réécrivent pas cet instantané. Aucun achat, engagement fournisseur, facture, coût engagé ou droit cadeau n'est créé par cette action. Les prix et bases fiscales restent ceux du modèle de proposition existant ; l'écran demande leur vérification, sans inventer une validation comptable ou contractuelle.

La proposition reste protégée lorsque l'achat est autorisé. Une libération directe est refusée tant que l'autorisation est active. Son retrait motivé conserve les quantités réservées, puis une libération séparée peut les rendre disponibles. Le retrait est possible même après acquisition du cadeau ou changement de contexte. Ce n'est pas l'annulation d'une commande fournisseur.

Chaque transition utilise la même révision de réservation et un journal atomique/idempotent. Une autorisation et une libération concurrentes n'ont qu'un gagnant. Le rejeu d'une ancienne requête rend son résultat historique sans réactiver une autorisation retirée. Deux places de journal sont préservées pour le retrait et la libération à l'approche de la limite de 1 000 actions.

Les deux routes supplémentaires restent réservées aux opérateurs cadeaux habilités pour la campagne, avec contrôle CSRF. Les données de décision restent absentes des espaces employé et directeur. Les boutons sont bloqués après une mutation dont le résultat est incertain ; l'actualisation retrouve le résultat conservé.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur et droits acquis, calendrier, barèmes, Master et quantités déclarées, règles Firestore fermées, profils personnels, confirmations et coûts des commandes existantes, directeur/équipe/kiosque, main et production. Aucune nouvelle dépendance.
- **Modifié** : `src/server/gift-reservations.mjs` (autorisation/retrait/limites), `src/server/gift-proposals.mjs` (protection du nouvel état), `src/server/firebase-http.mjs` (deux routes privées), `src/web/gift-forecast.ts`, `web/previsions.css`, `tests/firebase/gift-reservations.test.mjs`, `tests/firebase-browser/gift-reservations.spec.mjs`.
- **Nouveau** : ce rapport et sept captures R7F. Aucun nouveau service ni collection de commandes.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis, y compris après ajustement de la case de reconnaissance du risque et effacement du message de validation à la saisie.
- `node --test tests/visual/public-build.test.mjs tests/anticipated-composition.test.mjs` : **4/4**.
- `node --test tests/firebase/gift-reservations.test.mjs tests/firebase/gift-operations.test.mjs` : **19/19**. Autorisation explicite et idempotente, refus de montant injecté/risque non reconnu, identité et contexte contrôlés, retrait conservant le stock, acquisition et perte d'accès, concurrence autorisation/libération, fin de journal sans blocage de sortie, historique et commandes existantes préservés.
- `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs gift-forecast.spec.mjs` : **4/4**. Desktop 1440/mobile 390 ; autorisation sans CSRF refusée, perte de réponse après enregistrement puis récupération, aucun droit/commande créé, retrait après acquisition, stock toujours réservé puis libéré, opérations refusées aux employés/directeurs et après révocation du périmètre.
- Rejeu après contrôle supplémentaire de l'identité et modification réelle des prix dans le test : `node --test tests/firebase/gift-reservations.test.mjs` **6/6**, puis `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs` **2/2**.
- Rejeu navigateur après correction visuelle : même commande ciblée, **2/2**.
- Commandes intégrées dans `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Chromium local 141, campagnes fictives. Configuration temporaire retirée avant commit, captures antérieures régénérées restaurées. `git diff --check` réussi.

Captures : [décision desktop](evidence/v5-r7f-decision-desktop.png), [décision mobile](evidence/v5-r7f-decision-mobile.png), [autorisé desktop](evidence/v5-r7f-authorized-desktop.png), [autorisé mobile](evidence/v5-r7f-authorized-mobile.png), [retiré desktop](evidence/v5-r7f-withdrawn-desktop.png), [retiré mobile](evidence/v5-r7f-withdrawn-mobile.png), [actions mobiles après défilement](evidence/v5-r7f-withdrawn-mobile-actions.png). Panneaux inspectés ; la capture mobile complémentaire montre les commandes masquées par la barre fixe dans le panneau long. Kiosque inchangé, sans nouvelle capture.

## Limites et suite

Cette autorisation n'est pas encore reliée à une confirmation de commande anticipée, une consommation de stock ou un engagement financier réel. Son état est historique et ne se révoque pas automatiquement si les prix ou préférences changent ; l'écran indique de revérifier le contexte avant toute commande. Le futur passage à une commande devra refaire ces contrôles, empêcher les doublons et préserver les instantanés. Aucune route ne permet actuellement d'exécuter un achat à partir de cette décision.

Le budget utilisé reste celui du palier configuré. Contrat accepté/versionné, fiscalité validée, autorité d'achat réelle, authentification réelle et politiques de rétention restent à finaliser avant préproduction. Journal conservé côté serveur, écran limité au dernier état et à la dernière autorisation. Pas d'expiration automatique, d'envoi fournisseur, de paiement ni d'annulation externe.

Suite : confirmation de commande anticipée et rapprochement avec le cadeau acquis, articulation stock réservé/consommé et engagements ; puis R8/R9 et recette réelle Sheets. Aucune URL de test revalidée, migration, fusion main ou production modifiée. Cette tranche n'est pas la dernière avant déploiement test ; le porteur sera prévenu avant cette étape.
