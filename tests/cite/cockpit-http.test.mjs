import test from 'node:test';import assert from 'node:assert/strict';import {Readable} from 'node:stream';
import {stockFixture} from './stock-fixture.mjs';import {createCiteCockpitHttp} from '../../src/server/cite-cockpit-http.mjs';
function req(method,data={},csrf='a'.repeat(64)){const r=Readable.from([Buffer.from(JSON.stringify(data))]);r.method=method;r.headers={'content-type':'application/json','x-demo-csrf':csrf};return r;}
test('Cité cockpit uses only the selected authenticated scope, with live capability checks',async()=>{
 const f=await stockFixture(),api=createCiteCockpitHttp(f.adapter,{today:f.today}),session={header:'Bearer manager',scope:f.s,workspaceEnabled:true,workspaceSpace:'cite-gifts',csrf:'a'.repeat(64)};let result;
 await api.handle(req('GET'),(status,data)=>result={status,data},'/api/cite/cockpit',session);assert.equal(result.status,200);assert.equal(result.data.giftPreparation.rows.length,14);assert.ok(!JSON.stringify(result.data).includes('preferenceFingerprint'));
 await assert.rejects(api.handle(req('GET'),()=>{},'/api/cite/cockpit',{...session,workspaceSpace:'gifts'}),{status:403});await assert.rejects(api.handle(req('GET'),()=>{},'/api/cite/cockpit',{...session,scope:{...f.s,tenantId:'other'}}),{status:403});
 f.data.get(f.memberPath('manager')).citeRewardOperations=[];await assert.rejects(api.access(session.header,f.s),{status:403});
});
test('Cité cockpit rejects stale CSRF and client-provided scope or identity fields',async()=>{
 const f=await stockFixture(),api=createCiteCockpitHttp(f.adapter,{today:f.today}),session={header:'Bearer manager',scope:f.s,workspaceEnabled:true,workspaceSpace:'cite-gifts',csrf:'a'.repeat(64)};
 await assert.rejects(api.handle(req('POST',{},'b'.repeat(64)),()=>{},'/api/cite/cockpit/reserve',session),{status:403});await assert.rejects(api.handle(req('POST',{command:{},tenantId:'other'}),()=>{},'/api/cite/cockpit/reserve',session),{status:400});await assert.rejects(api.handle(req('POST',{command:{uid:'forged'}}),()=>{},'/api/cite/cockpit/reserve',session),{status:400});assert.ok(!f.data.has(f.ledgerPath));
});
