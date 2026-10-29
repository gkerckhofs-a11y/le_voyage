import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {resolve} from 'node:path';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';import {createFirebaseHttp} from '../../src/server/firebase-http.mjs';import {createDemoServer} from '../../src/server/http.mjs';
test('workspace selection rechecks grants, isolates active roles, rotates session and rejects stale or forged context',async t=>{
 const a=createFirebaseEmulatorAdapter(),app=await createFirebaseHttp({adapter:a}),server=createDemoServer({root:resolve('dist-web'),directory:resolve('.demo-state'),apiHandler:app.handler});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{await new Promise(r=>server.close(r));await app.close();});const origin=`http://127.0.0.1:${server.address().port}`;
 let cookie='',csrf='';const post=(path,data,token=csrf,c=cookie)=>fetch(origin+path,{method:'POST',headers:{Origin:origin,Cookie:c,'Content-Type':'application/json','X-Demo-CSRF':token},body:JSON.stringify(data)}),get=(path,c=cookie)=>fetch(origin+path,{headers:{Cookie:c}});
 const login=await post('/api/auth/login',{profile:'multispace'});assert.equal(login.status,200);assert.equal((await login.json()).destination,'/espaces.html');cookie=login.headers.get('set-cookie').split(';')[0];
 const directory=a.db.doc('workspaceDirectories/demo-multispace-user'),original=(await directory.get()).data(),member=a.db.doc('tenants/fiction-workspaces-a/members/demo-multispace-user'),oldMember=(await member.get()).data();
 try{
 const choices=await(await get('/api/workspaces')).json();csrf=choices.csrf;assert.equal(choices.entries.length,4);assert.deepEqual(Object.keys(choices.entries[0]).sort(),['id','label','space']);assert.equal((await get('/api/organizer/overview')).status,403);
 assert.equal((await post('/api/workspaces/select',{id:'a-organizer'},'bad')).status,403);assert.equal((await post('/api/workspaces/select',{id:'unknown'})).status,403);assert.equal((await post('/api/workspaces/select',{id:'a-organizer',tenantId:'fiction-lex-ekho'})).status,400);
 async function select(id){const r=await post('/api/workspaces/select',{id});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];csrf=(await(await get('/api/workspaces')).json()).csrf;return r.json();}
 const initialCookie=cookie,initialCsrf=csrf;assert.equal((await select('a-organizer')).destination,'/organisateur.html');assert.notEqual(cookie,initialCookie);assert.notEqual(csrf,initialCsrf);assert.equal((await get('/api/workspaces',initialCookie)).status,401);
 assert.match((await(await get('/api/organizer/overview')).json()).organizationName,/Entreprise A/);
 const staleCsrf=csrf;await select('b-organizer');assert.match((await(await get('/api/organizer/overview')).json()).organizationName,/Entreprise B/);assert.equal((await post('/api/annual-plan/preview',{input:{}},staleCsrf)).status,403);assert.equal((await get('/api/director/progress')).status,403);
 await select('a-director');assert.equal((await get('/api/director/progress')).status,200);for(const path of ['/api/organizer/overview','/api/annual-plan','/api/my-week','/api/gifts/ops','/api/gifts/catalog','/api/demo/team'])assert.equal((await get(path)).status,403,path);
 await member.update({directorCampaigns:[]});assert.equal((await get('/api/director/progress')).status,403);assert.equal((await post('/api/workspaces/select',{id:'a-director'})).status,403);assert.equal((await(await get('/api/workspaces')).json()).entries.length,3);await member.set(oldMember);
 // A directory entry alone never grants access to another client.
 await directory.update({entries:[...original.entries,{...original.entries[0],id:'forged',tenantId:'fiction-lex-ekho'}]});assert.equal((await(await get('/api/workspaces')).json()).entries.length,4);assert.equal((await post('/api/workspaces/select',{id:'forged'})).status,403);
 // Retargeting a directory entry invalidates an open scope, even if both grants exist.
 await directory.update({entries:original.entries.map(e=>e.id==='a-director'?{...e,tenantId:'fiction-workspaces-b'}:e)});assert.equal((await get('/api/director/progress')).status,403);await directory.set(original);
 await directory.update({active:false});assert.equal((await get('/api/workspaces')).status,403);assert.equal((await get('/api/director/progress')).status,403);assert.equal((await post('/api/auth/logout',{})).status,200);await directory.set(original);
 // Competing selections from one cookie: exactly one wins.
 const again=await post('/api/auth/login',{profile:'multispace'});cookie=again.headers.get('set-cookie').split(';')[0];csrf=(await(await get('/api/workspaces')).json()).csrf;
 const race=await Promise.all([post('/api/workspaces/select',{id:'a-organizer'}),post('/api/workspaces/select',{id:'b-director'})]);assert.equal(race.filter(r=>r.status===200).length,1);assert.ok(race.every(r=>[200,401,409].includes(r.status)));
 }finally{await member.set(oldMember);await directory.set(original);}
});
