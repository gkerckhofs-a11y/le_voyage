import {normalizeGiftPreferences} from './gift-preferences.mjs';
import {randomBytes,createHash} from 'node:crypto';
import {assertTestAdapter} from './test-environment.mjs';
const denied=()=>Object.assign(new Error('Invitation unavailable'),{status:403});
const hash=token=>{if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw denied();return createHash('sha256').update(token).digest('hex');};
const same=(a,b)=>a.tenantId===b.tenantId&&a.campaignId===b.campaignId&&a.teamId===b.teamId;
export function createInvitations(adapter,{now=()=>Date.now(),lifetimeMs=86400000}={}){
 assertTestAdapter(adapter);const {db,auth}=adapter;
 const member=(scope,uid)=>db.doc(`tenants/${scope.tenantId}/members/${uid}`);
 async function identity(header){try{if(typeof header!=='string'||!header.startsWith('Bearer '))throw denied();return await auth.verifyIdToken(header.slice(7),true);}catch{throw denied();}}
 function allowed(data,scope,uid){if(!data||data.uid!==uid||data.tenantId!==scope.tenantId||data.active!==true||data.canInvite!==true||!Array.isArray(data.assignments)||!data.assignments.some(a=>a.campaignId===scope.campaignId&&a.teamId===scope.teamId))throw denied();}
 async function inspect(tx,ref,uid){
  const snapshot=await tx.get(ref);if(!snapshot.exists)throw denied();const invite=snapshot.data();
  if(invite.recipientUid!==uid||invite.status==='revoked'||(invite.status!=='accepted'&&invite.expiresAt<=now()))throw denied();
  const owner=(await tx.get(member(invite.scope,invite.issuerUid))).data();allowed(owner,invite.scope,invite.issuerUid);
  const campaign=await tx.get(db.doc(`tenants/${invite.scope.tenantId}/campaigns/${invite.scope.campaignId}`));if(!campaign.exists)throw denied();
  const state=JSON.parse(campaign.data().payload).ledger.state;
  if(state.config.tenantId!==invite.scope.tenantId||state.config.campaignId!==invite.scope.campaignId||!state.config.teams.some(t=>t.id===invite.scope.teamId))throw denied();
  return invite;
 }
 return {
  async issue(header,scope,recipientUid){
   const user=await identity(header);await adapter.read(header,scope);let recipient;try{recipient=await auth.getUser(recipientUid);}catch(error){if(error.code==='auth/user-not-found')throw denied();throw error;}if(recipient.disabled)throw denied();
   const token=randomBytes(32).toString('hex'),id=hash(token),createdAt=now(),expiresAt=createdAt+lifetimeMs;
   await db.runTransaction(async tx=>{allowed((await tx.get(member(scope,user.uid))).data(),scope,user.uid);tx.create(db.doc(`invitations/${id}`),{scope:{...scope},issuerUid:user.uid,recipientUid,status:'pending',createdAt,expiresAt});});
   return {id,token,expiresAt};
  },
  async revoke(header,scope,id){
   const user=await identity(header);if(!/^[a-f0-9]{64}$/.test(id))throw denied();
   return db.runTransaction(async tx=>{allowed((await tx.get(member(scope,user.uid))).data(),scope,user.uid);const ref=db.doc(`invitations/${id}`),invite=(await tx.get(ref)).data();if(!invite||invite.issuerUid!==user.uid||!same(invite.scope,scope)||invite.status==='accepted')throw denied();tx.update(ref,{status:'revoked',revokedAt:now()});return {revoked:true};});
  },
  async preview(header,token){const user=await identity(header);return db.runTransaction(async tx=>{const invite=await inspect(tx,db.doc(`invitations/${hash(token)}`),user.uid);const teamIdentity=(await tx.get(db.doc(`tenants/${invite.scope.tenantId}/campaigns/${invite.scope.campaignId}/teamIdentities/${invite.scope.teamId}`))).data();const hasGiftPreferences=(await tx.get(db.doc(`tenants/${invite.scope.tenantId}/giftPreferences/${user.uid}`))).exists;return {hasGiftPreferences,status:invite.status,expiresAt:invite.expiresAt,organizationName:invite.scope.tenantId==='fiction-lex-ekho'?'Lex EKHO':'Entreprise fictive',teamName:teamIdentity?.teamName??'Les Explorateurs'};});},
  async accept(header,token,displayName,preferences=null){
   const value=normalizeGiftPreferences(preferences??{choices:[],alcoholFree:false,surprise:true,birthday:null,privateContactRequested:false,revision:0});
   if(typeof displayName!=='string'||displayName.trim().length<2||displayName.trim().length>60||/[\p{Cc}\p{Cf}<>]/u.test(displayName))throw Object.assign(new Error('Invalid display name'),{status:400});
   const user=await identity(header),ref=db.doc(`invitations/${hash(token)}`);
   return db.runTransaction(async tx=>{
    const invite=await inspect(tx,ref,user.uid),membershipRef=member(invite.scope,user.uid),membership=(await tx.get(membershipRef)).data();
    if(membership&&(membership.active!==true||membership.uid!==user.uid||membership.tenantId!==invite.scope.tenantId))throw denied();
    const assignment={campaignId:invite.scope.campaignId,teamId:invite.scope.teamId};
    const assignments=membership?.assignments??[];
    if(assignments.some(a=>a.campaignId===assignment.campaignId&&a.teamId!==assignment.teamId))throw denied();
    if(invite.status==='accepted'){
     if(invite.acceptedBy!==user.uid||!assignments.some(a=>a.campaignId===assignment.campaignId&&a.teamId===assignment.teamId))throw denied();
     return {scope:invite.scope,alreadyAccepted:true};
    }
    const preferenceRef=db.doc(`tenants/${invite.scope.tenantId}/giftPreferences/${user.uid}`),existingPreferences=await tx.get(preferenceRef);
    if(!existingPreferences.exists){const at=now();tx.create(preferenceRef,{value,revision:1,updatedAt:at,history:[{revision:1,at}]});}
    tx.set(membershipRef,{...(membership??{}),uid:user.uid,tenantId:invite.scope.tenantId,active:true,assignments:assignments.some(a=>a.campaignId===assignment.campaignId&&a.teamId===assignment.teamId)?assignments:[...assignments,assignment]});
    tx.set(db.doc(`tenants/${invite.scope.tenantId}/profiles/${user.uid}`),{displayName:displayName.trim(),updatedAt:now()},{merge:true});
    tx.update(ref,{status:'accepted',acceptedBy:user.uid,acceptedAt:now()});
    return {scope:invite.scope,alreadyAccepted:false};
   });
  }
 };
}
