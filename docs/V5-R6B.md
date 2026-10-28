# V5 R6B — gel de la fiche financière confirmée

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise local et distant : `bb8fc813d783993a5096cf606441467d865da5c3`, quatre CI réussies. Source : cahier Rouge Clémence V5 du 28 octobre 2026, §7.5, conservation des coûts/libellés à la confirmation. Travail limité aux émulateurs Auth/Firestore Standard `demo-rc-voyage` ; aucune nouvelle instance ni migration.

## Livré

Au passage « à commander » → « à recevoir », la transaction existante enregistre un instantané version 1 : composition textuelle, fournisseur, référence de commande, achat, emballage, transport, attestation sans alcool, budget de référence, total, écart, date, auteur et révision. Sa source est explicitement `operator-confirmed` : ce sont les valeurs saisies et confirmées par Clem, pas une nouvelle lecture supposée du Master.

Ces valeurs deviennent immuables via le service, y compris en incident et après reprise. Une nouvelle tentative identique de confirmation reste idempotente. Les transitions de suivi, responsable, échéance et référence de remise restent disponibles jusqu'à la livraison selon les règles existantes. Le cockpit affiche la date/coût confirmés, passe les champs concernés en lecture seule et désactive les propositions de remplacement. Le serveur refuse aussi une modification forgée ou un instantané fourni par le client.

L'instantané survit aux écritures ultérieures du suivi. Le budget et l'écart affichés pour la commande confirmée utilisent la référence conservée, sans réécrire les budgets de campagne. Les données financières demeurent dans les API privées du cockpit ; les projections employé/collectif ne récupèrent aucun nouveau champ.

Les commandes historiques déjà confirmées sans instantané sont reconnues par leur statut (ou statut de reprise d'incident) : leurs valeurs actuellement enregistrées sont protégées contre de nouvelles réécritures. Aucun auteur, date ou prix historique n'est reconstitué ; le cockpit annonce explicitement l'absence d'instantané passé. Aucune écriture de migration n'est exécutée.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, carte, distances, seuils, droits acquis, préférences R5, import R6A, habilitations, règles Firestore, main et production. Aucun achat/envoi réel.
- **Modifié** : `src/server/gift-operations.mjs` (instantané, protection serveur, projection privée), `src/web/cockpit.ts` et `web/cockpit.html` (état confirmé et champs verrouillés), `tests/firebase/gift-operations.test.mjs`, `tests/firebase-browser/gift-operations.spec.mjs`, `tests/firebase-browser/supplier-catalog.spec.mjs`.
- **Nouveau** : ce rapport et deux captures `docs/evidence/v5-r6b-confirmation-*.png`.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis. Un contrôle TypeScript a initialement refusé une comparaison après restriction du type dans le traitement asynchrone de proposition ; le contrôle final relit maintenant la valeur booléenne de la sélection courante. Compilation et build rejoués avec succès.
- Sous émulateurs : `node --test tests/firebase/gift-operations.test.mjs tests/firebase/gift-beneficiaries.test.mjs tests/firebase/supplier-catalog.test.mjs` : **14/14**. Confirmation concurrente unique ; tous les champs figés refusent leur réécriture ; hausse de prix, renommage et archivage par import CSV sans effet sur la fiche confirmée ; incident/reprise puis livraison ; absence dans la projection employé ; révocation ; protection des anciens dossiers sans création d'instantané ; gel des préférences R5 conservé.
- `npx playwright test --config playwright.local-check.config.mjs beneficiaries.spec.mjs gift-operations.spec.mjs preference-freeze.spec.mjs supplier-catalog.spec.mjs` : **8/8**, desktop 1440/mobile 390. Champs en lecture seule, proposition désactivée, responsable encore modifiable, confirmation affichée, suivi jusqu'à la livraison et gel des goûts conservé.
- Premier sous-ensemble navigateur de trois scénarios : **5/6**. Le test catalogue sélectionnait la première ligne disponible, modifiant la fiche prévue pour la livraison mobile lorsque le scénario bénéficiaires n'était pas lancé. Il choisit désormais explicitement « Les Hirondelles », distincte des deux équipes de livraison. Aucune assertion de révision, coût, historique ou livraison n'est retirée. Rejeu des quatre scénarios : **8/8**.
- Commande d'isolation : `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. L'émulateur confirme l'édition Standard au démarrage. Chromium local 141, configuration temporaire supprimée avant commit ; navigateur verrouillé en CI. Captures inspectées, `git diff --check` réussi. Résultats CI suivis dans la PR.

Captures du bloc financier confirmé : [desktop](evidence/v5-r6b-confirmation-desktop.png), [mobile](evidence/v5-r6b-confirmation-mobile.png). Kiosque inchangé, sans nouvelle capture ciblée ; les preuves R4 restent applicables au rendu.

## Limites et suite

Le gel porte sur la **fiche globale validée par Clem**. La composition actuelle reste textuelle : aucune extraction de SKU, quantité, TVA ou prix unitaire n'est devinée depuis ce texte. Le rattachement structuré des lignes catalogue et de leur version reste à réaliser. Les montants conservent la base fiscale existante, non validée commercialement ; l'écart n'est pas présenté comme une marge comptable certifiée.

Les avenants, substitutions et corrections financières après confirmation devront former un flux distinct et audité ; cette tranche ne propose pas de déverrouillage ni d'écrasement de l'original. Les dossiers historiques peuvent avoir été modifiés avant cette protection ; leur prix originel demeure inconnu.

Poursuite de R6 : lignes catalogue structurées et prix unitaires figés, Google Sheets autorisé côté serveur, XLSX, rétention/restauration des imports. Puis R7 anticipation, R8 réception/directeur et R9 recette intégrée/pilote. Aucun déploiement, aucune URL de test nouvellement constatée ; staging antérieur non revalidé. Ce n'est pas la dernière tranche et le passage au déploiement test sera annoncé séparément.
