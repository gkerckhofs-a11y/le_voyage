import {createHash} from 'node:crypto';
import {identifier} from '../cite/economy.ts';
import {civilDate} from '../domain/calendar.ts';
import {normalizeCatalogSelection,resolveCatalogLines} from './catalog-lines.mjs';
import {createCiteStore} from './cite-store.mjs';
const fail=(status,message='Gift preparation refused')=>Object.assign(Error(message),{status});
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const money=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
const text=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[\x00-\x1f\x7f]/.test(v);
function keys(input,fields){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==[...fields].sort().join(','))throw fail(400);}
function context(rewards,scope){if(!rewards||rewards.tenantId!==scope.tenantId||rewards.seasonId!==scope.seasonId||rewards.plan?.moneyBasis!=='simulation-only'||rewards.plan.currency!=='EUR'||!identifier(scope.familyId))throw fail(403);}
function entitlement(rewards,id){const u=typeof id==='string'&&Object.hasOwn(rewards.unlocks,id)?rewards.unlocks[id]:null;if(!u||!identifier(u.uid)||u.program==='party'||!money(u.allocatedCents))throw fail(404);return u;}
export const giftDraftId=(scope,unlockId)=>hash([scope.tenantId,scope.seasonId,unlockId]);
export const emptyGiftPreparation=()=>({drafts:{},mutations:{}});
const fingerprint=p=>hash(p??null);
/** Calculate a simulation estimate from declared metadata; never infer tax or mix unknown bases. */
export function quoteCiteGift(catalog,selection,{dueDate,asOf,packagingInclTaxCents,transportInclTaxCents,allocatedCents}){
 if(!money(packagingInclTaxCents)||!money(transportInclTaxCents)||!money(allocatedCents))throw fail(400);
 const normalized=normalizeCatalogSelection(selection);if(!normalized)throw fail(400);
 const resolved=resolveCatalogLines(catalog,normalized,{dueDate,asOf});
 const lines=resolved.lines.map(line=>{
  if(line.priceBasis!=='HTVA'||!Number.isSafeInteger(line.vatBasisPoints)||line.vatBasisPoints<0||line.vatBasisPoints>10000||!money(line.linePurchaseCents))throw fail(422,'Explicit catalog tax metadata required');
  const lineInclTaxCents=Number((BigInt(line.linePurchaseCents)*BigInt(10000+line.vatBasisPoints)+5000n)/10000n);
  if(!money(lineInclTaxCents))throw fail(422);
  return {...line,lineInclTaxCents};
 });
 const purchaseInclTaxCents=lines.reduce((n,l)=>n+l.lineInclTaxCents,0),totalInclTaxCents=purchaseInclTaxCents+packagingInclTaxCents+transportInclTaxCents;
 if(!money(totalInclTaxCents)||totalInclTaxCents>allocatedCents)throw fail(422,'Gift envelope exceeded');
 return {basis:'simulation-EUR-incl-tax',catalogRevision:normalized.revision,selection:normalized,lines,composition:resolved.composition,supplier:resolved.supplier,purchaseExTaxCents:resolved.purchaseCents,purchaseInclTaxCents,packagingInclTaxCents,transportInclTaxCents,totalInclTaxCents,remainingCents:allocatedCents-totalInclTaxCents};
}
function command(input,kind){
 const common=['unlockId','revision','mutationId','reason'];
 keys(input,kind==='prepare'?[...common,'selection','dueDate','packagingInclTaxCents','transportInclTaxCents']:kind==='review'?[...common,'preferencesReviewed','contactConfirmed']:common);
 if(typeof input.unlockId!=='string'||input.unlockId.length>500||!Number.isSafeInteger(input.revision)||input.revision<0||input.revision>=1000||typeof input.mutationId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.mutationId)||!text(input.reason,3,240))throw fail(400);
 if(kind==='review'&&(input.preferencesReviewed!==true||typeof input.contactConfirmed!=='boolean'))throw fail(400);
}
/** A proposal/review ledger only: no stock reservation, supplier order, invoice or shipping action. */
export function changeGiftPreparation(rewards,scope,current,input,{kind,catalog,preferences=null,actor,onDate}){
 context(rewards,scope);if(!['prepare','review','reopen'].includes(kind)||!identifier(actor))throw fail(400);civilDate(onDate);command(input,kind);
 const u=entitlement(rewards,input.unlockId);if(onDate<u.earnedOn)throw fail(409);
 const id=giftDraftId(scope,u.id),digest=hash([scope.tenantId,scope.seasonId,kind,actor,input]),prior=current.mutations[input.mutationId];
 if(prior){if(prior.digest!==digest)throw fail(409);return current;}
 const old=current.drafts[id];if((old?.revision??0)!==input.revision)throw fail(409);
 const next=structuredClone(current),revision=input.revision+1;
 if(kind==='prepare'){
  if(old?.status==='reviewed')throw fail(409);
  civilDate(input.dueDate);if(input.dueDate<u.earnedOn)throw fail(422);
  const quote=quoteCiteGift(catalog,input.selection,{...input,asOf:onDate,allocatedCents:u.allocatedCents});
  next.drafts[id]={id,unlockId:u.id,uid:u.uid,status:'draft',revision,dueDate:input.dueDate,quote,preferenceFingerprint:fingerprint(preferences),review:null,audit:[...(old?.audit??[]),{kind,revision,actor,onDate,reason:input.reason.trim()}]};
 }else{
  if(!old||old.uid!==u.uid||old.unlockId!==u.id)throw fail(409);
  if(kind==='review'){
   if(old.status!=='draft'||old.preferenceFingerprint!==fingerprint(preferences))throw fail(409);
   const fresh=quoteCiteGift(catalog,old.quote.selection,{dueDate:old.dueDate,asOf:onDate,packagingInclTaxCents:old.quote.packagingInclTaxCents,transportInclTaxCents:old.quote.transportInclTaxCents,allocatedCents:u.allocatedCents});
   if(JSON.stringify(fresh)!==JSON.stringify(old.quote))throw fail(409);
   if(preferences?.value?.privateContactRequested===true&&input.contactConfirmed!==true)throw fail(422);
   next.drafts[id]={...old,status:'reviewed',revision,review:{actor,onDate,preferencesReviewed:true,contactConfirmed:input.contactConfirmed},audit:[...old.audit,{kind,revision,actor,onDate,reason:input.reason.trim()}]};
  }else{
   if(old.status!=='reviewed')throw fail(409);
   next.drafts[id]={...old,status:'draft',revision,review:null,audit:[...old.audit,{kind,revision,actor,onDate,reason:input.reason.trim()}]};
  }
 }
 next.mutations[input.mutationId]={digest,id,revision};return next;
}
export function personalGiftPreparation(current,uid){if(!identifier(uid))throw fail(403);return {proposals:Object.values(current.drafts).filter(d=>d.uid===uid).map(d=>({id:d.id,unlockId:d.unlockId,status:d.status,dueDate:d.dueDate,...(d.status==='reviewed'?{composition:d.quote.composition}:{}),simulationOnly:true}))};}
function operatorDraft(draft){if(!draft)return null;const {preferenceFingerprint,...view}=draft;return structuredClone(view);}
export function giftPreferenceView(preferences){const p=preferences?.value;return {hasPreferences:!!p,revision:preferences?.revision??0,choices:Array.isArray(p?.choices)?[...p.choices]:[],alcoholFree:p?.alcoholFree===true,surprise:p?.surprise===true,contactRequired:p?.privateContactRequested===true};}
export function giftPreparationOperations(rewards,scope,current,catalog,preferencesByUid={}){
 context(rewards,scope);if(Object.values(rewards.unlocks).filter(u=>u.program!=='party').length>200)throw fail(409,'Gift prototype capacity exceeded');return {simulationOnly:true,stockReserved:false,ordersCreated:false,rows:Object.values(rewards.unlocks).filter(u=>u.program!=='party').map(u=>({id:giftDraftId(scope,u.id),unlockId:u.id,uid:u.uid,label:u.label,allocatedCents:u.allocatedCents,earnedOn:u.earnedOn,preferences:giftPreferenceView(preferencesByUid[u.uid]??null),draft:operatorDraft(current.drafts[giftDraftId(scope,u.id)]??null)})),catalog:{revision:catalog?.revision??null,products:catalog?.products?.map(p=>({id:p.id,name:p.name,purchaseExTaxCents:p.purchaseCents,vatBasisPoints:catalog.masterById?.[p.id]?.vatBasisPoints??null,active:p.active,alcohol:p.alcohol,availability:p.availability,restrictions:p.restrictions}))??[]}};
}
export function createCiteGiftPreparationService(adapter,{catalogDocument='supplierCatalog/main',...options}={}){
 const store=createCiteStore(adapter,options),{db}=adapter;
 const operate=(header,scope,permission,fn)=>store(header,scope,permission,async(record,uid,date,{tx})=>{
  context(record.rewards,scope);return fn(record,uid,date,tx);
 });
 async function operations(record,tx,catalog,current=record.giftPreparation??emptyGiftPreparation()){
  const uids=[...new Set(Object.values(record.rewards.unlocks).filter(u=>u.program!=='party').map(u=>u.uid))];if(uids.length>200)throw fail(409);
  const preferences={};for(const uid of uids)preferences[uid]=(await tx.get(db.doc(`tenants/${record.rewards.tenantId}/giftPreferences/${uid}`))).data()??null;
  return giftPreparationOperations(record.rewards,{tenantId:record.rewards.tenantId,seasonId:record.rewards.seasonId,familyId:record.state.config.families[0].id},current,catalog,preferences);
 }
 const change=(kind,header,scope,input)=>operate(header,scope,'rewardOperations',async(record,uid,date,tx)=>{
  command(input,kind);const u=entitlement(record.rewards,input.unlockId);
  const catalog=(await tx.get(db.doc(catalogDocument))).data(),preferences=(await tx.get(db.doc(`tenants/${scope.tenantId}/giftPreferences/${u.uid}`))).data()??null;
  const current=record.giftPreparation??emptyGiftPreparation(),next=changeGiftPreparation(record.rewards,scope,current,input,{kind,catalog,preferences,actor:uid,onDate:date});
  return {record:next===current?record:{...record,giftPreparation:next},value:await operations(record,tx,catalog,next)};
 });
 return {
  list:(header,scope)=>operate(header,scope,'rewardOperations',async(record,_uid,_date,tx)=>({record,value:await operations(record,tx,(await tx.get(db.doc(catalogDocument))).data())})),
  personal:(header,scope)=>operate(header,scope,'member',(record,uid)=>({record,value:personalGiftPreparation(record.giftPreparation??emptyGiftPreparation(),uid)})),
  prepare:(header,scope,input)=>change('prepare',header,scope,input),review:(header,scope,input)=>change('review',header,scope,input),reopen:(header,scope,input)=>change('reopen',header,scope,input)
 };
}
