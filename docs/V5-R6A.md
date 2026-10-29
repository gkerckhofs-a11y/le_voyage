# V5 R6A — import CSV contrôlé du catalogue Master

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. HEAD de reprise local/distant : `e877adc93763651657f6e27d792bc4d4f86f1805`, quatre CI réussies. Source : cahier des charges Rouge Clémence V5 du 28 octobre 2026, §7.5. Premier incrément de R6, pas une déclaration de couverture complète de Master Sheets.

## Livré

Dans le catalogue privé, Clem charge un CSV UTF-8 (virgule ou point-virgule), examine les créations, mises à jour et archivages explicites, puis confirme avec un motif. L'aperçu montre les valeurs avant/après, les erreurs et les références absentes conservées. Le nom du fichier, la date et la révision du dernier import sont affichés ; les imports figurent dans l'historique existant.

Le serveur conserve un aperçu propre à son auteur, valable une heure, lié à la révision du catalogue. La confirmation relit les droits, refuse un catalogue modifié ou un aperçu expiré et applique tout le lot dans une transaction. Une réponse perdue permet de réessayer le même aperçu/motif sans double application, même après une modification ultérieure. Un lot invalide n'applique aucune référence. Le journal conserve auteur, date, motif, empreinte du contenu et changements avant/après ; aucun fichier brut n'est enregistré.

Les mises à jour utilisent le SKU exact, sensible à la casse, zéros initiaux conservés. Les références historiques utilisent leur identifiant comme SKU ; les nouveaux identifiants internes sont dérivés du SKU et ne dépendent jamais du numéro de ligne. Un SKU absent reste inchangé, sans suppression ni archivage automatique. Un archivage exige une ligne explicite `statut=archivé`. Les références et leurs alternatives sont conservées.

## Schéma et limites de cet incrément

Obligatoires : `sku`, `nom`, `fournisseur`, `categorie`, `description`, `prix_achat_htva`, `tva_taux`, `statut`, `delai_approvisionnement_jours`, `saisonnalite`, `sans_alcool`.

Facultatives : `artisan_id`, `prix_vente_htva`, `stock_quantite`, `etiquettes_preference`, `restrictions_ou_allergenes_produit`, `poids`, `url_image`, `mis_a_jour_le`.

- SKU de 1 à 64 caractères (lettres ASCII, chiffres, point, tiret, underscore), sans conversion numérique.
- Prix en centimes entiers, deux décimales maximum ; taux de TVA stocké en centièmes de pourcentage. Taux 0–100 %, prix d'achat strictement positif ; vente sous achat refusée dans cette première validation, politique commerciale à confirmer.
- Catégories existantes : `tea`, `chocolate`, `grocery`, `wine`, `beer`, `other`. Statuts : `actif`, `épuisé`, `archivé`. Mois uniques 1–12 séparés par `|`, sans alcool `oui`/`non`. Textes sur une ligne, selon les bornes du modèle existant.
- Stock facultatif : inconnu si absent, indisponible si zéro. Le stock est déclaré, sans réservation ni décrément automatique.
- URLs HTTPS sans identifiants, validées syntaxiquement et jamais téléchargées. Pas de validation d'existence distante ni de vignette dans cette tranche.
- Maximum 100 lignes produits et 100 références au total ; fichier 120 000 octets maximum, enveloppe HTTP bornée à 128 Kio. Colonnes inconnues, doublons, guillemets invalides, prix/dates incohérents refusés.
- Métadonnées Master privées séparées des propriétés du moteur de composition ; la modification manuelle conserve ces métadonnées et la provenance. TVA et prix de vente sont enregistrés, sans nouveau calcul fiscal dans les propositions existantes. La base fiscale des budgets reste à valider.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, cartes, seuils, droits acquis, profils R5, commandes, budgets clients, règles Firestore et accès aux données d'autres entreprises. Aucun merge main, service payant ou déploiement.
- **Modifié** : `src/server/supplier-catalog.mjs` (intégration, provenance, conservation des métadonnées), `src/server/firebase-http.mjs` (deux routes privées), `src/web/supplier-catalog.ts` (aperçu/confirmation, erreurs, recherche SKU), `web/catalogue.html`, `web/cockpit.css`, `tests/firebase/supplier-catalog.test.mjs`.
- **Nouveau** : `src/server/catalog-import.mjs`, `tests/catalog-import.test.mjs`, `tests/firebase-browser/catalog-import.spec.mjs`, ce rapport et les deux captures.

## Vérifications réelles

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/catalog-import.test.mjs tests/composition.test.mjs` : **6/6**. SKU avec zéros, centimes exacts, BOM/CRLF, séparateurs/guillemets, erreurs et limites, composition historique inchangée.
- Sous émulateurs Auth/Firestore : `node --test tests/firebase/supplier-catalog.test.mjs` : **4/4**. Aperçu sans mutation du catalogue, double confirmation concurrente, idempotence durable, import identique sans modification, archivage sans suppression, conservation des absents/métadonnées, rejet des conflits, expiration, autre auteur, révocation et lots invalides.
- Sous émulateurs : `npx playwright test --config playwright.local-check.config.mjs catalog-import.spec.mjs supplier-catalog.spec.mjs` : **4/4**, desktop 1440 et mobile 390. Erreurs affichées, refus d'un employé, aperçu, confirmation réelle avec réponse réseau perdue, nouvelle tentative, historique/provenance et modification manuelle. Le scénario d'import modifie uniquement les métadonnées fiscales fictives d'une référence existante ; noms, prix, compositions et nombre de produits partagés restent inchangés, assertion explicite à l'appui.
- Après amélioration de l'aperçu (libellés lisibles avant/après et aide de format repliable), le sélecteur du test était devenu ambigu avec deux `summary` : correction vers l'enfant direct, puis rejeu `catalog-import.spec.mjs` **2/2**. Captures inspectées. Aucune assertion supprimée.
- Commande émulateurs : `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Configuration locale temporaire Chromium 141 supprimée avant commit ; la CI emploie son navigateur verrouillé. `git diff --check` réussi. Résultats CI du commit renseignés dans la PR.

Captures du panneau d'import : [desktop](evidence/v5-r6a-import-desktop.png), [mobile](evidence/v5-r6a-import-mobile.png). Kiosque inchangé, sans nouvelle capture ciblée ; voir les preuves R4.

## Suite et points ouverts

R6 reste partielle : connexion Google Sheets autorisée côté serveur, XLSX, gel explicite des libellés/prix/coûts à la confirmation de commande, récupération des aperçus après fermeture, purge des aperçus expirés, retour arrière contrôlé et organisation complète des onglets/filtres restent à traiter. Aucun identifiant de feuille, secret Google ou projet Firebase n'est inventé. La recherche ciblée dans le code serveur/configuration n'a pas trouvé de raccordement Sheets existant ; l'authentification Google du portail test n'est pas une intégration Sheets.

Les aperçus expirés sont refusés mais ne sont pas supprimés automatiquement : définir la rétention avant déploiement. Le journal garde les changements et les données nécessaires pour préparer une restauration, sans bouton de restauration dans cette tranche. La validation de taux/prix est structurelle et ne constitue pas une validation commerciale ou fiscale.

Aucune URL de test nouvellement constatée. Aucun déploiement ni migration de production. Le staging antérieur n'est pas revalidé. Ce n'est pas la dernière tranche : poursuite de R6 avant R7 anticipation, R8 réception/directeur et R9 recette intégrée/pilote.
