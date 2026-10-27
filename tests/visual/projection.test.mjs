import test from 'node:test';
import assert from 'node:assert/strict';
import { config, input, scope } from '../fixtures.mjs';
import { planWeeks } from '../../src/domain/calendar.ts';
import { createCampaign, closeWeek } from '../../src/domain/engine.ts';
import { teamJourneyView } from '../../src/presentation/journey-view.ts';
import { demoJourney } from '../../scripts/demo-journey.mjs';
const identity={organizationName:'Fiction',teamName:'Selected team',color:'#bf4a32'};
test('projection includes only the authorized team; no gift plans, budget or other teams',()=>{
  const c=config(),weeks=c.weeks;
  let s=createCampaign({...c,teams:[...c.teams,{id:'PRIVATE-OTHER-TEAM',eligibleWeekIds:weeks.map(w=>w.id)}]});
  for(const teamId of ['cometes','PRIVATE-OTHER-TEAM'])s=closeWeek(s,{...scope,teamId,weekId:weeks[0].id,today:weeks[0].endExclusive},{kind:'evaluate',input:input()});
  const dto=teamJourneyView(s,{...scope,teamId:'cometes'},{...identity,privateExtra:'PRIVATE-EXTRA'}),json=JSON.stringify(dto);
  assert.deepEqual(Object.keys(dto),['schemaVersion','routeId','organizationName','team','distance','displayKm','maximumKm','activeWeeks','completedWeeks','history']);
  assert.equal(dto.team.id,'cometes');assert.equal(dto.history.length,1);assert.equal(dto.maximumKm,400);
  assert.doesNotMatch(json,/PRIVATE|gift-|milestone|budget|responses|participant|preferences|tenantId|convoy|reception|scores|weights/);
  assert.notEqual(Object.keys(s.entitlements).length,0,'fixture has a real acquired entitlement which must not leak operational metadata');
});
test('foreign scope and unknown teams denied; inactive weeks excluded from maximum',()=>{
  const weeks=planWeeks('2027-01-04',4,['2027-01-11']),s=createCampaign(config({weeks}));
  assert.throws(()=>teamJourneyView(s,{...scope,tenantId:'OTHER',teamId:'cometes'},identity),/denied/);
  assert.throws(()=>teamJourneyView(s,{...scope,campaignId:'OTHER',teamId:'cometes'},identity),/denied/);
  assert.throws(()=>teamJourneyView(s,{...scope,teamId:'OTHER'},identity),/denied/);
  assert.equal(teamJourneyView(s,{...scope,teamId:'cometes'},identity).maximumKm,300);
});
test('projection cannot mutate the private domain state',()=>{
  let s=createCampaign(config());s=closeWeek(s,{...scope,teamId:'cometes',weekId:s.config.weeks[0].id,today:s.config.weeks[0].endExclusive},{kind:'evaluate',input:input()});
  const before=JSON.stringify(s),dto=teamJourneyView(s,{...scope,teamId:'cometes'},identity);dto.history[0].distance.numerator='9999';
  assert.equal(JSON.stringify(s),before);
});
test('demo is calculated by existing engine: 24 weeks, 1680 km, latest 85 km',()=>{
  const dto=demoJourney();assert.equal(dto.completedWeeks,24);assert.equal(dto.displayKm,'1680');assert.equal(dto.history.at(-1).displayKm,'85');assert.equal(dto.maximumKm,4600);
  assert.doesNotMatch(JSON.stringify(dto),/private-|autre-equipe|gift|budget|responses/);assert.deepEqual(dto,demoJourney());
});
