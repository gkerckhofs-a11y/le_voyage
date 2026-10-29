# V5 R8C — Parcours collectif du directeur

29 octobre 2026. Branche `work/v2-phase1-engine`, PR #1. Parent vérifié : `5b725682183217fc41a65e2dfb1dc01623c0f4bc`, quatre CI réussies. Le commit de ce rapport identifie la tranche ; HEAD et CI sont consignés dans la PR.

Le directeur dispose du lien « Notre collectif », avec la carte existante, un seul minibus, les escales de réception, le zoom global et le recentrage. La nouvelle route serveur exige les mêmes droits directeur que son tableau d’entreprise ; aucun droit équipe ou kiosque n’est accordé.

## Inchangé / modifié / nouveau

| Statut | Fichiers et portée |
|---|---|
| Inchangé | Moteur, seuils, calcul moyen du collectif, gel, clôture et parking, géométrie et décors, budgets R8B, droits attribués et règles Firebase |
| Modifié | `src/server/director-progress.mjs` : autorisation transactionnelle commune aux deux lectures ; projection collective sans série hebdomadaire |
| Modifié | `src/server/firebase-http.mjs` : GET `/api/director/collective` autorisé dans l’espace directeur |
| Nouveau | `web/entreprise-collectif.html` : carte réutilisant `collective.ts`, navigation directeur et informations sur la présentation |
| Modifié | `web/entreprise.html`, `src/web/collective.ts` : lien, source API dédiée, scénarios d’URL ignorés, rechargement après 60 secondes |
| Corrigé | `src/server/http.mjs` : types MIME SVG/PNG pour les assets de marque ; piment cassé constaté en capture puis vérifié chargé |
| Tests | `tests/firebase/director-progress.test.mjs`, `tests/firebase-browser/director-collective.spec.mjs`, `tests/visual/public-build.test.mjs` |

La réponse carte contient les distances cumulées, métadonnées du parcours, escales et bilan collectif. `history` reste un tableau vide pour compatibilité avec le composant ; pas de kilomètres hebdomadaires ni de bouton de replay hebdomadaire côté directeur. Aucun budget, coût d’achat, équipe, préférence ou résultat de questionnaire dans cette réponse. Le budget reste dans la projection directeur dédiée R8B.

Les paramètres `scenario=frozen` ne changent pas la source autorisée. Au rechargement automatique, un refus d’accès masque la carte et ne monte aucun véhicule. Les contrôles du rôle actif et du tenant restent côté serveur.

## Vérification réelle

- `npm run typecheck` : réussi.
- `npm run build:web` : réussi.
- `node --test tests/visual/public-build.test.mjs tests/visual/collective.test.mjs` : **8/8**.
- `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore 'node --test tests/firebase/director-progress.test.mjs && npx playwright test --config playwright.local-check.config.mjs tests/firebase-browser/director-collective.spec.mjs tests/firebase-browser/director.spec.mjs tests/firebase-browser/limited-modes.spec.mjs'` : **5/5 serveur et 6/6 navigateur**.
- `node --test tests/events/http.test.mjs` après correction MIME : **7/7**.
- Reprise des deux parcours directeur collectif après correction MIME, même commande d’émulateurs, script `npx playwright test --config playwright.local-check.config.mjs tests/firebase-browser/director-collective.spec.mjs` : **2/2**.

**26 cas distincts réussis**, plus reprise des deux parcours. Scénarios serveur : parcours en cours, réception gelée/clôturée, TPE, non-mutation de campagne, allowlist, absence de série hebdomadaire, autres tenants/campagnes et révocation. Navigateur : minibus unique, distances exactes affichées, quatre escales, vue globale, navigation unique, absence de débordement, refus des espaces équipe/cadeaux/kiosque, paramètres falsifiés, rafraîchissement refusé et SVG réellement chargé. Kiosque dédié et référent KPI revérifiés dans les tests existants.

Environnement : émulateurs `demo-rc-voyage`, Java 21, Chromium Headless Shell 141 local, configuration temporaire supprimée. CI intégrée avec dépendances verrouillées suivie dans la PR.

## Captures inspectées

- [Directeur desktop](evidence/v5-r8c-director-desktop.png)
- [Directeur mobile](evidence/v5-r8c-director-mobile.png)
- [Présentation desktop](evidence/v5-r8c-presentation-desktop.png)
- [Présentation mobile](evidence/v5-r8c-presentation-mobile.png)
- [Kiosque dédié desktop](evidence/v5-r8c-kiosk-desktop.png)
- [Kiosque dédié mobile](evidence/v5-r8c-kiosk-mobile.png)

Desktop 1440×900, mobile 390×844. Captures kiosque issues de la recette R1E réexécutée dans cette tranche, conservées sous noms R8C.

## Limites et suite

La présentation plein écran est un mode d’affichage CSS, pas une nouvelle session limitée ni une autorisation kiosque : la session directeur conserve ses droits. L’écran partagé exige le mode kiosque dédié. Le rechargement toutes les 60 secondes réinitialise la caméra ; une révocation est constatée au prochain appel, pas poussée instantanément.

Les dates, identités et prestations restent celles des démonstrations existantes. Aucune réservation réelle n’est créée ; les libellés fictifs ne sont pas un contrat. Risques d’inférence sur petits effectifs et recette des données réelles restent à qualifier avant pilote.

Suite R8D : suivi opérationnel de réception, avec réutilisation du niveau gelé et séparation des données internes/client. R8C n’est pas la dernière tranche. Aucun déploiement, merge main, migration production, service payant ni serveur distant revalidé. Le passage au déploiement test sera annoncé après la dernière tranche vérifiée.
