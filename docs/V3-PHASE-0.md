# Reprise V3 — phase 0 et premier incrément proposé

Relevé du 27 octobre 2026. Cette tranche est une inspection et une proposition de réalisation ; aucune interface V3 n'est déclarée développée.

## Sources lues et état de référence

- CDC V3.0 fourni, `RC_Le_Voyage_Cahier_des_Charges_Astra_V3(1).md`, lu intégralement, sections 0–14 et sources. SHA-256 : `88c9ef9bc48865927b6b161fa180250b3caeaa4724a007b93dc03cf19167de21`. Les sections 8 et 10 priment pour le rendu et la livraison.
- Dossier Clem V2 fourni, `RC_Le_Voyage_Dossier_Clem_Argumentaire_V2(2).docx`, texte lu pour le ton et le fonctionnement ; il ne remplace pas le CDC technique.
- Trois moodboards fournis : référence de chaleur, textures, terroir et voitures. Leurs cadeaux futurs, marques/modèles, villes, panoramas frontaux et flottes ne sont pas des exigences à reproduire.
- Dépôt réellement lu : [gkerckhofs-a11y/le_voyage](https://github.com/gkerckhofs-a11y/le_voyage).
- Branche conservée : `work/v2-phase1-engine` ; HEAD de départ `0e8b717b792622d6ed935d3a92b6130ba33bf48d`, identique localement et sur GitHub. Répertoire de travail propre avant cette note.
- `main` reste à `cfb76c7cbd09b99418fc8abf833cca76b918ba93`. Aucun retour arrière ni fusion.
- [PR #1](https://github.com/gkerckhofs-a11y/le_voyage/pull/1) ouverte, en brouillon, non fusionnée.
- [Dernière CI au HEAD inspecté](https://github.com/gkerckhofs-a11y/le_voyage/actions/runs/40498195264), terminée le 27 octobre 2026 à 11:43 UTC : succès. Le job `engine` confirme installation, vérification TypeScript, tests et comparaison de la simulation.

Correction du précédent relevé : cette CI s'est bien exécutée après le commit documentaire `0e8b717`. Le filtre du workflow `pull_request` porte sur les fichiers de la PR, qui contient toujours le moteur. L'exclusion des documents ne garantit donc pas l'absence de relance. Ne pas confondre ce résultat distant observé avec un test relancé dans cette tranche.

## Socle réellement réutilisable

| Zone | Constat | Décision V3 |
|---|---|---|
| `src/domain/` | TypeScript pur : arithmétique exacte, calendrier, scores, transitions, gel, adaptateur mémoire | Conserver les calculs et leurs tests |
| `tests/`, `scripts/simulate.mjs` | 29 tests au checkpoint précédent ; simulation déterministe de trois clients fictifs sur 12 semaines | Réutiliser comme référence métier ; ne pas remplacer par une animation autonome |
| `prototypes/lexekho-v1/` | HTML/CSS/JS sans framework ; six PNG ; SVG de 48 cases ; état `localStorage` mensuel | Garder comme archive et source de composants, pas comme application V3 |
| Navigation, dialogue, statut, focus, responsive | Déjà présents dans la maquette | Adapter ces éléments à la nouvelle surface |
| Route et voiture V3 | Aucun composant présent | Ajouter un module de géométrie et un rendu SVG réutilisables |
| Application web actuelle | Aucun framework, bundler, routeur, serveur ou SDK Firebase dans `package.json` | Ne pas introduire une migration React/Next ni supposer un serveur existant |
| Configuration Firebase du dépôt | Aucun `firebase.json`, `.firebaserc`, fichier Rules ou indexes versionné | Préparer une configuration locale au moment du raccordement ; le fichier temporaire d'inspection hors dépôt n'est pas une configuration applicative |

Le contenu de `src/domain`, `tests`, `scripts/simulate.mjs`, des dépendances et de `tsconfig.json` est identique au commit métier `753d281336f0856fb21974dfef9785268865d5aa` (`git diff --quiet` réussi). Cette phase ne modifie aucun calcul.

## Firebase : lectures actuelles, aucune mutation

| Élément | Résultat constaté |
|---|---|
| Projet | `le-voyage-f0ae3`, `ACTIVE` |
| Application web | `levoyage`, `1:885366322482:web:5ac461410494735993d32b`, `ACTIVE` |
| Firestore | `(default)`, Standard, mode natif, `europe-west1`, suppression protégée |
| Hosting | Un canal `live`, aucune release attachée retournée ; aucun canal de preview retourné |
| URL Hosting | `https://le-voyage-f0ae3.web.app` : HTTP 404, titre `Site Not Found` |
| Firebase Rules | Liste des releases vide |
| Firebase Auth | API activée, mais lecture de configuration HTTP 404 `CONFIGURATION_NOT_FOUND` |
| Services | APIs Hosting, Firestore, Firebase Rules, Identity Toolkit et Storage activées ; Cloud Functions, Cloud Run et Firebase App Hosting absents de la liste des APIs activées |
| Staging | Aucun environnement applicatif isolé constaté dans ce dépôt et les canaux de ce site |

L'activation d'une API n'atteste ni l'existence d'un bucket ni la configuration de fournisseurs de connexion. Aucun compte utilisateur, document métier ou contenu de bucket n'a été lu pour cet inventaire. La base vide et le refus des lectures anonymes ont été vérifiés dans la tranche précédente ; ces contrôles ne sont pas présentés comme une validation multi-tenant.

La maquette historique hébergée sur Sites n'est pas une release Firebase. La phrase du prompt indiquant que l'application est déployée sur Firebase n'est pas confirmée par l'état actuel de ce site Hosting. Aucun service payant activé, aucune écriture Firestore, aucun déploiement dans cette tranche.

## Delta bloquant avec la V3

| Exigence V3 | État actuel | Travail nécessaire |
|---|---|---|
| Longue route top-down, au moins quatre paysages | Petit SVG de cases entièrement visible | Chemin versionné, courbes, décor réutilisable, caméra |
| 58 bornes neutres | 48 cases dont certaines annoncent des cadeaux | Marqueurs indépendants du calendrier et des récompenses |
| Voiture vintage unique, tangente de route | Pion avec lettre, position discrétisée par case | Position par longueur parcourue, rotation, une instance par vue |
| Aucune information sur les cadeaux futurs | Tableau `gifts` dans `app.js`, noms, seuils et compteurs dans le DOM et les dialogues | Ne pas embarquer ce tableau ni les plans privés dans la nouvelle application |
| Données limitées à l'équipe autorisée | `publicProgress()` renvoie un tableau de toutes les équipes | Projection dédiée avant tout accès client ; aucun filtrage seulement dans le DOM |
| Collectif : réception unique et véhicule commun | Ancien projet collectif à cases à cocher | Vue dédiée avec niveaux, statuts et gel issus du moteur |
| Révélation unique même après rafraîchissement | Droits idempotents en mémoire ; aucun accusé de présentation persistant | Projection des droits acquis et état de présentation séparé, puis persistance serveur |
| Isolation tenant/rôle | Pas de backend ni d'authentification applicative | Tests et contrôles serveur avant branchement à une base réelle |
| Navigation, tactile, kiosque | Pas de pan/zoom/caméra de route | Contrôles, gestes, clavier et recentrage à tester |

`publicProgress()` n'est pas actuellement exposée par une API : son seul appel constaté est un test. Le risque est celui d'un futur raccordement sans projection adaptée, pas une fuite réseau déjà démontrée. Son nom ne suffit pas à en faire un contrat public V3 sûr.

## Incrément visuel proposé : V3-A, route et vue équipe isolée

Choix proposé après inspection : **SVG pour le chemin et les éléments de paysage, HTML/CSS pour les commandes et panneaux, modules TypeScript séparés du domaine**. La maquette utilise déjà du SVG et du DOM, sans framework à préserver. Le SVG permet de garder le tracé, les repères et l'orientation dans le même repère ; un passage au Canvas ne serait motivé que par une mesure de performance ultérieure.

1. Carte fictive versionnée, de dimensions initiales proposées `4800 × 2600` unités, avec une route continue faite de S, épingles et longues courbes. Quatre ensembles raccordés : bocage/verger, vallée/rivière et pont de pierre, forêt, collines et petites falaises. Dimensions et densité à ajuster sur captures, sans les présenter comme validées.
2. Géométrie indépendante du moteur : `ratio = clamp(km / Dmax, 0, 1)` puis abscisse curviligne et tangente. Conversion numérique uniquement à la frontière du rendu ; les kilomètres métier restent exacts. Les 58 bornes sont placées indépendamment des semaines et ne reçoivent aucun champ cadeau.
3. Une voiture vintage générique, colorée, identifiable, sans reprise automatique d'un modèle de constructeur. Une seule instance `team-car`. Ni flotte décorative ni voitures concurrentes dans les cartes secondaires.
4. Caméra initiale sur la voiture et la route suivante ; déplacement libre, zoom borné, bouton « Retrouver ma voiture », clavier, tactile et variante sans mouvement. Les commandes restent accessibles pendant l'exploration ; aucun second véhicule n'est créé pour indiquer la position hors champ.
5. Vue de démonstration « Lex EKHO — données fictives » avec panneau compact semaine/km. Sur téléphone, réserver la place du futur accès aux trois questions ; ne pas présenter un questionnaire absent comme fonctionnel.
6. Contrat de données à liste de champs autorisés : identité de l'équipe consultée, personnalisation, kilomètres exacts, maximum théorique, semaine, version de carte et attentions déjà révélées. Aucun tableau des autres équipes, seuil cadeau, budget, réponse individuelle ou préférence d'autrui.

La première démonstration utilise des fixtures déjà filtrées. Le navigateur ne charge ni le moteur complet avec sa configuration privée, ni les jeux de tests, ni les documents du dépôt. Un répertoire de sortie dédié doit permettre de vérifier les ressources réellement servies. **Masquer une icône tout en livrant les seuils dans JavaScript ne satisfait pas la V3.**

Modules à ajouter ou toucher dans cet incrément, chemins proposés et non encore créés :

| Fichiers / zone | Rôle |
|---|---|
| `src/map/geometry.ts`, `src/map/routes/` | Tracé versionné, longueur, position, tangente, 58 repères |
| `src/web/journey-map.ts`, `src/web/camera.ts`, `web/` | Rendu SVG, voiture, paysage, panneau et interactions |
| `src/presentation/journey-view.ts` | Projection sûre indépendante du rendu ; préparation du contrat serveur |
| `tests/map-geometry.test.mjs`, tests de projection, tests navigateur | Géométrie, absence de données interdites, navigation et captures |
| `package.json`, configuration de compilation web, CI visuelle dédiée | Construction reproductible et vérifications ciblées, sans déploiement |

`src/domain/` et l'archive `prototypes/lexekho-v1/` restent inchangés pour V3-A. Les classes de dialogue, statut, navigation et focus peuvent servir de référence, sans importer la logique mensuelle ni ses données cadeaux.

## Recette prévue de V3-A

- Positions à 0 %, 50 % et 100 % de la **longueur** du chemin, plusieurs points dans chaque virage, tangentes finies et voiture centrée sur la route ; ne pas assimiler 50 % à la moitié des points de contrôle.
- Exactement 58 bornes neutres ; route plus vaste que le viewport initial et au moins quatre zones visuellement distinctes.
- Un seul `team-car`, aucune autre équipe dans les données, le DOM et l'arbre d'accessibilité ; aucun cadeau futur dans les ressources livrées.
- Pan, zoom, recentrage, clavier, toucher et `prefers-reduced-motion` ; mêmes kilomètres sur toutes les tailles.
- Captures de la vue équipe à 1920×1080, 1440×900 et 390×844 ; vérification des panneaux repliés, contrastes, lisibilité et absence de CTA masqué.
- Tests ciblés géométrie/projection, vérification TypeScript et tests navigateur. Ne relancer les invariants métier que si une dépendance change ou au jalon d'intégration.

Ces tests et captures sont **prévus**, pas exécutés dans la phase 0. Le navigateur de bureau ne remplace pas une mesure sur téléphone ordinaire pour la performance.

## Incréments suivants, sans reprendre la phase 0

- **V3-B — collectif/kiosque :** réutiliser route et caméra, un `collective-car`, escales festives configurables, base garantie, niveaux atteints/prochain/non atteints/gelés, aucune donnée interne. Capture 16:9 et test post-gel. La géométrie couvre la capacité du convoi sur toute la campagne ; le maximum avant gel sert aux seuils de réception et ne doit pas tronquer le trajet après gel.
- **V3-C — événements :** connecter la démonstration aux sorties du moteur sur plusieurs semaines simulées, révélation des droits réellement acquis, rafraîchissement sans réanimation, report/joker/fermeture et gel sans doublon. Garder les plans cadeaux côté serveur ou dans le générateur de fixtures non servi.
- **V3-D — raccordement isolé :** adaptateur transactionnel et contrôles tenant/rôle sur émulateurs ; seulement ensuite staging réellement isolé. Les écrans d'invitation, questionnaire, préférences et cockpit gardent leurs tâches distinctes ; une belle carte ne les rend pas opérationnels.

## Vérifications effectuées dans cette phase

- Lecture GitHub des branches, de la PR, des exécutions CI et des étapes du dernier job : succès.
- `git fetch origin`, vérification HEAD distant/local et état du répertoire : effectués ; poursuivre depuis le HEAD réel si une mise à jour apparaît.
- `git diff --quiet 753d281336f0856fb21974dfef9785268865d5aa HEAD -- src/domain tests scripts/simulate.mjs package.json package-lock.json tsconfig.json` : succès, moteur et référence de tests inchangés.
- Lectures Firebase projet, application web, base, canaux, Rules et services activés : succès ; configuration Auth et accès HTTP Hosting : 404 décrits ci-dessus.
- Validation de forme : `git diff --check` réussi après ajout en intention de suivi. La comparaison initiale `git diff --no-index --check /dev/null docs/V3-PHASE-0.md` retournait 1 avec sortie vide (fichier nouveau), sans erreur de blanc signalée.
- Aucun test métier local relancé, aucun test UI V3 exécuté et aucune capture d'interface V3 produite. La dernière CI observée porte sur le HEAD de départ ; le nouveau commit documentaire doit être suivi séparément.

## Limites et décisions encore ouvertes

Les paramètres ludiques et les politiques non arbitrées de `PHASE-1.md` restent ouverts : régularité, KPI absent/inversé, équipe entièrement absente, petits groupes et précision du gel. La phase visuelle ne les tranche pas. Le style final de la voiture, la densité du décor, les contrôles mobiles et le mode simplifié devront être évalués sur la première démo. Les droits et la provenance des actifs doivent être documentés avant publication. Aucune garantie de conformité RGPD n'est attachée au choix Firestore ou à une projection filtrée.

Pas de refactoring cosmétique, modification de `main`, migration de données, déploiement Firebase ou activation payante pendant cette reprise.
