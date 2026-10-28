import {createHash} from 'node:crypto';
const fail=status=>Object.assign(Error('Proposal unavailable'),{status});
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const baseKeys=['tenantId','campaignId','teamId','milestoneNumber'];
function validate(input,action){
 const keys=[...baseKeys,...(action==='read'?[]:['revision','mutationId','reason',...(action==='save'?['fingerprint','packagingCents','transportCents']:[])])];
 if(!input||Object.keys(input).sort().join(',')!==keys.sort().join(','))throw fail(400);
 for(const k of baseKeys.slice(0,3))if(typeof input[k]!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input[k]))throw fail(400);
 if(!Number.isSafeInteger(input.milestoneNumber)||input.milestoneNumber<1||input.milestoneNumber>100)throw fail(400);
 if(action==='read')return;
 if(!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.mutationId!=='string'||!/^[a-f0-9-]{36}$/.test(input.mutationId)||typeof input.reason!=='string'||input.reason.trim().length<3||input.reason.length>240||/[\u0000-\u001f]/.test(input.reason))throw fail(400);
 if(action==='save'&&(typeof input.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(input.fingerprint)||['packagingCents','transportCents'].some(k=>!Number.isSafeInteger(input[k])||input[k]<0||input[k]>100000000)))throw fail(400);
}
export function createGiftProposals({db,actor,check,campaignRef,build,now}){
 const refFor=i=>campaignRef(i).collection('giftProposals').doc(hash([i.teamId,i.milestoneNumber]));
 const publicRecord=r=>{if(!r)return null;const {fingerprint,...proposal}=r.proposal;return {...r,proposal};};
 async function write(header,input,action){validate(input,action);const uid=await actor(header);return db.runTransaction(async tx=>{
  await check(tx,uid,input);const ref=refFor(input),old=(await tx.get(ref)).data(),auditRef=ref.collection('history').doc(input.mutationId),prior=(await tx.get(auditRef)).data(),digest=hash([action,Object.keys(input).sort().map(k=>[k,input[k]])]);
  if(prior){if(prior.digest!==digest)throw fail(409);return {revision:prior.record.revision,alreadyApplied:true};}
  if((old?.revision??0)!==input.revision||(old?.revision??0)>=20||action==='review'&&!old)throw fail(409);
  const fees=action==='save'?input:old.proposal,current=await build(tx,{...Object.fromEntries(baseKeys.map(k=>[k,input[k]])),packagingCents:fees.packagingCents,transportCents:fees.transportCents});
  if(current.fingerprint!==(action==='save'?input.fingerprint:old.proposal.fingerprint))throw fail(409);
  if(action==='review'&&(!current.complete||old.review))throw fail(409);
  const revision=(old?.revision??0)+1,at=now(),record={teamId:input.teamId,milestoneNumber:input.milestoneNumber,revision,proposal:action==='save'?current:old.proposal,review:action==='review'?{actor:uid,at}:null,updatedAt:at,actor:uid,reason:input.reason.trim()};
  tx.set(ref,record);tx.create(auditRef,{digest,action,record});return {revision,alreadyApplied:false};
 });}
 return {
 saveProposal:(header,input)=>write(header,input,'save'),
 reviewProposal:(header,input)=>write(header,input,'review'),
 async readProposal(header,input){validate(input,'read');const uid=await actor(header);return db.runTransaction(async tx=>{await check(tx,uid,input);const ref=refFor(input),record=(await tx.get(ref)).data();if(!record)return {record:null,history:[],current:false};let current=false;try{current=(await build(tx,{...input,packagingCents:record.proposal.packagingCents,transportCents:record.proposal.transportCents})).fingerprint===record.proposal.fingerprint;}catch(e){if(![404,409,422].includes(e.status))throw e;}
 const history=(await tx.get(ref.collection('history').orderBy('record.revision','desc').limit(20))).docs.map(d=>{const h=d.data();return {action:h.action,...publicRecord(h.record)};});return {record:publicRecord(record),history,current};});}
 };
}
