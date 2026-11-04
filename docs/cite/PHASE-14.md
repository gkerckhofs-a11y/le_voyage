# Phase 14 — Corrections tracées des performances non créditées

4 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14. Source : V1.0, §§ 2.4, 3.3, 11.2 et 12.1. Aucun arbitrage P0 supplémentaire.

## Parcours

L'administrateur de saison peut corriger une performance professionnelle existante, ou compléter une donnée professionnelle manquante après l'échéance, tant que la famille/semaine n'a pas reçu son revenu. Le formulaire distinct présente la valeur enregistrée, les nouvelles notes normalisées 1–5, un motif de 8 à 500 caractères et une confirmation. Changer les notes ou le motif retire la confirmation. Un premier enregistrement dans la semaine courante utilise toujours le formulaire normal.

Le serveur impose les critères configurés et leurs pondérations existantes, une semaine active déjà commencée, la valeur précédente attendue et le numéro de révision courant. Deux corrections concurrentes ne peuvent pas s'écraser ; le numéro de révision bloque aussi un ancien formulaire si la valeur a été modifiée puis rétablie entretemps. Un identifiant de mutation lie le réenvoi à la commande et à l'acteur authentifié : une relance identique est sans effet supplémentaire, un réemploi différent est refusé.

Chaque modification conserve un enregistrement privé avec auteur serveur, date de jeu, famille/semaine, motif, scores professionnels avant/après et révision. Le journal de gestion ne copie pas les notes, mais référence cette correction. L'administrateur voit l'historique de la famille/semaine (vingt dernières entrées) sans bulletins, ambitions secrètes ou autoévaluations individuelles. Les collaborateurs ne reçoivent ni motif ni historique professionnel administratif dans leur projection familiale.

Une correction ne crédite aucun écu. La clôture habituelle reste séparée, reprend la performance corrigée et crédite au maximum une fois. Une clôture différée pour performance manquante peut ainsi être débloquée après réception de cette donnée, si les réponses Valeurs requises sont disponibles. La politique configurée de données manquantes ne change pas.

Une famille/semaine déjà créditée est verrouillée, y compris en cas de revenu de base de cinq écus. Aucun recalcul rétroactif des bourses, financements, cadeaux ou Conseils n'est introduit. Le réenvoi d'une correction déjà appliquée reste sans effet après crédit, sous réserve de droits encore actifs.

## Architecture

- `src/cite/economy.ts` : correction pure des seules performances non créditées.
- `src/server/cite-performance-correction.mjs` : contrôle des révisions, idempotence et historique professionnel privé.
- `src/server/cite-admin.mjs`, `cite-admin-http.mjs` : commande POST `/api/cite/admin/correct-performance`, espace gestionnaire, portée de session, CSRF et corps exact borné à 4 Kio.
- `web/assets/cite/admin.js`, `web/cite-admin.css` : formulaire séparé et historique responsive, avec contenu rendu par textContent.

La performance, son historique et l'audit de gestion partagent la transaction privée existante. La synchronisation des récompenses est conservée dans cette transaction ; un échec annule également la correction. Les limites existantes de 800 000 octets par document et de 2 000 événements de gestion sont conservées ; une limite de 500 corrections professionnelles par saison s'ajoute pour le prototype, avec refus avant écriture à capacité atteinte.

## Vérification

Six tests ciblés supplémentaires couvrent la traçabilité, les données confidentielles, les valeurs avant/après, les semaines différées, le calcul du revenu corrigé, les crédits verrouillés, la concurrence/révisions, les réenvois, les erreurs de synchronisation/capacité, les droits et le contrôleur HTTP. Deux intégrations Auth/Firestore couvrent correction concurrente, persistance, confidentialité, révocation, complément tardif puis clôture unique. Deux parcours navigateur, sur ordinateur et mobile, couvrent confirmation, historique et formulaire périmé entre onglets.

Vérifications locales réussies : 115 tests Cité, 14 intégrations HTTP Auth/Firestore et 8 parcours navigateur administration sur ordinateur/mobile ; TypeScript, compilation web et liste publique stricte réussis. La capture mobile de l’historique a été inspectée et le parcours vérifie l’absence de débordement horizontal. Les quatre workflows de la tranche précédente `97c887f` sont réussis ; la CI du nouveau commit doit être vérifiée séparément.

## Limites

Cette tranche ne corrige ni les autoévaluations personnelles, ni les semaines créditées, ni les Conseils publiés. La correction de notes professionnelles normalisées ne tranche pas la conversion du CA ou des objectifs bruts en notes 1–5. La gestion des entreprises, saisons, invitations et affectations, l'ordonnancement, la logistique, les archives et le pilote humain restent à traiter.

Aucun déploiement, donnée client, achat ou règle Firebase modifié. La réconciliation des sources historiques GitHub/version Voyage publiée reste obligatoire avant publication.
