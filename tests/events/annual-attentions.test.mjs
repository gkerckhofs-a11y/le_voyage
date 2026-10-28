import test from 'node:test';import assert from 'node:assert/strict';
import {previewAnnualAttentions} from '../../src/application/annual-attentions.ts';
import {previewAnnualOrganisation} from '../../src/application/annual-organisation.ts';
import {previewAnnualPlan} from '../../src/application/annual-plan.ts';
const organisation={companyName:'Entreprise fictive',teams:[{name:'A',headcount:5},{name:'B',headcount:3}],receptionGuests:12},o=previewAnnualOrganisation(organisation);
const dated={label:'Fête prévue',date:'2028-10-31',unit:'person',amountCents:2500,visibility:'discreet'};
const surprise={label:'Série privée',periodStart:'2028-02-01',periodEnd:'2028-03-31',count:3,envelopeCents:60000,compositionPreferences:'Produits artisanaux sans alcool'};
const attentions={basis:'TTC',dated:[dated],surprises:[surprise]};
const preview=a=>previewAnnualAttentions(a,'2027-11-15','2028-11-15',o);
test('dated gifts use planned recipients while a surprise envelope is total for its whole series',()=>{
 const p=preview(attentions);assert.equal(p.datedMaximumCents,20000);assert.equal(p.surpriseMaximumCents,60000);assert.equal(p.totalCents,80000);assert.equal(p.dated[0].quantity,8);
 assert.equal(preview({...attentions,surprises:[{...surprise,count:4}]}).totalCents,80000);
 assert.equal(preview({...attentions,dated:[{...dated,unit:'team'}]}).datedMaximumCents,5000);
 p.surprises[0].compositionPreferences='changed';assert.equal(surprise.compositionPreferences,'Produits artisanaux sans alcool');
 assert.equal(preview(undefined),null);assert.equal(preview({...attentions,dated:[],surprises:[]}).totalCents,0);
});
test('missing organisation never invents recipient counts; surprise total remains known',()=>{
 const p=previewAnnualAttentions(attentions,'2027-11-15','2028-11-15',null);assert.equal(p.totalCents,null);assert.equal(p.datedMaximumCents,null);assert.equal(p.surpriseMaximumCents,60000);
 assert.equal(previewAnnualAttentions({...attentions,dated:[]},'2027-11-15','2028-11-15',null).totalCents,60000);
});
test('invalid dates, periods, disclosure choices, amounts and unknown fields fail closed',()=>{
 for(const change of [{date:'2027-11-14'},{date:'2028-11-15'},{date:'2027-02-29'},{date:'2028-10-31T00:00:00Z'},{visibility:''},{visibility:'secret-ish'},{unit:'all'},{amountCents:1.5},{amountCents:-1},{kilometres:100}])assert.throws(()=>preview({...attentions,dated:[{...dated,...change}]}));
 for(const change of [{periodStart:'2028-04-01'},{periodEnd:'2028-11-15'},{count:0},{count:1.5},{count:101},{envelopeCents:-1},{compositionPreferences:' '},{published:true}])assert.throws(()=>preview({...attentions,surprises:[{...surprise,...change}]}));
 for(const input of [null,{...attentions,basis:''},{...attentions,extra:true},{...attentions,dated:null},{...attentions,dated:Array(21).fill(dated)}])assert.throws(()=>preview(input));
 assert.equal(preview({...attentions,dated:[{...dated,date:'2027-11-15'}],surprises:[{...surprise,periodStart:'2028-11-14',periodEnd:'2028-11-14'}]}).totalCents,80000);
 assert.throws(()=>preview({...attentions,dated:[{...dated,amountCents:Number.MAX_SAFE_INTEGER}]}));
 assert.throws(()=>preview({...attentions,dated:[],surprises:[{...surprise,envelopeCents:Number.MAX_SAFE_INTEGER},surprise]}));
});
test('calendar gifts after reception freeze do not alter calendar, thresholds or progression',()=>{
 const input={start:'2027-11-15',evaluationWeekday:7,partialWeeks:'exclude',leapDayAnniversary:'february-28',freezeDate:'2028-09-01',receptionDate:'2028-10-20',giftCount:1,receptionTierCount:0,organisation,funding:{basis:'TTC',giftPerTeamCents:[10000],receptionTotalsCents:[100000]}};
 const before=previewAnnualPlan(input),after=previewAnnualPlan({...input,attentions});assert.deepEqual(after.weeks,before.weeks);assert.deepEqual(after.giftThresholds,before.giftThresholds);assert.deepEqual(after.receptionThresholds,before.receptionThresholds);assert.equal(after.maximumKm,before.maximumKm);
 assert.equal(after.enterpriseFunding.configuredMaximumCents,200000);assert.equal(before.enterpriseFunding.configuredMaximumCents,120000);assert.equal(after.enterpriseFunding.datedMaximumCents,20000);assert.equal(after.enterpriseFunding.surpriseMaximumCents,60000);
 assert.throws(()=>previewAnnualPlan({...input,attentions:{...attentions,basis:'HT'}}));
 assert.throws(()=>previewAnnualPlan({...input,attentions:{...attentions,dated:[],surprises:[{...surprise,envelopeCents:Number.MAX_SAFE_INTEGER}]}}));
});
