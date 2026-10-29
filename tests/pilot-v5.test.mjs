import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {simulate} from '../scripts/simulate.mjs';import {pilotV5} from '../scripts/pilot-v5.mjs';import {exact,compare,mean} from '../src/domain/exact.ts';
test('historical twelve-week fixture is unchanged without explicit V5 selection',()=>{assert.deepEqual(simulate(),JSON.parse(readFileSync(new URL('../docs/simulation-12-semaines.json',import.meta.url),'utf8')));});
test('V5 pilot is reproducible across three fictional clients and preserves exact collective means',()=>{
 const p=pilotV5();assert.deepEqual(p,pilotV5());assert.deepEqual(p,JSON.parse(readFileSync(new URL('../docs/pilot-v5-12-weeks.json',import.meta.url),'utf8')));assert.equal(p.clients.length,3);assert.equal(p.checkpoints.length,36);
 for(const c of p.clients){assert.deepEqual(c.giftThresholds,[110,470,970]);assert.equal(c.rows.length,12);assert.equal(c.activeWeeks,11);assert.equal(c.individualAbsences,2);assert.equal(c.jokers,1);assert.deepEqual(c.convoyKm,mean(c.teamKm.map(t=>t.exact)));
 assert.equal(c.rows.filter(r=>!r.active).length,1);for(const r of c.rows)assert.ok(r.active?compare(r.convoyKm,exact('40'))>=0&&compare(r.convoyKm,exact('100'))<=0:compare(r.convoyKm,exact('0'))===0);
 assert.equal(c.milestonesEarned,c.teamKm.reduce((sum,t)=>sum+c.giftThresholds.filter(k=>compare(t.exact,exact(String(k)))>=0).length,0));assert.equal(c.giftTasksCreated,c.milestonesEarned);assert.equal(c.budgetDueCents,c.giftBudgetAcquiredCents+c.reception.budgetCents);assert.ok(c.budgetDueCents<=c.maximumBudgetCents);
 }
});
test('reported week never doubles progress, freeze remains stable and post-freeze kilometers still advance',()=>{
 const p=pilotV5();for(const id of ['demo-tpe','demo-pme','demo-lex-ekho']){const rows=p.checkpoints.filter(r=>r.clientId===id),client=p.clients[['demo-tpe','demo-pme','demo-lex-ekho'].indexOf(id)];assert.equal(rows[0].start,'2027-03-01');assert.equal(rows.at(-1).endExclusive,'2027-05-24');
 for(const [i,r] of rows.entries()){assert.equal(r.convoys,i+1);assert.equal(r.outcomes,(i+1)*client.teamSizes.length);assert.equal(r.reports,i<6?0:1);assert.equal(r.gifts,r.tasks);}
 const frozen=rows.filter(r=>r.frozen);assert.ok(frozen.length>=2);for(const r of frozen){assert.equal(r.frozenKm,frozen[0].frozenKm);assert.equal(r.frozenLevel,frozen[0].frozenLevel);}assert.ok(compare(client.convoyKm,client.reception.km)>0);
 }
});
