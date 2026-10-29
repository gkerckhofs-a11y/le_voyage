import {createHash} from 'node:crypto';
const fail=status=>Object.assign(Error('Financial amendment refused'),{status});
export const costKeys=['purchaseCents','packagingCents','transportCents'];
export function effectiveGiftCosts(value){const costs=Object.fromEntries(costKeys.map(k=>[k,value[k]+(value.financialAdjustment?.[k]??0)]));return {...costs,totalCostCents:costKeys.reduce((sum,k)=>sum+costs[k],0)};}
export function normalizeAmendment(input){
 const keys=['tenantId','campaignId','id','revision','mutationId','reference','reason',...costKeys];if(!input||Object.keys(input).sort().join(',')!==keys.sort().join(','))throw fail(400);
 for(const k of ['tenantId','campaignId'])if(typeof input[k]!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input[k]))throw fail(400);
 if(typeof input.id!=='string'||!/^[a-f0-9]{64}$/.test(input.id)||typeof input.mutationId!=='string'||!/^[a-f0-9-]{36}$/.test(input.mutationId)||!Number.isSafeInteger(input.revision)||input.revision<0)throw fail(400);
 for(const [k,max] of [['reference',120],['reason',240]])if(typeof input[k]!=='string'||input[k].trim().length<3||input[k].length>max||/[\u0000-\u001f\u007f]/.test(input[k]))throw fail(400);
 const delta=Object.fromEntries(costKeys.map(k=>{if(!Number.isSafeInteger(input[k])||Math.abs(input[k])>100000000)throw fail(400);return [k,input[k]];}));if(costKeys.every(k=>delta[k]===0))throw fail(400);
 const reference=input.reference.trim(),reason=input.reason.trim(),digest=createHash('sha256').update(JSON.stringify([input.revision,reference,reason,delta])).digest('hex');return {delta,reference,reason,digest};
}
export function planAmendment(old,delta){
 if(!([1,2].includes(old?.confirmation?.version)||old?.confirmation?.version===3&&old.confirmation.source==='anticipated-order')||(old.financialAdjustment?.count??0)>=20)throw fail(409);
 const before=effectiveGiftCosts(old),adjustment={...Object.fromEntries(costKeys.map(k=>[k,(old.financialAdjustment?.[k]??0)+delta[k]])),count:(old.financialAdjustment?.count??0)+1},after=effectiveGiftCosts({...old,financialAdjustment:adjustment});
 if(costKeys.some(k=>after[k]<0||after[k]>100000000)||after.totalCostCents>old.confirmation.allocatedCents)throw fail(422);return {before,after,adjustment};
}
