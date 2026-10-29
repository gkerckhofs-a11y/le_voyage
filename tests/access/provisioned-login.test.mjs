import test from 'node:test';import assert from 'node:assert/strict';
import {provisionedLogin} from '../../src/server/provisioned-login.mjs';
const now=1800000000000,valid={uid:'user',email_verified:true,firebase:{sign_in_provider:'google.com'},auth_time:now/1000,exp:now/1000+3600};
function options(claims=valid,entries=[{id:'director'}]){return {now,idToken:'token',auth:{verifyIdToken:async(token,revoke)=>{assert.equal(token,'token');assert.equal(revoke,true);return claims;}},workspaces:{list:async header=>{assert.equal(header,'Bearer token');return entries;}}};}
test('verified identity opens only the workspace selector with a bounded expiry',async()=>{
 const session=await provisionedLogin(options());assert.equal(session.workspaceEnabled,true);assert.equal(session.scope,null);assert.equal(session.expires,now+3300000);assert.equal(session.directorOnly,false);
 assert.equal((await provisionedLogin(options({...valid,exp:now/1000+120}))).expires,now+120000);
 assert.equal((await provisionedLogin(options({...valid,firebase:{sign_in_provider:'password'}}))).workspaceEnabled,true);
});
test('rejects stale, future, expired, unverified and unsupported identities before reading grants',async()=>{
 for(const patch of [{email_verified:false},{uid:''},{firebase:{sign_in_provider:'anonymous'}},{firebase:{sign_in_provider:'custom'}},{auth_time:now/1000-301},{auth_time:now/1000+61},{auth_time:undefined},{exp:now/1000},{exp:undefined}]){
  const input=options({...valid,...patch});input.workspaces.list=()=>assert.fail('must not inspect grants');await assert.rejects(provisionedLogin(input),{status:401});
 }
});
test('revoked tokens and missing effective assignments cannot create a session',async()=>{
 const input=options();input.auth.verifyIdToken=async()=>{throw Error('revoked');};await assert.rejects(provisionedLogin(input),{status:401});
 await assert.rejects(provisionedLogin(options(valid,[])),{status:403});
 const denied=options();denied.workspaces.list=async()=>{throw Object.assign(Error('denied'),{status:403});};await assert.rejects(provisionedLogin(denied),{status:403});
 for(const idToken of ['',null,'a b','a'.repeat(8193)])await assert.rejects(provisionedLogin({...options(),idToken}),{status:400});
});
