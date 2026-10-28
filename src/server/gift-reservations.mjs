import {createHash} from 'node:crypto';
import {proposalDocumentId} from './gift-proposals.mjs';
const fail=status=>Object.assign(Error('Reservation unavailable'),{status});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scopeKeys=['tenantId','campaignId','teamId','milestoneNumber'];
function validate(input,action){
 const keys=[...scopeKeys,'mutationId','reason',...(action==='reserve'?['proposalRevision','conditions']:action==='authorize'?['revision','reference','riskAccepted']:['revision'])];
 if(!input||Object.keys(input).sort().join(',')!==keys.sort().join(','))throw fail(400);
 for(const key of scopeKeys.slice(0,3))if(typeof input[key]!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input[key]))throw fail(400);
 for(const key of ['milestoneNumber',action==='reserve'?'proposalRevision':'revision'])if(!Number.isSafeInteger(input[key])||input[key]<1||input[key]>1000)throw fail(400);
 if(action==='authorize'&&(input.riskAccepted!==true||typeof input.reference!=='string'||input.reference.trim().length<3||input.reference.length>120||/[\u0000-\u001f]/.test(input.reference)))throw fail(400);
 if(input.milestoneNumber>100||typeof input.mutationId!=='string'||!/^[a-f0-9-]{36}$/.test(input.mutationId))throw fail(400);
 for(const key of action==='reserve'?['reason','conditions']:['reason'])if(typeof input[key]!=='string'||input[key].trim().length<3||input[key].length>(key==='conditions'?600:240)||/[\u0000-\u001f]/.test(input[key]))throw fail(400);
}
// A separate ledger: Master stock is a declared ceiling, never decremented here.
export function createGiftReservations({db,actor,check,campaignRef,build,now,catalogDocument}){
 const ledgerRef=db.doc(catalogDocument).collection('reservationLedger').doc('main');
 async function write(header,input,action){validate(input,action);const uid=await actor(header);return db.runTransaction(async tx=>{
  await check(tx,uid,input);const ref=campaignRef(input).collection('giftReservations').doc(proposalDocumentId(input.teamId,input.milestoneNumber));
  const old=(await tx.get(ref)).data(),auditRef=ref.collection('history').doc(input.mutationId),prior=(await tx.get(auditRef)).data(),digest=hash([uid,action,Object.keys(input).sort().map(k=>[k,input[k]])]);
  if(prior){if(prior.digest!==digest)throw fail(409);return {revision:prior.record.revision,alreadyApplied:true};}
  if((old?.revision??0)>=1000||['reserve','authorize'].includes(action)&&(old?.revision??0)>=998)throw fail(409);
  if(old&&(old.teamId!==input.teamId||old.milestoneNumber!==input.milestoneNumber))throw fail(409);
  const ledger=(await tx.get(ledgerRef)).data()??{counts:{}};const counts={...ledger.counts};let record;
  if(action==='reserve'){
   if(old&&old.status!=='released')throw fail(409);
   const saved=(await tx.get(campaignRef(input).collection('giftProposals').doc(proposalDocumentId(input.teamId,input.milestoneNumber)))).data();
   if(!saved||saved.teamId!==input.teamId||saved.milestoneNumber!==input.milestoneNumber||saved.revision!==input.proposalRevision||!saved.review||!saved.proposal.complete)throw fail(409);
   const current=await build(tx,{...Object.fromEntries(scopeKeys.map(k=>[k,input[k]])),packagingCents:saved.proposal.packagingCents,transportCents:saved.proposal.transportCents});
   if(current.fingerprint!==saved.proposal.fingerprint||!current.milestoneId||!current.lines.length)throw fail(409);
   const seen=new Set();for(const line of current.lines){const key=hash(line.sku),reserved=counts[key]??0;
    if(seen.has(key)||!Number.isSafeInteger(line.quantity)||line.quantity<1||!Number.isSafeInteger(line.declaredStock)||line.declaredStock<0||!Number.isSafeInteger(reserved)||reserved<0||reserved+line.quantity>line.declaredStock)throw fail(422);
    seen.add(key);counts[key]=reserved+line.quantity;
   }
   if(Object.keys(counts).length>1000)throw fail(409);
   record={teamId:input.teamId,milestoneNumber:input.milestoneNumber,proposalRevision:saved.revision,status:'reserved',conditions:input.conditions.trim(),reservedAt:now(),reservedBy:uid,proposal:saved.proposal};
  }else if(action==='authorize'){
   if(!old||old.status!=='reserved'||old.revision!==input.revision)throw fail(409);
   const saved=(await tx.get(campaignRef(input).collection('giftProposals').doc(proposalDocumentId(input.teamId,input.milestoneNumber)))).data();
   if(!saved?.review||saved.teamId!==input.teamId||saved.milestoneNumber!==input.milestoneNumber||saved.revision!==old.proposalRevision||saved.proposal.fingerprint!==old.proposal.fingerprint)throw fail(409);
   const current=await build(tx,{...Object.fromEntries(scopeKeys.map(k=>[k,input[k]])),packagingCents:old.proposal.packagingCents,transportCents:old.proposal.transportCents});
   if(!current.complete||current.fingerprint!==old.proposal.fingerprint)throw fail(409);
   if(!Number.isSafeInteger(current.totalCostCents)||current.totalCostCents<0||current.totalCostCents>current.allocatedCents)throw fail(422);
   for(const line of current.lines){const reserved=counts[hash(line.sku)];if(!Number.isSafeInteger(reserved)||reserved<line.quantity||!Number.isSafeInteger(line.declaredStock)||reserved>line.declaredStock)throw fail(422);}
   record={...old,status:'authorized',authorization:{reference:input.reference.trim(),at:now(),actor:uid,reservationRevision:old.revision,proposalRevision:old.proposalRevision,amountCents:current.totalCostCents,allocatedCents:current.allocatedCents,riskAccepted:true}};
  }else if(action==='revoke'){
   if(!old||old.status!=='authorized'||old.revision!==input.revision||!old.authorization)throw fail(409);
   // Withdraw internal permission, not a supplier order; keep quantities held.
   record={...old,status:'reserved',authorization:{...old.authorization,revokedAt:now(),revokedBy:uid}};
  }else{
   if(!old||old.status!=='reserved'||old.revision!==input.revision)throw fail(409);
   // Release still works after acquisition, catalog archival or context changes.
   for(const line of old.proposal.lines){const key=hash(line.sku),reserved=counts[key];if(!Number.isSafeInteger(reserved)||reserved<line.quantity)throw fail(409);counts[key]=reserved-line.quantity;if(counts[key]===0)delete counts[key];}
   record={...old,status:'released'};
  }
  const revision=(old?.revision??0)+1;record={...record,revision,updatedAt:now(),actor:uid,reason:input.reason.trim()};
  if(['reserve','release'].includes(action))tx.set(ledgerRef,{counts});tx.set(ref,record);tx.create(auditRef,{digest,action,record});return {revision,alreadyApplied:false};
 });}
 return {
 reserveProposal:(header,input)=>write(header,input,'reserve'),
 authorizePurchase:(header,input)=>write(header,input,'authorize'),
 revokePurchaseAuthorization:(header,input)=>write(header,input,'revoke'),
 releaseReservation:(header,input)=>write(header,input,'release'),
 async reservations(header){const uid=await actor(header);return db.runTransaction(async tx=>{
  const scopes=await check(tx,uid),rows=[],ledger=(await tx.get(ledgerRef)).data(),catalog=(await tx.get(db.doc(catalogDocument))).data();
  for(const scope of scopes){const records=await tx.get(campaignRef(scope).collection('giftReservations').limit(201));if(records.size>200||rows.length+records.size>200)throw fail(409);
   for(const doc of records.docs){const r=doc.data();const lines=r.proposal.lines.map(l=>{
    const product=catalog?.products.find(p=>(catalog.masterById?.[p.id]?.sku??p.id)===l.sku),stock=product?catalog.masterById?.[product.id]?.stockQuantity:null,reserved=ledger?.counts?.[hash(l.sku)]??0;
    return {sku:l.sku,name:l.name,quantity:l.quantity,declaredStock:Number.isSafeInteger(stock)?stock:null,unreservedQuantity:Number.isSafeInteger(stock)?Math.max(0,stock-reserved):null,shortfall:Number.isSafeInteger(stock)?Math.max(0,reserved-stock):null};
   });rows.push({...scope,teamId:r.teamId,milestoneNumber:r.milestoneNumber,status:r.status,revision:r.revision,proposalRevision:r.proposalRevision,conditions:r.conditions,reservedAt:r.reservedAt,reservedBy:r.reservedBy,updatedAt:r.updatedAt,actor:r.actor,reason:r.reason,potentialExposureCents:r.proposal.totalCostCents,authorization:r.authorization??null,lines});
   }
  }return {rows,generatedAt:now()};
 });}
 };
}
