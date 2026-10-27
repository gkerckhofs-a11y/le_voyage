import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign, postponeWeek } from '../../src/domain/engine.ts';
import { planWeeks, addDays } from '../../src/domain/calendar.ts';
import { closeWithEvents, claimEvents, teamFeed } from '../../src/application/events.ts';
import { config, input, scope, cmd } from '../fixtures.mjs';
const identity={organizationName:'Fiction',teamName:'Comètes',color:'#aa4433'},viewer={...scope,teamId:'cometes',viewerId:'one'};
const catalog={'gift-1':{title:'Attention acquise',description:'Composition à confirmer',budget:'PRIVATE'},'gift-2':{title:'FUTURE-SECRET',description:'PRIVATE'}};
const fresh=(overrides={})=>({state:createCampaign(config({mode:'kpi',...overrides})),revision:0,events:[],presented:{}});
const decision={kind:'evaluate',input:input({mode:'kpi'})};
test('weekly outcome, convoy, entitlement and reveal are each emitted once',()=>{
  const first=fresh(),week=first.state.config.weeks[0];
  const next=closeWithEvents(first,cmd(week),decision,catalog);
  assert.equal(Object.keys(next.state.entitlements).length,1);assert.equal(Object.keys(next.state.tasks).length,1);
  assert.deepEqual(next.events.map(e=>e.kind),['progress','convoy','attention']);assert.equal(new Set(next.events.map(e=>e.id)).size,3);
  assert.strictEqual(closeWithEvents(next,cmd(week),{kind:'joker'},catalog),next);
  const restored=JSON.parse(JSON.stringify(next));assert.deepEqual(closeWithEvents(restored,cmd(week),decision,catalog),restored);
});
test('feed exposes no future content, entitlement keys, budgets or other team events',()=>{
  let ledger=fresh({teams:[{id:'cometes',eligibleWeekIds:config().weeks.map(w=>w.id)},{id:'PRIVATE-OTHER',eligibleWeekIds:config().weeks.map(w=>w.id)}],giftMilestones:[{id:'gift-1',km:70,budgetCents:10000},{id:'gift-2',km:140,budgetCents:12000}]});
  assert.deepEqual(teamFeed(ledger,viewer,identity).attentions,[]);
  const week=ledger.state.config.weeks[0];for(const id of ['cometes','PRIVATE-OTHER'])ledger=closeWithEvents(ledger,cmd(week,id),decision,catalog);
  const feed=teamFeed(ledger,viewer,identity),json=JSON.stringify(feed);
  assert.equal(feed.attentions.length,1);assert.equal(feed.unseenEventIds.length,2);
  assert.doesNotMatch(json,/FUTURE|PRIVATE|budget|milestone|entitlement|tenantId|viewerId|convoy|scores|weights/);
  const before=JSON.stringify(ledger);feed.journey.distance.numerator='999';assert.equal(JSON.stringify(ledger),before);
});
test('claim is private to viewer/team and idempotent; history survives presentation',()=>{
  const first=fresh(),ledger=closeWithEvents(first,cmd(first.state.config.weeks[0]),decision,catalog),ids=teamFeed(ledger,viewer,identity).unseenEventIds;
  assert.throws(()=>teamFeed(ledger,{...viewer,tenantId:'other'},identity),/denied/);
  assert.throws(()=>claimEvents(ledger,{...viewer,campaignId:'other'},ids),/denied/);
  assert.throws(()=>claimEvents(ledger,{...viewer,teamId:'other'},ids),/denied/);
  assert.throws(()=>claimEvents(ledger,viewer,['unknown']),/denied/);
  const receipt=claimEvents(ledger,viewer,[...ids,...ids]);assert.equal(receipt.events.length,2);
  assert.equal(claimEvents(receipt.ledger,viewer,ids).events.length,0);
  assert.equal(teamFeed(receipt.ledger,viewer,identity).attentions[0].unread,false);
  assert.equal(claimEvents(receipt.ledger,{...viewer,viewerId:'two'},ids).events.length,2);
});
test('missing publication content aborts the whole pure transition',()=>{
  const first=fresh(),before=JSON.stringify(first);
  assert.throws(()=>closeWithEvents(first,cmd(first.state.config.weeks[0]),decision,{}),/Missing/);
  assert.equal(JSON.stringify(first),before);
});
test('postponement and joker create no duplicate; closure contributes zero',()=>{
  let ledger=fresh({weeks:planWeeks('2027-01-04',4,['2027-01-11'])});const [week,closed]=ledger.state.config.weeks;
  ledger={...ledger,state:postponeWeek(ledger.state,cmd(week,'cometes',week.start))};
  assert.throws(()=>closeWithEvents(ledger,cmd(week),{kind:'joker'},catalog),/window/);
  const command=cmd(week,'cometes',addDays(week.endExclusive,7));ledger=closeWithEvents(ledger,command,{kind:'joker'},catalog);
  assert.strictEqual(closeWithEvents(ledger,command,decision,catalog),ledger);
  ledger=closeWithEvents(ledger,cmd(closed),decision,catalog);
  assert.equal(ledger.events.filter(e=>e.kind==='attention').length,1);
  assert.equal(ledger.events.filter(e=>e.kind==='progress').at(-1).km.numerator,'0');
});
