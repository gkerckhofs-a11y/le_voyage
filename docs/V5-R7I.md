# V5 R7I — déclaration de consommation après livraison

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise sur `9139f16eb3425c1ae49a6e89a72c5b5d96bdcbb4`, HEAD distant identique et quatre workflows réussis vérifiés. SHA livré et CI finale consignés dans la PR. Aucun déploiement.

## Livré

Dans les prévisions privées de Clem, une commande anticipée rattachée peut recevoir une déclaration manuelle d'utilisation intégrale de ses unités. Le serveur exige le suivi lié dans la même campagne, une livraison confirmée avec référence, le lien de commande vérifiable, une révision courante, un motif et une confirmation explicite. Une commande non rattachée, un suivi non livré, une origine incohérente ou un registre insuffisant sont refusés.

La transaction conserve la commande et son statut `ordered`, ses coûts, le suivi livré et le Master. Elle transfère les quantités du sous-compteur `committed` au sous-compteur `consumed`, conserve le total `counts` et journalise date, auteur, motif, référence de remise, révision du suivi et lignes SKU. L'identifiant de mutation permet de récupérer une réponse perdue sans seconde consommation ; les droits sont revérifiés même pour un rejeu. Les lignes et quantités proviennent de la commande figée, jamais du navigateur.

**Convention conservatrice, sans synchronisation d'inventaire** : `counts` représente les unités indisponibles en interne, y compris les consommations déclarées en attente de réconciliation. Exemple : Master déclaré 100, une unité affectée → disponible 99 ; après déclaration de consommation → disponible toujours 99, affectées 0, consommées 1. Les consommations ne redeviennent pas réservables. Les libérations d'autres réservations doivent préserver les deux sous-compteurs. Aucune décrémentation du Master ni remise en stock automatique.

Cette déclaration atteste une saisie de Clem, pas une vérification physique externe. L'interface rappelle qu'une livraison confirmée est requise et que la réconciliation du Master reste à faire. Le serveur reste l'autorité, même si une fiche ouverte est devenue périmée.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, droits cadeaux, barèmes, calendrier, commandes et coûts figés, préférences, Master, espaces directeur/équipe/kiosque, règles Firebase, main et production.
- **Modifié** : `src/server/gift-reservations.mjs` (transaction et projection), `src/server/firebase-http.mjs` (route privée avec CSRF), `src/web/gift-forecast.ts` (déclaration et compteurs), `tests/firebase/gift-reservations.test.mjs`, `tests/firebase-browser/gift-reservations.spec.mjs`.
- **Nouveau** : champ de déclaration et sous-compteur consommé, sans migration obligatoire ; ce rapport et captures R7I desktop/mobile.

## Vérifications

**Résultats finaux : typecheck et build réussis ; 15/15 tests serveur, 4/4 parcours navigateur desktop/mobile et 1/1 test de séparation du build public, soit 20 tests ciblés réussis.** Réponse perdue, concurrence, conservation des coûts et du disponible, refus avant livraison, liens incohérents, déficit, champs injectés, retrait des droits, CSRF et rôles non habilités vérifiés. Une autre campagne réserve/libère puis confirme une commande sans effacer les unités consommées. `git diff --check` réussi. Captures inspectées. Premier passage : une assertion de stock attendait 422 mais obtenait 409, car le service de l'autre campagne utilisait septembre alors que sa proposition avait été calculée en août. L'horloge fictive est harmonisée ; aucune règle applicative assouplie. Le premier parcours navigateur a ensuite échoué uniquement sur l'assertion de rôle : la requête de consommation sans confirmation obligatoire recevait 400. Le test fournit désormais un corps valide pour vérifier le refus 403 de l'employé et du directeur.

Commandes :

- `npm run typecheck`
- `npm run build:web`
- `node --test tests/visual/public-build.test.mjs`
- `node --test tests/firebase/gift-reservations.test.mjs`
- `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs`

Tests Firebase/navigateur exécutés avec `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Données fictives uniquement. Configuration Chromium locale temporaire retirée avant commit. Captures historiques régénérées restaurées.

Captures du panneau : [desktop](evidence/v5-r7i-consumption-desktop.png), [mobile](evidence/v5-r7i-consumption-mobile.png). Kiosque inchangé, pas de nouvelle capture kiosque.

## Limites et suite

Déclaration intégrale uniquement pour les commandes anticipées rattachées et livrées. Aucune consommation partielle, annulation, correction, retour fournisseur ou remise en stock n'est disponible. La réconciliation avec un nouvel inventaire Master est encore nécessaire : un import ne doit pas être interprété comme ayant déjà intégré les consommations. Le disponible reste conservateur et peut sous-estimer le stock réel après un inventaire externe ; il n'est pas une disponibilité fournisseur certifiée.

Suite : procédure de réconciliation des stocks, retours/annulations et consolidation des engagements, puis R8/R9 et recette réelle Sheets. Aucune URL de test revalidée, aucun achat/envoi/paiement, aucun déploiement ou changement production. R7I n'est pas la dernière tranche avant déploiement test.
