import test from 'node:test';import assert from 'node:assert/strict';import {randomBytes,createHash} from 'node:crypto';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';import {createSessionStore} from '../../src/server/session-store.mjs';import {createSessionMaintenance} from '../../src/server/session-maintenance.mjs';
test('expired session maintenance previews, rejects stale batches, preserves active sessions and replays without deletion',async t=>{
 const a=createFirebaseEmulatorAdapter();t.after(()=>a.close());let now=10;const store=createSessionStore(a,{now:()=>now}),service=createSessionMaintenance(a,{now:()=>now}),tokens=[0,1,2].map(()=>randomBytes(32).toString('hex'));
 const ref=token=>a.db.doc('serverSessions/'+createHash('sha256').update(token).digest('hex'));
 for(let i=0;i<3;i++)await store.issue(null,tokens[i],{header:'Bearer PRIVATE-CONTENT',csrf:'PRIVATE-CSRF',expires:[100,200,2000][i]});
 now=1000;const input={cutoff:1000,limit:1},first=await service.preview(input);assert.equal(first.count,1);assert.equal(first.more,true);assert.equal((await ref(tokens[0]).get()).exists,true);assert.doesNotMatch(JSON.stringify(first),/PRIVATE|Bearer|csrf|encrypted/);
 await ref(tokens[0]).update({expires:3000});await assert.rejects(service.apply(input,first.digest),{status:409});assert.equal((await ref(tokens[1]).get()).exists,true);
 const next=await service.preview(input);assert.equal(next.count,1);assert.equal(next.more,false);
 const race=await Promise.all([service.apply(input,next.digest),service.apply(input,next.digest)]);assert.equal(race.filter(r=>r.applied).length,1);assert.equal(race.reduce((n,r)=>n+r.deleted,0),1);assert.equal((await ref(tokens[1]).get()).exists,false);
 assert.equal((await ref(tokens[0]).get()).exists,true);assert.equal((await store.get(tokens[2])).header,'Bearer PRIVATE-CONTENT');assert.deepEqual(await service.apply(input,next.digest),{applied:false,deleted:0});
 const marker=(await a.db.doc('sessionMaintenance/'+next.digest).get()).data();assert.deepEqual(Object.keys(marker).sort(),['cutoff','deleted','limit','recordedAt']);
 const empty=await service.preview(input);assert.equal(empty.count,0);assert.equal((await service.apply(input,empty.digest)).deleted,0);
 for(const patch of [{cutoff:1001},{cutoff:-1},{cutoff:1.5},{limit:0},{limit:101},{limit:1.1},{extra:true}])await assert.rejects(service.preview({...input,...patch}),{status:400});
 await assert.rejects(service.apply(input,'wrong'),{status:400});
 const boundary=randomBytes(32).toString('hex');await store.issue(null,boundary,{header:'Bearer BOUNDARY',expires:1100});now=1100;const edge={cutoff:1100,limit:100},edgePreview=await service.preview(edge);assert.equal(edgePreview.count,1);await service.apply(edge,edgePreview.digest);assert.equal((await ref(boundary).get()).exists,false);assert.equal((await store.get(tokens[2])).header,'Bearer PRIVATE-CONTENT');
});
