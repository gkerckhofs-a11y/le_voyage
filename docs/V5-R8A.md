# V5 R8A — Réception dans l’espace directeur

29 octobre 2026. Branche `work/v2-phase1-engine`, PR #1. Parent vérifié : `1e8bdd2fc825f0eca3303930cf5a6b61b6acc9b7`, quatre CI réussies. Le commit portant ce rapport identifie la tranche ; HEAD et CI sont consignés dans la PR.

## Périmètre

| Statut | Élément | Preuve |
|---|---|---|
| Inchangé | Moteur, moyenne du minibus, gel exact et idempotent, droits par tenant/campagne, budgets internes, kiosque | `src/domain/engine.ts`, `tests/engine.test.mjs`, tests directeur |
| Modifié | Projection directeur et écran : distance retenue pour réception, échéance, date effective du gel, escales incluses/prochaine/non incluses au gel | `src/server/director-progress.mjs`, `src/web/director.ts`, `web/entreprise.html` |
| Nouveau | Recette ciblée des états réception, quatre captures | `tests/firebase/director-progress.test.mjs`, `tests/firebase-browser/director.spec.mjs`, captures ci-dessous |
| À poursuivre | Budget contractuel client, carte collective dans l’espace directeur, pipeline opérationnel de réception | Aucun coût fournisseur ni brouillon annuel assimilé à un contrat |

Une seule réception avec base garantie, même au gel sans amélioration. Les distances retenues viennent de `receptionLevel`, séparées du total actuel du bus. Les seuils restent ceux de la campagne ; aucune nouvelle formule, prestation ou date de fête inventée. Les champs transmis sont explicitement sélectionnés, sans budget interne, résultat de questionnaire ou préférence. Lecture seule, aucune écriture ni modification de permissions.

## Vérifications exécutées

- `npm run typecheck` : réussi.
- `npm run build:web` : réussi.
- `node --test tests/engine.test.mjs tests/visual/public-build.test.mjs` : **15/15**.
- `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore 'node --test tests/firebase/director-progress.test.mjs'` : **4/4**.
- Même commande d’émulateurs, script `npx playwright test --config playwright.local-check.config.mjs tests/firebase-browser/director.spec.mjs` : **2/2**, desktop 1440×900 et mobile 390×844.

**21 cas ciblés réussis.** Test serveur de distance fractionnaire, clôture tardive après échéance, gel sans amélioration, état figé malgré kilomètres supplémentaires, refus interentreprise/rôle/révocation et allowlists. Navigateur : données réelles de l’émulateur pour l’état initial ; réponse interceptée pour la variante visuelle gelée (le calcul du gel est testé séparément côté serveur). Effacement du panneau après 403, navigation unique, absence de débordement horizontal.

Java 21, Chromium Headless Shell 141 local ; configuration Playwright temporaire supprimée. CI intégrée suivie dans la PR, avec dépendances verrouillées. Pas de recette commerciale revendiquée.

## Captures inspectées

- [Directeur desktop](evidence/v5-r8a-director-desktop.png)
- [Directeur mobile](evidence/v5-r8a-director-mobile.png)
- [Variante gelée desktop](evidence/v5-r8a-director-frozen-desktop.png)
- [Variante gelée mobile](evidence/v5-r8a-director-frozen-mobile.png)

La barre mobile reste fixée au bas du viewport (elle apparaît au milieu d’une capture pleine page). Kiosque inchangé : aucune nouvelle capture ni recette kiosque dans cette tranche.

## Limites et suite

R8 reste partielle. Prochain incrément : source contractuelle versionnée et projection budget client, distinctes des coûts Clem et des brouillons de préparation. Le raccordement du parcours collectif directeur et le suivi des prestataires restent à réaliser. Les libellés d’escales restent génériques tant que les prestations ne sont pas publiées contractuellement. Horloge de campagne et gel automatique opérationnel restent à qualifier ; cette vue ne déclenche pas de gel ni de réservation.

Aucun déploiement, merge main, migration, changement de règles Firebase ni service payant. Aucun serveur de test distant revalidé ou mis à jour ; validation locale sur `demo-rc-voyage`. Les comptes et données sont fictifs. R8A n’est pas la dernière tranche : notification prévue à la fin de la dernière tranche vérifiée, avant déploiement test.
