import test from 'node:test';import assert from 'node:assert/strict';
import {createCiteEconomyService} from '../../src/server/cite-economy.mjs';import {createEconomy} from '../../src/cite/economy.ts';import {config,scope} from './fixture.mjs';
Object.assign(process.env,{GCLOUD_PROJECT:'demo-rc-voyage',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'});
function fixture(){
 const c=config(),s=scope(c),data=new Map(),privatePath=`tenants/${c.tenantId}/citeSeasons/${c.seasonId}/privateEconomy/main`,memberPath=uid=>`tenants/${c.tenantId}/members/${uid}`;let date=c.weeks[0].start,queue=Promise.resolve();
 data.set(privatePath,{state:createEconomy(c),preserve:'metadata'});
 for(const [uid,familyId]of [['person-0-0','family-0'],['person-1-0','family-1']])data.set(memberPath(uid),{uid,tenantId:c.tenantId,active:true,citeAssignments:[{seasonId:c.seasonId,familyId}]});
 data.set(memberPath('manager'),{uid:'manager',tenantId:c.tenantId,active:true,citeSeasonManagement:[c.seasonId]});
 const adapter={auth:{app:{options:{projectId:'demo-rc-voyage'}},verifyIdToken:async(token,revoked)=>{assert.equal(revoked,true);if(!['person-0-0','person-1-0','manager'].includes(token))throw Error();return {uid:token,admin:true,tenantId:'untrusted-claim'};}},db:{projectId:'demo-rc-voyage',doc:path=>({path}),runTransaction:fn=>{const result=queue.then(async()=>{const writes=[];const value=await fn({get:async r=>({exists:data.has(r.path),data:()=>structuredClone(data.get(r.path))}),set:(r,v)=>writes.push([r.path,structuredClone(v)])});for(const [k,v]of writes)data.set(k,v);return value;});queue=result.catch(()=>{});return result;}}};
 return {c,s,data,privatePath,memberPath,service:createCiteEconomyService(adapter,{today:()=>date}),setDate:d=>date=d};
}
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
