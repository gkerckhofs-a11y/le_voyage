import {createHash} from 'node:crypto';
import {createAccessBoundary} from './access.mjs';
import {assertTestAdapter} from './test-environment.mjs';
import {civilDate} from '../domain/calendar.ts';
const fail=status=>Object.assign(new Error('Client budget unavailable'),{status});
const keys=['basis','asOf','reference','allocatedCents','committedCents','consumedCents'];
function values(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join()!==[...keys].sort().join())throw fail(400);
 if(!['HT','TTC'].includes(input.basis)||typeof input.reference!=='string'||!input.reference.trim()||input.reference.length>160||/[\x00-\x1f\x7f]/.test(input.reference))throw fail(400);
 try{civilDate(input.asOf);}catch{throw fail(400);}
 for(const k of ['allocatedCents','committedCents','consumedCents'])if(!Number.isSafeInteger(input[k])||input[k]<0||input[k]>100000000)throw fail(400);
 if(input.consumedCents>input.committedCents||input.committedCents>input.allocatedCents)throw fail(400);
 return Object.fromEntries(keys.map(k=>[k,k==='reference'?input[k].trim():input[k]]));
}
/** Client amounts only, explicitly declared by the organizer. Never inferred from purchase costs. */
export function projectClientBudget(record,scope){
 if(!record)return {status:'unavailable'};
 if(record.tenantId!==scope.tenantId||record.campaignId!==scope.campaignId||record.schemaVersion!==1||!Number.isSafeInteger(record.revision)||record.revision<1)throw fail(409);
 let budget;try{budget=values(record.budget);}catch{throw fail(409);}
 return {status:'published',revision:record.revision,currency:'EUR',source:'organizer-declared-client-budget',...budget,
  remainingCents:budget.allocatedCents-budget.committedCents};
}
export function createClientBudget(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 async function operate(header,scope,fn){
  if(!scope)throw fail(403);
  const check=m=>{if(m?.canPlanCampaign!==true||!Array.isArray(m.organizerCampaigns)||!m.organizerCampaigns.includes(scope.campaignId))throw fail(403);return m;};
  const membership=uid=>db.doc(`tenants/${scope.tenantId}/members/${uid}`);
  const authorize=createAccessBoundary({verifyIdToken:(t,r)=>auth.verifyIdToken(t,r),readMembership:async({uid})=>check((await membership(uid).get()).data())});
  const actor=await authorize(header,scope);
  return db.runTransaction(async tx=>{
   await createAccessBoundary({verifyIdToken:async()=>({uid:actor.viewerId}),readMembership:async()=>check((await tx.get(membership(actor.viewerId))).data())})('Bearer verified',scope);
   const campaign=db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),snap=await tx.get(campaign);
   if(!snap.exists)throw fail(403);const state=JSON.parse(snap.data().payload).ledger.state;
   if(state.config.tenantId!==scope.tenantId||state.config.campaignId!==scope.campaignId||!state.config.teams.some(t=>t.id===scope.teamId))throw fail(403);
   const ref=campaign.collection('clientBudgets').doc('current'),old=(await tx.get(ref)).data();
   return fn({tx,ref,old,actor});
  });
 }
 return {
  read:(header,scope)=>operate(header,scope,({old})=>projectClientBudget(old,scope)),
  publish:(header,scope,input)=>operate(header,scope,async({tx,ref,old,actor})=>{
   if(!input||Object.keys(input).sort().join()!==['budget','confirmed','mutationId','reason','revision'].join()||input.confirmed!==true||!Number.isSafeInteger(input.revision)||input.revision<0||input.revision>=10000||typeof input.mutationId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.mutationId)||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>500||/[\x00-\x1f\x7f]/.test(input.reason))throw fail(400);
   const budget=values(input.budget),reason=input.reason.trim();
   const digest=createHash('sha256').update(JSON.stringify({uid:actor.viewerId,revision:input.revision,budget,reason})).digest('hex');
   const audit=ref.collection('publications').doc(input.mutationId),prior=(await tx.get(audit)).data();
   if(prior){if(prior.digest!==digest)throw fail(409);return projectClientBudget(prior.record,scope);}
   projectClientBudget(old,scope);
   if((old?.revision??0)!==input.revision)throw fail(409);
   const record={schemaVersion:1,tenantId:scope.tenantId,campaignId:scope.campaignId,revision:input.revision+1,budget,publishedBy:actor.viewerId,publishedAt:new Date().toISOString()};
   tx.create(audit,{digest,reason,record});tx.set(ref,record);return projectClientBudget(record,scope);
  }),
 };
}
