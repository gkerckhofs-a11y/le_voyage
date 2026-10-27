import test from 'node:test';
import assert from 'node:assert/strict';
import { planWeeks } from '../src/domain/calendar.ts';
import { exact } from '../src/domain/exact.ts';
import { closeWeek, convoyDistance, createCampaign, freezeReception, postponeWeek, publicProgress, receptionLevel, teamDistance } from '../src/domain/engine.ts';
import { MemoryCampaignStore } from '../src/domain/transaction-memory.ts';
import { cmd, config, input, scope } from './fixtures.mjs';
const evaluate={kind:'evaluate',input:input()};
const joker={kind:'joker'};

test('Closure immutability and replay produce exactly one outcome, gift and task',()=>{
  const initial=createCampaign(config()), week=initial.config.weeks[0];
  const next=closeWeek(initial,cmd(week),joker);
  assert.equal(Object.keys(initial.outcomes).length,0);
  assert.deepEqual(teamDistance(next,'cometes'),exact('70'));
  assert.equal(Object.keys(next.entitlements).length,1);
  assert.equal(Object.keys(next.tasks).length,1);
  assert.strictEqual(closeWeek(next,cmd(week),evaluate),next);
  assert.deepEqual(convoyDistance(next),exact('70'));
});
test('A report extends only the same week, cannot repeat, then joker cannot double-credit',()=>{
  const initial=createCampaign(config()), week=initial.config.weeks[0];
  const request=cmd(week,'cometes','2027-01-06');
  const reported=postponeWeek(initial,request);
  assert.strictEqual(postponeWeek(reported,request),reported);
  assert.throws(()=>closeWeek(reported,cmd(week),joker),/open/);
  const closed=closeWeek(reported,cmd(week,'cometes','2027-01-18'),joker);
  assert.deepEqual(teamDistance(closed,'cometes'),exact('70'));
  assert.equal(Object.keys(closed.outcomes).length,1);
  assert.strictEqual(closeWeek(closed,cmd(week,'cometes','2027-01-18'),evaluate),closed);
  assert.throws(()=>postponeWeek(closed,request));
});
test('Annual joker limit includes previously finalized weeks but excludes closures',()=>{
  let state=createCampaign(config());
  for(const week of state.config.weeks.slice(0,2)) state=closeWeek(state,cmd(week),joker);
  assert.throws(()=>closeWeek(state,cmd(state.config.weeks[2]),joker),/exhausted/);
  assert.deepEqual(teamDistance(state,'cometes'),exact('140'));
});
test('Preprogrammed closure yields zero with no gift or joker consumption',()=>{
  const weeks=planWeeks('2027-01-04',4,['2027-01-04']);
  let state=createCampaign(config({weeks}));
  state=closeWeek(state,cmd(weeks[0]),joker);
  assert.deepEqual(teamDistance(state,'cometes'),exact('0'));
  assert.equal(Object.keys(state.entitlements).length,0);
  assert.equal(Object.values(state.outcomes)[0].source,'closed');
  for(const w of weeks.slice(1,3)) state=closeWeek(state,cmd(w),joker);
  assert.deepEqual(teamDistance(state,'cometes'),exact('140'));
});
test('Convois await every eligible team; disabled teams are excluded; same week is averaged once',()=>{
  const weeks=planWeeks('2027-01-04',1);
  const teams=['a','b','c','d'].map(id=>({id,eligibleWeekIds:[weeks[0].id]}));
  teams.push({id:'inactive',eligibleWeekIds:[]});
  let state=createCampaign(config({weeks,teams,mode:'kpi'}));
  // Four, ten, seven, six people. Neutralized small group uses neutral=4 in this fixture.
  state=createCampaign(config({weeks,teams,mode:'kpi',privacy:{minimumRespondents:5,neutralScore:'4'}}));
  for(const [i,score] of ['4','3','3','2'].entries()) {
    state=closeWeek(state,cmd(weeks[0],teams[i].id),{kind:'evaluate',input:input({size:[4,10,7,6][i],score,mode:'kpi'})});
    assert.equal(Object.keys(state.convoys).length,i===3?1:0);
  }
  assert.deepEqual(convoyDistance(state),exact('70'));
});
test('Future membership changes do not remove existing entitlements',()=>{
  const weeks=planWeeks('2027-01-04',2);
  const teams=[{id:'cometes',eligibleWeekIds:weeks.map(w=>w.id)},{id:'future',eligibleWeekIds:[weeks[1].id]}];
  let state=createCampaign(config({weeks,teams}));
  state=closeWeek(state,cmd(weeks[0]),joker);
  const previous=structuredClone(state.entitlements);
  state=closeWeek(state,cmd(weeks[1]),evaluate);
  state=closeWeek(state,cmd(weeks[1],'future'),joker);
  for(const [id,gift] of Object.entries(previous)) assert.deepEqual(state.entitlements[id],gift);
  assert.equal(Object.keys(state.entitlements).length,2);
});
test('Unanswered week advances 40 km and awards only reached thresholds',()=>{
  let state=createCampaign(config());
  state=closeWeek(state,cmd(state.config.weeks[0]),{kind:'evaluate',input:input({responded:0})});
  assert.deepEqual(teamDistance(state,'cometes'),exact('40'));
  assert.equal(Object.keys(state.entitlements).length,0);
});
test('Reception is guaranteed, selects total tier budget and remains stable after freeze',()=>{
  let state=createCampaign(config());
  assert.equal(receptionLevel(state).level,0);
  assert.equal(receptionLevel(state).budgetCents,100000);
  assert.throws(()=>freezeReception(state,scope,'2027-01-18'));
  state=closeWeek(state,cmd(state.config.weeks[0]),joker);
  state=freezeReception(state,scope,'2027-01-19');
  assert.equal(state.freeze.level,1); assert.equal(state.freeze.budgetCents,130000);
  const frozen=state.freeze;
  state=closeWeek(state,cmd(state.config.weeks[1],'cometes','2027-01-19'),joker);
  assert.deepEqual(teamDistance(state,'cometes'),exact('140'));
  assert.deepEqual(receptionLevel(state),frozen);
  assert.strictEqual(freezeReception(state,scope,'2027-01-20'),state);
});
test('Late processing after reception cutoff cannot upgrade reception even before freeze job runs',()=>{
  let state=createCampaign(config());
  state=closeWeek(state,cmd(state.config.weeks[0],'cometes','2027-01-20'),joker);
  assert.deepEqual(convoyDistance(state),exact('70'));
  assert.equal(receptionLevel(state).level,0);
  state=freezeReception(state,scope,'2027-01-21');
  assert.equal(state.freeze.level,0);
});
test('Backdating cannot bypass a frozen reception or campaign event order',()=>{
  let state=createCampaign(config());
  state=closeWeek(state,cmd(state.config.weeks[0]),joker);
  state=freezeReception(state,scope,'2027-01-19');
  assert.throws(()=>closeWeek(state,cmd(state.config.weeks[1],'cometes','2027-01-18'),joker),/backdate/);
});
test('Scope, time window, team eligibility and chronological closure are enforced',()=>{
  const state=createCampaign(config()), week=state.config.weeks[0];
  assert.throws(()=>closeWeek(state,{...cmd(week),tenantId:'other'},joker));
  assert.throws(()=>closeWeek(state,{...cmd(week),campaignId:'other'},joker));
  assert.throws(()=>closeWeek(state,cmd(week,'unknown'),joker));
  assert.throws(()=>closeWeek(state,cmd(week,'cometes',week.start),joker));
  assert.throws(()=>closeWeek(state,cmd(state.config.weeks[1]),joker),/Earlier/);
  assert.throws(()=>postponeWeek(state,cmd(week)),/during/);
});
test('Public projection excludes every private domain field and internal diagnostic',()=>{
  let state=createCampaign(config());
  state=closeWeek(state,cmd(state.config.weeks[0]),evaluate);
  const json=JSON.stringify(publicProgress(state));
  for(const forbidden of ['responses','budget','scores','weights','roster','answers','responded','suppressed','participant','preferences','absent']) assert.equal(json.includes(forbidden),false,forbidden);
});
test('Concurrent replay: one distance, one joker, one entitlement/task in serialized test adapter',async()=>{
  const initial=createCampaign(config()), store=new MemoryCampaignStore(initial), command=cmd(initial.config.weeks[0]);
  await Promise.all(Array.from({length:20},()=>store.transact(scope,s=>closeWeek(s,command,joker))));
  const state=await store.read(scope);
  assert.equal(Object.keys(state.outcomes).length,1);
  assert.equal(Object.keys(state.entitlements).length,1);
  assert.equal(Object.keys(state.tasks).length,1);
  assert.deepEqual(convoyDistance(state),exact('70'));
  await assert.rejects(store.read({...scope,tenantId:'other'}));
});
test('Failed transaction rolls back completely and does not poison following commands',async()=>{
  const initial=createCampaign(config()),store=new MemoryCampaignStore(initial);
  await assert.rejects(store.transact(scope,s=>{s.tasks.bad={};throw new Error('crash');}));
  assert.deepEqual((await store.read(scope)).tasks,{});
  await store.transact(scope,s=>closeWeek(s,cmd(initial.config.weeks[0]),joker));
  assert.equal(Object.keys((await store.read(scope)).tasks).length,1);
});
