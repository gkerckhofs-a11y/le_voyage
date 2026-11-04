# Phase 15 — Vue commune de la Cité

4 novembre 2026. Branche `work/la-cite-economy-tranche-1`, PR #14. Source : V1.0, §§ 7, 9.3, 10 et 12. Aucun arbitrage P0 supplémentaire.

## Parcours livré

Le lien « Vue commune » depuis les espaces famille et administration ouvre `/cite-city.html`, dans l'entreprise et la saison déjà sélectionnées. La page présente les cinq jauges, le développement global, le nombre de Conseils résolus, les bâtiments construits/endommagés et leurs protections, le dernier Conseil publié et l'historique des décisions/crises. Les réparations sont identifiées dans les projets publiés.

Le Conseil courant affiche ses projets, coûts, effets enregistrés, risque d'échec et fenêtres du vote/financement. Les résultats apparaissent uniquement après clôture du tour, sous forme de voix familiales de même poids, avec les noms des familles. Aucun résultat individuel ni bulletin en cours n'est affiché. Le financement est uniquement agrégé, sans bourses ou promesses nominatives. Après résolution, le récit de construction/abandon est affiché.

L'historique combine les résolutions et les crises déjà survenues, du plus récent au plus ancien. En cas de date identique, l'ordre de Conseil puis la séquence événement/résolution déterminent le tri. Les filtres « Conseils » et « Crises » ne changent que l'affichage. Les dégâts et protections sont ceux conservés par le moteur. Les effets sont les valeurs de règle enregistrées, les jauges affichées restant bornées 0–100 par le moteur.

La page ne possède aucun contrôle de jeu. L'actualisation est manuelle ; le bouton « Mon espace » revient à la famille ou à l'administration selon la session. Un bouton permet le plein écran lorsque le navigateur le prend en charge. L'interface est responsive et les jauges possèdent des libellés et valeurs textuelles. Les bâtiments sont représentés par des cartes d'état sobres, sans carte géographique ni classement.

## Accès et confidentialité

La vue est commune à l'entreprise, pas accessible anonymement sur Internet. GET `/api/cite/city` est réservé à une session sélectionnée `cite-member` ou `cite-admin`. Les droits existants sont revérifiés à chaque lecture, dans la transaction privée ; un collaborateur doit encore avoir une appartenance datée active à la famille sélectionnée. Un administrateur doit disposer de son autorisation de gestion de saison. Aucun droit ou compte n'est créé par la page. Les espaces cadeaux et historiques restent exclus.

La projection est construite explicitement : ni réponses personnelles, ni scores professionnels, ni objectifs familiaux secrets, ni bulletins/rosters, ni bourses, ni corrections administratives, ni brouillons, ni graine/plan des crises futures. La lecture n'écrit aucun document et ne déclenche ni crise, ni vote, ni récompense. La rotation de session existante empêche la réutilisation du cookie précédent lors d'un changement d'entreprise. Après un refus d'accès, les données affichées et le titre sont retirés au prochain accès serveur ; pas de canal temps réel.

## Fichiers

- `src/server/cite-dashboard.mjs` : service transactionnel de lecture, projection explicite, historique et contrôleur GET.
- `src/server/cite-store.mjs` : transmet la capacité de gestion déjà calculée, sans étendre les permissions existantes.
- `src/server/firebase-http.mjs` : branche la route dans les gardes de session existantes.
- `web/cite-city.html`, `.css`, `web/assets/cite/city.js` : vue commune, filtres, retour et plein écran ; rendu des contenus avec textContent.
- Pages famille/admin : lien vers la vue commune.
- Liste publique stricte : trois nouveaux fichiers de présentation explicitement autorisés.
- CI ciblée Cité : chemin de la nouvelle page ajouté.

## Vérification

Six tests ciblés couvrent la lecture sans mutation, les projections confidentielles, les voix familiales clôturées, l'historique, les appartenances datées et les restrictions HTTP. Deux intégrations Auth/Firestore couvrent lecture privée, absence d'écriture, rotation d'entreprise, rôles exclus, construction et révocation. Deux parcours navigateur, sur ordinateur/mobile, couvrent navigation, cinq jauges, construction, filtres, retour, confidentialité et retrait d'accès ; le plein écran est vérifié sur ordinateur.

Vérifications locales : 121 tests Cité, 16 intégrations HTTP Auth/Firestore, TypeScript, compilation web et liste publique stricte réussis. Les quatre parcours navigateur ordinateur/mobile ont réussi : les deux parcours membres au premier passage, puis les deux parcours administrateurs après correction du libellé accessible du filtre. Le plein écran est vérifié sur ordinateur et la capture mobile de la nouvelle vue a été inspectée. Les quatre workflows du précédent `019fe41` sont réussis ; la CI du nouveau commit reste à vérifier.

## Limites

Pas de lien anonyme ni de session kiosque dédiée, pas de nouveau rôle de direction en lecture seule, pas de rendu illustré complexe et pas d'actualisation automatique. L'historique porte sur la saison sélectionnée ; les archives intersaisons restent à développer. La création d'entreprises/saisons/affectations, l'ordonnancement, la logistique, les contenus finaux et le pilote humain restent à traiter.

Aucun déploiement, donnée client, achat ou règle Firebase modifié. La réconciliation GitHub/version Voyage historiquement publiée reste obligatoire avant publication.
