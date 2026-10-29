# V5 R8D — Suivi privé des réceptions

29 octobre 2026. Branche `work/v2-phase1-engine`, PR #1. Parent vérifié : `db889591ce2521740da76c540d38cb92989ff3d2`, quatre CI réussies. Le commit de ce rapport identifie la tranche ; HEAD et CI sont consignés dans la PR.

## Périmètre livré

Une fiche privée par campagne dans le cockpit Clem : responsable, date, lieu, effectif prévisionnel, prestataires/prestations, référence de réservation ou confirmation, contraintes et plan de secours, référence de réalisation/bilan. Les étapes sont : prévue → options réservées → niveau gelé → prestataires confirmés → préparation → réalisée → bilan clôturé.

| Statut | Fichiers / comportement |
|---|---|
| Nouveau | `src/server/reception-operations.mjs` : liste, détail, enregistrement transactionnel, transitions et audit |
| Nouveau | `src/web/receptions.ts`, `web/receptions.html` : sélection de campagne, fiche, confirmation manuelle, dernières modifications |
| Modifié | `src/server/gift-operations.mjs` : réemploi de l’authentification et des grants cadeaux existants |
| Modifié | `src/server/firebase-http.mjs` : GET `/api/gifts/receptions`, POST `/api/gifts/receptions/read` et `/save` |
| Modifié | `web/cockpit.html` : accès Réceptions ; `tests/visual/public-build.test.mjs` : allowlist du build |
| Nouveau | `tests/firebase/reception-operations.test.mjs`, `tests/firebase-browser/receptions.spec.mjs` et deux captures |
| Inchangé | Moteur, progression, gel, budgets directeur, coûts des cadeaux, Master, droits attribués, règles Firebase, carte et kiosque |

## Contrôles

- Grants cadeaux relus dans chaque transaction, portée tenant/campagne vérifiée contre le contenu de campagne ; aucun héritage de droits directeur, organisateur, employé ou référent KPI.
- Étapes adjacentes seulement, sans recul ; modifications motivées autorisées dans l’étape courante jusqu’au bilan clôturé. Après clôture : lecture seule, sans réouverture implicite.
- Options réservées : date, lieu, effectif positif, responsable, prestataires et référence obligatoires. Date après le dernier jour comptant pour le gel. Niveau gelé : gel du moteur déjà existant exigé ; niveau, distance et date conservés dans le suivi. Pas de déclenchement du gel depuis cette fiche.
- Prestataires confirmés : contraintes/plan de secours obligatoires. Réalisation : référence obligatoire et date de réception non future selon le jour de campagne. La confirmation humaine est exigée à chaque enregistrement.
- Révision concurrente refusée, UUID de mutation et empreinte liés à l’auteur, reprise durable d’une requête identique sans réécriture. UUID réutilisé avec contenu différent refusé.
- Stockage `tenants/{tenant}/campaigns/{campaign}/receptionOperations/main`, journal `history/{mutationId}` contenant auteur, date, motif et instantané. Les vingt derniers événements sont affichés ; l’historique plus ancien reste conservé.
- Réponse perdue : formulaire verrouillé jusqu’à relecture explicite. Accès retiré : fiche et historique effacés ; une sélection disparue n’élargit pas silencieusement la consultation.

## Vérifications exécutées

- `npm run typecheck` : réussi.
- `npm run build:web` : réussi.
- `node --test tests/visual/public-build.test.mjs` : **1/1**.
- `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore 'node --test tests/firebase/reception-operations.test.mjs && npx playwright test --config playwright.local-check.config.mjs tests/firebase-browser/receptions.spec.mjs'` : **3/3 serveur, 2/2 navigateur**.
- Après ajout du contrôle de date par rapport au gel : reprise serveur, même commande avec uniquement `node --test tests/firebase/reception-operations.test.mjs`, **3/3**.
- Après retrait des liens employés ajoutés par l’initialisation démo : un parcours mobile a rencontré deux navigations concurrentes dans le test (déconnexion puis `goto`). Ajout de l’attente explicite de la page de connexion ; reprise des deux parcours **2/2**.

**6 cas distincts**, avec plusieurs scénarios par test : pipeline complet, gel obligatoire et préservé, clôture irréversible, campagne inchangée, idempotence, validations, concurrence, dates, référence de réalisation, droits interentreprises/révocation, perte de réponse et effacement après 403. CI intégrée suivie dans la PR.

Java 21, Chromium Headless Shell 141 local, émulateurs `demo-rc-voyage`, données fictives. Configuration Playwright temporaire supprimée.

## Captures

- [Réception desktop](evidence/v5-r8d-reception-desktop.png)
- [Réception mobile](evidence/v5-r8d-reception-mobile.png)

Navigation limitée au cockpit, sans liens employés. Kiosque inchangé, aucune nouvelle capture de ce mode dans cette tranche.

## Limites et suite

Déclarations manuelles : pas d’envoi, réservation réelle ou contrôle de pièces justificatives. Les dates/prestations privées saisies ne remplacent pas automatiquement les données publiques de la carte. Coûts réels de réception, exceptions d’indisponibilité, annulation et publication contrôlée vers le directeur restent à traiter ; aucune dégradation automatique du niveau acquis.

Les références doivent rester professionnelles et sans données personnelles inutiles. Pas de comptabilité, de paiement, de liste nominative d’invités ni de modification des coûts cadeaux. Politique de rétention du journal à valider avant pilote réel.

Suite R8 : coûts et exceptions opérationnelles de réception, puis recette R9. Cette tranche n’est pas la dernière. Aucun déploiement, merge main, migration production ou service payant ; aucun serveur de test distant mis à jour ou revalidé. Le passage au déploiement test sera annoncé après la dernière tranche vérifiée.
