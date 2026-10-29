# V5 R8G — Incidents de réception

29 octobre 2026. Branche `work/v2-phase1-engine`, PR #1. Parent vérifié : `cbb3e2bfa0cebebcc28d51e408b70be41d2d7b55`, quatre CI réussies. Le commit contenant ce rapport identifie la tranche ; HEAD final et résultats CI sont consignés dans la PR.

## Livraison

Clem peut signaler un incident privé sur une fiche réception existante, puis déclarer sa résolution avec motif, référence professionnelle et confirmation explicite. Un seul incident peut être ouvert à la fois. Une nouvelle ouverture après résolution conserve les incidents précédents dans le journal. Aucune ouverture/résolution n’est possible après le bilan clôturé.

Pendant un incident : passage à l’étape suivante refusé côté serveur, correction de la fiche dans son étape courante possible, relevés de coûts accessibles. L’interface limite la liste des étapes à l’étape actuelle. L’enregistrement ordinaire préserve l’incident au lieu de l’effacer.

Le signalement et la résolution font avancer la révision logistique : les informations pratiques précédemment publiées sont masquées à la prochaine lecture du directeur. Une publication est refusée tant que l’incident est ouvert. Après résolution, Clem doit republier explicitement la fiche. Le retrait explicite reste possible. Le niveau garanti/acquis, le gel et les coûts ne sont pas modifiés.

L’historique commun conserve l’ouverture et la résolution, avec auteur, date, motif et instantané de fiche. Révisions concurrentes et UUID réutilisés avec une autre empreinte refusés ; reprise idempotente après vérification des droits. Une ancienne ouverture rejouée après résolution ne rouvre pas l’incident.

| Statut | Fichiers / comportement |
|---|---|
| Modifié | `src/server/reception-operations.mjs` : incident/résolution, audit commun, préservation et blocage des étapes/publication |
| Modifié | `src/server/reception-publication.mjs` : projection refusée en présence d’un incident ouvert |
| Modifié | `src/server/firebase-http.mjs` : POST `/api/gifts/receptions/incident`, espace cadeaux et CSRF |
| Modifié | `src/web/receptions.ts`, `web/receptions.html` : bloc privé, action proposée, états de chargement/refus et historique lisible |
| Modifié | `tests/firebase/reception-operations.test.mjs` : deux scénarios d’incidents ajoutés |
| Nouveau | `tests/firebase-browser/reception-incidents.spec.mjs`, deux captures et ce rapport |
| Inchangé | Moteur, seuils, gel, niveaux acquis, coûts, budgets client, Master, permissions attribuées, règles Firebase, cartes et kiosque |

## Vérifications exécutées

- `npm run typecheck` : réussi.
- `npm run build:web` : réussi.
- `node --test tests/visual/public-build.test.mjs` : **1/1**.
- `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore 'node --test tests/firebase/reception-operations.test.mjs && npx playwright test --config playwright.local-check.config.mjs tests/firebase-browser/reception-incidents.spec.mjs'` : **9/9 serveur, 2/2 navigateur**.
- Reprise navigateur après ajustement du cadrage de capture mobile : **2/2**.

**12 cas distincts**. Tests spécifiques : blocage des étapes/publication, conservation du gel et des coûts, correction de fiche préservant l’incident, résolution sans republication, reprise sans réouverture, historique, validations, concurrence, droits interentreprises et révocation, refus après clôture. Navigateur : réponse perdue puis relecture, champs logistiques/coûts accessibles, états incident/résolu et historique, effacement après 403, route interdite aux autres espaces.

Émulateurs Auth/Firestore `demo-rc-voyage`, données fictives, Java 21 et Chromium Headless Shell 141 local. Configuration Playwright temporaire supprimée avant commit. CI intégrée suivie dans la PR.

## Captures

- [Bloc incident desktop](evidence/v5-r8g-incident-desktop.png)
- [Bloc incident mobile](evidence/v5-r8g-incident-mobile.png)

Captures ciblées du nouveau bloc. Parcours mobile exécuté en 390 × 844, hauteur temporairement portée à 1 200 pour capturer le bloc sans superposition de la barre fixe ; viewport restauré ensuite. Kiosque inchangé, aucune nouvelle capture de ce mode.

## Limites et suite

Suivi déclaratif : aucune annulation de prestation, commande, réception ou contrat, aucun envoi au fournisseur ni compensation financière automatique. Les coûts restent traités par leur relevé séparé. La résolution atteste une vérification humaine, sans contrôle automatique des justificatifs. Les informations déjà présentes sur un écran directeur ne disparaissent qu’à sa prochaine lecture/actualisation. Le journal complet reste conservé ; seuls les vingt derniers événements sont affichés.

Prochaine tranche : R9, recette ciblée et pilote simulé, avec consolidation des écarts et blocages de préproduction déjà documentés. Cette livraison ne signifie pas que toute la V5 est validée. Aucun déploiement, merge main, migration production ou service payant. Aucun serveur de test distant mis à jour ou revalidé ; le passage au déploiement test sera annoncé après la dernière tranche vérifiée.
