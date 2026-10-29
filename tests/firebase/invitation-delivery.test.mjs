import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';
import {createInvitations} from '../../src/server/invitations.mjs';
import {createInvitationDelivery} from '../../src/server/invitation-delivery.mjs';
import {newDemo} from '../../src/server/demo-service.mjs';

const endpoint='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key';
async function setup(t){
 const adapter=createFirebaseEmulatorAdapter();
 t.after(()=>adapter.close());
 const unique=randomUUID(),issuerUid='send-issuer-'+unique,recipientUid='send-recipient-'+unique,password='Test-Invitation-Send-42!';
 for(const uid of [issuerUid,recipientUid])await adapter.auth.createUser({uid,email:uid+'@example.test',password,emailVerified:true});
 const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:issuerUid+'@example.test',password,returnSecureToken:true})});
 assert.equal(r.status,200);const header='Bearer '+(await r.json()).idToken;
 const record=newDemo();record.ledger.state.config.tenantId='send-'+unique;
 const campaignId=record.ledger.state.config.campaignId,teamId=record.ledger.state.config.teams[0].id,tenantId=record.ledger.state.config.tenantId,scope={tenantId,campaignId,teamId};
 await adapter.db.doc('tenants/'+tenantId+'/campaigns/'+campaignId).set({payload:JSON.stringify(record)});
 const issuer=adapter.db.doc('tenants/'+tenantId+'/members/'+issuerUid);
 await issuer.set({uid:issuerUid,tenantId,active:true,canInvite:true,assignments:[{campaignId,teamId}]});
 return {adapter,header,issuer,recipientUid,scope};
}
test('staging invitation delivery requires exact verified recipient, sends once and persists throttle without exposing token',async t=>{
 const {adapter,header,issuer,recipientUid,scope}=await setup(t);const messages=[];
 let clock=Date.now();
 const invitations=createInvitations(adapter,{now:()=>clock,provisionWorkspaces:true});
 const delivery=createInvitationDelivery({adapter,invitations,transport:{send:async value=>messages.push(value)},origin:'https://rc-voyage-test-20261027.web.app',now:()=>clock});
 const args={recipientUid,mutationId:'mutation-first-'+randomUUID()};
 assert.deepEqual(await delivery.status(header,scope,{recipientUid}),{status:'none'});
 const result=await delivery.send(header,scope,args);
 assert.equal(result.sent,true);assert.match(result.invitationId,/^[a-f0-9]{64}$/);
 assert.equal(messages.length,1);
 assert.equal(messages[0].to,recipientUid+'@example.test');
 assert.match(messages[0].text,/https:\/\/rc-voyage-test-20261027\.web\.app\/invitation\.html#[a-f0-9]{64}/);
 assert.equal(JSON.stringify(result).includes('#'),false);
 const pending=await adapter.db.doc('invitations/'+result.invitationId).get();
 assert.equal(pending.data().recipientUid,recipientUid);
 assert.equal(pending.data().status,'pending');
 await assert.rejects(delivery.send(header,scope,args),{status:409});
 await assert.rejects(delivery.send(header,scope,{...args,mutationId:'mutation-second-'+randomUUID()}),{status:429});
 assert.equal(messages.length,1);
 assert.deepEqual(await delivery.status(header,scope,{recipientUid}),{status:'sent',startedAt:clock,sentAt:clock,retryAfter:600000});
 const stored=(await adapter.db.collection('invitationDeliveries').get()).docs.find(d=>d.data().recipientUid===recipientUid);
 await stored.ref.update({text:'private mail body',token:'secret-must-not-leak',providerResponse:'private provider data'});
 const state=await delivery.status(header,scope,{recipientUid});
 assert.deepEqual(Object.keys(state).sort(),['retryAfter','sentAt','startedAt','status']);
 clock+=600001;
 await adapter.auth.updateUser(recipientUid,{emailVerified:false});
 assert.equal((await delivery.status(header,scope,{recipientUid})).status,'sent');
 await assert.rejects(delivery.send(header,scope,{...args,mutationId:'mutation-third-'+randomUUID()}),{status:403});
 assert.equal(messages.length,1);
 await issuer.update({canInvite:false});
 await assert.rejects(delivery.status(header,scope,{recipientUid}),{status:403});
});
test('mailer failure leaves an auditable review state and revokes undelivered invitation',async t=>{
 const {adapter,header,recipientUid,scope}=await setup(t);const invitations=createInvitations(adapter,{provisionWorkspaces:true});
 const delivery=createInvitationDelivery({adapter,invitations,transport:{send:async()=>{throw Error('provider ambiguous failure');}},origin:'https://rc-voyage-test-20261027.web.app'});
 await assert.rejects(delivery.send(header,scope,{recipientUid,mutationId:'mail-failure-'+randomUUID()}),{status:503});
 const records=await adapter.db.collection('invitationDeliveries').get();
 const item=records.docs.find(x=>x.data().recipientUid===recipientUid);
 assert.ok(item);assert.equal(item.data().status,'review');assert.equal(item.data().revoked,true);
 const invite=await adapter.db.doc('invitations/'+item.data().invitationId).get();
 assert.equal(invite.data().status,'revoked');
 const state=await delivery.status(header,scope,{recipientUid});assert.equal(state.status,'review');assert.equal(state.revoked,true);
});
test('missing mail transport, insecure origin and unauthorized organizer cannot send',async t=>{
 const {adapter,issuer,recipientUid,scope}=await setup(t);
 const invitations=createInvitations(adapter);
 assert.throws(()=>createInvitationDelivery({adapter,invitations,transport:{},origin:'https://rc-voyage-test-20261027.web.app'}),TypeError);
 assert.throws(()=>createInvitationDelivery({adapter,invitations,transport:{send:async()=>{}},origin:'http://unsafe.test'}),TypeError);
 const delivery=createInvitationDelivery({adapter,invitations,transport:{send:async()=>{throw Error('must not run');}},origin:'https://rc-voyage-test-20261027.web.app'});
 const stranger=await adapter.auth.createUser({uid:'stranger-'+randomUUID(),email:'stranger-'+randomUUID()+'@example.test',emailVerified:true,password:'Fictitious-Sender-42!'});
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:stranger.email,password:'Fictitious-Sender-42!',returnSecureToken:true})});
 const token=(await response.json()).idToken;
 await assert.rejects(delivery.send('Bearer '+token,scope,{recipientUid,mutationId:'mutation-denied-'+randomUUID()}),{status:403});
 await assert.rejects(delivery.status('Bearer '+token,scope,{recipientUid}),{status:403});
 await assert.rejects(delivery.status('Bearer '+token,{...scope,tenantId:'other-tenant'},{recipientUid}),{status:403});
 const deliveries=await adapter.db.collection('invitationDeliveries').get();
 assert.equal(deliveries.docs.filter(doc=>doc.data().recipientUid===recipientUid).length,0);
 // Other parallel tests may legitimately share this emulator collection.
});

test('delivery status distinguishes legacy reservations and rejects a mismatched record pointer',async t=>{
 const {adapter,header,recipientUid,scope}=await setup(t);
 const invitations=createInvitations(adapter),delivery=createInvitationDelivery({adapter,invitations,transport:{send:async()=>{}},origin:'https://rc-voyage-test-20261027.web.app'});
 await delivery.send(header,scope,{recipientUid,mutationId:'status-integrity-'+randomUUID()});
 const locks=await adapter.db.collection('invitationDeliveryLimits').get();
 const records=await adapter.db.collection('invitationDeliveries').get();
 const record=records.docs.find(d=>d.data().recipientUid===recipientUid);
 const lock=locks.docs.find(d=>d.data().deliveryId===record.id);
 await record.ref.update({teamId:'another-team'});
 await assert.rejects(delivery.status(header,scope,{recipientUid}),{status:503});
 await lock.ref.set({at:Date.now(),mutationIdHash:'legacy-reservation'});
 assert.deepEqual(await delivery.status(header,scope,{recipientUid}),{status:'unknown'});
});
