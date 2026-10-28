import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {once} from 'node:events';import {resolve} from 'node:path';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';import {createFirebaseHttp} from '../../src/server/firebase-http.mjs';import {createDemoServer} from '../../src/server/http.mjs';
test('KPI and kiosk modes are scoped, revocable, expiring and cannot inherit other roles',async t=>{
 let now=Date.now();const a=createFirebaseEmulatorAdapter(),app=await createFirebaseHttp({adapter:a,now:()=>now}),server=createDemoServer({root:resolve('dist-web'),directory:resolve('.demo-state'),apiHandler:app.handler});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{await new Promise(r=>server.close(r));await app.close();});const origin=`http://127.0.0.1:${server.address().port}`;
 let cookie='',csrf='';const post=(path,data,token=csrf,c=cookie)=>fetch(origin+path,{method:'POST',headers:{Origin:origin,Cookie:c,'Content-Type':'application/json','X-Demo-CSRF':token},body:JSON.stringify(data)}),get=(path,c=cookie)=>fetch(origin+path,{headers:{Cookie:c}});
 async function login(){const r=await post('/api/auth/login',{profile:'limited'});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];csrf=(await(await get('/api/workspaces')).json()).csrf;}
 async function select(id){const r=await post('/api/workspaces/select',{id});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];csrf=(await(await post('/api/demo/session',{})).json()).csrf;return (await r.json()).destination;}
 const scope={tenantId:'fiction-limited-modes',campaignId:'fiction-2026',teamId:'explorateurs'},member=a.db.doc(`tenants/${scope.tenantId}/members/demo-limited-user`),original=(await member.get()).data(),campaign=a.db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),before=(await campaign.get()).data();
 try{
 await login();assert.equal(await select('kpi'),'/kpi.html');assert.equal((await post('/api/kpi/list',{})).status,200);const value=await(await post('/api/kpi/read',{periodId:'limited-month'})).json();
 const command={periodId:'limited-month',revision:value.revision,mutationId:randomUUID(),values:[{id:'quantity',value:'42'},{id:'delay',value:'2.5'}],source:'Source fictive R1E',reason:'Vérification des permissions'};
 assert.equal((await post('/api/kpi/submit',command)).status,200);assert.equal((await(await post('/api/kpi/read',{periodId:'limited-month'})).json()).revision,value.revision+1);assert.deepEqual((await campaign.get()).data(),before);
 for(const path of ['/api/demo/team','/api/demo/collective','/api/kiosk/progress','/api/my-week','/api/my-gift-preferences','/api/gifts/ops','/api/director/progress','/api/organizer/overview'])assert.equal((await get(path)).status,403,path);
 for(const path of ['/api/kpi-access/read','/api/kpi-periods/freeze','/api/demo/advance','/api/invitation/session'])assert.equal((await post(path,{})).status,403,path);
 assert.equal((await post('/api/kpi/read',{periodId:'limited-month',tenantId:'foreign'})).status,400);
 await member.update({kpiAssignments:[]});assert.equal((await post('/api/kpi/list',{})).status,403);assert.equal((await(await get('/api/workspaces')).json()).entries.some(e=>e.space==='kpi'),false);await member.set(original);
 const oldCookie=cookie,oldCsrf=csrf;assert.equal(await select('kiosk'),'/kiosque.html');assert.equal((await post('/api/kpi/submit',command,oldCsrf,oldCookie)).status,401);
 const view=await(await get('/api/kiosk/progress')).json();assert.deepEqual(Object.keys(view).sort(),['activeWeeks','closure','completedWeeks','displayKm','distance','history','maximumKm','organizationName','reception','routeId','schemaVersion','timeZone']);assert.doesNotMatch(JSON.stringify(view),/myAnswers|questions|scores|purchaseCents|budgetCents|marginCents|preferences|demo-limited-user|explorateurs/);
 const session=await(await post('/api/demo/session',{})).json();assert.equal(session.workspace,'kiosk');assert.equal(session.workspaceEnabled,false);assert.equal(session.canSimulate,false);
 for(const path of ['/api/workspaces','/api/demo/team','/api/demo/collective','/api/my-week','/api/my-gift-preferences','/api/director/progress','/api/gifts/ops'])assert.equal((await get(path)).status,403,path);
 for(const path of ['/api/workspaces/select','/api/kpi/list','/api/kpi/read','/api/kpi/submit','/api/demo/advance','/api/invitation/session'])assert.equal((await post(path,{id:'director'})).status,403,path);
 // Public display capability does not require a team participation assignment.
 await member.update({assignments:[]});assert.equal((await get('/api/kiosk/progress')).status,200);await member.set(original);
 await member.update({kioskCampaigns:[]});assert.equal((await get('/api/kiosk/progress')).status,403);assert.equal((await post('/api/demo/session',{})).status,403);assert.equal((await post('/api/auth/logout',{})).status,200);await member.set(original);
 await login();await select('kiosk');now+=3300001;assert.equal((await get('/api/kiosk/progress')).status,401);assert.equal((await post('/api/demo/session',{})).status,401);
 await login();await select('kiosk');for(const change of [{uid:'foreign'},{tenantId:'foreign'},{active:false}]){await member.set({...original,...change});assert.equal((await get('/api/kiosk/progress')).status,403);}await member.set(original);
 const wrong=JSON.parse(before.payload);wrong.ledger.state.config.tenantId='foreign';await campaign.update({payload:JSON.stringify(wrong)});assert.equal((await get('/api/kiosk/progress')).status,403);await campaign.set(before);
 assert.equal((await get('/api/kiosk/progress?tenantId=foreign')).status,400);
 }finally{await member.set(original);await campaign.set(before);}
});
