# Phase 24 — Correction du retour Google sur la prévisualisation

Le propriétaire signale un accès refusé après son retour de Google. Les journaux du service de test montrent des chargements de la page et de sa configuration mais aucune requête vers `/test-access/session` sur la période inspectée. Le compte est actif et vérifié ; son droit de gestion, son annuaire et le périmètre du pilote existent et sont cohérents. Cela localise le blocage observé avant l’échange de session, sans prouver à lui seul une cause unique dans le navigateur du propriétaire.

Le client utilise désormais `signInWithPopup`, puis transmet directement le jeton Firebase au même échange serveur protégé par CSRF. Il ne dépend plus de la lecture de `getRedirectResult` après un aller-retour entre le domaine du canal et le domaine d’authentification. Le serveur continue de vérifier le fournisseur Google, le compte autorisé, la fraîcheur du jeton et les droits de l’espace. Aucune permission ni règle n’est élargie.

Le SDK est déconnecté après chaque tentative d’échange ; un refus serveur ou une destination inattendue empêche la navigation. Une fenêtre bloquée affiche une instruction explicite et permet de réessayer. Le jeton n’est jamais affiché dans le message d’erreur.

38 tests d’accès locaux réussissent, dont quatre tests du client : ouverture Google et échange CSRF, fenêtre bloquée, refus serveur avec déconnexion, destination non approuvée. Le parcours Google réel du propriétaire reste à retester après publication ; ces tests n’affirment pas qu’une authentification Google réelle a été exécutée.

Référence officielle : https://firebase.google.com/docs/auth/web/redirect-best-practices (consultée le 4 novembre 2026), qui décrit les limites des redirections avec stockage tiers bloqué et l’alternative par fenêtre Google.
