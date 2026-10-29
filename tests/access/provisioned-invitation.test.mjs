import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {provisionedInvitationLogin} from '../../src/server/provisioned-login.mjs';

const invitationToken='a'.repeat(64),now=1800000000000;
function setup(provider='google.com',uid='invitee'){
 const calls=[],claims={uid,email:'invitee@example.test',email_verified:true,auth_time:now/1000,exp:now/1000+3600,firebase:{sign_in_provider:provider}};
 return {
  calls,claims,
  auth:{async verifyIdToken(token,revoke){calls.push(['identity',token,revoke]);if(token!=='verified')throw Error('Expired');return claims;}},
  invitations:{async preview(header,token){calls.push(['invite',header,token]);if(header!=='Bearer verified'||token!==invitationToken||uid!=='invitee')throw Object.assign(Error('Not recipient'),{status:403});return {status:'active'};}}
 };
}
test('Google and e-mail/password Firebase identities use the same verified recipient-bound invitation entry',async()=>{
 for(const provider of ['google.com','password']){
  const h=setup(provider);
  const result=await provisionedInvitationLogin({auth:h.auth,invitations:h.invitations,idToken:'verified',invitationToken,now});
  assert.deepEqual(result,{header:'Bearer verified',expires:now+3300000,invitationId:createHash('sha256').update(invitationToken).digest('hex')});
  assert.deepEqual(h.calls,[['identity','verified',true],['invite','Bearer verified',invitationToken]]);
  assert.equal(JSON.stringify(result).includes(invitationToken),false);
 }
});
test('an unverified address, invalid provider, wrong recipient or malformed invitation never opens a session',async()=>{
 const bad=setup();bad.claims.email_verified=false;
 await assert.rejects(provisionedInvitationLogin({auth:bad.auth,invitations:bad.invitations,idToken:'verified',invitationToken,now}),{status:401});
 assert.deepEqual(bad.calls,[['identity','verified',true]]);
 const provider=setup('anonymous');
 await assert.rejects(provisionedInvitationLogin({auth:provider.auth,invitations:provider.invitations,idToken:'verified',invitationToken,now}),{status:401});
 const stranger=setup('google.com','stranger');
 await assert.rejects(provisionedInvitationLogin({auth:stranger.auth,invitations:stranger.invitations,idToken:'verified',invitationToken,now}),{status:403});
 await assert.rejects(provisionedInvitationLogin({auth:setup().auth,invitations:setup().invitations,idToken:'verified',invitationToken:'wrong',now}),{status:400});
});
