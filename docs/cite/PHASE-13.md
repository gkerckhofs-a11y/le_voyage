# Phase 13 — Import transactionnel des brouillons de Conseils

4 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14. Référence : V1.0. Les arbitrages P0 restent ouverts.

## Résultat

L'administrateur peut télécharger une trame JSON des créneaux restants (brouillons existants inclus), charger un fichier ou coller son contenu, demander un aperçu serveur, puis confirmer l'enregistrement du lot. Le format est `{ "councils": [{ "definition": <définition de Conseil sans coût>, "revision": 0 }] }`. La trame utilise les identifiants, semaines et dates du calendrier configuré. Ses champs narratifs vides sont à compléter ; les lignes inutilisées doivent être retirées. Un lot contient de 1 à 13 créneaux futurs, sans doublon, dans une limite de 256 Kio sur chaque requête HTTP.

L'aperçu affiche les titres, types, dates, projets, prix recalculés, effets, protections/réparations et récits. Il ne modifie rien. Une empreinte canonique lie la confirmation aux définitions relues, aux révisions attendues, aux prix calculés, à l'entreprise/saison et à la liste des Conseils ouverts. Une modification du texte JSON désactive la confirmation jusqu'à nouvel aperçu. Des modifications non enregistrées du formulaire individuel bloquent les contrôles d'import.

La confirmation revérifie les droits et toutes les entrées dans la transaction privée existante. Un Conseil invalide ou une modification concurrente incompatible annule le lot entier. Les relances identiques ne multiplient ni révisions ni audit. Les dates et coûts passent par la même validation que les brouillons individuels, y compris l'interdiction des alternatives strictement dominantes comparables. Une entrée publiée ne peut pas être importée ou remplacée.

Le moteur permet maintenant de valider un créneau futur sans l'ouvrir, sans simuler des événements et sans créer de bulletin. Les brouillons importés restent privés ; seul le prochain Conseil est éditable et publiable par le formulaire existant. L'ouverture exige toujours la résolution du Conseil précédent et sa propre fenêtre de vote. Le calendrier synthétique montre les brouillons sauvegardés et leur révision. Aucun crédit, débit, cadeau, construction ou crise n'est provoqué par un import.

## Fichiers et vérification

- `src/cite/councils.ts` : validation pure d'une définition pour un ordinal futur explicite.
- `src/server/cite-council-planning.mjs` : trames de créneaux et calendrier privé.
- `src/server/cite-council-import.mjs` : validation de lot, empreinte canonique, préparation des révisions.
- `src/server/cite-admin.mjs`, `cite-admin-http.mjs` : aperçu et confirmation authentifiés, CSRF, transaction et audit.
- `web/assets/cite/planning.js`, `admin.js`, `web/cite-admin.css` : téléchargement, chargement, aperçu, confirmation et calendrier.
- Six nouveaux tests ciblés : saison de treize Conseils, confidentialité, prix serveur, concurrence, idempotence, annulation atomique, empreinte, publié immuable, droits et corps HTTP bornés.
- Une intégration Auth/Firestore et un parcours navigateur ordinateur/mobile couvrent le lot de quatre Conseils.

Vérification locale : 109 tests Cité réussis, 12 intégrations HTTP Auth/Firestore réussies, TypeScript, compilation web et liste publique stricte réussis. Les six parcours planning sur ordinateur/mobile ont réussi : cinq au premier passage, puis le parcours publication sur ordinateur relancé seul avec succès après une reconstruction locale du dossier servi pendant le premier passage. Les deux nouveaux parcours d’import ont réussi dès le premier passage. La CI du commit publié reste à vérifier séparément.

## Limites

Pas d'import Google Sheets pour les Conseils, de clonage automatique entre saisons ni de corrections des Conseils publiés. L'import ne vérifie pas les branches narratives futures par simulation et ne garantit pas que la réparation prévue sera disponible à son ouverture : le contrôle définitif reste celui de la publication. Le calendrier utilise les dates civiles existantes ; pas de planification automatique. Les treize contenus narratifs définitifs et leur équilibrage restent à produire et tester.

Aucun déploiement ni donnée client, achat ou règle Firebase modifié. La réconciliation des sources GitHub/version Voyage historiquement publiée reste requise avant publication.
