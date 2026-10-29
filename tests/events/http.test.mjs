import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,readdir,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createDemoServer } from '../../src/server/http.mjs';
import { FileSessionStore } from '../../src/server/file-store.mjs';
import { newDemo } from '../../src/server/demo-service.mjs';
const root=resolve('dist-web');
async function fixture(t){
  const directory=await mkdtemp(resolve(tmpdir(),'rc-events-')),server=createDemoServer({root,directory});server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true});});
  return {directory,server,base};
}
async function session(base){
  const response=await fetch(base+'/api/demo/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
  assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict/);
  const data=await response.json();assert.deepEqual(Object.keys(data),['csrf']);
  return {cookie:cookie.split(';')[0],csrf:data.csrf};
}
const get=(base,s,path='/api/demo/team')=>fetch(base+path,{headers:{Cookie:s.cookie}});
const post=(base,s,path,data,extra={})=>fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:s.cookie,'X-Demo-CSRF':s.csrf,...extra},body:JSON.stringify(data)});
async function advanceN(base,s,n,from=0){let data;for(let revision=from;revision<from+n;revision++){const response=await post(base,s,'/api/demo/advance',{revision});assert.equal(response.status,200);data=await response.json();}return data;}

test('API requires opaque session, exact origin and CSRF; clients cannot set scope or score',async t=>{
  const {base}=await fixture(t),s=await session(base);
  assert.equal((await fetch(base+'/api/demo/team')).status,401);
  assert.equal((await post(base,s,'/api/demo/advance',{revision:0},{Origin:'https://other.example'})).status,403);
  assert.equal((await post(base,s,'/api/demo/advance',{revision:0},{'X-Demo-CSRF':'wrong'})).status,403);
  assert.equal((await post(base,s,'/api/demo/advance',{revision:0,teamId:'other'})).status,400);
  assert.equal((await post(base,s,'/api/demo/advance',{revision:0,score:5})).status,400);
  assert.equal((await post(base,s,'/api/demo/advance',{revision:99})).status,409);
  assert.equal((await get(base,s,'/api/demo/team?tenantId=other')).status,400);
  assert.equal((await post(base,s,'/api/demo/claim',{eventIds:['unknown']})).status,400);
  assert.equal((await post(base,s,'/api/demo/session',{extra:'x'.repeat(5000)})).status,413);
  const feed=await(await get(base,s)).json();assert.equal(feed.revision,0);assert.equal(feed.journey.displayKm,'1680');
});
test('concurrent retries advance exactly one week and claims are atomic',async t=>{
  const {base}=await fixture(t),s=await session(base);
  const responses=await Promise.all(Array.from({length:8},()=>post(base,s,'/api/demo/advance',{revision:0}).then(r=>r.json())));
  assert.equal(responses.filter(r=>r.applied).length,1);
  const feed=await(await get(base,s)).json();assert.equal(feed.revision,1);assert.equal(feed.journey.displayKm,'1780');
  const claims=await Promise.all([1,2].map(()=>post(base,s,'/api/demo/claim',{eventIds:feed.unseenEventIds}).then(r=>r.json())));
  assert.deepEqual(claims.map(c=>c.events.length).sort(),[0,1]);
});
test('gift is absent before crossing, emitted once, and private files never served',async t=>{
  const {base,directory}=await fixture(t),s=await session(base);
  const before=await advanceN(base,s,7);assert.equal(before.feed.journey.displayKm,'2380');assert.deepEqual(before.feed.attentions,[]);
  assert.doesNotMatch(JSON.stringify(before),/Une pause gourmande|Le panier des artisans|budget|private-gift|private-person/);
  const after=await advanceN(base,s,1,7);assert.equal(after.feed.journey.displayKm,'2480');assert.equal(after.feed.attentions.length,1);assert.equal(after.feed.attentions[0].title,'Une pause gourmande');
  const replay=await post(base,s,'/api/demo/advance',{revision:7}).then(r=>r.json());assert.equal(replay.applied,false);assert.equal(replay.feed.attentions.length,1);
  assert.doesNotMatch(JSON.stringify(after),/Le panier des artisans|milestone|budget|responses|private-/);
  const files=await readdir(directory);assert.equal(files.length,1);
  const privateState=JSON.parse(await readFile(resolve(directory,files[0]),'utf8'));
  assert.equal(Object.keys(privateState.ledger.state.entitlements).length,4);assert.equal(Object.keys(privateState.ledger.state.tasks).length,4);
  for(const path of ['/src/server/demo-service.mjs','/src/application/events.ts','/scripts/demo-collective.mjs','/.demo-state/'+files[0],'/../package.json','/data/team.json'])assert.equal((await get(base,s,path)).status,404);
  const collective=await(await get(base,s,'/api/demo/collective')).json();assert.equal(collective.displayKm,'2480');assert.doesNotMatch(JSON.stringify(collective),/explorateurs|teamId|attentions|budget|private-/);
});
test('another browser session cannot see or claim the first session discoveries',async t=>{
  const {base}=await fixture(t),a=await session(base),b=await session(base);
  const earned=await advanceN(base,a,8),id=earned.feed.attentions[0].id;
  const other=await(await get(base,b)).json();assert.equal(other.journey.displayKm,'1680');assert.deepEqual(other.attentions,[]);
  assert.equal((await post(base,b,'/api/demo/claim',{eventIds:[id]})).status,404);
  assert.equal((await(await get(base,a)).json()).attentions[0].unread,true);
});
test('complete simulation retains the frozen reception and finishes without duplicate gifts',async t=>{
  const {base}=await fixture(t),s=await session(base);
  await advanceN(base,s,18);
  const before=await(await get(base,s,'/api/demo/collective')).json();
  const after=await advanceN(base,s,4,18);
  const frozen=await(await get(base,s,'/api/demo/collective')).json();
  assert.equal(before.displayKm,'3480');assert.equal(frozen.displayKm,'3880');
  assert.equal(frozen.reception.level,3);assert.equal(frozen.reception.frozen,true);assert.equal(frozen.reception.displayKm,'3480');
  assert.equal(after.feed.attentions.length,4);assert.equal(new Set(after.feed.attentions.map(e=>e.id)).size,4);
  assert.equal(after.feed.closure.kind,'closure');assert.equal(after.feed.closure.distance.numerator,'3880');assert.equal(after.feed.closure.acquiredThresholds.length,4);
  assert.equal(after.feed.canAdvance,false);assert.equal(after.feed.journey.completedWeeks,46);
  const retry=await post(base,s,'/api/demo/advance',{revision:22}).then(r=>r.json());
  assert.equal(retry.applied,false);assert.deepEqual(retry.feed,after.feed);
  assert.doesNotMatch(JSON.stringify(after),/Le souvenir du voyage|milestone|private-/);
});
test('state and presentation receipt survive a real server process restart',async t=>{
  const {base,directory,server}=await fixture(t),s=await session(base),earned=await advanceN(base,s,22);
  await post(base,s,'/api/demo/claim',{eventIds:earned.feed.unseenEventIds});await new Promise(r=>server.close(r));
  const script=`import {createDemoServer} from './src/server/http.mjs';const s=createDemoServer({root:${JSON.stringify(root)},directory:${JSON.stringify(directory)}});s.listen(0,'127.0.0.1',()=>console.log(s.address().port));`;
  const child=spawn(process.execPath,['--input-type=module','-e',script],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});
  t.after(()=>child.kill());
  const port=await Promise.race([once(child.stdout,'data').then(([data])=>Number(String(data).trim())),once(child,'exit').then(()=>{throw new Error('Restart failed');})]);
  const restored=await(await get(`http://127.0.0.1:${port}`,s)).json();
  assert.equal(restored.journey.displayKm,'3880');assert.deepEqual(restored.closure,earned.feed.closure);
  const repeated=await post(`http://127.0.0.1:${port}`,s,'/api/demo/claim',{eventIds:[restored.closure.id]}).then(r=>r.json());assert.deepEqual(repeated.events,[]);
  assert.equal(restored.attentions[0].id,earned.feed.attentions[0].id);assert.equal(restored.attentions[0].unread,false);assert.deepEqual(restored.unseenEventIds,[]);
  const exited=once(child,'exit');child.kill();await exited;
});
test('failed transaction leaves the durable record unchanged and next transaction works',async t=>{
  const {directory}=await fixture(t),store=new FileSessionStore(directory),record=newDemo(),token=await store.create(record);
  await assert.rejects(store.transact(token,current=>{current.ledger.revision=999;throw new Error('Interrupted');}),/Interrupted/);
  assert.equal((await store.read(token)).ledger.revision,0);
  await store.transact(token,current=>({record:{...current,ledger:{...current.ledger,revision:1}},value:null}));
  assert.equal((await new FileSessionStore(directory).read(token)).ledger.revision,1);
  assert.throws(()=>createDemoServer({root,directory:resolve(root,'private')}),/outside/);
});
