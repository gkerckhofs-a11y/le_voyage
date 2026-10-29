import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('isolated staging cannot silently use the public emulator encryption key',()=>{
 const project='rc-voyage-test-20261027',env={...process.env,GOOGLE_CLOUD_PROJECT:project,GCLOUD_PROJECT:project,RC_STAGE:'isolated-test',RC_ALLOWED_ORIGINS:`https://${project}.web.app`,RC_TEST_ACCESS_PASSWORD:'a'.repeat(40),RC_TEST_AUTH_PASSWORD:'b'.repeat(40),RC_FIREBASE_API_KEY:'c'.repeat(39),RC_SESSION_ENCRYPTION_KEY:''};delete env.FIRESTORE_EMULATOR_HOST;delete env.FIREBASE_AUTH_EMULATOR_HOST;
 const script=`import assert from 'node:assert/strict';import {createSessionStore} from './src/server/session-store.mjs';const adapter={auth:{app:{options:{projectId:'${project}'}}},db:{projectId:'${project}'}};assert.throws(()=>createSessionStore(adapter),/256-bit session encryption key/);assert.doesNotThrow(()=>createSessionStore(adapter,{key:'42'.repeat(32)}));`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',script],{env,encoding:'utf8'});assert.equal(child.status,0,child.stderr);
});
