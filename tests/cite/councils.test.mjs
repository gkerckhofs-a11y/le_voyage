import test from 'node:test';import assert from 'node:assert/strict';
import {createGovernance,COUNCIL_RULES,openCouncil,castBallot,closeVote,pledge,closeFunding,councilPublicView,councilFamilyView} from '../../src/cite/councils.ts';
import {fixture,definition,open,allVote,fundedPhase,gauges} from './councils-fixture.mjs';
const last=g=>g.councils.records[g.councils.order.at(-1)];
function pay(g,s,f,amount,revision=0,mutation='payment-'+f){const c=last(g);return pledge(g,{...s,familyId:'family-'+f},`person-${f}-0`,c.definition.id,amount,revision,mutation,c.definition.firstVoteClosesOn);}
test('one family voice independent of size; individual ties abstain and ballots stay confidential',()=>{
 let {game:g,scope:s}=fixture(3,[2,8,2]);g=open(g,s);const c=last(g),[a,b]=c.definition.projects.map(p=>p.id),date=c.definition.voteOpensOn;
 for(const uid of c.roster['family-0'])g=castBallot(g,s,uid,c.definition.id,1,a,date);
 for(const uid of c.roster['family-1'])g=castBallot(g,{...s,familyId:'family-1'},uid,c.definition.id,1,b,date);
 g=castBallot(g,{...s,familyId:'family-2'},'person-2-0',c.definition.id,1,a,date);g=castBallot(g,{...s,familyId:'family-2'},'person-2-1',c.definition.id,1,b,date);
 const publicOpen=JSON.stringify(councilPublicView(g,s,c.definition.id));assert.ok(!publicOpen.includes('person-'));assert.equal(councilFamilyView(g,s,'person-0-1',c.definition.id,date).myFamily.ballot,a);assert.equal(councilPublicView(g,s,c.definition.id).rounds.length,0);
 assert.throws(()=>castBallot(g,s,'person-1-0',c.definition.id,1,a,date),{status:403});assert.equal(castBallot(g,s,'person-0-0',c.definition.id,1,a,date),g);assert.throws(()=>castBallot(g,s,'person-0-0',c.definition.id,1,b,date));
 g=closeVote(g,s,c.definition.id,1,c.definition.firstVoteClosesOn);assert.equal(last(g).round,2);assert.deepEqual(last(g).rounds[0].tally,{[a]:1,[b]:1});assert.equal(last(g).rounds[0].familyVotes['family-2'].choice,'abstain');assert.ok(!JSON.stringify(councilPublicView(g,s,c.definition.id)).includes('person-'));
});
test('second tie fails once with no debit; first-round retry never closes the runoff',()=>{
 let {game:g,scope:s}=fixture(2);g=open(g,s);const d=last(g).definition,[a,b]=d.projects.map(p=>p.id),before={...g.economy.balances};
 for(const round of [1,2]){
  for(const [f,choice]of [['family-0',a],['family-1',b]])for(const uid of last(g).roster[f])g=castBallot(g,{...s,familyId:f},uid,d.id,round,choice,round===1?d.voteOpensOn:d.firstVoteClosesOn);
  const next=closeVote(g,s,d.id,round,round===1?d.firstVoteClosesOn:d.secondVoteClosesOn);if(round===1)assert.equal(closeVote(next,s,d.id,1,d.firstVoteClosesOn),next);g=next;
 }
 assert.equal(last(g).resolution.reason,'persistent-tie');assert.deepEqual(g.economy.balances,before);assert.equal(g.councils.gauges.economy,15);assert.equal(closeVote(g,s,d.id,2,d.secondVoteClosesOn),g);assert.equal(g.councils.resolutions.length,1);assert.equal(Object.keys(g.councils.buildings).length,0);
});
test('yes/no rejection and zero expressed family votes apply declared failure, without construction',()=>{
 for(const choice of ['no','abstain',null]){let {game:g,scope:s}=fixture(2);g=open(g,s,'yes-no');const d=last(g).definition;if(choice)g=allVote(g,s,choice);g=closeVote(g,s,d.id,1,d.firstVoteClosesOn);assert.equal(last(g).resolution.reason,choice==='no'?'rejected':'no-votes');assert.equal(g.councils.spending.length,0);assert.equal(Object.keys(g.councils.buildings).length,0);}
});
test('pledges reserve without debit, support revocation/versioning and reject overfunding or overspending',()=>{
 let {game:g,scope:s}=fixture(2);g=fundedPhase(g,s);const d=last(g).definition,before=structuredClone(g.economy.balances);g=pay(g,s,0,80);assert.deepEqual(g.economy.balances,before);assert.throws(()=>pay(g,s,1,101));assert.throws(()=>pay(g,s,1,23));
 assert.equal(pay(g,s,0,80),g);assert.throws(()=>pay(g,s,0,79));assert.throws(()=>pay(g,s,0,81,0,'new-pledge-stale'));
 g=pay(g,s,0,0,1,'revoke-family-zero');g=pay(g,s,1,100,0,'other-family-funds');assert.deepEqual(g.economy.balances,before);assert.equal(last(g).pledges['family-0'].amount,0);assert.throws(()=>closeFunding(g,s,d.id,d.firstVoteClosesOn));
});
test('underfunding fails atomically with no charge, no suspension and one consequence',()=>{
 let {game:g,scope:s}=fixture();g=fundedPhase(g,s);const d=last(g).definition;g=pay(g,s,0,20);const before={...g.economy.balances};g=closeFunding(g,s,d.id,d.fundingClosesOn);assert.deepEqual(g.economy.balances,before);assert.equal(last(g).resolution.reason,'underfunded');assert.equal(g.councils.gauges.economy,15);assert.deepEqual(g.councils.suspendedFor,{});assert.equal(closeFunding(g,s,d.id,d.fundingClosesOn),g);assert.equal(g.councils.resolutions.length,1);
});
test('fully financed building charges exactly once and solvent noncontributors miss only next Council',()=>{
 let {game:g,scope:s}=fixture();g=fundedPhase(g,s);let d=last(g).definition;g=pay(g,s,0,100);g=pay(g,s,1,53);g=closeFunding(g,s,d.id,d.fundingClosesOn);
 assert.deepEqual(g.economy.balances,{'family-0':0,'family-1':47,'family-2':100});assert.equal(g.councils.spending.length,2);assert.equal(g.councils.gauges.culture,32);assert.equal(g.councils.suspendedFor['family-2'],2);assert.equal(Object.keys(g.councils.buildings).length,1);assert.equal(closeFunding(g,s,d.id,d.fundingClosesOn),g);
 g=open(g,s);d=last(g).definition;assert.throws(()=>castBallot(g,{...s,familyId:'family-2'},'person-2-0',d.id,1,d.projects[0].id,d.voteOpensOn),{status:403});
 // Suspended families may still help fund a project. Here the second vote is rejected, so no new sanction arises.
 g=allVote(g,s,'abstain');g=closeVote(g,s,d.id,1,d.firstVoteClosesOn);g=open(g,s);assert.deepEqual(last(g).suspended,[]);assert.ok(councilFamilyView(g,{...s,familyId:'family-2'},'person-2-0',last(g).definition.id,last(g).definition.voteOpensOn).myFamily.canVote);
});
test('zero purse is exempt; one ecu is sufficient; single-family votes and financing have no suspension',()=>{
 let {game:g,scope:s}=fixture();g.economy.balances['family-2']=0;g=fundedPhase(g,s);g=pay(g,s,0,100);g=pay(g,s,1,53);g=closeFunding(g,s,last(g).definition.id,last(g).definition.fundingClosesOn);assert.deepEqual(g.councils.suspendedFor,{});
 ({game:g,scope:s}=fixture());g=fundedPhase(g,s);g=pay(g,s,0,100);g=pay(g,s,1,52);g=pay(g,s,2,1);g=closeFunding(g,s,last(g).definition.id,last(g).definition.fundingClosesOn);assert.deepEqual(g.councils.suspendedFor,{});
 ({game:g,scope:s}=fixture(1,[5]));g=fundedPhase(g,s,'yes-no');g=pay(g,s,0,51);g=closeFunding(g,s,last(g).definition.id,last(g).definition.fundingClosesOn);assert.equal(g.economy.balances['family-0'],49);assert.deepEqual(g.councils.suspendedFor,{});assert.equal(last(g).rounds[0].tally.yes,1);
 ({game:g,scope:s}=fixture(1));g.economy.balances['family-0']=40;g=fundedPhase(g,s,'yes-no');g=pay(g,s,0,40);g=closeFunding(g,s,last(g).definition.id,last(g).definition.fundingClosesOn);assert.equal(last(g).resolution.reason,'underfunded');assert.equal(g.economy.balances['family-0'],40);assert.deepEqual(g.councils.suspendedFor,{});
});
test('scope, calendar, pricing and immutable definitions are enforced; inputs are not mutated',()=>{
 let {game:g,scope:s}=fixture();const d=definition(g),saved=structuredClone(d),state=structuredClone(g);assert.throws(()=>openCouncil(g,{...s,tenantId:'other'},d,d.voteOpensOn),{status:403});assert.throws(()=>openCouncil(g,s,{...d,weekId:'wrong'},d.voteOpensOn));assert.throws(()=>openCouncil(g,s,{...d,projects:[{...d.projects[0],cost:1},d.projects[1]]},d.voteOpensOn));assert.throws(()=>openCouncil(g,s,{...d,projects:[{...d.projects[0],id:'abstain'},d.projects[1]]},d.voteOpensOn));
 const next=openCouncil(g,s,d,d.voteOpensOn);assert.deepEqual(g,state);assert.deepEqual(d,saved);assert.equal(openCouncil(next,s,d,d.voteOpensOn),next);assert.throws(()=>openCouncil(next,s,{...d,title:'other'},d.voteOpensOn));assert.throws(()=>openCouncil(next,s,definition(next),d.voteOpensOn));assert.throws(()=>createGovernance(g.economy,gauges,{...COUNCIL_RULES,surplus:'silently-prorate'}));
});

test('runoff can select the other project; a missed runoff window is archived honestly',()=>{
 let {game:g,scope:s}=fixture(2);g=open(g,s);const d=last(g).definition;
 for(const [i,choice]of d.projects.map(p=>p.id).entries())for(const uid of last(g).roster['family-'+i])g=castBallot(g,{...s,familyId:'family-'+i},uid,d.id,1,choice,d.voteOpensOn);
 const tied=g;g=closeVote(g,s,d.id,1,d.firstVoteClosesOn);g=allVote(g,s,d.projects[1].id,2);g=closeVote(g,s,d.id,2,d.secondVoteClosesOn);assert.equal(last(g).phase,'funding');assert.equal(last(g).selected,d.projects[1].id);
 const missed=closeVote(tied,s,d.id,1,d.secondVoteClosesOn);assert.equal(last(missed).resolution.reason,'runoff-window-missed');assert.equal(last(missed).rounds.length,1);
});
test('construction scales to 1, 2, 5 and 10 families with unchanged per-family reference cost',()=>{
 for(const n of [1,2,5,10]){let {game:g,scope:s}=fixture(n,Array.from({length:n},(_,i)=>i%2?8:2));g=fundedPhase(g,s);const d=last(g).definition;for(let i=0;i<n;i++)g=pay(g,s,i,51);g=closeFunding(g,s,d.id,d.fundingClosesOn);assert.ok(Object.values(g.economy.balances).every(b=>b===49));assert.equal(g.councils.spending.reduce((sum,e)=>sum+e.ecus,0),51*n);assert.equal(last(g).rounds[0].tally[d.projects[0].id],n);}
});
test('a suspended family can still fund, and gauge boundaries are respected',()=>{
 let {game:g,scope:s}=fixture();g.councils.gauges.culture=95;g=fundedPhase(g,s);g=pay(g,s,0,100);g=pay(g,s,1,53);g=closeFunding(g,s,last(g).definition.id,last(g).definition.fundingClosesOn);assert.equal(g.councils.gauges.culture,100);g=fundedPhase(g,s);assert.ok(last(g).suspended.includes('family-2'));g=pay(g,s,2,100);assert.equal(last(g).pledges['family-2'].amount,100);
});
