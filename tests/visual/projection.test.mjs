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
  assert.deepEqual(Object.keys(dto),['timeZone','schemaVersion','routeId','organizationName','team','distance','displayKm','maximumKm','activeWeeks','completedWeeks','history','stages']);
  assert.equal(dto.team.id,'cometes');assert.equal(dto.history.length,1);assert.equal(dto.maximumKm,400);
  assert.doesNotMatch(json,/PRIVATE|budget|responses|participant|preferences|tenantId|convoy|reception|scores|weights/);
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
  assert.doesNotMatch(JSON.stringify(dto),/private-|autre-equipe|budget|responses/);assert.deepEqual(dto,demoJourney());
});
test('V4 route stages expose only generic thresholds; hidden surprises and logistics stay private',()=>{
 const c=config({giftMilestones:[{id:'secret-sku',km:70,budgetCents:99999},{id:'private-next',km:140,budgetCents:88888}]});
 let state=createCampaign(c);state.config.hiddenSurprises=[{date:'2027-02-03',title:'SECRET-SURPRISE',supplier:'SECRET-SUPPLIER'}];
 const read=()=>teamJourneyView(state,{...scope,teamId:'cometes'},identity);
 assert.deepEqual(read().stages[0],{id:'route-1',thresholdKm:70,remainingKm:70,status:'next',label:'Cadeau mystère à débloquer'});
 assert.equal(read().stages[1].status,'upcoming');
 assert.doesNotMatch(JSON.stringify(read()),/secret-sku|private-next|99999|88888|SECRET|hiddenSurprises|supplier/);
 const week=state.config.weeks[0];state=closeWeek(state,{...scope,teamId:'cometes',weekId:week.id,today:week.endExclusive},{kind:'joker'});
 assert.equal(read().stages[0].status,'unlocked');assert.equal(read().stages[0].remainingKm,0);assert.equal(read().stages[1].status,'next');assert.equal(read().stages[1].remainingKm,70);
});
