import { distanceRatio, positionAt, roadsideMarkers } from '../map/geometry.ts';
import { journeyRoute as route, landscapeZones } from '../map/route.ts';
import { MapCamera } from './camera.ts';
import { landscape, carMarkup } from './landscape.ts';
import type { TeamJourneyView } from '../presentation/journey-view.ts';

const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
const format = (n:string|number) => Number(n).toLocaleString('fr-BE');
const date = (s:string) => new Intl.DateTimeFormat('fr-BE',{day:'numeric',month:'long',timeZone:'Europe/Brussels'}).format(new Date(s+'T12:00:00Z'));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let frame=0, statusTimer=0;
function announce(message:string) { $('map-status').textContent=message;$('map-status').classList.add('visible');clearTimeout(statusTimer);statusTimer=window.setTimeout(()=>$('map-status').classList.remove('visible'),2400); }
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
  const world=document.getElementById('world') as unknown as SVGGElement;
  world.innerHTML=landscape(route)+`
    <g aria-hidden="true"><path d="${route.path}" fill="none" stroke="#5e7653" stroke-width="66" opacity=".18" transform="translate(4 6)"/>
    <path d="${route.path}" fill="none" stroke="#f3e6c5" stroke-width="61" stroke-linecap="round"/>
    <path id="road" d="${route.path}" fill="none" stroke="#c6b28e" stroke-width="45" stroke-linecap="round"/>
    <path d="${route.path}" fill="none" stroke="#f6ebce" stroke-width="2.5" stroke-dasharray="16 17" opacity=".9"/>
    ${roadsideMarkers(route).map(m=>`<g class="road-marker" data-marker="${m.number}" transform="translate(${m.x} ${m.y})"><ellipse cx="3" cy="12" rx="14" ry="5" fill="#405936" opacity=".18"/><path d="M-12 10V-11Q-12-24 0-24Q12-24 12-11V10Z" fill="#f8f2d8" stroke="#818d70" stroke-width="1.3"/><path d="M-11-9H11" stroke="#a94433" stroke-width="6"/><text y="6">${m.number}</text></g>`).join('')}
    <g transform="translate(240 2180) rotate(-8)"><path d="M-45 24V58M45 24V58" stroke="#76684c" stroke-width="7"/><rect x="-68" y="-10" width="136" height="42" rx="4" fill="#ecddac" stroke="#887b55" stroke-width="3"/><text text-anchor="middle" y="17" fill="#5d6548" font-family="Georgia" font-size="20">Le départ</text></g>
    </g>
    <g id="team-car" data-testid="team-car" role="img" aria-label="Notre voiture"><circle class="car-shadow-ring" r="67"/><g id="car-heading">${carMarkup(data.team.color)}</g><g transform="translate(0 90)"><rect x="-48" y="-17" width="96" height="25" rx="12" fill="#fffbee" stroke="#d0d9b6"/><text class="car-location-label" y="0">Nous sommes ici</text></g></g>`;
  const car=document.getElementById('team-car')!,heading=document.getElementById('car-heading')!;
  car.setAttribute('aria-label',`Voiture de ${data.team.name}, ${format(data.displayKm)} kilomètres`);
  let follow=true,visualRatio=ratio;
  function position(r:number){
    visualRatio=r;const p=positionAt(route,r);car.setAttribute('transform',`translate(${p.x} ${p.y})`);heading.setAttribute('transform',`rotate(${p.angle+90})`);
    car.setAttribute('data-ratio',String(r));car.setAttribute('data-x',String(p.x));car.setAttribute('data-y',String(p.y));
    $('chapter').textContent=(landscapeZones.find(z=>r>=z.from&&r<z.to)??landscapeZones.at(-1)!).name;
    return p;
  }
  const initial=position(ratio);
  const camera=new MapCamera($('map'),world,route.width,route.height,{x:initial.x,y:initial.y,zoom:innerWidth<=700?.85:.78},()=>{follow=false;});
  camera.center(initial);
  function recenter(){follow=true;camera.center(positionAt(route,visualRatio));announce('Vous avez retrouvé votre voiture.');}
  $('recenter').addEventListener('click',recenter);
  $('map').addEventListener('keydown',e=>{if(e.key==='Home'){e.preventDefault();recenter();}});
  $('zoom-in').addEventListener('click',()=>{camera.zoom(1.2);if(follow)camera.center(positionAt(route,visualRatio));});
  $('zoom-out').addEventListener('click',()=>{camera.zoom(1/1.2);if(follow)camera.center(positionAt(route,visualRatio));});
  $('map').addEventListener('camera-change',()=>{
    ($('zoom-in') as HTMLButtonElement).disabled=camera.state.zoom>=1.799;
    ($('zoom-out') as HTMLButtonElement).disabled=camera.state.zoom<=.451;
  });
  let collapsed=false;
  $('collapse').addEventListener('click',()=>{
    collapsed=!collapsed;$('card-details').hidden=collapsed;$('collapse').textContent=collapsed?'+':'−';
    $('collapse').setAttribute('aria-expanded',String(!collapsed));$('collapse').setAttribute('aria-label',collapsed?'Déplier le panneau de progression':'Replier le panneau de progression');
    document.querySelector('.journey-shell')!.classList.toggle('panel-collapsed',collapsed);
  });
  $('simple-toggle').addEventListener('click',()=>{
    const simple=$('map').classList.toggle('simplified');$('simple-toggle').setAttribute('aria-pressed',String(simple));
    $('simple-toggle').textContent=simple?'Vue illustrée':'Vue simplifiée';announce(simple?'Les détails du paysage sont masqués.':'Le paysage est de nouveau visible.');
  });
  function stopReplay(){cancelAnimationFrame(frame);frame=0;position(ratio);if(follow)camera.center(positionAt(route,ratio));$('map').classList.remove('is-replaying');($('replay') as HTMLButtonElement).disabled=false;}
  reduced.addEventListener('change',()=>{if(reduced.matches&&frame)stopReplay();});
  $('replay').addEventListener('click',()=>{
    stopReplay();follow=true;
    if(reduced.matches){recenter();announce(`Dernière avancée : ${last.displayKm} kilomètres. Animation désactivée.`);return;}
    const before=data.history.at(-2)?.cumulative??{numerator:'0',denominator:'1'},from=distanceRatio(before,data.maximumKm);
    ($('replay') as HTMLButtonElement).disabled=true;$('map').classList.add('is-replaying');announce(`Relecture de notre dernière avancée : ${last.displayKm} km.`);
    const started=performance.now();
    const animate=(now:number)=>{const t=Math.min(1,(now-started)/2400),eased=t*t*(3-2*t),p=position(from+(ratio-from)*eased);if(follow)camera.center(p);if(t<1)frame=requestAnimationFrame(animate);else stopReplay();};
    frame=requestAnimationFrame(animate);
  });
  // Resize recenters only while following. Free exploration preserves the user's camera.
  window.addEventListener('resize',()=>{if(follow)camera.center(positionAt(route,visualRatio));});
  $('map').dataset.ready='true';
}
start().catch(()=>{
  $('fallback').hidden=false;document.querySelector<HTMLElement>('.journey-shell')!.hidden=true;
  $('journal-open').setAttribute('disabled','');
});
