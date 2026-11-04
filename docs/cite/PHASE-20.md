# Phase 20 — Stabilisation de la navigation dans la CI

4 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14.

## Échec constaté

La CI du commit `a3c7acc` a réussi les tests du moteur Cité, le prototype navigateur et les intégrations Auth/Firestore. Dans le job `transactions`, 55 parcours navigateur sur 56 ont réussi. Le premier parcours administration sur ordinateur a échoué pendant la vérification de navigation : le test attendait une URL terminant exactement par `/cite-admin.html`, alors que la phase 19 mémorise désormais le Conseil sélectionné dans une ancre telle que `#conseil-2`.

L'application avait bien ouvert le bon écran. Le résultat du test dépendait de la rapidité de son assertion par rapport au rendu qui ajoute l'ancre, ce qui explique que les contrôles locaux précédents n'aient pas détecté ce cas.

## Correction

Le test de connexion administrative vérifie maintenant le chemin `/cite-admin.html`, indépendamment de l'ancre de sélection. La vérification du nom de la Cité affichée reste présente. Les tests de préparation conservent leur contrôle de sélection, rechargement, révision et publication pour valider l'ancre fonctionnelle.

Seul le test est modifié ; aucun comportement métier, droit, donnée ou paramètre n'est changé. Une recherche des assertions similaires n'a trouvé que cet emplacement dans les tests du dépôt.

## Vérification

Les 18 parcours administration et préparation/publication/import ont réussi localement, exécutés ensemble sur ordinateur et mobile. La nouvelle CI sera consignée dans la PR après observation. Les tests métier et intégrations n’ont pas été relancés localement pour ce changement limité à une assertion de navigation.

Référence de l'échec : https://github.com/gkerckhofs-a11y/le_voyage/actions/runs/41797074121

Aucun déploiement, donnée client, achat ou règle Firebase modifié. Les travaux fonctionnels restants de la phase 19 restent ouverts.
