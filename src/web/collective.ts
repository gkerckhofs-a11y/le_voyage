import { distanceRatio } from '../map/geometry.ts';
import { journeyRoute } from '../map/route.ts';
import { mountJourneyMap } from './journey-map.ts';
import { festiveStops, stopStatus } from './festive-stops.ts';
import type { CollectiveJourneyView } from '../presentation/collective-view.ts';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const format=(n:string|number)=>Number(n).toLocaleString('fr-BE');
const date=(s:string)=>new Intl.DateTimeFormat('fr-BE',{day:'numeric',month:'long',timeZone:'Europe/Brussels'}).format(new Date(s+'T12:00:00Z'));
const params=new URLSearchParams(location.search),scenarios=['journey','before-freeze','frozen','tpe'];
const scenario=scenarios.includes(params.get('scenario')??'')?params.get('scenario')!:'journey';
let kiosk=params.get('kiosk')==='1';
function kioskStyle(){document.body.classList.toggle('kiosk',kiosk);$('kiosk-toggle').textContent=kiosk?'Quitter l’écran collectif':'Écran collectif';$('kiosk-toggle').setAttribute('aria-pressed',String(kiosk));$('kiosk-note').hidden=!kiosk;}
kioskStyle();
($('scenario') as HTMLSelectElement).value=scenario;
$('scenario').addEventListener('change',()=>{const url=new URL(location.href);url.searchParams.set('scenario',($('scenario') as HTMLSelectElement).value);location.assign(url);});
$('about-open').addEventListener('click',()=>($('about') as HTMLDialogElement).showModal());
$('about-close').addEventListener('click',()=>($('about') as HTMLDialogElement).close());
$('retry').addEventListener('click',()=>location.reload());
async function start(){
  const response=await fetch(`data/collective-${scenario}.json`);if(!response.ok)throw new Error('Journey unavailable');
  const data=await response.json() as CollectiveJourneyView;
  if(data.schemaVersion!==1||data.routeId!==journeyRoute.id)throw new Error('Unsupported journey');
  const reception=data.reception,last=data.history.at(-1),ratio=distanceRatio(data.distance,data.maximumKm);
  $('company').textContent=data.organizationName;$('demo-company').textContent=data.organizationName;
  $('distance').textContent=format(data.displayKm);$('maximum').textContent=`${format(data.maximumKm)} km`;
  $('distance-meter').setAttribute('aria-valuemax',String(data.maximumKm));$('distance-meter').setAttribute('aria-valuenow',data.displayKm);
  $('distance-meter').setAttribute('aria-valuetext',`${format(data.displayKm)} kilomètres collectifs sur ${format(data.maximumKm)}`);$('progress-fill').style.width=`${ratio*100}%`;
  $('week').textContent=`Semaine ${data.completedWeeks} / ${data.activeWeeks}`;
  $('week-date').textContent=last?`À partir du ${date(last.start)}`:'Le voyage commence';$('week-km').textContent=last?`${format(last.displayKm)} km`:'— km';
  $('reception-date').textContent=date(reception.date);$('freeze-date').textContent=date(reception.freezeDate);
  $('reception-level').textContent=`${reception.level} / ${reception.tiers.length}`;
  $('formula-title').textContent=reception.formulaTitle;
  $('formula-state').textContent=reception.frozen?'Formule figée':'Formule acquise';
  $('freeze-status').textContent=reception.frozen?`Gel effectué le ${date(reception.frozenOn!)}. Les kilomètres suivants ne changent plus la formule.`:`Les prestations peuvent s’enrichir jusqu’au gel du ${date(reception.freezeDate)}.`;
  $('reception-basis').textContent=`${format(reception.displayKm)} km retenus pour la réception${reception.frozen?' au gel':''}.`;
  $('base-title').textContent=reception.baseTitle;
  $('future-note').textContent=reception.frozen?'Les escales non atteintes au gel ne sont pas incluses.':'Les escales enrichissent une seule réception annuelle.';
  document.body.classList.toggle('reception-frozen',reception.frozen);
  const map=mountJourneyMap(data,{kind:'collective',color:'#427d86',label:'notre collectif',decorate:world=>festiveStops(world,data),autoRecenter:()=>kiosk});
  $('kiosk-toggle').addEventListener('click',()=>{kiosk=!kiosk;kioskStyle();const url=new URL(location.href);if(kiosk)url.searchParams.set('kiosk','1');else url.searchParams.delete('kiosk');history.replaceState(null,'',url);map.recenter();});
  for(const tier of reception.tiers){
    const li=document.createElement('li'),button=document.createElement('button'),number=document.createElement('span'),copy=document.createElement('span'),title=document.createElement('strong'),state=document.createElement('span'),detail=document.createElement('span');
    button.className='tier-card';button.dataset.level=String(tier.level);button.dataset.status=tier.status;
    button.setAttribute('aria-label',`${tier.title}, ${stopStatus(tier,reception.frozen)}. Voir cette escale sur la carte.`);
    number.className='tier-number';number.textContent=String(tier.level);copy.className='tier-copy';title.textContent=tier.title;state.className='tier-status';state.textContent=stopStatus(tier,reception.frozen);detail.className='tier-description';detail.textContent=tier.description;
    copy.append(state,title,detail);button.append(number,copy);li.append(button);$('tier-list').append(li);
    button.addEventListener('click',()=>{map.focusRatio(tier.km/data.maximumKm);$('map-status').textContent=`${tier.title}. ${stopStatus(tier,reception.frozen)}.`;});
  }
  $('collective-content').dataset.ready='true';
}
start().catch(()=>{$('fallback').hidden=false;$('collective-content').hidden=true;($('kiosk-toggle') as HTMLButtonElement).disabled=true;});
