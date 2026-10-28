import test from 'node:test';import assert from 'node:assert/strict';import {Readable} from 'node:stream';import {body} from '../../src/server/http.mjs';
const request=value=>{const r=Readable.from([Buffer.from(JSON.stringify(value))]);r.headers={'content-type':'application/json'};return r;};
test('annual planning can opt into a bounded larger body while other routes retain 4 KiB',async()=>{
 const input={text:'é'.repeat(3000)};await assert.rejects(body(request({input}),['input']),{status:413});assert.deepEqual(await body(request({input}),['input'],131072),{input});
 await assert.rejects(body(request({input:'é'.repeat(65536)}),['input'],131072),{status:413});
 await assert.rejects(body(request({input,unexpected:true}),['input'],131072),{status:400});
});

test('multibyte names survive a network chunk boundary',async()=>{
 const value={input:'Équipe'},bytes=Buffer.from(JSON.stringify(value)),boundary=bytes.indexOf(Buffer.from('É'))+1;
 const r=Readable.from([bytes.subarray(0,boundary),bytes.subarray(boundary)]);r.headers={'content-type':'application/json'};
 assert.deepEqual(await body(r,['input'],131072),value);
});

test('optional signup preferences preserve old payloads without allowing scope injection or missing identity',async()=>{
 const keys=['token','displayName'],optional=['preferences'],base={token:'example',displayName:'Camille'};
 assert.deepEqual(await body(request(base),keys,4096,optional),base);
 assert.deepEqual(await body(request({...base,preferences:null}),keys,4096,optional),{...base,preferences:null});
 await assert.rejects(body(request({...base,tenantId:'foreign'}),keys,4096,optional),{status:400});
 await assert.rejects(body(request({preferences:null}),keys,4096,optional),{status:400});
 await assert.rejects(body(request({...base,preferences:null}),keys),{status:400});
});
