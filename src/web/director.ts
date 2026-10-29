import {startDemo} from './demo-client.js';
type Progress={organizationName:string;teams:{name:string;displayKm:string;milestones:{number:number;km:number;acquired:boolean}[]}[];collective:{displayKm:string};reception:{level:number;frozen:boolean;cutoffDate:string;freezeDate:string;frozenOn:string|null;displayKm:string;tiers:{level:number;km:number;included:boolean;status:'included'|'not-included'|'next'|'unreached'}[]}};
const el=(id:string)=>document.getElementById(id)!,button=el('refresh-company') as HTMLButtonElement;
let busy=false;
async function refresh(){
 if(busy)return;busy=true;button.disabled=true;el('company-content').hidden=true;el('company-teams').replaceChildren();el('reception-tiers').replaceChildren();el('reception-details').textContent='';el('company-title').textContent='Le Voyage de votre entreprise';el('company-status').textContent='Actualisation…';
 try{
  const response=await fetch('/api/director/progress');if(!response.ok)throw Error('Cet espace est indisponible ou votre accès a été retiré.');
  const data:Progress=await response.json();el('company-title').textContent='Le Voyage de '+data.organizationName;
  el('collective-km').textContent=data.collective.displayKm+' km';el('reception-level').textContent=data.reception.level?'Niveau '+data.reception.level:'Formule de base';
  el('reception-state').textContent=(data.reception.frozen?'Niveau gelé. ':'Niveau évolutif. ')+'Dernier jour pris en compte : '+data.reception.cutoffDate+'.';
  el('reception-details').textContent=`${data.reception.displayKm} km retenus pour la réception. `+(data.reception.frozen
   ?`Gel enregistré le ${data.reception.frozenOn}. Les kilomètres suivants ne changent plus la formule.`
   :`Gel prévu à partir du ${data.reception.freezeDate}. Seules les clôtures traitées au plus tard le ${data.reception.cutoffDate} comptent pour les améliorations.`);
  const labels={included:'Incluse', 'not-included':'Non incluse au gel',next:'Prochaine escale',unreached:'À atteindre'};
  for(const tier of data.reception.tiers){const item=document.createElement('li');item.textContent=`Niveau ${tier.level} · ${tier.km} km · ${labels[tier.status]}`;el('reception-tiers').append(item);}
  for(const team of data.teams){const card=document.createElement('article');card.className='gift-row';const title=document.createElement('h3'),distance=document.createElement('p'),steps=document.createElement('ul');title.textContent=team.name;distance.textContent=team.displayKm+' km parcourus';for(const step of team.milestones){const li=document.createElement('li');li.textContent=`Palier ${step.number} · ${step.km} km · ${step.acquired?'Acquis':'À atteindre'}`;steps.append(li);}card.append(title,distance,steps);el('company-teams').append(card);}
  el('company-content').hidden=false;el('company-status').textContent='Progression actualisée.';
 }catch(e){el('company-status').textContent=e instanceof TypeError?'Lecture indisponible. Réessayez.':(e as Error).message;}
 finally{busy=false;button.disabled=false;}
}
button.addEventListener('click',()=>void refresh());
void(async()=>{try{await startDemo();await refresh();}catch{el('company-status').textContent='Connexion requise.';}})();
