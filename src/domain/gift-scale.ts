import {thresholds} from './scoring.ts';
export type GiftScaleVersion='v4-linear-1'|'v5-early-simulation-1';
/** Immutable profiles. Missing version deliberately preserves historical V4 behavior. */
export function giftScale(activeWeeks:number,count:number,version:GiftScaleVersion='v4-linear-1'){
 if(version==='v4-linear-1')return {version,simulation:false,granularityKm:10,thresholds:thresholds(activeWeeks,count,'gift')};
 if(version!=='v5-early-simulation-1')throw new Error('Unknown gift scale version');
 if(!Number.isSafeInteger(activeWeeks)||activeWeeks<1||activeWeeks>60||!Number.isSafeInteger(count)||count<1||count>8)throw new Error('V5 simulation requires 1–60 active weeks and 1–8 gifts');
 const maximum=activeWeeks*100;
 const raw=Array.from({length:count},(_,i)=>maximum*(count===1?0.55:0.10+0.78*Math.pow(i/(count-1),1.25)));
 const round=(step:number)=>raw.map(value=>Math.round(value/step)*step);
 const valid=(values:number[])=>values.every((v,i)=>v>0&&v<=maximum&&(i===0||v>values[i-1]));
 let granularityKm=10,values=round(10);
 if(!valid(values)){granularityKm=1;values=round(1);}
 if(!valid(values))throw new Error('Rounded gift thresholds collide');
 return {version,simulation:true,granularityKm,thresholds:values};
}
