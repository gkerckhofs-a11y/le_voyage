# Phase 10 — Rituel hebdomadaire et engagements délégués

3 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14. Cahier des charges V1.0 ; aucune modification des arbitrages ouverts.

## Comportement

Notre Cité affiche les critères Valeurs configurés pour la semaine active. Le collaborateur saisit ses propres notes entre 1 et 5, puis retrouve sa réponse après rechargement. Un envoi identique est idempotent ; un changement exige la procédure de correction auditée déjà prévue par le moteur. Une réponse ne crédite pas les écus immédiatement. La performance professionnelle et la clôture hebdomadaire restent des opérations autorisées séparées, hors du formulaire collaborateur.

Le serveur ne projette aucune réponse ou note professionnelle d'un collègue : seule la réponse de l'acteur authentifié pour la semaine courante est retournée. Une adhésion active et datée, l'éligibilité au début de semaine, la fenêtre et l'absence de crédit clôturé sont contrôlées côté serveur. Les valeurs invalides sont refusées avec 400, un conflit ou une clôture avec 409, un accès illégitime avec 403.

Pendant le financement d'un projet adopté, le délégué explicitement affecté à cette famille et cette saison peut enregistrer, modifier ou retirer une promesse. Le montant est borné par sa bourse et le coût restant, en tenant compte de l'engagement déjà présent. Les écus ne sont débités qu'à la clôture si le projet est intégralement financé, selon le moteur précédent. Une famille unique reste prise en charge, sans suspension bloquante. L'interface rappelle la règle de contribution nulle et ne décide aucun minimum supplémentaire.

La révision familiale et l'identifiant de mutation restent gérés par le moteur transactionnel. Deux délégués concurrents ne peuvent pas écraser leurs modifications silencieusement ; l'interface recharge l'état courant sur 409 et exige de vérifier avant de réessayer. Chaque action revérifie le droit `citeFundingAssignments`, sans le déduire d'un nom, d'un rôle client ou du statut de membre. Le retrait du droit supprime le formulaire lors du prochain chargement et bloque immédiatement toute nouvelle requête.

## Fichiers

- `src/server/cite-family.mjs` : projection hebdomadaire personnelle, soumission via `submitValues`, projection des possibilités de financement, engagement via `pledge`.
- `src/server/cite-store.mjs` : transmet à l'action transactionnelle la capacité de financement calculée depuis l'affectation serveur. La fonction d'horloge de test reçoit la portée serveur ; l'horloge réelle par défaut reste Europe/Brussels.
- `src/server/cite-member-http.mjs` : POST `/api/cite/family/weekly` et `/api/cite/family/pledge`, espace membre et CSRF obligatoires, corps exact sans acteur ni portée fournis par le client.
- `web/cite-family.html`, `.css`, `web/assets/cite/family.js` : formulaires accessibles, affichage personnel, engagement révocable, gestion des conflits et révocations. Pas de nouveau fichier public ou de dépendance.
- `src/server/cite-cockpit-demo.mjs`, `scripts/serve-cite-cockpit.mjs` : la société fictive des Fondateurs permet maintenant une autoévaluation non préremplie. La société fictive des Contributions présente le même premier projet déjà adopté et non financé, au 2 mars 2027. Horloges fixes de scénario, exclusivement sur émulateurs. Chaque société possède ses documents et droits propres. Les autres démonstrations sont conservées.
- `tests/cite/family.test.mjs` : six nouveaux cas de validation/confidentialité/concurrence/délégation/HTTP ; tests ciblés de la famille antérieurs conservés.
- `tests/cite-emulator/cockpit-http.test.mjs` : deux nouveaux parcours Auth/Firestore, réponses et engagements simultanés, persistance, aucun débit/crédit anticipé, CSRF et retrait du droit.
- `tests/cite-cockpit-browser/family.spec.mjs` : trois nouveaux parcours exécutés sur ordinateur et mobile : rituel/rechargement, promesse/retrait/révocation, formulaire périmé dans deux onglets.

## Vérifications

87 tests Cité, TypeScript, build et liste publique stricte réussis localement. Les intégrations et les captures navigateur sont préparées pour la CI ciblée ; leur exécution et leurs résultats sont consignés dans la PR, sans présumer de leur réussite.

## Limites

Aucun déploiement, donnée réelle, commande ou règle Firebase modifiée. Pas de saisie de performance par la direction, de clôture automatique, de création d'affectations/délégués ou de workflow de correction dans cette tranche. La révocation interdit les requêtes dès son enregistrement serveur ; une page déjà affichée est purgée au prochain accès serveur, sans canal temps réel. Les barèmes et politiques de données manquantes/quorum/récompenses demeurent provisoires selon V1.0. La divergence historique GitHub/version publiée reste à réconcilier avant publication.
