import {positionAt} from '../map/geometry.ts';
import type {Route} from '../map/geometry.ts';
/** Decorative lay-by beside the earned point, never a kilometre increment. */
export function parkingPose(route:Route,ratio:number,progress=1){
 const p=positionAt(route,ratio),a=p.angle*Math.PI/180,t=Math.max(0,Math.min(1,progress));
 const lateral=110*t,forward=22*Math.sin(Math.PI*t);
 return {x:p.x+Math.cos(a)*forward-Math.sin(a)*lateral,y:p.y+Math.sin(a)*forward+Math.cos(a)*lateral,angle:p.angle+90-18*Math.sin(Math.PI*t)};
}
export function parkingMarkup(route:Route,ratio:number){
 const p=positionAt(route,ratio);
 return `<g id="arrival-parking" transform="translate(${p.x} ${p.y}) rotate(${p.angle})" aria-hidden="true"><path d="M0 0Q35 50 0 110" fill="none" stroke="#f3e6c5" stroke-width="58"/><rect x="-78" y="69" width="156" height="103" rx="24" fill="#dfd0ad" stroke="#f3e6c5" stroke-width="8"/><path d="M-32 78V148H32V78" fill="none" stroke="#fff8e5" stroke-width="3"/>${ratio>=1?'<path d="M-68 174V220H68V174L0 148Z" fill="#567762" stroke="#f5e9cb" stroke-width="5"/><rect x="-26" y="185" width="52" height="35" fill="#e6d5aa"/>':'<path d="M-70 182H70M-57 176V201M57 176V201" fill="none" stroke="#7a6245" stroke-width="7"/>'}</g>`;
}
