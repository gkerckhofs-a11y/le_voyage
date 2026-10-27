import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirebaseEmulatorAdapter,assertEmulators,projectId} from '../../src/server/firebase-emulator.mjs';
import {newDemo} from '../../src/server/demo-service.mjs';

test('production and incomplete emulator configuration fail closed',()=>{
 for(const env of [{},{GCLOUD_PROJECT:'le-voyage-f0ae3'}, {...process.env,NODE_ENV:'production'}])assert.throws(()=>assertEmulators(env),/emulators/);
});
test('Auth + Firestore: isolation, atomic retries, private rules and durable discovery',async t=>{
 const adapter=createFirebaseEmulatorAdapter();t.after(()=>adapter.close());
 const base=newDemo(),campaignId=base.ledger.state.config.campaignId,teamId='explorateurs';
 const users=[];
 for(const tenantId of ['client-a','client-b']){
  const signup=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${tenantId}-${Date.now()}@example.test`,password:'Fictitious-Test-Only-42!',returnSecureToken:true})});
  assert.equal(signup.status,200);const {idToken,localId:uid}=await signup.json();
  const record=newDemo();record.ledger.state.config.tenantId=tenantId;
  await adapter.db.doc(`tenants/${tenantId}/campaigns/${campaignId}`).set({payload:JSON.stringify(record)});
  await adapter.db.doc(`tenants/${tenantId}/members/${uid}`).set({uid,tenantId,active:true,assignments:[{campaignId,teamId}]});
  users.push({header:'Bearer '+idToken,uid,scope:{tenantId,campaignId,teamId}});
 }
 const [a,b]=users;
 assert.equal((await adapter.read(a.header,a.scope)).journey.displayKm,'1680');
 await assert.rejects(adapter.read(a.header,b.scope),{status:403});
 await assert.rejects(adapter.read('Bearer invalid',a.scope),{status:403});
 await assert.rejects(adapter.read(a.header,{...a.scope,teamId:'other'}),{status:403});
 const responses=await Promise.all(Array.from({length:4},()=>adapter.simulate(a.header,a.scope,0)));
 assert.equal(responses.filter(r=>r.applied).length,1);
 for(let revision=1;revision<8;revision++)await adapter.simulate(a.header,a.scope,revision);
 const earned=await adapter.read(a.header,a.scope);assert.equal(earned.journey.displayKm,'2480');assert.equal(earned.attentions.length,1);
 assert.equal((await adapter.read(b.header,b.scope)).journey.displayKm,'1680');
 const claims=await Promise.all([1,2].map(()=>adapter.claim(a.header,a.scope,earned.unseenEventIds)));
 assert.equal(claims.flatMap(c=>c.events).filter(e=>e.kind==='attention').length,1);
 const reopened=createFirebaseEmulatorAdapter();try{const restored=await reopened.read(a.header,a.scope);assert.equal(restored.attentions[0].unread,false);assert.equal(restored.journey.displayKm,'2480');}finally{await reopened.close();}
 const doc=`http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/tenants/client-a/campaigns/${campaignId}`;
 for(const headers of [{},{Authorization:a.header},{Authorization:b.header}])assert.equal((await fetch(doc,{headers})).status,403);
 assert.equal((await fetch(doc,{method:'PATCH',headers:{Authorization:a.header,'Content-Type':'application/json'},body:JSON.stringify({fields:{payload:{stringValue:'forged'}}})})).status,403);
 await adapter.db.doc(`tenants/client-a/members/${a.uid}`).update({active:false});
 await assert.rejects(adapter.simulate(a.header,a.scope,8),{status:403});
 await adapter.auth.updateUser(b.uid,{disabled:true});await assert.rejects(adapter.read(b.header,b.scope),{status:403});
});
