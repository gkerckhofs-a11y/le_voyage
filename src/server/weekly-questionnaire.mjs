import {collectionScoring,scoringDescription,autonomousEvaluation} from './scoring-policy.mjs';
import {coordinatedMembership} from './coordination-access.mjs';
import {createAccessBoundary} from './access.mjs';
import {closeWithEvents} from '../application/events.ts';
import {postponeWeek,freezeReception} from '../domain/engine.ts';
import {exact} from '../domain/exact.ts';
import {catalog} from './demo-service.mjs';
import {assertTestAdapter} from './test-environment.mjs';
const fail=status=>Object.assign(new Error('Questionnaire unavailable'),{status});
const questions=['Cette semaine, j’ai contribué à l’entraide dans mon équipe.','Cette semaine, j’ai contribué à la qualité de notre service.','Cette semaine, j’ai pris des initiatives utiles.'];
export function createWeeklyQuestionnaire(adapter,{now=Date.now}={}){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 async function operate(header,scope,action,input={},coordination=false){
  const project=m=>coordination?coordinatedMembership(m,scope):m;
  const authorize=createAccessBoundary({verifyIdToken:(t,r)=>auth.verifyIdToken(t,r),readMembership:async({tenantId,uid})=>project((await db.doc(`tenants/${tenantId}/members/${uid}`).get()).data())});const viewer=await authorize(header,scope);
  return db.runTransaction(async tx=>{
   let member;const checked=createAccessBoundary({verifyIdToken:async()=>({uid:viewer.viewerId}),readMembership:async()=>member=project((await tx.get(db.doc(`tenants/${scope.tenantId}/members/${viewer.viewerId}`))).data())});await checked('Bearer verified',scope);
   const campaignRef=db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),campaign=await tx.get(campaignRef);if(!campaign.exists)throw fail(403);const campaignData=campaign.data(),record=JSON.parse(campaignData.payload),state=record.ledger.state;
   if(state.config.tenantId!==scope.tenantId||state.config.campaignId!==scope.campaignId)throw fail(403);
   const team=state.config.teams.find(t=>t.id===scope.teamId);if(!team)throw fail(403);
   const management=['close','postpone'].includes(action);
   const week=management?state.config.weeks.find(w=>w.id===input.weekId&&w.active&&team.eligibleWeekIds.includes(w.id)):state.config.weeks.find(w=>w.active&&team.eligibleWeekIds.includes(w.id)&&!state.outcomes[JSON.stringify([team.id,w.id])]);
   const canClose=member.canCloseWeeks===true;
   const canOpen=member.canManageTeam===true;
   if(!week){if(action==='prompt')return {show:false};if(management)throw fail(409);return {status:'finished',canOpen:false,canClose:false};}
   const ref=campaignRef.collection('questionnaires').doc(scope.teamId+'_'+week.id),snapshot=await tx.get(ref);let survey=snapshot.data();
   if(coordination&&action==='open'&&input.weekId!==week.id)throw fail(409);
   if(action==='open'){
    if(!canOpen)throw fail(403);const scoring=collectionScoring(record);
    if(!survey){
     const members=await tx.get(db.collection(`tenants/${scope.tenantId}/members`).where('active','==',true).limit(101));if(members.size>100)throw fail(409);
     const eligible=members.docs.map(d=>d.data()).filter(m=>m.participationEnabled!==false&&m.tenantId===scope.tenantId&&Array.isArray(m.assignments)&&m.assignments.some(a=>a.campaignId===scope.campaignId&&a.teamId===scope.teamId)).map(m=>m.uid);
     if(!eligible.length||new Set(eligible).size!==eligible.length)throw fail(409);
     survey={teamId:scope.teamId,weekId:week.id,status:'open',eligible,answers:{},absent:[],openedAt:Date.now(),questions,scoring};
     tx.set(ref,survey);tx.update(campaignRef,{collectionMode:'weekly-questionnaire'});
    }
   }
   if(action==='prompt'&&!survey)return {show:false};
   if(!survey&&action!=='read')throw fail(409);
   if(!survey)return {status:'not-open',canOpen,week:{id:week.id,start:week.start,endExclusive:week.endExclusive}};
   const outcomeKey=JSON.stringify([scope.teamId,week.id]);
   const deadline=()=>state.reports[outcomeKey]??week.endExclusive;
   if(management){
    if(!canClose)throw fail(403);
    if(action==='close'&&!['evaluate','joker'].includes(input.decision))throw fail(400);
    if(survey.status==='closed'&&state.outcomes[outcomeKey])return {status:'closed',week:{id:week.id,start:week.start,endExclusive:week.endExclusive},canOpen,canClose,alreadyClosed:true};
    if(survey.status!=='open'||state.outcomes[outcomeKey])throw fail(409);
    let ledger=record.ledger;
    try{
     if(action==='postpone'){
      const next=postponeWeek(state,{...scope,weekId:week.id,today:week.start});
      if(next!==state){ledger={...ledger,state:next,revision:ledger.revision+1};const payload=JSON.stringify({...record,ledger});if(Buffer.byteLength(payload)>800000)throw fail(409);tx.update(campaignRef,{payload});}
      return {status:'postponed',week:{id:week.id,start:week.start,endExclusive:week.endExclusive},deadline:next.reports[outcomeKey],canOpen,canClose};
     }
     if(survey.scoring?.mode!==state.config.mode||survey.scoring.source!=='fictitious')throw fail(409);
     const roster=survey.eligible.map(id=>({id,eligible:true,absent:survey.absent.includes(id)}));
     if(input.decision==='evaluate'&&!roster.some(m=>!m.absent))throw fail(409);
     // Logical simulation clock; never accept a date or score supplied by the browser.
     const today=[deadline(),state.freeze?.frozenOn??'',...Object.values(state.outcomes).map(o=>o.closedOn)].sort().at(-1);
     if(today>state.config.reception.cutoffDate&&!state.freeze)ledger={...ledger,state:freezeReception(state,scope,today)};
     const responses=Object.entries(survey.answers).map(([participantId,answers])=>({participantId,answers:answers.map(String)}));
     let nextRecord=record,decision={kind:'joker'};
     if(input.decision==='evaluate'){
      if(state.config.mode==='autonomous'){const result=autonomousEvaluation(record,survey,roster,responses);decision={kind:'evaluate',input:result.input};nextRecord={...record,participationHistory:result.history};}
      else decision={kind:'evaluate',input:{mode:'kpi',roster,responses,kpis:survey.scoring.kpis.map(exact)}};
     }
     ledger=closeWithEvents(ledger,{...scope,weekId:week.id,today},decision,catalog);ledger={...ledger,revision:ledger.revision+1};
     const payload=JSON.stringify({...nextRecord,ledger});if(Buffer.byteLength(payload)>800000)throw fail(409);
     tx.update(campaignRef,{payload});tx.update(ref,{status:'closed',closedOn:today,closedBy:viewer.viewerId,decision:input.decision});
     return {status:'closed',week:{id:week.id,start:week.start,endExclusive:week.endExclusive},canOpen,canClose,alreadyClosed:false};
    }catch(e){if(e.status)throw e;throw fail(409);}
   }
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
   if(action==='prompt'){
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now()));
    if(survey.status!=='open'||!eligible||response||survey.absent.includes(viewer.viewerId)||today<week.start||today>=deadline())return {show:false};
    const seen=ref.collection('prompts').doc(viewer.viewerId),previous=await tx.get(seen);
    if(previous.exists)return {show:false};
    tx.create(seen,{shownAt:now()});
    return {show:true,week:{id:week.id,start:week.start,endExclusive:week.endExclusive},questions:survey.questions};
   }
   // Only the caller's response. No roster, counts, scores or answers of colleagues.
   return {status:survey.status,canOpen,canClose,deadline:deadline(),scoringLabel:scoringDescription(survey.scoring),eligible,week:{id:week.id,start:week.start,endExclusive:week.endExclusive},questions:survey.questions,myAnswers:survey.answers[viewer.viewerId]??null,absent:survey.absent.includes(viewer.viewerId)};
  });
 }
 return {prompt:(h,s)=>operate(h,s,'prompt'),coordinate:(h,s,a,i)=>operate(h,s,a,i,true),read:(h,s)=>operate(h,s,'read'),open:(h,s)=>operate(h,s,'open'),answer:(h,s,i)=>operate(h,s,'answer',i),absence:(h,s,i)=>operate(h,s,'absence',i),close:(h,s,i)=>operate(h,s,'close',i),postpone:(h,s,i)=>operate(h,s,'postpone',i)};
}
