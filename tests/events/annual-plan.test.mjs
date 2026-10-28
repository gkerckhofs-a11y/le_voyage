import test from 'node:test';import assert from 'node:assert/strict';
import {previewAnnualPlan} from '../../src/application/annual-plan.ts';
const input={start:'2027-11-15',evaluationWeekday:7,partialWeeks:'exclude',leapDayAnniversary:'february-28',timeZone:'Europe/Brussels',closedStarts:[],freezeDate:'2028-09-01',receptionDate:'2028-10-20',giftCount:5,receptionTierCount:4};
test('rolling annual preview spans year boundary; closure recalculates maxima and thresholds',()=>{
 const p=previewAnnualPlan(input);assert.equal(p.endExclusive,'2028-11-15');assert.equal(p.maximumKm,p.activeWeeks*100);assert.equal(p.giftThresholds.length,5);
 const q=previewAnnualPlan({...input,closedStarts:[p.weeks[2].start]});assert.equal(q.maximumKm,p.maximumKm-100);assert.equal(q.receptionMaximumKm,p.receptionMaximumKm-100);assert.notDeepEqual(q.giftThresholds,p.giftThresholds);assert.deepEqual(previewAnnualPlan(input),p);
});
test('explicit partial and leap-day decisions survive preview',()=>{
 const leap={...input,start:'2028-02-29',freezeDate:'2028-12-01',receptionDate:'2029-02-01'};
 assert.equal(previewAnnualPlan(leap).endExclusive,'2029-02-28');assert.equal(previewAnnualPlan({...leap,leapDayAnniversary:'march-1'}).endExclusive,'2029-03-01');
 assert.ok(previewAnnualPlan({...leap,partialWeeks:'full-credit'}).activeWeeks>previewAnnualPlan(leap).activeWeeks);
 for(const change of [{partialWeeks:''},{leapDayAnniversary:''},{timeZone:'bad/zone'},{closedStarts:['2027-11-16']},{giftCount:101},{tenantId:'foreign'},{freezeDate:'2027-11-01'},{receptionDate:'2028-08-31'}])assert.throws(()=>previewAnnualPlan({...input,...change}));
});
