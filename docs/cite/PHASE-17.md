# Phase 17 — Affectations initiales des familles du pilote

4 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14. Source : V1.0, §§ 2.4, 5, 9.4, 10 et 11. Aucun arbitrage P0 supplémentaire.

## Parcours livré

Le créateur autorisé d'un nouveau pilote peut préparer sa liste de collaborateurs avant le premier lundi. Un compte est recherché par son adresse exacte dans Firebase Auth, puis vérifié comme actif dans la même entreprise. Les comptes absents, désactivés, non vérifiés ou hors entreprise sont refusés sans dévoiler les profils d'une autre entreprise. Aucun compte n'est créé et aucun message d'invitation n'est envoyé.

L'organisateur ajoute le compte à une famille et choisit explicitement si cette personne peut engager les écus familiaux. Une personne ne peut figurer qu'une fois dans la liste du pilote. Plusieurs délégués peuvent être autorisés ; le statut n'est pas déduit d'un nom ou d'un rôle local. Le formulaire présente la liste complète, exige sa confirmation et invalide cette confirmation à chaque modification. Il permet également de retirer ou réaffecter un participant pendant la préparation.

L'enregistrement remplace les affectations initiales de ce pilote uniquement. Il actualise ensemble les appartenances datées dans le moteur, les autorisations membres, les délégations de financement et les références dans Mes espaces. Les données et espaces des autres saisons/entreprises sont conservés. Les participants peuvent préparer Mes choix avant le démarrage ; l'accès au jeu et l'éligibilité hebdomadaire commencent au premier lundi configuré.

## Limites d'édition et droits

Le flux est réservé aux pilotes créés par la phase 16, avec le droit `citePilotCreation` et la gestion de la saison sélectionnée. La simple gestion de saison ou une adhésion membre ne suffit pas.

La préparation est verrouillée au premier lundi, ou dès la présence d'une activité de jeu, d'un revenu, d'un solde non nul, d'une construction/crise, d'un Conseil ouvert ou d'un plan de récompenses. Cette tranche ne traite donc aucun transfert en cours de saison ni correction d'un vote, revenu ou cadeau passé. Le refus est côté serveur, pas seulement dans l'interface. Une vue d'organisation déjà ouverte peut afficher sa liste en lecture seule après verrouillage.

## Atomicité et audit

La transaction relit les droits de l'organisateur, les comptes de l'entreprise et les répertoires concernés avant toute écriture. Une seule entrée invalide ou un répertoire plein annule toute la liste. Les comptes Auth sont revérifiés pour chaque nouvel enregistrement. Aucun droit de gestion ou de création n'est accordé au collaborateur par l'affectation.

La révision protège les éditions concurrentes. L'identifiant de mutation est lié à l'acteur, la portée, la liste triée et la révision attendue. Un réenvoi identique ne duplique rien et un ancien envoi déjà appliqué ne rétablit jamais un participant retiré ultérieurement. Le journal privé conserve auteur, date, révision et affectations/délégations avant/après. Il ne contient aucun bulletin ni note individuelle. Les coordonnées sont limitées à la projection d'organisation habilitée.

Limites du prototype : 100 collaborateurs et 100 révisions de préparation, vingt espaces par compte et bornes de document/audit existantes. Les appartenances commencent toutes au premier lundi. La graine, les ambitions, les crises, les bourses et les jauges ne changent pas avec cette préparation.

## Fichiers et vérification

- `src/server/cite-pilot-roster.mjs` : vérification des comptes, projection d'organisation, transaction et routes `/api/cite/pilot-roster`.
- Administration : lien d'affectation réservé à un pilote éditable et à un organisateur habilité.
- `web/cite-roster.html`, `.css`, `web/assets/cite/roster.js` : vérification par e-mail, liste à confirmer, délégations et conflits.
- Fixtures : compte collaborateur existant ajouté comme membre actif de l'entreprise fictive du scénario administrateur, sans nouvelle affectation ni délégation initiale.
- Huit tests ciblés : droits, appartenance d'entreprise, idempotence, changements/retraits avant démarrage, concurrence, absence de modifications financières, éligibilité à partir du lundi, verrouillages et rollback de capacité.
- Deux intégrations Auth/Firestore : accès membre et délégation effectifs, retrait, réenvoi ancien, capacité et révocation de l'organisateur.
- Deux parcours navigateur ordinateur/mobile : ajout, confirmation, persistance, retrait et conflit entre onglets.

Vérifications locales : 137 tests Cité réussis, TypeScript, compilation web et liste publique stricte réussis. Les vingt cas d’intégration HTTP Auth/Firestore ont réussi après correction d’un import d’administration manquant et des tests qui réutilisaient un ancien CSRF après sélection d’espace ; les deux nouveaux cas ont été relancés de manière ciblée. Les quatre parcours navigateur d’affectation sur ordinateur/mobile ont réussi et la capture mobile a été inspectée. Les quatre workflows du précédent `21a7e51` sont réussis ; la CI du nouveau commit reste à vérifier.

## Suite

Restent les invitations/créations de comptes, les arrivées/départs et transferts datés en cours de saison, le calendrier annuel, les autres fonctions d'exploitation et le pilote humain. Il n'y a pas encore d'obligation automatisée de remplir chaque famille avant démarrage.

Aucun déploiement, donnée client, achat ou règle Firebase modifié. La réconciliation GitHub/version Voyage historiquement publiée reste obligatoire avant publication.
