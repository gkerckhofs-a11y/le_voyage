import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';
import {createInvitations} from '../../src/server/invitations.mjs';
import {newDemo} from '../../src/server/demo-service.mjs';
async function user(adapter){const uid='invite-'+randomUUID(),email=uid+'@example.test',password='Fictitious-test-42!';await adapter.auth.createUser({uid,email,password});const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});assert.equal(r.status,200);return {uid,header:'Bearer '+(await r.json()).idToken};}
async function setup(t){const a=createFirebaseEmulatorAdapter();t.after(()=>a.close());const issuer=await user(a),recipient=await user(a),stranger=await user(a),record=newDemo();record.ledger.state.config.tenantId='invites-'+randomUUID();const scope={tenantId:record.ledger.state.config.tenantId,campaignId:record.ledger.state.config.campaignId,teamId:'explorateurs'};await a.db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`).set({payload:JSON.stringify(record)});const owner=a.db.doc(`tenants/${scope.tenantId}/members/${issuer.uid}`);await owner.set({uid:issuer.uid,tenantId:scope.tenantId,active:true,canInvite:true,assignments:[{campaignId:scope.campaignId,teamId:scope.teamId}]});return {a,issuer,recipient,stranger,scope,owner};}
test('invitation binds authenticated recipient, stores only digest, and accepts atomically once',async t=>{
 const {a,issuer,recipient,stranger,scope}=await setup(t),service=createInvitations(a),invite=await service.issue(issuer.header,scope,recipient.uid);
 assert.equal(invite.id,createHash('sha256').update(invite.token).digest('hex'));
 assert.ok(!JSON.stringify((await a.db.doc('invitations/'+invite.id).get()).data()).includes(invite.token));
 await assert.rejects(service.preview(stranger.header,invite.token),{status:403});await assert.rejects(service.accept(stranger.header,invite.token,'Intrus'),{status:403});
 await assert.rejects(service.accept(recipient.header,invite.token,'<script>'),{status:400});
 const results=await Promise.all([1,2,3].map(()=>service.accept(recipient.header,invite.token,'Camille')));assert.equal(results.filter(r=>!r.alreadyAccepted).length,1);
 const member=(await a.db.doc(`tenants/${scope.tenantId}/members/${recipient.uid}`).get()).data();assert.equal(member.assignments.length,1);assert.equal(member.canInvite,undefined);
 assert.equal((await a.db.doc(`tenants/${scope.tenantId}/profiles/${recipient.uid}`).get()).data().displayName,'Camille');
 assert.equal((await a.read(recipient.header,scope)).journey.displayKm,'1680');
 await assert.rejects(service.issue(recipient.header,scope,stranger.uid),{status:403});
 const reopened=createInvitations(a);assert.equal((await reopened.accept(recipient.header,invite.token,'Autre nom')).alreadyAccepted,true);
 assert.equal((await a.db.doc(`tenants/${scope.tenantId}/profiles/${recipient.uid}`).get()).data().displayName,'Camille');
 await a.db.doc(`tenants/${scope.tenantId}/members/${recipient.uid}`).update({active:false});await assert.rejects(service.accept(recipient.header,invite.token,'Camille'),{status:403});
});
test('expired, revoked, foreign scope and withdrawn issuer permission are refused',async t=>{
 const {a,issuer,recipient,stranger,scope,owner}=await setup(t);let clock=10000;const service=createInvitations(a,{now:()=>clock,lifetimeMs:100});
 const expired=await service.issue(issuer.header,scope,recipient.uid);clock+=101;await assert.rejects(service.accept(recipient.header,expired.token,'Camille'),{status:403});
 const revoked=await service.issue(issuer.header,scope,recipient.uid);await service.revoke(issuer.header,scope,revoked.id);await assert.rejects(service.preview(recipient.header,revoked.token),{status:403});
 await assert.rejects(service.revoke(stranger.header,scope,revoked.id),{status:403});
 await assert.rejects(service.issue(issuer.header,{...scope,tenantId:'foreign'},recipient.uid),{status:403});
 const withdrawn=await service.issue(issuer.header,scope,recipient.uid);await owner.update({canInvite:false});await assert.rejects(service.accept(recipient.header,withdrawn.token,'Camille'),{status:403});
 assert.equal((await a.db.doc(`tenants/${scope.tenantId}/members/${recipient.uid}`).get()).exists,false);
});
test('signup creates a single optional gourmand profile and never overwrites existing tastes',async t=>{
 const {a,issuer,recipient,scope}=await setup(t),service=createInvitations(a),invite=await service.issue(issuer.header,scope,recipient.uid),ref=a.db.doc(`tenants/${scope.tenantId}/giftPreferences/${recipient.uid}`);
 assert.equal((await service.preview(recipient.header,invite.token)).hasGiftPreferences,false);
 const preferences={choices:['tea','chocolate'],surprise:false,alcoholFree:true,birthday:null,privateContactRequested:false,revision:0};
 await assert.rejects(service.accept(recipient.header,invite.token,'Camille',{...preferences,choices:['wine']}),{status:400});
 assert.equal((await ref.get()).exists,false);assert.equal((await a.db.doc(`tenants/${scope.tenantId}/members/${recipient.uid}`).get()).exists,false);
 await service.accept(recipient.header,invite.token,'Camille',preferences);
 const saved=(await ref.get()).data();assert.equal(saved.revision,1);assert.deepEqual(saved.value.choices,['tea','chocolate']);
 const second=await service.issue(issuer.header,scope,recipient.uid);assert.equal((await service.preview(recipient.header,second.token)).hasGiftPreferences,true);
 await service.accept(recipient.header,second.token,'Camille',{...preferences,choices:['delicatessen']});
 await service.accept(recipient.header,invite.token,'Camille',null);
 assert.deepEqual((await ref.get()).data(),saved);
});
test('absence of tastes never prevents signup and explicitly leaves the surprise to Clem',async t=>{
 const {a,issuer,recipient,scope}=await setup(t),service=createInvitations(a),invite=await service.issue(issuer.header,scope,recipient.uid);
 await service.accept(recipient.header,invite.token,'Camille');
 const p=(await a.db.doc(`tenants/${scope.tenantId}/giftPreferences/${recipient.uid}`).get()).data();assert.equal(p.value.surprise,true);assert.deepEqual(p.value.choices,[]);assert.equal(p.revision,1);
});
test('provisioned acceptance validates directory before writes and creates exactly one team entry without restoring revoked entries',async t=>{
 const {a,issuer,recipient,scope}=await setup(t),service=createInvitations(a,{provisionWorkspaces:true}),invite=await service.issue(issuer.header,scope,recipient.uid),directory=a.db.doc('workspaceDirectories/'+recipient.uid),preferences=a.db.doc(`tenants/${scope.tenantId}/giftPreferences/${recipient.uid}`);
 await directory.set({uid:recipient.uid,active:false,entries:[],revision:0});await assert.rejects(service.accept(recipient.header,invite.token,'Invité'),{status:403});assert.equal((await preferences.get()).exists,false);
 await directory.set({uid:recipient.uid,active:true,entries:Array.from({length:20},(_,i)=>({id:'old-'+i,space:'gifts',label:'Autre espace'})),revision:4});await assert.rejects(service.accept(recipient.header,invite.token,'Invité'),{status:403});assert.equal((await preferences.get()).exists,false);
 const other={id:'other-gifts',space:'gifts',label:'Autre espace'};await directory.set({uid:recipient.uid,active:true,entries:[other],revision:4});
 const results=await Promise.all([1,2,3].map(()=>service.accept(recipient.header,invite.token,'Invité')));assert.equal(results.filter(r=>!r.alreadyAccepted).length,1);const data=(await directory.get()).data();assert.equal(data.entries.length,2);assert.deepEqual(data.entries[0],other);assert.equal(data.revision,5);assert.equal(data.entries[1].space,'team');assert.equal((await a.db.doc(`tenants/${scope.tenantId}/members/${recipient.uid}`).get()).data().participationEnabled,true);
 await directory.update({entries:[other],revision:6});assert.equal((await service.accept(recipient.header,invite.token,'Invité')).alreadyAccepted,true);assert.deepEqual((await directory.get()).data().entries,[other]);
});
