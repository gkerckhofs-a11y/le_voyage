import {createAccessBoundary} from './access.mjs';
import {assertTestAdapter} from './test-environment.mjs';
import {collectiveIdentity} from '../../scripts/demo-collective.mjs';
import {demoTeamIdentity} from './demo-service.mjs';
const denied=()=>Object.assign(new Error('Organizer access denied'),{status:403});
/** Explicit organizer capability, independently checked from each operational permission. */
export function createOrganizerDashboard(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 return {async read(header,scope){
  if(!scope)throw denied();
  const check=m=>{if(!Array.isArray(m?.organizerCampaigns)||!m.organizerCampaigns.includes(scope.campaignId))throw denied();return m;};
  const ref=uid=>db.doc(`tenants/${scope.tenantId}/members/${uid}`);
  const authorize=createAccessBoundary({verifyIdToken:(t,r)=>auth.verifyIdToken(t,r),readMembership:async({uid})=>check((await ref(uid).get()).data())});
  const viewer=await authorize(header,scope);
  return db.runTransaction(async tx=>{
   let member;const recheck=createAccessBoundary({verifyIdToken:async()=>({uid:viewer.viewerId}),readMembership:async()=>member=check((await tx.get(ref(viewer.viewerId))).data())});await recheck('Bearer verified',scope);
   const campaign=db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),snapshot=await tx.get(campaign);if(!snapshot.exists)throw denied();
   const state=JSON.parse(snapshot.data().payload).ledger.state;
   if(state.config.tenantId!==scope.tenantId||state.config.campaignId!==scope.campaignId||!state.config.teams.some(t=>t.id===scope.teamId))throw denied();
   const draft=(await tx.get(campaign.collection('annualDrafts').doc('next'))).data(),teams=[];
   for(const team of state.config.teams){const identity=(await tx.get(campaign.collection('teamIdentities').doc(team.id))).data();teams.push({id:team.id,name:identity?.teamName??demoTeamIdentity(team.id).teamName});}
   const canCoordinate=member.canCoordinateWeeks===true&&Array.isArray(member.coordinatedAssignments)&&member.coordinatedAssignments.some(a=>a.campaignId===scope.campaignId&&a.teamId===scope.teamId);
   // No answers, per-question results, gift preferences, costs or full annual draft.
   return {schemaVersion:1,organizationName:collectiveIdentity(state).organizationName,campaignId:scope.campaignId,teamId:scope.teamId,
    calendar:{start:state.config.weeks[0]?.start??null,endExclusive:state.config.weeks.at(-1)?.endExclusive??null,activeWeeks:state.config.weeks.filter(w=>w.active).length,timeZone:state.config.calendar?.timeZone??'Europe/Brussels'},
    teams,giftMilestoneCount:state.config.giftMilestones.length,receptionTierCount:state.config.reception.tiers.length,
    annualDraft:draft?{saved:true,revision:draft.revision}:{saved:false,revision:0},
    capabilities:{plan:member.canPlanCampaign===true,invite:member.canInvite===true,coordinate:canCoordinate}};
  });
 }};
}
