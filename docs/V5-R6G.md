# V5 R6G — connecteur Master Google Sheets

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise vérifié localement et sur GitHub : `d8e48a87f30400d93ee3394a8b40603cfbd8b059`. Source : cahier Rouge Clémence V5 du 28 octobre 2026, §7.5. **Code et parcours simulés validés ; connexion à une feuille réelle non configurée et non testée.**

## Livré

Lecture serveur d'un classeur/onglet configuré explicitement, scope Google de lecture seule, URL construite côté serveur et aucune cible choisissable par le client. Le bouton « Lire le Master et prévisualiser » utilise le même validateur et la même confirmation que CSV/XLSX. Les droits du cockpit sont contrôlés avant la lecture puis lors de la création de l'aperçu. Un retrait d'habilitation pendant la lecture empêche son enregistrement.

Les SKU textuels et centimes sont conservés. Formules, résultats calculés sans valeur saisie, SKU numériques, taux avec format pourcentage, fusions et masquages sont refusés. La réponse distante est limitée à 1 Mo, l'attente à 10 secondes, le tableau à 100 produits/19 colonnes et le CSV normalisé à 120 Ko. Une lecture simultanée maximum par source/processus ; redirections refusées. Les erreurs renvoyées ne contiennent pas les jetons Google.

L'import confirmé est journalisé comme `sheets-import`, avec date de lecture, onglet, libellé et empreintes. L'archive demeure consultable ; les références absentes et les commandes confirmées suivent les protections existantes. La confirmation applique les valeurs présentées dans l'aperçu ; elle ne prétend pas refléter les modifications Google intervenues ensuite. Relecture manuelle, pas de synchronisation périodique.

La configuration de staging reste absente/désactivée tant qu'une source et son accès ne sont pas établis. Les émulateurs utilisent un Master explicitement fictif, sans réseau Google. Voir [configuration serveur et limites](MASTER-SHEETS.md).

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, cartes, distances, seuils, commandes confirmées, règles Firestore, permissions, main et production ; aucun service distant activé ni droit Google changé.
- **Modifié** : `src/server/catalog-import.mjs`, `src/server/supplier-catalog.mjs`, `src/server/firebase-http.mjs`, `src/web/supplier-catalog.ts`, `web/catalogue.html`, `scripts/serve-firebase.mjs`, `scripts/serve-staging.mjs`, `tests/firebase/supplier-catalog.test.mjs`, `.github/workflows/firebase-emulators.yml`, `package.json`, `package-lock.json`.
- **Nouveau** : `src/server/master-sheets.mjs`, `src/server/demo-master-sheets.mjs`, `tests/master-sheets.test.mjs`, `tests/firebase-browser/catalog-sheets.spec.mjs`, `docs/MASTER-SHEETS.md`, ce rapport et deux captures `docs/evidence/v5-r6g-sheets-*.png`.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/master-sheets.test.mjs tests/catalog-import.test.mjs` : **5/5**. Configuration absente/invalide, décodage exact, refus de formules/masquages/fusions/dimensions et valeurs calculées, transport fixé au domaine/source serveur, lecture seule, redirections refusées, erreurs sans jeton, réponse excessive et lecture concurrente refusée. Réponses Google simulées, aucun appel réel.
- `node --test tests/firebase/supplier-catalog.test.mjs tests/firebase/catalog-order-lines.test.mjs` : **12/12**. Source désactivée, refus de retargetage, aperçu sans mutation, confirmation concurrente unique, provenance archivée, import identique sans changement, révocation avant et pendant lecture ; régressions CSV/XLSX/restauration/commandes.
- `npx playwright test --config playwright.local-check.config.mjs catalog-import.spec.mjs catalog-order-lines.spec.mjs catalog-sheets.spec.mjs catalog-xlsx.spec.mjs supplier-catalog.spec.mjs` : **10/10**, desktop 1440/mobile 390. Source fictive annoncée, différences, réponse perdue puis confirmation unique, relecture sans changement, erreur source effaçant l'aperçu, refus depuis l'espace équipe et parcours existants.
- Commandes intégrées enveloppées par `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Firestore Standard observé. Chromium local 141 ; configuration temporaire supprimée avant commit. Navigateur verrouillé en CI.
- `google-auth-library@11.3.1` déjà présente transitivement, désormais dépendance de production directe et exacte. `npm audit --omit=dev --json` : **0 vulnérabilité signalée** au contrôle. `git diff --check` réussi. Anciennes captures régénérées restaurées. SHA final et CI liés dans la PR.

Captures du Master fictif inspectées : [desktop](evidence/v5-r6g-sheets-desktop.png), [mobile](evidence/v5-r6g-sheets-mobile.png). Pas de débordement horizontal constaté. Kiosque inchangé, sans nouvelle capture ciblée.

## Limites et suite

La disponibilité réelle de Sheets, l'identité serveur, le fichier retenu et ses droits restent à vérifier en staging isolé. Aucune réussite de connexion Google réelle n'est annoncée. Les réglages de déploiement n'ont pas été modifiés. La configuration documentée ne constitue pas une autorisation de déploiement.

Suite : avenants financiers et politique de rétention, puis R7 anticipation, R8 réception/directeur et R9 recette intégrée/pilote, incluant la vraie source Sheets. Aucun déploiement, migration ou nouveau service payant. Aucune URL de test nouvellement constatée ; staging antérieur non revalidé. Ce n'est pas la dernière tranche ; le passage au déploiement test sera annoncé séparément.
