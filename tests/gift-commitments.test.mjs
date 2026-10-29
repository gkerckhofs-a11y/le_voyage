import test from 'node:test';import assert from 'node:assert/strict';
import {summarizeGiftCommitments as summarize} from '../src/server/gift-commitments.mjs';
import {anticipatedOrderDigest} from '../src/server/gift-reservations.mjs';
const order={version:1,purchaseCents:1000,packagingCents:100,transportCents:200,totalCostCents:1300,allocatedCents:3000};
const task=(id,milestoneId=id)=>({id,entitlement:{teamId:'team',milestoneId}});
function linked(){const reservation={id:'r1',teamId:'team',status:'ordered',proposal:{milestoneId:'gift1'},order:structuredClone(order),fulfillmentLink:{id:'f1'}};const fulfillment={id:'f1',confirmation:{...order,version:3,source:'anticipated-order',orderSnapshot:structuredClone(order)},anticipatedOrderLink:{reservationId:'r1',orderDigest:anticipatedOrderDigest(order)},financialAdjustment:{purchaseCents:-100,packagingCents:0,transportCents:50,count:1}};return {reservation,fulfillment};}
test('consolidation counts attached orders once, includes separate confirmed orders and distinguishes cancellation and unvalued work',()=>{
 const {reservation,fulfillment}=linked(),data={reservations:[reservation,{id:'r2',teamId:'team',status:'ordered',proposal:{milestoneId:'future'},order,cancellationRequest:{status:'accepted',finance:{adjustment:{purchaseCents:-500,packagingCents:0,transportCents:0,count:1}}}},{status:'reserved'},{status:'authorized'},{status:'released'}],fulfillments:[fulfillment,{id:'normal',confirmation:{...order,version:2}},{id:'legacy',status:'to-receive'}],tasks:[task('f1','gift1'),task('normal'),task('legacy'),task('draft')]},copy=structuredClone(data),result=summarize(data);
 assert.deepEqual(result,{confirmedCount:3,cancelledCount:1,originalCents:3900,adjustedCents:3350,cancelledAdjustedCents:800,otherAdjustedCents:2550,reservedCount:1,authorizedCount:1,unconfirmedGiftCount:1,legacyUnvaluedCount:1});assert.deepEqual(data,copy);
});
test('broken, orphan, competing and duplicate origin links refuse a misleading total',()=>{
 const {reservation,fulfillment}=linked(),base={reservations:[reservation],fulfillments:[fulfillment],tasks:[task('f1','gift1')]};
 for(const patch of [{reservations:[reservation,{...reservation,id:'duplicate'}]},{fulfillments:[{...fulfillment,anticipatedOrderLink:{...fulfillment.anticipatedOrderLink,orderDigest:'broken'}}]},{tasks:[]},{reservations:[]},{reservations:[{...reservation,fulfillmentLink:null}]},{reservations:[{...reservation,cancellationRequest:{finance:{}}}]},{fulfillments:[{...fulfillment,confirmation:{...fulfillment.confirmation,orderSnapshot:{...order,purchaseCents:999}}}]}])assert.throws(()=>summarize({...base,...patch}),{status:409});
});
test('missing legacy snapshots stay unvalued and invalid confirmed costs cannot become zero silently',()=>{
 const base={reservations:[],fulfillments:[{id:'legacy',status:'incident',resumeStatus:'delivered'}],tasks:[task('legacy')]};assert.equal(summarize(base).legacyUnvaluedCount,1);assert.equal(summarize(base).adjustedCents,0);
 for(const confirmation of [{...order,version:9},{...order,version:1,totalCostCents:0},{...order,version:1,purchaseCents:NaN}])assert.throws(()=>summarize({...base,fulfillments:[{id:'legacy',confirmation}]}),{status:409});assert.throws(()=>summarize({...base,fulfillments:[{id:'legacy',confirmation:{...order,version:1},financialAdjustment:{purchaseCents:-2000}}]}),{status:409});
});
test('accepted attached cancellations retain adjusted costs and an acquired but unattached order covers its right once',()=>{
 const {reservation,fulfillment}=linked();reservation.cancellationRequest={status:'accepted'};const r=summarize({reservations:[reservation],fulfillments:[fulfillment],tasks:[task('f1','gift1')]});assert.equal(r.cancelledAdjustedCents,1250);assert.equal(r.otherAdjustedCents,0);assert.equal(r.confirmedCount,1);
 delete reservation.fulfillmentLink;const unlinked=summarize({reservations:[reservation],fulfillments:[],tasks:[task('f1','gift1')]});assert.equal(unlinked.confirmedCount,1);assert.equal(unlinked.unconfirmedGiftCount,0);assert.equal(unlinked.cancelledAdjustedCents,1300);
});
