import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';
import {createAccessBootstrap} from '../../src/server/bootstrap-access.mjs';
import {createFirebaseHttp} from '../../src/server/firebase-http.mjs';
import {createDemoServer} from '../../src/server/http.mjs';
import {newDemo} from '../../src/server/demo-service.mjs';

const authEndpoint='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake';
test('organizer explicitly sends one addressed invitation through HTTP and an isolated fake transport',async t=>{
 const adapter=createFirebaseEmulatorAdapter(),id=randomUUID(),
  admin='invite-admin-'+id,recipient='invite-recipient-'+id,tenantId='invite-api-'+id,
  password='Fictitious-Invite-Api-42!',delivered=[];
 let app,server;
 t.after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
   if(app)await app.close();else await adapter.close();});
 for(const uid of [admin,recipient]){
  await adapter.auth.createUser({uid,email:uid+'@example.test',emailVerified:true,password});
 }
 const record=newDemo();record.ledger.state.config.tenantId=tenantId;
 const campaignId=record.ledger.state.config.campaignId,teamId=record.ledger.state.config.teams[0].id;
 await adapter.db.doc('tenants/'+tenantId+'/campaigns/'+campaignId).set({payload:JSON.stringify(record)});
 const init=createAccessBootstrap(adapter);
 const manifest={uid:admin,email:admin+'@example.test',tenantId,campaignId,teamId,reference:'invitation-http-test',reason:'Pilote fictif'};
 const prepared=await init.preview(manifest);assert.equal(prepared.canApply,true);await init.apply(manifest,prepared.digest);
 await adapter.db.doc('tenants/'+tenantId+'/members/'+admin).update({canInvite:true});
 app=await createFirebaseHttp({
  adapter,authenticationMode:'provisioned',
  invitationEmailOrigin:'https://demo-rc-voyage.web.app',
  invitationEmailTransport:{send:async payload=>{delivered.push(payload);}}
 });
 server=createDemoServer({root:resolve('dist-web'),directory:resolve('.demo-state'),apiHandler:app.handler});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;let cookie='',csrf='';
 const get=path=>fetch(origin+path,{headers:{Cookie:cookie}});
 const post=async(path,data)=>{
  const response=await fetch(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify(data)});
  const next=response.headers.get('set-cookie');if(next)cookie=next.split(';')[0];return response;
 };
 assert.deepEqual(await(await get('/api/auth/config')).json(),{mode:'provisioned',invitationEmailEnabled:true});
 // An unauthenticated caller cannot reach invitation delivery.
 assert.equal((await post('/api/invitation/send',{recipientUid:recipient,mutationId:'mutation-no-session'})).status,401);
 const login=await post('/api/auth/password',{email:admin+'@example.test',password});
 assert.equal(login.status,200);
 const spaces=await get('/api/workspaces');assert.equal(spaces.status,200);
 const directory=await spaces.json();csrf=directory.csrf;
 assert.equal(directory.entries.length,1);
 assert.equal(directory.entries[0].space,'organizer');
 assert.equal((await post('/api/workspaces/select',{id:directory.entries[0].id})).status,200);
 const selected=await get('/api/workspaces');assert.equal(selected.status,200);
 csrf=(await selected.json()).csrf;
 const mutationId='mutation-'+randomUUID();
 const dispatched=await post('/api/invitation/send',{recipientUid:recipient,mutationId});
 assert.equal(dispatched.status,200);
 const sent=await dispatched.json();
 assert.equal(sent.sent,true);assert.match(sent.invitationId,/^[a-f0-9]{64}$/);
 assert.ok(!JSON.stringify(sent).includes('/invitation.html#'));
 assert.equal(delivered.length,1);
 assert.equal(delivered[0].to,recipient+'@example.test');
 assert.match(delivered[0].text,/https:\/\/demo-rc-voyage\.web\.app\/invitation\.html#[a-f0-9]{64}/);
 assert.equal((await post('/api/invitation/send',{recipientUid:recipient,mutationId})).status,409);
 assert.equal((await post('/api/invitation/send',{recipientUid:recipient,mutationId:'mutation-'+randomUUID()})).status,429);
 assert.equal(delivered.length,1);
 const result=(await adapter.db.collection('invitationDeliveries').get()).docs.filter(d=>d.data().recipientUid===recipient);
 assert.equal(result.length,1);assert.equal(result[0].data().status,'sent');
 assert.equal(JSON.stringify(result[0].data()).includes('#'),false);
});
