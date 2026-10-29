# Phase 1 — moteur pur, première tranche

Date : 27 octobre 2026. Référence métier : cahier des charges V2 du même jour.

## Réalisé

| Exigence | Preuve / portée |
|---|---|
| Cinq scores, poids et 40–100 km | `scoring.ts`, cas 1/2/3/4/5 et poids invalides/renormalisés |
| Calculs déterministes | Arithmétique rationnelle exacte ; aucun arrondi intermédiaire |
| Seuils cadeaux et réception | Tests exacts des tableaux 46 et 42 semaines, arrondi à 10 km |
| Semaines et fermetures | Dates civiles, exclusion du maximum théorique, fermeture à 0 km |
| Absence individuelle | Personnes absentes ou inéligibles exclues des taux ; aucune raison d'absence collectée |
| Petits groupes | Valeur neutre configurée remplaçant les trois scores humains ; test TPE de deux personnes avec réponses opposées |
| Convoi | Moyenne non pondérée par les effectifs ; attente de toutes les équipes éligibles ; exclusions préprogrammées |
| Report | Même identifiant de semaine ; une extension ; clôture interdite avant échéance |
| Joker | Distance configurée, quota annuel par équipe, idempotence par semaine |
| Sans réponse | 40 km ; aucun cadeau avant seuil réel |
| Droits et tâches cadeaux | Une clé par tenant/campagne/équipe/palier ; créations dans une même transition |
| Réception | Base garantie, budget total du niveau retenu, gel immuable ; calcul indépendant des cadeaux |
| Concurrence | 20 appels concurrents sérialisés dans un adaptateur mémoire, un droit et une tâche ; rollback testé |
| Projection collective | DTO sans réponses, préférences, scores, budgets ni effectifs |
| Simulation | Trois campagnes fictives de 12 semaines, dont deux sans KPI ; deux absences et un joker par client |

## Contrats techniques et hypothèses explicites

- **Distances exactes :** deux chaînes d'entiers décimaux `numerator` / `denominator`. Exemple : 70 km = 70/1. Une moyenne peut produire 1/3 ; une seule colonne décimale à précision finie ne peut alors la représenter exactement. Le format rationnel évite de choisir un arrondi caché. Affichage au km le plus proche seulement ; seuils arrondis à 10 km, demi-valeurs vers le haut.
- **Date de gel :** cette première tranche utilise une date civile de dernier jour éligible, inclus, en Europe/Brussels. Le gel s'exécute dès le lendemain. Cette convention est une proposition explicite à confirmer dans le formulaire de réception ; elle ne prétend pas implémenter un gel à une heure précise. Les semaines entièrement terminées avant ou au dernier jour éligible contribuent au maximum théorique. Une clôture/report traité après ce jour reste utile aux cadeaux, pas à la réception. Une réservation future aura un véritable instant d'exécution si nécessaire.
- **Périodes :** semaines complètes démarrant le lundi dans le générateur ; débuts/fins partiels refusés au lieu d'être inventés. Les horodatages serveur devront fournir la date Bruxelles au domaine. Les événements antidatés sont refusés.
- **Régularité :** pas de formule normative dans le CDC. Le domaine accepte un score calculé selon la politique choisie. La simulation utilise explicitement une moyenne de participation sur quatre semaines actives, semaine courante comprise ; un utilitaire testé réalise ce calcul. Ce n'est pas un paramètre validé de production.
- **KPI absent :** erreur explicite « KPI pending » ; pas de substitution inventée. La politique de remplacement/attente reste à valider. La non-réponse totale reste à 40 km conformément au CDC.
- **KPI inversé :** barème « plus est mieux » réalisé. Un barème « moins est mieux » nécessite une règle configurée validée ; aucune formule universelle supposée.
- **Toute l'équipe absente :** rejet explicite faute de politique définie (pause/exclusion ou valeur neutre). Pas de division par zéro ni de pénalité cachée.
- **Petits groupes :** démonstration avec seuil de cinq répondants et valeur neutre 3. Aucune certification d'anonymat ou de conformité. L'analyse par différences et les droits réseau restent à traiter avant pilote réel.
- **Changements d'effectif :** snapshots d'éligibilité et semaines d'activation des équipes ; droits historiques conservés. Ni fusion d'équipe ni révision rétroactive de KPI exposées à ce stade.
- **Persistance :** transitions sans effets réseau. Une transaction serveur devra lire la campagne, recalculer la transition et écrire atomiquement progression/droits/tâches. Le stockage mémoire n'est ni durable ni sûr entre plusieurs processus.
- **Clés d'idempotence :** sérialisation de tuples, pas concaténation ambiguë. Elles ne sont pas des identifiants Firestore directs : l'adaptateur décidera de leur encodage/hachage sûr.

## Tests réellement exécutés

Environnement local : Node 24.22.1 ; TypeScript 7.0.2 et types Node 24.19.2 verrouillés dans le lockfile.

| Commande | Résultat |
|---|---|
| `npm run test:engine` (première passe) | 26 tests réussis, 0 échec |
| `npm run typecheck` (après simulation et garde temporelle) | Réussi, aucune erreur TypeScript |
| `npm test` (même état) | 29 tests réussis, 0 échec |
| `node scripts/simulate.mjs` | Trois campagnes produites ; instantané JSON conservé |

Le workflow GitHub préparé cible les changements du domaine, des tests et de leurs dépendances. Il n'effectue aucun déploiement. Son état distant doit être constaté après publication de la branche ; ces succès locaux ne sont pas présentés comme une CI distante réussie.

## Résultats du pilote fictif

Les seuils sont recalculés sur **12 semaines dont une fermeture** pour tester le flux court. Ils ne valident pas statistiquement les seuils d'une campagne annuelle. Montants entièrement inventés pour les tests : 100 € par cadeau d'équipe, réception de base à 1 000 €, niveaux à 1 300 et 1 700 € au total. Aucune commande réelle.

| Client fictif | Convoi final, affiché | Paliers acquis | Tâches cadeaux | Réception gelée | Budget dû simulé / maximal |
|---|---:|---:|---:|---:|---:|
| TPE, 2 personnes | 864 km | 2/3 | 2 | Niveau 1 | 1 500 / 2 000 € |
| PME, équipes 4/10/7/6 | 903 km | 8/12 | 8 | Niveau 1 | 2 100 / 2 900 € |
| Lex EKHO, équipes 6/8/5, KPI fictifs | 805 km | 6/9 | 6 | Niveau 1 | 1 900 / 2 600 € |

Chaque simulation comprend deux absences, un joker, une fermeture et une semaine sans réponse. Les valeurs exactes et la progression semaine par semaine figurent dans `simulation-12-semaines.json`. Aucun résultat RH réel n'est mesuré.

## Restant / limites

- Transaction Firebase et vérification concurrente sur émulateur : non réalisées.
- Authentification, rôles et impossibilité d'accéder au client voisin : non implémentés ; les tests de portée du domaine ne prouvent pas ces propriétés réseau.
- Invitation, vote, préférences sans alcool, calendrier cadeaux, approvisionnement, marge, notifications et budgets opérationnels : phases 2/4/6.
- Réservations prestataires, précision horaire éventuelle du gel, interventions humaines motivées et révisions de KPI : phases 5/6.
- Sauvegardes, restauration, archives annuelles, e2e, audit d'accessibilité et validations juridiques/fiscales : phase 7.
- Aucune nouvelle interface V2 construite dans cette tranche ; pas de capture présentée comme preuve d'une interface réalisée.
- Aucune régression observée dans les 29 tests ; aucune affirmation sur des parcours UI/serveur encore absents.

## Prochaine tranche précise

Terminer le raccordement GitHub/Firebase, relever le projet Firebase exact et préparer un environnement local/émulateur distinct de la production. Ajouter le stockage transactionnel et ses tests ciblés de clôture/doublon/isolation ; puis commencer le parcours collaborateur avec préférences, invitation et trois réponses privées. Réutiliser ensuite les composants de la maquette sans reprendre son moteur mensuel. Ne pas refaire l'inventaire historique.
