import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignDate, planRollingYear } from '../src/domain/rolling-calendar.ts';
import { activeWeeks, addDays } from '../src/domain/calendar.ts';
import { closeWeek, createCampaign, postponeWeek, teamDistance } from '../src/domain/engine.ts';
import { thresholds } from '../src/domain/scoring.ts';
import { exact } from '../src/domain/exact.ts';
import { cmd, config } from './fixtures.mjs';
const options = start => ({start,evaluationWeekday:7,partialWeeks:'exclude',leapDayAnniversary:'february-28'});

test('January, March and November each retain a contiguous local twelve-month campaign',()=>{
 for(const start of ['2026-01-01','2026-03-18','2026-11-30','2026-01-31','2020-12-28']){
  const plan=planRollingYear(options(start));
  assert.equal(plan.start,start);assert.equal(plan.endExclusive,String(Number(start.slice(0,4))+1)+start.slice(4));
  assert.equal(plan.timeZone,'Europe/Brussels');assert.equal(plan.weeks[0].start,start);assert.equal(plan.weeks.at(-1).endExclusive,plan.endExclusive);
  assert.equal(new Set(plan.weeks.map(w=>w.id)).size,plan.weeks.length);
  for(let i=0;i<plan.weeks.length;i++){const w=plan.weeks[i];assert.equal(w.evaluationDate,addDays(w.endExclusive,-1));assert.equal(w.active,!w.partial);if(i)assert.equal(plan.weeks[i-1].endExclusive,w.start);}
 }
});
test('Leap anniversary is an explicit choice and never silently overflows February',()=>{
 assert.equal(planRollingYear(options('2028-02-29')).endExclusive,'2029-02-28');
 assert.equal(planRollingYear({...options('2028-02-29'),leapDayAnniversary:'march-1'}).endExclusive,'2029-03-01');
 assert.equal(planRollingYear(options('2027-02-28')).endExclusive,'2028-02-28');
 assert.throws(()=>planRollingYear({...options('2028-02-29'),leapDayAnniversary:undefined}));
});
test('Partial weeks require a decision; closures reduce maxima and computed thresholds',()=>{
 const base={...options('2026-11-04'),evaluationWeekday:5};
 const a=planRollingYear(base),b=planRollingYear({...base,partialWeeks:'full-credit'});
 assert.equal(a.weeks[0].evaluationDate,'2026-11-06');assert.equal(a.weeks[0].active,false);assert.equal(b.weeks[0].active,true);
 const closedStarts=a.weeks.filter(w=>w.active).slice(0,6).map(w=>w.start);
 const c=planRollingYear({...base,closedStarts});
 assert.equal(activeWeeks(c.weeks),activeWeeks(a.weeks)-6);
 assert.ok(thresholds(activeWeeks(c.weeks),5,'gift')[0]<thresholds(activeWeeks(a.weeks),5,'gift')[0]);
 const end=a.weeks[4].endExclusive;
 assert.equal(activeWeeks(a.weeks,end),activeWeeks(a.weeks,addDays(end,-1))+1);
 assert.throws(()=>planRollingYear({...base,partialWeeks:undefined}));
 assert.throws(()=>planRollingYear({...base,closedStarts:['2025-01-01']}));
 assert.throws(()=>planRollingYear({...base,closedStarts:[closedStarts[0],closedStarts[0]]}));
});
test('Local dates respect midnight, DST and separate campaign timezones',()=>{
 assert.equal(campaignDate('2027-03-28T22:30:00Z'),'2027-03-29');
 assert.equal(campaignDate('2027-10-31T23:30:00Z'),'2027-11-01');
 assert.equal(campaignDate('2026-12-31T23:30:00Z'),'2027-01-01');
 assert.equal(campaignDate('2026-12-31T23:30:00Z','America/New_York'),'2026-12-31');
 assert.throws(()=>campaignDate('2026-11-04T10:00:00'));
 assert.throws(()=>planRollingYear({...options('2026-11-04'),timeZone:'Invalid/Zone'}));
 for(const evaluationWeekday of [0,8,1.5])assert.throws(()=>planRollingYear({...options('2026-11-04'),evaluationWeekday}));
});
test('Engine accepts only explicit rolling periods, preserves reports and joker idempotence',()=>{
 const calendar={...options('2026-11-04'),partialWeeks:'full-credit'};
 const {weeks}=planRollingYear(calendar);let state=createCampaign(config({calendar,weeks}));const first=weeks[0];
 state=postponeWeek(state,cmd(first,'cometes',first.start));
 assert.throws(()=>closeWeek(state,cmd(first),{kind:'joker'}),/open/);
 const command=cmd(first,'cometes',addDays(first.endExclusive,7));
 state=closeWeek(state,command,{kind:'joker'});
 assert.equal(state.config.weeks.length,weeks.length);assert.deepEqual(teamDistance(state,'cometes'),exact('70'));
 assert.strictEqual(closeWeek(state,command,{kind:'joker'}),state);assert.equal(Object.keys(state.entitlements).length,1);
 assert.throws(()=>createCampaign(config({weeks})),/periods/);
 assert.throws(()=>createCampaign(config({calendar,weeks:weeks.map((w,i)=>i? w:{...w,active:false})})),/rolling/);
});
test('Excluded partial period cannot consume a joker or award a gift',()=>{
 const calendar=options('2026-11-04'),{weeks}=planRollingYear(calendar);
 const state=closeWeek(createCampaign(config({calendar,weeks})),cmd(weeks[0]),{kind:'joker'});
 assert.deepEqual(teamDistance(state,'cometes'),exact('0'));assert.equal(Object.keys(state.entitlements).length,0);
});
