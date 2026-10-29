import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../scripts/simulate.mjs';
test('12-week simulator: three reproducible fictitious campaigns within budgets and no KPI dependency in autonomous mode',()=>{
  const first=simulate();
  assert.deepEqual(simulate(),first);
  assert.equal(first.clients.length,3);
  for(const c of first.clients) {
    assert.equal(c.rows.length,12);
    assert.equal(c.activeWeeks,11);
    assert.equal(c.individualAbsences,2);
    assert.equal(c.jokers,1);
    assert.equal(c.giftTasksCreated,c.milestonesEarned);
    assert.ok(c.budgetDueCents<=c.maximumBudgetCents);
    assert.ok(c.reception.frozenOn);
    assert.equal(c.rows.filter(r=>!r.active).length,1);
  }
  assert.equal(first.clients[0].mode,'autonomous');
  assert.equal(first.clients[1].mode,'autonomous');
});
