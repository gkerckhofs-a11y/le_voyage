import test from 'node:test';
import assert from 'node:assert/strict';
import {previewAnnualOrganisation,previewEnterpriseFunding} from '../../src/application/annual-organisation.ts';
import {previewAnnualFunding} from '../../src/application/annual-funding.ts';
import {previewAnnualPlan} from '../../src/application/annual-plan.ts';
const organisation={companyName:'Entreprise fictive',teams:[{name:'Explorateurs',headcount:5},{name:'Pionniers',headcount:3}],receptionGuests:12};
const funding=previewAnnualFunding({basis:'TTC',giftPerTeamCents:[12550,20000],receptionTotalsCents:[100000,130000,160000]},2,2);
test('planned teams have independent counts and cannot mutate input',()=>{
 const p=previewAnnualOrganisation(organisation);assert.equal(p.teamCount,2);assert.equal(p.totalHeadcount,8);assert.equal(p.receptionGuests,12);p.teams[0].name='changed';assert.equal(organisation.teams[0].name,'Explorateurs');assert.equal(previewAnnualOrganisation(undefined),null);
 const tpe=previewAnnualOrganisation({...organisation,teams:[{name:'Notre équipe',headcount:1}],receptionGuests:0});assert.equal(tpe.totalHeadcount,1);
});
test('enterprise envelopes multiply gifts by teams, never people or reception levels',()=>{
 const p=previewEnterpriseFunding(previewAnnualOrganisation(organisation),funding);assert.equal(p.giftMaximumCents,65100);assert.equal(p.receptionMaximumCents,160000);assert.equal(p.configuredMaximumCents,225100);assert.equal(p.basis,'TTC');
 const morePeople=previewAnnualOrganisation({...organisation,teams:organisation.teams.map(t=>({...t,headcount:30})),receptionGuests:200});assert.deepEqual(previewEnterpriseFunding(morePeople,funding),p);
 assert.equal(previewEnterpriseFunding(null,funding),null);assert.equal(previewEnterpriseFunding(previewAnnualOrganisation(organisation),null),null);
});
test('invalid team counts, ambiguous names, extra fields and integer overflow are rejected',()=>{
 for(const o of [null,{...organisation,extra:true},{...organisation,companyName:' '},{...organisation,teams:[]},{...organisation,teams:Array.from({length:101},(_,i)=>({name:String(i),headcount:1}))},{...organisation,receptionGuests:-1},{...organisation,receptionGuests:1.5},{...organisation,teams:[{name:'Equipe',headcount:1},{name:' equipe ',headcount:2}]},{...organisation,teams:[{name:'A',headcount:Number.MAX_SAFE_INTEGER},{name:'B',headcount:1}]}])assert.throws(()=>previewAnnualOrganisation(o));
 for(const t of [{name:'',headcount:1},{name:'A',headcount:0},{name:'A',headcount:1.5},{name:'A',headcount:'2'},{name:'A',headcount:2,uid:'private'}])assert.throws(()=>previewAnnualOrganisation({...organisation,teams:[t]}));
 const huge=previewAnnualFunding({basis:'HT',giftPerTeamCents:[Number.MAX_SAFE_INTEGER],receptionTotalsCents:[0]},1,0);assert.throws(()=>previewEnterpriseFunding(previewAnnualOrganisation(organisation),huge));
 const one=previewAnnualOrganisation({...organisation,teams:[{name:'A',headcount:1}]});assert.throws(()=>previewEnterpriseFunding(one,{...huge,receptionMaximumCents:1}));
 assert.equal(previewEnterpriseFunding(one,huge).configuredMaximumCents,Number.MAX_SAFE_INTEGER);
});
test('organisation and budget previews leave campaign dates, thresholds and questionnaire unchanged',()=>{
 const input={start:'2027-11-15',evaluationWeekday:7,partialWeeks:'exclude',leapDayAnniversary:'february-28',freezeDate:'2028-09-01',receptionDate:'2028-10-20',giftCount:2,receptionTierCount:2};
 const before=previewAnnualPlan(input),after=previewAnnualPlan({...input,organisation});const {organisation:o,enterpriseFunding:f,...rest}=after;
 assert.deepEqual(rest,(({organisation,enterpriseFunding,...rest})=>rest)(before));assert.equal(f,null);assert.equal(o.totalHeadcount,8);
});
