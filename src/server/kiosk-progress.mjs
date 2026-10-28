import {assertTestAdapter} from './test-environment.mjs';
import {collectiveJourneyView} from '../presentation/collective-view.ts';
import {collectiveIdentity} from '../../scripts/demo-collective.mjs';
const denied=()=>Object.assign(new Error('Kiosk access denied'),{status:403});
const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
/** A revocable public-display capability, independent of team or director membership assignments. */
export function createKioskProgress(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 return {async read(header,scope){
  if(!scope||![scope.tenantId,scope.campaignId].every(identifier)||typeof header!=='string'||!/^Bearer [^\s]{1,8192}$/.test(header))throw denied();
  let uid;try{uid=(await auth.verifyIdToken(header.slice(7),true)).uid;}catch{throw denied();}if(!identifier(uid))throw denied();
  return db.runTransaction(async tx=>{
   const member=(await tx.get(db.doc(`tenants/${scope.tenantId}/members/${uid}`))).data();
   if(member?.uid!==uid||member.tenantId!==scope.tenantId||member.active!==true||!Array.isArray(member.kioskCampaigns)||!member.kioskCampaigns.includes(scope.campaignId))throw denied();
   const campaign=(await tx.get(db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`))).data();if(!campaign)throw denied();const state=JSON.parse(campaign.payload).ledger.state;
   if(state.config.tenantId!==scope.tenantId||state.config.campaignId!==scope.campaignId)throw denied();
   // Existing collective allowlist: distances, bus route, festive stops; never teams, budgets or answers.
   return collectiveJourneyView(state,scope,collectiveIdentity(state));
  });
 }};
}
