import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createEmailLinkPreparation} from '../../src/server/email-link-preparation.mjs';

const invite='c'.repeat(64),email='member@example.test',now=1800000000000;
const id=createHash('sha256').update(invite).digest('hex');
function harness(options={}){
 const user={uid:'member-1',email,emailVerified:true,disabled:false,...options.user};
 const invitation={recipientUid:'member-1',expiresAt:now+600000,status:'pending',...options.invitation};
 const calls=[];
 const auth={
  async getUserByEmail(address){calls.push(['email',address]);if(options.noUser)throw Error('auth/user-not-found');return user;},
  async getUser(uid){calls.push(['uid',uid]);return user;}
 };
 const db={doc(path){calls.push(['doc',path]);return {async get(){return {exists:!options.missing,data:()=>invitation};}};}};
 return {service:createEmailLinkPreparation({auth,db,now:()=>now,origin:'https://pilot.example.test'}),calls};
}
test('operator preview yields only a canonical redirect and exact recipient binding, without sending',async()=>{
 const {service,calls}=harness();
 const output=await service.preview({email,invitationToken:invite});
 assert.deepEqual(output,{uid:'member-1',email,invitationId:id,expiresAt:now+600000,actionCodeSettings:{url:'https://pilot.example.test/invitation.html',handleCodeInApp:true}});
 assert.equal(JSON.stringify(output).includes(invite),false);
 assert.deepEqual(calls,[['email',email],['doc','invitations/'+id]]);
});
test('unverified, disabled, foreign, revoked, expired and missing invitations fail closed',async()=>{
 for(const option of [
  {user:{emailVerified:false}}, {user:{disabled:true}}, {user:{uid:'wrong'}},
  {invitation:{recipientUid:'wrong'}}, {invitation:{status:'revoked'}},
  {invitation:{expiresAt:now}}, {missing:true}, {noUser:true},
  {user:{email:'foreign@example.test'}}
 ])await assert.rejects(harness(option).service.preview({email,invitationToken:invite}),{status:403});
});
test('invalid email, invitation and insecure origins are rejected before lookup',async()=>{
 const h=harness();
 for(const invalid of [{email:'not-an-email',invitationToken:invite},{email,invitationToken:'x'},{email:'member@example.test\n',invitationToken:invite}])
  await assert.rejects(h.service.preview(invalid),{status:400});
 assert.deepEqual(h.calls,[]);
 const auth={getUserByEmail:async()=>({}),getUser:async()=>({})},db={doc:()=>({get:async()=>({exists:false})})};
 for(const origin of ['http://pilot.example.test','https://pilot.example.test/extra','https://user:password@pilot.example.test','https://pilot.example.test?x=1'])
  assert.throws(()=>createEmailLinkPreparation({auth,db,origin}),TypeError);
});
