import {projectClientBudget} from './client-budget.mjs';
import {assertTestAdapter} from './test-environment.mjs';
import {teamDistance,convoyDistance,receptionLevel} from '../domain/engine.ts';
import {displayKm} from '../domain/exact.ts';
import {addDays} from '../domain/calendar.ts';
import {collectiveIdentity} from '../../scripts/demo-collective.mjs';
import {demoTeamIdentity} from './demo-service.mjs';
const denied=()=>Object.assign(new Error('Director access denied'),{status:403});
const identifier=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
/** Dedicated read-only capability. No team assignment, operator or organizer inheritance. */
export function createDirectorProgress(adapter){
 assertTestAdapter(adapter);const {db,auth}=adapter;
 return {async read(header,scope){
  if(!scope||![scope.tenantId,scope.campaignId].every(identifier)||typeof header!=='string'||!/^Bearer [^\s]{1,8192}$/.test(header))throw denied();
  let uid;try{uid=(await auth.verifyIdToken(header.slice(7),true)).uid;}catch{throw denied();}if(!identifier(uid))throw denied();
  return db.runTransaction(async tx=>{
   const member=(await tx.get(db.doc(`tenants/${scope.tenantId}/members/${uid}`))).data();
   if(member?.uid!==uid||member.tenantId!==scope.tenantId||member.active!==true||!Array.isArray(member.directorCampaigns)||!member.directorCampaigns.includes(scope.campaignId))throw denied();
   const snapshot=await tx.get(db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`));if(!snapshot.exists)throw denied();
   const state=JSON.parse(snapshot.data().payload).ledger.state;
   if(state.config.tenantId!==scope.tenantId||state.config.campaignId!==scope.campaignId)throw denied();
   const teams=[];
   for(const team of state.config.teams){
    const identity=(await tx.get(snapshot.ref.collection('teamIdentities').doc(team.id))).data();
    const distance=teamDistance(state,team.id);
    teams.push({id:team.id,name:identity?.teamName??demoTeamIdentity(team.id).teamName,distance:{...distance},displayKm:displayKm(distance),
     milestones:state.config.giftMilestones.map((m,i)=>({number:i+1,km:m.km,acquired:Object.values(state.entitlements).some(e=>e.teamId===team.id&&e.milestoneId===m.id)}))});
   }
   const distance=convoyDistance(state),reception=receptionLevel(state);
   // Allowlist only: no weekly history, outcome source, questionnaire, tastes or costs.
   return {schemaVersion:1,organizationName:collectiveIdentity(state).organizationName,campaignId:scope.campaignId,teams,
    collective:{distance:{...distance},displayKm:displayKm(distance)},
    reception:{baseGuaranteed:true,level:reception.level,frozen:state.freeze!==null,cutoffDate:state.config.reception.cutoffDate,
     freezeDate:addDays(state.config.reception.cutoffDate,1),frozenOn:state.freeze?.frozenOn??null,
     distance:{...reception.km},displayKm:displayKm(reception.km),
     tiers:state.config.reception.tiers.map((tier,i)=>({level:i+1,km:tier.km,included:i<reception.level,
      status:i<reception.level?'included':state.freeze!==null?'not-included':i===reception.level?'next':'unreached'}))},
    clientBudget:projectClientBudget((await tx.get(snapshot.ref.collection('clientBudgets').doc('current'))).data(),scope)};
  });
 }};
}
