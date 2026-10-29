import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('account preparation CLI refuses production or invalid flags without printing secrets',()=>{
 for(const args of [[],['--create'],['--force'],['--links','/tmp/not-created-account-links.json']]){
  const r=spawnSync(process.execPath,['scripts/prepare-account.mjs',...args],{encoding:'utf8',input:'{}',env:{...process.env,RC_STAGE:'production',GOOGLE_CLOUD_PROJECT:'production-refused',GCLOUD_PROJECT:'production-refused'}});
  assert.equal(r.status,1);assert.equal(r.stdout,'');assert.match(r.stderr,/Préparation refusée/);assert.doesNotMatch(r.stderr,/oobCode|PRIVATE|private_key/);
 }
});
