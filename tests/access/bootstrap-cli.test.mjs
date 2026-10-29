import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('initial access command rejects production and invalid arguments before credentials or writes',()=>{
 for(const args of [[],['--apply'],['--force']]){
  const r=spawnSync(process.execPath,['scripts/bootstrap-access.mjs',...args],{encoding:'utf8',input:'{}',env:{...process.env,RC_STAGE:'production',GOOGLE_CLOUD_PROJECT:'production-refused',GCLOUD_PROJECT:'production-refused'}});
  assert.equal(r.status,1);assert.equal(r.stdout,'');assert.match(r.stderr,/Préparation refusée/);assert.doesNotMatch(r.stderr,/private_key|credential|token/i);
 }
});
