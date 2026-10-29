import test from 'node:test';import assert from 'node:assert/strict';
import {previewAnnualContract} from '../../src/application/annual-contract.ts';
import {previewAnnualPlan} from '../../src/application/annual-plan.ts';
const contract={versionReference:'  Projet A  ',privacyNotice:'  Texte fictif\nà relire  ',clauses:''};
test('contract draft supports missing or incomplete text, preserves lines and never infers acceptance',()=>{
 assert.equal(previewAnnualContract(undefined),null);const result=previewAnnualContract(contract);assert.deepEqual(result,{versionReference:'Projet A',privacyNotice:'Texte fictif\nà relire',clauses:''});result.clauses='changed';assert.equal(contract.clauses,'');assert.equal(contract.versionReference,'  Projet A  ');
 assert.deepEqual(previewAnnualContract({versionReference:'',privacyNotice:'',clauses:''}),{versionReference:'',privacyNotice:'',clauses:''});
 assert.equal(previewAnnualContract({...contract,clauses:'x'.repeat(20000)}).clauses.length,20000);
});
test('contract draft rejects extra acceptance fields, wrong shapes and oversized text',()=>{
 for(const input of [null,[],{}, {...contract,accepted:true},{...contract,signedAt:'2028-01-01'},{...contract,versionReference:'x'.repeat(161)},{...contract,privacyNotice:'x'.repeat(20001)},{...contract,clauses:'x'.repeat(20001)},{...contract,privacyNotice:null},{...contract,clauses:12}])assert.throws(()=>previewAnnualContract(input));
});
test('contract text cannot change calendar, thresholds, budget or questionnaire',()=>{
 const input={start:'2027-11-15',evaluationWeekday:7,partialWeeks:'exclude',leapDayAnniversary:'february-28',freezeDate:'2028-09-01',receptionDate:'2028-10-20',giftCount:2,receptionTierCount:2};
 const {contract:before,...baseline}=previewAnnualPlan(input),{contract:after,...next}=previewAnnualPlan({...input,contract});assert.equal(before,null);assert.deepEqual(after,previewAnnualContract(contract));assert.deepEqual(next,baseline);
});
