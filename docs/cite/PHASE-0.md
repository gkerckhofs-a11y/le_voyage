# La Cité — audit de reprise, 3 novembre 2026

Référence fonctionnelle : [cahier des charges V1.0](La_Cite_Cahier_des_Charges_V1_0.md), lu intégralement. Les décisions de ce document remplacent les mécaniques de l’ancienne expérience. Audit réalisé en lecture seule sur les services distants.

## Sources constatées

- Dépôt : https://github.com/gkerckhofs-a11y/le_voyage ; `main` contient uniquement le README initial. Branche distante de référence technique récupérée : `work/r9g1-cohesive-seasonal-scenery`, commit `ec30fc8`.
- Projet Firebase de production existant : `le-voyage-f0ae3`, état ACTIVE. Seules ses métadonnées de projet ont été consultées ; ses données, règles et services ne sont pas déclarés audités.
- Projet de test : `rc-voyage-test-20261027`, état ACTIVE. Hébergement configuré vers Cloud Run `voyage-test`, `europe-west1` ; révision réellement servie `voyage-test-00027-wbc`, 100 % du trafic lors de l’audit.
- Image servie : `sha256:52e982a25bad415dfb8d864da27ec20a80105ca0fe55474c2ffe686608b76e7e`. Construction `021c833e-02f2-4e38-aae3-5bf41f08652f`, état SUCCESS ; source `gs://rc-voyage-test-20261027-build-source/source-r9h2-wallonia-2.tgz`.
- Les sources locales précédentes avaient été supprimées par la maintenance automatique. GitHub ne contenait pas la dernière version déployée : récupération de cette archive complète, puis commit de restauration `98fc4bc`. Cela restaure des fichiers, pas les anciens objets de commits locaux disparus. Empreinte de l’archive dans `audit-evidence.json`.
- Développement et vérification sur la restauration de la version publiée dans `work/la-cite-economy-v1`. Branche de revue GitHub `work/la-cite-economy-tranche-1` : ajout des seuls fichiers La Cité sur la base distante `ec30fc8`, sans remplacer ses fichiers historiques par ceux de la restauration. Vérifications ciblées exécutées dans les deux contextes. Aucun changement de `main`, aucune écriture de données distantes, aucun déploiement. Avant un déploiement futur, réconcilier explicitement les sources historiques GitHub avec la version test publiée.

## Structure et réutilisation

| Domaine | Constat inspecté | Suite La Cité |
|---|---|---|
| Calcul métier | `src/domain/exact.ts` fournit fractions exactes et arrondi demi-supérieur ; calendrier civil dans `calendar.ts` | Réutiliser les utilitaires, ajouter `src/cite` sans adapter l’ancien moteur de progression |
| Authentification | Firebase Admin vérifie le jeton avec révocation ; sessions serveur, CSRF, Google réservé aux testeurs ; mode test `demo` actuellement | Conserver les mécanismes, ajouter des permissions de saison explicites |
| Entreprises et équipes | Affectations vérifiées côté serveur ; transactions relisent les droits ; annuaire des espaces séparé des autorisations | Réutiliser les comptes et le tenant, créer saisons et familles séparément des campagnes historiques |
| Quatre espaces | Organisateur, direction, collaborateurs/équipes, cadeaux sont présents dans le code | Garder la séparation, créer de nouvelles projections pour La Cité |
| Évaluations | Questionnaire hebdomadaire et contrôles de confidentialité existants | Réutiliser les principes ; les critères personnalisables et les écus nécessitent un moteur distinct |
| Cockpit | Catalogue, import, bénéficiaires, réservations, propositions, livraisons, plafonds et audit dans les modules serveur | Adaptation future des déclencheurs aux trois programmes optionnels ; aucune réattribution historique |
| Sheets | `master-sheets.mjs` lit une source autorisée côté serveur, filtre grilles/formules et borne le transport ; import avec aperçu/confirmation | Réutilisable. Les trois variables de source Sheets ne sont pas toutes présentes sur le service test : aucun Master réel déclaré connecté |
| Interface historique | Carte et vocabulaire anciens encore servis | Ne pas les transférer à La Cité. Première tranche sans nouvelle interface publique |

## Données et sécurité effectivement inspectées

Firestore test : base `(default)`, édition STANDARD, type FIRESTORE_NATIVE, région `europe-west1`. Collections racines présentes : `giftOperators`, `invitations`, `serverSessions`, `supplierCatalog`, `tenants`, `workspaceDirectories`.

Un document de campagne exclusivement fictive a été inspecté pour sa structure : `payload` sérialisé contenant `schemaVersion`, `csrf`, `ledger`; état métier avec configuration, résultats, droits cadeaux, tâches et gel. Quatre équipes et quatre paliers. Aucun résultat individuel ni secret n’a été reproduit dans ce diagnostic.

Les règles **actuellement déployées** de la base test ont été lues via l’API Rules : refus global `allow read, write: if false`. Le navigateur n’a donc pas accès directement aux documents ; les garanties doivent aussi être assurées par le serveur Admin, qui contourne ces règles. Ce constat ne vaut pas audit complet de l’IAM, des sauvegardes ni de la conformité des traitements RH.

## Diagnostic et première tranche retenue

Le socle technique est réutilisable ; le jeu La Cité n’était pas implémenté dans la version inspectée. Ne pas renommer simplement les anciennes distances en écus. Ajouter un domaine indépendant, puis des commandes transactionnelles et des projections minimales. La première tranche traite les critères, revenus et bourses ; les votes, financements, cité évolutive et options commerciales suivent.

Contrôles de reprise exécutés : 11 tests accès/catalogue/Sheets, puis compilation du front historique et contrôle de la liste publique. Les intégrations Firebase complètes, les traitements réels Sheets et la totalité des tests navigateurs n’ont pas été relancés pour cet audit ciblé.
