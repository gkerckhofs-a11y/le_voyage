import {canonicalJSON} from '../cite/canonical.ts';
import {createHash} from 'node:crypto';
import {civilDate} from '../domain/calendar.ts';
import {identifier} from '../cite/economy.ts';
import {createCiteStore} from './cite-store.mjs';
import {giftDraftId,quoteCiteGift,readCiteGiftPreparationOperations,emptyGiftPreparation,giftPreferencesMatch} from './cite-gift-preparation.mjs';
const fail=(status,message='Stock action refused')=>Object.assign(Error(message),{status});
export const stockSkuKey=sku=>createHash('sha256').update(JSON.stringify(sku)).digest('hex');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const unit=v=>Number.isSafeInteger(v)&&v>=0;
function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='mutationId,reason,revision,unlockId'||typeof input.unlockId!=='string'||input.unlockId.length>500||!Number.isSafeInteger(input.revision)||input.revision<1||input.revision>=1000||typeof input.mutationId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.mutationId)||typeof input.reason!=='string'||input.reason.trim().length<3||input.reason.length>240||/[\x00-\x1f\x7f]/.test(input.reason))throw fail(400);
}
function validateLedger(ledger){
 if(!ledger||typeof ledger!=='object'||Array.isArray(ledger))throw fail(409);
 const keys=new Set();for(const field of ['counts','committed','consumed','citeHeld']){const map=ledger[field];if(map===undefined)continue;if(!map||typeof map!=='object'||Array.isArray(map)||Object.keys(map).length>1000)throw fail(409);for(const [key,value]of Object.entries(map)){if(!/^[a-f0-9]{64}$/.test(key)||!unit(value))throw fail(409);keys.add(key);}}
 for(const key of keys)balances(ledger,key);
}
function balances(ledger,key){
 const count=ledger.counts?.[key]??0,committed=ledger.committed?.[key]??0,consumed=ledger.consumed?.[key]??0,citeHeld=ledger.citeHeld?.[key]??0;
 if(![count,committed,consumed,citeHeld].every(unit)||!Number.isSafeInteger(committed+consumed+citeHeld)||count<committed+consumed+citeHeld)throw fail(409,'Inconsistent shared stock ledger');
 return {count,citeHeld};
}
/** Same counts/SKU hashing as legacy Cockpit. Held stock is not a purchase or stock decrement. */
export function changeCiteGiftStock(rewards,scope,current,ledger,input,{action,catalog,preferences=null,actor,onDate}){
 validate(input);civilDate(onDate);validateLedger(ledger);
 if(!['reserve','release'].includes(action)||!identifier(actor))throw fail(400);
 if(!rewards||rewards.tenantId!==scope.tenantId||rewards.seasonId!==scope.seasonId||!identifier(scope.familyId)||rewards.plan?.moneyBasis!=='simulation-only'||rewards.plan.currency!=='EUR')throw fail(403);
 const u=Object.hasOwn(rewards.unlocks,input.unlockId)?rewards.unlocks[input.unlockId]:null;
 if(!u||u.program==='party'||!identifier(u.uid))throw fail(404);
 const id=giftDraftId(scope,u.id),fingerprint=digest([scope.tenantId,scope.seasonId,action,actor,input]),prior=current.mutations[input.mutationId];
 if(prior){if(prior.digest!==fingerprint)throw fail(409);return {preparations:current,ledger};}
 const old=current.drafts[id];
 if(!old||old.unlockId!==u.id||old.uid!==u.uid||old.revision!==input.revision||old.status!=='reviewed'||onDate<u.earnedOn)throw fail(409);
 const counts={...ledger.counts},citeHeld={...ledger.citeHeld};let lines;
 if(action==='reserve'){
  if(old.stockHold?.status==='reserved'||!old.review||!giftPreferencesMatch(old,preferences))throw fail(409);
  const fresh=quoteCiteGift(catalog,old.quote.selection,{dueDate:old.dueDate,asOf:onDate,packagingInclTaxCents:old.quote.packagingInclTaxCents,transportInclTaxCents:old.quote.transportInclTaxCents,allocatedCents:u.allocatedCents});
  if(canonicalJSON(fresh)!==canonicalJSON(old.quote)||preferences?.value?.privateContactRequested===true&&old.review.contactConfirmed!==true)throw fail(409);
  const seen=new Set();lines=fresh.lines.map(line=>{
   if(typeof line.sku!=='string'||!line.sku.length||line.sku.length>128||/[\x00-\x1f\x7f]/.test(line.sku))throw fail(422);
   const matches=catalog.products.filter(p=>(catalog.masterById?.[p.id]?.sku??p.id)===line.sku),stock=matches.length===1?catalog.masterById?.[matches[0].id]?.stockQuantity:null,key=stockSkuKey(line.sku),b=balances(ledger,key);
   if(seen.has(key)||!Number.isSafeInteger(line.quantity)||line.quantity<1||!unit(stock)||!Number.isSafeInteger(b.count+line.quantity)||b.count+line.quantity>stock)throw fail(422,'Insufficient or unknown available stock');
   seen.add(key);counts[key]=b.count+line.quantity;citeHeld[key]=b.citeHeld+line.quantity;
   return {sku:line.sku,name:line.name,quantity:line.quantity};
  });
 }else{
  if(old.stockHold?.status!=='reserved'||!Array.isArray(old.stockHold.lines)||!old.stockHold.lines.length)throw fail(409);
  const seen=new Set();lines=old.stockHold.lines.map(line=>{
   const key=stockSkuKey(line.sku),b=balances(ledger,key);
   if(seen.has(key)||!Number.isSafeInteger(line.quantity)||line.quantity<1||b.citeHeld<line.quantity)throw fail(409);seen.add(key);
   counts[key]=b.count-line.quantity;citeHeld[key]=b.citeHeld-line.quantity;
   if(!counts[key])delete counts[key];if(!citeHeld[key])delete citeHeld[key];return structuredClone(line);
  });
 }
 if(Object.keys(counts).length>1000||Object.keys(citeHeld).length>1000)throw fail(409);
 const next=structuredClone(current),revision=old.revision+1;
 next.drafts[id]={...old,revision,stockHold:{status:action==='reserve'?'reserved':'released',lines,actor,onDate,proposalRevision:action==='reserve'?old.revision:old.stockHold.proposalRevision},audit:[...old.audit,{kind:action,revision,actor,onDate,reason:input.reason.trim()}]};
 next.mutations[input.mutationId]={digest:fingerprint,id,revision};
 return {preparations:next,ledger:{...ledger,counts,citeHeld}};
}
export function createCiteGiftStockService(adapter,{catalogDocument='supplierCatalog/main',...options}={}){
 const store=createCiteStore(adapter,options),{db}=adapter,ledgerRef=db.doc(catalogDocument+'/reservationLedger/main');
 const change=(action,header,scope,input)=>store(header,scope,'rewardOperations',async(record,uid,date,{tx})=>{
  validate(input);const u=record.rewards?.unlocks?.[input.unlockId];if(!u||!identifier(u.uid))throw fail(404);
  const ledger=(await tx.get(ledgerRef)).data()??{},catalog=(await tx.get(db.doc(catalogDocument))).data(),preferences=(await tx.get(db.doc(`tenants/${scope.tenantId}/giftPreferences/${u.uid}`))).data()??null;
  const current=record.giftPreparation??emptyGiftPreparation(),next=changeCiteGiftStock(record.rewards,scope,current,ledger,input,{action,catalog,preferences,actor:uid,onDate:date});
  const value=await readCiteGiftPreparationOperations({db,tx,record,catalog,current:next.preparations,ledger:next.ledger,catalogDocument});
  if(next.preparations!==current){if(Buffer.byteLength(JSON.stringify(next.ledger))>800000)throw fail(409);tx.set(ledgerRef,next.ledger);}
  return {record:next.preparations===current?record:{...record,giftPreparation:next.preparations},value};
 });
 return {reserve:(header,scope,input)=>change('reserve',header,scope,input),release:(header,scope,input)=>change('release',header,scope,input)};
}
