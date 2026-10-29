import {createAccessBoundary} from './access.mjs';
import {assertTestAdapter} from './test-environment.mjs';
const fail=status=>Object.assign(new Error('KPI access management unavailable'),{status});
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
const has=(assignments,s)=>Array.isArray(assignments)&&assignments.some(a=>a.campaignId===s.campaignId&&a.teamId===s.teamId);
/** Explicit team-scoped administration. Never grants management, membership or scoring rights. */
export function createKpiAccess(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 async function operate(header,scope,fn){
  const check=m=>{if(!has(m?.kpiManagementAssignments,scope))throw fail(403);return m;};
  const members=db.collection(`tenants/${scope.tenantId}/members`);
  const authorize=createAccessBoundary({verifyIdToken:(t,r)=>auth.verifyIdToken(t,r),readMembership:async({uid})=>check((await members.doc(uid).get()).data())});
  const viewer=await authorize(header,scope);
  return db.runTransaction(async tx=>{
   const again=createAccessBoundary({verifyIdToken:async()=>({uid:viewer.viewerId}),readMembership:async()=>check((await tx.get(members.doc(viewer.viewerId))).data())});await again('Bearer verified',scope);
   const campaign=db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),snapshot=await tx.get(campaign);if(!snapshot.exists)throw fail(403);const config=JSON.parse(snapshot.data().payload).ledger.state.config;
   if(config.tenantId!==scope.tenantId||config.campaignId!==scope.campaignId||!config.teams.some(t=>t.id===scope.teamId))throw fail(403);if(config.mode!=='kpi')throw fail(409);
   const candidates=await tx.get(members.where('active','==',true).limit(201));if(candidates.size>200)throw fail(409);
   const eligible=candidates.docs.filter(d=>d.data().uid===d.id&&d.data().tenantId===scope.tenantId&&has(d.data().assignments,scope));
   const ref=campaign.collection('kpiAccess').doc(scope.teamId),old=(await tx.get(ref)).data()??{revision:0,history:[]};
   const view=()=>({revision:old.revision,members:eligible.map(d=>({uid:d.id,enabled:has(d.data().kpiAssignments,scope)})).sort((a,b)=>a.uid.localeCompare(b.uid)),history:old.history.map(e=>({revision:e.revision,uid:e.uid,enabled:e.enabled,reason:e.reason,author:e.author,recordedAt:e.recordedAt}))});
   return fn({tx,members,eligible,ref,old,viewer,view});
  });
 }
 return {
  read:(h,s)=>operate(h,s,({view})=>view()),
  save:async(h,s,input)=>{
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['uid','enabled','revision','mutationId','reason'].includes(k))||!id(input.uid)||!id(input.mutationId)||typeof input.enabled!=='boolean'||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>1000)throw fail(400);
   return operate(h,s,({tx,eligible,ref,old,viewer})=>{
    const previous=old.history.find(e=>e.mutationId===input.mutationId);
    if(previous){if(previous.author!==viewer.viewerId||previous.revision!==input.revision+1||previous.uid!==input.uid||previous.enabled!==input.enabled||previous.reason!==input.reason.trim())throw fail(409);return {revision:old.revision,applied:false};}
    if(old.revision!==input.revision||old.history.length>=100)throw fail(409);
    const target=eligible.find(d=>d.id===input.uid);if(!target)throw fail(403);
    const existing=target.data().kpiAssignments??[];if(!Array.isArray(existing))throw fail(409);
    const assignments=existing.filter(a=>a.campaignId!==s.campaignId||a.teamId!==s.teamId);if(input.enabled)assignments.push({campaignId:s.campaignId,teamId:s.teamId});
    const revision=old.revision+1,event={revision,uid:input.uid,enabled:input.enabled,reason:input.reason.trim(),mutationId:input.mutationId,author:viewer.viewerId,recordedAt:new Date().toISOString()};
    tx.update(target.ref,{kpiAssignments:assignments});tx.set(ref,{revision,history:[...old.history,event]});return {revision,applied:true};
   });
  },
 };
}
