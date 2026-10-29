# V5 R7E — réservations internes et libération

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise locale/distance vérifiée au HEAD `a0a6c4525ef76efc92b136750d449486acbd0743`, quatre workflows réussis. Source fonctionnelle : Rouge Clémence / Le Ludificateur, cahier V5 du 28 octobre 2026, §7.3 et §7.6. SHA livré et CI finale liés dans la PR. Aucun déploiement.

## Livré

Clem peut réserver explicitement les quantités d'une proposition conservée, complète, relue et encore actuelle. Le serveur recalcule son contexte avant d'accepter : catalogue, palier, budget, équipe, profils et date. Motif et conditions déclarées de réservation/retour sont obligatoires. Les conditions sont du texte opérateur, pas une acceptation d'un fournisseur.

Un registre séparé du Master cumule les quantités par SKU. La transaction commune empêche deux campagnes de réserver la même dernière unité. Stock déclaré inconnu ou insuffisant : refus, sans écriture partielle. Le stock du Master n'est ni décrémenté ni présenté comme du stock fournisseur en temps réel. Les quantités du panier restent celles de R7B, sans multiplication implicite par l'effectif.

Une réservation active bloque la réécriture de sa proposition. Son instantané conserve la composition et les coûts envisagés ; les préférences personnelles restent modifiables pour les autres usages. Cette réservation interne n'autorise aucun achat, ne fige pas un nouveau profil individuel, n'attribue aucun droit et ne crée aucune commande, facture ou dépense engagée.

La liste affiche les réservations du périmètre autorisé, leur exposition potentielle historique, conditions et quantités restantes après réservations internes. Une baisse du stock déclaré peut produire une alerte de déficit global. Aucun nom, budget ou composition d'une campagne non habilitée n'est retourné ; seuls les totaux de stock du catalogue commun participent au calcul.

La libération motivée fonctionne même après acquisition, changement des profils, suppression/archivage du produit ou modification de prévision. Elle ne restaure pas artificiellement le stock du Master. Révision, identité de l'auteur, motif et historique atomique sont conservés ; une réponse perdue est récupérable sans doubler l'opération. Rejouer une ancienne libération n'annule pas une réservation plus récente.

L'écran Prévisions garde toutes les réservations du client visibles, même si l'équipe passe au palier suivant. Le filtre d'horizon ne les masque pas. Une erreur de mutation exige une actualisation/relecture ; une réservation active bloque les boutons de modification de la composition.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, droits acquis, calendrier, barèmes, confirmations et coûts des commandes, import et stock Master, profils individuels, règles Firestore fermées, directeur/équipe/kiosque, main et production.
- **Modifié** : `src/server/gift-operations.mjs` (raccordement), `src/server/gift-proposals.mjs` (protection pendant réservation), `src/server/firebase-http.mjs` (trois routes privées et liste autorisée cadeaux), `src/web/gift-forecast.ts`, `web/previsions.html`, `web/previsions.css`, `.github/workflows/firebase-emulators.yml` (déclencheur du nouveau module), commentaire dans `src/operations/anticipated-composition.mjs`.
- **Nouveau** : `src/server/gift-reservations.mjs`, `tests/firebase/gift-reservations.test.mjs`, `tests/firebase-browser/gift-reservations.spec.mjs`, ce rapport et quatre captures.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis, y compris après le dernier ajustement d'interface.
- `node --test tests/visual/public-build.test.mjs tests/anticipated-composition.test.mjs` : **4/4**.
- `node --test tests/firebase/gift-reservations.test.mjs tests/firebase/gift-operations.test.mjs` : **16/16**. Course entre tenants, stock inconnu/insuffisant, proposition absente/périmée, champs injectés, libération après acquisition et archivage, déficit après baisse du stock, immutabilité Master/campagne, absence de commande, retrait d'accès et historique idempotent.
- `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs gift-forecast.spec.mjs` : **4/4**, desktop 1440 et mobile 390. Réponse perdue après réservation, actualisation, quantités 100 → 99 → 100, libération après acquisition, horizon sans masquage, révocation et refus employé/directeur, aucun débordement horizontal.
- Rejeu final : `node --test tests/firebase/gift-reservations.test.mjs` **3/3**, dont ancienne libération rejouée après nouvelle réservation ; puis `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs` **2/2**, dont composition bloquée par une réservation active.
- Commandes intégrées exécutées avec `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Chromium local 141, données fictives uniquement. Configuration temporaire retirée avant commit. Captures historiques régénérées restaurées.
- `git diff --check` réussi. Les résultats GitHub finaux sont consignés dans la PR, sans assimiler CI et recette commerciale.

Captures inspectées : [réservation desktop](evidence/v5-r7e-reservation-desktop.png), [réservation mobile](evidence/v5-r7e-reservation-mobile.png), [libération desktop](evidence/v5-r7e-released-desktop.png), [libération mobile](evidence/v5-r7e-released-mobile.png). Captures des panneaux concernés ; kiosque inchangé, aucune nouvelle capture kiosque.

## Limites et suite

Registre interne uniquement : aucun échange fournisseur, paiement, consommation de stock, expiration automatique, réservation externe ou annulation de commande. Une commande acquise existante ne consomme pas ce registre automatiquement. Cette séparation doit être raccordée avant un usage réel, afin de ne pas confondre stock réservé et stock consommé. Une quantité Master doit être interprétée comme plafond déclaré brut ; une source qui fournit déjà le net réservé nécessitera une règle d'intégration explicite.

L'aperçu de composition utilise encore le stock déclaré brut ; le contrôle des réservations intervient au clic de réservation et peut refuser cet aperçu. La libération reste une décision humaine. Le journal est conservé côté serveur ; la liste présente le dernier état par équipe/palier, pas une nouvelle vue de tout l'historique. Limites explicites : 200 fiches dans la liste, 1 000 actions par fiche et 1 000 SKU simultanés dans le registre ; pagination/rétention à définir avant extension d'échelle.

R7 reste partielle : autorisation d'achat anticipé, engagements financiers réels, raccordement commande/réservation/consommation et retours restent à développer. Recette réelle Sheets, R8 réception/directeur et R9 restent à poursuivre. Aucune URL de test revalidée. Aucun achat/envoi, déploiement, migration ou merge main ; cette tranche n'est pas la dernière avant déploiement test.
