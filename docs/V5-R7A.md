# V5 R7A — prévisions des prochains paliers

28 octobre 2026 · branche `work/v2-phase1-engine` · PR #1. Reprise au HEAD local et GitHub `e3749dd1225f9dd07f82c781ea602f41a252ae9f`, quatre workflows précédents vérifiés verts. Source fonctionnelle : Rouge Clémence / Le Ludificateur, cahier V5 du 28 octobre 2026, §7.2 et §7.6. Aucun déploiement.

## Livré et limites de cette tranche

Vue « Prévisions cadeaux » distincte des cadeaux acquis, accessible depuis le cockpit. Pour chaque équipe autorisée : prochain palier non acquis, kilomètres restants, budget configuré, estimation en semaines actives, date indicative et situations qui empêchent une estimation. Filtres client et horizons 7/30/90 jours ; les lignes sans date restent visibles pour revue. Une sélection dont l'autorisation est retirée reste vide au lieu de s'élargir aux autres clients.

La lecture serveur réutilise les habilitations cadeaux actuelles et les campagnes existantes, dans une transaction sans écriture, avec plafond de 200 équipes. Le directeur et l'employé sont refusés ; aucune réponse de questionnaire, source de résultat, préférence individuelle, ligne SKU ou coût d'achat n'est retourné. Les informations affichées sont effacées avant relecture et restent effacées après refus.

**R7 est partielle.** Aucune préparation anticipée, réservation de stock, validation de commande, notification ou facture n'est ajoutée. Les suggestions déjà disponibles pour cadeaux acquis restent inchangées. Les prévisions ne créent ni tâche ni droit et ne révèlent aucun contenu cadeau.

## Calcul vérifiable

Politique proposée et versionnée `recent-active-v1` : les quatre dernières semaines actives et éligibles clôturées, au moins deux observations, dernière clôture âgée de 28 jours au maximum. Ces paramètres doivent être éprouvés au pilote ; ce ne sont pas des engagements commerciaux.

Distance restante = seuil du prochain palier non acquis − somme exacte des kilomètres de l'équipe. Nombre estimé de semaines actives = plafond(distance restante / moyenne exacte de l'échantillon). Exemple testé : 350 km de seuil, 140 km acquis et deux semaines à 70 km donnent 210 km restants, donc trois semaines actives. Les scénarios rapide/lent divisent le même reste par le maximum/minimum observé ; ils ne représentent ni des probabilités ni un intervalle de confiance. Si le minimum vaut zéro, la durée lente est indéterminée.

Les comparaisons et plafonds utilisent les rationnels du moteur. Les valeurs affichées sont arrondies, sans modifier les données. La date provient des semaines actives éligibles non clôturées ; pauses et inéligibilité n'ajoutent aucun kilomètre. Un report retarde les clôtures suivantes si nécessaire. Une échéance passée non clôturée empêche d'annoncer une date. Une clôture attendue le jour du calcul peut encore être comptée à cette date.

Absence d'historique suffisant, historique ancien, progression nulle, données futures, campagne terminée et dépassement du calendrier sont explicites. Un seuil dépassé sans droit enregistré est « à vérifier », jamais attribué par cette vue. La date de calcul utilise le fuseau de campagne, Europe/Brussels par défaut. Aucun taux arbitraire 40–100 km n'est appliqué à la place de l'historique observé.

## Inchangé / modifié / nouveau

- **Inchangé** : moteur, calendrier, seuils et barèmes, attribution des droits, commandes et avenants, catalogue, règles Firestore, autres espaces, main et production.
- **Modifié** : `src/server/gift-operations.mjs` (lecture autorisée), `src/server/firebase-http.mjs` (route et liste des routes cadeau), `web/cockpit.html` (navigation), `tests/firebase/gift-operations.test.mjs`.
- **Nouveau** : `src/operations/gift-forecast.mjs`, `src/web/gift-forecast.ts`, `web/previsions.html`, `web/previsions.css`, `tests/gift-forecast.test.mjs`, `tests/firebase-browser/gift-forecast.spec.mjs`, ce rapport et captures R7A.

## Vérifications réalisées

- `npm run typecheck` et `npm run build:web` : réussis.
- `node --test tests/gift-forecast.test.mjs` : **6/6**, arithmétique exacte et seuil fractionnaire, pauses/inéligibilité, report, historique insuffisant/ancien/futur/nul, fin de calendrier, droits acquis et absence de mutation.
- `node --test tests/firebase/gift-operations.test.mjs` : **8/8**, dont projection privée sur deux clients, fuseau belge près de minuit UTC, retrait de portée/révocation, absence d'écriture et régressions du suivi financier/logistique.
- `npx playwright test --config playwright.local-check.config.mjs gift-forecast.spec.mjs gift-operations.spec.mjs` : **4/4** desktop 1440 et mobile 390. Filtres 7/90 jours, campagne inchangée, aucune commande créée, retrait de client sans élargissement de sélection, refus employé/directeur, effacement après erreur, suivi des cadeaux acquis conservé.
- Exécution des commandes intégrées dans `PATH=/tmp/voyage-java/bin:$PATH npx firebase emulators:exec --project demo-rc-voyage --config firebase/emulators.json --only auth,firestore '<commande>'`. Firestore Standard, données fictives. Chromium local 141, configuration locale temporaire supprimée avant commit.
- Premier test unitaire : un scénario d'historique insuffisant avait aussi une clôture en retard ; fixture corrigée pour isoler le cas. Premier essai navigateur : 2/4, filtre cherché par texte de label incluant les options ; ciblage par rôle accessible corrigé. Deuxième passage : 4/4.
- Après retrait du numéro technique de politique dans le texte affiché, parcours prévisions rejoués : **2/2**, nouvelles captures enregistrées.
- Anciennes captures régénérées restaurées. SHA final et résultats GitHub liés dans la PR.

Captures inspectées : [desktop](evidence/v5-r7a-forecasts-desktop.png), [mobile](evidence/v5-r7a-forecasts-mobile.png). Navigation haute desktop, fixe en bas mobile, aucun débordement horizontal constaté. Kiosque inchangé : pas de nouvelle capture.

## Correctif de recette intégrée

La CI du premier commit R7A a signalé les trois nouveaux fichiers absents de la liste publique explicite. Ajout de `assets/web/gift-forecast.js`, `previsions.html`, `previsions.css` dans `tests/visual/public-build.test.mjs`. La projection de budget utilise désormais `allocatedCents`, comme le cockpit existant, et le test conserve l'interdiction de diffuser les champs du modèle privé. Les contrôles de contenu privé ne sont pas assouplis. Vérification du correctif : typecheck/build réussis ; `node --test tests/gift-forecast.test.mjs tests/visual/public-build.test.mjs` **7/7**, tests serveur cadeaux **8/8**, parcours prévisions **2/2**. Captures inchangées après cette correction de schéma.

## Suite et risques ouverts

R7B : propositions anticipées reliées au catalogue et aux préférences autorisées, coûts et délais explicites, puis validation humaine et gestion du risque de stock réservé. Les conditions de réservation/retour et les seuils d'alerte restent à préciser. Pas de probabilité commerciale calculée ni d'achat automatique.

Le Master Sheets réel n'est toujours pas configuré/recetté ; les données de démonstration ne prouvent pas sa disponibilité. Aucune URL de test revalidée. Aucun déploiement, merge main ou accès de production. Cette tranche n'est pas la dernière avant déploiement : le porteur sera prévenu avant cette étape.
