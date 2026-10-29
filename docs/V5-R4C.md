# V5 R4C — cadeaux lisibles au dézoom

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD local/distant de reprise : `952ddff8d0f70617368186ebf7f4e4cdeaa4222e`. Source : cahier Rouge Clémence / Le Ludificateur V5 du 28 octobre 2026, §5.1 (regroupement et légende sans déplacement des seuils).

## Livré

Au zoom inférieur à 0,5, les marqueurs cadeaux adoptent une taille lisible en pixels et affichent leur numéro plutôt qu'un long kilométrage superposé. Les positions situées à moins de 58 pixels les unes des autres forment des groupes connexes. Un badge chiffré représente chaque groupe de plusieurs cadeaux ; les marqueurs originaux sont masqués, jamais déplacés ni supprimés des données. Le badge est placé au centre visuel de ses membres : ce centre n'est pas un nouveau seuil métier.

Une légende explique la vue d'ensemble. La liste existante conserve chaque numéro, seuil exact, état et distance restante. Un badge, activable au clic, au toucher ou avec Entrée/Espace, donne le focus au premier palier concerné dans cette liste. L'activation du palier recentre la carte sur son seuil exact. En vue rapprochée, les marqueurs individuels et leurs kilomètres réapparaissent. Aucun contenu cadeau n'est ajouté aux projections ou révélé par ce parcours.

Les repères kilométriques évitent également les nouveaux badges de groupe, comme ils évitaient déjà les symboles individuels. Le mécanisme concerne seulement la carte équipe ; le minibus et les escales collectives sont inchangés.

## Inchangé / modifié / nouveau

- **Inchangé** : seuils et nombre de cadeaux, acquis, données serveur, moteur, progression, tracé, permissions, cockpit, collectif/kiosque, production et main.
- **Modifié** : `src/map/geometry.ts` (fonction de regroupement visuel), `src/web/main.ts` (rendu adaptatif, badges et accès à la liste), `src/web/journey-map.ts` (masquage des bornes sous les badges), `web/index.html` (légende), `web/styles.css` (masquage, focus et interaction).
- **Nouveau** : `tests/visual/gift-clusters.test.mjs`, `tests/browser/gift-clusters.spec.mjs`, ce rapport et deux captures.

## Vérifications réelles

- `npm run typecheck`, `npm run build:web` : réussis.
- `node --test tests/visual/gift-clusters.test.mjs tests/visual/geometry.test.mjs tests/visual/public-build.test.mjs` : **9/9 réussis**. Groupes transitifs, conservation des indices/positions, cas vide/doublons, entrées invalides et limite 100, géométrie et frontière publique.
- `npx playwright test --config playwright.local-map.config.mjs gift-clusters.spec.mjs v4-stages.spec.mjs` : **6/6 réussis**, desktop 1440/1920 et mobile 390. Fixture de trois cadeaux rapprochés à 2 100/2 110/2 120 km ; regroupement, liste complète, ancrages et voiture identiques, données API inchangées, clavier et réapparition individuelle. Régression des cinq paliers existants et du parcours complet.
- Ajout du contrôle souris/toucher : premier essai en échec, car la caméra capturait l'appui sur le badge comme début de déplacement. Correction : l'appui sur le badge ne remonte plus au gestionnaire de déplacement. Rejeu `gift-clusters.spec.mjs` : **3/3 réussis**, clic desktop et véritable tap Playwright mobile, clavier conservé. Aucun test affaibli.
- Captures inspectées. Configuration locale temporaire Chromium 141 supprimée avant commit ; CI utilise le navigateur verrouillé. `git diff --check` réussi. CI du nouveau commit suivie dans la PR.

Captures : [desktop](evidence/v5-r4c-clusters-desktop-1440.png), [mobile](evidence/v5-r4c-clusters-mobile-390.png). Pas de nouvelle capture kiosque : son rendu et ses interactions ne sont pas modifiés ; voir R4B/R4A.

## Limites et suite

Le regroupement est une aide de lecture de la carte, pas une fusion des droits cadeaux. Les détails et états individuels restent dans la liste. La vue rapprochée conserve les marqueurs exacts même pour des seuils exceptionnellement proches ; la liste reste alors le recours lisible. Le seuil visuel de 58 pixels n'a aucun rapport avec les anciennes 58 bornes fixes.

Prochaine tranche : R5, profil cadeau unique et usage pour les cadeaux non préparés. La recette intégrée/pilote R9 reste nécessaire ; cette tranche ne déclare pas le produit prêt à déployer.

Aucun déploiement ni nouvelle URL de test. Aucun changement de production. Le staging antérieur n'est pas revalidé. Ce n'est pas la dernière tranche du projet.
