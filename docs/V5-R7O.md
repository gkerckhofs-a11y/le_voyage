# V5 R7O — consolidation privée des coûts de commandes

29 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise sur `2291e083b2681ab7dd7a5290b9e49c5c87d93bf9`, HEAD distant identique et quatre workflows réussis vérifiés. Commit livré et CI finale consignés dans la PR. Aucun déploiement.

## Livré

Le cockpit des prévisions affiche une synthèse des commandes enregistrées, par campagne autorisée et filtrable par client. Les montants couvrent toutes les dates : le filtre d'horizon des prévisions ne s'y applique pas. Sont distingués le nombre de commandes confirmées, leurs coûts d'origine, leurs coûts après écritures déclarées, la part des annulations acceptées et celle des autres commandes. Les réservations internes et autorisations sans commande sont comptées séparément, sans les assimiler à des dépenses confirmées.

Une commande anticipée rattachée à un cadeau acquis compte une seule fois. Les avenants du suivi acquis déterminent alors son coût ajusté ; l'instantané anticipé n'est pas additionné au même suivi. Les commandes acquises confirmées hors anticipation sont incluses. Les annulations acceptées restent valorisées après libération du stock, à leurs coûts ajustés explicitement. Aucun avoir ou remboursement n'est déduit automatiquement de l'annulation.

Les droits acquis sans commande confirmée et les anciens suivis sans instantané exploitable sont signalés comme non valorisés. Une commande anticipée identifiée pour un droit acquis couvre ce droit sans créer une deuxième ligne financière. Les liens manquants, orphelins, concurrents ou incohérents refusent la synthèse entière plutôt que de produire un total partiel présenté comme complet. Les lectures sont bornées (200 réservations, 200 suivis par campagne et 600 éléments cumulés, droits compris).

La route privée `GET /api/gifts/commitments` relit les droits opérateur et les campagnes dans une transaction. Elle retourne des agrégats par campagne, sans références fournisseur ni préférences personnelles. Aucun document n'est écrit. En cas d'erreur de lecture, la page efface les anciens montants. La synthèse est réservée à Clem : aucun raccordement au directeur, au front équipe ou au kiosque.

Ces montants sont des coûts de commandes enregistrés, pas des paiements, remboursements bancaires, factures client ou budgets contractuels. Ils ne doivent pas être réutilisés comme budget visible du directeur.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, campagnes, seuils, profils, confirmations, écritures financières, Master, quantités, droits cadeaux, règles Firebase, espaces directeur/équipe/kiosque, main et production.
- **Modifié** : `src/server/gift-operations.mjs`, `src/server/firebase-http.mjs`, `src/web/gift-forecast.ts`, `web/previsions.html`, `tests/firebase/gift-reservations.test.mjs`, `tests/firebase-browser/gift-reservations.spec.mjs`.
- **Nouveau** : `src/server/gift-commitments.mjs`, `tests/gift-commitments.test.mjs`, route et section de synthèse en lecture seule, ce rapport et captures R7O. Aucune migration ni nouveau service.

## Vérifications réelles

Commandes : `npm run typecheck`, `npm run build:web`, `node --test tests/gift-commitments.test.mjs tests/visual/public-build.test.mjs` ; `node --test tests/firebase/gift-reservations.test.mjs tests/firebase/gift-operations.test.mjs` ; `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs gift-operations.spec.mjs gift-forecast.spec.mjs`.

Tests intégrés sous `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`, données fictives. OpenJDK 21.0.2 et Chromium Headless Shell 141 déjà présents ; configuration navigateur temporaire retirée avant commit. Dépendances verrouillées inchangées ; CI avec navigateur verrouillé. Captures historiques régénérées restaurées.

**Résultats finaux : typage/compilation réussis, 42/42 tests serveur, 5/5 tests de calcul/build public et 10/10 parcours navigateur, soit 57 cas ciblés.** Aucun échec. Après une précision de texte sur le coût ajusté, reprise des quatre parcours confirmation/annulation pour les captures : 4/4. Commande : `npx playwright test --config playwright.local-check.config.mjs gift-reservations.spec.mjs --grep "internal anticipated workflow: (confirm|cancel)"`.

Couverture : commande rattachée comptée une seule fois avec avenants acquis, commande autonome confirmée, coûts d'annulation après avoir/libération du stock, réservations et autorisations exclues, droits sans commande et historiques non valorisés, liens orphelins/dupliqués/incohérents, montants invalides, absence d'écriture, filtrage après révocation, refus employé/directeur et effacement de la synthèse après erreur de lecture. `git diff --check` réussi.

Quatre captures inspectées : [commande rattachée desktop](evidence/v5-r7o-attached-desktop.png), [commande rattachée mobile](evidence/v5-r7o-attached-mobile.png), [annulation desktop](evidence/v5-r7o-cancelled-desktop.png), [annulation mobile](evidence/v5-r7o-cancelled-mobile.png). Kiosque inchangé, aucune nouvelle capture kiosque.

## Limites et suite

Synthèse d'après les dossiers enregistrés, sans rapprochement bancaire ni validation commerciale. Les anciennes confirmations absentes ne sont pas reconstituées ; leur nombre non valorisé reste visible. Un lien incohérent bloque la lecture et demande une résolution du dossier. Les cadeaux annulés restent bloqués : aucune procédure de remplacement ni nouveau droit automatique.

Suite : R8 réception et front directeur, avec des budgets client distincts des coûts internes, puis R9 recette intégrée et pilote, dont Sheets réel. Aucune URL de test revalidée, aucun achat/envoi/paiement, aucune fusion main, migration ou modification production. R7O n'est pas la dernière tranche avant déploiement test.
