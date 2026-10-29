import test from 'node:test';
import assert from 'node:assert/strict';
import { activeWeeks, addDays, brusselsDate, civilDate, planWeeks } from '../src/domain/calendar.ts';
test('Collective closures reduce theoretical kilometres and eligible weeks before freeze', () => {
  const all=planWeeks('2027-01-04',48);
  const plan=planWeeks('2027-01-04',48,[all[4].start,all[10].start]);
  assert.equal(activeWeeks(plan),46);
  assert.equal(activeWeeks(plan,all[43].endExclusive),42);
  assert.equal(activeWeeks(plan)*100,4600);
  assert.equal(plan.filter(w=>!w.active).length,2);
});
test('Calendar days survive Brussels summer/winter changes and year boundaries', () => {
  assert.equal(addDays('2027-03-22',7),'2027-03-29');
  assert.equal(addDays('2027-10-25',7),'2027-11-01');
  assert.equal(addDays('2027-12-27',7),'2028-01-03');
  assert.equal(brusselsDate('2027-03-28T22:30:00Z'),'2027-03-29');
  assert.equal(brusselsDate('2027-10-31T23:30:00Z'),'2027-11-01');
  assert.throws(()=>brusselsDate('2027-01-04T00:00:00'));
});
test('Reject invalid dates, partial weeks, out-of-range or duplicate closures', () => {
  assert.throws(()=>civilDate('2027-02-29'));
  assert.throws(()=>planWeeks('2027-01-05',4));
  assert.throws(()=>planWeeks('2027-01-04',4,['2028-01-03']));
  assert.throws(()=>planWeeks('2027-01-04',4,['2027-01-04','2027-01-04']));
});
