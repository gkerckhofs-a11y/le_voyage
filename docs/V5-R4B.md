# V5 R4B — paysages par portion et recette d'arrivée

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise au HEAD local/distant `7f414035ecd49d304d1dc40ca05569e1facf7104`. Source : cahier Rouge Clémence / Le Ludificateur V5 du 28 octobre 2026, carte vivante et préservation du socle.

## Livré

La forêt est enrichie par une canopée déterministe répartie de part et d'autre de la portion 50–75 % du tracé : la densité suit désormais cette portion, au lieu de dépendre uniquement d'une bande de coordonnées X. Les arbres existants, la rivière, les ponts et les fermes sont conservés.

Onze groupes décoratifs sont ajoutés : deux hameaux anonymes, un verger, trois groupes de moutons, deux cerfs, un château et deux collines. Le château et les cerfs accompagnent la forêt ; les collines sont placées dans la portion finale nommée « Là-haut, les collines ». Le relief est représenté en vue du haut par des courbes de niveau, ombres et aplats. Les arbres du fond évitent les emprises des nouveaux monuments. Les couleurs de prairie réutilisent les variables saisonnières existantes.

Les positions décoratives sont calculées à partir de fractions du tracé, avec un dégagement contrôlé par rapport à la route, à la rivière, aux bords de carte et aux autres nouveaux éléments. Si aucun emplacement ne convient, le décor est omis : sur trois collines proposées, deux sont retenues. Ce calcul ne consulte ni calendrier, ni budgets, ni seuils cadeaux. Aucun palier ne se déplace pour le décor.

## Inchangé / modifié / nouveau

- **Inchangé** : tracé, moteur exact, distances, campagnes, paliers cadeaux, réception, droits, navigation R4A, voiture et minibus uniques, règles Firebase et main. Aucun changement de configuration métier.
- **Modifié** : `src/web/landscape.ts`, illustration SVG existante enrichie ; aucun nouvel outil graphique ni service externe.
- **Nouveau** : `tests/visual/scenery.test.mjs`, `tests/browser/scenery.spec.mjs`, ce rapport et trois captures.

Le stationnement était déjà implémenté dans `src/web/parking.ts` et utilisé dans `journey-map.ts`. Il est conservé. Les tests d'arrivée montrent un arrêt à la dernière position gagnée pour une campagne incomplète, et au terminus uniquement à 100 %. La relecture, le rafraîchissement et la réduction des animations ne créent ni kilomètres ni seconde voiture.

## Vérifications réelles

- `npm run typecheck`, `npm run build:web` : réussis.
- `node --test tests/visual/scenery.test.mjs tests/visual/parking.test.mjs tests/visual/public-build.test.mjs` : **3/3 réussis**. Placement hors route/rivière, limites, déterminisme, correspondance forêt/collines, stationnement, frontière publique.
- `npx playwright test --config playwright.local-map.config.mjs scenery.spec.mjs arrival.spec.mjs` : **6 scénarios d'arrivée réussis** ; les 3 premiers scénarios paysage échouaient parce que la fixture de test modifiait `distance` à la racine au lieu de `journey.distance`. Fixture corrigée.
- `npx playwright test --config playwright.local-map.config.mjs scenery.spec.mjs` : **6/6 réussis**, ordinateur 1440/1920 et mobile 390. Forêt/collines, menu de portion, voiture unique, zoom/recentrage sans déplacement métier ; collectif avec un minibus, quatre escales et les onze groupes décoratifs.
- Soit **12 scénarios navigateur distincts réussis**, avec les scénarios d'arrivée 55/80/100 %, replay, reduced-motion, clôture réelle fictive et rechargement.
- Configuration locale Chromium 141 temporaire supprimée. CI utilise le navigateur verrouillé. `git diff --check` réussi ; CI du nouveau commit suivie dans la PR.

Captures inspectées : [forêt desktop](evidence/v5-r4b-forest-desktop-1440.png), [collines mobile](evidence/v5-r4b-hills-mobile-390.png), [collectif en présentation kiosque](evidence/v5-r4b-kiosk-overview.png). Cette dernière capture provient du mode de présentation de la démo ; elle n'est pas une nouvelle preuve d'autorisation du kiosque limité, déjà testé dans R4A.

## Limites et suite

Illustration fictive inspirée d'un paysage rural, sans coordonnées ni noms de lieux réels. Les animaux restent décoratifs. Les captures vérifient des positions représentatives, pas chaque cadrage possible. La lisibilité et le regroupement des cadeaux au dézoom restent à traiter dans R4C ; la présente tranche ne déclare pas toute la carte V5 terminée.

Aucun déploiement, aucune URL de test nouvelle, aucune modification de production. Le staging antérieur n'est pas revalidé. Ce n'est pas la dernière tranche du projet.

## Isolation du test cockpit après CI

La première CI `6615644` réussit moteur, accès et carte ; Firebase échoue uniquement sur le comptage d'historique du cockpit mobile. L'artefact du run [40691463672](https://github.com/gkerckhofs-a11y/le_voyage/actions/runs/40691463672) montre un suivi « Composition partagée adaptée aux goûts confirmés » antérieur aux actions du scénario, sur « Les Chemins verts ». Ce suivi est créé par `beneficiaries.spec.mjs` : le test d'opérations mobile sélectionnait simplement la première ligne triée, déjà utilisée par ce scénario. Il ne s'agit pas d'une preuve de double écriture par le cockpit.

`tests/firebase-browser/gift-operations.spec.mjs` sélectionne désormais explicitement « Les Champs dorés » sur mobile (et conserve « Les Explorateurs » sur desktop), puis exige une révision initiale nulle. Les comptes exacts d'historique, la perte de réponse, la récupération et la livraison confirmée restent testés sans relâchement. Aucun code métier du cockpit n'est changé.

Recette ciblée sur les émulateurs : `npx playwright test --config playwright.local-check.config.mjs beneficiaries.spec.mjs gift-operations.spec.mjs supplier-catalog.spec.mjs` → **6/6 réussis**, dans l'ordre desktop puis mobile avec les données partagées. Total de la tranche : **18 scénarios navigateur ciblés distincts réussis**. La CI du commit correctif est suivie dans la PR. Ce diagnostic précise aussi la cause de l'écart non reproduit signalé dans R4A.
