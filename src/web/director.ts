import {startDemo} from './demo-client.js';
type Progress={organizationName:string;teams:{name:string;displayKm:string;milestones:{number:number;km:number;acquired:boolean}[]}[];collective:{displayKm:string};reception:{level:number;frozen:boolean;cutoffDate:string}};
const el=(id:string)=>document.getElementById(id)!,button=el('refresh-company') as HTMLButtonElement;
let busy=false;
async function refresh(){
 if(busy)return;busy=true;button.disabled=true;el('company-content').hidden=true;el('company-teams').replaceChildren();el('company-title').textContent='Le Voyage de votre entreprise';el('company-status').textContent='Actualisation…';
 try{
  const response=await fetch('/api/director/progress');if(!response.ok)throw Error('Cet espace est indisponible ou votre accès a été retiré.');
  const data:Progress=await response.json();el('company-title').textContent='Le Voyage de '+data.organizationName;
  el('collective-km').textContent=data.collective.displayKm+' km';el('reception-level').textContent=data.reception.level?'Niveau '+data.reception.level:'Formule de base';
  el('reception-state').textContent=(data.reception.frozen?'Niveau gelé. ':'Niveau évolutif. ')+'Dernier jour pris en compte : '+data.reception.cutoffDate+'.';
  for(const team of data.teams){const card=document.createElement('article');card.className='gift-row';const title=document.createElement('h3'),distance=document.createElement('p'),steps=document.createElement('ul');title.textContent=team.name;distance.textContent=team.displayKm+' km parcourus';for(const step of team.milestones){const li=document.createElement('li');li.textContent=`Palier ${step.number} · ${step.km} km · ${step.acquired?'Acquis':'À atteindre'}`;steps.append(li);}card.append(title,distance,steps);el('company-teams').append(card);}
  el('company-content').hidden=false;el('company-status').textContent='Progression actualisée.';
 }catch(e){el('company-status').textContent=e instanceof TypeError?'Lecture indisponible. Réessayez.':(e as Error).message;}
 finally{busy=false;button.disabled=false;}
}
button.addEventListener('click',()=>void refresh());
void(async()=>{try{await startDemo();await refresh();}catch{el('company-status').textContent='Connexion requise.';}})();
