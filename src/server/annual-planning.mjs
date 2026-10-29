import {createAccessBoundary} from './access.mjs';
import {assertTestAdapter} from './test-environment.mjs';
import {previewAnnualPlan} from '../application/annual-plan.ts';
const fail=status=>Object.assign(new Error('Annual planning unavailable'),{status});
export function createAnnualPlanning(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 async function operate(header,scope,fn){
  const memberRef=uid=>db.doc(`tenants/${scope.tenantId}/members/${uid}`);
  const checkMember=m=>{if(m?.canPlanCampaign!==true)throw fail(403);return m;};
  const authorize=createAccessBoundary({verifyIdToken:(t,r)=>auth.verifyIdToken(t,r),readMembership:async({uid})=>checkMember((await memberRef(uid).get()).data())});
  const viewer=await authorize(header,scope);
  return db.runTransaction(async tx=>{
   const recheck=createAccessBoundary({verifyIdToken:async()=>({uid:viewer.viewerId}),readMembership:async()=>checkMember((await tx.get(memberRef(viewer.viewerId))).data())});await recheck('Bearer verified',scope);
   const campaign=db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),snap=await tx.get(campaign);if(!snap.exists)throw fail(403);
   const state=JSON.parse(snap.data().payload).ledger.state;if(state.config.tenantId!==scope.tenantId||state.config.campaignId!==scope.campaignId)throw fail(403);
   const ref=campaign.collection('annualDrafts').doc('next'),old=(await tx.get(ref)).data();return fn({tx,ref,old,viewer});
  });
 }
 const project=d=>d?{revision:d.revision,input:d.input,preview:previewAnnualPlan(d.input)}:{revision:0,input:null,preview:null};
 const validate=input=>{try{return previewAnnualPlan(input);}catch{throw fail(400);}};
 return {
  read:(header,scope)=>operate(header,scope,({old})=>project(old)),
  preview:(header,scope,input)=>operate(header,scope,()=>validate(input)),
  save:(header,scope,{input,revision,mutationId})=>operate(header,scope,({tx,ref,old,viewer})=>{
   validate(input);if(!Number.isSafeInteger(revision)||revision<0||typeof mutationId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(mutationId))throw fail(400);
   if(old?.mutationId===mutationId){if(JSON.stringify(old.input)!==JSON.stringify(input))throw fail(409);return project(old);}
   if((old?.revision??0)!==revision)throw fail(409);
   const next={revision:revision+1,input:structuredClone(input),mutationId,updatedBy:viewer.viewerId,updatedAt:new Date().toISOString()};tx.set(ref,next);return project(next);
  }),
 };
}
