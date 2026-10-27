import {createAccessBoundary} from './access.mjs';
import {assertEmulators} from './firebase-emulator.mjs';
const fail=status=>Object.assign(new Error('Questionnaire unavailable'),{status});
const questions=['Cette semaine, j’ai contribué à l’entraide dans mon équipe.','Cette semaine, j’ai contribué à la qualité de notre service.','Cette semaine, j’ai pris des initiatives utiles.'];
export function createWeeklyQuestionnaire(adapter){
 assertEmulators();const {auth,db}=adapter;
 async function operate(header,scope,action,input={}){
  const authorize=createAccessBoundary({verifyIdToken:(t,r)=>auth.verifyIdToken(t,r),readMembership:async({tenantId,uid})=>(await db.doc(`tenants/${tenantId}/members/${uid}`).get()).data()});const viewer=await authorize(header,scope);
  return db.runTransaction(async tx=>{
   let member;const checked=createAccessBoundary({verifyIdToken:async()=>({uid:viewer.viewerId}),readMembership:async()=>member=(await tx.get(db.doc(`tenants/${scope.tenantId}/members/${viewer.viewerId}`))).data()});await checked('Bearer verified',scope);
   const campaignRef=db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),campaign=await tx.get(campaignRef);if(!campaign.exists)throw fail(403);const campaignData=campaign.data(),record=JSON.parse(campaignData.payload),state=record.ledger.state;
   if(state.config.tenantId!==scope.tenantId||state.config.campaignId!==scope.campaignId)throw fail(403);
   const team=state.config.teams.find(t=>t.id===scope.teamId);if(!team)throw fail(403);
   const week=state.config.weeks.find(w=>w.active&&team.eligibleWeekIds.includes(w.id)&&!state.outcomes[JSON.stringify([team.id,w.id])]);
   const canOpen=member.canManageTeam===true;
   if(!week)return {status:'finished',canOpen:false};
   const ref=campaignRef.collection('questionnaires').doc(scope.teamId+'_'+week.id),snapshot=await tx.get(ref);let survey=snapshot.data();
   if(action==='open'){
    if(!canOpen)throw fail(403);
    if(!survey){
     const members=await tx.get(db.collection(`tenants/${scope.tenantId}/members`).where('active','==',true).limit(101));if(members.size>100)throw fail(409);
     const eligible=members.docs.map(d=>d.data()).filter(m=>m.tenantId===scope.tenantId&&Array.isArray(m.assignments)&&m.assignments.some(a=>a.campaignId===scope.campaignId&&a.teamId===scope.teamId)).map(m=>m.uid);
     if(!eligible.length||new Set(eligible).size!==eligible.length)throw fail(409);
     survey={teamId:scope.teamId,weekId:week.id,status:'open',eligible,answers:{},absent:[],openedAt:Date.now(),questions};
     tx.set(ref,survey);tx.update(campaignRef,{collectionMode:'weekly-questionnaire'});
    }
   }
   if(!survey&&action!=='read')throw fail(409);
   if(!survey)return {status:'not-open',canOpen,week:{id:week.id,start:week.start,endExclusive:week.endExclusive}};
   const eligible=survey.eligible.includes(viewer.viewerId),response=survey.answers[viewer.viewerId]??null;
   if(action==='answer'||action==='absence'){
    if(!eligible||survey.status!=='open')throw fail(403);
    if(input.weekId!==week.id)throw fail(409);
    if(action==='answer'){
     if(!Array.isArray(input.answers)||input.answers.length!==3||input.answers.some(v=>!Number.isInteger(v)||v<1||v>5))throw fail(400);
     if(survey.absent.includes(viewer.viewerId))throw fail(409);
     if(response&&JSON.stringify(response)!==JSON.stringify(input.answers))throw fail(409);
     if(!response){survey.answers[viewer.viewerId]=input.answers;tx.set(ref,survey);}
    }else{
     if(typeof input.absent!=='boolean')throw fail(400);if(response)throw fail(409);
     survey.absent=survey.absent.filter(uid=>uid!==viewer.viewerId);if(input.absent)survey.absent.push(viewer.viewerId);tx.set(ref,survey);
    }
   }
   // Only the caller's response. No roster, counts, scores or answers of colleagues.
   return {status:survey.status,canOpen,eligible,week:{id:week.id,start:week.start,endExclusive:week.endExclusive},questions:survey.questions,myAnswers:survey.answers[viewer.viewerId]??null,absent:survey.absent.includes(viewer.viewerId)};
  });
 }
 return {read:(h,s)=>operate(h,s,'read'),open:(h,s)=>operate(h,s,'open'),answer:(h,s,i)=>operate(h,s,'answer',i),absence:(h,s,i)=>operate(h,s,'absence',i)};
}
