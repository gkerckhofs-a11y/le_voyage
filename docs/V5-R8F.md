# V5 R8F — Publication des informations pratiques de réception

29 octobre 2026. Branche `work/v2-phase1-engine`, PR #1. Parent vérifié : `42715c39ae1dafc3280c386c2ce835343d9003e7`, quatre CI réussies. Le commit contenant ce rapport identifie la tranche ; HEAD final et résultats CI sont consignés dans la PR.

## Livraison

Clem peut publier ou retirer explicitement les informations pratiques de la fiche enregistrée : date, lieu, effectif prévu et état simplifié (en préparation, prestataires confirmés, réalisée). Un aperçu précède la validation motivée. Les champs non enregistrés du formulaire logistique ne sont pas publiés.

Le directeur les consulte dans « Votre réception en pratique ». Le serveur retourne uniquement ces quatre informations et la date de publication. Les prestataires, contacts internes, références, motifs, coûts, préférences et formulaires ne sont pas inclus. Les dates de publication sont affichées en français avec le fuseau Europe/Brussels.

Une modification de la fiche opérationnelle rend la publication obsolète : elle est masquée dès la prochaine lecture serveur, jusqu’à une nouvelle publication. Les relevés de coûts indépendants ne modifient pas cette version logistique. Le retrait masque les informations sans changer le niveau de réception garanti ou acquis. La carte collective et le kiosque ne reçoivent pas ces informations.

La révision de la publication et celle de sa fiche source sont contrôlées dans la transaction. La publication exige une fiche ayant dépassé l’étape « prévue », avec date, lieu et effectif positif. Grants tenant/campagne relus avant l’action ou la reprise idempotente. UUID lié à l’auteur, au motif et aux deux révisions ; concurrence et source périmée refusées. Historique conservé sous `receptionOperations/main/publication/current/history`, avec auteur, motif et instantané. Une ancienne requête rejouée ne réactive pas une publication devenue obsolète.

| Statut | Fichiers / comportement |
|---|---|
| Nouveau | `src/server/reception-publication.mjs` : projection minimale partagée, refus des publications retirées, périmées ou hors portée |
| Modifié | `src/server/reception-operations.mjs` : publication/retrait transactionnels, état de publication dans la lecture privée |
| Modifié | `src/server/firebase-http.mjs` : route POST `/api/gifts/receptions/publish`, espace cadeaux et CSRF |
| Modifié | `src/server/director-progress.mjs` : lecture de la publication et de la révision source sous les droits directeur existants |
| Modifié | `src/web/receptions.ts`, `web/receptions.html` : aperçu et confirmation explicite ; état effacé lors du rechargement/refus |
| Modifié | `src/web/director.ts`, `web/entreprise.html` : informations pratiques, effacement avant chaque lecture |
| Modifié | `tests/firebase/reception-operations.test.mjs`, `tests/firebase/director-progress.test.mjs` |
| Nouveau | `tests/firebase-browser/reception-publication.spec.mjs`, quatre captures et ce rapport |
| Inchangé | Moteur, seuils, gel, budgets client, coûts internes, Master, permissions attribuées, règles Firebase, carte et kiosque |

## Vérifications exécutées

- `npm run typecheck` : réussi.
- `npm run build:web` : réussi.
- `node --test tests/visual/public-build.test.mjs` : **1/1**.
- `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore 'node --test tests/firebase/reception-operations.test.mjs tests/firebase/director-progress.test.mjs && npx playwright test --config playwright.local-check.config.mjs tests/firebase-browser/reception-publication.spec.mjs'` : **12/12 serveur, 2/2 navigateur**.
- Après présentation des dates en français et correction du message sans relevé de coûts : typecheck/build puis reprise des deux parcours navigateur : **2/2**.

**15 cas distincts** au total. Contrôles spécifiques : absence avant publication, projection exacte des champs, masquage après changement, reprise sans réactivation, retrait et historique, source périmée, validations, concurrence et révocation. Parcours Clem → directeur sur desktop/mobile, réponse perdue suivie d’une relecture, refus de la mutation au directeur, absence des marqueurs privés dans son interface et effacement après 403.

Émulateurs Auth/Firestore `demo-rc-voyage`, données fictives, Java 21 et Chromium Headless Shell 141 local. Configuration Playwright temporaire supprimée avant commit. CI intégrée suivie dans la PR.

## Captures

- [Clem desktop](evidence/v5-r8f-clem-desktop.png)
- [Clem mobile](evidence/v5-r8f-clem-mobile.png)
- [Directeur desktop](evidence/v5-r8f-director-desktop.png)
- [Directeur mobile](evidence/v5-r8f-director-mobile.png)

Kiosque inchangé, aucune nouvelle capture de ce mode.

## Limites et suite

Aucun envoi d’e-mail ni notification externe. Le directeur voit la version serveur lors de son ouverture ou de son actualisation ; un écran déjà ouvert ne se vide pas à distance sans nouvelle lecture. Le champ lieu est revu humainement avant publication : aucun filtre sémantique ne peut garantir qu’un texte libre ne contient pas une note privée. Les détails des formules restent ceux du contrat et du niveau acquis ; aucun nouveau contenu commercial n’est inventé.

Suite : exceptions opérationnelles de réception, puis R9 recette/pilote et traitement des blocages de préproduction déjà documentés. Cette tranche n’est pas la dernière. Aucun déploiement, merge main, migration production ou service payant. Aucun serveur de test distant mis à jour ou revalidé.
