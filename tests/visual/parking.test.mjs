import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyRoute as route} from '../../src/map/route.ts';
import {landscapeRiver} from '../../src/web/landscape.ts';
import {positionAt,distanceFromRoute} from '../../src/map/geometry.ts';
import {parkingPose,parkingMarkup} from '../../src/web/parking.ts';
test('parking stays beside earned 55/80/100% point with no change to route',()=>{
 const original=JSON.stringify(route);
 for(const ratio of [.55,.8,1]){
  const earned=positionAt(route,ratio),p=parkingPose(route,ratio);
  assert.ok(Math.abs(Math.hypot(p.x-earned.x,p.y-earned.y)-170)<.00001);
  assert.deepEqual({...parkingPose(route,ratio,0),angle:earned.angle},{x:earned.x,y:earned.y,angle:earned.angle});
  for(let t=0;t<=1;t+=.05){const q=parkingPose(route,ratio,t);assert.ok(Number.isFinite(q.angle));assert.ok(Math.hypot(q.x-earned.x,q.y-earned.y)<=171);}
  assert.ok(distanceFromRoute(landscapeRiver,p)>130);
  assert.match(parkingMarkup(route,ratio),/arrival-parking/);
 }
 assert.equal(JSON.stringify(route),original);
});
