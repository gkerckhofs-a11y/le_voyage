import {createAccessBoundary} from './access.mjs';
import {assertTestAdapter} from './test-environment.mjs';
import {exact} from '../domain/exact.ts';
import {civilDate} from '../domain/calendar.ts';
const fail=status=>Object.assign(new Error('KPI collection unavailable'),{status});
const identifier=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
const keys=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.includes(k));
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
/** Isolated collection of aggregate values. No conversion into scores or distance. */
export function createKpiCollection(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 async function operate(header,scope,periodId,fn){
  if(!identifier(periodId))throw fail(400);
  const checkMember=member=>{if(!Array.isArray(member?.kpiAssignments)||!member.kpiAssignments.some(a=>a.campaignId===scope.campaignId&&a.teamId===scope.teamId))throw fail(403);return member;};
  const memberRef=uid=>db.doc(`tenants/${scope.tenantId}/members/${uid}`);
  const authorize=createAccessBoundary({verifyIdToken:(t,r)=>auth.verifyIdToken(t,r),readMembership:async({uid})=>checkMember((await memberRef(uid).get()).data())});
  const viewer=await authorize(header,scope);
  return db.runTransaction(async tx=>{
   const recheck=createAccessBoundary({verifyIdToken:async()=>({uid:viewer.viewerId}),readMembership:async()=>checkMember((await tx.get(memberRef(viewer.viewerId))).data())});await recheck('Bearer verified',scope);
   const campaign=db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),snapshot=await tx.get(campaign);if(!snapshot.exists)throw fail(403);
   const config=JSON.parse(snapshot.data().payload).ledger.state.config;
   if(config.tenantId!==scope.tenantId||config.campaignId!==scope.campaignId||!config.teams.some(team=>team.id===scope.teamId))throw fail(403);
   if(config.mode!=='kpi')throw fail(409);
   // Period and definitions are provisioned by trusted server operations, never by this request.
   const periodRef=campaign.collection('kpiPeriods').doc(periodId),period=(await tx.get(periodRef)).data();
   try{
    if(!period||period.teamId!==scope.teamId||!['open','frozen'].includes(period.state)||!text(period.definitionVersion,160)||!Array.isArray(period.definitions)||period.definitions.length!==2)throw Error();
    if(civilDate(period.start)>=civilDate(period.endExclusive))throw Error();
    for(const d of period.definitions)if(!keys(d,['id','label','unit'])||!identifier(d.id)||!text(d.label,500)||!text(d.unit,100))throw Error();
    if(period.definitions[0].id===period.definitions[1].id)throw Error();
   }catch{throw fail(409);}
   const ref=periodRef.collection('batches').doc('aggregate'),old=(await tx.get(ref)).data();
   return fn({tx,ref,period,old,uid:viewer.viewerId});
  });
 }
 const project=(period,old)=>({period:{start:period.start,endExclusive:period.endExclusive,state:period.state,definitionVersion:period.definitionVersion,definitions:period.definitions.map(d=>({id:d.id,label:d.label,unit:d.unit}))},revision:old?.revision??0,batchDefinition:old?{version:old.definitionVersion,definitions:old.definitions,start:old.start,endExclusive:old.endExclusive}:null,history:(old?.history??[]).map(r=>({revision:r.revision,values:r.values,source:r.source,reason:r.reason,author:r.author,recordedAt:r.recordedAt,validation:r.validation})),scoringApplied:false});
 return {
  read:(h,s,periodId)=>operate(h,s,periodId,({period,old})=>project(period,old)),
  submit:async(h,s,command)=>{
   if(!keys(command,['periodId','revision','mutationId','values','source','reason'])||!Number.isSafeInteger(command.revision)||command.revision<0||!identifier(command.mutationId)||!text(command.source,500)||typeof command.reason!=='string'||command.reason.length>1000||!Array.isArray(command.values)||command.values.length!==2)throw fail(400);
   for(const v of command.values){if(!keys(v,['id','value'])||!identifier(v.id))throw fail(400);try{exact(v.value);}catch{throw fail(400);}}
   return operate(h,s,command.periodId,({tx,ref,period,old,uid})=>{
    if(command.values.some((v,i)=>v.id!==period.definitions[i].id))throw fail(400);
    const content={values:command.values.map(v=>({id:v.id,value:v.value})),source:command.source.trim(),reason:command.reason.trim()};
    const duplicate=old?.history.find(r=>r.mutationId===command.mutationId);
    if(duplicate){if(duplicate.author!==uid||duplicate.revision!==command.revision+1||JSON.stringify(duplicate.content)!==JSON.stringify(content))throw fail(409);return project(period,old);}
    if(period.state!=='open'||(old?.revision??0)!==command.revision)throw fail(409);
    if(old&&(old.definitionVersion!==period.definitionVersion||JSON.stringify(old.definitions)!==JSON.stringify(period.definitions)||old.start!==period.start||old.endExclusive!==period.endExclusive||!content.reason))throw fail(409);
    // Bounded isolated prototype, not a commercial quota. Refuse rather than truncate history.
    if((old?.history.length??0)>=100)throw fail(409);
    const revision=command.revision+1,entry={...content,content,revision,mutationId:command.mutationId,author:uid,validation:'pending',recordedAt:new Date().toISOString()};
    const next={definitionVersion:period.definitionVersion,definitions:structuredClone(period.definitions),start:period.start,endExclusive:period.endExclusive,revision,history:[...(old?.history??[]),entry]};tx.set(ref,next);return project(period,next);
   });
  },
 };
}
