import {startDemo} from './demo-client.js';
type Overview={organizationName:string;campaignId:string;teamId:string;calendar:{start:string|null;endExclusive:string|null;activeWeeks:number;timeZone:string};teams:{id:string;name:string}[];giftMilestoneCount:number;receptionTierCount:number;annualDraft:{saved:boolean;revision:number};capabilities:{plan:boolean;invite:boolean;coordinate:boolean}};
const el=(id:string)=>document.getElementById(id)!,button=el('refresh-organizer') as HTMLButtonElement;let busy=false;
async function refresh(){
 if(busy)return;busy=true;button.disabled=true;el('organizer-content').hidden=true;for(const id of ['organizer-client','organizer-calendar','organizer-summary','organizer-draft','organizer-tools','organizer-teams'])el(id).replaceChildren();el('organizer-status').textContent='Actualisation…';
 try{const response=await fetch('/api/organizer/overview');if(!response.ok)throw Error('Accès organisateur refusé ou lecture indisponible.');const data:Overview=await response.json();
  el('organizer-client').textContent=data.organizationName+' · '+data.campaignId;
  el('organizer-calendar').textContent=`Périodes enregistrées : ${data.calendar.start??'non renseigné'} → ${data.calendar.endExclusive??'non renseigné'} (fin exclue) · ${data.calendar.timeZone}`;
  el('organizer-summary').textContent=`${data.calendar.activeWeeks} semaines actives · ${data.teams.length} équipes · ${data.giftMilestoneCount} paliers cadeaux · ${data.receptionTierCount} améliorations de réception`;
  el('organizer-draft').textContent=data.annualDraft.saved?`Préparation annuelle : brouillon enregistré, révision ${data.annualDraft.revision}. Aucune validation contractuelle indiquée.`:'Préparation annuelle : aucun brouillon enregistré.';
  const team=data.teams.find(t=>t.id===data.teamId)?.name??'équipe affectée';
  for(const [cap,path,label] of [['plan','/campagne.html','Préparer la prochaine campagne'],['invite','/invitations.html','Invitations · '+team],['coordinate','/coordination.html','Coordonner les semaines']] as const){if(data.capabilities[cap]){const p=document.createElement('p'),a=document.createElement('a');a.href=path;a.textContent=label;p.append(a);el('organizer-tools').append(p);}}
  if(!el('organizer-tools').childElementCount)el('organizer-tools').textContent='Aucun outil opérationnel autorisé pour ce compte.';
  for(const team of data.teams){const li=document.createElement('li');li.textContent=team.name;el('organizer-teams').append(li);}
  el('organizer-content').hidden=false;el('organizer-status').textContent='Campagne et autorisations actualisées.';
 }catch(e){el('organizer-status').textContent=e instanceof TypeError?'Lecture indisponible. Réessayez.':(e as Error).message;}
 finally{busy=false;button.disabled=false;}
}
button.addEventListener('click',()=>void refresh());void(async()=>{try{await startDemo();await refresh();}catch{el('organizer-status').textContent='Connexion requise.';}})();
