import test from 'node:test';import assert from 'node:assert/strict';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';import {createWorkspaceAccess} from '../../src/server/workspace-access.mjs';import {newDemo} from '../../src/server/demo-service.mjs';
test('explicit tenant administrator grants and revokes read-only spaces atomically with durable replay',async t=>{
 const a=createFirebaseEmulatorAdapter();t.after(()=>a.close());const suffix=Date.now(),uid='target-'+suffix,admin='admin-'+suffix,tenantId='access-'+suffix,record=newDemo();record.ledger.state.config.tenantId=tenantId;const campaignId=record.ledger.state.config.campaignId;
 for(const user of [uid,admin])await a.auth.createUser({uid:user,email:user+'@example.test',password:'Fictitious-Password-42!',emailVerified:true});
 const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:admin+'@example.test',password:'Fictitious-Password-42!',returnSecureToken:true})});const header='Bearer '+(await response.json()).idToken;
 const service=createWorkspaceAccess(a),grant=a.db.doc('accessAdministrators/'+admin),directory=a.db.doc('workspaceDirectories/'+uid),member=a.db.doc(`tenants/${tenantId}/members/${uid}`);
 await a.db.doc(`tenants/${tenantId}/campaigns/${campaignId}`).set({payload:JSON.stringify(record)});
 const input={uid,tenantId,campaignId,space:'director',enabled:true,revision:0,mutationId:'first',reason:'Accès validé'};
 await assert.rejects(service.save(header,input),{status:403});await grant.set({uid:admin,active:true,tenants:['foreign']});await assert.rejects(service.save(header,input),{status:403});await grant.update({tenants:[tenantId]});
 assert.deepEqual(await service.save(header,input),{applied:true,revision:1});assert.deepEqual(await service.save(header,input),{applied:false,revision:1});
 assert.deepEqual((await member.get()).data().directorCampaigns,[campaignId]);assert.equal((await member.get()).data().participationEnabled,false);assert.equal((await directory.get()).data().entries.length,1);
 await assert.rejects(service.save(header,{...input,space:'organizer'}),{status:400});await assert.rejects(service.save(header,{...input,reason:'different'}),{status:409});
 const results=await Promise.allSettled([service.save(header,{...input,space:'kiosk',revision:1,mutationId:'tv'}),service.save(header,{...input,enabled:false,revision:1,mutationId:'revoke'})]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.find(x=>x.status==='rejected').reason.status,409);
 const current=(await directory.get()).data();assert.equal(current.revision,2);
 await service.save(header,{...input,enabled:false,revision:2,mutationId:'final-revoke'});assert.deepEqual((await member.get()).data().directorCampaigns,[]);assert.ok(!(await directory.get()).data().entries.some(x=>x.space==='director'));
 await grant.update({active:false});await assert.rejects(service.save(header,input),{status:403});
 await grant.update({active:true});await a.auth.updateUser(uid,{disabled:true});await assert.rejects(service.save(header,{...input,revision:3,mutationId:'disabled'}),{status:403});
});
