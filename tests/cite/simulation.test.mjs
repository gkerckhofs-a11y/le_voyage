import test from 'node:test';import assert from 'node:assert/strict';import {simulateEconomy} from '../../scripts/simulate-cite-economy.mjs';
test('16-week economic scaffold covers four future Councils for 1, 2, 5 and 10 families',()=>{
 for(const count of [1,2,5,10]){const sim=simulateEconomy(count);assert.equal(sim.credits,16*count);assert.deepEqual(sim.checkpoints.map(c=>c.week),[4,8,12,16]);assert.ok(Object.values(sim.checkpoints.at(-1).balances).every(v=>v===280));assert.equal(sim.prices.standard,81*count);assert.ok(sim.checkpoints.every(c=>c.councilStatus==='not-implemented'));assert.ok(!JSON.stringify(sim).includes('fiction-0-0'));assert.deepEqual(sim,simulateEconomy(count));}
});
