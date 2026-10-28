# V5 R7H — rattachement au suivi du cadeau acquis

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise local et distant : `5e847b817656497b95360ee713d820e2c22d36d0`, quatre workflows réussis. SHA livré et CI finale consignés dans la PR. Aucun déploiement.

## Livré

Clem peut rattacher explicitement une commande anticipée confirmée au cadeau réellement acquis de la même équipe et du même palier. Le serveur exige une correspondance unique, le même budget, la révision courante, une liste de bénéficiaires confirmée et une revue à jour des préférences, y compris les demandes de contact privé. Responsable, échéance, motif et reconnaissance de compatibilité sont obligatoires. Tout suivi existant, même un brouillon de révision zéro, interdit le rattachement : aucun écrasement automatique.

Une transaction crée le suivi « À réceptionner », le lien dans chaque sens et les traces attribuées. Elle conserve intégralement l'instantané de commande, ses coûts, lignes SKU, auteur et date d'origine. Les préférences sont figées à la date du rattachement, affichée comme telle ; aucune préférence historique n'est reconstituée. Le catalogue peut avoir changé entre-temps sans réécrire la commande.

Le suivi logistique existant et les avenants financiers deviennent utilisables ; les montants initiaux restent verrouillés. Un lien absent ou incohérent bloque les modifications. Une réponse perdue se récupère par rechargement ; rejouer la même demande après livraison ne remet pas le suivi à son état initial. Deux demandes concurrentes ne créent qu'un seul suivi.

La vue anticipée présente ses montants comme historiques et renvoie les ajustements à la fiche acquise. Aucune addition des deux vues ni nouveau budget consolidé n'est introduit.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, droits cadeaux, calendrier, barèmes, Master et stock déclaré, permissions des espaces directeur/équipe/kiosque, règles Firestore, main et production.
- **Modifié** : `src/server/gift-reservations.mjs`, `src/server/gift-operations.mjs`, `src/server/gift-amendments.mjs`, `src/server/gift-beneficiaries.mjs`, `src/server/firebase-http.mjs`, `src/web/cockpit.ts`, `src/web/gift-forecast.ts`, `tests/firebase/gift-reservations.test.mjs`, `tests/firebase-browser/gift-reservations.spec.mjs`.
- **Nouveau** : ce rapport, quatre captures R7H, lien de rattachement et journal idempotent dans les documents opérationnels existants. Aucune migration.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/firebase/gift-reservations.test.mjs tests/firebase/gift-operations.test.mjs tests/firebase/gift-beneficiaries.test.mjs` : **31/31**. Refus des brouillons existants, révisions/contexte/budget incorrects, revue périmée et accès retirés ; conservation des coûts et reprise idempotente.
- `node --test tests/gift-amendments.test.mjs tests/visual/public-build.test.mjs tests/anticipated-composition.test.mjs` : **6/6**.
- Rejeu final `node --test tests/firebase/gift-reservations.test.mjs` après ajout du contrôle du lien incohérent : **13/13** ; cycle incident/reprise/livraison, avenant, préférences figées et quantités inchangées vérifiés.
- `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs gift-forecast.spec.mjs gift-operations.spec.mjs` : **8/8**, desktop et mobile. Bénéficiaires/revue, formulaire, réponse perdue après écriture, rechargement, reprise logistique, refus CSRF et refus employé/directeur.
- Tests intégrés sous `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`, données fictives uniquement. Configuration Chromium locale temporaire retirée ; captures historiques régénérées restaurées. `git diff --check` réussi.

Soit 45 cas ciblés distincts réussis, dont 13 serveur rejoués après les derniers ajustements. Captures des panneaux inspectées : [formulaire desktop](evidence/v5-r7h-attachment-form-desktop.png), [formulaire mobile](evidence/v5-r7h-attachment-form-mobile.png), [commande rattachée desktop](evidence/v5-r7h-attached-desktop.png), [commande rattachée mobile](evidence/v5-r7h-attached-mobile.png). Kiosque inchangé, aucune nouvelle capture kiosque.

## Limites et suite

Les quantités restent immobilisées, même après livraison : cette tranche ne simule aucune consommation physique, réception fournisseur, annulation ou retour. Le Master et le registre de stock sont inchangés. Ces mouvements, la consolidation des engagements et le traitement explicite des conflits avec des suivis déjà existants restent à développer. Les données fournisseur restent déclaratives ; aucun achat, paiement ou envoi réel.

Suite : consommation/retours et consolidation des engagements, puis R8/R9 et recette Google Sheets réelle. Aucune URL de test revalidée, aucun déploiement, aucune fusion main ou modification production. R7H n'est pas la dernière tranche avant déploiement test ; le porteur sera prévenu avant cette étape.
