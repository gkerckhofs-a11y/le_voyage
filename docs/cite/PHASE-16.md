# Phase 16 — Création autorisée d'un pilote dans une entreprise existante

4 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14. Source : V1.0, §§ 2, 3, 9.4, 10, 11 et 13.2. Aucun arbitrage P0 supplémentaire ; périmètre volontairement limité au pilote de quatre Conseils.

## Parcours livré

Un organisateur explicitement autorisé voit « Créer un pilote » dans l'administration de sa saison. Le formulaire configure le nom de la nouvelle Cité, son premier lundi, 1 à 10 familles, 1 à 20 critères par catégorie avec pondérations totalisant 100 %, les cinq jauges initiales et la politique de données manquantes. Il exige la confirmation du caractère provisoire des paramètres et de l'absence de contrat annuel/budget cadeau.

Le serveur valide les critères par le moteur économique existant et produit un aperçu des 16 semaines, quatre Conseils, noms, poids, jauges et politique retenue. Une modification du formulaire invalide l'aperçu. La confirmation doit correspondre à son empreinte canonique, liée à l'entreprise, à l'acteur et aux versions de règles. Le premier lundi doit être présent ou futur au moment de la création ; une relance d'une création déjà appliquée reste sans effet après cette date.

La création produit une Cité indépendante, des bourses à zéro, aucun membre affecté, aucun revenu, bâtiment ou Conseil publié, et aucun programme de récompenses. Une nouvelle graine privée attribue ambitions et crises avec les règles de prototype existantes. Les poids globaux 40 % performance / 60 % valeurs, les notes normalisées 1–5 et la réponse Valeurs minimale de 1 pour un calcul complet restent explicitement ceux du prototype. La conversion de CA/objectifs bruts n'est pas introduite.

La nouvelle saison apparaît dans « Mes espaces » pour son créateur, qui reçoit son accès de gestion. Le bouton d'ouverture utilise la sélection d'espace habituelle et sa rotation de session. Les autres comptes et affectations ne changent pas. Les collaborateurs devront être affectés dans une tranche ultérieure.

## Droits et atomicité

Créer un pilote exige à la fois une adhésion active à l'entreprise, le droit `citePilotCreation: true` et l'autorisation de gestion de la saison source sélectionnée. Un droit de gestion ordinaire ne suffit pas. La création ne peut pas s'autoriser elle-même ni créer une entreprise. Les droits sont relus à la confirmation, y compris pour un réenvoi déjà appliqué.

La transaction lit tous les documents avant écriture, puis écrit ensemble : saison privée, registre d'idempotence, autorisation de gestion et entrée de répertoire du créateur. L'identifiant de saison est dérivé côté serveur de l'entreprise, du créateur et de l'identifiant de mutation. Une collision, un autre contenu avec le même identifiant ou un répertoire plein annule tout. Les données de la Cité source sont conservées. Les autorisations et répertoires existants ne sont pas remplacés par une liste reconstruite.

Le pilote ne crée pas de compte Firebase Auth. La capacité de création est accordée seulement au compte administrateur fictif des scénarios concernés, dans les fixtures d'émulateur. Aucun utilisateur existant distant n'est modifié. Le répertoire et la liste de saisons gérées sont bornés à vingt entrées pour ce flux. Le transport HTTP est limité à 64 Kio pour accepter les libellés UTF-8 bornés du formulaire complet.

## Fichiers et vérification

- `src/server/cite-pilot-setup.mjs` : normalisation, aperçu, transaction de création et routes HTTP GET/POST.
- Store/administration : expose seulement l'indicateur de création déjà autorisé côté serveur.
- Route `/api/cite/pilot-setup` dans les gardes de session existantes.
- `web/cite-setup.html`, `.css`, `web/assets/cite/setup.js` : formulaire, pondérations, relecture, invalidation et ouverture.
- Fixture administrateur : capacité explicite de création pour les scénarios fictifs uniquement.
- Huit tests ciblés : validation, aperçu sans écriture, droits, source préservée, création concurrente/idempotente, graine indépendante, capacité, famille unique et HTTP/CSRF/UTF-8.
- Deux intégrations Auth/Firestore : création concurrente et ouverture via répertoire, rôle ordinaire insuffisant et révocation.
- Deux parcours navigateur sur ordinateur/mobile : relecture, invalidation, création/ouverture, pondérations refusées et révocation.

Vérifications locales réussies : 129 tests Cité, 18 intégrations HTTP Auth/Firestore, 4 parcours navigateur de création sur ordinateur/mobile, TypeScript, compilation web et liste publique stricte. La capture mobile du formulaire et de la relecture a été inspectée. Les quatre workflows de `960a695` ont réussi ; la CI du nouveau commit reste à vérifier.

## Limites

Ce flux crée un **pilote de 16 semaines**, pas une saison commerciale de douze mois. Il n'arbitre pas les 52/53 échéances annuelles ni le traitement d'un début hors lundi. Pas encore de création d'entreprise, invitations, affectations de membres, suppression/archivage de pilotes ou délégation du droit de création depuis une interface. Les membres, contenus de Conseils, options cadeaux et budgets restent à préparer séparément. La saison source n'est pas archivée ni remplacée.

Aucun déploiement, donnée client, achat ou règle Firebase modifié. La réconciliation GitHub/version Voyage historiquement publiée reste obligatoire avant publication.
