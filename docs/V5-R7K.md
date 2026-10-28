# V5 R7K — demandes internes d'annulation

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise local/distant `bc7954ec74b8da031965c59d838790204362aee2`, quatre workflows réussis vérifiés. Commit livré et CI finale dans la PR. Aucun déploiement.

## Livré

Clem peut enregistrer une demande interne d'annulation pour une commande anticipée confirmée, non livrée et non consommée. Référence, motif et reconnaissance explicite de la portée interne sont obligatoires. Cette saisie n'envoie aucun message au fournisseur et n'affirme aucun accord d'annulation.

La commande conserve son statut `ordered`, son instantané, ses coûts et ses quantités affectées. Le Master, le registre de stock et les droits cadeaux restent inchangés. La demande porte un état `pending` et un journal attribué (auteur, date, motif, référence, empreinte de la commande). Une seconde demande pendant l'attente est refusée ; les rejeux identiques retrouvent leur résultat sans modifier l'état courant.

Pendant l'attente, le serveur refuse un nouveau rattachement, les écritures logistiques et la consommation. La fiche acquise affiche l'alerte et désactive son formulaire logistique. Une fiche déjà ouverte ne contourne pas ce contrôle. Les avenants financiers existants restent indépendants, avec leurs contrôles habituels ; aucune réduction automatique des coûts ou engagements.

Le retrait motivé de la demande interne conserve sa trace et permet de reprendre le traitement. Ce retrait n'est ni un refus fournisseur enregistré ni une nouvelle commande. Une nouvelle demande ultérieure reste possible avant livraison ; les versions précédentes demeurent dans le journal. Le plafond de révision garde une place pour retirer une demande.

Une demande concurrente à la livraison est contrôlée transactionnellement : une seule des deux écritures réussit. Une livraison déjà confirmée, une consommation déclarée, un lien incohérent, une révision périmée ou un droit retiré font refuser la nouvelle demande. Les opérations restent limitées aux campagnes autorisées de l'opérateur cadeaux.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, campagnes, attribution, calendrier, barèmes, coûts confirmés, Master, stock, profils, règles Firebase et autres espaces, main et production.
- **Modifié** : `src/server/gift-reservations.mjs`, `src/server/gift-operations.mjs`, `src/server/firebase-http.mjs`, `src/web/gift-forecast.ts`, `src/web/cockpit.ts`, `tests/firebase/gift-reservations.test.mjs`, `tests/firebase-browser/gift-reservations.spec.mjs`.
- **Nouveau** : métadonnées de demande sur la réservation et événements dans son journal existant ; ce rapport et captures R7K. Aucune migration.

## Vérifications

Commandes : `npm run typecheck`, `npm run build:web`, `node --test tests/visual/public-build.test.mjs`, `node --test tests/firebase/gift-reservations.test.mjs tests/firebase/gift-operations.test.mjs`, `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs gift-operations.spec.mjs`.

Tests intégrés exécutés sous `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Données fictives uniquement, configuration Chromium temporaire retirée avant commit et captures historiques restaurées.

Premier passage : 31/31 tests serveur et 4/6 parcours navigateur réussis. Les deux échecs concernaient une assertion cherchant un bouton dans le panneau encore replié ; le test vérifie désormais le panneau avant son ouverture. Aucun changement applicatif pour cette correction. Le second passage a révélé une course dans le test historique de réservation à réponse perdue : il actualisait dès la désactivation du bouton, avant la fin de la requête. Le test attend maintenant le message de résultat non confirmé avant de relire la liste. **Résultats finaux : typecheck/build réussis, 31/31 tests serveur, 6/6 parcours navigateur desktop/mobile et 1/1 contrôle du build public, soit 38 tests ciblés réussis.** Rejeu mobile ciblé pour la capture après défilement : 1/1. `git diff --check` réussi et captures inspectées. Couverture : préservation des coûts/commande/stock/Master/campagne, blocage du rattachement et des écritures périmées, demande et retrait idempotents, concurrence avec livraison, refus après livraison/consommation, champs injectés, accès révoqués, CSRF et rôles employé/directeur.

Captures : [demande desktop](evidence/v5-r7k-request-desktop.png), [demande mobile](evidence/v5-r7k-request-mobile.png), [actions mobile après défilement](evidence/v5-r7k-request-mobile-actions.png). La navigation fixe peut recouvrir le bas du panneau dans sa capture ; la capture viewport après défilement montre la commande accessible. Kiosque inchangé, aucune nouvelle capture kiosque.

## Limites et suite

Cette tranche ne confirme aucune annulation fournisseur, aucun avoir/remboursement, frais d'annulation, retour ou remise en stock. Le stock et l'engagement restent conservés tant qu'un traitement explicite de ces événements n'est pas développé. Les cadeaux déjà livrés doivent passer par un futur flux de retour, pas par cette demande.

Suite : confirmation documentée du résultat fournisseur, retours et traitement des engagements, puis R8/R9 et recette Sheets réelle. Aucune URL de test revalidée, aucun achat/envoi/paiement, déploiement ou changement production. R7K n'est pas la dernière tranche avant déploiement test.
