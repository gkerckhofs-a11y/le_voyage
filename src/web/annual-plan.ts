import {renderAnnualReview} from './annual-review.ts';
import {initializeLogistics,readLogistics,restoreLogistics,renderLogistics} from './annual-logistics-form.ts';
import {initializeAttentions,readAttentions,restoreAttentions,renderAttentions} from './annual-attentions-form.ts';
import {initializeOrganisation,readOrganisation,restoreOrganisation,renderOrganisation} from './annual-organisation-form.ts';
import {initializeQuestionnaire,readQuestionnaire,restoreQuestionnaire,renderQuestionnaire} from './annual-questionnaire-form.ts';
import {euroCents,euroInput,euroLabel} from './euro.ts';
import type {GiftAllocation} from '../application/annual-funding.ts';
import {startDemo} from './demo-client.ts';
import type {AnnualPlanInput,AnnualPlanPreview} from '../application/annual-plan.ts';
const el=(id:string)=>document.getElementById(id)!;
const field=(id:string)=>el(id) as HTMLInputElement;
const form=el('annual-form') as HTMLFormElement,fields=el('annual-fields') as HTMLFieldSetElement;
let csrf='',revision=0,busy=false;
initializeQuestionnaire();
initializeOrganisation();
initializeAttentions();
initializeLogistics();
async function request(path:string,data?:unknown){const response=await fetch('/api/annual-plan'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','X-Demo-CSRF':csrf},...(data?{body:JSON.stringify(data)}:{})});if(!response.ok)throw new Error(String(response.status));return response.json();}
function fundingFields(saved?:AnnualPlanInput['funding']){
 const enabled=field('funding-enabled').checked;
 (el('funding-fields') as HTMLFieldSetElement).disabled=!enabled;el('funding-fields').hidden=!enabled;
 const gifts=el('gift-funding-fields'),oldAmounts=[...gifts.querySelectorAll<HTMLInputElement>('input')].map(i=>i.value),oldUnits=[...gifts.querySelectorAll<HTMLSelectElement>('select')].map(i=>i.value);
 const allocations=saved?.giftAllocations??saved?.giftPerTeamCents?.map(amountCents=>({unit:'team' as const,amountCents}));
 gifts.replaceChildren();
 for(let i=0;i<Math.min(100,Math.max(0,Number(field('giftCount').value)));i++){
  const row=document.createElement('div');row.className='annual-gift-allocation';
  const unitLabel=document.createElement('label'),unit=document.createElement('select');unitLabel.textContent=`Palier cadeau ${i+1} · bénéficiaires`;unit.id=`gift-unit-${i}`;unit.required=true;
  for(const [value,label] of [['','Choisir…'],['team','Chaque équipe prévue'],['person','Chaque personne prévue']]){const option=document.createElement('option');option.value=value;option.textContent=label;unit.append(option);}
  unit.value=allocations?.[i]?.unit??oldUnits[i]??'';unitLabel.append(unit);
  const label=document.createElement('label'),text=document.createElement('span'),amount=document.createElement('input');
  const describe=()=>{text.textContent=unit.value==='team'?'Montant par équipe (€)':unit.value==='person'?'Montant par personne (€)':'Montant unitaire (€)';};describe();unit.addEventListener('input',describe);
  amount.id=`gift-funding-${i}`;amount.inputMode='decimal';amount.required=true;amount.maxLength=18;amount.value=allocations?.[i]?euroInput(allocations[i].amountCents):oldAmounts[i]??'';label.append(text,amount);row.append(unitLabel,label);gifts.append(row);
 }
 const reception=el('reception-funding-fields'),old=[...reception.querySelectorAll<HTMLInputElement>('input')].map(i=>i.value);reception.replaceChildren();
 for(let i=0;i<Math.min(101,Math.max(0,Number(field('receptionTierCount').value)+1));i++){
  const label=document.createElement('label'),amount=document.createElement('input');label.textContent=i===0?'Réception de base garantie · total':`Niveau ${i} · total de la formule`;amount.id=`reception-funding-${i}`;amount.inputMode='decimal';amount.required=true;amount.maxLength=18;amount.value=saved?.receptionTotalsCents?.[i]!==undefined?euroInput(saved.receptionTotalsCents[i]):old[i]??'';label.append(amount);reception.append(label);
 }
}
for(const id of ['funding-enabled','giftCount','receptionTierCount'])el(id).addEventListener('input',()=>fundingFields());
function input():AnnualPlanInput{const questionnaire=readQuestionnaire(),organisation=readOrganisation(),attentions=readAttentions(),logistics=readLogistics();return {...(logistics?{logistics}:{}),...(attentions?{attentions}:{}),...(organisation?{organisation}:{}),...(questionnaire?{questionnaire}:{}),start:field('start').value,evaluationWeekday:Number(field('evaluationWeekday').value),timeZone:field('timeZone').value.trim(),partialWeeks:field('partialWeeks').value as AnnualPlanInput['partialWeeks'],leapDayAnniversary:field('leapDayAnniversary').value as AnnualPlanInput['leapDayAnniversary'],closedStarts:field('closedStarts').value.split(/\s+/).filter(Boolean),freezeDate:field('freezeDate').value,receptionDate:field('receptionDate').value,giftCount:Number(field('giftCount').value),receptionTierCount:Number(field('receptionTierCount').value),...((field('funding-enabled') as HTMLInputElement).checked?{funding:{basis:field('funding-basis').value as 'HT'|'TTC',giftAllocations:[...el('gift-funding-fields').querySelectorAll<HTMLInputElement>('input')].map((amount,i)=>({unit:field(`gift-unit-${i}`).value as GiftAllocation['unit'],amountCents:euroCents(amount.value)})),receptionTotalsCents:[...el('reception-funding-fields').querySelectorAll<HTMLInputElement>('input')].map(i=>euroCents(i.value))}}:{})};}
function render(plan:AnnualPlanPreview,savedRevision?:number){
 renderAnnualReview(plan,savedRevision);
 renderLogistics(plan);renderAttentions(plan.attentions);renderOrganisation(plan);renderQuestionnaire(plan.questionnaire);el('annual-preview').hidden=false;el('annual-dates').textContent=`Du ${plan.start} au ${plan.endExclusive} (date de fin exclue) · ${plan.timeZone}.`;
 el('annual-totals').textContent=`${plan.activeWeeks} périodes actives · ${plan.maximumKm} km maximum théorique.`;
 el('annual-gifts').textContent=`Seuils cadeaux proposés : ${plan.giftThresholds.length?plan.giftThresholds.join(' / ')+' km':'aucun palier'}.`;
 el('annual-reception').textContent=`Gel le ${plan.freezeDate} · réception le ${plan.receptionDate}. ${plan.weeksBeforeFreeze} périodes traitables avant gel, ${plan.receptionMaximumKm} km maximum. Améliorations proposées : ${plan.receptionThresholds.length?plan.receptionThresholds.join(' / ')+' km':'aucune'}.`;
 const funding=plan.funding,box=el('annual-funding-preview');box.replaceChildren();box.hidden=!funding;
 if(funding){const heading=document.createElement('h3'),intro=document.createElement('p'),list=document.createElement('ul');heading.textContent=`Enveloppes proposées · EUR ${funding.basis}`;intro.textContent=`${funding.giftMaximumPerTeamCents===null?'Cadeaux : les montants sont définis par équipe ou par personne selon chaque palier.':`Cadeaux : jusqu’à ${euroLabel(funding.giftMaximumPerTeamCents)} par équipe si tous les paliers sont acquis.`} Réception : ${euroLabel(funding.receptionBaseCents)} pour la base, jusqu’à ${euroLabel(funding.receptionMaximumCents)} au niveau maximal. Les formules de réception ne se cumulent pas.`;
 for(const [i,a] of funding.giftAllocations.entries()){const li=document.createElement('li');li.textContent=`Cadeau ${i+1} à ${plan.giftThresholds[i]} km : ${euroLabel(a.amountCents)} par ${a.unit==='team'?'équipe':'personne'} prévue. Conditionné au palier réellement acquis par son équipe.`;list.append(li);}
 for(const [i,amount] of funding.receptionTotalsCents.entries()){const li=document.createElement('li');li.textContent=`${i===0?'Réception de base garantie':`Niveau ${i} à ${plan.receptionThresholds[i-1]} km`} : ${euroLabel(amount)} au total.`;list.append(li);}
 box.append(heading,intro,list);}
 el('annual-weeks').replaceChildren();for(const week of plan.weeks){const row=document.createElement('tr');for(const value of [week.start,week.evaluationDate,`${week.active?'Active':'Sans progression'}${week.partial?' · partielle':''}`]){const td=document.createElement('td');td.textContent=value;row.append(td);}el('annual-weeks').append(row);}
}
async function reload(){const saved=await request('');revision=saved.revision;if(saved.input){for(const [key,value] of Object.entries(saved.input))if(key!=='funding'&&key!=='questionnaire'&&key!=='organisation'&&key!=='attentions'&&key!=='logistics')field(key).value=Array.isArray(value)?value.join('\n'):String(value);(field('funding-enabled') as HTMLInputElement).checked=!!saved.input.funding;field('funding-basis').value=saved.input.funding?.basis??'';fundingFields(saved.input.funding);restoreQuestionnaire(saved.input.questionnaire);restoreOrganisation(saved.input.organisation);restoreAttentions(saved.input.attentions);restoreLogistics(saved.input.logistics);render(saved.preview,saved.revision);}el('annual-status').textContent=revision?`Brouillon enregistré · version ${revision}. Campagne en cours inchangée.`:'Aucun brouillon enregistré. Choisissez votre calendrier.';}
async function act(save:boolean){if(busy||!form.reportValidity())return;busy=true;fields.disabled=true;try{const value=input();if(save){const saved=await request('/save',{input:value,revision,mutationId:crypto.randomUUID()});revision=saved.revision;render(saved.preview,saved.revision);el('annual-status').textContent=`Brouillon enregistré · version ${revision}. Aucune campagne activée.`;}else{render(await request('/preview',{input:value}));el('annual-status').textContent='Aperçu calculé, non enregistré.';}}catch(error){el('annual-status').textContent=(error as Error).message==='409'?'Le brouillon a changé. Rechargez la version enregistrée avant de modifier.':'Calcul ou enregistrement refusé. Vérifiez les dates, les pauses, les équipes (noms distincts, effectifs entiers), les paliers, les budgets (même base HT/TTC), les dates des attentions dans la campagne, les descriptions de réception et le questionnaire (trois questions, poids totalisant 100 %, seuil de confidentialité et deux KPI complets si activés). Après une erreur réseau, rechargez le brouillon avant de réessayer.';}finally{busy=false;fields.disabled=false;}}
form.addEventListener('submit',event=>{event.preventDefault();void act(false);});form.addEventListener('input',()=>{el('annual-preview').hidden=true;el('annual-status').textContent='Modifications non enregistrées : recalculez l’aperçu.';});el('save-annual').addEventListener('click',()=>void act(true));el('reload-annual').addEventListener('click',()=>void reload().catch(()=>{el('annual-status').textContent='Lecture refusée ou indisponible.';}));
void(async()=>{try{await startDemo();const response=await fetch('/api/demo/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok)throw new Error();csrf=(await response.json()).csrf;await reload();fields.disabled=false;}catch{el('annual-status').textContent='Accès administratif de préparation de campagne requis. Connectez-vous au compte Administration fictive.';}})();
