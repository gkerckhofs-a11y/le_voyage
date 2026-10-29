import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('session purge command refuses production and invalid arguments without revealing session content',()=>{
 for(const args of [[],['--apply'],['--force']]){
  const r=spawnSync(process.execPath,['scripts/purge-expired-sessions.mjs',...args],{encoding:'utf8',input:'{}',env:{...process.env,RC_STAGE:'production',GOOGLE_CLOUD_PROJECT:'production-refused',GCLOUD_PROJECT:'production-refused'}});
  assert.equal(r.status,1);assert.equal(r.stdout,'');assert.match(r.stderr,/Nettoyage refusé/);assert.doesNotMatch(r.stderr,/PRIVATE|Bearer|encrypted|private_key/);
 }
});
