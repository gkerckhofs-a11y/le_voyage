import test from 'node:test';
import assert from 'node:assert/strict';
import {seasonAt,applySeason,seasonThemes} from '../../src/web/seasons.ts';
import {journeyRoute} from '../../src/map/route.ts';
import {landscape} from '../../src/web/landscape.ts';
test('local civil date selects all four meteorological seasons, leap day and year boundary',()=>{
 for(const [date,season] of [['2028-02-29','winter'],['2028-03-01','spring'],['2028-05-31','spring'],['2028-06-01','summer'],['2028-08-31','summer'],['2028-09-01','autumn'],['2028-11-30','autumn'],['2028-12-01','winter'],['2029-01-01','winter']])assert.equal(seasonAt(new Date(date+'T12:00:00Z')),season);
 const instant=new Date('2028-02-29T23:30:00Z');assert.equal(seasonAt(instant,'Europe/Brussels'),'spring');assert.equal(seasonAt(instant,'America/New_York'),'winter');
 assert.throws(()=>seasonAt(new Date('invalid')));assert.throws(()=>seasonAt(instant,'bad/zone'));
});
test('season changes affect only decorative paint and preserve deterministic geometry',()=>{
 const before=JSON.stringify(journeyRoute),markup=landscape(journeyRoute),paint=new Map();
 const world={dataset:{},style:{setProperty:(name,value)=>paint.set(name,value)}};
 for(const season of Object.keys(seasonThemes)){applySeason(world,season);assert.equal(world.dataset.season,season);assert.equal(paint.size,12);assert.equal(landscape(journeyRoute),markup);assert.equal(JSON.stringify(journeyRoute),before);}
 assert.equal(new Set(Object.values(seasonThemes).map(t=>t.colors.join())).size,4);
});
