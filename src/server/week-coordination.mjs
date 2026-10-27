import {collectionScoring,scoringDescription} from './scoring-policy.mjs';
import {createAccessBoundary} from './access.mjs';
import {coordinatedMembership} from './coordination-access.mjs';
import {createWeeklyQuestionnaire} from './weekly-questionnaire.mjs';
import {assertTestAdapter} from './test-environment.mjs';
import {demoTeamIdentity} from './demo-service.mjs';
import {convoyDistance} from '../domain/engine.ts';
import {rounded} from '../domain/exact.ts';
const fail=status=>Object.assign(new Error('Coordination unavailable'),{status});
export function createWeekCoordination(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter,questionnaire=createWeeklyQuestionnaire(adapter);
 return {async read(header,scope){
  const memberRef=uid=>db.doc(`tenants/${scope.tenantId}/members/${uid}`);
  const access=createAccessBoundary({verifyIdToken:(t,r)=>auth.verifyIdToken(t,r),readMembership:async({uid})=>coordinatedMembership((await memberRef(uid).get()).data(),scope)});const viewer=await access(header,scope);
  return db.runTransaction(async tx=>{
   let member;const checked=createAccessBoundary({verifyIdToken:async()=>({uid:viewer.viewerId}),readMembership:async()=>member=coordinatedMembership((await tx.get(memberRef(viewer.viewerId))).data(),scope)});await checked('Bearer verified',scope);
   const ref=db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),snapshot=await tx.get(ref);if(!snapshot.exists)throw fail(403);const record=JSON.parse(snapshot.data().payload),state=record.ledger.state;if(state.config.tenantId!==scope.tenantId||state.config.campaignId!==scope.campaignId)throw fail(403);
   const week=state.config.weeks.find(w=>w.active&&state.config.teams.some(t=>t.eligibleWeekIds.includes(w.id)&&!state.outcomes[JSON.stringify([t.id,w.id])]));
   const summary={scoringLabel:scoringDescription(collectionScoring(record)),convoyKm:rounded(convoyDistance(state)),lastConvoyWeek:Object.values(state.convoys).at(-1)?.weekId??null};if(!week)return {...summary,status:'finished',teams:[]};
   const teams=[];const logicalDate=[...Object.values(state.outcomes).map(o=>o.closedOn),state.freeze?.frozenOn??''].sort().at(-1)??'';
   for(const team of state.config.teams){
    if(!team.eligibleWeekIds.includes(week.id)||!member.assignments.some(a=>a.campaignId===scope.campaignId&&a.teamId===team.id))continue;
    const survey=(await tx.get(ref.collection('questionnaires').doc(team.id+'_'+week.id))).data(),identity=(await tx.get(ref.collection('teamIdentities').doc(team.id))).data(),key=JSON.stringify([team.id,week.id]);const status=state.outcomes[key]?'closed':survey?.status==='open'?'open':'not-open';
    teams.push({id:team.id,name:identity?.teamName??demoTeamIdentity(team.id).teamName,status,deadline:state.reports[key]??week.endExclusive,canOpen:status==='not-open'&&member.canManageTeam===true,canClose:status==='open'&&member.canCloseWeeks===true,canPostpone:status==='open'&&member.canCloseWeeks===true&&!state.reports[key]&&logicalDate<week.endExclusive});
   }
   return {...summary,status:'pending',week:{id:week.id,start:week.start,endExclusive:week.endExclusive},teams};
  });
 },async act(header,scope,action,input){
  if(!['open','close','postpone'].includes(action))throw fail(400);
  const result=await questionnaire.coordinate(header,scope,action,input);
  // Never forward the personal questionnaire DTO into the coordinator surface.
  return {status:result.status,alreadyClosed:result.alreadyClosed??false};
 }};
}
