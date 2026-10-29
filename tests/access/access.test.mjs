import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccessBoundary} from '../../src/server/access.mjs';
const scope={tenantId:'client-a',campaignId:'2026',teamId:'team-a'};
const membership={active:true,tenantId:'client-a',uid:'person-a',assignments:[{campaignId:'2026',teamId:'team-a'}],privatePreferences:['tea']};
const setup=(overrides={})=>createAccessBoundary({verifyIdToken:async()=>({uid:'person-a',admin:true,tenantId:'forged'}),readMembership:async()=>membership,...overrides});
test('verified UID, revocation check and minimal immutable scope',async()=>{
 let verification,lookup;
 const authorize=setup({verifyIdToken:async(...args)=>{verification=args;return {uid:'person-a',admin:true};},readMembership:async args=>{lookup=args;return membership;}});
 const viewer=await authorize('Bearer test-token',scope);
 assert.deepEqual(verification,['test-token',true]);assert.deepEqual(lookup,{tenantId:'client-a',uid:'person-a'});
 assert.deepEqual(viewer,{...scope,viewerId:'person-a'});assert.equal(Object.isFrozen(viewer),true);
});
test('missing, malformed, expired or revoked tokens cannot reach membership reads',async()=>{
 let reads=0;const authorize=setup({verifyIdToken:async()=>{throw new Error('secret token detail');},readMembership:async()=>{reads++;return membership;}});
 for(const header of [undefined,'','Basic test','Bearer a b','Bearer expired'])await assert.rejects(authorize(header,scope),e=>e.status===403&&e.message==='Access denied');
 assert.equal(reads,0);
});
test('foreign tenant, campaign and team denied despite privileged token claims',async()=>{
 for(const foreign of [{tenantId:'client-b'},{campaignId:'2027'},{teamId:'team-b'}])await assert.rejects(setup()('Bearer token',{...scope,...foreign}),{status:403});
});
test('inactive, absent, mismatched or malformed membership denied',async()=>{
 for(const member of [null,{...membership,active:false},{...membership,uid:'person-b'},{...membership,assignments:null},{...membership,assignments:[]}])await assert.rejects(setup({readMembership:async()=>member})('Bearer token',scope),{status:403});
});
test('revocation of assignment is observed on next operation, without membership cache',async()=>{
 let active=true;const authorize=setup({readMembership:async()=>({...membership,active})});
 await authorize('Bearer token',scope);active=false;await assert.rejects(authorize('Bearer token',scope),{status:403});
});
test('invalid resource identifiers denied before verification; storage failure fails closed',async()=>{
 let calls=0;const authorize=setup({verifyIdToken:async()=>{calls++;return {uid:'person-a'};}});
 for(const tenantId of ['../client-b','a/b','',null])await assert.rejects(authorize('Bearer token',{...scope,tenantId}),{status:403});
 assert.equal(calls,0);
 await assert.rejects(setup({readMembership:async()=>{throw new Error('Unavailable');}})('Bearer token',scope),/Unavailable/);
});
