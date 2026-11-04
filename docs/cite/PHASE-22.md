# Phase 22 — Déploiement privé de préparation, 4 novembre 2026

## Réalisé

- Connexion Firebase rétablie ; projet de test relu : `rc-voyage-test-20261027`.
- Source réconciliée locale : `05b2d51cfbfa0f0e3968a42753e13dc9307e72a3`. La branche `work/la-cite-staging-reconciliation` fusionne le prototype avec les sources exactes de la révision historique publiée. Le conteneur inclut désormais les deux fichiers de présentation La Cité utilisés par la construction.
- Configuration de prévisualisation distincte : `firebase/cite-preview-hosting.json`, service `voyage-test-cite`. L’origine canonique est limitée au canal `cite-pilot` du projet de test ; les origines non déclarées sont refusées. Le domaine d’authentification Firebase de la prévisualisation reste celui du projet.
- 156 contrôles de réconciliation et 2 parcours ordinateur/mobile réussis localement, puis 16 contrôles de configuration/garde Google. La construction Cloud Build exécute aussi TypeScript, les 150 tests Cité, les 16 contrôles d’accès, la construction web et le contrôle de la projection publique.
- Cloud Build `fdfc5689-2480-46f3-b970-82632e3b035f` réussi. Archive : `gs://rc-voyage-test-20261027-build-source/cite-05b2d51cfbfa0f0e3968a42753e13dc9307e72a3.tgz`.
- Image : `europe-west1-docker.pkg.dev/rc-voyage-test-20261027/voyage-test/cite@sha256:1b491d01fb3c297be5e74066341d5630ab5af156f76351f6aae14f26f780bf10`.
- Service distinct créé, prêt : `voyage-test-cite-00001-xz4`, région `europe-west1`. Mode `provisioned`, garde Google, liste des testeurs limitée au propriétaire déjà vérifié. Secrets existants référencés sans copie de leur contenu dans le dépôt.
- Pilote `fiction-cite-staging-20261104` / `pilot-20261109` créé avec trois familles, seize semaines dès le 9 novembre 2026, aucun membre affecté, solde nul et récompenses désactivées. Le compte Google propriétaire existant reçoit le droit de gestion et création de pilotes ; son annuaire est étendu sans supprimer les autres espaces. Aucun nouveau compte Auth, courriel ou résultat professionnel créé.

## État arrêté

Le service est **privé** : sa politique IAM ne contient aucun accès public. La vérification automatique a rejeté l’ajout de `roles/run.invoker` à `allUsers`, considérant que le déploiement de test demandé ne constituait pas une autorisation explicite pour cette ouverture HTTP. L’application possède sa propre connexion Google et ses contrôles de droits, mais l’ouverture de l’invocation Cloud Run reste une décision distincte.

Le canal `cite-pilot` a été créé (expiration initiale le 11 novembre 2026) ; la configuration Hosting vers le nouveau service n’a pas encore été publiée. La recette distante connectée n’est pas réalisée. Ne pas présenter l’URL de prévisualisation comme opérationnelle.

Le service historique `voyage-test` est toujours sur `voyage-test-00027-wbc`, avec 100 % du trafic sur sa dernière révision. Aucun déploiement Hosting live ni modification du projet de production `le-voyage-f0ae3`.

## Reprise

Après accord explicite sur l’ouverture HTTP du seul service `voyage-test-cite`, ajouter le droit d’invocation public à ce service, conserver la garde Google et les droits de saison, publier seulement le canal `cite-pilot`, puis vérifier la page de connexion, le refus anonyme des API et le parcours connecté. Aucune autre permission ni bascule du service historique n’est nécessaire dans cette tranche. Les sources réconciliées et la recette complète doivent encore être publiées/revues sur GitHub ; la CI verte précédente concerne `eb1f56e`, pas ce nouvel état local.
