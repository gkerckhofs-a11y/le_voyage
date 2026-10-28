import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';
import {createDirectorProgress} from '../../src/server/director-progress.mjs';
import {createGiftOperations} from '../../src/server/gift-operations.mjs';
import {newDemo} from '../../src/server/demo-service.mjs';
import {teamDistance,convoyDistance} from '../../src/domain/engine.ts';
async function setup(t){const a=createFirebaseEmulatorAdapter();t.after(()=>a.close());const uid='director-'+randomUUID(),email=uid+'@example.test',password='Fictitious-test-42!';await a.auth.createUser({uid,email,password});const token=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});const header='Bearer '+(await token.json()).idToken;
 const record=newDemo(),scope={tenantId:'director-'+randomUUID(),campaignId:record.ledger.state.config.campaignId,teamId:'explorateurs'};record.ledger.state.config.tenantId=scope.tenantId;record.ledger.state.privateSurvey={answers:['FORBIDDEN'],mean:4};record.ledger.state.preferences='FORBIDDEN';
 const ref=a.db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`),member=a.db.doc(`tenants/${scope.tenantId}/members/${uid}`);await ref.set({payload:JSON.stringify(record)});await member.set({uid,tenantId:scope.tenantId,active:true,assignments:[],directorCampaigns:[scope.campaignId]});return {a,uid,header,scope,record,ref,member,service:createDirectorProgress(a)};
}
test('director projection exposes only authorized distances and milestones; no private results or internal budgets',async t=>{
 const {a,header,scope,record,ref,service}=await setup(t),before=(await ref.get()).data();const view=await service.read(header,scope);
 assert.deepEqual(Object.keys(view).sort(),['campaignId','clientBudget','collective','organizationName','reception','schemaVersion','teams']);
 assert.equal(view.teams.length,4);assert.deepEqual(view.collective.distance,convoyDistance(record.ledger.state));
 for(const team of view.teams){assert.deepEqual(Object.keys(team).sort(),['displayKm','distance','id','milestones','name']);assert.deepEqual(team.distance,teamDistance(record.ledger.state,team.id));assert.ok(team.milestones.every(m=>Object.keys(m).sort().join(',')==='acquired,km,number'));}
 assert.deepEqual(view.clientBudget,{status:'unavailable'});assert.doesNotMatch(JSON.stringify(view),/FORBIDDEN|answers|scores|mean|privacy|weights|budgetCents|purchase|margin|preferences|private-gift|source|history/);
 await assert.rejects(a.read(header,scope),{status:403});await assert.rejects(a.simulate(header,scope,0),{status:403});await assert.rejects(createGiftOperations(a).list(header),{status:403});assert.deepEqual((await ref.get()).data(),before);
});
test('director capability is tenant/campaign scoped, does not inherit organizer/team rights and is revocable',async t=>{
 const {service,header,scope,member,uid,ref,record}=await setup(t);
 for(const other of [{...scope,tenantId:'foreign'},{...scope,campaignId:'foreign'},{...scope,tenantId:'../foreign'}])await assert.rejects(service.read(header,other),{status:403});
 await member.update({directorCampaigns:[],canPlanCampaign:true,canManageTeam:true,assignments:[{campaignId:scope.campaignId,teamId:scope.teamId}]});await assert.rejects(service.read(header,scope),{status:403});
 await member.update({directorCampaigns:[scope.campaignId],active:false});await assert.rejects(service.read(header,scope),{status:403});
 await member.update({active:true,uid:'spoofed'});await assert.rejects(service.read(header,scope),{status:403});await member.update({uid});
 record.ledger.state.config.tenantId='foreign';await ref.update({payload:JSON.stringify(record)});await assert.rejects(service.read(header,scope),{status:403});await assert.rejects(service.read('Bearer invalid',scope),{status:403});
});
