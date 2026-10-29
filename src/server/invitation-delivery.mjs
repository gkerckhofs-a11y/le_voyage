import {createHash} from 'node:crypto';
import {assertTestAdapter} from './test-environment.mjs';
const reject=status=>Object.assign(new Error('Invitation delivery unavailable'),{status});
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
const validMutation=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,64}$/.test(value);
const digest=value=>createHash('sha256').update(value).digest('hex');

/**
 * Staging-only, server-side sender. No mailer is configured by default.
 * Recipient authorization is checked by the existing invitation service;
 * no caller-supplied email address or URL is used for delivery.
 *
 * Idempotency uses a durable dispatch record and a ten-minute per-recipient
 * reservation. On an uncertain provider result, the record requires manual
 * review and is never retried automatically.
 */
export function createInvitationDelivery({adapter,invitations,transport,origin,now=Date.now,cooldownMs=600000}){
 assertTestAdapter(adapter);
 if(typeof invitations?.authorizeIssuer!=='function'||typeof invitations?.recipient!=='function'||typeof invitations?.issue!=='function'||typeof invitations?.revoke!=='function'||typeof transport?.send!=='function'||typeof now!=='function')throw TypeError('Explicit verified invitation service and mail transport required');
 if(!Number.isSafeInteger(cooldownMs)||cooldownMs<60000)throw TypeError('Delivery throttle required');
 let canonical;
 try{const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error();canonical=u.origin;}catch{throw TypeError('Explicit canonical HTTPS origin required');}
 const {db,auth}=adapter;
 return {
  async status(header,scope,{recipientUid}={}){
   if(!scope||![scope.tenantId,scope.campaignId,scope.teamId,recipientUid].every(validId))throw reject(400);
   const viewerUid=await invitations.authorizeIssuer(header,scope);
   const scopeKey=[scope.tenantId,scope.campaignId,scope.teamId,recipientUid].join('|');
   const result=await db.runTransaction(async tx=>{
    const lock=(await tx.get(db.doc('invitationDeliveryLimits/'+digest(scopeKey)))).data();
    if(!lock)return {status:'none'};
    // Older reservations have no record pointer; absence is not proof of no send.
    if(!/^[a-f0-9]{64}$/.test(lock.deliveryId??''))return {status:'unknown'};
    const record=(await tx.get(db.doc('invitationDeliveries/'+lock.deliveryId))).data();
    if(!record||record.tenantId!==scope.tenantId||record.campaignId!==scope.campaignId||record.teamId!==scope.teamId||record.recipientUid!==recipientUid)throw reject(503);
    if(!['preparing','sending','sent','review'].includes(record.status)||!Number.isSafeInteger(record.at))throw reject(503);
    let invitationState='unknown',revocableInvitationId=null;
    if(/^[a-f0-9]{64}$/.test(record.invitationId??'')){
     const invite=(await tx.get(db.doc('invitations/'+record.invitationId))).data();
     if(invite){
      if(invite.recipientUid!==recipientUid||!invite.scope||['tenantId','campaignId','teamId'].some(k=>invite.scope[k]!==scope[k]))throw reject(503);
      if(!['pending','accepted','revoked'].includes(invite.status)||!Number.isSafeInteger(invite.expiresAt))throw reject(503);
      if(invite.status==='accepted'&&invite.acceptedBy!==recipientUid)throw reject(503);
      invitationState=invite.status==='pending'?(invite.expiresAt<=now()?'expired':'pending'):invite.status;
      if(invite.issuerUid===viewerUid&&['pending','expired'].includes(invitationState)&&['sent','review'].includes(record.status))revocableInvitationId=record.invitationId;
     }
    }
    return {status:record.status,startedAt:record.at,invitationState,
     ...(revocableInvitationId?{revocableInvitationId}:{}),
     ...(Number.isSafeInteger(record.sentAt)?{sentAt:record.sentAt}:{}),
     ...(record.status==='review'?{revoked:invitationState==='revoked'}:{}),
     ...(Number.isSafeInteger(lock.at)?{retryAfter:Math.max(0,lock.at+cooldownMs-now())}:{})};
   });
   await invitations.authorizeIssuer(header,scope);
   return result;
  },
  async send(header,scope,{recipientUid,mutationId}={}){
   if(!scope||![scope.tenantId,scope.campaignId,scope.teamId,recipientUid].every(validId)||!validMutation(mutationId))throw reject(400);
   let user;
   try{user=await auth.getUser(recipientUid);}catch{throw reject(403);}
   if(user.disabled||!user.emailVerified||typeof user.email!=='string')throw reject(403);
   // Existing service checks authenticated organizer canInvite and exact recipient.
   const confirmed=await invitations.recipient(header,scope,user.email);
   if(confirmed.uid!==recipientUid||confirmed.email.toLowerCase()!==user.email.toLowerCase())throw reject(403);
   const scopeKey=[scope.tenantId,scope.campaignId,scope.teamId,recipientUid].join('|');
   const lock=db.doc('invitationDeliveryLimits/'+digest(scopeKey));
   const record=db.doc('invitationDeliveries/'+digest(scopeKey+'|'+mutationId));
   const startedAt=now();
   await db.runTransaction(async tx=>{
    const [attempt,previous]=await Promise.all([tx.get(record),tx.get(lock)]);
    if(attempt.exists)throw reject(409);
    if(previous.exists&&Number.isSafeInteger(previous.data().at)&&startedAt-previous.data().at<cooldownMs)throw reject(429);
    tx.create(record,{tenantId:scope.tenantId,campaignId:scope.campaignId,teamId:scope.teamId,recipientUid,at:startedAt,status:'preparing'});
    tx.set(lock,{at:startedAt,mutationIdHash:digest(mutationId),deliveryId:record.id});
   });
   let invitation=null,sent=false;
   try{
    invitation=await invitations.issue(header,scope,recipientUid);
    // Recheck after issuing; removal of organizer permission blocks delivery.
    await invitations.recipient(header,scope,user.email);
    await record.update({status:'sending',invitationId:invitation.id});
    await transport.send({
     to:user.email,
     subject:'Votre invitation — Le Voyage de votre entreprise',
     text:'Bonjour,\n\nVous êtes invité(e) à rejoindre le Voyage de votre entreprise.\n\nOuvrez votre lien personnel : '+canonical+'/invitation.html#'+invitation.token+'\n\nCe lien expire et ne fonctionne qu’avec votre compte vérifié. Si vous ne connaissez pas cette invitation, ignorez ce message.\n\nRouge Clémence'
    });
    sent=true;
    await record.update({status:'sent',sentAt:now()});
    return {sent:true,invitationId:invitation.id,expiresAt:invitation.expiresAt};
   }catch{
    // Provider responses may be ambiguous: do not make automatic retries.
    // A confirmed successful send must not be revoked merely because audit failed.
    let revoked=false;
    if(invitation&&!sent){try{await invitations.revoke(header,scope,invitation.id);revoked=true;}catch{}}
    await record.update({status:'review',reviewAt:now(),revoked,invitationId:invitation?.id??null}).catch(()=>{});
    throw reject(503);
   }
  }
 };
}
