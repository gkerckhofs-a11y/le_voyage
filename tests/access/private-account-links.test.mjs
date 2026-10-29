import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,stat,rm,access} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {writePrivateAccountLinks} from '../../src/server/private-account-links.mjs';
test('account action links are written privately without overwrite and failed generation leaves no output',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'account-links-'));t.after(()=>rm(dir,{recursive:true,force:true}));const path=join(dir,'links.json'),value={verificationUrl:'PRIVATE-VERIFY',passwordSetupUrl:'PRIVATE-PASSWORD'};
 assert.equal(await writePrivateAccountLinks(path,async()=>value),path);assert.deepEqual(JSON.parse(await readFile(path,'utf8')),value);assert.equal((await stat(path)).mode&0o777,0o600);
 await assert.rejects(writePrivateAccountLinks(path,()=>assert.fail('must reserve before generation')),{code:'EEXIST'});assert.deepEqual(JSON.parse(await readFile(path,'utf8')),value);
 const failed=join(dir,'failed.json');await assert.rejects(writePrivateAccountLinks(failed,async()=>{throw Error('generation failed');}));await assert.rejects(access(failed),{code:'ENOENT'});
});
