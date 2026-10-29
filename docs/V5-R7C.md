# V5 R7C — conservation et revue des propositions

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise vérifiée localement et sur GitHub : `17215abd0e848c35790ad88fc674a48aebd0e1fb`. Source : Rouge Clémence / Le Ludificateur, cahier V5 du 28 octobre 2026, §7.3 et §7.6. Aucun déploiement.

## Livré

Clem peut conserver l'aperçu d'une composition anticipée, recharger sa fiche et son historique, puis la marquer comme relue avec un motif. Le serveur conserve son propre calcul, jamais un contenu produit/prix envoyé par le navigateur. La fiche présente produits, fournisseurs, prix, base fiscale, restrictions, frais, cible et exposition potentielle avant relecture.

États explicites : composition envisagée, relue sans engagement, proposition périmée. La relecture ne constitue ni une réservation, ni une commande, ni une confirmation des bénéficiaires. Une composition incomplète peut être conservée comme brouillon, mais ne peut pas être marquée relue.

Les droits cadeaux sont relus dans chaque transaction. Une empreinte de l'aperçu lie la proposition à l'entreprise, campagne, équipe, identité/seuil du palier, budget, date de calcul, date cible, catalogue et membres/préférences actuels. Toute différence impose une nouvelle prévisualisation. Cette politique est conservatrice : un changement de date de calcul ou de version du catalogue peut invalider la proposition même si les produits retenus restent identiques. Les préférences nominatives ne sont pas copiées dans la proposition ; l'empreinte ne remplace pas leur gestion confidentielle.

Chaque conservation ou revue crée une version historique avec auteur, date, motif et instantané des coûts. Les versions ne sont ni écrasées ni supprimées par les routes ajoutées. La fiche courante porte une révision pour refuser les écritures concurrentes. Une mutation déjà enregistrée reste idempotente après des actions ultérieures ; son identifiant réutilisé avec un autre contenu est refusé. Limite technique de vingt versions, conservation et revue comprises.

L'interface exige le chargement de la fiche avant écriture. Elle bloque les commandes pendant l'enregistrement, puis impose un rechargement en cas de réponse incertaine. Les propositions devenues périmées restent consultables, avec revue désactivée. Aucun stock, droit cadeau, commande confirmée ou registre du moteur n'est modifié.

## Inchangé / modifié / nouveau

- **Inchangé** : règles de suggestion R7B, moteur, seuils, calendrier, attribution, confirmations/avenants, catalogue, règles Firestore, main et production. Les API employé/directeur n'exposent pas ces propositions.
- **Modifié** : `src/server/gift-operations.mjs` (calcul partagé de l'aperçu et empreinte), `src/server/firebase-http.mjs` (routes POST protégées), `src/web/gift-forecast.ts`, `.github/workflows/firebase-emulators.yml`, `tests/firebase/gift-operations.test.mjs`, `tests/firebase-browser/gift-forecast.spec.mjs`.
- **Nouveau** : `src/server/gift-proposals.mjs`, sous-collection privée `giftProposals` et historique sous campagne, ce rapport et deux captures R7C. Création uniquement lors d'une conservation explicite ; pas de migration.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/visual/public-build.test.mjs tests/anticipated-composition.test.mjs` : **4/4**.
- `node --test tests/firebase/gift-operations.test.mjs` : **12/12**. Concurrence (une seule écriture gagnante), reprise durable sans doublon, historique/instantanés, catalogue et préférences modifiés, budget changé, palier acquis, brouillon incomplet, prévision indisponible, accès non opérateur/révoqué, contenu injecté refusé ; régressions du cockpit.
- Après ajout de l'identité du palier dans l'empreinte : `node --test --test-name-pattern="proposal" tests/firebase/gift-operations.test.mjs` : **3/3**. Remplacement d'un palier à montant identique ajouté au scénario.
- `npx playwright test --config playwright.local-check.config.mjs gift-forecast.spec.mjs` : **2/2**, desktop 1440/mobile 390. Conservation avec réponse perdue, écriture bloquée jusqu'au rechargement, une seule version constatée, revue motivée et historique de deux versions, refus de lecture de proposition depuis employé/directeur. Campagne inchangée et aucune commande créée.
- Commandes intégrées exécutées dans `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Données fictives, Chromium local 141 ; configuration temporaire supprimée avant commit.
- Captures historiques régénérées restaurées. `git diff --check` réussi. SHA final et résultats GitHub associés dans la PR.

Captures de la fiche relue inspectées : [desktop](evidence/v5-r7c-proposals-desktop.png), [mobile](evidence/v5-r7c-proposals-mobile.png). Aucun débordement horizontal constaté. Kiosque inchangé, sans nouvelle capture.

## Limites et suite

R7 reste partielle. L'écran travaille sur le prochain palier ; les propositions des paliers déjà dépassés restent stockées, mais leur navigation transversale et leur rapprochement avec le cadeau acquis ne sont pas encore implémentés. La lecture serveur d'une ancienne proposition reste protégée par les droits de sa campagne.

La limite de vingt versions n'est pas une politique commerciale de rétention. Pas de signature, facture, engagement financier, réservation de stock, levée du contact privé bloquant, annulation d'achat ni conditions de retour inventées. La revue ne fige pas les goûts pour un cadeau préparé : la préparation n'a pas commencé.

Prochaine tranche : rapprochement des propositions avec les droits acquis et gestion explicite des réservations avant autorisation d'une commande. Master Sheets réel et rétention restent à valider ; R8/R9 restent à poursuivre. Aucune URL de test revalidée, aucun merge main ni déploiement. Le porteur sera prévenu avant le passage au déploiement test ; R7C n'est pas la dernière tranche.
