# Phase 0 — reprise factuelle, 27 octobre 2026

## Sources effectivement consultées

- Cahier des charges V2, fichier joint `RC_Le_Voyage_Cahier_des_Charges_Astra_V2(1).md`, lu intégralement (sections 0–14 et sources). SHA-256 : `cb2b3466efcf85aafb5da02683f0d9daba6d306f5c5534e7042784c8c18cbd3e`.
- Dossier Clem V2 du 27 octobre 2026, lu intégralement pour le récit et le parcours métier.
- API GitHub et clone de [gkerckhofs-a11y/le_voyage](https://github.com/gkerckhofs-a11y/le_voyage).
- Source de la [maquette Lex EKHO](https://rouge-clemence-lexekho-parcours.swiftclove64.chatgpt.site), commit source `9966a7855dd3cad169ba629af5d157362fc5a603`.

## État réel avant modification

| Élément | Observation |
|---|---|
| GitHub | Dépôt public créé le 27 octobre 2026 ; accès pull/push déclaré par la connexion |
| Branche annoncée par GitHub | `main`, mais aucune référence de branche existante |
| HEAD réel initial | Aucun commit : clone vide confirmé |
| Branches / PR | Listes vides |
| Dernière CI | Aucune exécution (`total_count: 0`) |
| GitHub déploiements | Endpoint non pris en charge par la connexion ; aucun constat d'absence possible |
| Maquette | Site existant, version 1, accès public, source récupérée |
| Architecture maquette | HTML, CSS, JavaScript sans framework ; `localStorage` clé `rc-lexekho-v1` ; pas de serveur ni de dépendances |
| Fichiers source | `dist/index.html`, `dist/style.css`, `dist/app.js`, six PNG et manifeste d'hébergement Sites |
| Services constatés | Aucun appel de données externe dans la logique ; aucune configuration Firebase dans la source |
| Données | Exemples explicitement fictifs, conservés dans le navigateur |
| Tests et CI source | Aucun fichier de test ou workflow dans l'arbre récupéré |
| Firebase | Projet créé selon l'utilisateur ; identité, services, droits et déploiements non encore vérifiés. Authentification en cours de raccordement |

La maquette n'a pas été republiée ni modifiée. Ses fichiers visibles sont copiés à l'identique sous `prototypes/lexekho-v1`, sans recopier le manifeste d'hébergement, les identifiants de connexion ou les données locales du navigateur.

## Delta factuel avec la V2

| Sujet | Maquette existante | V2 |
|---|---|---|
| Rythme et unité | 12 mois, 48 cases, jusqu'à 4 cases par mois | Semaines actives et kilomètres ; 58 bornes décoratives indépendantes |
| Indicateurs | Quatre métriques professionnelles en pourcentage | Deux indicateurs facultativement économiques + trois questions humaines |
| Direction | Atelier de saisie mensuelle | Questionnaire annuel, référent facultatif |
| Équipes | Une équipe/pion Lex EKHO | Plusieurs voitures ou TPE, noms/couleurs votés |
| Collectif | Projet séparé, cinq cases à cocher | Moyenne hebdomadaire des équipes, réception unique garantie et enrichie |
| Cadeaux | Quatre seuils fixes de cases, affichage de cartes | Seuils calculés, droits idempotents, préférences, calendrier et logistique |
| Réception | Célébration du projet à 100 % | Formules à budget total, date de gel, suivi prestataires |
| Exceptions | Aucune mécanique de congé/report/joker observée | Règles explicites, pas de double kilométrage |
| Données/droits | Tout est local au navigateur | Serveur, rôles, isolation tenant, réponses privées |
| Opérations Clem | Aucun cockpit observé | Agenda, commandes, coûts, marges, tâches et fournisseurs |

## Réutilisation et structure

Conserver l'ossature HTML responsive, les composants de navigation, cartes cadeaux, dialogues, messages de statut et règles de réduction des mouvements comme référence pour les futures surfaces. Les six images sont des actifs de la maquette existante ; leur provenance précise et leurs conditions de réutilisation publique devront être documentées avant publication. Les couleurs de cette maquette ne sont pas présentées comme une charte officielle certifiée.

La logique mensuelle ne répond pas au nouveau modèle : extraction d'un domaine TypeScript pur, sans dépendance au DOM, à Firebase ni à un framework. Aucun refactoring cosmétique de la maquette. Une couche serveur/adaptateur transactionnel et des vues collaborateur/cockpit consommeront ce domaine ensuite. Firebase est la cible demandée ; ses services exacts restent à constater après connexion.

## Tranches suivantes

1. Moteur exact, calendrier, scores, exceptions, convoi, droits cadeaux et gel ; tests et simulation.
2. Parcours collaborateur et premières interfaces serveur : invitation contrôlée, vote, préférences, trois réponses, absence/report. Ne pas confondre prototype local et accès sécurisé réel.
3. Réutilisation visuelle : route illustrée, 58 repères, voitures, écran collectif et responsive.
4. Cockpit Clem : calendrier, droits cadeaux vers tâches/commandes, coûts et marges, exports.
5. Réception : formules, gel opérationnel, prestataires et réservations.
6. Configuration annuelle et référent KPI facultatif.
7. Isolation serveur complète, droits, sauvegarde/restauration, accessibilité, e2e, pilote et décision de publication.

## Risques et contraintes constatés

- Dépôt vide : aucune branche de base pour une PR. Créer la branche de travail sans initialiser `main`. Si le transport Git autorisé ne permet pas cette première publication, conserver un livrable récupérable ; ne pas contourner l'interdiction de modifier `main`.
- Aucun lien Firebase projet/application vérifié : ne pas deviner le project ID ou activer des services sur un autre projet.
- Confidentialité petits groupes et régularité : hypothèses explicites, pas de garanties juridiques.
- Les fonctions métier ne remplacent pas les règles d'accès serveur et les transactions durables.
- Les interfaces et données de l'ancienne maquette ne doivent pas être migrées automatiquement dans une campagne réelle.
