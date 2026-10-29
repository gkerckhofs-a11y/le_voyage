import test from 'node:test';import assert from 'node:assert/strict';
import {stagingConfig,testGate,stagingProjectId} from '../../src/server/staging-config.mjs';
const valid={GOOGLE_CLOUD_PROJECT:stagingProjectId,GCLOUD_PROJECT:stagingProjectId,RC_STAGE:'isolated-test',RC_ALLOWED_ORIGINS:`https://${stagingProjectId}.web.app`,RC_TEST_ACCESS_PASSWORD:'a'.repeat(40),RC_TEST_AUTH_PASSWORD:'b'.repeat(40),RC_FIREBASE_API_KEY:'c'.repeat(39)};
test('staging refuses production, emulator contamination, missing secrets and foreign origins',()=>{
 assert.equal(stagingConfig(valid).projectId,stagingProjectId);
 for(const patch of [{GCLOUD_PROJECT:'le-voyage-f0ae3'},{GOOGLE_CLOUD_PROJECT:'le-voyage-f0ae3'},{RC_STAGE:''},{FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'},{FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'},{RC_ALLOWED_ORIGINS:'https://evil.example'},{RC_ALLOWED_ORIGINS:`https://${stagingProjectId}.web.app/path`},{RC_TEST_ACCESS_PASSWORD:'short'},{RC_TEST_AUTH_PASSWORD:''},{RC_FIREBASE_API_KEY:''}])assert.throws(()=>stagingConfig({...valid,...patch}));
});
test('test gate protects pages and API before routing',()=>{
 const gate=testGate(valid.RC_TEST_ACCESS_PASSWORD);let status,headers;
 const res={writeHead:(s,h)=>{status=s;headers=h;},end:()=>{},setHeader:()=>{}};
 for(const authorization of [undefined,'Bearer token','Basic '+Buffer.from('voyage:wrong').toString('base64')]){assert.equal(gate({headers:{authorization}},res),false);assert.equal(status,401);assert.equal(headers['Cache-Control'],'no-store');}
 assert.equal(gate({headers:{authorization:'Basic '+Buffer.from('voyage:'+valid.RC_TEST_ACCESS_PASSWORD).toString('base64')}},res),true);
});
import {createDemoServer} from '../../src/server/http.mjs';
import {once} from 'node:events';
test('remote server accepts only the exact configured origin and host',async t=>{
 const origins=[];const server=createDemoServer({root:'dist-web',directory:'.demo-state',remoteOrigins:origins,apiHandler:async(req,json)=>json(200,{ok:true})});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const host='127.0.0.1:'+server.address().port;origins.push('https://'+host);
 const post=origin=>fetch('http://'+host+'/api/check',{method:'POST',headers:{Origin:origin}});
 assert.equal((await post('https://'+host)).status,200);assert.equal((await post('https://foreign.example')).status,403);assert.equal((await post('http://'+host)).status,403);
});
import {assertTestAdapter} from '../../src/server/test-environment.mjs';
test('services reject a production adapter even with a valid staging environment',()=>{
 const adapter=id=>({auth:{app:{options:{projectId:id}}},db:{projectId:id}});
 assert.doesNotThrow(()=>assertTestAdapter(adapter(stagingProjectId),valid));
 assert.throws(()=>assertTestAdapter(adapter('le-voyage-f0ae3'),valid));
 assert.throws(()=>assertTestAdapter({...adapter(stagingProjectId),db:{projectId:'le-voyage-f0ae3'}},valid));
});
test('provisioned access is explicit and Google still requires a tester allowlist',()=>{
 assert.equal(stagingConfig({...valid,RC_AUTHENTICATION_MODE:'provisioned'}).authenticationMode,'provisioned');
 assert.throws(()=>stagingConfig({...valid,RC_AUTHENTICATION_MODE:'unknown'}));
 assert.equal(stagingConfig({...valid,RC_AUTHENTICATION_MODE:'provisioned',RC_TEST_ACCESS_MODE:'google',RC_TESTER_EMAILS:'a@example.test',RC_TEST_AUTH_PASSWORD:undefined,RC_TEST_ACCESS_PASSWORD:undefined}).googleAccess,true);
 assert.throws(()=>stagingConfig({...valid,RC_AUTHENTICATION_MODE:'provisioned',RC_TEST_ACCESS_MODE:'google',RC_TESTER_EMAILS:''}));
});

test('email-link pilot is opt-in, isolated from Google gate, and disabled by default',()=>{
 const stage={...valid,RC_AUTHENTICATION_MODE:'provisioned',RC_TEST_ACCESS_MODE:'basic'};
 assert.equal(stagingConfig(stage).emailLinkEnabled,false);
 assert.equal(stagingConfig({...stage,RC_TEST_EMAIL_LINK_MODE:'enabled'}).emailLinkEnabled,true);
 for(const patch of [
  {RC_AUTHENTICATION_MODE:'demo'},
  {RC_TEST_ACCESS_MODE:'google',RC_TESTER_EMAILS:'x@example.test'},
  {RC_TEST_ACCESS_MODE:undefined},
  {RC_TEST_EMAIL_LINK_MODE:'invalid'}
 ])assert.throws(()=>stagingConfig({...stage,RC_TEST_EMAIL_LINK_MODE:'enabled',...patch}));
});
