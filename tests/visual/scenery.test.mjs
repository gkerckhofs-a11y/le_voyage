import test from 'node:test';import assert from 'node:assert/strict';
import {journeyRoute as route} from '../../src/map/route.ts';
import {landscape,landscapeRiver,scenicFeatures} from '../../src/web/landscape.ts';
import {distanceFromRoute} from '../../src/map/geometry.ts';
test('scenic landmarks remain deterministic, off the road and river, without altering the route',()=>{
 const original=JSON.stringify(route),features=scenicFeatures(route);assert.deepEqual(features,scenicFeatures(route));
 for(const kind of ['hamlet','orchard','sheep','castle','deer','hill'])assert.ok(features.some(f=>f.kind===kind),kind);
 for(const f of features){assert.ok(distanceFromRoute(route,f)>=f.radius+45);assert.ok(distanceFromRoute(landscapeRiver,f)>=f.radius+80);assert.ok(f.x>=f.radius&&f.y>=f.radius&&f.x<=route.width-f.radius&&f.y<=route.height-f.radius);}
 assert.ok(features.filter(f=>f.kind==='hill').every(f=>f.ratio>=.75));assert.ok(features.filter(f=>f.kind==='deer'||f.kind==='castle').every(f=>f.ratio>=.5&&f.ratio<.75));
 const markup=landscape(route);assert.equal(markup,landscape(route));assert.ok((markup.match(/data-scenery="forest"/g)||[]).length>60);assert.equal(JSON.stringify(route),original);
});
