# V5 R1D — quatre espaces et droits indépendants

28 octobre 2026. Branche `work/v2-phase1-engine`, PR #1. Reprise du HEAD `9c213592ab33b22cddc4b15fca393698ec05031d`, confirmé identique sur GitHub avec quatre workflows réussis. Aucun merge, migration ou déploiement.

## Livré

Le sélecteur R1C ouvre maintenant les quatre espaces : organisation des campagnes, entreprise/directeur, équipe et cockpit cadeaux. Un nouveau compte fictif explicitement habilité permet de tester les quatre rôles dans une entreprise isolée. Aucun rôle des comptes existants n’est ajouté ou modifié.

**Équipe.** L’entrée exige un membre actif, l’UID et le tenant correspondants, une affectation campagne/équipe et `participationEnabled:true` explicite. La présence de l’équipe et l’identité de la campagne sont vérifiées dans la transaction. Une référence de répertoire seule ne donne pas accès à une équipe étrangère. Les appels autorisés couvrent la carte équipe, le collectif, les réponses et absences personnelles, les préférences personnelles, le vote et la révélation des attentions. Les routes d’administration, clôture du vote, ouverture/clôture/report des semaines, simulation, KPI et cadeaux opérationnels restent fermées dans cet espace, même pour un compte cumulant les autres rôles. Les réponses équipe retirent les commandes d’administration et les leaders réservés à la gestion du vote.

**Cadeaux.** Le cockpit conserve sa portée multi-client existante, limitée à `giftOperators/{uid}`. Son entrée est globale : elle n’affiche pas une campagne sélectionnée qui contredirait cette portée. Son schéma refuse les champs de tenant/campagne dans l’entrée de répertoire. Le catalogue privé et les opérations restent autorisés par leurs services existants. Les lectures/écritures ciblant un client revérifient le grant de ce client ; une appartenance à l’entreprise n’accorde pas ce grant et son retrait ne dépend pas de l’appartenance. Les accès équipe, formulaires personnels, directeur, organisateur et KPI sont refusés dans la session cadeaux.

La session conserve explicitement le rôle sélectionné et son périmètre. La rotation cookie/CSRF et la protection contre les changements concurrents de R1C restent actives. Retirer la participation ou le grant cadeaux ferme les appels suivants et fait disparaître l’entrée concernée. Les autres espaces réellement autorisés restent sélectionnables.

Le lien « Changer d’espace » est disponible sur les écrans raccordés. Les sessions sélectionnées disposent d’une navigation haute sur ordinateur et fixe en bas sur mobile ; cette adaptation est limitée à ces sessions. Le sélecteur précise que le cockpit réunit toutes ses campagnes autorisées.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, barèmes, acquis, projections directeur, services métier cadeaux/préférences/questionnaire/vote, règles Firestore, coûts et contrats existants, main et production. Les anciens profils de démonstration conservent leurs parcours.
- **Modifié** : `src/server/workspaces.mjs`, `src/server/firebase-http.mjs`, `src/web/workspaces.ts`, `src/web/demo-client.ts`, `scripts/demo-collective.mjs` (nom fictif), `web/connexion.html`, `web/espaces.html`, `web/styles.css`.
- **Nouveau** : `tests/firebase/four-workspaces.test.mjs`, `tests/firebase-browser/four-workspaces.spec.mjs`, ce rapport et quatre captures.

L’initialisation des comptes fictifs a été corrigée : si deux serveurs de test créent le même UID en parallèle, le second relit le compte créé et vérifie UID/email. Il ne remplace ni mot de passe ni identité. Une identité inattendue est refusée. Cette course a été observée au premier lancement parallèle des tests, puis résolue ; elle n’est pas masquée par une sérialisation artificielle des tests.

## Vérifications réelles

- `npm run typecheck` : réussi.
- `npm run build:web` : réussi.
- `node --test tests/visual/public-build.test.mjs` : 1/1 réussi.
- Auth et Firestore locaux, projet `demo-rc-voyage`, Java 21 :
  `node --test tests/firebase/four-workspaces.test.mjs tests/firebase/workspaces.test.mjs` : 2/2 réussis, également après ajout d’un véritable enregistrement de suivi cadeau.
  Couverture : les quatre rôles dans un même compte ; réponse personnelle ; vote et préférences ; commandes admin refusées ; lecture et écriture cadeaux autorisées ; autre client refusé ; indépendance participation/grant ; retraits des accès ; référence d’équipe étrangère ; entrée cadeaux mal formée ; anciens cookie/CSRF ; sélection concurrente et refus d’un répertoire retargeté.
- Playwright desktop 1440×900 / mobile 390×844 :
  `four-workspaces.spec.mjs workspaces.spec.mjs` : 4/4 réussis.
  Puis `four-workspaces.spec.mjs gift-operations.spec.mjs gift-preferences.spec.mjs` : 6/6 réussis, dont les parcours cadeaux/préférences historiques. Soit **8 scénarios distincts** réussis, le nouveau parcours quatre espaces ayant été rejoué.
  Un vrai formulaire cadeau est ouvert, puis le rôle est changé dans un autre onglet ; son POST d’enregistrement reçoit HTTP 403. Le parcours antérieur de brouillon annuel A→B reste réussi.
- Configuration locale temporaire pour Chromium headless 141 disponible ; supprimée avant commit. La CI utilise le navigateur verrouillé du dépôt.
- `git diff --check` : réussi.

Captures inspectées : [sélecteur ordinateur](evidence/v5-r1d-four-spaces-desktop.png), [sélecteur mobile](evidence/v5-r1d-four-spaces-mobile.png), [cockpit ordinateur](evidence/v5-r1d-gifts-desktop.png), [cockpit mobile](evidence/v5-r1d-gifts-mobile.png). Données exclusivement fictives. Kiosque : non modifié et non recetté ici, aucune capture nouvelle revendiquée.

La CI du nouveau commit est suivie dans la PR ; son état final est rapporté après publication du commit.

## Limites et suite

R1 reste partielle : les quatre espaces sont raccordés, mais les sous-modes KPI et TV/kiosque ne sont pas encore des sessions limitées dans le nouveau sélecteur. Le kiosque existant est un mode de présentation ; il ne doit pas être présenté comme une nouvelle barrière d’autorisation. Le provisioning réel des affectations n’est pas livré : aucun écran d’auto-attribution, aucune identité client réelle ajoutée. Les comptes restent fictifs et les sessions en mémoire. Les choix de cadeaux et le profil unique V5 restent à adapter dans les tranches prévues. L’identité graphique héritée n’est pas annoncée comme conforme au vrai logo attendu en R4.

Prochaine tranche : sous-modes limités et clôture de la vérification des droits R1, puis R2 bornes kilométriques. Aucune nouvelle URL déployée ; le staging existant n’a été ni modifié ni revalidé. Le jalon de dernière tranche avant déploiement test n’est pas atteint.
