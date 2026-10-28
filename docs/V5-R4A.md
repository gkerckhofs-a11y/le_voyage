# V5 R4A — identité officielle et navigation partagée

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise local et distant : `9f79d594c8a8366eb459bf10e85e487968daea53`. Première tranche R4 ; l'enrichissement des paysages n'est pas déclaré terminé.

## Livraison

Les 19 pages applicatives utilisent maintenant le fichier PNG officiel Rouge Clémence, sans redessin ni modification du fichier. Le logo ouvre le site officiel dans un nouvel onglet annoncé dans son nom accessible, avec `noopener noreferrer`. Le slogan « Ensemble, allons plus loin. » est affiché dans la signature (masquée en kiosque pour conserver un en-tête compact). Les anciens ornements génériques en feuille de la connexion, du bas de carte et de la révélation sont remplacés par un piment SVG secondaire ; ce pictogramme n'est pas présenté comme le logo officiel.

La navigation existante est conservée dans un seul élément `nav` : en haut sur ordinateur, fixée en bas sur mobile jusqu'à 700 px. Les actions de carte restent dans la carte. Les liens équipe « Ma semaine », « Choix de l'équipe » et « Mes goûts », jusque-là ajoutés au pied de page, rejoignent la navigation principale. Le retour organisateur rejoint également ce menu. Aucun nouveau droit n'est attribué ; les liens et pages gardent leurs contrôles serveur existants. Le menu du kiosque reste masqué et la session ne peut pas accéder au sélecteur.

Les cibles de navigation ont une hauteur minimale de 44 px. Sur les sessions comportant davantage de liens, la barre peut occuper plusieurs lignes, avec hauteur bornée et défilement si nécessaire. Le bas de page réserve de l'espace à la barre fixe. Les tests vérifient l'absence de débordement horizontal à 390 px, l'unicité du menu et les liens d'équipe sans doublon.

## Source du logo

- **Éditeur : Rouge Clémence**, site officiel consulté le **28 octobre 2026** : https://rougeclemence.be/.
- Le HTML reçu directement contient `custom-logo` pointant vers https://rougeclemence.be/wp-content/uploads/2026/09/logosite.png.
- Fichier récupéré depuis cette URL : **15 563 octets, PNG 300 × 100**, copié dans `web/assets/brand/rouge-clemence.png` et inspecté visuellement.
- SHA-256 : `5e06004388f2a42cb29082d0c7cf5a951151663e2c6596ea46a193618443c09d`.
- La consultation par l'outil de recherche avait échoué ; la requête HTTP directe du site puis du fichier a réussi. Aucun logo alternatif n'a été inventé. L'image est servie localement dans l'application, sans requête d'image externe à chaque visite.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, distances, seuils, réception, campagnes actives, catalogue, permissions, règles Firebase, tracé, paysages, véhicule unique et main.
- **Modifié** : `src/web/demo-client.ts`, `web/styles.css`, `tests/visual/public-build.test.mjs` (liste publique étendue aux deux seuls assets de marque).
- **En-têtes modifiés** : `web/index.html`, `collectif.html`, `kiosque.html`, `connexion.html`, `campagne.html`, `catalogue.html`, `cockpit.html`, `coordination.html`, `entreprise.html`, `equipe.html`, `espaces.html`, `invitation.html`, `invitations.html`, `kpi.html`, `kpi-access.html`, `kpi-periods.html`, `organisateur.html`, `preferences.html`, `semaine.html` (tous sous `web/`).
- **Nouveau** : `web/assets/brand/rouge-clemence.png`, `web/assets/brand/piment.svg`, `tests/browser/brand-navigation.spec.mjs`, `tests/firebase-browser/brand-navigation.spec.mjs`, ce rapport et trois captures R4A.

## Vérifications réelles

- `npm run typecheck`, `npm run build:web` : réussis.
- `node --test tests/visual/public-build.test.mjs` : **1/1 réussi** ; uniquement les assets publics attendus, aucune donnée métier privée ajoutée au bundle.
- `npx playwright test --config playwright.local-map.config.mjs brand-navigation.spec.mjs` : **3/3 réussis**, 1440/1920/390 px. Image officielle chargée, lien et slogan, menu unique, placement desktop/mobile, carnet, zoom/recentrage et accès collectif. Rejoué après remplacement des derniers ornements.
- Émulateurs Auth/Firestore `demo-rc-voyage`, Java 21 : `npx playwright test --config playwright.local-check.config.mjs brand-navigation.spec.mjs four-workspaces.spec.mjs limited-modes.spec.mjs` : **8/8 réussis**, desktop/mobile. Quatre espaces, liens d'équipe uniques dans le menu, changement de rôle, formulaire périmé refusé, KPI limité, kiosque sans navigation et refus d'accès au sélecteur, révocation et actualisation existantes.
- Premier essai des trois nouveaux tests carte en échec : le test cherchait `#car` au lieu de `#team-car`. Sélecteur corrigé ; les trois passent ensuite. Aucun défaut de véhicule n'a été constaté.
- **11 scénarios navigateur distincts réussis**. Configurations locales Chromium 141 temporaires supprimées avant commit ; CI utilise le navigateur verrouillé. Captures historiques produites à nouveau par les tests remises à leur version du dépôt ; seules les preuves R4A sont ajoutées.
- `git diff --check` réussi. CI du nouveau commit suivie et liée dans la PR.

Captures inspectées : [desktop](evidence/v5-r4a-team-desktop-1440.png), [mobile](evidence/v5-r4a-team-mobile-390.png), [kiosque](evidence/v5-r4a-kiosk-desktop.png).

## Suite et limites

R4 reste en cours : enrichissement des zones et cohérence ambiance/nom, animaux et éléments de paysage, lisibilité des cadeaux au dézoom et recette de l'arrivée restent à traiter dans R4B. La navigation ne constitue pas une nouvelle barrière d'autorisation : les permissions serveur existantes restent l'autorité.

Aucun déploiement, aucune nouvelle URL de test, aucune modification de production. Le staging antérieur n'est pas revalidé. Ce n'est pas la dernière tranche du projet.
