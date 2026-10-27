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
