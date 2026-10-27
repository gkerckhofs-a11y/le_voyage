import { distanceRatio } from '../map/geometry.ts';
import { journeyRoute as route } from '../map/route.ts';
import { mountJourneyMap } from './journey-map.ts';
import type { TeamJourneyView } from '../presentation/journey-view.ts';

const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
const format = (n:string|number) => Number(n).toLocaleString('fr-BE');
const date = (s:string) => new Intl.DateTimeFormat('fr-BE',{day:'numeric',month:'long',timeZone:'Europe/Brussels'}).format(new Date(s+'T12:00:00Z'));
function dialog(id:string) { const el=$(id) as HTMLDialogElement; el.showModal(); }
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(el=>{
  el.querySelector('button')?.addEventListener('click',()=>el.close());
  el.addEventListener('click',e=>{if(e.target===el){const b=el.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)el.close();}});
});
$('about-open').addEventListener('click',()=>dialog('about'));
$('journal-open').addEventListener('click',()=>dialog('journal'));
$('retry').addEventListener('click',()=>location.reload());

async function start(){
  const response=await fetch('data/team.json');
  if(!response.ok)throw new Error('Journey unavailable');
  const data=await response.json() as TeamJourneyView;
  if(data.schemaVersion!==1 || data.routeId!==route.id || !/^#[a-fA-F0-9]{6}$/.test(data.team.color) || !data.history.length) throw new Error('Unsupported journey');
  const ratio=distanceRatio(data.distance,data.maximumKm),last=data.history.at(-1)!;
  $('team-name').textContent=data.team.name;$('company').textContent=data.organizationName;
  $('distance').textContent=format(data.displayKm);$('maximum').textContent=`${format(data.maximumKm)} km`;
  $('distance-meter').setAttribute('aria-valuemax',String(data.maximumKm));$('distance-meter').setAttribute('aria-valuenow',data.displayKm);
  $('distance-meter').setAttribute('aria-valuetext',`${format(data.displayKm)} kilomètres parcourus sur ${format(data.maximumKm)}`);
  $('progress-fill').style.width=`${ratio*100}%`;
  $('week').textContent=`Semaine ${data.completedWeeks} / ${data.activeWeeks}`;
  const end=new Date(last.endExclusive+'T12:00:00Z');end.setUTCDate(end.getUTCDate()-1);
  $('week-date').textContent=`Du ${date(last.start)} au ${date(end.toISOString().slice(0,10))}`;
  $('week-km').textContent=`${format(last.displayKm)} km`;
  document.querySelector<HTMLElement>('.color-dot')!.style.background=data.team.color;
  for(const w of [...data.history].reverse()){
    const li=document.createElement('li'),label=document.createElement('span'),small=document.createElement('small'),km=document.createElement('strong');
    label.textContent=`Semaine ${w.week}`;small.textContent=`À partir du ${date(w.start)}`;label.append(small);km.textContent=`+ ${format(w.displayKm)} km`;li.append(label,km);$('history-list').append(li);
  }
  mountJourneyMap(data,{kind:'team',color:data.team.color,label:data.team.name});
}
start().catch(()=>{
  $('fallback').hidden=false;document.querySelector<HTMLElement>('.journey-shell')!.hidden=true;
  $('journal-open').setAttribute('disabled','');
});
