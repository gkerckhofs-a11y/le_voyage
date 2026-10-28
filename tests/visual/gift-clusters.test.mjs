import test from 'node:test';import assert from 'node:assert/strict';
import {groupNearbyPoints} from '../../src/map/geometry.ts';
test('screen groups conserve every index, include transitive neighbours and never mutate source positions',()=>{
 const points=[{x:0,y:0},{x:40,y:0},{x:80,y:0},{x:500,y:500}],copy=structuredClone(points);
 assert.deepEqual(groupNearbyPoints(points,58),[[0,1,2],[3]]);assert.deepEqual(points,copy);assert.deepEqual(groupNearbyPoints(points,20),[[0],[1],[2],[3]]);assert.deepEqual(groupNearbyPoints([],58),[]);
 assert.deepEqual(groupNearbyPoints([{x:1,y:1},{x:1,y:1}],58),[[0,1]]);
 for(const r of [0,-1,NaN,Infinity])assert.throws(()=>groupNearbyPoints(points,r));assert.throws(()=>groupNearbyPoints([{x:NaN,y:0}],58));assert.throws(()=>groupNearbyPoints(Array.from({length:101},()=>({x:0,y:0})),58));
});
