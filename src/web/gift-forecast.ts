import {startDemo} from './demo-client.js';
type Forecast={tenantId:string;campaignId:string;teamId:string;client:string;team:string;asOf:string;status:string;distanceKm:string;milestoneNumber:number|null;thresholdKm:number|null;allocatedCents:number|null;remainingKm:number|null;sampleSize:number;meanKm:string|null;activeWeeksRemaining:number;estimatedActiveWeeks:number|null;fastActiveWeeks:number|null;slowActiveWeeks:number|null;estimatedDate:string|null};
const el=(id:string)=>document.getElementById(id)!,client=el('forecast-client') as HTMLSelectElement,horizon=el('forecast-horizon') as HTMLSelectElement,button=el('refresh-forecasts') as HTMLButtonElement;
const statuses:Record<string,string>={'estimated':'À anticiper · cadeau non acquis','no-pending-milestone':'Tous les paliers sont acquis','awaiting-entitlement':'Franchissement à vérifier','future-data':'Dates des données à vérifier','campaign-ended':'Campagne terminée','pending-closure':'Clôtures en attente','insufficient-history':'Historique insuffisant','stale-history':'Historique trop ancien','no-progress':'Progression récente nulle','beyond-calendar':'Au-delà du calendrier restant'};
let rows:Forecast[]=[],busy=false;
const money=(n:number)=>new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format(n/100);
function paragraph(text:string){const p=document.createElement('p');p.textContent=text;return p;}
function render(){
 const list=el('forecast-list');list.replaceChildren();
 for(const row of rows){if(client.value&&row.tenantId!==client.value)continue;if(horizon.value!=='all'&&row.estimatedDate&&Date.parse(row.estimatedDate)-Date.parse(row.asOf)>Number(horizon.value)*86400000)continue;
  const card=document.createElement('article');card.className='gift-editor';card.dataset.team=row.teamId;const title=document.createElement('h2');title.textContent=row.client+' · '+row.team;
  const status=paragraph(statuses[row.status]??'Prévision indisponible');status.className='forecast-state';card.append(title,status,paragraph('Calcul au '+row.asOf+' · '+row.distanceKm+' km acquis'));
  if(row.milestoneNumber!==null)card.append(paragraph('Palier '+row.milestoneNumber+' · '+row.thresholdKm+' km · distance restante ≈ '+row.remainingKm+' km'),paragraph('Budget configuré : '+money(row.allocatedCents!)));
  if(row.meanKm!==null)card.append(paragraph('Moyenne récente ≈ '+row.meanKm+' km par semaine active · '+row.sampleSize+' observations'));
  if(row.estimatedActiveWeeks!==null)card.append(paragraph('Estimation : '+row.estimatedActiveWeeks+' semaine(s) active(s). Scénarios observés : '+row.fastActiveWeeks+' à '+(row.slowActiveWeeks??'un nombre indéterminé de')+' semaine(s).'));
  card.append(paragraph(row.estimatedDate?'Date indicative de clôture : '+row.estimatedDate+' · aucune garantie de franchissement.':'Aucune date estimable dans les conditions actuelles.'),paragraph(row.activeWeeksRemaining+' semaine(s) active(s) non clôturée(s).'));list.append(card);
 }
 if(!list.childElementCount)list.append(paragraph('Aucune prévision pour ces filtres.'));
}
async function refresh(){if(busy)return;busy=true;button.disabled=true;rows=[];el('forecast-list').replaceChildren();el('forecast-status').textContent='Actualisation…';
 try{const r=await fetch('/api/gifts/forecasts');if(!r.ok)throw Error('Prévisions indisponibles ou accès retiré.');const data=await r.json();rows=data.rows;const previous=client.value;client.replaceChildren(new Option('Tous les clients autorisés',''));const seen=new Set<string>();for(const row of rows)if(!seen.has(row.tenantId)){client.append(new Option(row.client,row.tenantId));seen.add(row.tenantId);}if(previous&&!seen.has(previous))client.append(new Option('Client devenu indisponible',previous));client.value=previous;render();el('forecast-status').textContent='Prévisions actualisées.';}
 catch(e){client.replaceChildren(new Option('Accès indisponible',''));el('forecast-status').textContent=e instanceof TypeError?'Lecture indisponible. Réessayez.':(e as Error).message;}
 finally{busy=false;button.disabled=false;}}
client.onchange=render;horizon.onchange=render;button.onclick=()=>void refresh();
void(async()=>{try{await startDemo();for(const id of ['my-week-link','team-vote-link','gift-preferences-link'])document.getElementById(id)?.remove();await refresh();}catch{el('forecast-status').textContent='Connexion requise.';}})();
