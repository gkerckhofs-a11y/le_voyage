# Phase 21 — Scénario d’essai pour un nouveau pilote

Le gestionnaire d’une saison peut préparer les quatre Conseils d’un pilote de seize semaines avec le bouton « Charger le scénario d’essai (4 Conseils) ». Le chargement affiche un aperçu ; une confirmation distincte enregistre les quatre brouillons ensemble. Chaque Conseil reste modifiable et doit être publié manuellement dans sa fenêtre habituelle.

## Contenus proposés

1. Bibliothèque ou hôpital : choix entre deux petits projets.
2. Construire une caserne : oui / non, petit projet.
3. Préserver le cadre de vie : oui / non, jardin de quartier, petit projet.
4. Ouvrir de nouveaux ateliers : oui / non, projet standard.

Ces textes, effets et catégories sont des propositions pour le test humain. Ils ne constituent ni un arbitrage définitif ni une garantie d’équilibrage. Les prix proviennent des règles du moteur (51 écus par famille pour un petit projet, 81 pour un standard). Les dates et identifiants proviennent des semaines 4, 8, 12 et 16 configurées dans la saison. L’hôpital et la caserne utilisent les protections existantes du moteur ; le scénario ne choisit aucun événement.

## Conditions et effets

Le bouton est réservé aux saisons marquées comme pilotes de quatre Conseils, comportant exactement seize semaines, sans Conseil ouvert ni brouillon enregistré, avant la clôture du premier tour du premier Conseil. L’autorisation de gestion de la saison, l’espace sélectionné et la protection CSRF restent obligatoires.

L’aperçu ne modifie aucun enregistrement. La confirmation réutilise l’import atomique existant : les définitions, révisions, périmètre et coûts sont liés à une empreinte vérifiée côté serveur. Une modification concurrente provoque un conflit sans écrasement partiel. Les quatre brouillons ne changent ni les ressources, ni les votes, ni les bâtiments, ni les crises ou récompenses. Aucun compte ou membre n’est créé.

## Vérification

Les tests ciblés couvrent les coûts pour 1, 2, 5 et 10 familles, les quatre créneaux, l’absence d’écriture à l’aperçu, l’enregistrement des seuls brouillons, leur modification individuelle, les conflits et les refus d’accès. Un test HTTP Auth/Firestore vérifie le parcours sur une saison réellement créée par le service de préparation. Le parcours navigateur vérifie l’aperçu, la confirmation, la persistance et l’édition du quatrième Conseil sur ordinateur et mobile.

Aucun déploiement Firebase. Les invitations, transferts en cours de saison, saisons annuelles, publications automatiques et arbitrages du cahier des charges restent hors de cette tranche.

Résultat local : TypeScript et construction web réussis ; contrôle de la projection publique réussi ; 150 tests Cité, 24 intégrations HTTP Auth/Firestore et 2 parcours navigateur (ordinateur/mobile) réussis. Aperçu mobile inspecté visuellement, sans débordement horizontal. Ces résultats locaux ne préjugent pas de la nouvelle exécution CI.
