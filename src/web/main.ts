import {setNavigationCompany} from './team-navigation.js';
import { distanceRatio, positionAt, groupNearbyPoints } from '../map/geometry.ts';
import { journeyRoute as route } from '../map/route.ts';
import { mountJourneyMap } from './journey-map.ts';
import { startDemo, readDemo, sendDemo } from './demo-client.ts';
import type { TeamJourneyView } from '../presentation/journey-view.ts';
import type { TeamFeed, PublicEvent } from '../application/events.ts';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const format=(n:string|number)=>Number(n).toLocaleString('fr-BE');
const date=(s:string)=>new Intl.DateTimeFormat('fr-BE',{day:'numeric',month:'long',timeZone:'Europe/Brussels'}).format(new Date(s+'T12:00:00Z'));
const show=(id:string)=>($(id) as HTMLDialogElement).showModal();
let stageData:TeamJourneyView;
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
function renderStages(){
  const list=$('stage-list');list.replaceChildren();
  const world=document.getElementById('world');document.getElementById('gift-route-stages')?.remove();
  const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g');group.id='gift-route-stages';
  for(const [i,stage] of stageData.stages.entries()){
    const state=stage.status==='unlocked'?'Débloqué':feed.closure?'Non atteint':stage.status==='next'?'Prochain':'À venir';
    const copy=`${i+1}. ${stage.label} · ${format(stage.thresholdKm)} km · ${state}${stage.status==='unlocked'?'':` · ${feed.closure?'il manquait':'encore'} ${format(stage.remainingKm)} km`}`;
    const li=document.createElement('li'),button=document.createElement('button');button.textContent=copy;button.addEventListener('click',()=>map.focusRatio(stage.thresholdKm/stageData.maximumKm));button.id=`gift-stage-${i+1}`;li.append(button);list.append(li);
    const p=positionAt(route,stage.thresholdKm/stageData.maximumKm),marker=document.createElementNS(ns,'g');marker.classList.add('gift-route-marker');marker.dataset.status=stage.status;marker.setAttribute('transform',`translate(${p.x} ${p.y})`);marker.setAttribute('role','img');marker.setAttribute('aria-label',copy);
    marker.innerHTML=`<circle r="28" fill="${stage.status==='unlocked'?'#355e49':'#a94433'}" stroke="#fff8e9" stroke-width="4"/><path d="M-13-5H13V14H-13Z M-16-11H16V-4H-16Z M0-11V14 M0-11C-22-26-18 0 0-11C22-26 18 0 0-11" fill="none" stroke="#fff8e9" stroke-width="2"/><text y="49" text-anchor="middle" fill="#213f30" stroke="#fff8e9" stroke-width="4" paint-order="stroke" font-size="18">${i+1} · ${format(stage.thresholdKm)} km</text>`;group.append(marker);
  }
  world?.append(group);updateGiftLayout();
}
function updateGiftLayout(){
 const zoom=Number($('map').dataset.zoom);if(!Number.isFinite(zoom)||zoom<=0||!stageData)return;
 const markers=[...document.querySelectorAll<SVGGElement>('.gift-route-marker')];
 const points=stageData.stages.map(s=>positionAt(route,s.thresholdKm/stageData.maximumKm));
 const compact=zoom<.5,groups=compact?groupNearbyPoints(points.map(p=>({x:p.x*zoom,y:p.y*zoom})),58):points.map((_,i)=>[i]);
 document.getElementById('gift-clusters')?.remove();const ns='http://www.w3.org/2000/svg',layer=document.createElementNS(ns,'g');layer.id='gift-clusters';
 markers.forEach((marker,i)=>{marker.removeAttribute('hidden');marker.removeAttribute('aria-hidden');marker.setAttribute('transform',`translate(${points[i].x} ${points[i].y}) scale(${compact?.55/zoom:Math.min(2.5,Math.max(.6,.7/zoom))})`);const label=marker.querySelector('text')!;label.textContent=compact?String(i+1):`${i+1} · ${format(stageData.stages[i].thresholdKm)} km`;});
 for(const members of groups){
  if(members.length<2)continue;
  members.forEach(i=>{markers[i].setAttribute('hidden','');markers[i].setAttribute('aria-hidden','true');});
  const x=members.reduce((v,i)=>v+points[i].x,0)/members.length,y=members.reduce((v,i)=>v+points[i].y,0)/members.length;
  const badge=document.createElementNS(ns,'g');badge.classList.add('gift-cluster');badge.dataset.members=members.map(i=>i+1).join(',');badge.setAttribute('transform',`translate(${x} ${y}) scale(${1/zoom})`);badge.setAttribute('role','button');badge.setAttribute('tabindex','0');badge.setAttribute('aria-label',`${members.length} paliers regroupés : ${members.map(i=>i+1).join(', ')}. Consulter leurs kilomètres dans la liste.`);
  badge.innerHTML=`<circle r="22" fill="#a94433" stroke="#fff8e9" stroke-width="3"/><text y="5" text-anchor="middle" fill="#fff8e9" font-size="15" font-weight="700">${members.length}</text>`;
  const open=()=>{const first=$(`gift-stage-${members[0]+1}`);first.scrollIntoView({block:'center'});first.focus({preventScroll:true});};badge.addEventListener('pointerdown',e=>e.stopPropagation());badge.addEventListener('click',open);badge.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});layer.append(badge);
 }
 document.getElementById('world')?.append(layer);
 $('gift-map-legend').hidden=!compact;
}
function renderJourney(data:TeamJourneyView){
  stageData=data;renderStages();
  const ratio=distanceRatio(data.distance,data.maximumKm),last=data.history.at(-1);
  $('team-name').textContent=data.team.name;$('company').textContent=data.organizationName;setNavigationCompany(data.organizationName);
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
    status.className='attention-status';status.textContent=({'to-compose':'À composer',ready:'Prête à remettre',delivered:'Remise confirmée',incident:'Préparation à suivre'})[attention.status];when.textContent=`Découverte le ${date(attention.date)}`;li.append(status,title,description,when);
    if(attention.unread){const button=document.createElement('button');button.textContent='Découvrir cette attention';button.addEventListener('click',()=>void discover(attention.id));li.append(button);}
    $('attention-list').append(li);
  }
  const unread=feed.attentions.filter(a=>a.unread).length;
  $('attentions-open').textContent=unread?`Mes attentions (${unread})`:'Mes attentions';
  ($('advance') as HTMLButtonElement).disabled=busy||!feed.canAdvance;
  $('advance').textContent=feed.canAdvance?'Simuler une semaine':'Voyage simulé terminé';
}
function renderClosure(){
  const end=feed.closure;$('journey-closure').hidden=!end;
  if(!end||end.kind!=='closure')return;
  $('closure-summary').textContent=`${format(feed.journey.displayKm)} km réellement parcourus. Votre voiture fait halte ${distanceRatio(end.distance,end.maximumKm)>=1?'au terminus':'près de votre dernière position gagnée'}.`;
  const count=end.acquiredThresholds.length;
  $('closure-gifts').textContent=count?`${count} palier${count>1?'s':''} cadeau${count>1?'x':''} acquis : ${end.acquiredThresholds.map(k=>format(k)+' km').join(', ')}. Leur préparation et leur remise restent consultables dans Mes attentions.`:'Aucun palier cadeau acquis cette année. Votre voyage garde toute sa place dans notre histoire commune.';
  document.querySelector<HTMLElement>('.team-note')!.textContent='Une année partagée, des souvenirs à garder.';
}
function renderFeed(){renderJourney(feed.journey);renderAttentions();renderClosure();}
$('arrival-replay').addEventListener('click',async()=>{
  if(busy||!feed.closure)return;busy=true;($('arrival-replay') as HTMLButtonElement).disabled=true;
  try{await map.park(true);}finally{busy=false;($('arrival-replay') as HTMLButtonElement).disabled=false;}
});
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
    if(feed.closure)await map.park(receipt.events.some(e=>e.kind==='closure'));
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
  if(data.schemaVersion!==1||data.routeId!==route.id||!/^#[a-fA-F0-9]{6}$/.test(data.team.color))throw new Error('Unsupported journey');
  renderFeed();map=mountJourneyMap(data,{kind:'team',color:data.team.color,label:data.team.name});renderStages();if(feed.closure)await map.park(false);
  $('map').addEventListener('camera-change',updateGiftLayout);updateGiftLayout();
  if(new URLSearchParams(location.search).get('attentions')==='1')show('attentions');
  // Initial reads never replay motion or open a reveal. Unread attentions remain available on demand.
}
start().catch(()=>{
  $('fallback').hidden=false;document.querySelector<HTMLElement>('.journey-shell')!.hidden=true;
  for(const id of ['journal-open','attentions-open','advance'])$(id).setAttribute('disabled','');
});
