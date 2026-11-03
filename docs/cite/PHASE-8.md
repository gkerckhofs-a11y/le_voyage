# Phase 8 — Préférences personnelles authentifiées

Date : 3 novembre 2026. Référence : cahier V1.0, §§ 8.5, 9 et 12. Cette tranche permet à un collaborateur autorisé de renseigner ses propres préférences et relie leur mise à jour aux vérifications du Cockpit. Aucun déploiement n'est effectué. La CI du précédent commit `6676303` a été vérifiée : ses quatre workflows sont réussis.

## Fichiers et résultat

| Fichier | Rôle |
|---|---|
| `src/server/cite-preferences.mjs` | Lecture et écriture personnelles transactionnelles, avec révision attendue |
| `src/server/cite-member-http.mjs` | Route authentifiée `/api/cite/preferences`, bornée à l'espace sélectionné |
| `src/server/workspaces.mjs`, `firebase-http.mjs`, `src/web/workspaces.ts` | Espace `cite-member`, destination et restriction des routes |
| `web/cite-preferences.html`, `web/cite-preferences.css`, `web/assets/cite/preferences.js` | Formulaire « Mes choix » et retrait de l'affichage après perte d'accès |
| `src/server/cite-gift-preparation.mjs`, `prototypes/la-cite/gift-preparation.js` et les deux écrans de préparation | Indicateur de préférences devenues différentes, message et verrouillage de la revue/réservation périmée |
| `src/server/cite-cockpit-demo.mjs` | Compte collaborateur fictif, sans capacité logistique, sur les deux entreprises de test |
| Tests Cité, HTTP émulateur, navigateur et liste publique | Isolation personnelle, concurrence et parcours de bout en bout |

Le nouveau service réutilise directement `normalizeGiftPreferences` du module historique. Les préférences restent stockées au même emplacement : `tenants/{tenantId}/giftPreferences/{uid}`. Elles sont communes aux saisons de cette entreprise, comme dans le modèle hérité ; elles ne sont pas partagées entre entreprises. Le module historique n'est pas réécrit.

## Choix proposés et confidentialité

Les champs hérités sont conservés : trois catégories maximum parmi thés/infusions, chocolat, épicerie fine, vin et bière ; souhait de surprise ; choix sans alcool ; jour et mois d'anniversaire facultatifs ; demande de contact privé. Surprise et catégories précises ne se cumulent pas. Le choix sans alcool exclut vin et bière. Les validations serveur existantes font autorité.

La présence de catégories alcoolisées dans le profil ne change pas la restriction actuelle du flux de préparation, qui continue de refuser les références alcoolisées. Cette tranche ne tranche pas ce point pour l'offre commerciale future.

Le formulaire ne collecte ni année de naissance, ni coordonnées supplémentaires, ni note de santé libre. La demande de contact privé ne demande pas de justification textuelle. Les préférences ne déclenchent ni cadeau, ni commande et ne changent aucun revenu, vote, budget ou droit à récompense.

L'anniversaire est renvoyé seulement au propriétaire du profil dans cette route. Le Cockpit conserve sa projection limitée : catégories, indicateurs de choix et demande de contact, sans anniversaire ni empreinte privée. Le nouvel indicateur `preferencesCurrent` expose seulement si la proposition correspond encore aux préférences enregistrées.

## Accès et concurrence

L'espace serveur est de type `cite-member`, associé à une entreprise, une saison et une famille. Le répertoire ne donne aucun droit à lui seul : l'acteur doit avoir une adhésion active, une affectation `citeAssignments` correspondante et figurer dans la configuration de membres de cette famille. Les dates de vote et l'éligibilité aux revenus ne sont pas modifiées ; l'accès au profil personnel n'est pas une participation au jeu.

L'identifiant du propriétaire provient du token Firebase vérifié. La route ne reçoit aucun UID ni périmètre à choisir. Un opérateur logistique seul ne peut pas lire ou modifier ce profil personnel. Le collaborateur n'accède pas au Cockpit, aux données d'une autre personne ou aux routes historiques depuis cet espace.

Chaque écriture relit l'adhésion et le document dans la transaction. Deux valeurs différentes enregistrées à partir d'une même révision ne s'écrasent pas : une seule est acceptée. Un retry portant sur la même valeur ne crée pas une nouvelle entrée d'historique. Un numéro de révision futur est refusé. Les comparaisons sont canoniques pour respecter la relecture des maps Firestore. L'historique minimal de révisions/date reste borné à vingt entrées, selon le format existant.

La sélection d'un autre espace fait tourner cookie et CSRF comme auparavant. Les tests vérifient le refus d'un ancien cookie et d'un formulaire périmé après changement d'entreprise. Le retrait de l'affectation provoque un refus serveur ; le formulaire et ses valeurs sont retirés de la page après réponse d'accès refusé.

## Conséquences dans le Cockpit

Si les préférences changent après la préparation, le Cockpit affiche une demande de réexamen. La vérification et une nouvelle réservation sont désactivées jusqu'à mise à jour de la proposition. L'opérateur rouvre si nécessaire, enregistre un devis lié aux préférences courantes puis vérifie à nouveau. Une demande de contact privé exige toujours la confirmation humaine déjà prévue.

Une réservation active n'est pas libérée automatiquement par un changement de préférences. Elle reste inscrite au registre partagé et bloque la modification de composition ; l'opérateur doit d'abord la libérer explicitement. Aucun engagement d'une autre attention n'est touché.

## Démonstration et tests

Le serveur d'émulation de la phase 7 fournit maintenant un compte collaborateur fictif : `cite-camille@example.test`, mot de passe `Fictitious-Camille-Only-42!`. Ces identifiants publics sont valables uniquement sur les émulateurs autorisés. Le compte peut ouvrir « Mes choix · La Cité » pour les deux entreprises fictives, sans accès logistique. Les fixtures restent distinctes des comptes et données client.

76 tests Cité, TypeScript, compilation web et test de liste publique vérifiés localement. Cinq nouveaux tests ciblés couvrent l'identité, les droits, le roster, les révisions, la confidentialité, l'absence de libération automatique et le contrôleur HTTP. Deux parcours HTTP sur émulateur complètent la suite : persistance partagée, isolation, composition périmée, anciens cookies/CSRF et révocation.

Six parcours navigateur personnels sont ajoutés (trois scénarios sur ordinateur/mobile) : saisie/rechargement et séparation d'entreprises, nouvelle revue dans le Cockpit après changement de choix, et retrait de l'accès. Ils complètent les quatre parcours authentifiés du Cockpit et les quinze du prototype. Le résultat CI du commit publié doit être vérifié avant de les déclarer réussis. Les captures restent dans `cite-authenticated-cockpit-evidence`.

Trois nouveaux fichiers publics sont explicitement ajoutés à la liste autorisée du build. Le contrôle d'absence de données privées est conservé. La CI dédiée exécute également les tests historiques de préférences pour vérifier le format réutilisé.

## Limites et suite

Les services et le parcours restent limités aux adaptateurs de test, sans publication. La gestion des affectations/invitations Cité n'a pas encore d'interface d'administration ; les fixtures la préparent seulement pour les tests. Les routes du jeu familial (rituel, votes, bourse et cité), le paramétrage des plans, l'import catalogue dans ce nouvel espace, la suite logistique, les archives et le pilote humain restent à traiter. Les points commerciaux P0 restent ouverts.

Aucune donnée client réelle, règle Firebase ou production n'est modifiée. La divergence entre sources GitHub historiques et version Voyage réellement déployée reste à réconcilier avant publication.
