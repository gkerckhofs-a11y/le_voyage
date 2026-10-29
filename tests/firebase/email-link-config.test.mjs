import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';
import {createFirebaseHttp} from '../../src/server/firebase-http.mjs';
import {createDemoServer} from '../../src/server/http.mjs';

const projectId='rc-voyage-test-20261027';
const emailLink={projectId,apiKey:'a'.repeat(32),canonical:'https://'+projectId+'.web.app'};

async function serve(t,withEmailLink){
 const adapter=createFirebaseEmulatorAdapter();
 const app=await createFirebaseHttp({adapter,authenticationMode:'provisioned',...(withEmailLink?{emailLink}:{})});
 const server=createDemoServer({root:resolve('dist-web'),directory:resolve('.demo-state'),apiHandler:app.handler});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await app.close();});
 return 'http://127.0.0.1:'+server.address().port;
}

test('email-link client configuration is absent unless expressly enabled',async t=>{
 const origin=await serve(t,false);
 assert.deepEqual(await(await fetch(origin+'/api/auth/config')).json(),{mode:'provisioned'});
 const result=await fetch(origin+'/api/auth/email-link/config');
 assert.equal(result.status,404);assert.equal(result.headers.get('cache-control'),'no-store');
});
test('enabled configuration exposes only public SDK fields, never member access or secrets',async t=>{
 const origin=await serve(t,true);
 assert.deepEqual(await(await fetch(origin+'/api/auth/config')).json(),{mode:'provisioned',emailLinkEnabled:true});
 const result=await fetch(origin+'/api/auth/email-link/config');
 assert.equal(result.status,200);
 assert.deepEqual(await result.json(),{projectId,apiKey:emailLink.apiKey,authDomain:projectId+'.firebaseapp.com',canonical:emailLink.canonical});
 assert.equal((await fetch(origin+'/api/workspaces')).status,401);
 assert.equal((await fetch(origin+'/api/director/progress')).status,401);
});
