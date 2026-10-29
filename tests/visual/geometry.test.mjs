import test from 'node:test';
import assert from 'node:assert/strict';
import { journeyRoute as route, landscapeZones } from '../../src/map/route.ts';
import { positionAt, cubicPoint, roadsideMarkers, markerInterval, markerStep, distanceRatio, distanceFromRoute } from '../../src/map/geometry.ts';
import { zoomAt } from '../../src/web/camera.ts';
test('0%, 50%, 100% remain on the continuous road; endpoints and finite tangents',()=>{
  assert.deepEqual({...positionAt(route,0),angle:0,segment:0,t:0},{...route.curves[0][0],angle:0,segment:0,t:0});
  const end=positionAt(route,1);assert.deepEqual({x:end.x,y:end.y},route.curves.at(-1)[3]);
  const segments=new Set();
  for(let i=0;i<=1000;i++){
    const p=positionAt(route,i/1000);segments.add(p.segment);
    assert.ok(Number.isFinite(p.angle));assert.ok(p.x>=0&&p.x<=route.width&&p.y>=0&&p.y<=route.height);
    assert.ok(distanceFromRoute(route,p)<.4,`outside road at ${i}`);
    assert.deepEqual({x:p.x,y:p.y},cubicPoint(route.curves[p.segment],p.t));
  }
  assert.equal(segments.size,route.curves.length);assert.ok(route.length>16000);assert.equal(landscapeZones.length,4);
});
test('arc-length mapping has nearly equal steps, including hairpins',()=>{
  const points=Array.from({length:1001},(_,i)=>positionAt(route,i/1000));
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  assert.ok(Math.max(...lengths)/Math.min(...lengths)<1.08);
  for(let i=1;i<route.curves.length;i++){
    const a=route.curves[i-1],b=route.curves[i];assert.deepEqual(a[3],b[0]);
    const cross=(a[3].x-a[2].x)*(b[1].y-b[0].y)-(a[3].y-a[2].y)*(b[1].x-b[0].x);assert.ok(Math.abs(cross)<1e-6);
  }
});
test('kilometre markers follow Dmax, not a fixed count or calendar',()=>{
  for(const maximum of [1,50,100,450,4600,4650,5200,100000,Number.MAX_SAFE_INTEGER]){
    const markers=roadsideMarkers(route,maximum),step=markerStep(maximum);
    assert.ok(markers.length<=1002);assert.equal(markers[0].km,0);assert.equal(markers.at(-1).km,maximum);
    assert.equal(new Set(markers.map(m=>m.km)).size,markers.length);
    markers.forEach(m=>{assert.equal(m.ratio,m.km/maximum);assert.ok(Number.isFinite(m.x+m.y));assert.equal(m.major,m.km%(step*5)===0);if(!m.terminal)assert.equal(m.km%step,0);});
  }
  const markers=roadsideMarkers(route,4600);assert.equal(markers.length,47);assert.equal(markers.filter(m=>m.major).length,10);
  assert.equal(markers.find(m=>m.km===2300).ratio,.5);assert.equal(roadsideMarkers(route,5200).length,53);
  for(const bad of [0,-100,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>roadsideMarkers(route,bad));
});
test('zoom selects 100, 500 or 1000 km density without moving any marker',()=>{
  assert.equal(markerInterval(4600,.85),100);assert.equal(markerInterval(4600,.4),500);assert.equal(markerInterval(4600,.07),1000);
  assert.equal(markerInterval(4600,.65),100);assert.equal(markerInterval(4600,.25),500);
  for(const z of [0,-1,NaN,Infinity])assert.throws(()=>markerInterval(4600,z));
  const all=roadsideMarkers(route,4650);for(const z of [.85,.4,.07]){const visible=all.filter(m=>m.km%markerInterval(4650,z)===0||m.terminal);assert.equal(visible.at(-1).km,4650);assert.equal(visible[0].km,0);}
});
test('exact distance ratio clamps overflow without rounding kilometres',()=>{
  assert.equal(distanceRatio({numerator:'0',denominator:'1'},4600),0);
  assert.equal(distanceRatio({numerator:'2300',denominator:'1'},4600),.5);
  assert.equal(distanceRatio({numerator:'4600',denominator:'1'},4600),1);
  assert.equal(distanceRatio({numerator:'99999',denominator:'1'},4600),1);
  assert.equal(distanceRatio({numerator:'2300'+'0'.repeat(195),denominator:'1'+'0'.repeat(195)},4600),.5);
  assert.throws(()=>distanceRatio({numerator:'-1',denominator:'1'},4600));assert.throws(()=>distanceRatio({numerator:'1',denominator:'0'},4600));
  assert.throws(()=>distanceRatio({numerator:'1',denominator:'1'},0));assert.throws(()=>positionAt(route,NaN));
});
test('zoom keeps the world point under the pointer and respects limits',()=>{
  const old={x:1600,y:800,zoom:.8},anchor={x:200,y:130},size={x:1440,y:700},next=zoomAt(old,1.7,anchor,size);
  assert.ok(Math.abs(old.x+(anchor.x-size.x/2)/old.zoom-next.x-(anchor.x-size.x/2)/next.zoom)<1e-9);
  assert.ok(Math.abs(old.y+(anchor.y-size.y/2)/old.zoom-next.y-(anchor.y-size.y/2)/next.zoom)<1e-9);
  assert.equal(zoomAt(old,100,anchor,size).zoom,1.8);assert.equal(zoomAt(old,.001,anchor,size).zoom,.45);
});

test('V4 fit-to-route fits the same world on desktop and mobile',async()=>{
 const {fitRoute}=await import('../../src/web/camera.ts');
 for(const size of [{x:1440,y:620},{x:1920,y:800},{x:370,y:500}]){
  const c=fitRoute(size,4800,2600);assert.equal(c.x,2400);assert.equal(c.y,1300);
  assert.ok(4800*c.zoom<=size.x-40+.001);assert.ok(2600*c.zoom<=size.y-140+.001);assert.ok(c.zoom>0&&c.zoom<.45);
 }
});
