# La Cité — tranche 1 : économie provisoire

## Portée livrée

Moteur pur `src/cite/economy.ts`, service transactionnel `src/server/cite-economy.mjs`, simulation économique locale et tests ciblés. Le service n’est enregistré dans aucune route HTTP : aucun nouvel accès public, aucune migration ni modification des campagnes historiques. Les anciens écrans et le serveur publié restent inchangés.

La simulation couvre 16 semaines pour 1, 2, 5 et 10 familles, avec quatre points de contrôle aux semaines 4, 8, 12 et 16. **Elle ne joue pas encore les quatre Conseils.** Votes, projets, dépenses, bâtiments, crises, ambitions et récompenses ne sont pas présentés comme réalisés.

## Règles et statut

| Statut | Traitement |
|---|---|
| VALIDÉ | Une bourse par famille ; calcul par moyenne, sans multiplication par l’effectif ; prix selon le potentiel et le nombre initial de familles ; isolation par entreprise/saison/famille |
| PROVISOIRE | Version `cite-economy-prototype-v1`, formule `arrondi(2 × P + 3 × V)` équivalente à `arrondi(5 × (0,40 P + 0,60 V))` ; arrondi demi-supérieur exact |
| PROVISOIRE | Critères normalisés de 1 à 5 et pondérations internes en points de base totalisant 10 000 ; barèmes gelés dans la configuration |
| PROVISOIRE | Prix petit/standard/grand : 51/81/111 écus par famille initiale, soit les coefficients 0,85/1,35/1,85 de 60 écus potentiels ; aucune entrée « revenu réel » dans le calcul des prix |
| CHOIX EXPLICITE | Politique de manque d’informations exigée dans la configuration : différer la clôture, ou attribuer cinq écus en signalant `basis: base-five` ; minimum de réponses valeurs également explicite |
| PROVISOIRE | Éligibilité figée à la date de début de semaine, sur affectations datées sans chevauchement ; arrivée pendant la semaine prise en compte au rendez-vous suivant |
| À ARBITRER | Conversion CA/taux d’atteinte en note ; quorum, absences, calendrier complet glissant, périodes partielles et corrections tardives ; aucun barème CA inventé |

Les données manquantes comprennent, dans cette version de prototype, l’absence de performance complète ou un nombre insuffisant de réponses valeurs. Une famille sans aucun membre éligible n’est pas créditée automatiquement. Une clôture différée n’est pas un crédit de zéro écu. La relance, la saisie tardive et les corrections auditées restent à développer ; aucun résultat clôturé n’est réécrit par ces commandes.

## Transactions et confidentialité

Le nouveau service accepte un jeton vérifié par Firebase Admin avec contrôle de révocation et relit l’affectation dans la transaction. Les anciens droits de campagne ne donnent aucun droit implicite à La Cité. Permissions nouvelles : `citeAssignments: [{seasonId, familyId}]` pour le membre ; `citeSeasonManagement: [seasonId]` pour la performance professionnelle et la clôture. Le collaborateur ne fournit jamais l’UID de la personne évaluée.

État privé du prototype prévu dans `tenants/{tenantId}/citeSeasons/{seasonId}/privateEconomy/main`. Aucune instance n’a été créée sur Firebase. Les lectures publiques familiales renvoient uniquement identité, solde, crédits propres et version des règles ; elles excluent réponses, notes P/V, roster et bourses étrangères. Les écritures conservent les autres métadonnées du document, ne réinitialisent pas l’état et refusent un instantané de plus de 800 000 octets.

Un crédit est identifié par famille et semaine, dans un document de saison distinct : un double clic ou deux transactions concurrentes ne produisent pas de double versement. Les réponses et performances identiques sont rejouables ; une valeur différente nécessite une future procédure de correction. Aucune transformation de bourse réelle, commande fournisseur ou promesse commerciale.

Limites explicites : tests transactionnels avec un adaptateur mémoire sérialisé, pas avec l’émulateur Firestore ; pas de route HTTP ni d’interface mobile La Cité ; pas encore d’audit persistant des accès refusés et consultations sensibles (R15 complet à traiter avant exposition). Un instantané privé est adapté au prototype, pas à la montée en charge : séparation par réponses individuelles à prévoir. L’absence d’affichage des notes ne garantit pas l’anonymat d’une famille d’une personne, où les gains peuvent permettre des déductions ; politique petites familles à préciser avant pilote RH.

## Vérification

```sh
npm run typecheck
node --test tests/cite/*.test.mjs
node scripts/simulate-cite-economy.mjs
npm run build:web
node --test tests/visual/public-build.test.mjs tests/access/access.test.mjs tests/master-sheets.test.mjs tests/catalog-import.test.mjs
```

Les tests portent sur formule et arrondis, tailles de familles, coûts fixes, identifiants et affectations invalides, fenêtres fermées, manque de données, idempotence, solde sans dépassement, absence de mutation des entrées, confidentialité des projections, droits explicites et double clôture. La simulation reproductible choisie rapporte 280 écus par famille après 16 semaines et ne prouve pas l’équilibrage des négociations futures.

Une CI ciblée `cite-economy.yml` est ajoutée ; son exécution distante doit être vérifiée séparément. Aucun test humain ni simulation de 52 semaines avec constructions/crises n’a été effectué : ils restent nécessaires avant gel de l’économie.

## Suite

Tranche 2 : vote interne confidentiel, une voix par famille, abstentions et deux tours, puis engagements révocables et clôture financière atomique. L’excédent de promesses devra avoir une politique provisoire explicite. Sanction au Conseil suivant seulement, exemption des familles insolvables et désactivation de la sanction en mode famille unique. Puis jauges/bâtiments/ambitions, crises, trois options de cadeaux plafonnées et scène jouable des quatre Conseils.
