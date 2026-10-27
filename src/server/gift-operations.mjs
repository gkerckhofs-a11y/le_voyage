import {createHash} from 'node:crypto';
import {assertTestAdapter} from './test-environment.mjs';
import {eventId} from '../application/events.ts';
import {catalog,demoTeamIdentity} from './demo-service.mjs';
import {collectiveIdentity} from '../../scripts/demo-collective.mjs';
const fail=status=>Object.assign(new Error('Gift operations unavailable'),{status});
const identifier=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
export const giftStatuses=['to-select','to-order','to-receive','to-compose','ready','to-deliver','delivered','incident'];
const editable=['dueDate','owner','composition','supplier','orderReference','deliveryReference','purchaseCents','packagingCents','transportCents','alcoholFreeConfirmed','status'];
const defaults=()=>({dueDate:'',owner:'',composition:'',supplier:'',orderReference:'',deliveryReference:'',purchaseCents:0,packagingCents:0,transportCents:0,alcoholFreeConfirmed:false,status:'to-select',revision:0,resumeStatus:null});
function normalize(input){
 if(!input||Object.keys(input).sort().join(',')!==[...editable,'revision','mutationId','reason','tenantId','campaignId','id'].sort().join(','))throw fail(400);
 if(!identifier(input.tenantId)||!identifier(input.campaignId)||!/^[a-f0-9]{64}$/.test(input.id)||!Number.isSafeInteger(input.revision)||input.revision<0||!(/^[a-f0-9-]{36}$/).test(input.mutationId)||!giftStatuses.includes(input.status)||typeof input.alcoholFreeConfirmed!=='boolean')throw fail(400);
 const value={};for(const key of editable){const x=input[key];if(key.endsWith('Cents')){if(!Number.isSafeInteger(x)||x<0||x>100000000)throw fail(400);value[key]=x;}else if(key==='alcoholFreeConfirmed'||key==='status')value[key]=x;else{if(typeof x!=='string'||x.length>(key==='composition'?600:120)||/[\u0000-\u001f]/.test(x))throw fail(400);value[key]=x.trim();}}
 const d=value.dueDate;if(d&&(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d))throw fail(400);
 if(typeof input.reason!=='string'||input.reason.trim().length<3||input.reason.length>240)throw fail(400);
 return {value,reason:input.reason.trim(),digest:createHash('sha256').update(JSON.stringify([value,input.reason.trim(),input.revision])).digest('hex')};
}
export function authorizedGrant(data,uid){
 if(!data||data.uid!==uid||data.active!==true||!Array.isArray(data.campaigns)||!data.campaigns.length||data.campaigns.length>20||data.campaigns.some(s=>!identifier(s.tenantId)||!identifier(s.campaignId)))throw fail(403);return data.campaigns;
}
function campaign(snapshot,scope){if(!snapshot.exists)throw fail(403);const record=JSON.parse(snapshot.data().payload),state=record.ledger.state;if(state.config.tenantId!==scope.tenantId||state.config.campaignId!==scope.campaignId)throw fail(403);return state;}
function tasks(state,scope){return Object.values(state.tasks).map(task=>{const e=state.entitlements[task.entitlementId];if(!e)throw fail(409);return {id:eventId(scope,'fulfillment',e.id),entitlement:e};});}
function project(state,scope,task,stored,teamIdentity){
 const value=stored??defaults(),e=task.entitlement,total=value.purchaseCents+value.packagingCents+value.transportCents;
 return {id:task.id,tenantId:scope.tenantId,campaignId:scope.campaignId,client:collectiveIdentity(state).organizationName,team:teamIdentity?.teamName??demoTeamIdentity(e.teamId).teamName,title:catalog[e.milestoneId]?.title??'Attention acquise',earnedOn:e.earnedOn,allocatedCents:e.budgetCents,...Object.fromEntries(editable.map(k=>[k,value[k]])),revision:value.revision,resumeStatus:value.resumeStatus??null,totalCostCents:total,marginCents:e.budgetCents-total,updatedAt:value.updatedAt??null};
}
export function createGiftOperations(adapter,{now=()=>new Date().toISOString()}={}){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 async function actor(header){try{if(typeof header!=='string'||!header.startsWith('Bearer '))throw fail(403);const t=await auth.verifyIdToken(header.slice(7),true);if(!identifier(t.uid))throw fail(403);return t.uid;}catch{throw fail(403);}}
 const grantRef=uid=>db.doc(`giftOperators/${uid}`),campaignRef=s=>db.doc(`tenants/${s.tenantId}/campaigns/${s.campaignId}`);
 async function check(tx,uid,scope){const grants=authorizedGrant((await tx.get(grantRef(uid))).data(),uid);if(scope&&!grants.some(s=>s.tenantId===scope.tenantId&&s.campaignId===scope.campaignId))throw fail(403);return grants;}
 return {
 async list(header){const uid=await actor(header);return db.runTransaction(async tx=>{const scopes=await check(tx,uid),rows=[],clients=[];
  for(const scope of scopes){const ref=campaignRef(scope),state=campaign(await tx.get(ref),scope);clients.push({tenantId:scope.tenantId,campaignId:scope.campaignId,name:collectiveIdentity(state).organizationName});for(const task of tasks(state,scope)){if(rows.length>=200)throw fail(409);const current=(await tx.get(ref.collection('giftFulfillments').doc(task.id))).data(),identity=(await tx.get(ref.collection('teamIdentities').doc(task.entitlement.teamId))).data();rows.push(project(state,scope,task,current,identity));}}
  return {clients,rows:rows.sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||a.client.localeCompare(b.client)||a.team.localeCompare(b.team)),generatedAt:now()};});},
 async detail(header,scope,id){if(!identifier(scope.tenantId)||!identifier(scope.campaignId)||!/^[a-f0-9]{64}$/.test(id))throw fail(400);const uid=await actor(header);return db.runTransaction(async tx=>{await check(tx,uid,scope);const ref=campaignRef(scope),state=campaign(await tx.get(ref),scope),task=tasks(state,scope).find(t=>t.id===id);if(!task)throw fail(404);const f=ref.collection('giftFulfillments').doc(id),stored=(await tx.get(f)).data(),identity=(await tx.get(ref.collection('teamIdentities').doc(task.entitlement.teamId))).data(),audit=await tx.get(f.collection('audit').orderBy('revision','desc').limit(20));return {row:project(state,scope,task,stored,identity),history:audit.docs.map(d=>{const a=d.data();return {revision:a.revision,at:a.at,actor:a.actor,reason:a.reason,changes:a.changes};})};});},
 async save(header,input){const normalized=normalize(input),uid=await actor(header),scope={tenantId:input.tenantId,campaignId:input.campaignId};return db.runTransaction(async tx=>{await check(tx,uid,scope);const ref=campaignRef(scope),state=campaign(await tx.get(ref),scope),task=tasks(state,scope).find(t=>t.id===input.id);if(!task)throw fail(404);const f=ref.collection('giftFulfillments').doc(task.id),old=(await tx.get(f)).data()??defaults();
  if(old.lastMutationId===input.mutationId){if(old.lastMutationDigest!==normalized.digest)throw fail(409);return {revision:old.revision,alreadyApplied:true};}
  if(old.revision!==input.revision||old.status==='delivered'||old.revision>=1000)throw fail(409);
  const value=normalized.value,total=value.purchaseCents+value.packagingCents+value.transportCents;if(total>task.entitlement.budgetCents)throw fail(422);
  const next=giftStatuses[giftStatuses.indexOf(old.status)+1],allowed=[old.status,...(old.status==='incident'?[old.resumeStatus]:[next,'incident'])];if(!allowed.includes(value.status))throw fail(409);
  if(value.status!=='to-select'&&value.status!=='incident'&&(!value.dueDate||value.dueDate<task.entitlement.earnedOn||!value.owner||!value.composition||!value.supplier||!value.alcoholFreeConfirmed))throw fail(422);
  if(['to-receive','to-compose','ready','to-deliver','delivered'].includes(value.status)&&!value.orderReference)throw fail(422);
  if(value.status==='delivered'&&!value.deliveryReference)throw fail(422);
  const changes=editable.filter(k=>old[k]!==value[k]).map(field=>({field,before:old[field],after:value[field]}));if(!changes.length)throw fail(400);
  const revision=old.revision+1,at=now(),resumeStatus=value.status==='incident'?(old.status==='incident'?old.resumeStatus:old.status):null;
  tx.set(f,{...value,revision,resumeStatus,updatedAt:at,entitlementId:task.entitlement.id,budgetCents:task.entitlement.budgetCents,lastMutationId:input.mutationId,lastMutationDigest:normalized.digest});tx.create(f.collection('audit').doc(String(revision).padStart(6,'0')),{revision,at,actor:uid,reason:normalized.reason,changes});return {revision,alreadyApplied:false};});}
 };
}
