import {createHash} from 'node:crypto';
import {assertTestAdapter} from './test-environment.mjs';
const fail=s=>Object.assign(Error('Session cleanup refused'),{status:s});
/** Explicit operator maintenance only. Never exposed to tenant users or scheduled implicitly. */
export function createSessionMaintenance(adapter,{now=Date.now}={}){
 assertTestAdapter(adapter);const db=adapter.db;
 const validate=input=>{if(!input||Object.keys(input).sort().join(',')!=='cutoff,limit'||!Number.isSafeInteger(input.cutoff)||input.cutoff<0||input.cutoff>now()||!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>100)throw fail(400);};
 const query=input=>db.collection('serverSessions').where('expires','<=',input.cutoff).orderBy('expires').limit(input.limit+1);
 function project(input,snapshot){
  const docs=snapshot.docs.slice(0,input.limit);
  for(const doc of docs){const d=doc.data();if(!Number.isSafeInteger(d.expires)||d.expires<0||d.expires>input.cutoff||typeof d.version!=='string')throw fail(409);}
  const fingerprint={projectId:db.projectId,cutoff:input.cutoff,limit:input.limit,records:docs.map(d=>({id:d.id,version:d.data().version,expires:d.data().expires,updated:{seconds:d.updateTime.seconds,nanoseconds:d.updateTime.nanoseconds}}))};
  return {cutoff:input.cutoff,limit:input.limit,count:docs.length,more:snapshot.size>input.limit,digest:createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex')};
 }
 return {
  async preview(input){validate(input);return project(input,await query(input).get());},
  async apply(input,expectedDigest){
   validate(input);if(typeof expectedDigest!=='string'||!/^[a-f0-9]{64}$/.test(expectedDigest))throw fail(400);
   const marker=db.doc('sessionMaintenance/'+expectedDigest);
   return db.runTransaction(async tx=>{
    validate(input);const old=await tx.get(marker);
    if(old.exists){const d=old.data();if(d.cutoff!==input.cutoff||d.limit!==input.limit)throw fail(409);return {applied:false,deleted:0};}
    const snapshot=await tx.get(query(input)),preview=project(input,snapshot);if(preview.digest!==expectedDigest)throw fail(409);
    for(const doc of snapshot.docs.slice(0,input.limit))tx.delete(doc.ref);
    tx.create(marker,{cutoff:input.cutoff,limit:input.limit,deleted:preview.count,recordedAt:new Date(now()).toISOString()});
    return {applied:true,deleted:preview.count,more:preview.more};
   });
  }
 };
}
