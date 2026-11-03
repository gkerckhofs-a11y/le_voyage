import test from 'node:test';import assert from 'node:assert/strict';import {Readable} from 'node:stream';
import {fixture} from './server-fixture.mjs';import {definition,gauges} from './councils-fixture.mjs';
import {createGovernance,COUNCIL_RULES,openCouncil,castBallot,closeVote} from '../../src/cite/councils.ts';
import {initializeCity} from '../../src/cite/city.ts';import {createCiteFamilyService} from '../../src/server/cite-family.mjs';import {createCiteMemberHttp} from '../../src/server/cite-member-http.mjs';
function setup(){const f=fixture();let game=initializeCity(createGovernance(f.data.get(f.privatePath).state,gauges,COUNCIL_RULES),f.s,'private-family-seed-12345');const d=definition(game);game=openCouncil(game,f.s,d,d.voteOpensOn);f.setDate(d.voteOpensOn);f.data.set(f.privatePath,{state:game.economy,councils:game.councils,city:game.city});return {...f,d,service:createCiteFamilyService(f.adapter,{today:f.today})};}
test('family view contains only own purse, ambition and ballot; never raw scores or another family secrets',async()=>{
 const f=setup(),record=f.data.get(f.privatePath);record.city.ambitions['family-1'].secretMarker='hidden-other-ambition';record.state.values.privateMarker={};record.councils.records[f.d.id].ballots['1']['person-1-0']={familyId:'family-1',choice:'clinic-1'};
 const v=await f.service.read('Bearer person-0-0',f.s),text=JSON.stringify(v);assert.equal(v.family.name,f.c.families[0].name);assert.equal(v.council.myFamily.ballot,null);assert.equal(v.council.myFamily.canVote,true);for(const secret of ['hidden-other-ambition','privateMarker','private-family-seed','person-1-0','ballots','roster','crisisPlan'])assert.ok(!text.includes(secret),secret);
 await assert.rejects(f.service.read('Bearer person-0-0',{...f.s,familyId:'family-1'}),{status:403});await assert.rejects(f.service.read('Bearer person-0-0',{...f.s,tenantId:'other'}),{status:403});await assert.rejects(f.service.read('Bearer manager',f.s),{status:403});
});
test('concurrent contradictory votes accept one immutable ballot, identical retry does not debit',async()=>{
 const f=setup(),command={councilId:f.d.id,round:1,choice:'library-1'},before=structuredClone(f.data.get(f.privatePath).state);
 const results=await Promise.allSettled([f.service.vote('Bearer person-0-0',f.s,command),f.service.vote('Bearer person-0-0',f.s,{...command,choice:'clinic-1'})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 const v=await f.service.read('Bearer person-0-0',f.s);assert.equal(v.council.myFamily.canVote,false);await f.service.vote('Bearer person-0-0',f.s,{...command,choice:v.council.myFamily.ballot});assert.deepEqual(f.data.get(f.privatePath).state,before);
});
test('dated membership, closed windows, suspended families and invalid commands are enforced',async()=>{
 const f=setup(),command={councilId:f.d.id,round:1,choice:'library-1'},r=f.data.get(f.privatePath);
 await assert.rejects(f.service.vote('Bearer person-0-0',f.s,{...command,uid:'person-1-0'}),{status:400});
 r.councils.records[f.d.id].suspended=['family-0'];assert.equal((await f.service.read('Bearer person-0-0',f.s)).council.myFamily.canVote,false);await assert.rejects(f.service.vote('Bearer person-0-0',f.s,command),{status:403});r.councils.records[f.d.id].suspended=[];
 f.setDate(f.d.firstVoteClosesOn);await assert.rejects(f.service.vote('Bearer person-0-0',f.s,command),{status:409});r.state.config.memberships.find(m=>m.uid==='person-0-0').toExclusive=f.today();await assert.rejects(f.service.read('Bearer person-0-0',f.s),{status:403});
});
test('a one-family company votes normally with no artificial suspension',async()=>{
 const f=setup(),r=f.data.get(f.privatePath);r.state.config.families=r.state.config.families.slice(0,1);r.state.config.memberships=r.state.config.memberships.filter(m=>m.familyId==='family-0');let g=createGovernance(r.state,gauges,COUNCIL_RULES);g=initializeCity(g,f.s,'one-family-seed-12345');g.councils.suspendedFor['family-0']=1;const d=definition(g,1,'yes-no');g=openCouncil(g,f.s,d,d.voteOpensOn);f.data.set(f.privatePath,{state:g.economy,councils:g.councils,city:g.city});assert.equal((await f.service.vote('Bearer person-0-0',f.s,{councilId:d.id,round:1,choice:'yes'})).council.myFamily.ballot,'yes');const saved=f.data.get(f.privatePath),closed=closeVote({economy:saved.state,councils:saved.councils,city:saved.city},f.s,d.id,1,d.firstVoteClosesOn);assert.equal(closed.councils.records[d.id].phase,'funding');assert.equal(closed.councils.records[d.id].rounds[0].tally.yes,1);
});
test('family HTTP requires member workspace, CSRF and exact commands',async()=>{
 const f=setup(),api=createCiteMemberHttp(f.adapter,{today:f.today}),session={header:'Bearer person-0-0',scope:f.s,workspaceEnabled:true,workspaceSpace:'cite-member',csrf:'a'.repeat(64)};
 const req=(method,input={},csrf=session.csrf)=>{const r=Readable.from([Buffer.from(JSON.stringify(input))]);r.method=method;r.headers={'content-type':'application/json','x-demo-csrf':csrf};return r;};let result;await api.handle(req('GET'),(s,d)=>result=d,'/api/cite/family',session);assert.equal(result.csrf,session.csrf);
 const command={councilId:f.d.id,round:1,choice:'library-1'};await assert.rejects(api.handle(req('POST',command,'b'.repeat(64)),()=>{},'/api/cite/family/vote',session),{status:403});await assert.rejects(api.handle(req('GET'),()=>{},'/api/cite/family',{...session,workspaceSpace:'cite-gifts'}),{status:403});await assert.rejects(api.handle(req('POST',{...command,tenantId:'other'}),()=>{},'/api/cite/family/vote',session),{status:400});
});
