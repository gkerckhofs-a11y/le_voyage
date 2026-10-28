import {createGiftReservations,acquiredAnticipatedOrder,anticipatedOrderDigest,attachedAnticipatedOrder} from './gift-reservations.mjs';
import {createGiftProposals,acquiredProposal} from './gift-proposals.mjs';
import {anticipatedComposition} from '../operations/anticipated-composition.mjs';
import {preferredCategories} from './beneficiary-data.mjs';
import {forecastGift,forecastPolicy} from '../operations/gift-forecast.mjs';
import {campaignDate} from '../domain/rolling-calendar.ts';
import {costKeys,effectiveGiftCosts,normalizeAmendment,planAmendment} from './gift-amendments.mjs';
import {normalizeCatalogSelection,resolveCatalogLines,selectionKey} from './catalog-lines.mjs';
import {beneficiaryPreferences,preferencesReady} from './beneficiary-data.mjs';
import {createHash} from 'node:crypto';
import {assertTestAdapter} from './test-environment.mjs';
import {eventId} from '../application/events.ts';
import {catalog,demoTeamIdentity} from './demo-service.mjs';
import {collectiveIdentity} from '../../scripts/demo-collective.mjs';
const fail=status=>Object.assign(new Error('Gift operations unavailable'),{status});
const identifier=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
export const giftStatuses=['to-select','to-order','to-receive','to-compose','ready','to-deliver','delivered','incident'];
export const confirmedFields=['composition','supplier','orderReference','purchaseCents','packagingCents','transportCents','alcoholFreeConfirmed'];
const financiallyLocked=r=>!!r?.confirmation||['to-receive','to-compose','ready','to-deliver','delivered'].includes(r?.status==='incident'?r.resumeStatus:r?.status);
const editable=['dueDate','owner','composition','supplier','orderReference','deliveryReference','purchaseCents','packagingCents','transportCents','alcoholFreeConfirmed','status'];
const defaults=()=>({dueDate:'',owner:'',composition:'',supplier:'',orderReference:'',deliveryReference:'',purchaseCents:0,packagingCents:0,transportCents:0,alcoholFreeConfirmed:false,status:'to-select',revision:0,resumeStatus:null});
function normalize(input){
 if(!input||Object.keys(input).filter(k=>k!=='catalogSelection').sort().join(',')!==[...editable,'revision','mutationId','reason','tenantId','campaignId','id'].sort().join(','))throw fail(400);
 if(!identifier(input.tenantId)||!identifier(input.campaignId)||!/^[a-f0-9]{64}$/.test(input.id)||!Number.isSafeInteger(input.revision)||input.revision<0||!(/^[a-f0-9-]{36}$/).test(input.mutationId)||!giftStatuses.includes(input.status)||typeof input.alcoholFreeConfirmed!=='boolean')throw fail(400);
 const value={};for(const key of editable){const x=input[key];if(key.endsWith('Cents')){if(!Number.isSafeInteger(x)||x<0||x>100000000)throw fail(400);value[key]=x;}else if(key==='alcoholFreeConfirmed'||key==='status')value[key]=x;else{if(typeof x!=='string'||x.length>(key==='composition'?600:120)||/[\u0000-\u001f]/.test(x))throw fail(400);value[key]=x.trim();}}
 const d=value.dueDate;if(d&&(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d))throw fail(400);
 if(typeof input.reason!=='string'||input.reason.trim().length<3||input.reason.length>240)throw fail(400);
 const hasSelection=Object.hasOwn(input,'catalogSelection'),selection=hasSelection?normalizeCatalogSelection(input.catalogSelection):undefined;
 return {value,selection,hasSelection,reason:input.reason.trim(),digest:createHash('sha256').update(JSON.stringify([value,input.reason.trim(),input.revision,...(hasSelection?[selection]:[])])).digest('hex')};
}
export function authorizedGrant(data,uid){
 if(!data||data.uid!==uid||data.active!==true||!Array.isArray(data.campaigns)||!data.campaigns.length||data.campaigns.length>20||data.campaigns.some(s=>!identifier(s.tenantId)||!identifier(s.campaignId)))throw fail(403);return data.campaigns;
}
function campaign(snapshot,scope){if(!snapshot.exists)throw fail(403);const record=JSON.parse(snapshot.data().payload),state=record.ledger.state;if(state.config.tenantId!==scope.tenantId||state.config.campaignId!==scope.campaignId)throw fail(403);return state;}
function tasks(state,scope){return Object.values(state.tasks).map(task=>{const e=state.entitlements[task.entitlementId];if(!e)throw fail(409);return {id:eventId(scope,'fulfillment',e.id),entitlement:e};});}
function project(state,scope,task,stored,teamIdentity){
 const value=stored??defaults(),e=task.entitlement,total=effectiveGiftCosts(value).totalCostCents,allocatedCents=value.confirmation?.allocatedCents??e.budgetCents;
 return {id:task.id,tenantId:scope.tenantId,campaignId:scope.campaignId,client:collectiveIdentity(state).organizationName,team:teamIdentity?.teamName??demoTeamIdentity(e.teamId).teamName,title:catalog[e.milestoneId]?.title??'Attention acquise',earnedOn:e.earnedOn,allocatedCents,financialLocked:financiallyLocked(value),financialAdjustment:value.financialAdjustment??null,effectiveCosts:effectiveGiftCosts(value),confirmation:value.confirmation??null,catalogSelection:value.catalogSelection??null,catalogLines:value.catalogLines??[],...Object.fromEntries(editable.map(k=>[k,value[k]])),revision:value.revision,resumeStatus:value.resumeStatus??null,totalCostCents:total,marginCents:allocatedCents-total,updatedAt:value.updatedAt??null};
}
export function createGiftOperations(adapter,{now=()=>new Date().toISOString(),catalogDocument='supplierCatalog/main'}={}){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 async function actor(header){try{if(typeof header!=='string'||!header.startsWith('Bearer '))throw fail(403);const t=await auth.verifyIdToken(header.slice(7),true);if(!identifier(t.uid))throw fail(403);return t.uid;}catch{throw fail(403);}}
 const grantRef=uid=>db.doc(`giftOperators/${uid}`),campaignRef=s=>db.doc(`tenants/${s.tenantId}/campaigns/${s.campaignId}`);
 async function check(tx,uid,scope){const grants=authorizedGrant((await tx.get(grantRef(uid))).data(),uid);if(scope&&!grants.some(s=>s.tenantId===scope.tenantId&&s.campaignId===scope.campaignId))throw fail(403);return grants;}
 async function buildAnticipation(tx,input){const ref=campaignRef(input),state=campaign(await tx.get(ref),input);if(!state.config.teams.some(t=>t.id===input.teamId))throw fail(404);const asOf=campaignDate(now(),state.config.calendar?.timeZone??'Europe/Brussels'),forecast=forecastGift(state,input.teamId,asOf);if(forecast.status!=='estimated'||forecast.milestoneNumber!==input.milestoneNumber)throw fail(409);
   const members=await tx.get(db.collection(`tenants/${input.tenantId}/members`).limit(101));if(members.size>100)throw fail(409);const people=[];
   for(const d of members.docs){const m=d.data();if(m.uid!==d.id||m.tenantId!==input.tenantId||m.active!==true||m.participationEnabled===false||!Array.isArray(m.assignments)||!m.assignments.some(a=>a.campaignId===input.campaignId&&a.teamId===input.teamId))continue;const p=(await tx.get(db.doc(`tenants/${input.tenantId}/giftPreferences/${d.id}`))).data();if(p?.value?.privateContactRequested)throw fail(422);people.push({uid:d.id,revision:p?.revision??0,value:p?.value??null,choices:p?.value?.choices??[],hasPreferences:!!p});}
   const chosen=preferredCategories(people);if(!chosen.length)throw fail(422);const catalog=(await tx.get(db.doc(catalogDocument))).data();if(!catalog)throw fail(503);
   const proposal=anticipatedComposition(catalog,{allocatedCents:forecast.allocatedCents,packagingCents:input.packagingCents,transportCents:input.transportCents,asOf,dueDate:forecast.estimatedDate,categories:chosen});
   const snapshot={...proposal,milestoneId:state.config.giftMilestones[forecast.milestoneNumber-1].id,asOf,dueDate:forecast.estimatedDate,milestoneNumber:forecast.milestoneNumber,allocatedCents:forecast.allocatedCents,source:people.some(p=>p.hasPreferences)?'current-team-preferences':'generic',packagingCents:input.packagingCents,transportCents:input.transportCents};
   return {...snapshot,fingerprint:createHash('sha256').update(JSON.stringify({snapshot,people,threshold:forecast.thresholdKm,milestoneId:state.config.giftMilestones[forecast.milestoneNumber-1].id,teamId:input.teamId,scope:[input.tenantId,input.campaignId]})).digest('hex')};
 }

 return {
 ...createGiftProposals({db,actor,check,campaignRef,build:buildAnticipation,now}),
 ...createGiftReservations({db,actor,check,campaignRef,build:buildAnticipation,now,catalogDocument}),
 async list(header){const uid=await actor(header);return db.runTransaction(async tx=>{const scopes=await check(tx,uid),rows=[],clients=[];
  for(const scope of scopes){const ref=campaignRef(scope),state=campaign(await tx.get(ref),scope);clients.push({tenantId:scope.tenantId,campaignId:scope.campaignId,name:collectiveIdentity(state).organizationName});for(const task of tasks(state,scope)){if(rows.length>=200)throw fail(409);const current=(await tx.get(ref.collection('giftFulfillments').doc(task.id))).data(),identity=(await tx.get(ref.collection('teamIdentities').doc(task.entitlement.teamId))).data();rows.push(project(state,scope,task,current,identity));}}
  return {clients,rows:rows.sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||a.client.localeCompare(b.client)||a.team.localeCompare(b.team)),generatedAt:now()};});},
 async anticipate(header,input){
  const keys=['tenantId','campaignId','teamId','milestoneNumber','packagingCents','transportCents'];if(!input||Object.keys(input).sort().join(',')!==keys.sort().join(',')||!['tenantId','campaignId','teamId'].every(k=>identifier(input[k]))||!Number.isSafeInteger(input.milestoneNumber)||input.milestoneNumber<1||['packagingCents','transportCents'].some(k=>!Number.isSafeInteger(input[k])||input[k]<0||input[k]>100000000))throw fail(400);
  const uid=await actor(header);return db.runTransaction(async tx=>{await check(tx,uid,input);return buildAnticipation(tx,input);});
 },
 async forecasts(header){const uid=await actor(header);return db.runTransaction(async tx=>{const scopes=await check(tx,uid),rows=[],generatedAt=now();for(const scope of scopes){const ref=campaignRef(scope),state=campaign(await tx.get(ref),scope),asOf=campaignDate(generatedAt,state.config.calendar?.timeZone??'Europe/Brussels');for(const team of state.config.teams){if(rows.length>=200)throw fail(409);const identity=(await tx.get(ref.collection('teamIdentities').doc(team.id))).data();rows.push({...forecastGift(state,team.id,asOf),tenantId:scope.tenantId,campaignId:scope.campaignId,client:collectiveIdentity(state).organizationName,team:identity?.teamName??demoTeamIdentity(team.id).teamName});}}return {policy:forecastPolicy,generatedAt,rows};});},
 async detail(header,scope,id){if(!identifier(scope.tenantId)||!identifier(scope.campaignId)||!/^[a-f0-9]{64}$/.test(id))throw fail(400);const uid=await actor(header);return db.runTransaction(async tx=>{await check(tx,uid,scope);const ref=campaignRef(scope),state=campaign(await tx.get(ref),scope),task=tasks(state,scope).find(t=>t.id===id);if(!task)throw fail(404);const f=ref.collection('giftFulfillments').doc(id),stored=(await tx.get(f)).data(),identity=(await tx.get(ref.collection('teamIdentities').doc(task.entitlement.teamId))).data(),audit=await tx.get(f.collection('audit').orderBy('revision','desc').limit(20));const amendments=stored?.financialAdjustment?.count?(await tx.get(f.collection('amendments').orderBy('revision','desc').limit(20))).docs.map(d=>{const {digest,...entry}=d.data();return entry;}):[];const anticipation=await acquiredProposal(tx,ref,state,task.entitlement),anticipatedOrder=await acquiredAnticipatedOrder(tx,ref,task.entitlement);return {row:project(state,scope,task,stored,identity),anticipatedOrder:anticipatedOrder?{...anticipatedOrder,attached:attachedAnticipatedOrder(anticipatedOrder,stored,id)}:null,anticipation,amendments,history:audit.docs.map(d=>{const a=d.data();return {revision:a.revision,at:a.at,actor:a.actor,reason:a.reason,changes:a.changes};})};});},
 async attachAnticipatedOrder(header,input){
  const keys=['tenantId','campaignId','id','revision','reservationRevision','mutationId','reason','owner','dueDate','compositionAccepted'];
  if(!input||Object.keys(input).sort().join(',')!==keys.sort().join(',')||!identifier(input.tenantId)||!identifier(input.campaignId)||typeof input.id!=='string'||!/^[a-f0-9]{64}$/.test(input.id)||input.revision!==0||!Number.isSafeInteger(input.reservationRevision)||input.reservationRevision<1||input.reservationRevision>=1000||input.compositionAccepted!==true||typeof input.mutationId!=='string'||!/^[a-f0-9-]{36}$/.test(input.mutationId))throw fail(400);
  for(const [key,max] of [['reason',240],['owner',120]])if(typeof input[key]!=='string'||input[key].trim().length<(key==='reason'?3:1)||input[key].length>max||/[\u0000-\u001f]/.test(input[key]))throw fail(400);
  if(typeof input.dueDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)||!Number.isFinite(Date.parse(input.dueDate))||new Date(input.dueDate).toISOString().slice(0,10)!==input.dueDate)throw fail(400);
  const uid=await actor(header),digest=createHash('sha256').update(JSON.stringify([uid,Object.keys(input).sort().map(k=>[k,input[k]])])).digest('hex');
  return db.runTransaction(async tx=>{await check(tx,uid,input);const ref=campaignRef(input),state=campaign(await tx.get(ref),input),task=tasks(state,input).find(t=>t.id===input.id);if(!task)throw fail(404);
   const f=ref.collection('giftFulfillments').doc(input.id),old=await tx.get(f),auditRef=f.collection('attachments').doc(input.mutationId),prior=(await tx.get(auditRef)).data();if(prior){if(prior.digest!==digest)throw fail(409);return {revision:prior.revision,alreadyApplied:true};}
   const origin=await acquiredAnticipatedOrder(tx,ref,task.entitlement);if(old.exists||!origin||origin.cancellationRequest?.status==='pending'||origin.fulfillmentLink||origin.reservationRevision!==input.reservationRevision)throw fail(409);
   const order=origin.order;if(order.allocatedCents!==task.entitlement.budgetCents||order.totalCostCents>task.entitlement.budgetCents||input.dueDate<task.entitlement.earnedOn)throw fail(422);
   const beneficiaries=await beneficiaryPreferences(tx,db,input,input.id);if(!beneficiaries||beneficiaries.preferencesFrozen||!beneficiaries.people.length||beneficiaries.record.entitlementId!==task.entitlement.id||!preferencesReady(beneficiaries))throw fail(422);
   const at=now(),revision=1,value={...defaults(),status:'to-receive',dueDate:input.dueDate,owner:input.owner.trim(),composition:order.lines.map(l=>`${l.quantity} × ${l.name} [${l.sku}]`).join(' ; '),supplier:[...new Set(order.lines.map(l=>l.supplier))].join(' / '),orderReference:order.reference,purchaseCents:order.purchaseCents,packagingCents:order.packagingCents,transportCents:order.transportCents,alcoholFreeConfirmed:true};
   if(value.composition.length>600||value.supplier.length>120)throw fail(422);
   const confirmation={version:3,source:'anticipated-order',at:order.at,actor:order.actor,revision,allocatedCents:order.allocatedCents,totalCostCents:order.totalCostCents,marginCents:order.allocatedCents-order.totalCostCents,orderSnapshot:order,...Object.fromEntries(confirmedFields.map(k=>[k,value[k]]))},link={reservationId:origin.reservationId,orderDigest:anticipatedOrderDigest(order),attachedAt:at,actor:uid};
   tx.create(f,{...value,revision,confirmation,anticipatedOrderLink:link,updatedAt:at,entitlementId:task.entitlement.id,budgetCents:task.entitlement.budgetCents});
   tx.update(ref.collection('giftReservations').doc(origin.reservationId),{fulfillmentLink:{id:input.id,at,actor:uid},revision:origin.reservationRevision+1,updatedAt:at,actor:uid,reason:input.reason.trim()});
   tx.update(beneficiaries.ref,{preferenceSnapshot:{people:beneficiaries.people,at,actor:uid,fulfillmentRevision:revision,source:'anticipated-order-attachment'}});
   tx.create(ref.collection('giftReservations').doc(origin.reservationId).collection('history').doc('attach-'+input.mutationId),{action:'attach',at,actor:uid,reason:input.reason.trim(),fulfillmentId:input.id,reservationRevision:origin.reservationRevision+1});
   tx.create(auditRef,{digest,revision,at,actor:uid,reason:input.reason.trim(),reservationId:origin.reservationId});tx.create(f.collection('audit').doc('000001'),{revision,at,actor:uid,reason:input.reason.trim(),kind:'anticipated-order-attachment',changes:[{field:'status',before:'to-select',after:'to-receive'},{field:'orderReference',before:'',after:order.reference}]});
   return {revision,alreadyApplied:false};
  });
 },
 async amend(header,input){const normalized=normalizeAmendment(input),uid=await actor(header),scope={tenantId:input.tenantId,campaignId:input.campaignId};return db.runTransaction(async tx=>{await check(tx,uid,scope);const ref=campaignRef(scope),state=campaign(await tx.get(ref),scope),task=tasks(state,scope).find(t=>t.id===input.id);if(!task)throw fail(404);const f=ref.collection('giftFulfillments').doc(task.id),old=(await tx.get(f)).data(),entryRef=f.collection('amendments').doc(input.mutationId),previous=(await tx.get(entryRef)).data();
  if(previous){if(previous.digest!==normalized.digest)throw fail(409);return {revision:previous.revision,alreadyApplied:true};}const linked=await acquiredAnticipatedOrder(tx,ref,task.entitlement);if((linked||old?.anticipatedOrderLink)&&!attachedAnticipatedOrder(linked,old,task.id))throw fail(409);if(!old||old.revision!==input.revision||old.revision>=1000)throw fail(409);
  const {before,after,adjustment}=planAmendment(old,normalized.delta),revision=old.revision+1,at=now(),changes=costKeys.filter(k=>before[k]!==after[k]).map(k=>({field:'effective'+k[0].toUpperCase()+k.slice(1),before:before[k],after:after[k]}));changes.push({field:'amendmentReference',before:null,after:normalized.reference});
  tx.create(entryRef,{revision,at,actor:uid,reference:normalized.reference,reason:normalized.reason,delta:normalized.delta,before,after,confirmationRevision:old.confirmation.revision,digest:normalized.digest});tx.update(f,{financialAdjustment:adjustment,revision,updatedAt:at});tx.create(f.collection('audit').doc(String(revision).padStart(6,'0')),{revision,at,actor:uid,reason:normalized.reason,kind:'financial-amendment',changes});return {revision,alreadyApplied:false};});},
 async save(header,input){const normalized=normalize(input),uid=await actor(header),scope={tenantId:input.tenantId,campaignId:input.campaignId};return db.runTransaction(async tx=>{await check(tx,uid,scope);const ref=campaignRef(scope),state=campaign(await tx.get(ref),scope),task=tasks(state,scope).find(t=>t.id===input.id);if(!task)throw fail(404);const f=ref.collection('giftFulfillments').doc(task.id),old=(await tx.get(f)).data()??defaults();
  if(old.lastMutationId===input.mutationId){if(old.lastMutationDigest!==normalized.digest)throw fail(409);return {revision:old.revision,alreadyApplied:true};}
  const linked=await acquiredAnticipatedOrder(tx,ref,task.entitlement);if(linked?.cancellationRequest?.status==='pending')throw fail(409);if((linked||old?.anticipatedOrderLink)&&!attachedAnticipatedOrder(linked,old,task.id))throw fail(409);
  if(old.revision!==input.revision||old.status==='delivered'||old.revision>=1000)throw fail(409);
  const selection=normalized.hasSelection?normalized.selection:old.catalogSelection??null;
  if(financiallyLocked(old)&&selectionKey(selection)!==selectionKey(old.catalogSelection))throw fail(409);
  const value=normalized.value;let catalogLines=old.catalogLines??[];
  if(!financiallyLocked(old)){
   if(selection){const c=(await tx.get(db.doc(catalogDocument))).data(),asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now())),resolved=resolveCatalogLines(c,selection,{dueDate:value.dueDate,asOf});
    if(['purchaseCents','composition','supplier'].some(k=>value[k]!==resolved[k]))throw fail(409);catalogLines=resolved.lines;
   }else catalogLines=[];
  }
  const total=value.purchaseCents+value.packagingCents+value.transportCents;if(financiallyLocked(old)&&confirmedFields.some(k=>value[k]!==old[k]))throw fail(409);
  const allocatedCents=old.confirmation?.allocatedCents??task.entitlement.budgetCents;if(total>allocatedCents)throw fail(422);
  const next=giftStatuses[giftStatuses.indexOf(old.status)+1],allowed=[old.status,...(old.status==='incident'?[old.resumeStatus]:[next,'incident'])];if(!allowed.includes(value.status))throw fail(409);
  if(value.status!=='to-select'&&value.status!=='incident'&&(!value.dueDate||value.dueDate<task.entitlement.earnedOn||!value.owner||!value.composition||!value.supplier||!value.alcoholFreeConfirmed))throw fail(422);
  if(['to-receive','to-compose','ready','to-deliver','delivered'].includes(value.status)&&!value.orderReference)throw fail(422);
  if(value.status==='delivered'&&!value.deliveryReference)throw fail(422);
  const beneficiaries=!['to-select','incident'].includes(value.status)?await beneficiaryPreferences(tx,db,scope,task.id):null;
  if(beneficiaries&&!preferencesReady(beneficiaries))throw fail(422);
  const changes=editable.filter(k=>old[k]!==value[k]).map(field=>({field,before:old[field],after:value[field]}));if(selectionKey(selection)!==selectionKey(old.catalogSelection))changes.push({field:'catalogSelection',before:old.catalogSelection??null,after:selection});if(!changes.length)throw fail(400);
  const revision=old.revision+1,at=now(),resumeStatus=value.status==='incident'?(old.status==='incident'?old.resumeStatus:old.status):null;
  if(value.status==='to-receive'&&old.status==='to-order'&&beneficiaries&&!beneficiaries.preferencesFrozen)tx.update(beneficiaries.ref,{preferenceSnapshot:{people:beneficiaries.people,at,actor:uid,fulfillmentRevision:revision}});
  const confirmation=old.confirmation??(old.status==='to-order'&&value.status==='to-receive'?{version:selection?2:1,source:selection?'catalog-confirmed':'operator-confirmed',...(selection?{catalog:{revision:selection.revision,lines:catalogLines}}:{}),at,actor:uid,revision,allocatedCents,totalCostCents:total,marginCents:allocatedCents-total,...Object.fromEntries(confirmedFields.map(k=>[k,value[k]]))}:null);
  tx.set(f,{...value,...(old.anticipatedOrderLink?{anticipatedOrderLink:old.anticipatedOrderLink}:{}),...(old.financialAdjustment?{financialAdjustment:old.financialAdjustment}:{}),...(selection?{catalogSelection:selection,catalogLines}:{}),...(confirmation?{confirmation}:{}),revision,resumeStatus,updatedAt:at,entitlementId:task.entitlement.id,budgetCents:allocatedCents,lastMutationId:input.mutationId,lastMutationDigest:normalized.digest});tx.create(f.collection('audit').doc(String(revision).padStart(6,'0')),{revision,at,actor:uid,reason:normalized.reason,changes});return {revision,alreadyApplied:false};});}
 };
}
