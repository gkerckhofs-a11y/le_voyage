# V5 R9A — Pilote simulé et recette ciblée

29 octobre 2026. Branche `work/v2-phase1-engine`, PR #1. Parent vérifié : `4636b4d2f98a5963fb9b89220813f13d2f51558d`, quatre CI réussies. Le commit contenant ce rapport identifie la tranche ; HEAD final et résultats CI sont consignés dans la PR.

## Conclusion

Le pilote V5 du moteur et la recette ciblée des accès/interfaces passent sur données fictives. **La préproduction avec de vrais clients n’est pas validée.** Les tests du moteur, les tests de services Auth/Firestore et les parcours navigateur sont des vérifications distinctes : aucun parcours de douze semaines à travers toutes les interfaces et tous les services n’est revendiqué.

## Pilote reproductible

Commande : `node scripts/pilot-v5.mjs`. Résultat figé : [pilot-v5-12-weeks.json](pilot-v5-12-weeks.json), comparé intégralement par le test de reproductibilité.

Trois entreprises fictives, du 1er mars au 24 mai 2027 (fin exclusive), douze semaines dont onze actives, une fermeture, deux absences individuelles, un joker et un report par entreprise. Barème explicitement sélectionné : `v5-early-simulation-1`, trois cadeaux aux seuils 110, 470 et 970 km. Ces seuils sont recalculés pour le pilote court ; ils ne remplacent pas les seuils annuels des campagnes existantes. La référence V5 de 46 semaines / cinq cadeaux est vérifiée séparément par `tests/events/gift-scale.test.mjs`.

| Entreprise fictive | Équipes | Collectif exact | Affichage arrondi | Droits cadeaux / tâches | Niveau réception gelé | Enveloppe simulée acquise* | Maximum simulé* |
|---|---:|---:|---:|---:|---:|---:|---:|
| TPE | 1 | 863,75 km | 864 km | 2 / 2 | 1 | 1 500 € | 2 000 € |
| PME | 4 | 903,125 km | 903 km | 8 / 8 | 1 | 2 100 € | 2 900 € |
| Lex EKHO | 3 | 805 km | 805 km | 6 / 6 | 1 | 1 900 € | 2 600 € |

*Hypothèses fictives du simulateur : 100 € par droit cadeau d’équipe ; réception de niveau 1 à 1 300 € au total, maximum réception à 1 700 €. Calcul : droits × 100 € + formule totale de réception, sans additionner ses niveaux. Ce n’est ni un montant facturé, ni une dépense réellement engagée, ni une validation fiscale/commerciale.

Le gel intervient le 4 mai 2027 ; les distances retenues sont respectivement 616,25, 638,75 et 550 km. Les kilomètres ultérieurs continuent d’augmenter le collectif sans modifier ce gel. Le bus est la moyenne exacte des distances des équipes, indépendamment de leurs effectifs. Chaque clôture est rejouée et doit rester sans effet ; le report ne crée aucune treizième semaine ni crédit supplémentaire. Les checkpoints exposent seulement les compteurs de simulation, pas les réponses individuelles.

Le scénario KPI utilise des notes calculées directement à partir d’agrégats fictifs. **Il ne valide pas le raccordement des lots du formulaire KPI au moteur.** La période traverse le changement d’heure, mais la simulation utilise des dates civiles : les déclenchements horaires réels ne sont pas testés ici.

Le scénario historique par défaut reste strictement identique à `docs/simulation-12-semaines.json`. Le premier essai du nouveau report a été refusé par le moteur pour événement antidaté : la première équipe était clôturée à la date reportée avant les autres. Le simulateur traite désormais le lot de cette semaine à la date reportée, en ordre chronologique ; le moteur n’a pas été modifié.

## Matrice de recette et blocages

| Zone | État constaté | Preuve / suite nécessaire |
|---|---|---|
| Calculs, report, fermeture, joker, moyenne, droits, gel | Validés dans ce pilote fictif | `tests/pilot-v5.test.mjs`, JSON et checkpoints ; hypothèses chiffrées non approuvées commercialement |
| Calendrier glissant et barème versionné | Tests ciblés réussis | `tests/rolling-calendar.test.mjs`, `tests/events/gift-scale.test.mjs` ; simulation courte distincte d’une activation annuelle |
| Quatre espaces, révocation, KPI/kiosque limités | Tests serveur et navigateur réussis | `tests/firebase/four-workspaces.test.mjs`, `limited-modes.test.mjs` et parcours homonymes |
| Directeur, confidentialité, réception/coûts/incidents | Tests serveur réussis | `tests/firebase/director-progress.test.mjs`, `reception-operations.test.mjs` ; données fictives uniquement |
| Authentification et sessions réelles | Bloquant avant pilote réel | `src/server/firebase-http.mjs` utilise des profils démo et `sessions=new Map()` ; provisioning réel et persistance des sessions à implémenter/recetter |
| Acceptation et activation de campagne | Non couvertes par la préparation annuelle actuelle | `src/server/annual-planning.mjs` expose read/preview/save dans `annualDrafts/next`, sans activation contractuelle ; version acceptée et lancement explicite restent à réaliser |
| KPI collectés → progression | Bloqué partiellement | `src/server/kpi-collection.mjs`, checkpoint R0 : collecte séparée ; validation/réconciliation et politique à préciser. `src/domain/scoring.ts` refuse encore la direction inverse non validée |
| Master Sheets réel | Non validé | `masterSheetsConfig()` retourne `null` dans l’environnement local vérifié ; les émulateurs utilisent `demoMasterSheetsSource()`. État de configuration distante inconnu ; aucune lecture d’un classeur réel effectuée |
| Staging isolé et déploiement actuel | Non revalidés | Configuration conservée dans `firebase/staging-hosting.json` : site `rc-voyage-test-20261027`, service `voyage-test`, région `europe-west1`. Cette configuration ne prouve pas l’état distant ni la présence du HEAD courant |
| Autres écarts P0 historiques | À solder avant conformité globale | `docs/V5-R0-R1A.md` et limites de la PR : cadeaux datés/surprises opérationnels, documents logistiques, déclenchements, rétention/restauration ; aucune clôture de ces écarts déduite de cette recette |

La consolidation ci-dessus porte sur les dépendances de mise en service ; elle ne recommence pas un audit historique de l’ensemble du code. Les fonctionnalités livrées R1–R8 ne sont pas réécrites.

## Changements

| Statut | Fichiers |
|---|---|
| Modifié | `scripts/simulate.mjs` : options explicites de départ/barème/report, checkpoints et contrôle de rejeu ; sortie historique par défaut conservée |
| Nouveau | `scripts/pilot-v5.mjs`, `tests/pilot-v5.test.mjs`, `docs/pilot-v5-12-weeks.json`, ce rapport et six captures |
| Inchangé | Code applicatif, moteur, interfaces, règles Firebase, configuration de déploiement, permissions et données distantes |

## Commandes et résultats

- `node --test tests/pilot-v5.test.mjs tests/simulation.test.mjs tests/rolling-calendar.test.mjs tests/events/gift-scale.test.mjs` : **14/14**.
- `npm run typecheck` et `npm run build:web` : réussis.
- `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore 'node --test tests/firebase/four-workspaces.test.mjs tests/firebase/limited-modes.test.mjs tests/firebase/director-progress.test.mjs tests/firebase/reception-operations.test.mjs'` : **16/16**.
- Même commande émulateurs avec `npx playwright test --config playwright.local-check.config.mjs tests/firebase-browser/four-workspaces.spec.mjs tests/firebase-browser/limited-modes.spec.mjs tests/firebase-browser/director-collective.spec.mjs` : **6/6**.

**36 cas distincts réussis.** Java 21, Chromium Headless Shell 141 local, Auth/Firestore émulés, profils fictifs. Configuration Playwright temporaire supprimée. Aucun test géant supplémentaire lancé manuellement ; CI intégrée existante suivie dans la PR.

## Captures vérifiées

- Espaces : [desktop](evidence/v5-r9a-spaces-desktop.png), [mobile](evidence/v5-r9a-spaces-mobile.png).
- Collectif directeur : [desktop](evidence/v5-r9a-collective-desktop.png), [mobile](evidence/v5-r9a-collective-mobile.png).
- Kiosque : [desktop](evidence/v5-r9a-kiosk-desktop.png), [mobile](evidence/v5-r9a-kiosk-mobile.png).

Ces captures sont celles des démonstrations d’interface, pas la visualisation des trois campagnes du pilote moteur. Les preuves historiques ont été conservées sans écrasement.

## Prochaine tranche

R9B : traiter en priorité les dépendances techniques du pilote réel (sessions persistantes et accès réels), puis poursuivre la recette intégrée avec une activation contrôlée et les règles métier confirmées. L’accord commercial/fiscal et les accès au Master réel ne sont pas présumés.

Aucun déploiement, merge main, migration production ou service payant. Le serveur test distant n’est pas mis à jour. Cette tranche n’est pas la dernière validation ; le passage au déploiement test sera annoncé explicitement après traitement des blocages.
