# V5 R1E — sous-modes KPI et écran collectif

28 octobre 2026. Branche `work/v2-phase1-engine`, PR #1. Reprise du HEAD réel `417c5a148ccb31b19b3d4fa5e35bba5804527956`, confirmé identique sur GitHub. Source V5 : §§2 et 3, modes accessoires ; écran collectif sans budgets, identité personnelle, classement ou cadeaux secrets, session expirante et révocable.

## Livré

Le sélecteur conserve les quatre espaces principaux. Les deux modes accessoires figurent dans une section distincte « Modes ciblés » : formulaire KPI et affichage TV. Un compte fictif dédié permet de vérifier ces modes tout en disposant aussi d’un droit directeur, afin de tester les refus entre rôles.

**Référent KPI.** L’accès exige le membre actif, l’affectation campagne/équipe, `kpiAssignments` explicite et une campagne en mode KPI. La session n’autorise que liste/lecture/transmission des agrégats, initialisation de session, déconnexion et sélection d’une autre affectation réellement autorisée. Elle refuse les cartes équipe/collectif, questionnaires personnels, préférences, cockpit, directeur, organisation, gestion des périodes et gestion des accès KPI. Les services existants conservent leurs transactions, contrôle des périodes gelées, révisions, corrections motivées et historique. Les données restent en attente de validation ; aucune conversion en kilomètres ajoutée.

Le profil historique « Référent KPI · démo » est lui aussi restreint : ses lectures des cartes équipe/collectif et sa route de simulation sont désormais refusées par HTTP 403. Son formulaire et ses agrégats restent utilisables. Le statut du formulaire passe à « Envoi en cours… » avant chaque transmission, puis à la confirmation reçue ; une confirmation précédente ne reste plus affichée pendant l’écriture suivante.

**TV/kiosque.** `kioskCampaigns` constitue une permission explicite au niveau de la campagne ; elle n’exige pas de participation ou d’affectation d’équipe. Le nouveau service `kiosk-progress.mjs` vérifie UID, membre actif, tenant, campagne autorisée et identité du payload dans la transaction. Il réutilise la projection collective existante : distances, minibus, historique kilométrique collectif et escales de réception, sans équipes nominatives, réponses, scores de formulaire, budgets, coûts, marges, préférences ou cadeau secret.

Après sélection, la session est limitée à `GET /api/kiosk/progress`, initialisation de session et déconnexion. Le sélecteur d’espaces et son API sont refusés, même si le compte possède d’autres rôles. Retrouver les autres espaces nécessite une nouvelle connexion, fictive dans cette démonstration. Le changement conserve la rotation cookie/CSRF de R1C et invalide l’ancienne session.

`/kiosque.html` force la présentation collective limitée. Les paramètres `scenario=frozen` ou `kiosk=0` ne remplacent pas la campagne autorisée par une autre variante et ne déverrouillent pas les commandes de navigation. Un rechargement est programmé après 60 secondes pour relire données et droits. En cas de refus de lecture, la carte est masquée. Le serveur refuse immédiatement les nouvelles lectures après révocation ; l’écran déjà affiché disparaît à la prochaine actualisation. La durée maximale reste celle de la session existante : 55 minutes depuis la connexion, sans renouvellement lors du changement de mode. L’expiration est testée avec une horloge serveur injectée, non contrôlable par une requête navigateur.

## État du socle R1

| Accès | Droit serveur distinct | Limite testée |
|---|---|---|
| Organisateur | `organizerCampaigns` + capacités opérationnelles | Routes cadeaux/personnelles/directeur refusées |
| Directeur | `directorCampaigns` | Distances et réception sans résultats de formulaires |
| Équipe | Affectation + participation explicite | Réponses propres ; commandes administratives refusées |
| Cadeaux | `giftOperators` par campagne | Clients affectés ; aucun héritage depuis une appartenance |
| Référent KPI | `kpiAssignments` + affectation | Agrégats seulement, sans administration des périodes |
| TV/kiosque | `kioskCampaigns` | Lecture collective, pas de retour au sélecteur avec cette session |

Ce tableau décrit le socle codé et testé sur les comptes fictifs. Il ne vaut pas recette de mise en service des utilisateurs réels. L’authentification client réelle, le provisioning des affectations et les sessions persistantes restent à livrer/valider avant préproduction ; aucune interface d’auto-attribution n’est ajoutée. Les autres profils historiques de démonstration ne constituent pas une politique d’accès de production.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, barèmes, acquis, calculs de réception, projection collective métier, services de collecte/gestion KPI, règles Firestore, main, production et staging.
- **Modifié** : `src/server/firebase-http.mjs`, `src/server/workspaces.mjs`, `src/web/demo-client.ts`, `src/web/collective.ts`, `src/web/kpi.ts`, `src/web/workspaces.ts`, `scripts/demo-collective.mjs` (nom fictif), `web/connexion.html`, `web/espaces.html`, `web/director.css`, `tests/firebase-browser/kpi.spec.mjs`, `tests/visual/public-build.test.mjs`, `.github/workflows/firebase-emulators.yml`.
- **Nouveau** : `src/server/kiosk-progress.mjs`, `web/kiosque.html` (rendu collectif partagé), `tests/firebase/limited-modes.test.mjs`, `tests/firebase-browser/limited-modes.spec.mjs`, ce rapport et quatre captures.

## Vérifications réelles

- `npm run typecheck`, `npm run build:web` : réussis.
- `node --test tests/visual/public-build.test.mjs` : 1/1 réussi.
- Émulateurs Auth/Firestore, `demo-rc-voyage`, Java 21 :
  `node --test tests/firebase/limited-modes.test.mjs tests/firebase/workspaces.test.mjs tests/firebase/four-workspaces.test.mjs` : **3/3 réussis**.
  Transmission KPI réellement enregistrée, payload de campagne inchangé, routes interdites, injection de tenant refusée, retraits KPI/kiosque, ancien cookie invalidé, absence d’affectation équipe compatible avec le kiosque, expiration, mauvaise identité/tenant et payload étranger refusés.
- Playwright desktop 1440×900 et mobile 390×844 :
  `four-workspaces.spec.mjs` : **2/2 réussis** lors de la première recette.
  Après corrections : `limited-modes.spec.mjs kpi.spec.mjs kpi-periods.spec.mjs` : **6/6 réussis**. Soit **8 scénarios distincts réussis**.
  Vérification du formulaire, correction d’un agrégat, période gelée, absence de droits hérités, minibus unique, paramètres URL sans effet sur le verrouillage, puis horloge navigateur avancée de 60 secondes : l’actualisation automatique rencontre un refus et masque la carte.
- Première recette navigateur : quatre échecs. Deux provenaient d’un mauvais identifiant de test du minibus (`collective-bus` au lieu de l’identifiant existant `collective-car`). Deux révélaient l’ancienne confirmation KPI encore visible pendant l’écriture suivante, permettant au test de recharger trop tôt ; état d’envoi corrigé dans l’interface, puis recette réussie.
- Chromium headless 141 local, configuration temporaire supprimée avant commit. La CI conserve le navigateur verrouillé du dépôt.
- `git diff --check` : réussi. Résultat final des quatre workflows du nouveau commit suivi dans la PR, sans anticipation dans ce fichier.

Captures inspectées : [KPI ordinateur](evidence/v5-r1e-kpi-desktop.png), [KPI mobile](evidence/v5-r1e-kpi-mobile.png), [kiosque ordinateur](evidence/v5-r1e-kiosk-desktop.png), [kiosque mobile](evidence/v5-r1e-kiosk-mobile.png). Données fictives uniquement. Carte, logo et repères hérités ne sont pas annoncés conformes aux adaptations R2/R4 encore à venir.

## Suite et déploiement

Le socle des quatre espaces et de leurs deux modes ciblés est désormais raccordé et recetté sur émulateurs. Prochaine tranche fonctionnelle : **R2, repères kilométriques calculés selon Dmax**, indépendants des semaines et des cadeaux. Les réserves d’authentification/provisioning réels restent suivies avant préproduction.

Aucun nouveau déploiement ni URL de test publiée. Le staging antérieur n’a pas été revalidé. La dernière tranche du projet n’est pas atteinte ; le porteur sera prévenu avant le passage au déploiement test.
