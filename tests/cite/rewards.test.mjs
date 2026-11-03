import test from 'node:test';
import assert from 'node:assert/strict';
import {createRewards,syncRewards,personalRewards,rewardSummary,rewardOperations} from '../../src/cite/rewards.ts';
import {createPilot,runPilot} from '../../src/cite/pilot.ts';
import {pilotRewardPlan,PILOT_REWARD_MODES} from '../../src/cite/pilot-rewards.ts';
import {config,scope} from './fixture.mjs';
import {createEconomy} from '../../src/cite/economy.ts';
import {createGovernance,COUNCIL_RULES} from '../../src/cite/councils.ts';
import {initializeCity} from '../../src/cite/city.ts';
const s={tenantId:'fiction-cite',seasonId:'prototype-2026',familyId:'family-0'};
const initial=()=>createPilot().game,finished=()=>runPilot().game;
function planFor(game,mode='all'){
 const p=pilotRewardPlan(mode),people=new Set(game.economy.config.memberships.map(m=>m.uid)).size;
 if(p.participation)p.participation.budgetCents=people*p.participation.unitCents;
 if(p.family)p.family.budgetCents=people*p.family.tiers.map(t=>t.unitCents).sort((a,b)=>b-a).slice(0,p.family.maxGiftsPerPerson).reduce((a,b)=>a+b,0);
 p.budgetCents=(p.participation?.budgetCents??0)+(p.family?.budgetCents??0)+(p.party?.budgetCents??0);return p;
}
const initialize=(game,plan=planFor(game))=>createRewards(game,s,plan,'director','2026-11-09');
const grants=r=>Object.values(r.unlocks);

test('all eight independent combinations change no game outcome; inactive options grant nothing',()=>{
 let reference;for(const mode of PILOT_REWARD_MODES){const p=runPilot(mode),r=p.rewards;
  if(reference)assert.deepEqual(p.game,reference);else reference=p.game;
  assert.equal(r.finalizedOn,'2027-03-01');
  for(const program of ['participation','family','party'])assert.equal(grants(r).some(u=>u.program===program),!!r.plan[program]);
  assert.ok(rewardOperations(r).allocatedCents<=r.plan.budgetCents);
 }
 const all=runPilot().rewards;assert.equal(grants(all).length,15);assert.equal(rewardOperations(all).allocatedCents,71000);
 assert.equal(grants(all).find(u=>u.tierId==='ambition-50').earnedOn,'2026-12-06');
 assert.equal(grants(all).find(u=>u.tierId==='performance').earnedOn,'2026-12-07');
 assert.deepEqual(syncRewards(reference,s,all,'2027-03-02'),all);
});

test('worst-case provision scales with eligible people for 1/2/5/10 families, not scores or ecus',()=>{
 for(const count of [1,2,5,10]){const c=config(count),base=createGovernance(createEconomy(c),{economy:40,wellbeing:40,culture:40,infrastructure:40,environment:40},COUNCIL_RULES),game=initializeCity(base,scope(c),'private-rewards-seed-001'),plan=planFor(game),r=initialize(game,plan);
  assert.equal(r.provisionedCents,2*count*(1000+4500)+100000);assert.deepEqual(game.economy.balances,Object.fromEntries(c.families.map(f=>[f.id,0])));
  const insufficient=structuredClone(plan);insufficient.family.budgetCents--;assert.throws(()=>initialize(game,insufficient),/family provision/);
 }
});

test('explicit any/all conditions, P score and per-person cap; values and ecus cannot substitute performance',()=>{
 const start=initial(),game=finished(),p=planFor(start,'family');p.family.maxGiftsPerPerson=1;
 p.family.tiers=[{id:'combined',label:'Attention combinée',unitCents:1000,match:'all',conditions:[{kind:'performance',minimum:'4',weeks:4},{kind:'ambition',threshold:80}]}];
 let r=syncRewards(game,s,initialize(start,p),'2027-03-01');assert.equal(grants(r).length,0);
 p.family.tiers[0].match='any';r=syncRewards(game,s,initialize(start,p),'2027-03-01');assert.equal(grants(r).length,6);
 const lower=structuredClone(game);for(const week of Object.values(lower.economy.performance))for(const f of Object.keys(week))week[f].quality='3';
 assert.equal(grants(syncRewards(lower,s,initialize(start,p),'2027-03-01')).length,0);
 const capped=planFor(start,'family');capped.family.maxGiftsPerPerson=1;r=syncRewards(game,s,initialize(start,capped),'2027-03-01');for(const uid of new Set(start.economy.config.memberships.map(m=>m.uid)))assert.equal(grants(r).filter(u=>u.uid===uid).length,1);
});

test('participation counts a Council once regardless of choice, abstention or runoff; suspension excluded',()=>{
 const start=initial(),g=finished(),plan=planFor(start,'participation'),uid='person-0-0';
 for(const c of Object.values(g.councils.records))if(c.ballots['1'][uid])c.ballots['1'][uid].choice='abstain';
 let r=syncRewards(g,s,initialize(start,plan),'2027-03-01');assert.ok(grants(r).some(u=>u.uid===uid));
 const first=g.councils.records['council-1'];first.ballots['2'][uid]={familyId:'family-0',choice:'no'};delete g.councils.records['council-4'].ballots['1'][uid];
 r=syncRewards(g,s,initialize(start,plan),'2027-03-01');assert.ok(!grants(r).some(u=>u.uid===uid));assert.ok(grants(r).some(u=>u.uid==='person-2-0')); // Three eligible, three participated.
 for(const c of Object.values(g.councils.records).slice(0,3)){c.roster['family-0']=c.roster['family-0'].filter(x=>x!==uid);delete c.ballots['1'][uid];delete c.ballots['2'][uid];}
 g.councils.records['council-4'].ballots['1'][uid]={familyId:'family-0',choice:'no'};
 r=syncRewards(g,s,initialize(start,plan),'2027-03-01');assert.ok(grants(r).some(u=>u.uid===uid)); // One eligible, ceiling(10/13)=1.
});

test('party uses only final development, guarantees funded base and waits for complete accounting',()=>{
 const start=initial(),game=finished(),r=initialize(start,planFor(start,'party'));
 assert.equal(grants(syncRewards(game,s,r,'2027-02-28')).length,0);
 const low=structuredClone(game);for(const k of Object.keys(low.councils.gauges))low.councils.gauges[k]=0;
 const base=syncRewards(low,s,r,'2027-03-01');assert.equal(grants(base)[0].tierId,'base');assert.equal(grants(base)[0].allocatedCents,30000);
 const high=structuredClone(game);for(const k of Object.keys(high.councils.gauges))high.councils.gauges[k]=100;
 assert.equal(grants(syncRewards(high,s,r,'2027-03-01'))[0].tierId,'grand');
 delete high.economy.credits[Object.keys(high.economy.credits)[0]];assert.equal(syncRewards(high,s,r,'2027-03-01').finalizedOn,null);
});

test('delayed reconciliation preserves original recipients and milestones, never awards a late arrival retroactively',()=>{
 const start=initial(),game=finished();for(const g of [start,game])g.economy.config.memberships.push({uid:'newcomer',familyId:'family-0',from:'2027-01-04'});
 const p=planFor(start,'family'),r=initialize(start,p),after=syncRewards(game,s,r,'2027-03-01');
 assert.ok(grants(after).some(u=>u.tierId==='ambition-50'));assert.ok(!grants(after).some(u=>u.uid==='newcomer'));
 const before=JSON.stringify(r);const lowered=structuredClone(game);lowered.councils.gauges.culture=5;
 assert.deepEqual(syncRewards(lowered,s,r,'2027-03-01'),after);assert.equal(JSON.stringify(r),before);
});

test('member and public projections omit other recipients, rules, budgets, conditions and evaluations',()=>{
 const p=runPilot(),own=personalRewards(p.rewards,'person-0-0'),pub=rewardSummary(p.rewards);
 assert.ok(own.myUnlocks.every(u=>u.uid==='person-0-0'));assert.ok(!JSON.stringify(own).includes('person-1-0'));assert.ok(!Object.hasOwn(pub,'unlocks'));assert.ok(!Object.hasOwn(pub,'plan'));assert.ok(!JSON.stringify(pub).includes('ambition'));
 assert.throws(()=>syncRewards(p.game,{...s,tenantId:'other'},p.rewards,'2027-03-01'),{status:403});
});

test('invalid or unprovisioned contracts, implicit policies and late initialization fail',()=>{
 const game=initial(),plan=planFor(game);
 for(const edit of [p=>p.budgetCents--,p=>p.party.budgetCents=0,p=>p.participation.budgetCents=0,p=>p.family.maxGiftsPerPerson=0,p=>p.family.tiers[0].match='implicit',p=>p.family.tiers[0].conditions[0].minimum='5.01',p=>p.party.basis='maximum',p=>p.party.tiers[1].minimumDevelopment=1,p=>p.extra=true,p=>p.participation.unitCents=-1]){const bad=structuredClone(plan);edit(bad);assert.throws(()=>initialize(game,bad));}
 assert.throws(()=>initialize(finished(),plan),/precede/);
});
