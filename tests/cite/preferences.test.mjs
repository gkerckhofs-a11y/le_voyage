import test from 'node:test';import assert from 'node:assert/strict';import {Readable} from 'node:stream';
import {stockFixture} from './stock-fixture.mjs';import {createCitePreferencesService} from '../../src/server/cite-preferences.mjs';import {createCiteMemberHttp} from '../../src/server/cite-member-http.mjs';
const value=(revision=1)=>({revision,choices:['delicatessen'],alcoholFree:true,surprise:false,birthday:{day:21,month:9},privateContactRequested:true});
test('Cité preferences belong to the authenticated member only, not the gift operator or another family',async()=>{
 const f=await stockFixture(),service=createCitePreferencesService(f.adapter,{today:f.today}),otherPath=`tenants/${f.s.tenantId}/giftPreferences/person-1-0`,before=structuredClone(f.data.get(otherPath));
 assert.equal((await service.read('Bearer person-0-0',f.s)).familyName,'Les Bâtisseurs');await service.save('Bearer person-0-0',f.s,value());assert.deepEqual(f.data.get(otherPath),before);
 await assert.rejects(service.read('Bearer manager',f.s),{status:403});await assert.rejects(service.read('Bearer person-0-0',{...f.s,familyId:'family-1'}),{status:403});await assert.rejects(service.read('Bearer person-0-0',{...f.s,tenantId:'other'}),{status:403});
 f.data.get(f.memberPath('person-0-0')).citeAssignments=[];await assert.rejects(service.save('Bearer person-0-0',f.s,value(2)),{status:403});
});
test('competing preference edits preserve one value; retries and map reordering do not duplicate history',async()=>{
 const f=await stockFixture(),service=createCitePreferencesService(f.adapter,{today:f.today,now:()=>12345}),path=`tenants/${f.s.tenantId}/giftPreferences/person-0-0`;
 const a=value(),b={...value(),choices:['tea']},results=await Promise.allSettled([service.save('Bearer person-0-0',f.s,a),service.save('Bearer person-0-0',f.s,b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 const saved=await service.read('Bearer person-0-0',f.s);assert.equal(saved.preferences.revision,2);await service.save('Bearer person-0-0',f.s,{...a,birthday:{month:9,day:21}});assert.equal(f.data.get(path).history.length,1);await assert.rejects(service.save('Bearer person-0-0',f.s,{...a,revision:999}),{status:409});
});
test('editing preferences flags a held gift for review without releasing stock or exposing the birthday in the cockpit',async()=>{
 const f=await stockFixture(),input=await f.prepare();await f.stock.reserve('Bearer manager',f.s,input);const ledger=structuredClone(f.data.get(f.ledgerPath)),state=structuredClone(f.data.get(f.privatePath));
 const service=createCitePreferencesService(f.adapter,{today:f.today});await service.save('Bearer person-0-0',f.s,value());const ops=await f.gifts.list('Bearer manager',f.s),row=ops.rows.find(r=>r.unlockId===input.unlockId);
 assert.equal(row.preferencesCurrent,false);assert.equal(row.preferences.contactRequired,true);assert.equal(row.draft.stockHold.status,'reserved');assert.ok(!JSON.stringify(ops).includes('birthday'));assert.equal((await service.read('Bearer person-0-0',f.s)).preferences.birthday.day,21);
 assert.deepEqual(f.data.get(f.ledgerPath),ledger);assert.deepEqual(f.data.get(f.privatePath),state);
});
test('forged identity and malformed input cannot write preferences; a configured roster is required',async()=>{
 const f=await stockFixture(),service=createCitePreferencesService(f.adapter,{today:f.today}),path=`tenants/${f.s.tenantId}/giftPreferences/person-0-0`,before=structuredClone(f.data.get(path));
 await assert.rejects(service.save('Bearer person-0-0',f.s,{...value(),uid:'person-1-0'}),{status:400});await assert.rejects(service.save('Bearer person-0-0',f.s,{...value(),birthday:{day:30,month:2}}),{status:400});assert.deepEqual(f.data.get(path),before);
 f.data.get(f.privatePath).state.config.memberships=f.data.get(f.privatePath).state.config.memberships.filter(m=>m.uid!=='person-0-0');await assert.rejects(service.read('Bearer person-0-0',f.s),{status:403});
});
test('preferences HTTP controller requires the member workspace and CSRF, with no caller-supplied scope',async()=>{
 const f=await stockFixture(),api=createCiteMemberHttp(f.adapter,{today:f.today}),session={header:'Bearer person-0-0',scope:f.s,workspaceEnabled:true,workspaceSpace:'cite-member',csrf:'a'.repeat(64)};let result;
 const req=(method,body={},csrf=session.csrf)=>{const r=Readable.from([Buffer.from(JSON.stringify(body))]);r.method=method;r.headers={'content-type':'application/json','x-demo-csrf':csrf};return r;};
 await api.handle(req('GET'),(status,data)=>result={status,data},'/api/cite/preferences',session);assert.equal(result.status,200);assert.ok(!Object.hasOwn(result.data,'uid'));
 await assert.rejects(api.handle(req('POST',{preferences:value()},'b'.repeat(64)),()=>{},'/api/cite/preferences',session),{status:403});await assert.rejects(api.handle(req('GET'),()=>{},'/api/cite/preferences',{...session,workspaceSpace:'cite-gifts'}),{status:403});await assert.rejects(api.handle(req('POST',{preferences:value(),tenantId:'other'}),()=>{},'/api/cite/preferences',session),{status:400});
});
