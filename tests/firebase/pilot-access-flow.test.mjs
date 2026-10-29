import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {resolve} from 'node:path';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';import {createAccessBootstrap} from '../../src/server/bootstrap-access.mjs';import {createFirebaseHttp} from '../../src/server/firebase-http.mjs';import {createDemoServer} from '../../src/server/http.mjs';import {newDemo} from '../../src/server/demo-service.mjs';
test('pilot identity flow: bootstrap, organizer, director and kiosk grants, immediate revocation and isolated sessions',async t=>{
 const a=createFirebaseEmulatorAdapter(),suffix=Date.now(),admin='pilot-admin-'+suffix,target='pilot-target-'+suffix,tenantId='pilot-access-'+suffix,password='Fictitious-Pilot-Password-42!';let server;
 t.after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await a.close();});
 for(const uid of [admin,target])await a.auth.createUser({uid,email:uid+'@example.test',password,emailVerified:true});
 const record=newDemo();record.ledger.state.config.tenantId=tenantId;const campaignId=record.ledger.state.config.campaignId,teamId=record.ledger.state.config.teams[0].id;
 await a.db.doc(`tenants/${tenantId}/campaigns/${campaignId}`).set({payload:JSON.stringify(record)});
 const bootstrap=createAccessBootstrap(a),manifest={uid:admin,email:admin+'@example.test',tenantId,campaignId,teamId,reference:'pilot-integration',reason:'Compte fictif du pilote'},preview=await bootstrap.preview(manifest);assert.equal(preview.canApply,true);await bootstrap.apply(manifest,preview.digest);
 const app=await createFirebaseHttp({adapter:a,authenticationMode:'provisioned'});server=createDemoServer({root:resolve('dist-web'),directory:resolve('.demo-state'),apiHandler:app.handler});server.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
 function client(){let cookie='',csrf='';return {
  async post(path,input){const r=await fetch(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','X-Demo-CSRF':csrf},body:JSON.stringify(input)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;},
  get:path=>fetch(origin+path,{headers:{Cookie:cookie}}),
  async directory(){const r=await this.get('/api/workspaces');assert.equal(r.status,200);const v=await r.json();csrf=v.csrf;return v;},
  async invitationLogin(uid,invitationToken){const r=await this.post('/api/auth/password',{email:uid+'@example.test',password,invitationToken});if(r.status===200){const session=await this.post('/api/invitation/session',{});assert.equal(session.status,200);csrf=(await session.json()).csrf;}return r;},
  async login(uid){const r=await this.post('/api/auth/password',{email:uid+'@example.test',password});if(r.status===200)await this.directory();return r;},
  async select(id){const r=await this.post('/api/workspaces/select',{id});assert.equal(r.status,200);return r;}
 };}
 const organizer=client(),employee=client();assert.equal((await employee.login(target)).status,403);assert.equal((await organizer.login(admin)).status,200);await organizer.select('initial-organizer');await organizer.directory();
 assert.equal((await organizer.get('/api/organizer/overview')).status,200);assert.equal((await organizer.get('/api/gifts/ops')).status,403);
 async function change(space,enabled,revision,mutationId){const r=await organizer.post('/api/access/save',{uid:target,tenantId,campaignId,space,enabled,revision,mutationId,reason:'Recette fictive'});assert.equal(r.status,200);return r.json();}
 await change('director',true,0,'director-grant');assert.equal((await employee.login(target)).status,200);let entries=(await employee.directory()).entries;assert.deepEqual(entries.map(e=>e.space),['director']);await employee.select(entries[0].id);await employee.directory();
 const progress=await employee.get('/api/director/progress');assert.equal(progress.status,200);const data=await progress.json();assert.ok(data.teams.length>0);assert.deepEqual(data.clientBudget,{status:'unavailable'});assert.doesNotMatch(JSON.stringify(data),/"(?:responses|scores|preferences|purchaseCents|supplier|surveyPrivate)"/);
 assert.equal((await employee.get('/api/gifts/ops')).status,403);assert.equal((await employee.get('/api/my-week')).status,403);assert.equal((await employee.post('/api/access/read',{uid:target})).status,403);
 await change('director',false,1,'director-revoke');assert.equal((await employee.get('/api/director/progress')).status,403);assert.equal((await employee.login(target)).status,403);
 await change('kiosk',true,2,'kiosk-grant');assert.equal((await employee.login(target)).status,200);entries=(await employee.directory()).entries;assert.deepEqual(entries.map(e=>e.space),['kiosk']);await employee.select(entries[0].id);
 const kiosk=await employee.get('/api/kiosk/progress');assert.equal(kiosk.status,200);assert.doesNotMatch(JSON.stringify(await kiosk.json()),/"(?:teams|clientBudget|responses|preferences|purchaseCents)"/);assert.equal((await employee.get('/api/workspaces')).status,403);assert.equal((await employee.get('/api/director/progress')).status,403);
 await change('kiosk',false,3,'kiosk-revoke');assert.equal((await employee.get('/api/kiosk/progress')).status,403);
 const audit=await organizer.post('/api/access/read',{uid:target});assert.equal(audit.status,200);const history=(await audit.json()).history;assert.equal(history.length,4);assert.ok(history.every(e=>e.author===admin));
 const owner=a.db.doc(`tenants/${tenantId}/members/${admin}`);
 assert.equal((await organizer.post('/api/invitation/create',{recipientUid:target})).status,403);
 await owner.update({canInvite:true});
 assert.equal((await organizer.post('/api/invitation/create',{})).status,400);
 assert.equal((await organizer.post('/api/invitation/create',{recipientUid:'../foreign'})).status,400);
 assert.equal((await organizer.post('/api/invitation/create',{recipientUid:'missing-recipient'})).status,403);
 await a.auth.updateUser(target,{disabled:true});assert.equal((await organizer.post('/api/invitation/create',{recipientUid:target})).status,403);await a.auth.updateUser(target,{disabled:false});
 const targetRef=a.db.doc(`tenants/${tenantId}/members/${target}`),beforeInvite=(await targetRef.get()).data();
 const issued=await organizer.post('/api/invitation/create',{recipientUid:target});assert.equal(issued.status,200);const invitation=await issued.json();
 const stored=(await a.db.doc('invitations/'+invitation.id).get()).data();assert.equal(stored.recipientUid,target);assert.equal(stored.scope.tenantId,tenantId);assert.ok(!JSON.stringify(stored).includes(invitation.url.split('#')[1]));assert.deepEqual((await targetRef.get()).data(),beforeInvite);
 assert.equal((await organizer.post('/api/invitation/revoke',{id:invitation.id})).status,200);assert.equal((await a.db.doc('invitations/'+invitation.id).get()).data().status,'revoked');
 const fresh=await(await organizer.post('/api/invitation/create',{recipientUid:target})).json(),freshToken=fresh.url.split('#')[1];
 const another=await(await organizer.post('/api/invitation/create',{recipientUid:target})).json();
 const wrong=client();assert.equal((await wrong.invitationLogin(admin,freshToken)).status,403);
 assert.equal((await employee.invitationLogin(target,freshToken)).status,200);
 assert.equal((await employee.get('/api/workspaces')).status,403);assert.equal((await employee.get('/api/demo/team')).status,403);assert.equal((await employee.get('/api/gifts/ops')).status,403);
 assert.equal((await employee.post('/api/invitation/preview',{token:another.url.split('#')[1]})).status,403);
 assert.equal((await employee.post('/api/invitation/preview',{token:freshToken})).status,200);
 const acceptance={token:freshToken,displayName:'Pilote invité'},accepted=await employee.post('/api/invitation/accept',acceptance);assert.equal(accepted.status,200);assert.equal((await accepted.json()).destination,'/connexion.html');
 const replay=await employee.post('/api/invitation/accept',acceptance);assert.equal(replay.status,200);assert.equal((await replay.json()).alreadyAccepted,true);
 assert.equal((await employee.get('/api/workspaces')).status,403);
 const joined=(await targetRef.get()).data();assert.equal(joined.participationEnabled,true);assert.deepEqual(joined.assignments,[{campaignId,teamId}]);
 const directory=(await a.db.doc('workspaceDirectories/'+target).get()).data();assert.equal(directory.entries.length,1);assert.equal(directory.entries[0].space,'team');
 assert.equal((await employee.login(target)).status,200);entries=(await employee.directory()).entries;await employee.select(entries[0].id);assert.equal((await employee.get('/api/demo/team')).status,200);assert.equal((await employee.get('/api/gifts/ops')).status,403);
 assert.equal((await organizer.post('/api/invitation/revoke',{id:fresh.id})).status,403);
 await owner.update({canInvite:false});assert.equal((await organizer.post('/api/invitation/create',{recipientUid:target})).status,403);
 await a.db.doc('accessAdministrators/'+admin).update({active:false});assert.equal((await organizer.post('/api/access/read',{uid:target})).status,403);
 assert.equal((await bootstrap.apply(manifest,preview.digest)).applied,false);assert.equal((await a.db.doc('accessAdministrators/'+admin).get()).data().active,false);
});
