import test from 'node:test';import assert from 'node:assert/strict';
import {createEconomy,normalizedScore,income,buildingCost,submitValues,recordPerformance,closeFamilyWeek,familyEconomyView,eligibleMembers} from '../../src/cite/economy.ts';
import {exact} from '../../src/domain/exact.ts';import {config,scope} from './fixture.mjs';
function scored(c,personValues='4',p='3'){
 let state=createEconomy(c);const week=c.weeks[0];for(const f of c.families){const s=scope(c,f.id);state=recordPerformance(state,s,week.id,{quality:p},week.start);for(const uid of eligibleMembers(state,f.id,week))state=submitValues(state,s,uid,week.id,{cooperation:personValues},week.start);}return state;
}
test('exact provisional formula, half-up rounding and normalized criterion weights',()=>{
 assert.equal(income(exact('3'),exact('4')),18);assert.equal(income(exact('4'),exact('4.5')),22);
 for(let p=1;p<=5;p++)for(let v=1;v<=5;v++){const n=income(exact(String(p)),exact(String(v)));assert.ok(n>=5&&n<=25);}
 assert.equal(income(exact('1'),exact('1')),5);assert.equal(income(exact('5'),exact('5')),25);assert.equal(income(exact('3.25'),exact('4')),19);
 assert.deepEqual(normalizedScore([{id:'a',label:'A',weightBps:4000},{id:'b',label:'B',weightBps:6000}],{a:'3',b:'4'}),exact('3.6'));
 for(const value of ['0','5.1','NaN','1e3','100000'])assert.throws(()=>income(exact(value),exact('3')));
 assert.throws(()=>normalizedScore([{id:'a',label:'A',weightBps:10000}],{a:'3',hidden:'4'}));
});
test('1, 2, 5 and 10 families: one credit per family, size-independent and prices fixed by potential',()=>{
 for(const n of [1,2,5,10]){const c=config(n,Array.from({length:n},(_,i)=>i%2?8:2));let state=scored(c);const w=c.weeks[0];for(const f of c.families){const s=scope(c,f.id),before=structuredClone(state);const result=closeFamilyWeek(state,s,w.id,w.endExclusive);assert.equal(result.credit.ecus,18);assert.deepEqual(state,before);state=result.state;assert.equal(closeFamilyWeek(state,s,w.id,w.endExclusive).state,state);}
  assert.ok(Object.values(state.balances).every(v=>v===18));assert.equal(state.audit.length,n);assert.deepEqual(['small','standard','large'].map(k=>buildingCost(k,n)),[51*n,81*n,111*n]);
  const high=closeFamilyWeek(scored(c,'5','5'),scope(c),w.id,w.endExclusive).state;assert.equal(buildingCost('standard',high.config.families.length),81*n);
 }
});
test('input/config immutability; unknown scopes, members, duplicates and closed periods fail',()=>{
 const c=config(),saved=structuredClone(c);let state=scored(c);assert.deepEqual(c,saved);c.metrics.performance[0].label='changed';assert.notEqual(state.config.metrics.performance[0].label,'changed');const w=state.config.weeks[0],s=scope(c);
 assert.equal(submitValues(state,s,'person-0-0',w.id,{cooperation:'4'},w.start),state);
 assert.throws(()=>submitValues(state,s,'person-0-0',w.id,{cooperation:'5'},w.start));
 for(const wrong of [{...s,tenantId:'other'},{...s,seasonId:'other'},{...s,familyId:'other'}])assert.throws(()=>closeFamilyWeek(state,wrong,w.id,w.endExclusive));
 assert.throws(()=>submitValues(state,s,'person-1-0',w.id,{cooperation:'4'},w.start));assert.throws(()=>closeFamilyWeek(state,s,w.id,w.start));
 const closed=closeFamilyWeek(state,s,w.id,w.endExclusive).state;assert.throws(()=>recordPerformance(closed,s,w.id,{quality:'5'},w.endExclusive));
});
test('missing inputs require explicit defer or documented five-ecu fallback, never an invented score',()=>{
 const c=config(),w=c.weeks[0],s=scope(c);const empty=createEconomy(c);assert.deepEqual(closeFamilyWeek(empty,s,w.id,w.endExclusive),{state:empty,deferred:true});
 c.missingDataPolicy='base-five';const result=closeFamilyWeek(createEconomy(c),s,w.id,w.endExclusive);assert.equal(result.credit.ecus,5);assert.equal(result.credit.basis,'base-five');assert.equal(Object.keys(result.state.values).length,0);
 assert.throws(()=>createEconomy({...c,missingDataPolicy:undefined}));assert.throws(()=>createEconomy({...c,minimumValueResponses:0}));
});
test('dated memberships freeze Monday eligibility, and confidential views omit all individual data',()=>{
 const c=config();c.memberships[0].toExclusive='2026-11-16';c.memberships.push({uid:'person-0-0',familyId:'family-1',from:'2026-11-16'});let state=scored(c);const w=c.weeks[0];assert.ok(eligibleMembers(state,'family-0',w).includes('person-0-0'));assert.ok(!eligibleMembers(state,'family-0',c.weeks[1]).includes('person-0-0'));assert.ok(eligibleMembers(state,'family-1',c.weeks[1]).includes('person-0-0'));
 state=closeFamilyWeek(state,scope(c),w.id,w.endExclusive).state;const view=familyEconomyView(state,scope(c)),text=JSON.stringify(view);assert.equal(view.ecus,18);for(const secret of ['person-','quality','cooperation','values','performance','memberships','family-1'])assert.ok(!text.includes(secret),secret);view.credits[0].ecus=900;assert.equal(state.audit[0].ecus,18);
 assert.throws(()=>createEconomy({...c,memberships:[...c.memberships,{uid:'person-0-0',familyId:'family-1',from:'2026-11-10'}]}));
});

test('malformed prototype keys, inactive weeks, absent rosters and unsafe balances fail closed',()=>{
 for(const id of ['__proto__','constructor','toString','hasOwnProperty']){const c=config();c.weeks[0].id=id;assert.throws(()=>createEconomy(c));}
 const c=config();c.memberships[0].toExclusive='';assert.throws(()=>createEconomy(c));
 const inactive=config();inactive.weeks[0].active=false;assert.throws(()=>closeFamilyWeek(createEconomy(inactive),scope(inactive),inactive.weeks[0].id,inactive.weeks[0].endExclusive));
 const empty=config();empty.memberships=[];empty.missingDataPolicy='base-five';assert.throws(()=>closeFamilyWeek(createEconomy(empty),scope(empty),empty.weeks[0].id,empty.weeks[0].endExclusive));
 const full=config();const state=scored(full);state.balances['family-0']=Number.MAX_SAFE_INTEGER;assert.throws(()=>closeFamilyWeek(state,scope(full),full.weeks[0].id,full.weeks[0].endExclusive));
});
