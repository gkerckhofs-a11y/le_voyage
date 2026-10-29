# V5 R8B — Publication du budget client

29 octobre 2026. Branche `work/v2-phase1-engine`, PR #1. Parent vérifié : `6df6cb540da9fe998001a7a771c36b49e5289748`, quatre CI réussies. Le commit portant ce rapport identifie la tranche ; son HEAD et ses résultats CI sont consignés dans la PR.

L’organisateur peut publier une situation budgétaire client datée et référencée. Le directeur lit alloué, engagé, consommé et restant, avec base HT/TTC et numéro de révision. Ces valeurs sont déclarées manuellement après vérification externe ; elles ne proviennent ni des coûts fournisseurs, ni du brouillon annuel, ni d’une commande anticipée. Ce flux ne signe pas un contrat et n’active pas de campagne.

## Changements

| Statut | Fichiers / comportement |
|---|---|
| Nouveau | `src/server/client-budget.mjs` : lecture/publication transactionnelle, validation exacte, audit et reprise idempotente |
| Nouveau | `src/web/client-budget.ts`, `src/web/client-budget-view.ts`, `web/budget-client.html` : saisie, aperçu, confirmation explicite et lecture partagée |
| Modifié | `src/server/firebase-http.mjs` : GET `/api/client-budget`, POST `/api/client-budget/publish`, routes organisateur |
| Modifié | `src/server/director-progress.mjs`, `src/web/director.ts`, `web/entreprise.html` : projection budgétaire client strictement sélectionnée |
| Modifié | `src/web/organizer.ts`, `web/director.css` : lien et présentation responsive, navigation sans doublon |
| Nouveau / modifié | `tests/firebase/client-budget.test.mjs`, `tests/firebase-browser/client-budget.spec.mjs`, `tests/visual/public-build.test.mjs` |
| Inchangé | Moteur, paliers, droits cadeaux, coûts Clem, Master, brouillons annuels, règles Firebase, permissions attribuées, kiosque |

## Règles et stockage

- Publication réservée à un membre actif ayant l’affectation de campagne/équipe, `organizerCampaigns` et `canPlanCampaign`. Relecture des droits dans la transaction ; contrôle du rôle actif à la frontière HTTP. Directeur en lecture seule, sans héritage des droits cadeaux.
- Montants entiers en centimes, chacun entre 0 et 100 000 000 (borne technique, pas commerciale). **Consommé ≤ engagé ≤ alloué**. L’engagé inclut le consommé ; restant = alloué − engagé. Aucune déduction de paiement ou de remboursement.
- Référence visible, date civile valide, base fiscale commune obligatoire, motif interne et confirmation explicite. Une nouvelle publication remplace la situation affichée ; les anciennes versions ne sont pas modifiées. La date décrit la situation déclarée, sans synchronisation comptable automatique.
- Stockage par tenant/campagne : `clientBudgets/current`, sous-collection `publications/{mutationId}`. Instantané, auteur, date serveur, motif et empreinte de la requête conservés atomiquement. Révision concurrente refusée ; même UUID avec autre contenu/auteur refusé ; reprise d’une ancienne requête sans écraser la version courante.
- API directeur : uniquement montants client, référence, date, base, devise, provenance et révision. Aucun auteur, motif interne, coût d’achat, marge, préférence ou résultat de formulaire.
- Réponse perdue : formulaire bloqué jusqu’à relecture. Lecture refusée : champs, aperçu et situation précédente effacés. Les textes sont rendus via `textContent`.

## Tests exécutés

- `npm run typecheck` : réussi.
- `npm run build:web` : réussi, réexécuté après les ajustements d’interface.
- `node --test tests/visual/public-build.test.mjs` : **1/1**.
- `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore 'node --test tests/firebase/client-budget.test.mjs tests/firebase/director-progress.test.mjs tests/firebase/organizer-dashboard.test.mjs && npx playwright test --config playwright.local-check.config.mjs tests/firebase-browser/client-budget.spec.mjs tests/firebase-browser/director.spec.mjs tests/firebase-browser/organizer.spec.mjs'` : **9/9 serveur et 6/6 navigateur**.
- Renforcement du parcours budget avec perte de réponse et refus de relecture : une assertion `toBeDisabled()` sur un `fieldset` a échoué malgré l’attribut disabled présent. Remplacée par la vérification explicite de sa propriété DOM ; reprise **2/2**.
- Dernière reprise des deux parcours budget après suppression du doublon de navigation et régénération des captures : **2/2** (même commande d’émulateurs, script Playwright limité à `tests/firebase-browser/client-budget.spec.mjs`).

**16 cas ciblés distincts**, plus les reprises des mêmes parcours. Tests : concurrence, idempotence durable, référence privée exclue, données de brouillon non publiées, campagne inchangée, montants incohérents/fractionnaires/trop élevés, date invalide, confirmation absente, droits retirés, autre tenant/campagne/équipe, identité falsifiée, CSRF, lecture directeur, réponse réseau perdue et données effacées après 403.

Java 21 et Chromium Headless Shell 141 locaux ; configuration Playwright temporaire supprimée. CI intégrée et dépendances verrouillées suivies dans la PR. Démonstration fictive uniquement.

## Captures

- [Organisateur desktop](evidence/v5-r8b-organizer-desktop.png)
- [Organisateur mobile](evidence/v5-r8b-organizer-mobile.png)
- [Directeur desktop](evidence/v5-r8b-director-desktop.png)
- [Directeur mobile](evidence/v5-r8b-director-mobile.png)

Kiosque inchangé, aucune capture nouvelle de ce mode. La barre mobile est fixe au bas du viewport, ce qui la place au milieu d’une capture pleine page.

## Limites et prochaine tranche

Le montant contractuel doit être vérifié par l’organisateur : aucune pièce justificative ou signature électronique n’est contrôlée par ce flux. Pas de ventilation par cadeau, comptabilité, import de factures ou consultation UI de l’historique des publications. Références destinées au directeur à choisir sans donnée privée. Les versions sont conservées, mais leur politique de rétention reste à valider avant pilote réel.

R8 reste partielle. Prochaine tranche : raccordement du parcours collectif à l’espace directeur, puis suivi opérationnel de la réception. L’acceptation contractuelle complète et l’activation réelle des campagnes restent distinctes de cette publication budgétaire.

Aucun déploiement, merge main, migration de production ou service payant. Aucun serveur de test distant mis à jour ou revalidé. R8B n’est pas la dernière tranche ; le passage au déploiement test sera annoncé après la dernière tranche vérifiée.
