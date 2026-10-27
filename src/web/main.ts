import { distanceRatio } from '../map/geometry.ts';
import { journeyRoute as route } from '../map/route.ts';
import { mountJourneyMap } from './journey-map.ts';
import { startDemo, readDemo, sendDemo } from './demo-client.ts';
import type { TeamJourneyView } from '../presentation/journey-view.ts';
import type { TeamFeed, PublicEvent } from '../application/events.ts';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const format=(n:string|number)=>Number(n).toLocaleString('fr-BE');
const date=(s:string)=>new Intl.DateTimeFormat('fr-BE',{day:'numeric',month:'long',timeZone:'Europe/Brussels'}).format(new Date(s+'T12:00:00Z'));
const show=(id:string)=>($(id) as HTMLDialogElement).showModal();
let feed:TeamFeed,map:ReturnType<typeof mountJourneyMap>,busy=false;
let revealQueue:Extract<PublicEvent,{kind:'attention'}>[]=[];
for(const el of document.querySelectorAll<HTMLDialogElement>('dialog')){
  el.querySelector('button')?.addEventListener('click',()=>el.close());
  el.addEventListener('click',e=>{if(e.target===el){const b=el.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)el.close();}});
}
$('about-open').addEventListener('click',()=>show('about'));
$('journal-open').addEventListener('click',()=>show('journal'));
$('attentions-open').addEventListener('click',()=>show('attentions'));
$('retry').addEventListener('click',()=>location.reload());
$('reveal').addEventListener('close',()=>showNextReveal());
function showNextReveal(){
  const event=revealQueue.shift();if(!event)return;
  $('reveal-title').textContent=event.title;$('reveal-description').textContent=event.description;
  $('reveal-date').textContent=`Découverte le ${date(event.date)}`;show('reveal');
}
function showReveals(events:PublicEvent[]){
  revealQueue=events.filter((e):e is Extract<PublicEvent,{kind:'attention'}>=>e.kind==='attention');
  if(revealQueue.length){($('attentions') as HTMLDialogElement).close();showNextReveal();}
}
function renderJourney(data:TeamJourneyView){
  const ratio=distanceRatio(data.distance,data.maximumKm),last=data.history.at(-1);
  $('team-name').textContent=data.team.name;$('company').textContent=data.organizationName;
  $('distance').textContent=format(data.displayKm);$('maximum').textContent=`${format(data.maximumKm)} km`;
  $('distance-meter').setAttribute('aria-valuemax',String(data.maximumKm));$('distance-meter').setAttribute('aria-valuenow',data.displayKm);
  $('distance-meter').setAttribute('aria-valuetext',`${format(data.displayKm)} kilomètres parcourus sur ${format(data.maximumKm)}`);
  $('progress-fill').style.width=`${ratio*100}%`;$('week').textContent=`Semaine ${data.completedWeeks} / ${data.activeWeeks}`;
  if(last){const end=new Date(last.endExclusive+'T12:00:00Z');end.setUTCDate(end.getUTCDate()-1);$('week-date').textContent=`Du ${date(last.start)} au ${date(end.toISOString().slice(0,10))}`;$('week-km').textContent=`${format(last.displayKm)} km`;}else{$('week-date').textContent='Le voyage commence';$('week-km').textContent='— km';}
  document.querySelector<HTMLElement>('.color-dot')!.style.background=data.team.color;
  $('history-list').replaceChildren();
  for(const w of [...data.history].reverse()){
    const li=document.createElement('li'),label=document.createElement('span'),small=document.createElement('small'),km=document.createElement('strong');
    label.textContent=`Semaine ${w.week}`;small.textContent=`À partir du ${date(w.start)}`;label.append(small);km.textContent=`+ ${format(w.displayKm)} km`;li.append(label,km);$('history-list').append(li);
  }
}
function renderAttentions(){
  $('attention-list').replaceChildren();$('attention-empty').hidden=feed.attentions.length>0;
  for(const attention of [...feed.attentions].reverse()){
    if(attention.kind!=='attention')continue;
    const li=document.createElement('li'),title=document.createElement('h3'),description=document.createElement('p'),status=document.createElement('span'),when=document.createElement('small');
    li.className='attention-card';li.dataset.attentionId=attention.id;title.textContent=attention.title;description.textContent=attention.description;
    status.className='attention-status';status.textContent='À composer';when.textContent=`Découverte le ${date(attention.date)}`;li.append(status,title,description,when);
    if(attention.unread){const button=document.createElement('button');button.textContent='Découvrir cette attention';button.addEventListener('click',()=>void discover(attention.id));li.append(button);}
    $('attention-list').append(li);
  }
  const unread=feed.attentions.filter(a=>a.unread).length;
  $('attentions-open').textContent=unread?`Mes attentions (${unread})`:'Mes attentions';
  ($('advance') as HTMLButtonElement).disabled=busy||!feed.canAdvance;
  $('advance').textContent=feed.canAdvance?'Simuler une semaine':'Voyage simulé terminé';
}
function renderFeed(){renderJourney(feed.journey);renderAttentions();}
async function discover(id:string){
  if(busy)return;busy=true;
  try{const result=await sendDemo<{events:PublicEvent[];feed:TeamFeed}>('claim',{eventIds:[id]});feed=result.feed;renderFeed();await map.update(feed.journey,false);showReveals(result.events);}
  catch{$('attention-error').textContent='La découverte ne peut pas être confirmée. Votre attention reste dans cet historique.';}
  finally{busy=false;renderAttentions();}
}
$('advance').addEventListener('click',async()=>{
  if(busy||!feed.canAdvance)return;busy=true;renderAttentions();$('advance-status').textContent='La semaine fictive se termine…';
  try{
    const result=await sendDemo<{applied:boolean;feed:TeamFeed}>('advance',{revision:feed.revision});
    const receipt=await sendDemo<{events:PublicEvent[];feed:TeamFeed}>('claim',{eventIds:result.feed.unseenEventIds});
    feed=receipt.feed;renderFeed();await map.update(feed.journey,receipt.events.some(e=>e.kind==='progress'));
    $('advance-status').textContent=result.applied?'La progression est enregistrée.':'Cette semaine était déjà enregistrée.';showReveals(receipt.events);
  }catch{
    // A lost response may follow a committed transaction. Do not retry against a new revision blindly.
    $('advance-status').textContent='La confirmation n’a pas été reçue. Rechargez la page pour retrouver la progression enregistrée.';
    $('reload-progress').hidden=false;return;
  }
  busy=false;renderAttentions();
});
$('reload-progress').addEventListener('click',()=>location.reload());
async function start(){
  await startDemo();feed=await readDemo<TeamFeed>('team');const data=feed.journey;
  if(data.schemaVersion!==1||data.routeId!==route.id||!/^#[a-fA-F0-9]{6}$/.test(data.team.color)||!data.history.length)throw new Error('Unsupported journey');
  renderFeed();map=mountJourneyMap(data,{kind:'team',color:data.team.color,label:data.team.name});
  // Initial reads never replay motion or open a reveal. Unread attentions remain available on demand.
}
start().catch(()=>{
  $('fallback').hidden=false;document.querySelector<HTMLElement>('.journey-shell')!.hidden=true;
  for(const id of ['journal-open','attentions-open','advance'])$(id).setAttribute('disabled','');
});
