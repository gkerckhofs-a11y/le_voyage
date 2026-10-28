# V5 R6D — consultation des archives d’import

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise vérifié localement et sur GitHub : `2473436fa5bc7db2fd7dd4b5dd487d3e25042a8f`, quatre workflows réussis. Source : Rouge Clémence, cahier des charges V5 du 28 octobre 2026, §7.5 (import contrôlé, logs et archivage).

## Résultat

Le cockpit propose « Consulter les imports confirmés ». Il affiche les imports appliqués, leur source, révision, date, auteur, motif et nombre de changements. Chaque fiche détaille les valeurs avant/après et le catalogue complet conservé après cet import, avec SKU et métadonnées. Les champs absents restent indiqués comme non renseignés. Aucune image distante n'est chargée, aucune restauration ni modification du catalogue ou des commandes n'est exécutée.

Cette tranche rend consultables les archives déjà conservées par R6A ; elle ne reconstitue pas d'historique absent. L'expiration d'un aperçu n'efface pas une archive confirmée. Les aperçus non confirmés sont exclus, y compris pour leur auteur. Les coûts et métadonnées restent privés, accessibles uniquement avec l'habilitation catalogue existante du cockpit. L'habilitation est relue dans chaque transaction. Les routes sont limitées à l'espace cadeaux et protégées par la session/CSRF existante.

L'historique est parcouru par pages de vingt événements d'audit, avec lecture supplémentaire d'un événement pour déterminer la présence d'une page suivante. Une page peut ne contenir que des modifications manuelles : le curseur permet de continuer sans perdre les anciens imports. Les archives ne sont pas limitées aux vingt événements visibles dans le panneau historique courant. La requête utilise le même champ de classement et de borne, sans nouvel index composite ou migration.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, cartes, seuils, droits acquis, commandes confirmées R6B/R6C, format CSV, confirmation et archivage des produits, règles Firestore, main et production.
- **Modifié** : `src/server/catalog-import.mjs` (liste paginée et détail privés), `src/server/firebase-http.mjs` (deux routes de lecture POST), `src/web/supplier-catalog.ts` et `web/catalogue.html` (consultation), `tests/firebase/supplier-catalog.test.mjs`, `tests/firebase-browser/catalog-import.spec.mjs`, `.github/workflows/firebase-emulators.yml` (déclenchement sur le module import).
- **Nouveau** : ce rapport et les captures `docs/evidence/v5-r6d-archive-desktop.png` et `docs/evidence/v5-r6d-archive-mobile.png`.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/catalog-import.test.mjs` : **3/3**.
- `node --test tests/firebase/supplier-catalog.test.mjs tests/firebase/catalog-order-lines.test.mjs` : **8/8**. Conservation après hausse de prix/archivage ultérieur, refus des aperçus non appliqués, pagination traversant vingt modifications manuelles, bornes/entrées invalides, absence de mutation pendant la consultation, révocation ; import et commandes structurées conservés.
- `npx playwright test --config playwright.local-check.config.mjs catalog-import.spec.mjs catalog-order-lines.spec.mjs supplier-catalog.spec.mjs` : **6/6**, desktop 1440/mobile 390. Consultation du détail, différences de TVA, révision courante inchangée, contenu effacé après un refus de lecture, refus des deux routes depuis l'espace équipe, parcours d'import et de commandes existants.
- Commandes d'intégration enveloppées par `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Édition Standard observée. Chromium local 141 ; configuration locale temporaire supprimée avant commit. Navigateur verrouillé en CI.
- `git diff --check` réussi. Résultats CI et SHA final consignés dans la PR. Les anciennes captures régénérées par les tests ont été remises à leur version précédente.

Captures inspectées : [desktop](evidence/v5-r6d-archive-desktop.png), [mobile](evidence/v5-r6d-archive-mobile.png). Kiosque inchangé, sans nouvelle capture ciblée.

## Limites et prochaine tranche

Aucune durée de rétention ni purge automatique n'est décidée ici. La restauration contrôlée d'une version et les avenants financiers restent à développer séparément. Google Sheets direct et XLSX ne sont pas raccordés ; cette consultation d'archives ne les remplace pas. Suite R6 : poursuivre les modes d'import, puis R7 anticipation, R8 réception/directeur et R9 recette intégrée/pilote.

Aucun déploiement, aucune migration, aucun nouveau service payant. Aucune URL de test nouvellement constatée ; staging antérieur non revalidé. R6D n'est pas la dernière tranche ; le passage au déploiement test sera annoncé séparément.
