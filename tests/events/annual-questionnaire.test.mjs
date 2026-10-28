import test from 'node:test';
import assert from 'node:assert/strict';
import {previewAnnualQuestionnaire} from '../../src/application/annual-questionnaire.ts';
import {previewAnnualPlan} from '../../src/application/annual-plan.ts';
const q={mode:'autonomous',values:[{label:'Entraide',question:'Ai-je aidé mon équipe ?'},{label:'Qualité',question:'Ai-je contribué à la qualité ?'},{label:'Initiative',question:'Ai-je proposé une amélioration ?'}],weights:['10.1','19.9','20','25','25'],minimumRespondents:5};
const kpi={definition:'Délai moyen',source:'Rapport mensuel',frequency:'Mensuelle',target:'2.5',unit:'jours',direction:'lower'};
test('annual questionnaire has exact weights and independent cloned values, with old drafts supported',()=>{
 assert.equal(previewAnnualQuestionnaire(undefined),null);const result=previewAnnualQuestionnaire(q);assert.deepEqual(result,q);result.values[0].label='changed';assert.equal(q.values[0].label,'Entraide');
 assert.deepEqual(previewAnnualQuestionnaire({...q,mode:'kpi',kpis:[kpi,{...kpi,direction:'higher',target:'-1'}]}).kpis[0],kpi);
});
test('reject incomplete questions, inexact totals, unsafe privacy and mismatched modes',()=>{
 for(const invalid of [null,{...q,extra:true},{...q,mode:''},{...q,values:q.values.slice(1)},{...q,values:[{label:' ',question:'?'},...q.values.slice(1)]},{...q,values:[{...q.values[0],hidden:true},...q.values.slice(1)]},{...q,weights:['20','20','20','20','19.99999999']},{...q,weights:['-1','21','20','30','30']},{...q,weights:[20,20,20,20,20]},{...q,minimumRespondents:1},{...q,minimumRespondents:2.5},{...q,minimumRespondents:Number.MAX_SAFE_INTEGER+1},{...q,kpis:[]},{...q,mode:'kpi'}])assert.throws(()=>previewAnnualQuestionnaire(invalid));
 for(const patch of [{target:'0'},{target:'0.0000000001'},{target:'NaN'},{target:'1e3'},{source:''},{direction:''},{frequency:''},{unit:''},{secret:'unexpected'}])assert.throws(()=>previewAnnualQuestionnaire({...q,mode:'kpi',kpis:[{...kpi,...patch},kpi]}));
});
test('questionnaire does not recalculate calendar, gifts, reception or funding',()=>{
 const input={start:'2027-11-15',evaluationWeekday:7,partialWeeks:'exclude',leapDayAnniversary:'february-28',freezeDate:'2028-09-01',receptionDate:'2028-10-20',giftCount:2,receptionTierCount:2};
 const old=previewAnnualPlan(input),next=previewAnnualPlan({...input,questionnaire:q});const {questionnaire,...rest}=next;assert.deepEqual(rest,(({questionnaire,...rest})=>rest)(old));assert.deepEqual(questionnaire,q);
});

test('KPI referent is optional private draft text, bounded and exclusive to KPI mode',()=>{
 const base={...q,mode:'kpi',kpis:[kpi,kpi]};
 assert.equal(previewAnnualQuestionnaire(base).kpiReferent,undefined);
 const input={...base,kpiReferent:'  Référent fictif  '};
 assert.equal(previewAnnualQuestionnaire(input).kpiReferent,'Référent fictif');
 assert.equal(input.kpiReferent,'  Référent fictif  ');
 assert.equal(previewAnnualQuestionnaire({...base,kpiReferent:'x'.repeat(500)}).kpiReferent.length,500);
 for(const value of ['', '  ', null, 123, {}, 'x'.repeat(501)])assert.throws(()=>previewAnnualQuestionnaire({...base,kpiReferent:value}));
 assert.throws(()=>previewAnnualQuestionnaire({...q,kpiReferent:'Fictif'}));
 const calendar={start:'2027-11-15',evaluationWeekday:7,partialWeeks:'exclude',leapDayAnniversary:'february-28',freezeDate:'2028-09-01',receptionDate:'2028-10-20',giftCount:2,receptionTierCount:2};
 const before=previewAnnualPlan({...calendar,questionnaire:base}),after=previewAnnualPlan({...calendar,questionnaire:input});
 delete after.questionnaire.kpiReferent;assert.deepEqual(after,before);
});
