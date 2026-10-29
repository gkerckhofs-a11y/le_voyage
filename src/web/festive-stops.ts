import { positionAt } from '../map/geometry.ts';
import { journeyRoute } from '../map/route.ts';
import type { CollectiveJourneyView } from '../presentation/collective-view.ts';
const ns='http://www.w3.org/2000/svg';
export function stopStatus(tier:CollectiveJourneyView['reception']['tiers'][number],frozen:boolean){
  if(tier.status==='frozen')return 'Formule figée';
  if(tier.included)return 'Atteint';
  return frozen?'Non retenu après gel':tier.status==='next'?'Prochaine escale':'Non atteint';
}
/** Landscape ornaments only: the server-projected status is never inferred from car position. */
export function festiveStops(world:SVGGElement,data:CollectiveJourneyView){
  const layer=document.createElementNS(ns,'g');layer.id='reception-stops';
  for(const tier of data.reception.tiers){
    const point=positionAt(journeyRoute,tier.km/data.maximumKm),angle=point.angle*Math.PI/180;
    const side=tier.level%2?1:-1,x=point.x-Math.sin(angle)*155*side,y=point.y+Math.cos(angle)*155*side;
    const stop=document.createElementNS(ns,'g');stop.classList.add('festive-stop');stop.dataset.level=String(tier.level);stop.dataset.status=tier.status;
    stop.setAttribute('transform',`translate(${x} ${y})`);stop.setAttribute('role','img');
    stop.setAttribute('aria-label',`${tier.title} — ${stopStatus(tier,data.reception.frozen)}`);
    const color=tier.included?'#376450':tier.status==='next'?'#ac4c33':'#747b60';
    stop.innerHTML=`<path d="M${point.x-x} ${point.y-y}L0 0" stroke="#f2dfae" stroke-width="6" stroke-dasharray="8 7"/>
      <ellipse cy="22" rx="82" ry="39" fill="#f1dda7" stroke="#b1ab78" stroke-width="2"/>
      <path d="M-79-50Q0-4 79-50" fill="none" stroke="#766951" stroke-width="3"/>
      <path d="M-68-44l18 8-13 17zM-33-31l19 5-12 19zM4-26l18-3-7 20zM40-35l18-7-3 22z" fill="#c76841"/>
      <path d="M-78-53V20M78-53V20" stroke="#847455" stroke-width="5"/>
      ${tier.level===4?'<path d="M-53 4L0-56 53 4Z" fill="#fbefd0" stroke="#9d6a48" stroke-width="2"/><path d="M0-56L-17 4H17Z" fill="#c76841"/><path d="M-47 4V32H47V4" fill="#f4e1ad"/><path d="M-12 32V8H12V32" fill="#5e7561"/>':
      tier.level===3?'<rect x="-42" y="-6" width="84" height="36" rx="5" fill="#c8a371"/><path d="M-29 22V-25L17-36V12M-29-14L17-25" fill="none" stroke="#355e49" stroke-width="6"/><ellipse cx="-36" cy="24" rx="12" ry="8" fill="#355e49"/><ellipse cx="10" cy="14" rx="12" ry="8" fill="#355e49"/>':
      '<rect x="-46" y="-18" width="92" height="44" rx="8" fill="#947456"/><rect x="-42" y="-21" width="84" height="40" rx="6" fill="#f4e8cb"/><circle cx="-25" cy="-1" r="11" fill="#fffbeb" stroke="#b1aa80"/><circle cx="25" cy="-1" r="11" fill="#fffbeb" stroke="#b1aa80"/><ellipse cy="-3" rx="12" ry="7" fill="#c97748"/><path d="M-35 34H35M-35-34H35" stroke="#8d744e" stroke-width="7"/>'}
      <rect x="-116" y="48" width="232" height="68" rx="10" fill="#fffcf1" stroke="${color}" stroke-width="2"/>
      <circle cx="-105" cy="52" r="17" fill="${color}"/><text class="stop-number" x="-105" y="58">${tier.level}</text>`;
    const title=document.createElementNS(ns,'text');title.setAttribute('y','76');title.classList.add('stop-title');title.textContent=tier.title;
    const status=document.createElementNS(ns,'text');status.setAttribute('y','99');status.classList.add('stop-state');status.textContent=stopStatus(tier,data.reception.frozen);
    stop.append(title,status);layer.append(stop);
  }
  world.insertBefore(layer,world.querySelector('#collective-car'));
}
