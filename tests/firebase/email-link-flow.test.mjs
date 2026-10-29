import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';
import {createFirebaseHttp} from '../../src/server/firebase-http.mjs';
import {createDemoServer} from '../../src/server/http.mjs';
import {createInvitations} from '../../src/server/invitations.mjs';
import {newDemo} from '../../src/server/demo-service.mjs';

const emulator='http://127.0.0.1:9099';
async function authRest(path,body){
 const r=await fetch(emulator+'/identitytoolkit.googleapis.com/v1/accounts:'+path+'?key=fake-key',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
 });
 const data=await r.json();return {status:r.status,data};
}

test('Firebase emulated email-link sign in retains invited UID, grants only temporary invitation access and opens only team after acceptance',async t=>{
 const a=createFirebaseEmulatorAdapter(),suffix=randomUUID(),issuerUid='mail-issuer-'+suffix,
  recipientUid='mail-recipient-'+suffix,otherUid='mail-other-'+suffix,tenantId='mail-flow-'+suffix;
 const password='Emulator-Only-Example-42!';let app,server;
 t.after(async()=>{
  if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
  if(app)await app.close();else await a.close();
 });
 for(const uid of [issuerUid,recipientUid,otherUid]){
  await a.auth.createUser({uid,email:uid+'@example.test',emailVerified:true,password});
 }
 const issuer=await authRest('signInWithPassword',{email:issuerUid+'@example.test',password,returnSecureToken:true});
 assert.equal(issuer.status,200);
 const record=newDemo();record.ledger.state.config.tenantId=tenantId;
 const campaignId=record.ledger.state.config.campaignId,teamId=record.ledger.state.config.teams[0].id;
 const scope={tenantId,campaignId,teamId};
 await a.db.doc('tenants/'+tenantId+'/campaigns/'+campaignId).set({payload:JSON.stringify(record)});
 await a.db.doc('tenants/'+tenantId+'/members/'+issuerUid).set({uid:issuerUid,tenantId,active:true,canInvite:true,assignments:[{campaignId,teamId}]});
 const issued=await createInvitations(a,{provisionWorkspaces:true}).issue('Bearer '+issuer.data.idToken,scope,recipientUid);
 // The Auth emulator records the out-of-band code. There is no email delivery.
 const recipientEmail=recipientUid+'@example.test';
 const requested=await authRest('sendOobCode',{requestType:'EMAIL_SIGNIN',email:recipientEmail,continueUrl:'https://rc-voyage-test-20261027.web.app/email-link.html'});
 assert.equal(requested.status,200,JSON.stringify(requested.data));
 const pending=await(await fetch(emulator+'/emulator/v1/projects/demo-rc-voyage/oobCodes')).json();
 const code=pending.oobCodes.find(x=>x.email===recipientEmail&&x.requestType==='EMAIL_SIGNIN')?.oobCode;
 assert.ok(code,'The emulator should expose the recipient email-signin OOB code');
 const signed=await authRest('signInWithEmailLink',{email:recipientEmail,oobCode:code,returnSecureToken:true});
 assert.equal(signed.status,200,JSON.stringify(signed.data));
 assert.equal(signed.data.localId,recipientUid,'Email link must authenticate the pre-existing invited UID');
 app=await createFirebaseHttp({adapter:a,authenticationMode:'provisioned'});
 server=createDemoServer({root:resolve('dist-web'),directory:resolve('.demo-state'),apiHandler:app.handler});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 let cookie='',csrf='';
 const post=async(path,value)=>{
  const r=await fetch(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify(value)});
  const next=r.headers.get('set-cookie');if(next)cookie=next.split(';')[0];return r;
 };
 const get=path=>fetch(origin+path,{headers:{Cookie:cookie}});
 const noSpace=await post('/api/auth/identity',{idToken:signed.data.idToken});
 assert.equal(noSpace.status,403);
 const restricted=await post('/api/auth/identity',{idToken:signed.data.idToken,invitationToken:issued.token});
 assert.equal(restricted.status,200);
 assert.deepEqual(await restricted.json(),{connected:true,destination:'/invitation.html'});
 assert.equal((await get('/api/workspaces')).status,403);
 assert.equal((await get('/api/director/progress')).status,403);
 assert.equal((await get('/api/gifts/ops')).status,403);
 const session=await post('/api/invitation/session',{});assert.equal(session.status,200);
 csrf=(await session.json()).csrf;
 assert.equal((await post('/api/invitation/accept',{token:issued.token,displayName:'Voyageur test'})).status,200);
 assert.equal((await get('/api/workspaces')).status,403,'Session must stay invitation-only after acceptance');
 const next=await post('/api/auth/identity',{idToken:signed.data.idToken});
 assert.equal(next.status,200);
 assert.deepEqual((await(await get('/api/workspaces')).json()).entries.map(x=>x.space),['team']);
 assert.equal((await get('/api/director/progress')).status,403);
});
