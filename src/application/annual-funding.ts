export type AnnualFunding={basis:'HT'|'TTC';giftPerTeamCents:readonly number[];receptionTotalsCents:readonly number[]};
/** Allocated envelopes, not actual costs or an invoice. Reception levels are total alternatives. */
export function previewAnnualFunding(input:AnnualFunding|undefined,giftCount:number,tierCount:number){
 if(input===undefined)return null; // Existing calendar-only drafts remain readable.
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['basis','giftPerTeamCents','receptionTotalsCents'].includes(k))||!['HT','TTC'].includes(input.basis))throw new Error('Explicit budget basis required');
 const valid=(a:readonly number[],length:number)=>Array.isArray(a)&&a.length===length&&a.every(n=>Number.isSafeInteger(n)&&n>=0);
 if(!valid(input.giftPerTeamCents,giftCount)||!valid(input.receptionTotalsCents,tierCount+1))throw new Error('One exact budget required per gift and reception level');
 if(input.receptionTotalsCents.some((n,i)=>i>0&&n<input.receptionTotalsCents[i-1]))throw new Error('Total reception budgets must not decrease');
 const giftTotal=input.giftPerTeamCents.reduce((sum,n)=>sum+BigInt(n),0n);
 if(giftTotal>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Gift allocation exceeds exact range');
 return {basis:input.basis,currency:'EUR' as const,giftPerTeamCents:[...input.giftPerTeamCents],giftMaximumPerTeamCents:Number(giftTotal),receptionTotalsCents:[...input.receptionTotalsCents],receptionBaseCents:input.receptionTotalsCents[0],receptionMaximumCents:input.receptionTotalsCents.at(-1)!};
}
