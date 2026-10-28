# V5 R7B — aperçu de composition anticipée

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise vérifiée au HEAD local/GitHub `56c099b66474befc2613d10f658109a3f128e1b9`. Source : Rouge Clémence / Le Ludificateur, cahier V5 du 28 octobre 2026, §7.3 et §7.6. Aucun déploiement.

## Livré

Sur chaque prévision estimable, Clem peut prévisualiser une composition. Les frais d'emballage et de transport sont à renseigner explicitement, même nuls. Le serveur relit dans une transaction les droits, la campagne, le prochain palier, sa date estimée, son budget, les membres actifs affectés à l'équipe, leurs préférences actuelles et le catalogue. Le client ne peut fournir ni budget, ni date cible, ni SKU, ni préférences. Un palier changé ou une prévision devenue indisponible est refusé.

Les règles déterministes existantes sont réutilisées : panier partagé sans alcool, une unité par univers retenu, priorité des préférences puis prix et identifiant stable. Aucun multiplicateur d'effectif ou panier individuel n'est inventé. Sans profil renseigné, l'aperçu est annoncé générique. Les membres inactifs/non participants/non affectés sont ignorés. Toute demande de contact privé parmi les membres concernés bloque l'aperçu : aucune procédure de levée de ce blocage n'est ajoutée ici.

Le stock déclaré nul exclut une référence même si son statut annonce une disponibilité. Les délais, saisons, disponibilités et budget contraignent la suggestion. Les références manquantes restent explicites. L'aperçu indique prix, base fiscale, taux de TVA connu ou inconnu, stock déclaré, restrictions produit, délai fournisseur maximal, date limite indicative de commande sans marge de préparation et écart au budget. Les taux ne sont pas inventés ; aucun total TVA comptable n'est calculé sur des bases non harmonisées.

L'exposition potentielle représente achat + emballage + transport si ces dépenses étaient engagées sans acquisition finale du cadeau. Il ne s'agit pas d'un coût déjà engagé. Le stock disponible après réservations et les conditions de retour restent inconnus. Aucune réservation, commande, préférence figée, tâche ou attribution n'est écrite.

Les champs de frais sont bloqués pendant la lecture. Un changement de frais efface l'ancien aperçu ; les réponses d'une carte supprimée par filtrage/actualisation ne sont pas affichées. Les préférences nominatives et identifiants des membres ne sont pas renvoyés.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, seuils, calendrier, droits acquis, confirmations et avenants, catalogue importé, règles Firestore, espaces directeur/employé/kiosque, main et production.
- **Modifié** : `src/server/gift-operations.mjs`, `src/server/firebase-http.mjs`, `src/web/gift-forecast.ts`, `tests/firebase/gift-operations.test.mjs`, `tests/firebase-browser/gift-forecast.spec.mjs`.
- **Nouveau** : `src/operations/anticipated-composition.mjs`, `tests/anticipated-composition.test.mjs`, ce rapport et deux captures R7B.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/anticipated-composition.test.mjs tests/visual/public-build.test.mjs` : **4/4**. Coûts, exposition, dates, absence de mutation, stock nul, saison/délai, budget et build public sans données privées.
- `node --test tests/firebase/gift-operations.test.mjs` : **9/9**. Préférences actualisées, membres inactifs exclus, contact privé bloquant, scope client, révocation, injections refusées, palier périmé, absence de commandes/écritures et régressions du cockpit.
- `npx playwright test --config playwright.local-check.config.mjs gift-forecast.spec.mjs` : **2/2**, desktop 1440/mobile 390. Prévisualisation, exposition, filtres et refus des espaces employé/directeur pour les prévisions. Contrôle de l'effacement après modification des frais puis nouvelle prévisualisation.
- Commandes intégrées enveloppées dans `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Données fictives, Chromium local 141. Configuration temporaire supprimée avant commit. Captures historiques régénérées restaurées. SHA final et CI liés dans la PR.

Captures de l'aperçu : [desktop](evidence/v5-r7b-composition-desktop.png), [mobile](evidence/v5-r7b-composition-mobile.png). Kiosque inchangé, sans nouvelle capture.

## Limites et prochaine tranche

R7 reste partielle : pas de réservation de stock, validation de commande anticipée, historique de propositions ni acceptation de conditions de retour. Le budget du palier est configuré, sa validation commerciale n'est pas attestée. La liste des membres actuels ne constitue pas une confirmation des bénéficiaires lors du futur franchissement. Les allergènes/restrictions nécessitent une revue humaine.

Prochaine tranche : persistance et revue humaine d'une composition envisagée, gestion explicite des réservations et de leur risque avant tout engagement. Connexion Master Sheets réelle et politique de rétention toujours à valider. Aucun déploiement, migration, achat ou envoi. Aucune URL de test revalidée ; cette tranche n'est pas la dernière avant déploiement.
