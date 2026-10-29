import {createHash} from 'node:crypto';
const denied=status=>Object.assign(new Error('Email invitation link unavailable'),{status});
const validEmail=value=>typeof value==='string'&&value.length<=254&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
const validInvitation=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

/**
 * Operator-only preparation for a Firebase email sign-in invitation.
 * It never sends an email, generates a Firebase OOB code or grants a workspace.
 * This must be called only in an authorized staging operation, not on a public
 * unauthenticated API. The recipient is bound by Firebase UID, not address alone.
 */
export function createEmailLinkPreparation({auth,db,now=Date.now,origin}){
 if(!auth?.getUserByEmail||!auth?.getUser||!db?.doc||typeof now!=='function')throw TypeError('Trusted dependencies required');
 let canonical;try{const parsed=new URL(origin);if(parsed.protocol!=='https:'||parsed.origin!==origin||parsed.username||parsed.password||parsed.search||parsed.hash)throw Error();canonical=parsed.origin;}catch{throw TypeError('Explicit canonical HTTPS origin required');}
 return {
  async preview({email,invitationToken}){
   if(!validEmail(email)||!validInvitation(invitationToken))throw denied(400);
   const id=createHash('sha256').update(invitationToken).digest('hex');
   const [user,record]=await Promise.all([auth.getUserByEmail(email).catch(()=>null),db.doc('invitations/'+id).get()]);
   const invitation=record.exists?record.data():null;
   if(!user||user.disabled||!user.emailVerified||user.email?.toLowerCase()!==email.toLowerCase()||
      invitation?.recipientUid!==user.uid||invitation.status!=='pending'||
      !Number.isSafeInteger(invitation.expiresAt)||invitation.expiresAt<=now())throw denied(403);
   return Object.freeze({uid:user.uid,email:user.email,invitationId:id,expiresAt:invitation.expiresAt,
    actionCodeSettings:Object.freeze({url:canonical+'/invitation.html',handleCodeInApp:true})});
  }
 };
}
