import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {stockFixture} from './stock-fixture.mjs';import {stockSkuKey} from '../../src/server/cite-gift-stock.mjs';
import {giftDraftId} from '../../src/server/cite-gift-preparation.mjs';import {createGiftReservations} from '../../src/server/gift-reservations.mjs';import {proposalDocumentId} from '../../src/server/gift-proposals.mjs';
const next=(input,revision)=>({...input,revision,mutationId:randomUUID()});

test('competing Cité attentions cannot reserve the last unit; retries and release preserve financial ledgers',async()=>{
 const f=await stockFixture(),a=await f.prepare(),b=await f.prepare('person-1-0'),before=structuredClone(f.data.get(f.privatePath));
 const outcomes=await Promise.allSettled([f.stock.reserve('Bearer manager',f.s,a),f.stock.reserve('Bearer manager',f.s,b)]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.find(r=>r.status==='rejected').reason.status,422);
 const winner=outcomes[0].status==='fulfilled'?a:b,loser=winner===a?b:a,key=stockSkuKey('FICTION-orchard-jam');assert.equal(f.data.get(f.ledgerPath).counts[key],1);assert.equal(f.data.get(f.ledgerPath).citeHeld[key],1);
 await f.stock.reserve('Bearer manager',f.s,winner);const d=f.data.get(f.privatePath).giftPreparation.drafts[giftDraftId(f.s,winner.unlockId)];assert.equal(d.audit.length,3);assert.equal(d.revision,3);
 await assert.rejects(f.gifts.reopen('Bearer manager',f.s,next(winner,3)),{status:409});
 const release=next(winner,3);await Promise.all([f.stock.release('Bearer manager',f.s,release),f.stock.release('Bearer manager',f.s,release)]);assert.deepEqual(f.data.get(f.ledgerPath),{counts:{},citeHeld:{}});
 await f.stock.reserve('Bearer manager',f.s,loser);await f.stock.release('Bearer manager',f.s,release);assert.equal(f.data.get(f.ledgerPath).counts[key],1); // Old retry cannot release another hold.
 assert.deepEqual(f.data.get(f.privatePath).state,before.state);assert.deepEqual(f.data.get(f.privatePath).rewards,before.rewards);assert.deepEqual(f.data.get('supplierCatalog/main'),f.catalog);
});

test('Cité and the inherited Cockpit reservation implementation compete through exactly the same ledger',async()=>{
 const f=await stockFixture(),input=await f.prepare(),scope={tenantId:'legacy-client',campaignId:'legacy-season',teamId:'legacy-team',milestoneNumber:1};
 const campaignRef=s=>f.adapter.db.doc(`tenants/${s.tenantId}/campaigns/${s.campaignId}`),proposal={complete:true,fingerprint:'trusted-test-proposal',milestoneId:'legacy-milestone',totalCostCents:850,allocatedCents:1000,lines:[{sku:'FICTION-orchard-jam',name:'Confiture fictive',quantity:1,declaredStock:1}]};
 f.data.set(campaignRef(scope).collection('giftProposals').doc(proposalDocumentId(scope.teamId,1)).path,{teamId:scope.teamId,milestoneNumber:1,revision:2,review:{actor:'legacy-operator'},proposal});
 const legacy=createGiftReservations({db:f.adapter.db,actor:async()=> 'legacy-operator',check:async()=>{},campaignRef,build:async()=>proposal,now:()=> '2027-03-01T10:00:00Z',catalogDocument:'supplierCatalog/main'});
 const request={...scope,proposalRevision:2,mutationId:randomUUID(),reason:'Test de concurrence',conditions:'Réservation réversible fictive'};
 const outcomes=await Promise.allSettled([legacy.reserveProposal('Bearer legacy',request),f.stock.reserve('Bearer manager',f.s,input)]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes[0].status,'fulfilled');assert.equal(outcomes[1].reason.status,422);
 await legacy.releaseReservation('Bearer legacy',{...scope,revision:1,mutationId:randomUUID(),reason:'Libérer pour La Cité'});await f.stock.reserve('Bearer manager',f.s,input);
 await assert.rejects(legacy.reserveProposal('Bearer legacy',{...request,mutationId:randomUUID()}),{status:422});
 await f.stock.release('Bearer manager',f.s,next(input,3));await legacy.reserveProposal('Bearer legacy',{...request,mutationId:randomUUID()});const key=stockSkuKey('FICTION-orchard-jam');assert.equal(f.data.get(f.ledgerPath).counts[key],1);assert.deepEqual(f.data.get(f.ledgerPath).citeHeld,{});
});

test('two Cité companies share quantities but never expose each other’s recipients or proposals',async()=>{
 const f=await stockFixture(),scope={...f.s,tenantId:'other-company'},otherPath=`tenants/${scope.tenantId}/citeSeasons/${scope.seasonId}/privateEconomy/main`,record=structuredClone(f.data.get(f.privatePath));record.state.config.tenantId=scope.tenantId;record.rewards.tenantId=scope.tenantId;f.data.set(otherPath,record);
 f.data.set(`tenants/${scope.tenantId}/members/manager`,{...f.data.get(f.memberPath('manager')),tenantId:scope.tenantId});const pref=f.data.get(`tenants/${f.s.tenantId}/giftPreferences/person-0-0`);f.data.set(`tenants/${scope.tenantId}/giftPreferences/person-0-0`,pref);
 const a=await f.prepare(),b=await f.prepare('person-0-0',scope);const results=await Promise.allSettled([f.stock.reserve('Bearer manager',f.s,a),f.stock.reserve('Bearer manager',scope,b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const view=await f.gifts.list('Bearer manager',scope);assert.ok(view.rows.every(r=>r.draft?.stockHold?.status!=='reserved'));assert.equal(view.catalog.products.find(p=>p.id==='orchard-jam').unreservedQuantity,0);
 f.data.delete(`tenants/${scope.tenantId}/members/manager`);await assert.rejects(f.stock.reserve('Bearer manager',scope,b),{status:403});
});

test('release survives changed catalog/preferences and retains unrelated committed/consumed quantities',async()=>{
 const f=await stockFixture(),input=await f.prepare(),key=stockSkuKey('FICTION-orchard-jam');f.catalog.masterById['orchard-jam'].stockQuantity=8;f.data.set('supplierCatalog/main',f.catalog);
 const baseline={counts:{[key]:6},committed:{[key]:2},consumed:{[key]:1},metadata:'preserve'};f.data.set(f.ledgerPath,baseline);await f.stock.reserve('Bearer manager',f.s,input);assert.equal(f.data.get(f.ledgerPath).counts[key],7);
 f.data.delete('supplierCatalog/main');f.data.set(`tenants/${f.s.tenantId}/giftPreferences/person-0-0`,{revision:10,value:{privateContactRequested:true}});await f.stock.release('Bearer manager',f.s,next(input,3));assert.deepEqual(f.data.get(f.ledgerPath),{...baseline,citeHeld:{}});
});

test('stale review, ambiguous SKU, unknown stock, corrupt ledger and forged commands cannot create a hold',async()=>{
 for(const corrupt of ['preferences','catalog','stock','duplicate','ledger']){const f=await stockFixture(),input=await f.prepare();
  if(corrupt==='preferences')f.data.get(`tenants/${f.s.tenantId}/giftPreferences/person-0-0`).revision++;
  if(corrupt==='catalog')f.data.get('supplierCatalog/main').revision++;
  if(corrupt==='stock')f.data.get('supplierCatalog/main').masterById['orchard-jam'].stockQuantity=null;
  if(corrupt==='duplicate')f.data.get('supplierCatalog/main').masterById['tea-garden'].sku='FICTION-orchard-jam';
  if(corrupt==='ledger')f.data.set(f.ledgerPath,{counts:{[stockSkuKey('FICTION-orchard-jam')]:null}});
  const before=structuredClone(f.data.get(f.privatePath));await assert.rejects(f.stock.reserve('Bearer manager',f.s,input));assert.deepEqual(f.data.get(f.privatePath),before);
 }
 const f=await stockFixture(),input=await f.prepare();await assert.rejects(f.stock.reserve('Bearer manager',f.s,{...input,quantity:100}),{status:400});await assert.rejects(f.stock.reserve('Bearer manager',f.s,next(input,1)),{status:409});await assert.rejects(f.stock.reserve('Bearer person-0-0',f.s,input),{status:403});
 f.data.get(f.memberPath('manager')).citeRewardOperations=[];await assert.rejects(f.stock.reserve('Bearer manager',f.s,input),{status:403});assert.ok(!f.data.has(f.ledgerPath));
});

test('document capacity rejection rolls back both the private proposal and the queued shared stock write',async()=>{
 const f=await stockFixture(),input=await f.prepare();f.data.get(f.privatePath).padding='x'.repeat(800000);const before=structuredClone(f.data.get(f.privatePath));await assert.rejects(f.stock.reserve('Bearer manager',f.s,input),{status:409});assert.deepEqual(f.data.get(f.privatePath),before);assert.ok(!f.data.has(f.ledgerPath));
});

test('persisted quote maps can reorder fields without becoming a different reviewed proposal',async()=>{
 const f=await stockFixture(),input=await f.prepare(),d=f.data.get(f.privatePath).giftPreparation.drafts[giftDraftId(f.s,input.unlockId)];
 const sort=v=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;d.quote=sort(d.quote);const path=`tenants/${f.s.tenantId}/giftPreferences/person-0-0`;f.data.set(path,sort(f.data.get(path)));
 await f.stock.reserve('Bearer manager',f.s,input);assert.equal(f.data.get(f.ledgerPath).counts[stockSkuKey('FICTION-orchard-jam')],1);
});

test('only the entitled person sees the hold, and revoked operators cannot release shared quantities',async()=>{
 const f=await stockFixture(),input=await f.prepare();await f.stock.reserve('Bearer manager',f.s,input);
 const own=await f.gifts.personal('Bearer person-0-0',f.s);assert.equal(own.proposals[0].stockReserved,true);assert.ok(!JSON.stringify(own).includes('citeHeld'));assert.deepEqual(await f.gifts.personal('Bearer person-1-0',{...f.s,familyId:'family-1'}),{proposals:[]});
 f.data.get(f.memberPath('manager')).citeRewardOperations=[];await assert.rejects(f.stock.release('Bearer manager',f.s,next(input,3)),{status:403});assert.equal(f.data.get(f.ledgerPath).counts[stockSkuKey('FICTION-orchard-jam')],1);
 f.data.get(f.memberPath('manager')).citeRewardOperations=[f.s.seasonId];await f.stock.release('Bearer manager',f.s,next(input,3));assert.equal((await f.gifts.personal('Bearer person-0-0',f.s)).proposals[0].stockReserved,false);
});
