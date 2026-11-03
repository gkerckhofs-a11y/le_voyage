import test from 'node:test';import assert from 'node:assert/strict';
import {fixture} from './server-fixture.mjs';
test('trusted UID and explicit city permissions separate personal values from delegated performance',async()=>{
 const f=fixture(),w=f.c.weeks[0],member='Bearer person-0-0',manager='Bearer manager';
 await f.service.submit(member,f.s,{weekId:w.id,scores:{cooperation:'4'}});await f.service.performance(manager,f.s,{weekId:w.id,scores:{quality:'3'}});
 for(const header of ['Bearer wrong','bad-header'])await assert.rejects(f.service.read(header,f.s),{status:403});
 await assert.rejects(f.service.submit('Bearer person-1-0',f.s,{weekId:w.id,scores:{cooperation:'4'}}),{status:403});
 await assert.rejects(f.service.performance(member,f.s,{weekId:w.id,scores:{quality:'5'}}),{status:403});
 await assert.rejects(f.service.submit(member,f.s,{weekId:w.id,scores:{cooperation:'5'},uid:'person-1-0'}),{status:400});
 for(const s of [{...f.s,tenantId:'foreign'},{...f.s,seasonId:'foreign'},{...f.s,familyId:'family-1'}])await assert.rejects(f.service.read(member,s),{status:403});
 const publicView=await f.service.read(member,f.s);assert.equal(publicView.ecus,0);assert.ok(!JSON.stringify(publicView).includes('cooperation'));
 f.data.get(f.memberPath('person-0-0')).active=false;await assert.rejects(f.service.read(member,f.s),{status:403});
});
test('two concurrent closures credit once; membership revocation is rechecked and old data is untouched',async()=>{
 const f=fixture(),w=f.c.weeks[0],member='Bearer person-0-0',manager='Bearer manager';const untouched={payload:'old-campaign'};f.data.set('tenants/old/campaigns/history',untouched);
 await Promise.all([f.service.submit(member,f.s,{weekId:w.id,scores:{cooperation:'4'}}),f.service.submit(member,f.s,{weekId:w.id,scores:{cooperation:'4'}})]);await f.service.performance(manager,f.s,{weekId:w.id,scores:{quality:'3'}});
 await assert.rejects(f.service.close(manager,f.s,w.id));f.setDate(w.endExclusive);
 const results=await Promise.all([f.service.close(manager,f.s,w.id),f.service.close(manager,f.s,w.id)]);assert.ok(results.every(r=>r.status==='credited'&&r.credit.ecus===18));const stored=f.data.get(f.privatePath);assert.equal(stored.state.balances['family-0'],18);assert.equal(stored.state.audit.length,1);assert.equal(stored.preserve,'metadata');assert.deepEqual(f.data.get('tenants/old/campaigns/history'),untouched);
 const view=await f.service.read(member,f.s);assert.equal(view.ecus,18);assert.ok(!JSON.stringify(view).includes('person-0-0'));
 f.data.get(f.memberPath('manager')).citeSeasonManagement=[];await assert.rejects(f.service.close(manager,f.s,w.id),{status:403});
});
test('prototype document limit aborts the transaction without a partial answer write',async()=>{
 const f=fixture(),w=f.c.weeks[0];f.data.get(f.privatePath).state.privateCapacityTest='x'.repeat(800000);const before=structuredClone(f.data.get(f.privatePath));
 await assert.rejects(f.service.submit('Bearer person-0-0',f.s,{weekId:w.id,scores:{cooperation:'4'}}),{status:409});assert.deepEqual(f.data.get(f.privatePath),before);
});
