import {createHash} from 'node:crypto';
import {civilDate} from '../domain/calendar.ts';
import {campaignDate} from '../domain/rolling-calendar.ts';
import {receptionLevel} from '../domain/engine.ts';
import {displayKm} from '../domain/exact.ts';
import {collectiveIdentity} from '../../scripts/demo-collective.mjs';
const fail=status=>Object.assign(Error('Reception operations unavailable'),{status});
const statuses=['planned','options','frozen','confirmed','preparing','completed','closed'];
const fields=['date','venue','guests','owner','providers','bookingReference','completionReference','fallback'];
const costFields=['estimatedCents','committedCents','actualCents'];
const empty=()=>({date:'',venue:'',guests:0,owner:'',providers:'',bookingReference:'',completionReference:'',fallback:''});
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function scope(i){if(!i||!['tenantId','campaignId'].every(k=>typeof i[k]==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(i[k])))throw fail(400);}
function stateOf(snapshot,s){if(!snapshot.exists)throw fail(403);const state=JSON.parse(snapshot.data().payload).ledger.state;if(state.config.tenantId!==s.tenantId||state.config.campaignId!==s.campaignId)throw fail(403);return state;}
function normalize(i){
 scope(i);if(Object.keys(i).sort().join()!==['tenantId','campaignId','revision','mutationId','reason','confirmed','status',...fields].sort().join()||!statuses.includes(i.status)||i.confirmed!==true||!Number.isSafeInteger(i.revision)||i.revision<0||i.revision>=1000||typeof i.mutationId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(i.mutationId))throw fail(400);
 const value={status:i.status};for(const k of [...fields,'reason']){if(k==='guests'){if(!Number.isSafeInteger(i[k])||i[k]<0||i[k]>100000)throw fail(400);value[k]=i[k];}else{if(typeof i[k]!=='string'||i[k].length>(['providers','fallback'].includes(k)?600:240)||/[\x00-\x1f\x7f]/.test(i[k]))throw fail(400);value[k]=i[k].trim();}}
 if(value.reason.length<3)throw fail(400);if(value.date)try{civilDate(value.date);}catch{throw fail(400);}return value;
}
function normalizeCosts(i){
 scope(i);if(Object.keys(i).sort().join()!==['tenantId','campaignId','revision','mutationId','reason','confirmed','basis','asOf','reference',...costFields].sort().join()||i.confirmed!==true||!Number.isSafeInteger(i.revision)||i.revision<0||i.revision>=1000||!['HT','TTC'].includes(i.basis)||typeof i.mutationId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(i.mutationId))throw fail(400);
 const value={basis:i.basis,asOf:i.asOf};try{civilDate(i.asOf);}catch{throw fail(400);}
 for(const k of ['reference','reason']){if(typeof i[k]!=='string'||i[k].length>240||/[\x00-\x1f\x7f]/.test(i[k])||i[k].trim().length<3)throw fail(400);value[k]=i[k].trim();}
 for(const k of costFields){if(i[k]!==null&&(!Number.isSafeInteger(i[k])||i[k]<0||i[k]>100000000))throw fail(400);value[k]=i[k];}
 if(costFields.every(k=>value[k]===null))throw fail(400);return value;
}
export function createReceptionOperations({db,actor,check,campaignRef,now}){
 const refFor=s=>campaignRef(s).collection('receptionOperations').doc('main');
 function project(state,s,r){const reception=receptionLevel(state);return {...s,client:collectiveIdentity(state).organizationName,revision:r?.revision??0,status:r?.status??'planned',...Object.fromEntries(fields.map(k=>[k,r?.[k]??empty()[k]])),updatedAt:r?.updatedAt??null,
  reception:{level:reception.level,displayKm:displayKm(reception.km),frozen:!!state.freeze,frozenOn:state.freeze?.frozenOn??null,cutoffDate:state.config.reception.cutoffDate},recordedFreeze:r?.recordedFreeze??null};}
 return {
  async receptions(header){const uid=await actor(header);return db.runTransaction(async tx=>{const grants=await check(tx,uid),rows=[];for(const s of grants){const state=stateOf(await tx.get(campaignRef(s)),s),r=(await tx.get(refFor(s))).data();rows.push(project(state,s,r));}return {rows};});},
  async receptionDetail(header,i){scope(i);if(Object.keys(i).sort().join()!=='campaignId,tenantId')throw fail(400);const uid=await actor(header);return db.runTransaction(async tx=>{await check(tx,uid,i);const state=stateOf(await tx.get(campaignRef(i)),i),ref=refFor(i),r=(await tx.get(ref)).data(),history=await tx.get(ref.collection('history').orderBy('revision','desc').limit(20));const costRef=ref.collection('costs').doc('current'),costs=(await tx.get(costRef)).data(),costHistory=await tx.get(costRef.collection('history').orderBy('revision','desc').limit(20));return {record:project(state,i,r),costs:costs??null,costHistory:costHistory.docs.map(d=>d.data().record),history:history.docs.map(d=>{const v=d.data();return {revision:v.revision,at:v.at,actor:v.actor,reason:v.reason,status:v.record.status};})};});},
  async saveReceptionCosts(header,i){const value=normalizeCosts(i),uid=await actor(header);return db.runTransaction(async tx=>{
   await check(tx,uid,i);const s={tenantId:i.tenantId,campaignId:i.campaignId},state=stateOf(await tx.get(campaignRef(s)),s),operation=refFor(s),reception=(await tx.get(operation)).data(),ref=operation.collection('costs').doc('current'),old=(await tx.get(ref)).data(),audit=ref.collection('history').doc(i.mutationId),prior=(await tx.get(audit)).data(),digest=hash({uid,revision:i.revision,value});
   if(prior){if(prior.digest!==digest)throw fail(409);return {revision:prior.revision,alreadyApplied:true};}
   if(!reception||(old?.revision??0)!==i.revision||old&&old.basis!==value.basis)throw fail(409);
   const at=now();if(value.asOf>campaignDate(at,state.config.calendar?.timeZone??'Europe/Brussels'))throw fail(422);
   const revision=i.revision+1,record={...value,revision,at,actor:uid};tx.set(ref,record);tx.create(audit,{digest,revision,record});return {revision,alreadyApplied:false};
  });},
  async saveReception(header,i){const value=normalize(i),uid=await actor(header);return db.runTransaction(async tx=>{
   await check(tx,uid,i);const s={tenantId:i.tenantId,campaignId:i.campaignId},state=stateOf(await tx.get(campaignRef(s)),s),ref=refFor(s),old=(await tx.get(ref)).data(),audit=ref.collection('history').doc(i.mutationId),prior=(await tx.get(audit)).data(),digest=hash({uid,revision:i.revision,value});
   if(prior){if(prior.digest!==digest)throw fail(409);return {revision:prior.revision,alreadyApplied:true};}
   if((old?.revision??0)!==i.revision||old?.status==='closed')throw fail(409);
   const from=statuses.indexOf(old?.status??'planned'),to=statuses.indexOf(value.status);if(to<from||to>from+1)throw fail(409);
   if(to>=1&&(!value.date||!value.venue||!value.guests||!value.owner||!value.providers||!value.bookingReference))throw fail(422);
   if(to>=1&&value.date<=state.config.reception.cutoffDate)throw fail(422);
   if(to>=2&&!state.freeze)throw fail(409);
   const frozen=state.freeze?{level:state.freeze.level,distance:state.freeze.km,frozenOn:state.freeze.frozenOn}:null;
   if(old?.recordedFreeze&&hash(old.recordedFreeze)!==hash(frozen))throw fail(409);
   if(to>=3&&!value.fallback)throw fail(422);
   const at=now();if(to>=5&&(!value.completionReference||value.date>campaignDate(at,state.config.calendar?.timeZone??'Europe/Brussels')))throw fail(422);
   const {reason,...content}=value,revision=i.revision+1,record={...content,revision,updatedAt:at,actor:uid,recordedFreeze:old?.recordedFreeze??(to>=2?frozen:null)};
   tx.set(ref,record);tx.create(audit,{digest,revision,at,actor:uid,reason,record});return {revision,alreadyApplied:false};
  });},
 };
}
