import test from 'node:test';import assert from 'node:assert/strict';
import {previewAnnualLogistics} from '../../src/application/annual-logistics.ts';
import {previewAnnualPlan} from '../../src/application/annual-plan.ts';
const logistics={operationalContact:'Contact fictif · logistique@example.test',sites:'Site de test',deliveryDetails:'Adresse fictive\nLivraison sur rendez-vous',receptionLocation:'Lieu fictif',receptionDetails:'Accueil à préciser',serviceConstraints:'Service sans alcool',fallbackPlan:'Salle intérieure à confirmer',receptionFormulas:['Accueil et buffet prévus','Accueil, buffet et animation prévus']};
test('logistics notes remain private draft text and permit unknown details without inventing data',()=>{
 assert.equal(previewAnnualLogistics(undefined,1),null);const p=previewAnnualLogistics(logistics,1);assert.deepEqual(p,logistics);p.receptionFormulas[0]='changed';assert.equal(logistics.receptionFormulas[0],'Accueil et buffet prévus');
 const blank=Object.fromEntries(Object.keys(logistics).map(k=>[k,k==='receptionFormulas'?['','']:'']));assert.deepEqual(previewAnnualLogistics(blank,1),blank);
 assert.equal(previewAnnualLogistics({...logistics,operationalContact:'  Contact fictif  '},1).operationalContact,'Contact fictif');assert.equal(previewAnnualLogistics({...logistics,receptionLocation:'<img src=x onerror=alert(1)>'},1).receptionLocation,'<img src=x onerror=alert(1)>');
});
test('notes have strict field types, size limits and one formula per budget level',()=>{
 for(const input of [null,[],{...logistics,confirmed:true},{...logistics,receptionDate:'2028-10-20'},{...logistics,operationalContact:null},{...logistics,deliveryDetails:{address:'x'}},{...logistics,receptionLocation:'x'.repeat(501)},{...logistics,receptionFormulas:['only one']},{...logistics,receptionFormulas:['','', 'extra']},{...logistics,receptionFormulas:[1,'']},{...logistics,receptionFormulas:['x'.repeat(1001),'']}])assert.throws(()=>previewAnnualLogistics(input,1));
 assert.deepEqual(previewAnnualLogistics({...logistics,receptionFormulas:['Base']},0).receptionFormulas,['Base']);
});
test('logistics changes cannot alter dates, participants, prices, thresholds or progression',()=>{
 const input={start:'2027-11-15',evaluationWeekday:7,partialWeeks:'exclude',leapDayAnniversary:'february-28',freezeDate:'2028-09-01',receptionDate:'2028-10-20',giftCount:1,receptionTierCount:1,organisation:{companyName:'Entreprise fictive',teams:[{name:'A',headcount:5}],receptionGuests:8},funding:{basis:'TTC',giftPerTeamCents:[10000],receptionTotalsCents:[100000,150000]}};
 const before=previewAnnualPlan(input),after=previewAnnualPlan({...input,logistics});const {logistics:notes,...rest}=after;assert.deepEqual(rest,(({logistics,...rest})=>rest)(before));assert.deepEqual(notes,logistics);
 assert.throws(()=>previewAnnualPlan({...input,receptionTierCount:2,logistics,funding:{...input.funding,receptionTotalsCents:[100000,150000,200000]}}));
});
