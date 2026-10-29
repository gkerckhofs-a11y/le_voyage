import {createHash} from 'node:crypto';
import {costKeys,normalizeAmendment,planAmendment} from './gift-amendments.mjs';
import {proposalDocumentId} from './gift-proposals.mjs';
const fail=status=>Object.assign(Error('Reservation unavailable'),{status});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scopeKeys=['tenantId','campaignId','teamId','milestoneNumber'];
function validate(input,action){
 const keys=action==='preview-cancellation-stock'?[...scopeKeys,'revision']:[...scopeKeys,'mutationId','reason',...(action==='amend-cancelled-order'?['revision','reference','kind','documentConfirmed',...costKeys]:action==='reserve'?['proposalRevision','conditions']:action==='authorize'?['revision','reference','riskAccepted']:action==='confirm'?['revision','reference','confirmationAccepted']:action==='consume'?['revision','consumptionAccepted']:action==='request-cancellation'?['revision','reference','requestAcknowledged']:action==='regularize-cancellation-stock'?['revision','inventoryReference','inventoryConfirmed','fingerprint']:action==='resolve-cancellation'?['revision','reference','outcome','responseAcknowledged']:['revision'])];
 if(!input||Object.keys(input).sort().join(',')!==keys.sort().join(','))throw fail(400);
 for(const key of scopeKeys.slice(0,3))if(typeof input[key]!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input[key]))throw fail(400);
 for(const key of ['milestoneNumber',action==='reserve'?'proposalRevision':'revision'])if(!Number.isSafeInteger(input[key])||input[key]<1||input[key]>1000)throw fail(400);
 if(input.milestoneNumber>100)throw fail(400);
 if(action==='preview-cancellation-stock')return;
 if(action==='regularize-cancellation-stock'&&(input.inventoryConfirmed!==true||typeof input.inventoryReference!=='string'||input.inventoryReference.trim().length<3||input.inventoryReference.length>120||/[\u0000-\u001f]/.test(input.inventoryReference)||typeof input.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(input.fingerprint)))throw fail(400);
 if(['authorize','confirm'].includes(action)&&((action==='authorize'?input.riskAccepted:input.confirmationAccepted)!==true||typeof input.reference!=='string'||input.reference.trim().length<3||input.reference.length>120||/[\u0000-\u001f]/.test(input.reference)))throw fail(400);
 if(action==='request-cancellation'&&(input.requestAcknowledged!==true||typeof input.reference!=='string'||input.reference.trim().length<3||input.reference.length>120||/[\u0000-\u001f]/.test(input.reference)))throw fail(400);
 if(action==='resolve-cancellation'&&(!['accepted','refused'].includes(input.outcome)||input.responseAcknowledged!==true||typeof input.reference!=='string'||input.reference.trim().length<3||input.reference.length>120||/[\u0000-\u001f]/.test(input.reference)))throw fail(400);
 if(action==='amend-cancelled-order'){
  if(!['fee','credit'].includes(input.kind)||input.documentConfirmed!==true)throw fail(400);
  const {delta}=cancellationAmendment(input);if(costKeys.some(k=>input.kind==='fee'?delta[k]<0:delta[k]>0))throw fail(400);
 }
 if(action==='consume'&&input.consumptionAccepted!==true)throw fail(400);
 if(input.milestoneNumber>100||typeof input.mutationId!=='string'||!/^[a-f0-9-]{36}$/.test(input.mutationId))throw fail(400);
 for(const key of action==='reserve'?['reason','conditions']:['reason'])if(typeof input[key]!=='string'||input[key].trim().length<3||input[key].length>(key==='conditions'?600:240)||/[\u0000-\u001f]/.test(input[key]))throw fail(400);
}
function cancellationAmendment(input){return normalizeAmendment({...Object.fromEntries(['tenantId','campaignId','revision','mutationId','reason','reference',...costKeys].map(k=>[k,input[k]])),id:proposalDocumentId(input.teamId,input.milestoneNumber)});}
// counts includes held and declared consumed units pending reconciliation; Master is never decremented here.
export function createGiftReservations({db,actor,check,campaignRef,build,now,catalogDocument}){
 const ledgerRef=db.doc(catalogDocument).collection('reservationLedger').doc('main');
 async function cancellationStockPreview(tx,uid,input,old,ledger,reservationId){
  const c=old?.cancellationRequest;
  if(!old||old.status!=='ordered'||old.teamId!==input.teamId||old.milestoneNumber!==input.milestoneNumber||old.revision!==input.revision||old.revision>=1000||!old.order||old.consumption||c?.status!=='accepted'||c.stockRegularization||c.orderDigest!==hash(old.order)||c.response?.outcome!=='accepted'||c.response.orderDigest!==hash(old.order))throw fail(409);
  if(old.fulfillmentLink){const id=old.fulfillmentLink.id;if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw fail(409);const f=(await tx.get(campaignRef(input).collection('giftFulfillments').doc(id))).data();if(!attachedAnticipatedOrder({...old,reservationId},f,id)||f.status==='delivered'||f.status==='incident'&&f.resumeStatus==='delivered')throw fail(409);}
  const catalog=(await tx.get(db.doc(catalogDocument))).data();
  if(!catalog||!Number.isSafeInteger(catalog.revision)||!Array.isArray(catalog.products)||!Array.isArray(old.order.lines)||!old.order.lines.length)throw fail(409);
  const seen=new Set(),lines=old.order.lines.map(line=>{
   const key=hash(line.sku),count=ledger.counts?.[key]??0,committed=ledger.committed?.[key]??0,consumed=ledger.consumed?.[key]??0;
   if(seen.has(key)||!Number.isSafeInteger(line.quantity)||line.quantity<1||!Number.isSafeInteger(count)||!Number.isSafeInteger(committed)||committed<line.quantity||!Number.isSafeInteger(consumed)||consumed<0||count<committed+consumed)throw fail(409);seen.add(key);
   const matches=catalog.products.filter(p=>(catalog.masterById?.[p.id]?.sku??p.id)===line.sku),stock=matches.length===1?catalog.masterById?.[matches[0].id]?.stockQuantity:null;
   if(!Number.isSafeInteger(stock)||stock<0)throw fail(422);
   return {sku:line.sku,name:line.name,quantity:line.quantity,declaredStock:stock,countBefore:count,countAfter:count-line.quantity,committedBefore:committed,committedAfter:committed-line.quantity,consumed,availableBefore:Math.max(0,stock-count),availableAfter:Math.max(0,stock-count+line.quantity),shortfallAfter:Math.max(0,count-line.quantity-stock)};
  });
  const snapshot={version:1,catalogRevision:catalog.revision,orderDigest:hash(old.order),lines};
  return {...snapshot,fingerprint:hash([uid,scopeKeys.map(k=>input[k]),old.revision,c,snapshot])};
 }
 async function write(header,input,action){validate(input,action);const uid=await actor(header);return db.runTransaction(async tx=>{
  await check(tx,uid,input);const ref=campaignRef(input).collection('giftReservations').doc(proposalDocumentId(input.teamId,input.milestoneNumber));
  const old=(await tx.get(ref)).data(),auditRef=ref.collection('history').doc(input.mutationId),prior=(await tx.get(auditRef)).data(),digest=hash([uid,action,Object.keys(input).sort().map(k=>[k,input[k]])]);
  if(prior){if(prior.digest!==digest)throw fail(409);return {revision:prior.record.revision,alreadyApplied:true};}
  if((old?.revision??0)>=1000||['reserve','authorize','confirm'].includes(action)&&(old?.revision??0)>=998)throw fail(409);
  if(action==='request-cancellation'&&(old?.revision??0)>=999)throw fail(409);
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
  }else if(['authorize','confirm'].includes(action)){
   if(!old||old.status!==(action==='confirm'?'authorized':'reserved')||old.revision!==input.revision)throw fail(409);
   const saved=(await tx.get(campaignRef(input).collection('giftProposals').doc(proposalDocumentId(input.teamId,input.milestoneNumber)))).data();
   if(!saved?.review||saved.teamId!==input.teamId||saved.milestoneNumber!==input.milestoneNumber||saved.revision!==old.proposalRevision||saved.proposal.fingerprint!==old.proposal.fingerprint)throw fail(409);
   const current=await build(tx,{...Object.fromEntries(scopeKeys.map(k=>[k,input[k]])),packagingCents:old.proposal.packagingCents,transportCents:old.proposal.transportCents});
   if(!current.complete||current.fingerprint!==old.proposal.fingerprint)throw fail(409);
   if(!Number.isSafeInteger(current.totalCostCents)||current.totalCostCents<0||current.totalCostCents>current.allocatedCents)throw fail(422);
   for(const line of current.lines){const reserved=counts[hash(line.sku)];if(!Number.isSafeInteger(reserved)||reserved<line.quantity||!Number.isSafeInteger(line.declaredStock)||reserved>line.declaredStock)throw fail(422);}
   if(action==='confirm'){
    if(await acquiredAnticipatedOrder(tx,campaignRef(input),{teamId:input.teamId,milestoneId:current.milestoneId}))throw fail(409);
    if(!old.authorization||old.authorization.revokedAt||old.authorization.amountCents!==current.totalCostCents||old.authorization.allocatedCents!==current.allocatedCents)throw fail(409);
    const committed={...ledger.committed};for(const line of current.lines){const key=hash(line.sku),quantity=committed[key]??0;if(!Number.isSafeInteger(quantity)||quantity<0||quantity+line.quantity+(ledger.consumed?.[key]??0)>counts[key])throw fail(409);committed[key]=quantity+line.quantity;}ledger.committed=committed;
    record={...old,status:'ordered',order:{version:1,source:'operator-confirmed-anticipation',reference:input.reference.trim(),at:now(),actor:uid,authorizationReference:old.authorization.reference,authorizationRevision:old.revision,proposalRevision:old.proposalRevision,catalogRevision:current.catalogRevision,dueDate:current.dueDate,allocatedCents:current.allocatedCents,purchaseCents:current.purchaseCents,packagingCents:current.packagingCents,transportCents:current.transportCents,totalCostCents:current.totalCostCents,conditions:old.conditions,lines:current.lines.map(l=>Object.fromEntries(['sku','name','supplier','quantity','unitPurchaseCents','priceBasis','vatBasisPoints','restrictions'].map(k=>[k,l[k]])))}};
   }else{
   record={...old,status:'authorized',authorization:{reference:input.reference.trim(),at:now(),actor:uid,reservationRevision:old.revision,proposalRevision:old.proposalRevision,amountCents:current.totalCostCents,allocatedCents:current.allocatedCents,riskAccepted:true}};
   }
  }else if(['request-cancellation','withdraw-cancellation'].includes(action)){
   if(!old||old.status!=='ordered'||!old.order||old.revision!==input.revision)throw fail(409);
   if(action==='withdraw-cancellation'){
    if(old.cancellationRequest?.status!=='pending')throw fail(409);
    record={...old,cancellationRequest:{...old.cancellationRequest,status:'withdrawn',withdrawnAt:now(),withdrawnBy:uid,withdrawalReason:input.reason.trim()}};
   }else{
    if(['pending','accepted'].includes(old.cancellationRequest?.status)||old.consumption)throw fail(409);
    if(old.fulfillmentLink){const id=old.fulfillmentLink.id;if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw fail(409);const fulfillment=(await tx.get(campaignRef(input).collection('giftFulfillments').doc(id))).data();if(!attachedAnticipatedOrder({...old,reservationId:ref.id},fulfillment,id)||fulfillment.status==='delivered'||fulfillment.status==='incident'&&fulfillment.resumeStatus==='delivered')throw fail(409);}
    record={...old,cancellationRequest:{status:'pending',reference:input.reference.trim(),at:now(),actor:uid,reason:input.reason.trim(),orderDigest:hash(old.order)}};
   }
  }else if(action==='resolve-cancellation'){
   if(!old||old.status!=='ordered'||!old.order||old.revision!==input.revision||old.consumption||old.cancellationRequest?.status!=='pending'||old.cancellationRequest.orderDigest!==hash(old.order))throw fail(409);
   if(old.fulfillmentLink){const id=old.fulfillmentLink.id;if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw fail(409);const fulfillment=(await tx.get(campaignRef(input).collection('giftFulfillments').doc(id))).data();if(!attachedAnticipatedOrder({...old,reservationId:ref.id},fulfillment,id)||fulfillment.status==='delivered')throw fail(409);}
   record={...old,cancellationRequest:{...old.cancellationRequest,status:input.outcome,response:{source:'operator-declared-supplier-response',outcome:input.outcome,reference:input.reference.trim(),at:now(),actor:uid,reason:input.reason.trim(),scope:'whole-order',orderDigest:hash(old.order)}}};
  }else if(action==='amend-cancelled-order'){
   const c=old?.cancellationRequest;
   // Attached orders already have their own amendments: never create a second financial ledger.
   if(!old||old.status!=='ordered'||!old.order||old.order.version!==1||old.revision!==input.revision||old.fulfillmentLink||old.consumption||c?.status!=='accepted'||c.orderDigest!==hash(old.order)||c.response?.outcome!=='accepted'||c.response.orderDigest!==hash(old.order))throw fail(409);
   const normalized=cancellationAmendment(input),finance=c.finance,entries=finance?.entries??[];
   if(!Array.isArray(entries)||finance&&(!Number.isSafeInteger(finance.adjustment?.count)||entries.length!==finance.adjustment.count))throw fail(409);
   const {before,after,adjustment}=planAmendment({...old.order,confirmation:old.order,financialAdjustment:finance?.adjustment},normalized.delta);
   const entry={revision:old.revision+1,at:now(),actor:uid,reference:normalized.reference,reason:normalized.reason,kind:input.kind,delta:normalized.delta,before,after,orderDigest:hash(old.order)};
   record={...old,cancellationRequest:{...c,finance:{source:'operator-declared-cancellation-costs',adjustment,effectiveCosts:after,entries:[...entries,entry]}}};
  }else if(action==='regularize-cancellation-stock'){
   const preview=await cancellationStockPreview(tx,uid,input,old,ledger,ref.id);if(preview.fingerprint!==input.fingerprint)throw fail(409);
   const committed={...ledger.committed};for(const line of preview.lines){const key=hash(line.sku);counts[key]=line.countAfter;committed[key]=line.committedAfter;if(!counts[key])delete counts[key];if(!committed[key])delete committed[key];}ledger.committed=committed;
   record={...old,cancellationRequest:{...old.cancellationRequest,stockRegularization:{...preview,source:'operator-confirmed-inventory-after-cancellation',at:now(),actor:uid,reason:input.reason.trim(),inventoryReference:input.inventoryReference.trim(),inventoryConfirmed:true}}};
  }else if(action==='consume'){
   if(['pending','accepted'].includes(old?.cancellationRequest?.status))throw fail(409);
   if(!old||old.status!=='ordered'||old.revision!==input.revision||old.consumption||!old.fulfillmentLink||!old.order)throw fail(409);
   const id=old.fulfillmentLink.id;if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw fail(409);
   const fulfillment=(await tx.get(campaignRef(input).collection('giftFulfillments').doc(id))).data();
   if(fulfillment?.status!=='delivered'||!fulfillment.deliveryReference||!attachedAnticipatedOrder({...old,reservationId:ref.id},fulfillment,id))throw fail(409);
   const consumed={...ledger.consumed},committed={...ledger.committed},seen=new Set();
   for(const line of old.order.lines){const key=hash(line.sku),used=consumed[key]??0,held=committed[key]??0,total=counts[key];
    if(seen.has(key)||!Number.isSafeInteger(line.quantity)||line.quantity<1||!Number.isSafeInteger(used)||used<0||!Number.isSafeInteger(held)||held<line.quantity||!Number.isSafeInteger(total)||total<held+used)throw fail(409);
    seen.add(key);consumed[key]=used+line.quantity;committed[key]=held-line.quantity;if(!committed[key])delete committed[key];
   }
   if(!seen.size)throw fail(409);ledger.consumed=consumed;ledger.committed=committed;
   record={...old,consumption:{version:1,source:'operator-declared-after-delivery',at:now(),actor:uid,fulfillmentId:id,fulfillmentRevision:fulfillment.revision,deliveryReference:fulfillment.deliveryReference,orderDigest:hash(old.order),lines:old.order.lines.map(l=>({sku:l.sku,quantity:l.quantity}))}};
  }else if(action==='revoke'){
   if(!old||old.status!=='authorized'||old.revision!==input.revision||!old.authorization)throw fail(409);
   // Withdraw internal permission, not a supplier order; keep quantities held.
   record={...old,status:'reserved',authorization:{...old.authorization,revokedAt:now(),revokedBy:uid}};
  }else{
   if(!old||old.status!=='reserved'||old.revision!==input.revision)throw fail(409);
   // Release still works after acquisition, catalog archival or context changes.
   for(const line of old.proposal.lines){const key=hash(line.sku),reserved=counts[key];if(!Number.isSafeInteger(reserved)||reserved-line.quantity<((ledger.committed?.[key]??0)+(ledger.consumed?.[key]??0)))throw fail(409);counts[key]=reserved-line.quantity;if(counts[key]===0)delete counts[key];}
   record={...old,status:'released'};
  }
  const revision=(old?.revision??0)+1;record={...record,revision,updatedAt:now(),actor:uid,reason:input.reason.trim()};
  if(['reserve','release','confirm','consume','regularize-cancellation-stock'].includes(action))tx.set(ledgerRef,{...ledger,counts});tx.set(ref,record);tx.create(auditRef,{digest,action,record});return {revision,alreadyApplied:false};
 });}
 return {
 async previewCancellationStock(header,input){validate(input,'preview-cancellation-stock');const uid=await actor(header);return db.runTransaction(async tx=>{await check(tx,uid,input);const ref=campaignRef(input).collection('giftReservations').doc(proposalDocumentId(input.teamId,input.milestoneNumber)),old=(await tx.get(ref)).data(),ledger=(await tx.get(ledgerRef)).data()??{};return cancellationStockPreview(tx,uid,input,old,ledger,ref.id);});},
 amendCancelledOrder:(header,input)=>write(header,input,'amend-cancelled-order'),
 regularizeCancellationStock:(header,input)=>write(header,input,'regularize-cancellation-stock'),
 resolveOrderCancellation:(header,input)=>write(header,input,'resolve-cancellation'),
 requestOrderCancellation:(header,input)=>write(header,input,'request-cancellation'),
 withdrawOrderCancellation:(header,input)=>write(header,input,'withdraw-cancellation'),
 reserveProposal:(header,input)=>write(header,input,'reserve'),
 consumeAnticipatedOrder:(header,input)=>write(header,input,'consume'),
 confirmAnticipatedOrder:(header,input)=>write(header,input,'confirm'),
 authorizePurchase:(header,input)=>write(header,input,'authorize'),
 revokePurchaseAuthorization:(header,input)=>write(header,input,'revoke'),
 releaseReservation:(header,input)=>write(header,input,'release'),
 async reservations(header){const uid=await actor(header);return db.runTransaction(async tx=>{
  const scopes=await check(tx,uid),rows=[],ledger=(await tx.get(ledgerRef)).data(),catalog=(await tx.get(db.doc(catalogDocument))).data();
  for(const scope of scopes){const records=await tx.get(campaignRef(scope).collection('giftReservations').limit(201));if(records.size>200||rows.length+records.size>200)throw fail(409);
   for(const doc of records.docs){const r=doc.data();const lines=r.proposal.lines.map(l=>{
    const product=catalog?.products.find(p=>(catalog.masterById?.[p.id]?.sku??p.id)===l.sku),stock=product?catalog.masterById?.[product.id]?.stockQuantity:null,reserved=ledger?.counts?.[hash(l.sku)]??0;
    return {sku:l.sku,name:l.name,quantity:l.quantity,committedQuantity:ledger?.committed?.[hash(l.sku)]??0,consumedQuantity:ledger?.consumed?.[hash(l.sku)]??0,declaredStock:Number.isSafeInteger(stock)?stock:null,unreservedQuantity:Number.isSafeInteger(stock)?Math.max(0,stock-reserved):null,shortfall:Number.isSafeInteger(stock)?Math.max(0,reserved-stock):null};
   });rows.push({...scope,teamId:r.teamId,milestoneNumber:r.milestoneNumber,status:r.status,revision:r.revision,proposalRevision:r.proposalRevision,conditions:r.conditions,reservedAt:r.reservedAt,reservedBy:r.reservedBy,updatedAt:r.updatedAt,actor:r.actor,reason:r.reason,potentialExposureCents:r.proposal.totalCostCents,authorization:r.authorization??null,order:r.order??null,fulfillmentLink:r.fulfillmentLink??null,consumption:r.consumption??null,cancellationRequest:r.cancellationRequest??null,lines});
   }
  }return {rows,generatedAt:now()};
 });}
 };
}

// Match stable team + milestone identity, independent of later milestone reordering.
export async function acquiredAnticipatedOrder(tx,campaignRef,entitlement){
 const records=await tx.get(campaignRef.collection('giftReservations').where('teamId','==',entitlement.teamId).limit(101));if(records.size>100)throw fail(409);
 const matches=records.docs.map(d=>({...d.data(),reservationId:d.id})).filter(r=>r.status==='ordered'&&r.proposal?.milestoneId===entitlement.milestoneId);
 if(matches.length>1)throw fail(409);if(!matches.length)return null;
 const record=matches[0];if(!record.order)throw fail(409);
 return {reservationId:record.reservationId,reservationRevision:record.revision,order:record.order,fulfillmentLink:record.fulfillmentLink??null,cancellationRequest:record.cancellationRequest??null};
}

export const anticipatedOrderDigest=order=>hash(order);
export function attachedAnticipatedOrder(value,stored,id){
 return !!value&&value.fulfillmentLink?.id===id&&stored?.confirmation?.source==='anticipated-order'&&stored.anticipatedOrderLink?.reservationId===value.reservationId&&stored.anticipatedOrderLink?.orderDigest===hash(value.order);
}
