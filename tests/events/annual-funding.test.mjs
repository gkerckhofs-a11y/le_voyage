import test from 'node:test';import assert from 'node:assert/strict';
import {previewAnnualFunding} from '../../src/application/annual-funding.ts';
import {previewAnnualPlan} from '../../src/application/annual-plan.ts';
const funding={basis:'HT',giftPerTeamCents:[12550,20000],receptionTotalsCents:[100000,130000,160000]};
test('gift allocations add per team, reception alternatives never add together',()=>{
 const p=previewAnnualFunding(funding,2,2);assert.equal(p.giftMaximumPerTeamCents,32550);assert.equal(p.receptionBaseCents,100000);assert.equal(p.receptionMaximumCents,160000);assert.deepEqual(p.receptionTotalsCents,[100000,130000,160000]);assert.equal(p.basis,'HT');assert.equal(p.currency,'EUR');
 p.giftPerTeamCents[0]=999;assert.equal(funding.giftPerTeamCents[0],12550);assert.equal(previewAnnualFunding(undefined,2,2),null);
 assert.equal(previewAnnualFunding({...funding,basis:'TTC'},2,2).receptionMaximumCents,160000);
});
test('budgets reject partial, negative, fractional, unsafe, decreasing or mismatched input',()=>{
 for(const f of [null,{...funding,basis:'unknown'},{...funding,extra:true},{...funding,giftPerTeamCents:[1]},{...funding,giftPerTeamCents:[-1,2]},{...funding,giftPerTeamCents:[1.5,2]},{...funding,giftPerTeamCents:[Number.MAX_SAFE_INTEGER,1]},{...funding,receptionTotalsCents:[100000,90000,160000]},{...funding,receptionTotalsCents:[100000,130000]}])assert.throws(()=>previewAnnualFunding(f,2,2));
 assert.equal(previewAnnualFunding({basis:'TTC',giftPerTeamCents:[],receptionTotalsCents:[0]},0,0).receptionMaximumCents,0);
});
test('budgeted annual plan preserves calendar thresholds and does not invent an enterprise total',()=>{
 const input={start:'2027-11-15',evaluationWeekday:7,partialWeeks:'exclude',leapDayAnniversary:'february-28',freezeDate:'2028-09-01',receptionDate:'2028-10-20',giftCount:2,receptionTierCount:2};
 const before=previewAnnualPlan(input),after=previewAnnualPlan({...input,funding});assert.deepEqual(after.weeks,before.weeks);assert.deepEqual(after.giftThresholds,before.giftThresholds);assert.deepEqual(after.receptionThresholds,before.receptionThresholds);assert.equal(after.funding.giftMaximumPerTeamCents,32550);assert.ok(!('enterpriseTotalCents' in after.funding));
});
