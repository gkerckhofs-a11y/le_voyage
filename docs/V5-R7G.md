# V5 R7G — confirmation anticipée et prévention des doublons

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise local et distant vérifié : `0091acab02adca1adf1135cc010aa9ec36a5de7c`, quatre workflows réussis. Source : Rouge Clémence / Le Ludificateur, cahier V5 du 28 octobre 2026, §7.2, §7.3, §7.5 et §7.6. SHA livré et CI finale consignés dans la PR. Aucun déploiement.

## Livré

Une autorisation interne active peut recevoir une confirmation de commande déclarée par Clem. Référence, motif et confirmation explicite sont exigés. Le serveur revérifie proposition relue, contexte courant, autorisation, coûts/budget et quantités immobilisées. Les montants et lignes ne viennent pas du navigateur. Un changement de contexte ou un palier déjà acquis empêche une nouvelle confirmation anticipée ; le rejeu d'une confirmation déjà enregistrée reste idempotent.

L'instantané de commande conserve référence, date, auteur, autorisation, version de proposition/catalogue, échéance indicative, coûts achat/emballage/transport, budget, conditions et lignes SKU/prix/TVA. Une mise à jour du catalogue ne réécrit pas cet instantané. Source explicite : `operator-confirmed-anticipation`, sans vérification externe du fournisseur. Aucun message, paiement, facture client ou droit cadeau n'est créé.

Les quantités déjà réservées deviennent affectées à la commande. Le registre maintient `counts` pour le total immobilisé et `committed` pour son sous-ensemble affecté aux commandes. Le disponible interne reste `max(0, stock déclaré − total immobilisé)`. Exemple testé : stock déclaré 100, réservation d'une unité → disponible 99 ; confirmation → disponible toujours 99, une unité affectée à la commande. Aucun second retrait, aucune décrémentation du Master et aucune consommation physique supposée. Les réservations/libérations d'autres campagnes conservent ces quantités affectées.

Une commande confirmée bloque nouvelle réservation, retrait d'autorisation, libération simple, réécriture de proposition et seconde confirmation. Une confirmation et un retrait concurrents n'ont qu'un gagnant. Motif/auteur/révision et résultat idempotent restent journalisés atomiquement.

Après acquisition, la fiche cadeau retrouve la commande par identité stable équipe/palier dans la campagne, indépendamment de l'ordre actuel des paliers. Elle affiche la référence et les coûts figés en lecture seule. En attendant le rattachement logistique, les nouvelles écritures du suivi et avenants de ce cadeau sont refusés côté serveur, et son formulaire est désactivé pour éviter une deuxième commande. Aucun suivi ni coût acquis n'est créé par cette lecture. Plusieurs correspondances sont refusées, sans rapprochement deviné.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur et attribution des droits, calendrier/barèmes, Master et quantités déclarées, préférences, contrats, règles Firestore fermées, espaces directeur/équipe/kiosque, confirmations antérieures hors rapprochement, main et production. Aucune dépendance ou intégration fournisseur ajoutée.
- **Modifié** : `src/server/gift-reservations.mjs` (confirmation, affectation et recherche exacte), `src/server/gift-proposals.mjs` (protection du nouvel état), `src/server/gift-operations.mjs` (lecture et refus de doublon), `src/server/firebase-http.mjs` (route privée), `src/web/gift-forecast.ts`, `src/web/cockpit.ts`, `web/cockpit.html`, `tests/firebase/gift-reservations.test.mjs`, `tests/firebase-browser/gift-reservations.spec.mjs`.
- **Nouveau** : ce rapport et six captures R7G. Pas de nouvelle collection de suivis acquis ni de migration.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis, y compris après le dernier ajustement du libellé de stock.
- `node --test tests/visual/public-build.test.mjs tests/anticipated-composition.test.mjs` : **4/4**.
- `node --test tests/firebase/gift-reservations.test.mjs tests/firebase/gift-operations.test.mjs` : **23/23**. Coûts figés après changement réel des prix, quantité immobilisée non doublée, autre campagne réservée/libérée sans perte du stock affecté, absence de nouveau droit/suivi, concurrence confirmation/retrait, refus des champs injectés/contextes périmés/accès retirés, rapprochement malgré réordonnancement et refus de correspondance ambiguë.
- Premier passage navigateur : **6 réussites, 2 échecs d'assertion**. `toBeDisabled()` visait le `fieldset`, alors que l'arbre accessible montrait déjà les champs et le bouton désactivés. Le test vérifie désormais la propriété DOM `disabled` du conteneur et l'état désactivé du bouton « Enregistrer le suivi ». Aucun changement applicatif nécessaire pour ce correctif de test.
- `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs gift-forecast.spec.mjs gift-operations.spec.mjs` après correction : **8/8**, desktop 1440/mobile 390. Retrait et confirmation, réponses perdues récupérées, CSRF, refus employé/directeur, commande reconnue après acquisition et formulaire bloqué ; workflow historique jusqu'à la livraison conservé.
- Rejeu final après précision du libellé de stock et ajout du refus de confirmation après acquisition : `node --test tests/firebase/gift-reservations.test.mjs` **10/10**, puis `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs` **4/4**.
- Commandes intégrées exécutées avec `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Chromium local 141, données fictives uniquement. Configuration temporaire retirée avant commit ; captures antérieures régénérées restaurées. `git diff --check` réussi.

Captures inspectées : [confirmation desktop](evidence/v5-r7g-confirmation-desktop.png), [confirmation mobile](evidence/v5-r7g-confirmation-mobile.png), [commande desktop](evidence/v5-r7g-ordered-desktop.png), [commande mobile](evidence/v5-r7g-ordered-mobile.png), [cadeau acquis desktop](evidence/v5-r7g-acquired-desktop.png), [cadeau acquis mobile](evidence/v5-r7g-acquired-mobile.png). Panneaux concernés ; kiosque inchangé, aucune nouvelle capture kiosque.

## Limites et suite

Le rapprochement est une lecture et une protection anti-doublon, pas encore un transfert vers le suivi logistique acquis. Les coûts restent dans la commande anticipée ; ils ne sont pas copiés dans les totaux du cockpit acquis. Pour ces cadeaux, le formulaire acquis reste bloqué jusqu'à l'implémentation du rattachement explicite et de la résolution des conflits éventuels. Aucune commande historique existante n'est écrasée.

Consommation physique, réception de marchandises, annulation/retour de commande confirmée, avenants anticipés et consolidation des engagements dans les budgets restent à traiter. Une commande confirmée ne peut pas être libérée comme une simple réservation. Les conditions restent déclaratives et les bases fiscales/contrats doivent être validés avant usage réel. Le stock Master demeure un plafond brut déclaré, pas une disponibilité fournisseur certifiée.

La référence de commande n'est pas une clé d'unicité globale : les commandes regroupées peuvent partager une référence ; la protection porte sur le même palier de la même équipe/campagne. Rapprochement borné à 100 fiches par équipe, sans migration des anciennes données. Une confirmation manquante après acquisition devra passer par un traitement explicite, pas par une reconstitution automatique.

Suite : rattachement logistique contrôlé, consommation/retours et budgets d'engagement, puis R8/R9 et recette réelle Sheets. Aucune URL de test revalidée. Aucun achat/envoi réel, déploiement, fusion main, migration ou changement production. Cette tranche n'est pas la dernière avant déploiement test ; le porteur sera prévenu avant cette étape.
