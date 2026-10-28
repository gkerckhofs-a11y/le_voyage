import {createAccessBoundary} from './access.mjs';
import {assertTestAdapter} from './test-environment.mjs';
import {civilDate} from '../domain/calendar.ts';
const fail=status=>Object.assign(new Error('KPI period administration unavailable'),{status});
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v),mutation=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(v);
const text=(v,n)=>typeof v==='string'&&!!v.trim()&&v.length<=n;
const fields=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const matches=(xs,s)=>Array.isArray(xs)&&xs.some(x=>x.campaignId===s.campaignId&&x.teamId===s.teamId);
export function createKpiPeriods(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 const view=(id,p)=>({id,start:p.start,endExclusive:p.endExclusive,state:p.state,definitionVersion:p.definitionVersion,definitions:p.definitions.map(d=>({id:d.id,label:d.label,unit:d.unit})),revision:p.revision??0,history:(p.history??[]).map(e=>({action:e.action,revision:e.revision,reason:e.reason,author:e.author,recordedAt:e.recordedAt}))});
 async function operate(header,scope,fn){
  const member=uid=>db.doc(`tenants/${scope.tenantId}/members/${uid}`),check=m=>{if(!matches(m?.kpiPeriodManagementAssignments,scope))throw fail(403);return m;};
  const authorize=createAccessBoundary({verifyIdToken:(t,r)=>auth.verifyIdToken(t,r),readMembership:async({uid})=>check((await member(uid).get()).data())}),viewer=await authorize(header,scope);
  return db.runTransaction(async tx=>{
   const again=createAccessBoundary({verifyIdToken:async()=>({uid:viewer.viewerId}),readMembership:async()=>check((await tx.get(member(viewer.viewerId))).data())});await again('Bearer verified',scope);
   const campaign=db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),snapshot=await tx.get(campaign);if(!snapshot.exists)throw fail(403);const config=JSON.parse(snapshot.data().payload).ledger.state.config;
   if(config.tenantId!==scope.tenantId||config.campaignId!==scope.campaignId||!config.teams.some(t=>t.id===scope.teamId))throw fail(403);if(config.mode!=='kpi')throw fail(409);
   const periods=campaign.collection('kpiPeriods');return fn({tx,periods,uid:viewer.viewerId});
  });
 }
 return {
  list:(h,s)=>operate(h,s,async({tx,periods})=>{const snapshot=await tx.get(periods.where('teamId','==',s.teamId).limit(61));if(snapshot.size>60)throw fail(409);return {periods:snapshot.docs.map(d=>view(d.id,d.data())).sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id))};}),
  create:async(h,s,input)=>{
   if(!fields(input,['mutationId','start','endExclusive','definitionVersion','definitions','reason'])||!mutation(input.mutationId)||!text(input.definitionVersion,160)||!text(input.reason,1000)||!Array.isArray(input.definitions)||input.definitions.length!==2)throw fail(400);
   try{if(civilDate(input.start)>=civilDate(input.endExclusive))throw Error();}catch{throw fail(400);}
   for(const d of input.definitions)if(!fields(d,['id','label','unit'])||!id(d.id)||!text(d.label,500)||!text(d.unit,100))throw fail(400);if(input.definitions[0].id===input.definitions[1].id)throw fail(400);
   const content={start:input.start,endExclusive:input.endExclusive,definitionVersion:input.definitionVersion.trim(),definitions:input.definitions.map(d=>({id:d.id,label:d.label.trim(),unit:d.unit.trim()})),reason:input.reason.trim()};
   return operate(h,s,async({tx,periods,uid})=>{
    const ref=periods.doc('period-'+input.mutationId),old=(await tx.get(ref)).data();
    if(old){if(old.createdBy!==uid||old.teamId!==s.teamId||JSON.stringify(old.creationContent)!==JSON.stringify(content))throw fail(409);return view(ref.id,old);}
    const count=await tx.get(periods.where('teamId','==',s.teamId).limit(60));if(count.size>=60)throw fail(409);
    const recordedAt=new Date().toISOString(),next={teamId:s.teamId,start:content.start,endExclusive:content.endExclusive,definitionVersion:content.definitionVersion,definitions:content.definitions,state:'open',revision:1,createdBy:uid,creationContent:content,history:[{action:'create',revision:1,reason:content.reason,author:uid,recordedAt}]};tx.set(ref,next);return view(ref.id,next);
   });
  },
  freeze:async(h,s,input)=>{
   if(!fields(input,['periodId','revision','mutationId','reason'])||!id(input.periodId)||!mutation(input.mutationId)||!Number.isSafeInteger(input.revision)||input.revision<0||!text(input.reason,1000))throw fail(400);
   return operate(h,s,async({tx,periods,uid})=>{
    const ref=periods.doc(input.periodId),old=(await tx.get(ref)).data();if(!old||old.teamId!==s.teamId)throw fail(403);
    const previous=old.history?.find(e=>e.mutationId===input.mutationId);if(previous){if(previous.author!==uid||previous.action!=='freeze'||previous.revision!==input.revision+1||previous.reason!==input.reason.trim())throw fail(409);return view(ref.id,old);}
    if(old.state!=='open'||(old.revision??0)!==input.revision)throw fail(409);
    const revision=input.revision+1,next={...old,state:'frozen',revision,history:[...(old.history??[]),{action:'freeze',revision,reason:input.reason.trim(),author:uid,recordedAt:new Date().toISOString(),mutationId:input.mutationId}]};tx.set(ref,next);return view(ref.id,next);
   });
  },
 };
}
