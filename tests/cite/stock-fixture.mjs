import {randomUUID} from 'node:crypto';
import {fixture} from './server-fixture.mjs';
import {runPilot} from '../../src/cite/pilot.ts';
import {citeDemoCatalog,citeDemoPreferences} from '../../src/server/cite-demo-catalog.mjs';
import {createCiteGiftPreparationService} from '../../src/server/cite-gift-preparation.mjs';
import {createCiteGiftStockService} from '../../src/server/cite-gift-stock.mjs';
/** Serialized transaction substitute with atomic buffered writes and Firestore's read-before-write rule. */
export async function stockFixture(){
 const f=fixture(),p=runPilot();Object.assign(f.data.get(f.privatePath),{state:p.game.economy,councils:p.game.councils,city:p.game.city,rewards:p.rewards});
 f.data.get(f.memberPath('manager')).citeRewardOperations=[f.s.seasonId];f.setDate('2027-03-01');
 const ref=path=>({path,id:path.split('/').at(-1),collection:name=>({doc:id=>ref(path+'/'+name+'/'+id)})});f.adapter.db.doc=ref;
 const run=f.adapter.db.runTransaction;
 f.adapter.db.runTransaction=fn=>run(tx=>{let written=false;return fn({...tx,get:async r=>{if(written)throw Error('Read after write');return tx.get(r);},set:(r,v)=>{written=true;tx.set(r,v);},create:(r,v)=>{if(f.data.has(r.path))throw Error('Existing document');written=true;tx.set(r,v);}});});
 const catalog=citeDemoCatalog();catalog.masterById['orchard-jam'].stockQuantity=1;f.data.set('supplierCatalog/main',catalog);
 for(const [uid,pref]of Object.entries(citeDemoPreferences()))f.data.set(`tenants/${f.s.tenantId}/giftPreferences/${uid}`,pref);
 const gifts=createCiteGiftPreparationService(f.adapter,{today:f.today}),stock=createCiteGiftStockService(f.adapter,{today:f.today}),ledgerPath='supplierCatalog/main/reservationLedger/main';
 async function prepare(uid='person-0-0',scope=f.s){const r=f.data.get(`tenants/${scope.tenantId}/citeSeasons/${scope.seasonId}/privateEconomy/main`).rewards,u=Object.values(r.unlocks).find(u=>u.program==='participation'&&u.uid===uid);
  const common={unlockId:u.id,mutationId:randomUUID(),reason:'Test de préparation'},input={...common,revision:0,selection:{revision:catalog.revision,lines:[{id:'orchard-jam',quantity:1}]},dueDate:'2027-03-15',packagingInclTaxCents:50,transportInclTaxCents:0};
  await gifts.prepare('Bearer manager',scope,input);await gifts.review('Bearer manager',scope,{...common,revision:1,mutationId:randomUUID(),preferencesReviewed:true,contactConfirmed:false});
  return {unlockId:u.id,revision:2,mutationId:randomUUID(),reason:'Test de réservation'};
 }
 return {...f,gifts,stock,catalog,ledgerPath,prepare};
}
