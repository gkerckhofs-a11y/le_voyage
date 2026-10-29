import {effectiveGiftCosts,costKeys} from './gift-amendments.mjs';
import {attachedAnticipatedOrder} from './gift-reservations.mjs';
const fail=()=>Object.assign(Error('Commitment summary unavailable'),{status:409});
// Read-only accounting of recorded order costs, not payments or client invoicing.
export function summarizeGiftCommitments({reservations,fulfillments,tasks}){
 const result={confirmedCount:0,cancelledCount:0,originalCents:0,adjustedCents:0,cancelledAdjustedCents:0,otherAdjustedCents:0,reservedCount:0,authorizedCount:0,unconfirmedGiftCount:0,legacyUnvaluedCount:0};
 const fById=new Map(fulfillments.map(f=>[f.id,f])),taskById=new Map(tasks.map(t=>[t.id,t]));
 if(fById.size!==fulfillments.length||taskById.size!==tasks.length||fulfillments.some(f=>!taskById.has(f.id)))throw fail();
 const used=new Set(),covered=new Set(),identities=new Set();
 function add(original,adjustment,cancelled){
  if(!original||costKeys.some(k=>!Number.isSafeInteger(original[k])||original[k]<0||original[k]>100000000)||original.totalCostCents!==costKeys.reduce((n,k)=>n+original[k],0))throw fail();
  const costs=effectiveGiftCosts({...original,financialAdjustment:adjustment});if(costKeys.some(k=>!Number.isSafeInteger(costs[k])||costs[k]<0||costs[k]>100000000))throw fail();
  result.confirmedCount++;result.originalCents+=original.totalCostCents;result.adjustedCents+=costs.totalCostCents;
  if(cancelled){result.cancelledCount++;result.cancelledAdjustedCents+=costs.totalCostCents;}else result.otherAdjustedCents+=costs.totalCostCents;
 }
 for(const r of reservations){
  if(r.status==='reserved'){result.reservedCount++;continue;}if(r.status==='authorized'){result.authorizedCount++;continue;}if(r.status==='released')continue;if(r.status!=='ordered'||!r.order||!r.proposal?.milestoneId)throw fail();
  const identity=JSON.stringify([r.teamId,r.proposal.milestoneId]);if(identities.has(identity))throw fail();identities.add(identity);
  const matching=tasks.filter(t=>t.entitlement.teamId===r.teamId&&t.entitlement.milestoneId===r.proposal.milestoneId);if(matching.length>1)throw fail();const task=matching[0];if(task)covered.add(task.id);
  if(r.fulfillmentLink){const id=r.fulfillmentLink.id,f=fById.get(id);if(!task||task.id!==id||used.has(id)||r.cancellationRequest?.finance||!attachedAnticipatedOrder({...r,reservationId:r.id},f,id)||JSON.stringify(f.confirmation.orderSnapshot)!==JSON.stringify(r.order))throw fail();used.add(id);add(r.order,f.financialAdjustment,r.cancellationRequest?.status==='accepted');}
  else {if(task&&fById.get(task.id)?.confirmation)throw fail();if(r.cancellationRequest?.finance&&r.cancellationRequest.status!=='accepted')throw fail();add(r.order,r.cancellationRequest?.finance?.adjustment,r.cancellationRequest?.status==='accepted');}
 }
 for(const task of tasks){const f=fById.get(task.id);if(used.has(task.id))continue;if(f?.anticipatedOrderLink||f?.confirmation?.source==='anticipated-order')throw fail();if(covered.has(task.id))continue;
  if(f?.confirmation){if(![1,2].includes(f.confirmation.version))throw fail();add(f.confirmation,f.financialAdjustment,false);}
  else if(['to-receive','to-compose','ready','to-deliver','delivered'].includes(f?.status==='incident'?f.resumeStatus:f?.status))result.legacyUnvaluedCount++;
  else result.unconfirmedGiftCount++;
 }
 if(Object.values(result).some(n=>!Number.isSafeInteger(n)||n<0))throw fail();return result;
}
