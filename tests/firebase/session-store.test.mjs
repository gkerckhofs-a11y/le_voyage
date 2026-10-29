import test from 'node:test';import assert from 'node:assert/strict';import {randomBytes,createHash} from 'node:crypto';import {once} from 'node:events';import {resolve} from 'node:path';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';import {createSessionStore} from '../../src/server/session-store.mjs';import {createFirebaseHttp} from '../../src/server/firebase-http.mjs';import {createDemoServer} from '../../src/server/http.mjs';
const token=()=>randomBytes(32).toString('hex'),key='42'.repeat(32);
test('shared session records encrypt secrets, bind ciphertext to the token and expire without extension',async t=>{
 const a=createFirebaseEmulatorAdapter();t.after(()=>a.close());let now=Date.now();const first=createSessionStore(a,{key,now:()=>now}),second=createSessionStore(a,{key,now:()=>now}),id=token(),next=token(),payload={header:'Bearer PRIVATE-ID-TOKEN',csrf:'PRIVATE-CSRF',scope:{tenantId:'a',campaignId:'b'},expires:now+3300000};
 assert.throws(()=>createSessionStore(a,{key:'short'}));await first.issue(null,id,payload);const read=await second.get(id);assert.equal(read.header,payload.header);
 const ref=a.db.doc('serverSessions/'+createHash('sha256').update(id).digest('hex')),stored=(await ref.get()).data();assert.doesNotMatch(JSON.stringify(stored),/PRIVATE-|tenantId|Bearer/);assert.equal((await a.db.doc('serverSessions/'+id).get()).exists,false);
 assert.equal(await createSessionStore(a,{key:'43'.repeat(32)}).get(id),null);
 const copied=a.db.doc('serverSessions/'+createHash('sha256').update(next).digest('hex'));await copied.set(stored);assert.equal(await second.get(next),null);await copied.delete();
 await ref.update({expires:stored.expires+1});assert.equal(await second.get(id),null);await ref.set(stored);
 now+=1000;await assert.rejects(second.rotate(id,next,{...read,expires:payload.expires+1}),{status:409});await second.rotate(id,next,read);assert.equal(await first.get(id),null);assert.equal((await first.get(next)).expires,payload.expires);
 now=payload.expires;assert.equal(await second.get(next),null);assert.equal(await second.get('invalid'),null);
});
test('session compare-and-swap rejects competing rotations and stale logout across stores',async t=>{
 const a=createFirebaseEmulatorAdapter();t.after(()=>a.close());const first=createSessionStore(a,{key}),second=createSessionStore(a,{key}),id=token(),one=token(),two=token();await first.issue(null,id,{header:'Bearer test',csrf:'test',expires:Date.now()+3000000});const session=await first.get(id);
 const results=await Promise.allSettled([first.rotate(id,one,session),second.rotate(id,two,session)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);assert.equal(await first.get(id),null);
 await assert.rejects(second.revoke(id,session._version),{status:409});const active=(await first.get(one))?one:two;const fresh=await second.get(active);await first.revoke(active,fresh._version);assert.equal(await second.get(active),null);
});
test('HTTP sessions survive process replacement and rotate and logout consistently across instances',async t=>{
 const instances=[];let now=Date.now();
 async function start(){const adapter=createFirebaseEmulatorAdapter(),app=await createFirebaseHttp({adapter,sessionEncryptionKey:key,now:()=>now}),server=createDemoServer({root:resolve('dist-web'),directory:resolve('.demo-state'),apiHandler:app.handler});server.listen(0,'127.0.0.1');await once(server,'listening');const item={adapter,app,server,origin:`http://127.0.0.1:${server.address().port}`,closed:false};instances.push(item);return item;}
 async function stop(i){if(i.closed)return;i.closed=true;await new Promise(r=>i.server.close(r));await i.app.close();}t.after(async()=>{for(const i of instances)await stop(i);});
 const first=await start(),second=await start();let cookie='',csrf='';
 const get=(i,path,c=cookie)=>fetch(i.origin+path,{headers:{Cookie:c}}),post=(i,path,data,c=cookie,s=csrf)=>fetch(i.origin+path,{method:'POST',headers:{Origin:i.origin,Cookie:c,'Content-Type':'application/json','X-Demo-CSRF':s},body:JSON.stringify(data)});
 const login=await post(first,'/api/auth/login',{profile:'multispace'});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];const directory=await get(second,'/api/workspaces');assert.equal(directory.status,200);csrf=(await directory.json()).csrf;
 await stop(first);const replacement=await start();assert.equal((await get(replacement,'/api/workspaces')).status,200);
 now+=1000;const initial=cookie,oldCsrf=csrf,race=await Promise.all([post(second,'/api/workspaces/select',{id:'a-director'}),post(replacement,'/api/workspaces/select',{id:'a-organizer'})]);assert.equal(race.filter(r=>r.status===200).length,1);assert.ok(race.every(r=>[200,401,409].includes(r.status)));
 assert.match(race.find(r=>r.status===200).headers.get('set-cookie'),/Max-Age=3299(?:;|$)/);cookie=race.find(r=>r.status===200).headers.get('set-cookie').split(';')[0];assert.equal((await get(second,'/api/workspaces',initial)).status,401);csrf=(await(await get(replacement,'/api/workspaces')).json()).csrf;assert.notEqual(csrf,oldCsrf);
 assert.equal((await post(replacement,'/api/auth/logout',{},cookie,oldCsrf)).status,403);assert.equal((await post(replacement,'/api/auth/logout',{})).status,200);assert.equal((await get(second,'/api/workspaces')).status,401);
 const relogin=await post(second,'/api/auth/login',{profile:'multispace'});cookie=relogin.headers.get('set-cookie').split(';')[0];now+=3300000;assert.equal((await get(replacement,'/api/workspaces')).status,401);
});
