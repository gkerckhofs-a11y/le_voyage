import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {once} from 'node:events';import {resolve} from 'node:path';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';import {createFirebaseHttp} from '../../src/server/firebase-http.mjs';import {createDemoServer} from '../../src/server/http.mjs';
test('KPI HTTP keeps session scope, requires explicit grant and CSRF and exposes no aggregate on journeys',async t=>{
 const adapter=createFirebaseEmulatorAdapter(),app=await createFirebaseHttp({adapter}),server=createDemoServer({root:resolve('dist-web'),directory:resolve('.demo-state'),apiHandler:app.handler});server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`;t.after(async()=>{await new Promise(r=>server.close(r));await app.close();});
 const post=(path,data,cookie='',csrf='')=>fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-Demo-CSRF':csrf},body:JSON.stringify(data)}),get=(path,cookie)=>fetch(origin+path,{headers:{Cookie:cookie}});
 assert.equal((await post('/api/kpi/read',{periodId:'test'})).status,401);
 const login=await post('/api/auth/login',{profile:'lex'}),cookie=login.headers.get('set-cookie').split(';')[0],session=await(await post('/api/demo/session',{},cookie)).json(),csrf=session.csrf;
 assert.equal((await post('/api/kpi/read',{periodId:'test'},cookie,csrf)).status,403);assert.equal((await post('/api/kpi/list',{},cookie,csrf)).status,403);
 const member=adapter.db.doc('tenants/fiction-lex-ekho/members/demo-lex-user'),membership=(await member.get()).data(),assignment=membership.assignments[0],campaign=adapter.db.doc(`tenants/fiction-lex-ekho/campaigns/${assignment.campaignId}`),periodId='http-'+randomUUID();
 await member.update({kpiAssignments:[assignment]});
 try{
 await campaign.collection('kpiPeriods').doc(periodId).set({teamId:assignment.teamId,start:'2026-10-01',endExclusive:'2026-11-01',state:'open',definitionVersion:'http-fixture',definitions:[{id:'one',label:'Agrégat fictif A',unit:'unités'},{id:'two',label:'Agrégat fictif B',unit:'jours'}]});
 assert.equal((await post('/api/kpi/list',{teamId:'foreign'},cookie,csrf)).status,400);const list=await(await post('/api/kpi/list',{},cookie,csrf)).json();assert.ok(list.periods.some(p=>p.id===periodId));
 const before=await(await get('/api/demo/team',cookie)).json(),collective=await(await get('/api/demo/collective',cookie)).json();
 assert.equal((await post('/api/kpi/read',{periodId},cookie,'wrong')).status,403);assert.equal((await post('/api/kpi/read',{periodId,teamId:'foreign'},cookie,csrf)).status,400);
 const command={periodId,revision:0,mutationId:randomUUID(),values:[{id:'one',value:'42'},{id:'two',value:'1.5'}],source:'private-kpi-http-source',reason:''};
 assert.equal((await post('/api/kpi/submit',command,cookie,csrf)).status,200);const read=await(await post('/api/kpi/read',{periodId},cookie,csrf)).json();assert.equal(read.history.length,1);assert.equal(read.scoringApplied,false);assert.equal(read.history[0].author,'demo-lex-user');assert.equal(read.batchDefinition.version,'http-fixture');
 assert.deepEqual(await(await get('/api/demo/team',cookie)).json(),before);assert.deepEqual(await(await get('/api/demo/collective',cookie)).json(),collective);assert.doesNotMatch(JSON.stringify(before),/private-kpi-http-source|kpiAssignments/);
 await member.update({kpiAssignments:[]});assert.equal((await post('/api/kpi/read',{periodId},cookie,csrf)).status,403);assert.equal((await post('/api/kpi/submit',command,cookie,csrf)).status,403);
 }finally{await member.update({kpiAssignments:membership.kpiAssignments??[]});}
});
