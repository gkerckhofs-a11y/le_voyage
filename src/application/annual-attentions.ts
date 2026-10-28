import {civilDate} from '../domain/calendar.ts';
import type {previewAnnualOrganisation} from './annual-organisation.ts';
export type AnnualAttentions = {
 basis:'HT'|'TTC';
 dated:readonly {label:string;date:string;unit:'team'|'person';amountCents:number;visibility:'announced'|'discreet'}[];
 surprises:readonly {label:string;periodStart:string;periodEnd:string;count:number;envelopeCents:number;compositionPreferences:string}[];
};
const record=(value:unknown,keys:readonly string[])=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw new Error('Invalid annual attention fields');};
const text=(value:unknown,limit:number)=>{if(typeof value!=='string'||!value.trim()||value.length>limit)throw new Error('Attention text required');};
const amount=(n:number)=>{if(!Number.isSafeInteger(n)||n<0)throw new Error('Exact nonnegative attention budget required');};
const safe=(n:bigint)=>{if(n>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Attention total exceeds exact range');return Number(n);};
/** Private planning only. No event publication, entitlement or kilometre changes. */
export function previewAnnualAttentions(input:AnnualAttentions|undefined,start:string,endExclusive:string,organisation:ReturnType<typeof previewAnnualOrganisation>){
 if(input===undefined)return null;
 record(input,['basis','dated','surprises']);if(!['HT','TTC'].includes(input.basis))throw new Error('Explicit attention budget basis required');
 if(!Array.isArray(input.dated)||input.dated.length>20||!Array.isArray(input.surprises)||input.surprises.length>20)throw new Error('Too many planned attentions');
 const date=(value:string)=>{const d=civilDate(value);if(d<start||d>=endExclusive)throw new Error('Attention date must be inside planned campaign');return d;};
 const dated=input.dated.map(item=>{
  record(item,['label','date','unit','amountCents','visibility']);text(item.label,160);date(item.date);amount(item.amountCents);
  if(!['team','person'].includes(item.unit)||!['announced','discreet'].includes(item.visibility))throw new Error('Explicit attention recipients and visibility required');
  const quantity=organisation?(item.unit==='team'?organisation.teamCount:organisation.totalHeadcount):null;
  return {...item,quantity,totalCents:quantity===null?null:safe(BigInt(quantity)*BigInt(item.amountCents))};
 });
 let surpriseBudget=0n;
 const surprises=input.surprises.map(item=>{
  record(item,['label','periodStart','periodEnd','count','envelopeCents','compositionPreferences']);text(item.label,160);text(item.compositionPreferences,500);
  const from=date(item.periodStart),through=date(item.periodEnd);if(from>through)throw new Error('Ordered surprise period required');
  if(!Number.isSafeInteger(item.count)||item.count<1||item.count>100)throw new Error('Positive bounded surprise count required');amount(item.envelopeCents);
  surpriseBudget+=BigInt(item.envelopeCents);return {...item};
 });
 const datedMaximumCents=dated.some(d=>d.totalCents===null)?null:safe(dated.reduce((sum,d)=>sum+BigInt(d.totalCents!),0n));
 const surpriseMaximumCents=safe(surpriseBudget);
 return {basis:input.basis,currency:'EUR' as const,dated,surprises,datedMaximumCents,surpriseMaximumCents,
  totalCents:datedMaximumCents===null?null:safe(BigInt(datedMaximumCents)+surpriseBudget)};
}
export type AnnualAttentionsPreview=ReturnType<typeof previewAnnualAttentions>;
