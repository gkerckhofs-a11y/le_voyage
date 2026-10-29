import type {AnnualLogistics} from '../application/annual-logistics.ts';
import type {AnnualPlanPreview} from '../application/annual-plan.ts';
import {euroLabel} from './euro.ts';
const el=(id:string)=>document.getElementById(id)!;
const field=(id:string)=>el(id) as HTMLInputElement;
const fields=[['operationalContact','Contact opérationnel',1000],['sites','Sites concernés',2000],['deliveryDetails','Coordonnées de livraison autorisées',2000],['receptionLocation','Lieu envisagé pour la réception',500],['receptionDetails','Coordonnées et modalités de réception',2000],['serviceConstraints','Contraintes de service',2000],['fallbackPlan','Solution de repli envisagée',2000]] as const;
function toggle(){const enabled=field('logistics-enabled').checked;(el('logistics-fields') as HTMLFieldSetElement).disabled=!enabled;el('logistics-fields').hidden=!enabled;}
function formulas(saved?:readonly string[]){
 const container=el('reception-formula-fields'),old=[...container.querySelectorAll<HTMLTextAreaElement>('textarea')].map(i=>i.value);container.replaceChildren();
 for(let i=0;i<Math.min(101,Math.max(0,Number(field('receptionTierCount').value)+1));i++){
  const label=document.createElement('label'),input=document.createElement('textarea');label.textContent=i===0?'Prestation de base garantie — description prévue':`Niveau ${i} — formule complète prévue`;
  input.id=`reception-formula-${i}`;input.rows=3;input.maxLength=1000;input.value=saved?saved[i]??'':old[i]??'';input.placeholder='À compléter';label.append(input);container.append(label);
 }
}
export function initializeLogistics(){
 const container=el('logistics-notes');
 for(const [key,title,limit] of fields){const label=document.createElement('label'),input=document.createElement('textarea');label.textContent=title;input.id=`logistics-${key}`;input.rows=3;input.maxLength=limit;input.placeholder='À compléter';label.append(input);container.append(label);}
 el('logistics-enabled').addEventListener('input',toggle);el('receptionTierCount').addEventListener('input',()=>formulas());formulas();toggle();
}
export function readLogistics():AnnualLogistics|undefined{
 if(!field('logistics-enabled').checked)return undefined;
 return {operationalContact:field('logistics-operationalContact').value.trim(),sites:field('logistics-sites').value.trim(),deliveryDetails:field('logistics-deliveryDetails').value.trim(),receptionLocation:field('logistics-receptionLocation').value.trim(),receptionDetails:field('logistics-receptionDetails').value.trim(),serviceConstraints:field('logistics-serviceConstraints').value.trim(),fallbackPlan:field('logistics-fallbackPlan').value.trim(),receptionFormulas:[...el('reception-formula-fields').querySelectorAll<HTMLTextAreaElement>('textarea')].map(i=>i.value.trim())};
}
export function restoreLogistics(saved?:AnnualLogistics){
 field('logistics-enabled').checked=!!saved;for(const [key] of fields)field(`logistics-${key}`).value=saved?.[key]??'';formulas(saved?.receptionFormulas??[]);toggle();
}
export function renderLogistics(plan:AnnualPlanPreview){
 const box=el('annual-logistics-preview');box.replaceChildren();box.hidden=!plan.logistics;if(!plan.logistics)return;
 const heading=document.createElement('h3');heading.textContent='Réception et livraisons · préparation privée';box.append(heading);
 const dates=document.createElement('p');dates.textContent=`Réception prévue le ${plan.receptionDate} · gel prévu le ${plan.freezeDate} · ${plan.organisation?`${plan.organisation.receptionGuests} participants prévisionnels`:'participants à compléter dans l’organisation'}.`;box.append(dates);
 const details=document.createElement('dl');
 for(const [key,title] of fields){const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=title;description.textContent=plan.logistics[key]||'À compléter';details.append(term,description);}box.append(details);
 const list=document.createElement('ol');
 for(const [i,description] of plan.logistics.receptionFormulas.entries()){
  const item=document.createElement('li'),title=document.createElement('strong'),text=document.createElement('p');title.textContent=i===0?'Réception de base garantie':`Niveau ${i}`;text.textContent=description||'Description à compléter';item.append(title,text);
  const budget=document.createElement('p');budget.textContent=plan.funding?`Enveloppe totale : ${euroLabel(plan.funding.receptionTotalsCents[i])} ${plan.funding.basis}.`:'Enveloppe à compléter dans les budgets.';item.append(budget);list.append(item);
 }box.append(list);
 const note=document.createElement('p');note.textContent='Les niveaux décrivent des formules complètes et leurs montants ne se cumulent pas. Ces notes ne confirment ni adresse, ni disponibilité, ni réservation. Aucune information de contact n’est transmise à un prestataire depuis ce brouillon.';box.append(note);
}
