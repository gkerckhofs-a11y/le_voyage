export type GiftAllocation = {unit:'team'|'person';amountCents:number};
export type AnnualFunding = {basis:'HT'|'TTC';receptionTotalsCents:readonly number[]} & (
 {giftPerTeamCents:readonly number[];giftAllocations?:never} |
 {giftAllocations:readonly GiftAllocation[];giftPerTeamCents?:never}
);
/** Allocated envelopes, not actual costs or an invoice. Reception levels are total alternatives. */
export function previewAnnualFunding(input:AnnualFunding|undefined,giftCount:number,tierCount:number){
 if(input===undefined)return null;
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['basis','giftPerTeamCents','giftAllocations','receptionTotalsCents'].includes(k))||!['HT','TTC'].includes(input.basis))throw new Error('Explicit budget basis required');
 const validAmount=(n:number)=>Number.isSafeInteger(n)&&n>=0;
 const valid=(a:readonly number[],length:number)=>Array.isArray(a)&&a.length===length&&a.every(validAmount);
 const legacy=Object.hasOwn(input,'giftPerTeamCents'),modern=Object.hasOwn(input,'giftAllocations');
 if(legacy===modern)throw new Error('Exactly one gift allocation format required');
 let giftAllocations:GiftAllocation[];
 if(legacy){
  if(!valid(input.giftPerTeamCents!,giftCount))throw new Error('One exact budget required per gift');
  giftAllocations=input.giftPerTeamCents!.map(amountCents=>({unit:'team',amountCents}));
 }else{
  if(!Array.isArray(input.giftAllocations)||input.giftAllocations.length!==giftCount)throw new Error('One allocation required per gift');
  giftAllocations=input.giftAllocations.map(a=>{
   if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!['unit','amountCents'].includes(k))||!['team','person'].includes(a.unit)||!validAmount(a.amountCents))throw new Error('Explicit gift unit and exact amount required');
   return {...a};
  });
 }
 if(!valid(input.receptionTotalsCents,tierCount+1))throw new Error('One exact budget required per reception level');
 if(input.receptionTotalsCents.some((n,i)=>i>0&&n<input.receptionTotalsCents[i-1]))throw new Error('Total reception budgets must not decrease');
 const giftTotal=giftAllocations.reduce((sum,a)=>sum+BigInt(a.amountCents),0n);
 if(giftTotal>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Gift allocation exceeds exact range');
 const allTeam=giftAllocations.every(a=>a.unit==='team');
 return {basis:input.basis,currency:'EUR' as const,giftAllocations,
  giftPerTeamCents:allTeam?giftAllocations.map(a=>a.amountCents):null,giftMaximumPerTeamCents:allTeam?Number(giftTotal):null,
  receptionTotalsCents:[...input.receptionTotalsCents],receptionBaseCents:input.receptionTotalsCents[0],receptionMaximumCents:input.receptionTotalsCents.at(-1)!};
}
