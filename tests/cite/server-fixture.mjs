import assert from 'node:assert/strict';
import {createCiteEconomyService} from '../../src/server/cite-economy.mjs';import {createEconomy} from '../../src/cite/economy.ts';import {config,scope} from './fixture.mjs';
Object.assign(process.env,{GCLOUD_PROJECT:'demo-rc-voyage',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'});
export function fixture(){
 const c=config(3),s=scope(c),data=new Map(),privatePath=`tenants/${c.tenantId}/citeSeasons/${c.seasonId}/privateEconomy/main`,memberPath=uid=>`tenants/${c.tenantId}/members/${uid}`;let date=c.weeks[0].start,queue=Promise.resolve();
 data.set(privatePath,{state:createEconomy(c),preserve:'metadata'});
 for(const [uid,familyId]of [['person-0-0','family-0'],['person-1-0','family-1'],['person-2-0','family-2']])data.set(memberPath(uid),{uid,tenantId:c.tenantId,active:true,citeAssignments:[{seasonId:c.seasonId,familyId}]});
 data.set(memberPath('manager'),{uid:'manager',tenantId:c.tenantId,active:true,citeSeasonManagement:[c.seasonId]});
 const adapter={auth:{app:{options:{projectId:'demo-rc-voyage'}},verifyIdToken:async(token,revoked)=>{assert.equal(revoked,true);if(![...c.memberships.map(m=>m.uid),'manager'].includes(token))throw Error();return {uid:token,admin:true,tenantId:'untrusted-claim'};}},db:{projectId:'demo-rc-voyage',doc:path=>({path}),runTransaction:fn=>{const result=queue.then(async()=>{const writes=[];const value=await fn({get:async r=>({exists:data.has(r.path),data:()=>structuredClone(data.get(r.path))}),set:(r,v)=>writes.push([r.path,structuredClone(v)])});for(const [k,v]of writes)data.set(k,v);return value;});queue=result.catch(()=>{});return result;}}};
 return {adapter,c,s,data,privatePath,memberPath,today:()=>date,service:createCiteEconomyService(adapter,{today:()=>date}),setDate:d=>date=d};
}
