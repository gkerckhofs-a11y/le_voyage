# V5 R8E — Coûts privés de réception

29 octobre 2026. Branche `work/v2-phase1-engine`, PR #1. Parent vérifié : `84489fce35d61e2303129c4ebd1d99bdd2ff6165`, quatre CI réussies. Le commit contenant ce rapport identifie la tranche ; le HEAD final et les résultats CI sont consignés dans la PR.

## Livraison

Clem peut enregistrer un relevé manuel des coûts prévisionnels, engagés et réels d’une réception. Ces montants sont trois états distincts, non additionnés. Un montant inconnu reste `null`, différent de zéro. Les entiers en centimes évitent les approximations dans le stockage ; plafond technique d’un million d’euros par montant, sans valeur commerciale présumée.

Chaque relevé conserve base HT/TTC, date, référence professionnelle, motif, auteur, horodatage et révision. La base est conservée après le premier relevé, sans conversion fiscale implicite. Une date future est refusée selon le jour de campagne. La fiche opérationnelle doit déjà exister.

Le registre des coûts possède sa propre révision et son historique, sous `receptionOperations/main/costs/current/history`. Il n’écrase pas la fiche logistique. Les corrections restent possibles après clôture du bilan, sans rouvrir la réception. Les vingt derniers relevés sont affichés ; les précédents restent conservés.

Révision concurrente, réutilisation différente d’un UUID et changement de base sont refusés. La reprise d’une requête identique n’écrit pas de seconde version. Les grants tenant/campagne sont relus dans la transaction avant lecture, écriture ou reprise.

| Statut | Fichiers / comportement |
|---|---|
| Modifié | `src/server/reception-operations.mjs` : validation, relevé transactionnel, historique privé dans le détail |
| Modifié | `src/server/firebase-http.mjs` : route POST `/api/gifts/receptions/costs`, limitée à l’espace cadeaux et protégée CSRF |
| Modifié | `src/web/receptions.ts`, `web/receptions.html` : formulaire séparé, historique, relecture après réponse perdue, effacement sur refus |
| Modifié | `tests/firebase/reception-operations.test.mjs` : deux scénarios de coûts ajoutés aux trois scénarios logistiques |
| Modifié | `tests/firebase-browser/receptions.spec.mjs` : sélecteurs limités au formulaire logistique, désormais voisin du formulaire coûts |
| Nouveau | `tests/firebase-browser/reception-costs.spec.mjs`, deux captures et ce rapport |
| Inchangé | Moteur, gel, niveau acquis, budgets client, coûts cadeaux, Master, droits attribués, règles Firebase, cartes et kiosque |

## Vérifications réelles

- `npm run typecheck` : réussi.
- `npm run build:web` : réussi.
- `node --test tests/visual/public-build.test.mjs` : **1/1**.
- `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore 'node --test tests/firebase/reception-operations.test.mjs && npx playwright test --config playwright.local-check.config.mjs tests/firebase-browser/reception-costs.spec.mjs tests/firebase-browser/receptions.spec.mjs'` : serveur **5/5** ; nouveaux parcours coûts **2/2** ; anciens parcours logistiques en échec sur sélecteurs ambigus `reason`/`confirmed` après ajout du second formulaire.
- Après correction des sélecteurs et ajout d’un contrôle de projection directeur : même commande émulateurs avec uniquement `npx playwright test --config playwright.local-check.config.mjs tests/firebase-browser/reception-costs.spec.mjs tests/firebase-browser/receptions.spec.mjs` : **4/4**.

**10 cas distincts réussis au total** : cinq serveur, quatre navigateur et un build public. Scénarios de coûts : centimes exacts, inconnu/zéro, historique et correction après clôture, fiche/campagne inchangées, limites, preuve obligatoire, date future, concurrence, accès interentreprises et révocation avant reprise. Navigateur : réponse perdue puis relecture, base verrouillée, données effacées après 403, autres espaces refusés et projection directeur sans les champs de coûts.

Java 21, Chromium Headless Shell 141 local, émulateurs Auth/Firestore `demo-rc-voyage`, données fictives. Configuration Playwright temporaire supprimée. Aucune suite géante lancée manuellement ; les workflows existants de la PR assurent la validation intégrée.

## Captures vérifiées

- [Desktop](evidence/v5-r8e-costs-desktop.png)
- [Mobile](evidence/v5-r8e-costs-mobile.png)

Pas de débordement horizontal constaté. Kiosque inchangé, aucune nouvelle capture kiosque ; les captures historiques R8D sont conservées.

## Limites et prochaine tranche

Relevé déclaratif, sans facturation, paiement, pièces jointes ou contrôle automatique des justificatifs. Pas de marge déduite, de total mélangeant cadeaux et réception, ni de modification ou publication du budget client. La base HT/TTC n’est pas modifiable par ce formulaire après le premier relevé ; une procédure de rectification de base reste à définir si nécessaire. Les plafonds et la rétention restent à valider avant pilote réel.

Suite R8 : exceptions opérationnelles de réception et publication contrôlée des informations destinées au directeur, puis R9 recette/pilote. Cette tranche n’est pas la dernière. Aucun merge main, déploiement, migration production ou service payant. Aucun serveur de test distant mis à jour ou revalidé.
