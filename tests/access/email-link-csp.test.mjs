import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createDemoServer} from '../../src/server/http.mjs';

test('e-mail SDK CSP opens only on the opt-in page, not on other frontend screens',async t=>{
 const root=await mkdtemp(join(tmpdir(),'rc-email-html-'));
 const directory=await mkdtemp(join(tmpdir(),'rc-email-store-'));
 await writeFile(join(root,'email-link.html'),'<html>private email test</html>');
 await writeFile(join(root,'connexion.html'),'<html>private login</html>');
 const server=createDemoServer({root,directory,apiHandler:async(_req,json)=>json(404,{}),remoteOrigins:['https://rc-voyage-test-20261027.web.app'],emailLinkProjectId:'rc-voyage-test-20261027'});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});await rm(directory,{recursive:true,force:true});});
 const origin='http://127.0.0.1:'+server.address().port;
 const email=await fetch(origin+'/email-link.html'),login=await fetch(origin+'/connexion.html');
 assert.equal(email.status,200);assert.equal(login.status,200);
 assert.match(email.headers.get('content-security-policy'),/https:\/\/www\.gstatic\.com/);
 assert.match(email.headers.get('content-security-policy'),/identitytoolkit\.googleapis\.com/);
 assert.doesNotMatch(login.headers.get('content-security-policy'),/gstatic/);
 assert.equal(email.headers.get('referrer-policy'),'no-referrer');
});
test('e-mail-link CSP rejects non-staging unsafe server configuration',()=>{
 assert.throws(()=>createDemoServer({root:'.',directory:'../temp-test-store',remoteOrigins:[],emailLinkProjectId:'untrusted-project'}));
 assert.throws(()=>createDemoServer({root:'.',directory:'../temp-test-store',remoteOrigins:['https://x.test'],emailLinkProjectId:'../unsafe'}));
});
