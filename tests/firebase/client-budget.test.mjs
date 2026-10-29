import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';
import {createClientBudget} from '../../src/server/client-budget.mjs';
import {createDirectorProgress} from '../../src/server/director-progress.mjs';
import {newDemo} from '../../src/server/demo-service.mjs';
async function setup(t){const a=createFirebaseEmulatorAdapter();t.after(()=>a.close());const uid='budget-'+randomUUID(),email=uid+'@example.test',password='Fictitious-test-42!';await a.auth.createUser({uid,email,password});const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});const header='Bearer '+(await r.json()).idToken;
 const record=newDemo(),scope={tenantId:uid,campaignId:record.ledger.state.config.campaignId,teamId:'explorateurs'};record.ledger.state.config.tenantId=uid;
 const campaign=a.db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),member=a.db.doc(`tenants/${scope.tenantId}/members/${uid}`),grant={uid,tenantId:uid,active:true,assignments:[{campaignId:scope.campaignId,teamId:scope.teamId}],organizerCampaigns:[scope.campaignId],directorCampaigns:[scope.campaignId],canPlanCampaign:true};await campaign.set({payload:JSON.stringify(record)});await member.set(grant);
 return {a,header,scope,campaign,member,grant,service:createClientBudget(a),director:createDirectorProgress(a),payload:{revision:0,mutationId:randomUUID(),reason:'Private reason not for director',confirmed:true,budget:{basis:'HT',asOf:'2026-10-29',reference:'CLIENT-2026-01',allocatedCents:100000,committedCents:60000,consumedCents:20000}}};
}
test('published client budget is explicit, versioned and independent of draft, campaign and purchase data',async t=>{
 const h=await setup(t),before=(await h.campaign.get()).data();await h.campaign.collection('annualDrafts').doc('next').set({budgetCents:999999,private:'DO-NOT-PUBLISH'});
 assert.deepEqual(await h.service.read(h.header,h.scope),{status:'unavailable'});
 const first=await h.service.publish(h.header,h.scope,h.payload);assert.equal(first.remainingCents,40000);assert.equal(first.revision,1);
 const view=(await h.director.read(h.header,h.scope)).clientBudget;assert.deepEqual(view,first);
 assert.deepEqual(Object.keys(view).sort(),['allocatedCents','asOf','basis','committedCents','consumedCents','currency','reference','remainingCents','revision','source','status']);assert.doesNotMatch(JSON.stringify(view),/Private|DO-NOT-PUBLISH|publishedBy|reason|purchase/);
 const next={...h.payload,mutationId:randomUUID(),revision:1,budget:{...h.payload.budget,committedCents:80000,consumedCents:50000}};await h.service.publish(h.header,h.scope,next);
 assert.deepEqual(await h.service.publish(h.header,h.scope,h.payload),first);assert.equal((await h.service.read(h.header,h.scope)).revision,2);
 const audits=await h.campaign.collection('clientBudgets').doc('current').collection('publications').get();assert.equal(audits.size,2);assert.equal(audits.docs.find(d=>d.id===h.payload.mutationId).data().record.budget.committedCents,60000);
 assert.deepEqual((await h.campaign.get()).data(),before);
 await assert.rejects(h.service.publish(h.header,h.scope,{...h.payload,reason:'Changed replay'}),{status:409});
});
test('client publication validates exact amounts, source, confirmation, and concurrent revisions atomically',async t=>{
 const h=await setup(t);
 for(const patch of [{confirmed:false},{revision:-1},{reason:''},{mutationId:'invalid'},{extra:1}])await assert.rejects(h.service.publish(h.header,h.scope,{...h.payload,...patch}),{status:400});
 for(const patch of [{allocatedCents:0},{consumedCents:60001},{committedCents:-1},{allocatedCents:100000001},{allocatedCents:1.2},{basis:'EUR'},{asOf:'2026-02-30'},{reference:'x\nsecret'},{reference:''},{purchaseCents:5}])await assert.rejects(h.service.publish(h.header,h.scope,{...h.payload,budget:{...h.payload.budget,...patch}}),{status:400});
 const results=await Promise.allSettled([h.payload,{...h.payload,mutationId:randomUUID()}].map(p=>h.service.publish(h.header,h.scope,p)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 assert.equal((await h.service.read(h.header,h.scope)).revision,1);
});
test('client budget requires explicit organizer and planning rights; revocation also prevents replay',async t=>{
 const h=await setup(t);await h.service.publish(h.header,h.scope,h.payload);
 for(const patch of [{organizerCampaigns:[]},{canPlanCampaign:false},{active:false},{assignments:[]},{uid:'spoofed'}]){await h.member.set({...h.grant,...patch});await assert.rejects(h.service.read(h.header,h.scope),{status:403});await assert.rejects(h.service.publish(h.header,h.scope,h.payload),{status:403});}
 await h.member.set(h.grant);for(const scope of [{...h.scope,tenantId:'foreign'},{...h.scope,campaignId:'foreign'},{...h.scope,teamId:'foreign'}])await assert.rejects(h.service.publish(h.header,scope,h.payload),{status:403});
 const ref=h.campaign.collection('clientBudgets').doc('current');await ref.update({tenantId:'foreign'});await assert.rejects(h.director.read(h.header,h.scope),{status:409});
});
