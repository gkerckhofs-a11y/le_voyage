# Phase 6 — Réservations de stock communes

Date : 3 novembre 2026. Référence : cahier V1.0, §§ 8.5, 10, 11.2 et 12. Cette tranche prolonge la préparation des attentions : un opérateur autorisé peut réserver les quantités d'une proposition vérifiée, puis les libérer. Aucun achat, commande ou déploiement n'est effectué.

## Fichiers et comportement

`src/server/cite-gift-stock.mjs` ajoute le moteur de réservation/libération et son service transactionnel. `cite-gift-preparation.mjs` bloque les modifications pendant une réservation et projette les disponibilités ; `cite-prototype.mjs` et le panneau local permettent de jouer ces actions sur données fictives. `src/cite/canonical.ts` permet de comparer les devis indépendamment de l'ordre des champs d'une map relue en base.

La réservation exige un droit personnel débloqué, une proposition vérifiée, sa révision actuelle, un motif et un identifiant de mutation. Le service relit le catalogue, le devis, les préférences et les quantités globales. Il refuse une proposition devenue obsolète, un SKU ambigu, une quantité inconnue ou insuffisante et un registre incohérent. Aucune quantité ni enveloppe financière n'est acceptée depuis la commande de réservation : elles proviennent du devis vérifié.

Réserver ne diminue pas le stock déclaré du Master. La libération est explicite, motivée et enregistrée dans l'historique. Elle reste possible après changement, archivage ou disparition du catalogue et après changement des préférences, à partir des quantités précédemment réservées. Elle ne libère jamais les quantités engagées ou consommées des autres commandes. Une proposition réservée doit être libérée avant réouverture/modification.

## Registre partagé avec le Cockpit

Le document est exactement celui des réservations héritées : `{catalogDocument}/reservationLedger/main`. Les clés SKU utilisent le même SHA-256 du SKU sérialisé en JSON que `gift-reservations.mjs`.

| Champ | Signification |
|---|---|
| `counts` | Total indisponible : réservations et unités consommées non encore rapprochées |
| `committed` | Sous-ensemble déjà engagé par les commandes héritées |
| `consumed` | Sous-ensemble déclaré consommé en attente de rapprochement |
| `citeHeld` | Sous-ensemble des réservations Cité, ajouté dans cette tranche |

Les champs existants et métadonnées sont conservés. L'invariant contrôlé est `counts >= committed + consumed + citeHeld`, avec entiers positifs ou nuls. Les quantités disponibles sont `max(0, stock déclaré − counts)`. Les registres sans `citeHeld` sont compatibles : ce sous-ensemble commence vide. Les méthodes héritées conservent les champs supplémentaires par leur écriture avec propagation du registre existant ; elles tiennent déjà compte de `counts`.

La réservation ajoute les quantités à `counts` et `citeHeld` ; la libération retire seulement les quantités de la réservation Cité ciblée. Les compteurs nuls sont supprimés pour les SKU concernés. Le document technique est limité à 1 000 clés par compteur et 800 Ko, avec refus de l'opération si ces limites sont dépassées.

Le test de compatibilité invoque l'implémentation réelle de `createGiftReservations` avec une proposition et une base transactionnelle de test : la réservation héritée bloque La Cité, puis La Cité bloque la réservation héritée. Ce test ne constitue pas un test de toute la chaîne commerciale historique ni une validation sur données réelles.

## Atomicité et confidentialité

L'écriture du registre commun et celle de la proposition privée ont lieu dans la même transaction. Toutes les lectures précèdent les écritures. Si le contrôle de capacité du document privé échoue après préparation des écritures, aucune écriture n'est validée. Un retry identique ne réserve/libère pas une seconde fois ; un ancien retry de libération n'affecte pas une nouvelle réservation.

Les droits `citeRewardOperations` sont revérifiés, y compris pour la libération. Un collaborateur ne reçoit que le statut de réservation de sa propre attention ; il ne reçoit ni les compteurs globaux, ni les identités ou propositions d'une autre entreprise. L'opérateur habilité voit les disponibilités agrégées du catalogue, sans liste des autres clients.

Les services restent limités aux adaptateurs de test autorisés. Le serveur local conserve son catalogue et ses réservations fictives en mémoire ; « Recommencer » les remet à zéro sans toucher à Firestore. Le mot « réservé » de cette démonstration n'engage aucun stock réel. Le flux de fête reste hors de ces réservations individuelles.

## Validation ciblée

- 69 tests Cité et TypeScript : dernière unité, retries, libération, protection des autres engagements, deux entreprises, rôle révoqué, devis/prefs obsolètes, registre corrompu, rollback et compatibilité avec les réservations héritées.
- Deux tests supplémentaires d'intégration Auth/Firestore, uniquement via les émulateurs `demo-rc-voyage` : concurrence réelle de transactions entre deux entreprises, retries/libération, retrait des droits et rollback multi-document après dépassement de capacité.
- Quinze parcours navigateur prévus : cinq scénarios sur ordinateur 1440/1920 et mobile 390, dont réservation, affichage personnel, libération et réouverture.

Les comparaisons de devis utilisent un JSON canonique pour ne pas confondre un ordre différent des champs de map avec un changement de prix ou de composition. Un test reconstruit le devis avec ses champs réordonnés ; les tests émulateur vérifient la préparation et la vérification après relecture réelle des documents.

La CI Cité se déclenche désormais sur PR, avec annulation d'une exécution remplacée. Les fichiers exclusivement Cité sont exclus des déclencheurs historiques Domain/Journey ; un changement de source partagée ou de ces workflows déclenche toujours les contrôles concernés. Les validations navigateur et émulateur doivent être vérifiées sur le commit publié avant de les déclarer réussies. Les captures restent dans `cite-prototype-evidence`.

## Limites et suite

Pas d'expiration automatique des réservations dans cette tranche. Une réduction du stock déclaré sous les réservations existantes bloque les nouvelles réservations ; il faut un arbitrage opérateur et les libérations appropriées. Aucun achat n'est autorisé, aucun stock consommé et aucun statut de livraison n'est ajouté.

Restent : intégration dans le véritable Cockpit authentifié, préférences via affectations Cité, autorisation d'achat et commande, réception/composition/livraison et rapprochement Cité, fête, archives et test humain. Les conventions commerciales et P0 du cahier restent ouverts. La réconciliation des sources historiques avec la version Voyage déployée demeure nécessaire avant publication.

Aucune modification de règle Firebase, donnée client, stock réel ou production.
