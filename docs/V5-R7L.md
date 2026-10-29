# V5 R7L — résultat fournisseur déclaré

29 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise local/distant sur `dd8ff7bcb1e565039e51c7e543f76b1cb8528f74`, quatre workflows réussis vérifiés. Commit livré et CI finale consignés dans la PR. Aucun déploiement.

## Livré

Clem peut enregistrer le résultat d'une demande d'annulation en attente : refus ou acceptation intégrale. Référence de réponse, motif et reconnaissance explicite que la réponse documentée couvre toutes les lignes et tous les fournisseurs de la commande sont obligatoires. Les réponses partielles ne sont pas prises en charge. La source est `operator-declared-supplier-response` : l'application conserve une déclaration de Clem, sans vérification externe du fournisseur ni pièce téléversée. La date affichée est la date d'enregistrement, pas une date de réponse fournisseur inventée.

Un refus clôt la demande et permet de reprendre le rattachement ou le suivi logistique. Une acceptation intégrale maintient le blocage du rattachement, des écritures logistiques et de la consommation. La fiche acquise indique « Annulation fournisseur déclarée », le formulaire est désactivé et aucun second suivi/achat n'est créé. La demande acceptée ne peut plus être retirée comme une simple demande interne ni remplacée par une nouvelle demande.

L'instantané de commande, ses coûts d'origine, le Master, les quantités affectées et les droits cadeaux sont conservés. Le statut technique historique `ordered` reste présent pour le rapprochement et la protection contre les doublons ; l'état d'annulation est porté séparément et affiché explicitement. Aucun remboursement, avoir, retour physique ou réapprovisionnement n'est déduit de cette réponse. Les avenants financiers existants restent séparés et ne sont jamais ajoutés automatiquement.

La transaction revérifie habilitation, campagne, révision, demande en attente, empreinte de commande et lien éventuel au suivi. Une commande consommée ou un suivi déjà livré est refusé. Réponse et retrait concurrents ne peuvent pas être appliqués tous deux. Le journal conserve auteur, date, référence, motif, portée et empreinte. Le rejeu identique retrouve son résultat sans réécrire une décision ultérieure ; un contenu différent avec le même identifiant est refusé.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, campagnes, droits cadeaux, calendrier, barèmes, profils, coûts figés, stock, Master, règles Firebase, espaces directeur/équipe/kiosque, main et production.
- **Modifié** : `src/server/gift-reservations.mjs`, `src/server/gift-operations.mjs`, `src/server/firebase-http.mjs`, `src/web/gift-forecast.ts`, `src/web/cockpit.ts`, `tests/firebase/gift-reservations.test.mjs`, `tests/firebase-browser/gift-reservations.spec.mjs`.
- **Nouveau** : réponse dans les métadonnées d'annulation et journal existant, ce rapport et captures R7L. Aucune migration ni nouveau service.

## Vérifications réelles

Commandes : `npm run typecheck`, `npm run build:web`, `node --test tests/visual/public-build.test.mjs` ; `node --test tests/firebase/gift-reservations.test.mjs tests/firebase/gift-operations.test.mjs` ; `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs gift-operations.spec.mjs`.

Environnement réinitialisé : le premier lancement des émulateurs a été refusé car seul Java 17 restait présent. OpenJDK 21.0.2 a été rétabli localement depuis l'archive officielle. L'installation du navigateur verrouillé a renvoyé des archives invalides ; Chromium Headless Shell 141 (build 1194), déjà utilisé lors des tranches précédentes, a été récupéré depuis le miroir officiel Microsoft. Aucun changement de dépendance verrouillée ni de configuration Firebase. La CI reste la validation avec le navigateur verrouillé.

Tests intégrés sous `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`, données fictives. Configuration navigateur temporaire retirée avant commit ; captures historiques régénérées restaurées.

**Résultats finaux : typecheck/build réussis, 34/34 tests serveur, 8/8 parcours navigateur desktop/mobile et 1/1 contrôle du build public, soit 43 tests ciblés réussis.** `git diff --check` réussi, six captures inspectées. Couverture : acceptation/refus, demande obligatoire et portée intégrale, révisions périmées, concurrence réponse/retrait, idempotence et reprise après réponse perdue, préservation commande/coûts/stock/Master, refus des champs injectés et des accès révoqués/étrangers, CSRF et rôles employé/directeur, reprise après refus et blocage après acceptation avant/après rattachement.

Captures : [réponse refus desktop](evidence/v5-r7l-confirm-response-desktop.png), [réponse refus mobile](evidence/v5-r7l-confirm-response-mobile.png), [actions refus mobile](evidence/v5-r7l-confirm-mobile-actions.png), [acceptation desktop](evidence/v5-r7l-cancel-response-desktop.png), [acceptation mobile](evidence/v5-r7l-cancel-response-mobile.png), [actions acceptation mobile](evidence/v5-r7l-cancel-mobile-actions.png). La capture viewport après défilement complète les panneaux mobiles longs devant la navigation fixe. Kiosque inchangé, aucune nouvelle capture kiosque.

## Limites et suite

La réponse ne solde ni le stock ni les finances. Les quantités restent indisponibles ; les montants affichés sont ceux de la commande historique et de ses avenants, pas un solde d'annulation certifié. Les cadeaux acquis concernés restent bloqués jusqu'à un traitement explicite de remplacement/régularisation. Les réponses partielles, corrections d'une acceptation enregistrée et preuves documentaires jointes ne sont pas disponibles dans cette tranche.

Suite : régularisation des quantités et retours, frais/avoirs/remboursements documentés et consolidation des engagements, puis R8/R9 et recette réelle Sheets. Aucune URL de test revalidée, aucun achat/envoi/paiement, aucune fusion main, migration ou modification production. R7L n'est pas la dernière tranche avant déploiement test.
