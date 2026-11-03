import test from 'node:test';import assert from 'node:assert/strict';
import {fixture} from './server-fixture.mjs';
import {createCiteRewardsService} from '../../src/server/cite-rewards.mjs';
import {createPilot,runPilot} from '../../src/cite/pilot.ts';
import {pilotRewardPlan} from '../../src/cite/pilot-rewards.ts';
function setup(){const f=fixture(),pilot=createPilot();Object.assign(f.data.get(f.privatePath),{state:pilot.game.economy,councils:pilot.game.councils,city:pilot.game.city});const service=createCiteRewardsService(f.adapter,{today:f.today});return {...f,rewardService:service};}
function install(f){const g=runPilot().game;Object.assign(f.data.get(f.privatePath),{state:g.economy,councils:g.councils,city:g.city});f.setDate('2027-03-01');}
test('reward configuration and logistics require separate explicit capabilities, rechecked after revocation',async()=>{
 const f=setup(),svc=f.rewardService,plan=pilotRewardPlan('all');await assert.rejects(svc.initialize('Bearer manager',f.s,plan),{status:403});await assert.rejects(svc.initialize('Bearer person-0-0',f.s,plan),{status:403});
 f.data.get(f.memberPath('manager')).citeRewardPlanManagement=[f.s.seasonId];await svc.initialize('Bearer manager',f.s,plan);assert.equal(f.data.get(f.privatePath).rewards.initializedBy,'manager');
 const before=structuredClone(f.data.get(f.privatePath));await svc.initialize('Bearer manager',f.s,plan);assert.deepEqual(f.data.get(f.privatePath),before);await assert.rejects(svc.initialize('Bearer manager',f.s,pilotRewardPlan('none')),{status:409});
 await assert.rejects(svc.operations('Bearer manager',f.s),{status:403});f.data.get(f.memberPath('manager')).citeRewardOperations=[f.s.seasonId];assert.equal((await svc.operations('Bearer manager',f.s)).budgetCents,133000);
 f.data.get(f.memberPath('manager')).citeRewardOperations=[];await assert.rejects(svc.operations('Bearer manager',f.s),{status:403});
 await assert.rejects(svc.personal('Bearer manager',f.s),{status:403});
});
test('concurrent reward reconciliation allocates once, preserves purses and hides all other personal entitlements',async()=>{
 const f=setup(),svc=f.rewardService;f.data.get(f.memberPath('manager')).citeRewardPlanManagement=[f.s.seasonId];await svc.initialize('Bearer manager',f.s,pilotRewardPlan('all'));install(f);
 const balances=structuredClone(f.data.get(f.privatePath).state.balances);await assert.rejects(svc.settle('Bearer person-0-0',f.s),{status:403});await Promise.all([svc.settle('Bearer manager',f.s),svc.settle('Bearer manager',f.s)]);
 const after=f.data.get(f.privatePath);assert.equal(Object.values(after.rewards.unlocks).length,15);assert.deepEqual(after.state.balances,balances);assert.equal(Object.values(after.rewards.unlocks).reduce((n,u)=>n+u.allocatedCents,0),71000);
 const own=await svc.personal('Bearer person-0-0',f.s);assert.equal(own.myUnlocks.length,3);assert.ok(own.myUnlocks.every(u=>u.uid==='person-0-0'));assert.ok(!Object.hasOwn(await svc.summary('Bearer manager',f.s),'unlocks'));
 for(const bad of [{...f.s,tenantId:'other'},{...f.s,seasonId:'other'},{...f.s,familyId:'family-1'}])await assert.rejects(svc.personal('Bearer person-0-0',bad),{status:403});
 f.data.get(f.memberPath('person-0-0')).active=false;await assert.rejects(svc.personal('Bearer person-0-0',f.s),{status:403});
});
test('weekly transactions preserve the frozen plan and no client request can provide an earned amount',async()=>{
 const f=setup(),svc=f.rewardService;f.data.get(f.memberPath('manager')).citeRewardPlanManagement=[f.s.seasonId];await svc.initialize('Bearer manager',f.s,pilotRewardPlan('participation'));const before=structuredClone(f.data.get(f.privatePath).rewards);
 await f.service.submit('Bearer person-0-0',f.s,{weekId:f.c.weeks[0].id,scores:{cooperation:'5'}});assert.deepEqual(f.data.get(f.privatePath).rewards,before);
 const pub=await svc.settle('Bearer manager',f.s);assert.equal(pub.finalized,false);assert.equal(Object.values(f.data.get(f.privatePath).rewards.unlocks).length,0);
});
