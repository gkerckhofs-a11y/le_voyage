import test from 'node:test';import assert from 'node:assert/strict';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';import {createAccountPreparation} from '../../src/server/account-preparation.mjs';
test('account preparation previews without mutation, creates unverified without rights and lets recipient set password and verify email',async t=>{
 const a=createFirebaseEmulatorAdapter();t.after(()=>a.close());const uid='new-account-'+Date.now(),input={uid,email:uid+'@example.test',reference:'pilot-test',reason:'Compte fictif'},service=createAccountPreparation(a);
 const preview=await service.preview(input);assert.equal(preview.canCreate,true);await assert.rejects(a.auth.getUser(uid),{code:'auth/user-not-found'});
 await assert.rejects(service.create({...input,reason:'different'},preview.digest),{status:409});
 const race=await Promise.allSettled([service.create(input,preview.digest),service.create(input,preview.digest)]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.find(r=>r.status==='rejected').reason.status,409);
 const user=await a.auth.getUser(uid);assert.equal(user.emailVerified,false);assert.equal(user.disabled,false);assert.deepEqual(user.customClaims??{},{});assert.equal((await a.db.doc('workspaceDirectories/'+uid).get()).exists,false);assert.equal((await a.db.doc('giftOperators/'+uid).get()).exists,false);assert.equal((await a.db.doc('accessAdministrators/'+uid).get()).exists,false);
 assert.equal((await service.preview(input)).canCreate,false);await assert.rejects(service.create(input,preview.digest),{status:409});
 await assert.rejects(service.links({...input,email:'other@example.test'}),{status:403});
 const links=await service.links(input);assert.ok(links.passwordSetupUrl);assert.ok(links.verificationUrl);assert.equal((await a.auth.getUser(uid)).emailVerified,false);
 async function action(name,data){return fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:'+name+'?key=fake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}
 const reset=new URL(links.passwordSetupUrl).searchParams.get('oobCode'),verify=new URL(links.verificationUrl).searchParams.get('oobCode');assert.ok(reset);assert.ok(verify);
 const password='Fictitious-Recipient-Password-42!';assert.equal((await action('resetPassword',{oobCode:reset,newPassword:password})).status,200);assert.equal((await action('update',{oobCode:verify})).status,200);
 assert.equal((await a.auth.getUser(uid)).emailVerified,true);const login=await action('signInWithPassword',{email:input.email,password,returnSecureToken:true});assert.equal(login.status,200);const identity=await a.auth.verifyIdToken((await login.json()).idToken,true);assert.equal(identity.email_verified,true);
 assert.equal((await service.links(input)).verificationUrl,null);
 await a.auth.updateUser(uid,{disabled:true});await assert.rejects(service.links(input),{status:403});
});
