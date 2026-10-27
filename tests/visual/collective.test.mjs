import test from 'node:test';
import assert from 'node:assert/strict';
import { collectiveState, collectiveIdentity, demoCollective } from '../../scripts/demo-collective.mjs';
import { collectiveJourneyView } from '../../src/presentation/collective-view.ts';
import { teamDistance, freezeReception, closeWeek } from '../../src/domain/engine.ts';
import { addDays } from '../../src/domain/calendar.ts';

test('collective projects the weekly mean, never the sum or membership',()=>{
  const s=collectiveState(),before=JSON.stringify(s),dto=collectiveJourneyView(s,s.config,collectiveIdentity(s));
  assert.equal(dto.displayKm,'1680');assert.equal(dto.history.at(-1).displayKm,'70');
  assert.equal(dto.maximumKm,4600);assert.equal(dto.reception.maximumKm,4200);
  assert.deepEqual(dto.reception.tiers.map(t=>t.km),[2440,2910,3390,3860]);
  assert.deepEqual(dto.reception.tiers.map(t=>t.status),['next','unreached','unreached','unreached']);
  assert.equal(dto.reception.formulaTitle,'Réception conviviale');
  assert.doesNotMatch(JSON.stringify(dto),/private-|budget|tenantId|teams|roster|participant|answers|scores|weights|gift|entitlement|preferences/i);
  assert.deepEqual(Object.keys(dto),['timeZone','schemaVersion','routeId','organizationName','distance','displayKm','maximumKm','activeWeeks','completedWeeks','history','reception']);
  dto.history[0].distance.numerator='9999';dto.reception.distance.numerator='9999';assert.equal(JSON.stringify(s),before);
});
test('scope and public reception metadata are checked without copying extra fields',()=>{
  const s=collectiveState(),identity=collectiveIdentity(s);
  assert.throws(()=>collectiveJourneyView(s,{...s.config,tenantId:'foreign'},identity),/denied/);
  assert.throws(()=>collectiveJourneyView(s,{...s.config,campaignId:'foreign'},identity),/denied/);
  assert.throws(()=>collectiveJourneyView(s,s.config,{...identity,receptionDate:'2026-01-01'}),/follow freeze/);
  assert.throws(()=>collectiveJourneyView(s,s.config,{...identity,tiers:{}}),/labels/);
  identity.privateExtra='PRIVATE';identity.tiers['private-tier-0'].budget='PRIVATE';
  assert.doesNotMatch(JSON.stringify(collectiveJourneyView(s,s.config,identity)),/PRIVATE/);
});
test('frozen level survives a later crossing and a JSON round trip',()=>{
  const before=demoCollective('before-freeze'),after=demoCollective('frozen');
  assert.equal(before.displayKm,'3480');assert.equal(before.reception.level,3);assert.equal(before.reception.frozen,false);
  assert.equal(after.displayKm,'3880');assert.equal(after.reception.displayKm,'3480');assert.equal(after.reception.level,3);
  assert.equal(after.reception.frozen,true);assert.equal(after.reception.formulaTitle,'Soirée festive');
  assert.equal(after.reception.tiers[2].status,'frozen');assert.equal(after.reception.tiers[3].status,'unreached');assert.equal(after.reception.tiers[3].included,false);
  assert.ok(Number(after.displayKm)>after.reception.tiers[3].km,'car actually passes fourth threshold after freeze');
  assert.ok(after.reception.tiers.every(t=>t.status!=='next'));
  const state=JSON.parse(JSON.stringify(collectiveState('frozen')));
  assert.deepEqual(collectiveJourneyView(state,state.config,collectiveIdentity(state)),after);
  assert.strictEqual(freezeReception(state,state.config,'2026-11-30'),state);
  assert.equal(after.reception.freezeDate,'2026-10-27');
});
test('one-team TPE inherits its distance without exposing any individual result',()=>{
  const s=collectiveState('tpe'),dto=demoCollective('tpe');
  assert.equal(s.config.teams.length,1);assert.deepEqual(dto.distance,teamDistance(s,s.config.teams[0].id));
  assert.equal(dto.displayKm,'1680');assert.equal(dto.organizationName,'Atelier fictif');
  assert.doesNotMatch(JSON.stringify(dto),/answers|score|respondent|participant|roster|private-/i);
});
test('reception at base level can be frozen; future tiers never become next',()=>{
  const s=collectiveState(),frozen=freezeReception(s,s.config,addDays(s.config.reception.cutoffDate,1));
  const dto=collectiveJourneyView(frozen,frozen.config,collectiveIdentity(frozen));
  assert.equal(dto.reception.level,0);assert.equal(dto.reception.frozen,true);assert.equal(dto.reception.formulaTitle,'Réception conviviale');
  assert.ok(dto.reception.tiers.every(t=>t.status==='unreached'&&!t.included));
});
test('repeated weekly close never advances the collective again',()=>{
  const s=collectiveState(),team=s.config.teams[0],week=s.config.weeks[23];
  const next=closeWeek(s,{...s.config,teamId:team.id,weekId:week.id,today:week.endExclusive},{kind:'joker'});
  assert.strictEqual(next,s);assert.deepEqual(collectiveJourneyView(next,next.config,collectiveIdentity(next)),demoCollective());
});
