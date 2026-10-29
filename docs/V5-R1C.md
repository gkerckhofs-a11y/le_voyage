# V5 R1C — choix d’espace et de campagne

28 octobre 2026. Reprise du HEAD réel `467ee48a0d632573dddfc4a42d8de5a1d142eb00` sur `work/v2-phase1-engine`, identique au HEAD distant de la PR #1. Les quatre CI de ce checkpoint sont confirmées réussies. Aucun retour arrière, merge ou déploiement.

## Incrément livré

Le compte fictif « Plusieurs espaces » possède explicitement les rôles organisateur et directeur dans deux entreprises fictives distinctes. `/espaces.html` présente uniquement les affectations encore autorisées. Le compte choisit une campagne et un espace ; un lien permet de revenir à cette sélection depuis les vues concernées. Ordinateur : navigation haute ; mobile : barre basse et cartes sur une colonne.

Le répertoire serveur `workspaceDirectories/{uid}` contient des références d’affectations, pas des permissions. Il est lu avec l’UID vérifié, impose activité, identité, identifiants bornés, rôles reconnus, libellés bornés, identifiants de sélection uniques et maximum 20 entrées. Chaque entrée est recoupée avec le service directeur ou organisateur existant. Une simple entrée vers un autre client ne donne aucun accès. Une erreur technique de lecture n’est pas transformée silencieusement en absence de droit.

`GET /api/workspaces` projette seulement identifiant de choix, rôle et libellé. `POST /api/workspaces/select` n’accepte que cet identifiant, avec contrôle CSRF et origine existants. Le navigateur ne fixe ni UID, ni tenant, ni campagne. Après sélection, le serveur remplace le cookie et le jeton CSRF, invalide l’ancienne session et conserve l’échéance initiale. Deux sélections concurrentes d’une même session ne peuvent pas aboutir toutes deux. Les requêtes déjà en cours conservent leur ancien objet de session et ne sont pas déplacées vers le nouveau client.

Avant les appels dans l’espace sélectionné, le serveur relit le répertoire et les droits réels. Un retrait de rôle ou un répertoire désactivé bloque le prochain accès. Retargeter une entrée ne déplace pas une session ouverte : une nouvelle sélection est nécessaire. Une révocation d’un espace n’empêche pas de choisir une autre affectation encore valable. Le rôle actif ferme les autres routes même si le compte possède aussi cet autre rôle ; le directeur ne peut donc pas appeler le tableau de bord organisateur avec sa session directeur.

Le formulaire invitations conserve désormais son jeton d’ouverture au lieu d’en récupérer un à chaque création. Le scénario navigateur vérifie qu’un brouillon annuel ouvert pour A ne peut pas être enregistré dans B après changement dans un autre onglet. Les données du brouillon de B restent inchangées.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur et acquis, barèmes, règles Firestore, services métier d’organisation/directeur/invitation, budgets et contrats, catalogue, production et main. Aucun compte existant promu.
- **Modifié** : `src/server/firebase-http.mjs` (fixtures isolées, sélection, remplacement des sessions et fermeture des routes), `src/web/demo-client.ts` (navigation), `src/web/invitation-admin.ts` (jeton conservé), `src/web/login.ts`, `scripts/demo-collective.mjs` (noms de deux entreprises fictives), `web/connexion.html`, `web/organisateur.html`, `web/director.css`, `tests/visual/public-build.test.mjs`, `.github/workflows/firebase-emulators.yml` (déclenchement sur le nouveau service).
- **Nouveau** : `src/server/workspaces.mjs`, `src/web/workspaces.ts`, `web/espaces.html`, `tests/firebase/workspaces.test.mjs`, `tests/firebase-browser/workspaces.spec.mjs`, ce compte rendu et deux captures.

## Vérifications réelles

- `npm run typecheck` : réussi.
- `npm run build:web` : réussi.
- `node --test tests/visual/public-build.test.mjs` : 1/1 réussi ; liste publique explicite actualisée, aucun code serveur exposé.
- Émulateurs Auth/Firestore, projet `demo-rc-voyage`, Java 21 :
  `node --test tests/firebase/workspaces.test.mjs tests/firebase/organizer-dashboard.test.mjs tests/firebase/director-progress.test.mjs` : 5/5 réussis. Sélection, rôles cumulés mais espace actif limité, révocation, faux client, mauvais CSRF, ancien cookie, ancien formulaire, répertoire retargeté/désactivé et concurrence.
- Playwright, desktop 1440×900 et mobile 390×844 : `organizer.spec.mjs` : 2/2 réussis ; puis `workspaces.spec.mjs invitation.spec.mjs director.spec.mjs` : 6/6 réussis.
- Première exécution du nouveau parcours navigateur : 2 échecs, car le formulaire du test était incomplet et le navigateur empêchait l’envoi. Dates et options obligatoires renseignées ; le scénario effectue ensuite réellement le POST et constate HTTP 403. L’inspection visuelle a aussi conduit à passer les cartes mobiles sur une colonne.
- Exécution locale avec une configuration temporaire sélectionnant Chromium headless 141 déjà disponible ; configuration supprimée ensuite. La CI utilise le navigateur verrouillé du dépôt.
- Captures inspectées : [ordinateur](evidence/v5-r1c-workspaces-desktop.png), [mobile](evidence/v5-r1c-workspaces-mobile.png). Kiosque : inchangé et non recetté dans cet incrément ; aucune nouvelle capture annoncée.
- La CI du nouveau commit est suivie dans la PR #1 ; son résultat est rapporté après publication du commit, sans l’anticiper ici.

## Limites et prochaine tranche

R1 reste partielle. La sélection couvre organisateur/directeur ; les espaces équipe et cadeaux conservent leurs accès séparés existants. Pas d’interface de provisioning ou d’auto-attribution. Les affectations sont préparées explicitement côté serveur et la démonstration utilise deux entreprises, chacune avec une campagne. Pas encore de recette de plusieurs campagnes dans une même entreprise. Les sessions restent en mémoire et les profils fictifs ; pas de nouvelle authentification client réelle. Le logo actuel hérité n’est pas présenté comme le vrai logo demandé pour R4.

Aucune nouvelle URL de test déployée. La seule exécution de cette tranche est locale sur émulateurs. Le staging documenté lors de R0 n’a pas été modifié ni revalidé. Suite : compléter R1 avec les affectations équipe/cadeaux et leurs sous-modes limités, avant R2. Le porteur sera prévenu lorsque la dernière tranche aura été vérifiée, avant le passage au déploiement test ; ce jalon n’est pas atteint.
