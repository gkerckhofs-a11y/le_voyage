import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyRoute} from '../../src/map/route.ts';
import {distanceFromRoute} from '../../src/map/geometry.ts';
import {composeScenery} from '../../src/web/scenery-composition.ts';
import {landscape,landscapeRiver,scenicFeatures} from '../../src/web/landscape.ts';
import {applySeason,seasonThemes} from '../../src/web/seasons.ts';

test('composed countryside is deterministic, contains different habitats and stays away from road/river',()=>{
 const features=scenicFeatures(journeyRoute),before=JSON.stringify(journeyRoute);
 const first=composeScenery(journeyRoute,landscapeRiver,features);
 assert.deepEqual(first,composeScenery(journeyRoute,landscapeRiver,features));
 assert.ok(first.placed.length>75,'habitats should contain a substantial amount of grounded vegetation');
 for(const biome of ['bocage','valley','forest','hills'])
  assert.ok(first.placed.filter(x=>x.kind===biome).length>=5,'empty habitat: '+biome);
 for(const point of first.placed){
  assert.ok(distanceFromRoute(journeyRoute,point)>=point.radius+62,'tree overlaps road');
  assert.ok(distanceFromRoute(landscapeRiver,point)>=point.radius+65,'tree overlaps river');
  assert.ok(!features.some(f=>Math.hypot(f.x-point.x,f.y-point.y)<f.radius+point.radius+41),'tree overlaps landmark');
 }
 assert.equal(JSON.stringify(journeyRoute),before);
 const markup=landscape(journeyRoute);
 for(const motif of ['autumn','winter','spring','summer'])assert.match(markup,new RegExp('data-season-detail="'+motif+'"'));
 for(const kind of ['farmstead','bocage-tree','valley-tree','forest','hills-tree'])assert.match(markup,new RegExp('data-scenery="'+kind+'"'));
 assert.match(markup,/id="pumpkin"/);
 assert.match(markup,/id="snow-drift"/);
 assert.match(markup,/id="blossom-petal"/);
 assert.match(markup,/id="hay-bale"/);
 for(const id of ['bocage-haze','valley-haze','forest-haze','hills-haze','harvest-haze'])assert.match(markup,new RegExp('id="'+id+'"'));
 for(const detail of ['stone','grass','shrub','riverbank'])assert.match(markup,new RegExp('data-ground-detail="'+detail+'"'));
 assert.doesNotMatch(first.terrain,/L3950 350L3790 1270/,'avoid rigid zone boundaries');

 assert.ok((markup.match(/data-scenery="forest"/g)||[]).length>60);
});
test('seasonal details toggle in place without changing the route or camera',()=>{
 const groups=['spring','summer','autumn','winter'].map(name=>({
  name,display:'none',getAttribute(key){return key==='data-season-detail'?this.name:null;},
  setAttribute(key,value){if(key==='display')this.display=value;}
 }));
 const style=new Map(),world={dataset:{},style:{setProperty:(k,v)=>style.set(k,v)},querySelectorAll:()=>groups};
 for(const season of Object.keys(seasonThemes)){
  applySeason(world,season);
  assert.equal(world.dataset.season,season);
  assert.deepEqual(groups.filter(g=>g.display==='inline').map(g=>g.name),[season]);
  assert.equal(groups.filter(g=>g.display==='none').length,3);
  assert.equal(style.size,15);
 }
});
