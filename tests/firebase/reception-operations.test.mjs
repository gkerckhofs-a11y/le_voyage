import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';import {createGiftOperations} from '../../src/server/gift-operations.mjs';import {newDemo} from '../../src/server/demo-service.mjs';import {freezeReception} from '../../src/domain/engine.ts';
async function setup(t){const a=createFirebaseEmulatorAdapter();t.after(()=>a.close());const uid='reception-'+randomUUID(),email=uid+'@example.test',password='Fictitious-test-42!';await a.auth.createUser({uid,email,password});const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});const header='Bearer '+(await r.json()).idToken;
 const record=newDemo(),scope={tenantId:uid,campaignId:record.ledger.state.config.campaignId};record.ledger.state.config.tenantId=uid;const ref=a.db.doc(`tenants/${uid}/campaigns/${scope.campaignId}`),grant=a.db.doc(`giftOperators/${uid}`);await ref.set({payload:JSON.stringify(record)});await grant.set({uid,active:true,campaigns:[scope]});const service=createGiftOperations(a,{now:()=> '2026-12-01T12:00:00Z'});
 const input={...scope,revision:0,mutationId:randomUUID(),reason:'Préparation vérifiée',confirmed:true,status:'planned',date:'2026-11-27',venue:'Lieu fictif',guests:40,owner:'Clem',providers:'Prestataire fictif',bookingReference:'RES-01',completionReference:'BILAN-01',fallback:'Repli intérieur'};return {a,scope,header,ref,grant,record,service,input};}
test('reception pipeline requires engine freeze, preserves it and campaign, and closes with immutable audit',async t=>{
 const h=await setup(t);let rev=0;const saved=[];for(const status of ['planned','options']){const i={...h.input,status,revision:rev,mutationId:randomUUID()};saved.push(i);await h.service.saveReception(h.header,i);rev++;}
 await assert.rejects(h.service.saveReception(h.header,{...h.input,status:'frozen',revision:rev,mutationId:randomUUID()}),{status:409});
 h.record.ledger.state=freezeReception(h.record.ledger.state,h.scope,'2026-10-27');await h.ref.set({payload:JSON.stringify(h.record)});const before=(await h.ref.get()).data();
 for(const status of ['frozen','confirmed','preparing','completed','closed']){await h.service.saveReception(h.header,{...h.input,status,revision:rev,mutationId:randomUUID()});rev++;}
 const detail=await h.service.receptionDetail(h.header,h.scope);assert.equal(detail.record.status,'closed');assert.equal(detail.history.length,7);assert.equal(detail.record.recordedFreeze.level,h.record.ledger.state.freeze.level);assert.deepEqual((await h.ref.get()).data(),before);
 assert.equal((await h.service.saveReception(h.header,saved[0])).alreadyApplied,true);assert.equal((await h.service.receptionDetail(h.header,h.scope)).record.revision,7);
 await assert.rejects(h.service.saveReception(h.header,{...h.input,revision:7,status:'closed',mutationId:randomUUID()}),{status:409});await assert.rejects(h.service.saveReception(h.header,{...saved[0],venue:'Different'}),{status:409});
});
test('reception validates transitions, required evidence, dates and concurrent revisions',async t=>{
 const h=await setup(t);
 for(const patch of [{confirmed:false},{guests:-1},{date:'2026-02-30'},{reason:''},{mutationId:'bad'},{extra:1}])await assert.rejects(h.service.saveReception(h.header,{...h.input,...patch}),{status:400});
 await assert.rejects(h.service.saveReception(h.header,{...h.input,status:'confirmed'}),{status:409});await assert.rejects(h.service.saveReception(h.header,{...h.input,status:'options',providers:''}),{status:422});
 await assert.rejects(h.service.saveReception(h.header,{...h.input,status:'options',date:'2026-10-26'}),{status:422});
 const r=await Promise.allSettled([h.input,{...h.input,mutationId:randomUUID()}].map(i=>h.service.saveReception(h.header,i)));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.status,409);
 h.record.ledger.state=freezeReception(h.record.ledger.state,h.scope,'2026-10-27');await h.ref.set({payload:JSON.stringify(h.record)});
 for(const [index,status] of ['options','frozen'].entries())await h.service.saveReception(h.header,{...h.input,status,revision:index+1,mutationId:randomUUID()});
 await assert.rejects(h.service.saveReception(h.header,{...h.input,status:'confirmed',revision:3,fallback:'',mutationId:randomUUID()}),{status:422});
 for(const [index,status] of ['confirmed','preparing'].entries())await h.service.saveReception(h.header,{...h.input,status,revision:index+3,mutationId:randomUUID()});
 for(const patch of [{completionReference:''},{date:'2027-01-01'}])await assert.rejects(h.service.saveReception(h.header,{...h.input,status:'completed',revision:5,mutationId:randomUUID(),...patch}),{status:422});
});
test('reception grants are scoped and revoked before reads, writes and idempotent replay',async t=>{
 const h=await setup(t);await h.service.saveReception(h.header,h.input);assert.equal((await h.service.receptions(h.header)).rows.length,1);
 for(const scope of [{...h.scope,tenantId:'foreign'},{...h.scope,campaignId:'foreign'}]){await assert.rejects(h.service.receptionDetail(h.header,scope),{status:403});await assert.rejects(h.service.saveReception(h.header,{...h.input,...scope}),{status:403});}
 await h.grant.update({active:false});await assert.rejects(h.service.receptions(h.header),{status:403});await assert.rejects(h.service.receptionDetail(h.header,h.scope),{status:403});await assert.rejects(h.service.saveReception(h.header,h.input),{status:403});
});
const costs=h=>({...h.scope,revision:0,mutationId:randomUUID(),confirmed:true,basis:'HT',asOf:'2026-11-30',reference:'DEV-01',reason:'Relevé vérifié',estimatedCents:12345,committedCents:0,actualCents:null});
test('private reception costs preserve unknowns, exact cents, history and logistics even after closure',async t=>{
 const h=await setup(t),i=costs(h);await assert.rejects(h.service.saveReceptionCosts(h.header,i),{status:409});
 h.record.ledger.state=freezeReception(h.record.ledger.state,h.scope,'2026-10-27');await h.ref.set({payload:JSON.stringify(h.record)});
 for(const [revision,status] of ['options','frozen','confirmed','preparing','completed','closed'].entries())await h.service.saveReception(h.header,{...h.input,revision,status,mutationId:randomUUID()});
 const before=(await h.ref.get()).data(),operation=h.ref.collection('receptionOperations').doc('main'),beforeOperation=(await operation.get()).data();
 assert.deepEqual(await h.service.saveReceptionCosts(h.header,i),{revision:1,alreadyApplied:false});
 const corrected={...i,revision:1,mutationId:randomUUID(),actualCents:15001,reference:'FACT-01',reason:'Facture reçue après clôture'};
 await h.service.saveReceptionCosts(h.header,corrected);assert.equal((await h.service.saveReceptionCosts(h.header,i)).alreadyApplied,true);
 const d=await h.service.receptionDetail(h.header,h.scope);assert.equal(d.costs.revision,2);assert.equal(d.costs.actualCents,15001);assert.equal(d.costHistory.length,2);assert.equal(d.costHistory[1].actualCents,null);assert.equal(d.costHistory[1].committedCents,0);assert.equal(d.costHistory[1].estimatedCents,12345);
 assert.deepEqual((await operation.get()).data(),beforeOperation);assert.deepEqual((await h.ref.get()).data(),before);assert.equal(Object.hasOwn((await h.service.receptions(h.header)).rows[0],'costs'),false);
 await assert.rejects(h.service.saveReceptionCosts(h.header,{...i,estimatedCents:12346}),{status:409});
 await assert.rejects(h.service.saveReceptionCosts(h.header,{...corrected,revision:2,mutationId:randomUUID(),basis:'TTC'}),{status:409});
});
test('reception costs validate amounts, evidence, revisions and permissions before replay',async t=>{
 const h=await setup(t);await h.service.saveReception(h.header,h.input);const i=costs(h);
 for(const patch of [{estimatedCents:-1},{actualCents:0.1},{committedCents:100000001},{estimatedCents:'123'},{basis:'unknown'},{asOf:'2026-02-30'},{confirmed:false},{reference:''},{reason:'x'},{extra:1},{estimatedCents:null,committedCents:null,actualCents:null}])await assert.rejects(h.service.saveReceptionCosts(h.header,{...i,...patch}),{status:400});
 await assert.rejects(h.service.saveReceptionCosts(h.header,{...i,asOf:'2026-12-02'}),{status:422});
 const results=await Promise.allSettled([i,{...i,mutationId:randomUUID()}].map(x=>h.service.saveReceptionCosts(h.header,x)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 for(const patch of [{tenantId:'foreign'},{campaignId:'foreign'}])await assert.rejects(h.service.saveReceptionCosts(h.header,{...i,...patch}),{status:403});
 await h.grant.update({active:false});await assert.rejects(h.service.saveReceptionCosts(h.header,i),{status:403});await assert.rejects(h.service.receptionDetail(h.header,h.scope),{status:403});
});
