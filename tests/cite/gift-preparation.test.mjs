import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {runPilot} from '../../src/cite/pilot.ts';
import {quoteCiteGift,changeGiftPreparation,emptyGiftPreparation,personalGiftPreparation,giftPreparationOperations} from '../../src/server/cite-gift-preparation.mjs';
import {citeDemoCatalog,citeDemoPreferences} from '../../src/server/cite-demo-catalog.mjs';
const scope={tenantId:'fiction-cite',seasonId:'prototype-2026',familyId:'family-0'},today='2027-03-01';
const rules={dueDate:'2027-03-15',asOf:today,packagingInclTaxCents:50,transportInclTaxCents:0,allocatedCents:1000};
const selection=(id='orchard-jam',quantity=1)=>({revision:0,lines:[{id,quantity}]});
function setup(){const p=runPilot(),rewards=p.rewards,unlock=Object.values(rewards.unlocks).find(u=>u.program==='participation'&&u.uid==='person-0-0'),catalog=citeDemoCatalog(),preferences=citeDemoPreferences()[unlock.uid];
 const input={unlockId:unlock.id,revision:0,mutationId:randomUUID(),reason:'Préparation fictive',selection:selection(),dueDate:rules.dueDate,packagingInclTaxCents:50,transportInclTaxCents:0};
 return {rewards,unlock,catalog,preferences,input,options:{kind:'prepare',catalog,preferences,actor:'manager',onDate:today}};
}
const review=(input,revision=1)=>({unlockId:input.unlockId,revision,mutationId:randomUUID(),reason:'Vérification fictive',preferencesReviewed:true,contactConfirmed:false});

test('catalog amounts become a tax-inclusive simulation with exact half-up line rounding and complete costs',()=>{
 const catalog=citeDemoCatalog(),q=quoteCiteGift(catalog,selection(),rules);assert.equal(q.purchaseExTaxCents,850);assert.equal(q.purchaseInclTaxCents,901);assert.equal(q.totalInclTaxCents,951);assert.equal(q.remainingCents,49);
 catalog.products.find(p=>p.id==='orchard-jam').purchaseCents=101;catalog.masterById['orchard-jam'].vatBasisPoints=5000;
 assert.equal(quoteCiteGift(catalog,selection(),rules).purchaseInclTaxCents,152);assert.equal(quoteCiteGift(catalog,selection('orchard-jam',2),rules).purchaseInclTaxCents,303);
 const mixed=citeDemoCatalog();mixed.masterById['chocolate-box'].vatBasisPoints=2100;const both=quoteCiteGift(mixed,{revision:0,lines:[{id:'tea-garden',quantity:1},{id:'chocolate-box',quantity:1}]},{...rules,allocatedCents:3500,packagingInclTaxCents:25,transportInclTaxCents:25});assert.equal(both.totalInclTaxCents,3500);
});

test('unknown bases/rates, unavailable or late/seasonal/alcohol products, stock and budget overflow are refused',()=>{
 for(const edit of [c=>delete c.masterById['orchard-jam'],c=>c.masterById['orchard-jam'].vatBasisPoints=null,c=>c.masterById['orchard-jam'].vatBasisPoints=-1,c=>c.products.find(p=>p.id==='orchard-jam').active=false,c=>c.products.find(p=>p.id==='orchard-jam').availability='unknown',c=>c.products.find(p=>p.id==='orchard-jam').leadDays=30,c=>c.products.find(p=>p.id==='orchard-jam').seasonMonths=[12],c=>c.masterById['orchard-jam'].stockQuantity=0]){const c=citeDemoCatalog();edit(c);assert.throws(()=>quoteCiteGift(c,selection(),rules));}
 assert.throws(()=>quoteCiteGift(citeDemoCatalog(),selection('beer-discovery'),rules),{status:422});assert.throws(()=>quoteCiteGift(citeDemoCatalog(),selection('chocolate-box'),rules),{status:422});assert.throws(()=>quoteCiteGift(citeDemoCatalog(),{...selection(),revision:1},rules),{status:409});
 assert.throws(()=>quoteCiteGift(citeDemoCatalog(),selection(),{...rules,transportInclTaxCents:100}),{status:422});
});

test('prepare, review and reopen are revisioned and audited; identical retries never duplicate a proposal',()=>{
 const f=setup(),empty=emptyGiftPreparation(),before=structuredClone(f.rewards),prepared=changeGiftPreparation(f.rewards,scope,empty,f.input,f.options);
 assert.equal(Object.keys(prepared.drafts).length,1);assert.equal(Object.values(prepared.drafts)[0].quote.totalInclTaxCents,951);assert.equal(changeGiftPreparation(f.rewards,scope,prepared,f.input,f.options),prepared);
 const r=review(f.input),reviewed=changeGiftPreparation(f.rewards,scope,prepared,r,{...f.options,kind:'review'});assert.equal(Object.values(reviewed.drafts)[0].status,'reviewed');assert.equal(changeGiftPreparation(f.rewards,scope,reviewed,r,{...f.options,kind:'review'}),reviewed);
 assert.throws(()=>changeGiftPreparation(f.rewards,scope,reviewed,{...f.input,revision:2,mutationId:randomUUID()},f.options),{status:409});
 const reopen={unlockId:f.input.unlockId,revision:2,mutationId:randomUUID(),reason:'Changer la composition'};const reopened=changeGiftPreparation(f.rewards,scope,reviewed,reopen,{...f.options,kind:'reopen'});const changed=changeGiftPreparation(f.rewards,scope,reopened,{...f.input,revision:3,mutationId:randomUUID(),packagingInclTaxCents:25},f.options);assert.equal(Object.values(changed.drafts)[0].revision,4);assert.equal(Object.values(changed.drafts)[0].audit.length,4);assert.deepEqual(f.rewards,before);assert.deepEqual(empty,emptyGiftPreparation());
});

test('review rereads catalog price, stock and preferences, and requires explicit contact confirmation',()=>{
 const f=setup(),prepared=changeGiftPreparation(f.rewards,scope,emptyGiftPreparation(),f.input,f.options),r=review(f.input);
 for(const edit of [c=>c.revision++,c=>c.products.find(p=>p.id==='orchard-jam').purchaseCents++,c=>c.masterById['orchard-jam'].stockQuantity=0]){const catalog=structuredClone(f.catalog);edit(catalog);assert.throws(()=>changeGiftPreparation(f.rewards,scope,prepared,r,{...f.options,kind:'review',catalog}));}
 assert.throws(()=>changeGiftPreparation(f.rewards,scope,prepared,r,{...f.options,kind:'review',preferences:{...f.preferences,revision:2}}),{status:409});
 const preferences=structuredClone(f.preferences);preferences.value.privateContactRequested=true;const fresh=changeGiftPreparation(f.rewards,scope,emptyGiftPreparation(),f.input,{...f.options,preferences});
 assert.throws(()=>changeGiftPreparation(f.rewards,scope,fresh,r,{...f.options,kind:'review',preferences}),{status:422});assert.throws(()=>changeGiftPreparation(f.rewards,scope,fresh,{...r,preferencesReviewed:false},{...f.options,kind:'review',preferences}),{status:400});
 assert.equal(Object.values(changeGiftPreparation(f.rewards,scope,fresh,{...r,contactConfirmed:true},{...f.options,kind:'review',preferences}).drafts)[0].status,'reviewed');
});

test('unearned/collective gifts, forged amounts, stale leases and foreign scopes cannot prepare an attention',()=>{
 const f=setup(),empty=emptyGiftPreparation();for(const input of [{...f.input,unlockId:'unearned'},{...f.input,unlockId:Object.values(f.rewards.unlocks).find(u=>u.program==='party').id},{...f.input,allocatedCents:999999},{...f.input,revision:1}])assert.throws(()=>changeGiftPreparation(f.rewards,scope,empty,input,f.options));
 assert.throws(()=>changeGiftPreparation(f.rewards,{...scope,tenantId:'other'},empty,f.input,f.options),{status:403});
 const prepared=changeGiftPreparation(f.rewards,scope,empty,f.input,f.options);assert.throws(()=>changeGiftPreparation(f.rewards,scope,prepared,{...f.input,packagingInclTaxCents:0},f.options),{status:409});
 const disabled=runPilot('none').rewards;assert.throws(()=>changeGiftPreparation(disabled,scope,empty,f.input,f.options),{status:404});
});

test('personal view omits costs, catalog, preferences, audit and other recipients; operations remain simulation-only',()=>{
 const f=setup(),prepared=changeGiftPreparation(f.rewards,scope,emptyGiftPreparation(),f.input,f.options);const own=personalGiftPreparation(prepared,f.unlock.uid),other=personalGiftPreparation(prepared,'person-1-0');assert.equal(own.proposals.length,1);assert.equal(other.proposals.length,0);for(const word of ['quote','fingerprint','manager','951','preferences','composition'])assert.ok(!JSON.stringify(own).includes(word));
 const reviewed=changeGiftPreparation(f.rewards,scope,prepared,review(f.input),{...f.options,kind:'review'});assert.match(personalGiftPreparation(reviewed,f.unlock.uid).proposals[0].composition,/Confiture/);const ops=giftPreparationOperations(f.rewards,scope,reviewed,f.catalog,citeDemoPreferences());assert.equal(ops.ordersCreated,false);assert.equal(ops.stockReserved,false);assert.equal(ops.rows.length,14);assert.ok(!JSON.stringify(ops).includes('birthday'));
});
