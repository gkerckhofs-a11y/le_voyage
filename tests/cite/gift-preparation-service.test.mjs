import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {fixture} from './server-fixture.mjs';import {runPilot} from '../../src/cite/pilot.ts';import {citeDemoCatalog,citeDemoPreferences} from '../../src/server/cite-demo-catalog.mjs';import {createCiteGiftPreparationService} from '../../src/server/cite-gift-preparation.mjs';
function setup(){const f=fixture(),p=runPilot();Object.assign(f.data.get(f.privatePath),{state:p.game.economy,councils:p.game.councils,city:p.game.city,rewards:p.rewards});f.data.set('supplierCatalog/main',citeDemoCatalog());for(const [uid,p]of Object.entries(citeDemoPreferences()))f.data.set(`tenants/${f.s.tenantId}/giftPreferences/${uid}`,p);f.setDate('2027-03-01');
 const service=createCiteGiftPreparationService(f.adapter,{today:f.today}),u=Object.values(p.rewards.unlocks).find(u=>u.program==='participation'&&u.uid==='person-0-0');const input={unlockId:u.id,revision:0,mutationId:randomUUID(),reason:'Préparer la simulation',selection:{revision:0,lines:[{id:'orchard-jam',quantity:1}]},dueDate:'2027-03-15',packagingInclTaxCents:50,transportInclTaxCents:0};return {...f,gifts:service,input};}
const review=(input,revision=1)=>({unlockId:input.unlockId,revision,mutationId:randomUUID(),reason:'Vérifier la simulation',preferencesReviewed:true,contactConfirmed:false});
test('only a scoped gift operator can read catalog/preference details or prepare gifts; revocation is immediate',async()=>{
 const f=setup();for(const uid of ['manager','person-0-0'])await assert.rejects(f.gifts.list('Bearer '+uid,f.s),{status:403});
 f.data.get(f.memberPath('manager')).citeRewardOperations=[f.s.seasonId];const list=await f.gifts.list('Bearer manager',f.s);assert.equal(list.rows.length,14);assert.equal(list.catalog.revision,0);assert.ok(list.rows.every(r=>!Object.hasOwn(r.preferences,'birthday')));
 await assert.rejects(f.gifts.list('Bearer manager',{...f.s,tenantId:'other'}),{status:403});await assert.rejects(f.gifts.prepare('Bearer person-0-0',f.s,f.input),{status:403});assert.deepEqual(await f.gifts.personal('Bearer person-0-0',f.s),{proposals:[]});
 f.data.get(f.memberPath('manager')).citeRewardOperations=[];await assert.rejects(f.gifts.prepare('Bearer manager',f.s,f.input),{status:403});assert.ok(!f.data.get(f.privatePath).giftPreparation);
});
test('concurrent retries create one audited draft; different stale edits fail, with no stock, budget or purse mutation',async()=>{
 const f=setup();f.data.get(f.memberPath('manager')).citeRewardOperations=[f.s.seasonId];const before=structuredClone(f.data.get(f.privatePath)),catalog=structuredClone(f.data.get('supplierCatalog/main'));
 await Promise.all([f.gifts.prepare('Bearer manager',f.s,f.input),f.gifts.prepare('Bearer manager',f.s,f.input)]);assert.equal(Object.values(f.data.get(f.privatePath).giftPreparation.drafts)[0].audit.length,1);
 await assert.rejects(f.gifts.prepare('Bearer manager',f.s,{...f.input,mutationId:randomUUID(),packagingInclTaxCents:0}),{status:409});
 await f.gifts.review('Bearer manager',f.s,review(f.input));const own=await f.gifts.personal('Bearer person-0-0',f.s);assert.equal(own.proposals[0].status,'reviewed');assert.ok(!JSON.stringify(own).includes('quote'));assert.deepEqual(await f.gifts.personal('Bearer person-1-0',{...f.s,familyId:'family-1'}),{proposals:[]});await assert.rejects(f.gifts.personal('Bearer person-0-0',{...f.s,familyId:'family-1'}),{status:403});
 assert.deepEqual(f.data.get(f.privatePath).rewards,before.rewards);assert.deepEqual(f.data.get(f.privatePath).state,before.state);assert.deepEqual(f.data.get('supplierCatalog/main'),catalog);
});
test('catalog and preferences are read inside the same transaction; a failed review leaves no partial record',async()=>{
 const f=setup();f.data.get(f.memberPath('manager')).citeRewardOperations=[f.s.seasonId];await f.gifts.prepare('Bearer manager',f.s,f.input);const before=structuredClone(f.data.get(f.privatePath).giftPreparation);
 f.data.get('supplierCatalog/main').revision=1;await assert.rejects(f.gifts.review('Bearer manager',f.s,review(f.input)),{status:409});assert.deepEqual(f.data.get(f.privatePath).giftPreparation,before);
 const pref=f.data.get(`tenants/${f.s.tenantId}/giftPreferences/person-0-0`);pref.revision++;pref.value.privateContactRequested=true;
 await f.gifts.prepare('Bearer manager',f.s,{...f.input,selection:{...f.input.selection,revision:1},revision:1,mutationId:randomUUID()});await assert.rejects(f.gifts.review('Bearer manager',f.s,review(f.input,2)),{status:422});await f.gifts.review('Bearer manager',f.s,{...review(f.input,2),contactConfirmed:true});assert.equal(Object.values(f.data.get(f.privatePath).giftPreparation.drafts)[0].status,'reviewed');
});
