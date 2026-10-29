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
