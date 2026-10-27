import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,postponeWeek} from '../../src/domain/engine.ts';
import {planWeeks,addDays} from '../../src/domain/calendar.ts';
import {completedTeamJourney} from '../../src/application/closure.ts';
import {closeWithEvents,claimEvents,teamFeed} from '../../src/application/events.ts';
import {config,input,scope,cmd} from '../fixtures.mjs';
const viewer={...scope,teamId:'cometes',viewerId:'one'},identity={organizationName:'Fiction',teamName:'Comètes',color:'#aa4433'};
const catalog=Object.fromEntries([100,200,280].map(k=>['gift-'+k,{title:'Acquis '+k,description:'Fictif'}]));
function fresh(overrides={}){return {state:createCampaign(config({mode:'kpi',weeks:planWeeks('2027-01-04',3),giftMilestones:[100,200,280].map(k=>({id:'gift-'+k,km:k,budgetCents:1000})),...overrides})),revision:0,events:[],presented:{}};}
const decision=score=>({kind:'evaluate',input:input({mode:'kpi',score})});
for(const [percent,scores,total,thresholds] of [[55,['2','2','2'],165,[100]],[80,['3','4','4'],240,[100,200]],[100,['5','5','5'],300,[100,200,280]]]){
 test(`completion at ${percent}% preserves earned distance and only granted gifts`,()=>{
  let ledger=fresh();const weeks=ledger.state.config.weeks;
  for(let i=0;i<weeks.length;i++){
   ledger=closeWithEvents(ledger,cmd(weeks[i]),decision(scores[i]),catalog);
   assert.equal(ledger.events.filter(e=>e.kind==='closure').length,i===weeks.length-1?1:0);
  }
  const final=teamFeed(ledger,viewer,identity).closure;
  assert.deepEqual(final.distance,{numerator:String(total),denominator:'1'});assert.equal(final.maximumKm,300);assert.deepEqual(final.acquiredThresholds,thresholds);
  assert.equal(Object.keys(ledger.state.entitlements).length,thresholds.length);
  assert.strictEqual(closeWithEvents(ledger,cmd(weeks.at(-1)),{kind:'joker'},catalog),ledger);
  const restored=JSON.parse(JSON.stringify(ledger));assert.deepEqual(teamFeed(restored,viewer,identity).closure,final);
  const claimed=claimEvents(restored,viewer,[final.id,final.id]);assert.equal(claimed.events.length,1);assert.equal(claimEvents(claimed.ledger,viewer,[final.id]).events.length,0);
  assert.deepEqual(teamFeed(claimed.ledger,viewer,identity).closure,final);
  final.distance.numerator='999999';final.acquiredThresholds.push(999999);assert.equal(ledger.events.find(e=>e.kind==='closure').distance.numerator,String(total));
 });
}
test('pending report prevents completion; final joker completes once after its window',()=>{
 let ledger=fresh({weeks:planWeeks('2027-01-04',1)});const week=ledger.state.config.weeks[0];
 ledger={...ledger,state:postponeWeek(ledger.state,cmd(week,'cometes',week.start))};
 assert.equal(completedTeamJourney(ledger.state,scope,'cometes'),null);
 assert.throws(()=>closeWithEvents(ledger,cmd(week),{kind:'joker'},catalog),/window/);
 ledger=closeWithEvents(ledger,cmd(week,'cometes',addDays(week.endExclusive,7)),{kind:'joker'},catalog);
 const closure=teamFeed(ledger,viewer,identity).closure;assert.equal(closure.date,addDays(week.endExclusive,7));assert.equal(closure.distance.numerator,'70');assert.deepEqual(closure.acquiredThresholds,[]);
 assert.strictEqual(closeWithEvents(ledger,cmd(week),decision('5'),catalog),ledger);
});
test('trailing collective pause adds neither maximum distance nor another completion',()=>{
 let ledger=fresh({weeks:planWeeks('2027-01-04',2,['2027-01-11'])});const [active,closed]=ledger.state.config.weeks;
 ledger=closeWithEvents(ledger,cmd(active),decision('2'),catalog);
 const snapshot=teamFeed(ledger,viewer,identity).closure;assert.equal(snapshot.maximumKm,100);assert.equal(snapshot.distance.numerator,'55');
 ledger=closeWithEvents(ledger,cmd(closed),decision('5'),catalog);
 assert.deepEqual(teamFeed(ledger,viewer,identity).closure,snapshot);assert.equal(ledger.events.filter(e=>e.kind==='closure').length,1);
});
test('completion is scoped to one team; cannot claim another team or tenant',()=>{
 const weeks=planWeeks('2027-01-04',1);let ledger=fresh({weeks,teams:['cometes','other'].map(id=>({id,eligibleWeekIds:weeks.map(w=>w.id)}))});
 ledger=closeWithEvents(ledger,cmd(weeks[0],'other'),decision('5'),catalog);
 assert.equal(teamFeed(ledger,viewer,identity).closure,null);
 assert.throws(()=>claimEvents(ledger,viewer,[ledger.events.find(e=>e.kind==='closure').id]),/denied/);
 assert.throws(()=>completedTeamJourney(ledger.state,{...scope,tenantId:'foreign'},'other'),/denied/);
 assert.throws(()=>completedTeamJourney(ledger.state,scope,'unknown'),/denied/);
 assert.doesNotMatch(JSON.stringify(teamFeed(ledger,{...viewer,teamId:'other'},identity).closure),/teamId|tenantId|budget|gift-|supplier/);
});
