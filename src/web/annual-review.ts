import type {AnnualPlanPreview} from '../application/annual-plan.ts';
import {euroLabel} from './euro.ts';
/** Read-only inventory of an existing preview; never a contract or activation decision. */
export function renderAnnualReview(plan:AnnualPlanPreview,revision?:number){
 const box=document.getElementById('annual-review')!;box.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='Revue du brouillon';
 const status=document.createElement('p');status.id='annual-review-version';status.textContent=revision===undefined?'Aperçu non enregistré.':`Brouillon enregistré · version ${revision}.`;
 const intro=document.createElement('p');intro.textContent='Ce relevé décrit les informations saisies. Il ne vaut ni validation contractuelle ni activation de campagne.';
 const list=document.createElement('dl');
 const row=(name:string,value:string)=>{const term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=name;detail.textContent=value;list.append(term,detail);};
 row('Organisation',plan.organisation?`${plan.organisation.companyName} · ${plan.organisation.teamCount} équipe(s), ${plan.organisation.totalHeadcount} personne(s) prévues · ${plan.organisation.receptionGuests} participant(s) à la réception.`:'Non renseignée.');
 row('Calendrier',`${plan.start} → ${plan.endExclusive} (fin exclue) · ${plan.timeZone} · ${plan.activeWeeks} périodes actives. Gel : ${plan.freezeDate} ; réception : ${plan.receptionDate}.`);
 row('Progression prévisionnelle',`${plan.giftThresholds.length} palier(s) cadeau et ${plan.receptionThresholds.length} niveau(x) de réception. Seuils détaillés ci-dessous ; barème prototype à valider.`);
 row('Questionnaire',plan.questionnaire?`${plan.questionnaire.mode==='kpi'?'Mode KPI':'Mode autonome'} · trois valeurs et cinq pondérations renseignées · seuil de confidentialité : ${plan.questionnaire.minimumRespondents} répondants.`:'Non renseigné.');
 if(plan.questionnaire?.mode==='kpi')row('Référent KPI facultatif',plan.questionnaire.kpiReferent?'Désignation renseignée ; aucun accès attribué.':'Non renseigné (facultatif).');
 const budget=plan.enterpriseFunding;
 row('Maximum des enveloppes configurées',budget?`${euroLabel(budget.configuredMaximumCents)} ${budget.basis}. Ce montant couvre uniquement les enveloppes saisies ; ce n’est pas un devis global.`:`Non calculable : ${!plan.organisation&&!plan.funding?'organisation et budgets de progression/réception non renseignés':!plan.organisation?'organisation non renseignée':'budgets de progression/réception non renseignés'}.`);
 row('Cadeaux datés et surprises',plan.attentions?`${plan.attentions.dated.length} cadeau(x) daté(s), ${plan.attentions.surprises.length} série(s) de surprises renseignés. Aucune publication ni distribution déclenchée.`:'Section non renseignée ; aucune absence de coût n’en est déduite.');
 if(plan.logistics){
 const notes=[plan.logistics.operationalContact,plan.logistics.sites,plan.logistics.deliveryDetails,plan.logistics.receptionLocation,plan.logistics.receptionDetails,plan.logistics.serviceConstraints,plan.logistics.fallbackPlan];
 row('Livraisons et réception',`${notes.filter(value=>value.trim()).length} note(s) renseignée(s) sur 7 ; ${plan.logistics.receptionFormulas.filter(value=>value.trim()).length} description(s) de formule sur ${plan.logistics.receptionFormulas.length}. Les notes vides restent à compléter si utiles ; aucune réservation confirmée.`);
 }else row('Livraisons et réception','Section non renseignée.');
 row('Préparation contractuelle',plan.contract?`Référence de version : ${plan.contract.versionReference||'à compléter'}. Mentions de confidentialité : ${plan.contract.privacyNotice?'renseignées':'à compléter'}. Clauses : ${plan.contract.clauses?'renseignées':'à compléter'}.`:'Textes et référence de version non renseignés.');
 const remaining=document.createElement('p');remaining.id='annual-review-contract';remaining.textContent='Validation contractuelle à préparer : les textes et la référence de version restent des propositions modifiables. Aucune acceptation, signature ou version contractuelle figée n’est gérée dans ce brouillon. Les règles détaillées de calcul restent à valider avant création explicite d’une campagne.';
 box.append(heading,status,intro,list,remaining);
}
