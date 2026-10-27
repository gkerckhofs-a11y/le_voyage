# Le Voyage — Rouge Clémence

Tranche du 27 octobre 2026 : inspection de l'existant et moteur métier V2 indépendant de l'interface.
Les données Lex EKHO sont exclusivement fictives. Ce dépôt ne contient pas encore de produit connecté ou déployable en production.

## Démarrer les vérifications

Node.js 24 ou ultérieur. Aucun service distant n'est nécessaire aux tests.

```sh
npm ci --ignore-scripts
npm run typecheck
npm run test:engine
npm test
npm run simulate
```

Le moteur TypeScript est exécuté directement par Node 24. Les seules dépendances sont des outils de développement verrouillés dans `package-lock.json`.

## Organisation

- `src/domain/exact.ts` : calcul exact, sans nombres flottants dans les distances enregistrées.
- `src/domain/scoring.ts` : cinq scores, participation, confidentialité des petits groupes, KPI, régularité optionnelle et seuils.
- `src/domain/calendar.ts` : semaines, fermetures et dates civiles Europe/Brussels.
- `src/domain/engine.ts` : transitions pures de campagne, report, clôture, joker, convoi, droits cadeaux/tâches et gel de réception.
- `src/domain/transaction-memory.ts` : adaptateur de test pour commandes concurrentes ; aucune persistance de production.
- `tests/` : cas métier, cas limites, concurrence simulée et simulation reproductible.
- `scripts/simulate.mjs` : pilote fictif de 12 semaines sur trois clients.
- `prototypes/lexekho-v1/` : copie inchangée de la maquette existante, conservée comme référence, pas une interface V2.
- `docs/PHASE-0.md` : inventaire constaté, delta et architecture proposée.
- `docs/PHASE-1.md` : exigences couvertes, preuves, paramètres et limites.

## Garde-fous de reprise

Continuer sur la branche de travail. Ne pas modifier ni fusionner `main` et ne pas déployer en production sans autorisation explicite. Le workflow n'effectue que des vérifications ; il ne contient aucun secret ni étape Firebase.

Le raccordement Firebase devra utiliser une transaction serveur durable et des règles multi-tenant. La logique TypeScript ou un contrôle de tenant dans une fonction pure ne constitue pas un contrôle d'accès suffisant. Ne pas envoyer de réponses individuelles dans le bundle client ou l'écran collectif.

## Démonstration V3 avec progression et révélations

```sh
npm run build:web
npm run dev
```

Ouvrir `http://localhost:4173`. « Simuler une semaine » fait avancer une campagne entièrement fictive ; « Le collectif » reprend la même simulation. Les autres scénarios du sélecteur collectif restent des exemples indépendants. Les cadeaux futurs restent dans le serveur, hors de `dist-web`.

Le serveur local Node conserve l'état dans `.demo-state/`, hors Git et hors des ressources servies. Le cookie de démonstration expire après 24 heures ; les fichiers restent jusqu'au nettoyage manuel de ce dossier de données fictives. Ne pas partager ce dossier, exposer ce serveur sur Internet ou y introduire des données réelles. L'adaptateur ne prend en charge qu'un processus Node et refuse `NODE_ENV=production` ; il ne remplace pas Firebase Auth et les transactions Firestore.

Recette ciblée : `npm run test:events` et `npm run test:visual` après le build ; `npm run test:browser` en CI. Voir [V3-C](docs/V3-C.md), [V3-B](docs/V3-B.md) et [V3-A](docs/V3-A.md) pour les exigences, preuves et limites.

## Mode Firebase local isolé

Avec Java 21 et Node 24 : `npm run build:web`, puis `npm run dev:firebase`. Ouvrir `http://localhost:4173` : la page de connexion propose des comptes **fictifs**. Les boutons ne sont pas une authentification destinée à de vrais salariés. Auth et Firestore tournent sur émulateurs, projet fictif `demo-rc-voyage` ; aucune connexion au projet Cloud réel n'est autorisée par l'adaptateur. Les campagnes sont partagées par compte fictif pendant cette exécution. L'arrêt des émulateurs sans export perd leurs données ; les sessions serveur ne survivent pas à un redémarrage.

`npm run test:firebase:web` exécute les tests HTTP/intégration puis les parcours navigateur desktop/mobile sur émulateurs. Il requiert Chromium Playwright installé (la CI s'en charge). La démonstration locale initiale reste disponible avec `npm run dev`.

### Invitations contrôlées V3-D4

Sur `/connexion.html`, choisir « Administration fictive », créer une invitation puis ouvrir le lien de Camille. Se connecter avec ce compte fictif, choisir un nom affiché et accepter pour accéder à son équipe. Le lien est personnel, valable 24 heures par défaut et révocable avant acceptation. Aucun courriel n’est envoyé ; les identités sont précréées uniquement dans Auth Emulator. Voir [V3-D4](docs/V3-D4.md) pour les garanties et limites.

### Vote de l’équipe V3-D5

En mode Firebase, ouvrir « Choix de l’équipe » depuis le voyage, ou `/equipe.html`. Un membre valide un nom et une couleur ; le compte Administration fictive clôture le scrutin depuis le lien de sa page. En cas d’égalité, il choisit parmi les candidats en tête et motive la décision. Le résultat est appliqué à la voiture sans changer la distance. Voir [V3-D5](docs/V3-D5.md).

### Préférences cadeaux V3-D6

En mode Firebase, ouvrir « Mes goûts » depuis le voyage ou `/preferences.html`. Choisir jusqu’à trois catégories, exclure l’alcool ou demander une surprise ; l’anniversaire jour/mois reste facultatif. Les choix sont modifiables et propres au compte connecté. Après un problème réseau ou une modification concurrente, recharger la version enregistrée avant de sauvegarder. Aucun message de contact ni cadeau n’est déclenché par ce formulaire. Voir [V3-D6](docs/V3-D6.md).

### Questionnaire privé V3-D7

En mode Firebase, l’administration fictive ouvre la semaine depuis `/semaine.html`. Les membres déjà affectés répondent via « Ma semaine » ou déclarent leur absence sans motif. L’ouverture bloque la simulation synthétique de toute la campagne ; la clôture des réponses vers le moteur sera ajoutée séparément. Ce scénario est à essayer après les simulations de progression. Voir [V3-D7](docs/V3-D7.md).
