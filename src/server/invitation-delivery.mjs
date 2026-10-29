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
 if(typeof invitations?.recipient!=='function'||typeof invitations?.issue!=='function'||typeof invitations?.revoke!=='function'||typeof transport?.send!=='function'||typeof now!=='function')throw TypeError('Explicit verified invitation service and mail transport required');
 if(!Number.isSafeInteger(cooldownMs)||cooldownMs<60000)throw TypeError('Delivery throttle required');
 let canonical;
 try{const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error();canonical=u.origin;}catch{throw TypeError('Explicit canonical HTTPS origin required');}
 const {db,auth}=adapter;
 return {
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
    tx.set(lock,{at:startedAt,mutationIdHash:digest(mutationId)});
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
