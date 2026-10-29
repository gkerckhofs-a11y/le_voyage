import type {AnnualAttentions,AnnualAttentionsPreview} from '../application/annual-attentions.ts';
import {euroCents,euroInput,euroLabel} from './euro.ts';
const el=(id:string)=>document.getElementById(id)!;
const field=(id:string)=>el(id) as HTMLInputElement;
type Kind='dated'|'surprises';
const value=(row:Element,key:string)=>(row.querySelector(`[data-field="${key}"]`) as HTMLInputElement).value;
const change=()=>el('attentions-fields').dispatchEvent(new Event('input',{bubbles:true}));
function control(row:HTMLElement,key:string,title:string,type:string,saved:string,options?:[string,string][]){
 const label=document.createElement('label');label.textContent=title;
 const input=options?document.createElement('select'):type==='textarea'?document.createElement('textarea'):document.createElement('input');
 input.dataset.field=key;input.required=true;
 if(input instanceof HTMLInputElement){input.type=['date','number'].includes(type)?type:'text';input.maxLength=type==='money'?18:160;if(type==='money')input.inputMode='decimal';if(type==='number'){input.min='1';input.max='100';input.step='1';}}
 if(input instanceof HTMLTextAreaElement){input.rows=3;input.maxLength=500;}
 if(input instanceof HTMLSelectElement)for(const [v,t] of [['','Choisir…'],...(options??[])]){const option=document.createElement('option');option.value=v;option.textContent=t;input.append(option);}
 input.value=saved;label.append(input);row.append(label);
}
function updateButtons(){for(const kind of ['dated','surprises'] as const)(el(`add-${kind}-attention`) as HTMLButtonElement).disabled=el(`${kind}-attention-rows`).children.length>=20;}
function add(kind:Kind,saved?:AnnualAttentions['dated'][number]|AnnualAttentions['surprises'][number]){
 const container=el(`${kind}-attention-rows`);if(container.children.length>=20)return;
 const row=document.createElement('div');row.className='annual-attention-row';
 control(row,'label',kind==='dated'?'Occasion':'Nom interne de la série de surprises','text',saved?.label??'');
 if(kind==='dated'){
  const d=saved as AnnualAttentions['dated'][number]|undefined;
  control(row,'date','Date prévue','date',d?.date??'');
  control(row,'unit','Bénéficiaires prévus','select',d?.unit??'',[['team','Chaque équipe prévue'],['person','Chaque personne prévue']]);
  control(row,'amountCents','Montant par équipe ou personne choisie (€)','money',d?euroInput(d.amountCents):'');
  const unit=row.querySelector('[data-field="unit"]') as HTMLSelectElement,amountLabel=row.querySelector('[data-field="amountCents"]')!.parentElement!;
  const describe=()=>{amountLabel.firstChild!.textContent=unit.value==='team'?'Montant par équipe (€)':unit.value==='person'?'Montant par personne (€)':'Montant unitaire (€)';};unit.addEventListener('input',describe);describe();
  control(row,'visibility','Visibilité souhaitée après activation','select',d?.visibility??'',[['announced','Événement annoncé'],['discreet','Événement discret']]);
 }else{
  const d=saved as AnnualAttentions['surprises'][number]|undefined;
  control(row,'count','Nombre de surprises dans cette série','number',d?String(d.count):'');
  control(row,'periodStart','Début de période inclus','date',d?.periodStart??'');
  control(row,'periodEnd','Fin de période incluse','date',d?.periodEnd??'');
  control(row,'envelopeCents','Enveloppe totale de la série (€)','money',d?euroInput(d.envelopeCents):'');
  control(row,'compositionPreferences','Préférences de composition','textarea',d?.compositionPreferences??'');
 }
 const remove=document.createElement('button');remove.type='button';remove.textContent=kind==='dated'?'Retirer ce cadeau daté':'Retirer cette série';remove.addEventListener('click',()=>{row.remove();updateButtons();change();el(`add-${kind}-attention`).focus();});row.append(remove);container.append(row);updateButtons();
}
function toggle(){const enabled=field('attentions-enabled').checked;(el('attentions-fields') as HTMLFieldSetElement).disabled=!enabled;el('attentions-fields').hidden=!enabled;}
export function initializeAttentions(){
 el('attentions-enabled').addEventListener('input',toggle);
 for(const kind of ['dated','surprises'] as const)el(`add-${kind}-attention`).addEventListener('click',()=>{add(kind);change();(el(`${kind}-attention-rows`).lastElementChild?.querySelector('input') as HTMLInputElement)?.focus();});toggle();
}
export function readAttentions():AnnualAttentions|undefined{
 if(!field('attentions-enabled').checked)return undefined;
 return {basis:field('attentions-basis').value as 'HT'|'TTC',dated:[...el('dated-attention-rows').children].map(row=>({label:value(row,'label').trim(),date:value(row,'date'),unit:value(row,'unit') as 'team'|'person',amountCents:euroCents(value(row,'amountCents')),visibility:value(row,'visibility') as 'announced'|'discreet'})),surprises:[...el('surprises-attention-rows').children].map(row=>({label:value(row,'label').trim(),count:Number(value(row,'count')),periodStart:value(row,'periodStart'),periodEnd:value(row,'periodEnd'),envelopeCents:euroCents(value(row,'envelopeCents')),compositionPreferences:value(row,'compositionPreferences').trim()}))};
}
export function restoreAttentions(saved?:AnnualAttentions){
 field('attentions-enabled').checked=!!saved;field('attentions-basis').value=saved?.basis??'';
 for(const kind of ['dated','surprises'] as const){el(`${kind}-attention-rows`).replaceChildren();for(const item of saved?.[kind]??[])add(kind,item);}updateButtons();toggle();
}
export function renderAttentions(p:AnnualAttentionsPreview){
 const box=el('annual-attentions-preview');box.replaceChildren();box.hidden=!p;if(!p)return;
 const heading=document.createElement('h3');heading.textContent='Cadeaux datés et surprises · préparation privée';box.append(heading);
 const list=document.createElement('ul');
 for(const d of p.dated){const li=document.createElement('li');li.textContent=`${d.date} · ${d.label} · ${d.visibility==='announced'?'à annoncer après activation':'discret'} · ${euroLabel(d.amountCents)} par ${d.unit==='team'?'équipe':'personne'}${d.totalCents===null?' · total en attente des effectifs':` × ${d.quantity} = ${euroLabel(d.totalCents)}`}.`;list.append(li);}
 for(const d of p.surprises){const li=document.createElement('li');li.textContent=`${d.label} · ${d.count} surprise(s) entre le ${d.periodStart} et le ${d.periodEnd} inclus · enveloppe totale ${euroLabel(d.envelopeCents)}. Préférences : ${d.compositionPreferences}`;list.append(li);}box.append(list);
 const total=document.createElement('p');total.textContent=p.totalCents===null?`Enveloppes surprises : ${euroLabel(p.surpriseMaximumCents)} ${p.basis}. Ajoutez l’organisation pour calculer les cadeaux datés.`:`Total des attentions datées et surprises : ${euroLabel(p.totalCents)} ${p.basis}. L’enveloppe d’une série de surprises couvre toute la série ; elle n’est pas multipliée par son nombre de surprises.`;box.append(total);
 const note=document.createElement('p');note.textContent='Aucune publication ni distribution à ce stade. Les cadeaux datés sont indépendants des kilomètres. Les périodes, noms et compositions des surprises restent dans la préparation administrative.';box.append(note);
}
