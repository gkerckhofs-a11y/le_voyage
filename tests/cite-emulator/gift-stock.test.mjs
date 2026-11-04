import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';
import {runPilot} from '../../src/cite/pilot.ts';import {citeDemoCatalog,citeDemoPreferences} from '../../src/server/cite-demo-catalog.mjs';
import {createCiteGiftPreparationService} from '../../src/server/cite-gift-preparation.mjs';import {createCiteGiftStockService,stockSkuKey} from '../../src/server/cite-gift-stock.mjs';
const request=(u,revision=2)=>({unlockId:u,revision,mutationId:randomUUID(),reason:'Test isolé de stock'});
async function setup(t){
 const adapter=createFirebaseEmulatorAdapter();t.after(()=>adapter.close());const uid='cite-stock-'+randomUUID(),email=uid+'@example.test',password='Fictitious-test-42!';await adapter.auth.createUser({uid,email,password});
 const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});assert.equal(response.status,200);const header='Bearer '+(await response.json()).idToken;
 const catalogDocument='supplierCatalog/'+uid,catalog=citeDemoCatalog();catalog.masterById['orchard-jam'].stockQuantity=1;await adapter.db.doc(catalogDocument).set(catalog);
 const gifts=createCiteGiftPreparationService(adapter,{catalogDocument,today:()=> '2027-03-01'}),stock=createCiteGiftStockService(adapter,{catalogDocument,today:()=> '2027-03-01'}),scopes=[],recordRefs=[];
 for(let i=0;i<2;i++){
  const p=runPilot(),scope={tenantId:uid+'-tenant-'+i,seasonId:p.rewards.seasonId,familyId:'family-0'};p.game.economy.config.tenantId=scope.tenantId;p.rewards.tenantId=scope.tenantId;
  const ref=adapter.db.doc(`tenants/${scope.tenantId}/citeSeasons/${scope.seasonId}/privateEconomy/main`);await ref.set({state:p.game.economy,councils:p.game.councils,city:p.game.city,rewards:p.rewards});recordRefs.push(ref);scopes.push(scope);
  await adapter.db.doc(`tenants/${scope.tenantId}/members/${uid}`).set({uid,tenantId:scope.tenantId,active:true,citeRewardOperations:[scope.seasonId]});
  for(const [person,pref]of Object.entries(citeDemoPreferences()))await adapter.db.doc(`tenants/${scope.tenantId}/giftPreferences/${person}`).set(pref);
 }
 async function prepare(scope){const p=(await recordRefs[scopes.indexOf(scope)].get()).data(),u=Object.values(p.rewards.unlocks).find(u=>u.program==='participation'&&u.uid==='person-0-0'),input={...request(u.id,0),selection:{revision:0,lines:[{id:'orchard-jam',quantity:1}]},dueDate:'2027-03-15',packagingInclTaxCents:50,transportInclTaxCents:0};await gifts.prepare(header,scope,input);await gifts.review(header,scope,{...request(u.id,1),preferencesReviewed:true,contactConfirmed:false});return request(u.id);}
 return {adapter,header,uid,catalog,catalogDocument,gifts,stock,scopes,recordRefs,prepare,ledgerRef:adapter.db.doc(catalogDocument+'/reservationLedger/main')};
}
test('actual Firestore transactions serialize two companies competing for one unit, with idempotent release',async t=>{
 const f=await setup(t),inputs=[];for(const scope of f.scopes)inputs.push(await f.prepare(scope));const before=await Promise.all(f.recordRefs.map(async r=>(await r.get()).data()));
 const outcomes=await Promise.allSettled(f.scopes.map((scope,i)=>f.stock.reserve(f.header,scope,inputs[i])));assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.find(r=>r.status==='rejected').reason.status,422);
 const winner=outcomes.findIndex(r=>r.status==='fulfilled'),scope=f.scopes[winner],key=stockSkuKey('FICTION-orchard-jam');assert.equal((await f.ledgerRef.get()).data().counts[key],1);await f.stock.reserve(f.header,scope,inputs[winner]);
 const release=request(inputs[winner].unlockId,3);await Promise.all([f.stock.release(f.header,scope,release),f.stock.release(f.header,scope,release)]);assert.deepEqual((await f.ledgerRef.get()).data(),{counts:{},citeHeld:{}});
 for(let i=0;i<2;i++){const after=(await f.recordRefs[i].get()).data();assert.deepEqual(after.state,before[i].state);assert.deepEqual(after.rewards,before[i].rewards);}assert.deepEqual((await f.adapter.db.doc(f.catalogDocument).get()).data(),f.catalog);
});
test('revocation and a failed multi-document commit leave both private proposal and shared stock unchanged',async t=>{
 const f=await setup(t),scope=f.scopes[0],input=await f.prepare(scope),member=f.adapter.db.doc(`tenants/${scope.tenantId}/members/${f.uid}`);
 await member.update({citeRewardOperations:[]});await assert.rejects(f.stock.reserve(f.header,scope,input),{status:403});await member.update({citeRewardOperations:[scope.seasonId]});
 await f.recordRefs[0].update({padding:'x'.repeat(800000)});const before=(await f.recordRefs[0].get()).data();await assert.rejects(f.stock.reserve(f.header,scope,input),{status:409});assert.equal((await f.ledgerRef.get()).exists,false);assert.deepEqual((await f.recordRefs[0].get()).data(),before);
 await assert.rejects(f.stock.reserve(f.header,{...scope,tenantId:'unauthorized-company'},input),{status:403});
});
