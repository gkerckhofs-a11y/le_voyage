# Phase 5 — Préparation des attentions depuis le catalogue

Date : 3 novembre 2026. Référence : cahier des charges V1.0, §§ 8.5, 10, 11.2 et 12. Cette tranche développe un premier pont entre les déblocages Cité et le catalogue utilisé par le Cockpit. Elle ne remplace pas le workflow logistique historique et ne passe aucune commande.

## Résultat et fichiers modifiés

- `src/server/cite-gift-preparation.mjs` : propositions individuelles, calcul de coût, vérification humaine, réouverture motivée et service transactionnel autorisé.
- `src/server/cite-store.mjs` : les actions transactionnelles peuvent maintenant attendre leurs lectures de catalogue et de préférences avant l'unique écriture du document privé. Les anciens appels synchrones restent compatibles.
- `src/server/cite-demo-catalog.mjs` : catalogue et préférences fictifs, fondés sur les références de démonstration existantes, sans données client ni appel Google.
- `src/server/cite-prototype.mjs` et `prototypes/la-cite/` : panneau de préparation, estimation, contrôle des préférences/restrictions, historique et projection de la seule proposition personnelle.
- Tests ciblés dans `tests/cite/gift-preparation*.test.mjs`, contrôle HTTP et parcours navigateur complémentaires.

Les modules historiques `catalog-lines.mjs`, `master-sheets.mjs`, `catalog-import.mjs`, `gift-operations.mjs` et `gift-reservations.mjs` ne sont pas modifiés. Les contrôles de sélection et de résolution du catalogue sont réutilisés directement depuis `catalog-lines.mjs`. Les déblocages Cité ne sont pas convertis en anciennes campagnes Voyage.

## Cycle de préparation

Un opérateur doté de `citeRewardOperations: [seasonId]` consulte uniquement les droits de la saison autorisée. Chaque proposition dérive d'un droit personnel déjà débloqué : ni le bénéficiaire ni l'enveloppe ne peuvent être fournis ou augmentés dans la commande. Les récompenses collectives de fête ne passent pas dans ce flux d'attentions individuelles.

1. Sélectionner un droit, une date, des références/quantités et les frais d'emballage et de transport.
2. Enregistrer un brouillon chiffré dans l'enveloppe du droit, avec motif, auteur, date et révision.
3. Vérifier explicitement les préférences et les restrictions des produits. Si un contact privé est demandé, confirmer ce contact.
4. Valider la proposition : le moteur relit catalogue et préférences dans la transaction et refuse les données devenues obsolètes.
5. Une proposition vérifiée est figée. Pour la modifier, la rouvrir avec un motif, puis enregistrer et vérifier à nouveau.

Le serveur accepte plusieurs références ; l'écran local expose pour l'instant une seule référence et une quantité par proposition. L'écran affiche les noms de rôles fictifs plutôt que leurs identifiants techniques.

## Coûts explicites de simulation

Les plans de la phase 4 restent `simulation-only`, en EUR. Les prix du Master sont acceptés seulement lorsque leur base HTVA et leur taux en points de base sont connus. Le calcul du prototype multiplie le montant HTVA de chaque ligne (quantité incluse) par son taux déclaré, arrondit à l'entier en centimes le plus proche avec 0,5 vers le haut, puis additionne les lignes et les frais déclarés taxes incluses. Aucun taux n'est deviné. La base du résultat est `simulation-EUR-incl-tax`.

Exemple fictif : 850 centimes HTVA, taux déclaré de 600 points de base, soit 901 centimes taxes incluses ; emballage de 50 centimes, transport nul : estimation totale de **9,51 €**, dans une attention de 10 €. Le taux de 6 % du catalogue de démonstration est entièrement fictif et ne détermine pas le taux applicable à un produit réel. Le choix des conventions de coûts et des taux pour l'exploitation commerciale reste à valider avant commandes réelles.

Une proposition est refusée si elle dépasse son enveloppe, si une référence n'est plus active/disponible, si son délai ou sa saison ne convient pas, si la quantité excède le stock déclaré ou si sa révision n'est plus celle du catalogue. La règle héritée excluant les références alcoolisées est conservée dans ce flux. Les frais et quantités sont bornés et les calculs côté serveur font autorité.

## Confidentialité et transactions

Le rôle technique de gestionnaire de saison seul ne donne pas accès aux propositions logistiques, aux prix ou aux préférences. Les capacités sont vérifiées à chaque transaction, y compris après révocation. Les lectures de préférences utilisent leur emplacement existant par entreprise ; aucune préférence n'est modifiée par cette tranche. L'écran opérateur reçoit uniquement catégories, indicateurs de choix et demande de contact, sans date d'anniversaire ni contenu de santé libre.

Le collaborateur voit seulement ses propres propositions : statut, date prévue et composition après vérification. Les coûts, marges, catalogue, préférences, empreintes et journaux opérateur ne sont pas envoyés dans cette projection. Les identifiants d'entreprise et de saison sont vérifiés côté serveur.

Les écritures utilisent révision attendue et identifiant de mutation. Une répétition identique ne crée pas une deuxième proposition ou un deuxième journal ; une mutation réutilisée avec un contenu différent est rejetée. Les erreurs de catalogue ou de préférences laissent le document inchangé. Ni les bourses d'écus ni les allocations de récompenses ne sont débités à cette étape.

Le service est limité aux adaptateurs de test autorisés et stocke les propositions dans le même document privé que la saison. La limite existante de 800 Ko reste appliquée ; la projection opérateur du prototype est limitée à 200 attentions. Les tests transactionnels utilisent un substitut sérialisé ; une validation avec l'émulateur Firestore reste nécessaire avant intégration réelle.

## Portée exacte du mot « vérifiée »

La vérification décrit l'état relu **au moment de cette opération**. Ce n'est ni une réservation de stock, ni une garantie de disponibilité future, ni une commande fournisseur. Plusieurs propositions peuvent viser le même stock ; aucune allocation globale de stock n'est effectuée ici. Tout passage futur à la commande devra relire les données et utiliser un ledger de réservation commun avec les autres commandes du Cockpit.

L'interface annonce explicitement « aucun stock réservé, aucune commande passée ». Les statuts sont seulement `draft` et `reviewed`. Aucun statut d'expédition ou de livraison fictivement accomplie n'est ajouté. Les accords contractuels et la fête restent hors de ce flux.

## Vérification

Total ciblé : **60 tests Cité** et TypeScript. Dix tests supplémentaires couvrent calcul et arrondi, TVA/base inconnue, prix/stock/saison/délai, enveloppe, droits, idempotence, réouverture, confidentialité, préférences et contact privé, concurrence et absence d'effet sur les soldes. Douze parcours navigateur sont prévus sur 1440/1920/mobile390, dont préparation et vérification d'une proposition puis consultation de deux personnes différentes. Le résultat navigateur doit être vérifié sur le commit publié. Les captures sont conservées dans `cite-prototype-evidence`.

## Reste à faire

Intégrer ces propositions dans le véritable écran du Cockpit avec authentification et données de test persistantes ; permettre la saisie des préférences via les affectations Cité ; raccorder l'import Sheets existant dans le parcours réel ; ajouter réservation de stock partagée, commande, réception, composition et livraison ; traiter la fête ; tester l'émulateur, les archives et le pilote humain. Les points P0 de contractualisation restent ouverts.

Aucun déploiement, modification de données client ou de règles Firebase. La réconciliation des sources Voyage réellement déployées avec GitHub reste requise avant publication, comme indiqué en phase 0.
