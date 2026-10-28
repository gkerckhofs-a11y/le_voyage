import test from 'node:test';import assert from 'node:assert/strict';
import {giftScale} from '../../src/domain/gift-scale.ts';
import {thresholds} from '../../src/domain/scoring.ts';
import {previewAnnualPlan} from '../../src/application/annual-plan.ts';
const v5='v5-early-simulation-1';
test('V5 reference and unchanged reception reproduce specification §5.3',()=>{
 assert.deepEqual(giftScale(46,5,v5).thresholds,[460,1090,1970,2960,4050]);
 assert.deepEqual(thresholds(42,4,'reception'),[2440,2910,3390,3860]);
 for(const [distance,gifts] of [[1840,2],[2530,3],[3220,4],[3910,4],[4255,5]])assert.equal(giftScale(46,5,v5).thresholds.filter(k=>k<=distance).length,gifts);
 assert.deepEqual(giftScale(46,1,v5).thresholds,[2530]);
});
test('missing and explicit historical profile preserve all supported V4 inputs',()=>{
 for(let weeks=0;weeks<=60;weeks++)for(let count=0;count<=100;count++){
  let old;try{old=thresholds(weeks,count,'gift');}catch{assert.throws(()=>giftScale(weeks,count));continue;}
  assert.deepEqual(giftScale(weeks,count).thresholds,old);assert.deepEqual(giftScale(weeks,count,'v4-linear-1').thresholds,old);
 }
});
test('V5 profiles are bounded, ordered, unique and deterministic across short and annual campaigns',()=>{
 for(let weeks=1;weeks<=60;weeks++)for(let count=1;count<=8;count++){
  const p=giftScale(weeks,count,v5);assert.deepEqual(p,giftScale(weeks,count,v5));assert.equal(p.thresholds.length,count);
  assert.ok(p.thresholds.every((k,i)=>Number.isInteger(k)&&k>0&&k<=weeks*100&&(!i||k>p.thresholds[i-1])));
 }
 for(const [weeks,count,version] of [[0,5,v5],[61,5,v5],[1.5,5,v5],[46,0,v5],[46,9,v5],[46,2.5,v5],[46,5,'future'],[NaN,5,v5],[46,NaN,v5],[46,5,null]])assert.throws(()=>giftScale(weeks,count,version));
});
test('annual preview opts into V5 without changing calendar, reception or source input',()=>{
 const input={start:'2027-11-15',evaluationWeekday:7,partialWeeks:'exclude',leapDayAnniversary:'february-28',timeZone:'Europe/Brussels',closedStarts:[],freezeDate:'2028-09-01',receptionDate:'2028-10-20',giftCount:5,receptionTierCount:4};
 const copy=structuredClone(input),old=previewAnnualPlan(input),next=previewAnnualPlan({...input,giftScaleVersion:v5});
 assert.deepEqual(input,copy);assert.notDeepEqual(next.giftThresholds,old.giftThresholds);assert.equal(next.giftScale.version,v5);assert.equal(old.giftScale.version,'v4-linear-1');
 for(const key of ['weeks','maximumKm','receptionThresholds','receptionMaximumKm'])assert.deepEqual(next[key],old[key]);
 assert.throws(()=>previewAnnualPlan({...input,giftScaleVersion:'unknown'}));assert.throws(()=>previewAnnualPlan({...input,giftThresholds:[1,2,3]}));
});
