# V5 R7D — proposition anticipée et cadeau acquis

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise vérifié localement et sur GitHub : `d206db473734c4f2a3d21e04f497df14de430ae1`. Source : Rouge Clémence / Le Ludificateur, cahier V5 du 28 octobre 2026, §7.3 et §7.6. Aucun déploiement.

## Livré

La fiche d'un cadeau réellement acquis peut afficher la proposition anticipée correspondante. Le serveur part du droit acquis existant, retrouve son palier dans la campagne puis contrôle l'équipe, le numéro et l'identité exacte du palier dans la proposition. L'écran présente version, date, auteur, motif, ancienne revue, produits, fournisseurs, restrictions, prix et coûts envisagés comme une référence historique.

Cette lecture ne remplit aucun champ de commande et ne change ni les montants du suivi, ni une confirmation existante. L'historique conserve ses anciens prix après une modification du catalogue. Préférences, bénéficiaires, stock, délais et tarifs doivent être revérifiés avant préparation. Une revue passée n'est pas présentée comme une autorisation actuelle.

Les nouveaux aperçus conservés portent l'identité explicite du palier. Les propositions R7C antérieures qui ne la portent pas restent stockées mais ne sont pas associées automatiquement : leur numéro seul n'est pas considéré comme une preuve. Identité absente/non concordante, palier disparu et absence de proposition ont des états distincts. Aucune migration ni reconstitution historique.

La projection du rapprochement contient seulement les champs nécessaires ; pas d'empreinte interne ni de préférence nominative. Elle utilise la route de détail et les autorisations cadeaux existantes. Le contenu affiché est effacé avant chaque changement de fiche. Les liens d'employé ajoutés par l'ancien profil de démonstration sont retirés du cockpit, comme sur la vue prévisions.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, calendrier, barèmes, attribution des droits, commandes et coûts confirmés, catalogue, permissions/règles Firebase, main et production. Aucun nouveau endpoint ni écriture lors du rapprochement.
- **Modifié** : `src/server/gift-proposals.mjs` (identifiant de document partagé et rapprochement), `src/server/gift-operations.mjs` (identité du palier dans l'aperçu et détail acquis), `src/web/cockpit.ts`, `web/cockpit.html`, `tests/firebase/gift-operations.test.mjs`, `tests/firebase-browser/gift-forecast.spec.mjs`.
- **Nouveau** : ce rapport et trois captures R7D.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/visual/public-build.test.mjs tests/anticipated-composition.test.mjs` : **4/4**.
- `node --test tests/firebase/gift-operations.test.mjs` : **13/13**. Acquisition par le moteur, lien exact, historique à prix constant après changement du catalogue, champs de suivi initialement vides, confirmation indépendante à 70 €, historique envisagé conservé, identité absente/autre palier/autre équipe refusés, accès non opérateur et retrait de campagne refusés. Aucun suivi créé par la consultation, payload de campagne inchangé.
- `npx playwright test --config playwright.local-check.config.mjs gift-forecast.spec.mjs gift-operations.spec.mjs` : **4/4**, puis **4/4** après nettoyage des liens de démonstration et complément de capture mobile. Desktop 1440/mobile 390 : proposition conservée et relue, franchissement fictif de quatre semaines par le moteur, consultation dans le cockpit acquis, coût historique 51,50 €, achat saisi restant à 0 € et référence de commande vide. Parcours de livraison et protection des coûts confirmés conservés.
- Commandes intégrées exécutées dans `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Données fictives, Chromium local 141 ; aucune progression d'une campagne réelle. Configuration temporaire supprimée avant commit.
- Captures historiques régénérées restaurées. `git diff --check` réussi. SHA final et CI liés dans la PR.

Captures inspectées : [desktop](evidence/v5-r7d-acquired-desktop.png), [mobile](evidence/v5-r7d-acquired-mobile.png), [mobile — montants et précautions après défilement](evidence/v5-r7d-acquired-mobile-review.png). La barre fixe reste présente ; le complément montre les informations qu'elle masquait dans la capture du panneau long. Kiosque inchangé, sans nouvelle capture.

## Correctif de recette intégrée

La CI initiale a révélé une hypothèse incorrecte du test mobile : le catalogue partagé avait été modifié par un scénario précédent (infusion à 13 €), et la proposition conservée totalisait donc 52,50 € au lieu des 51,50 € du catalogue initial. L'application affichait correctement cet instantané. Le test compare désormais le total historique affiché au montant de la proposition réellement enregistrée, sans supposer un prix initial constant.

Rejeu ciblé avec `gift-forecast.spec.mjs supplier-catalog.spec.mjs` dans les émulateurs : **4/4**, avec modification du catalogue entre les passages desktop et mobile. Aucun code applicatif changé par ce correctif. Captures du premier passage isolé conservées ; elles représentent son catalogue initial.

## Limites et suite

Lecture du dernier état conservé pour ce palier, sans transfert automatique de composition ni validation de commande. Une modification de l'ordre ou la suppression des paliers peut empêcher le rapprochement ; le système ne tente pas de deviner une correspondance. Les anciennes versions restent dans l'historique R7C, pas dans un nouvel écran transversal.

R7 reste partielle : réservations de stock, annulation/libération, conditions de retour, engagements et autorisation d'achat restent à développer. La connexion réelle au Master Sheets et la politique de rétention restent à valider. R8/R9 restent à poursuivre.

Aucun déploiement, migration, achat, envoi ou merge main. Aucune URL de test revalidée. Cette tranche n'est pas la dernière avant déploiement ; le porteur sera prévenu avant cette étape.
