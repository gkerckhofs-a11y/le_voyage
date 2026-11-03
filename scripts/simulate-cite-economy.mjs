// Four economic checkpoints only. Councils, buildings and gifts are not resolved in tranche 1.
import {createEconomy,ECONOMY_VERSION,submitValues,recordPerformance,closeFamilyWeek,buildingCost} from '../src/cite/economy.ts';
import {planWeeks} from '../src/domain/calendar.ts';
export function simulateEconomy(familyCount){
 const families=Array.from({length:familyCount},(_,i)=>({id:'family-'+i,name:'Famille '+(i+1)}));const weeks=planWeeks('2026-11-09',16);
 const config={tenantId:'fiction-cite-economy',seasonId:'prototype-four-councils',name:'La Cité des Ateliers — économie provisoire',rulesVersion:ECONOMY_VERSION,missingDataPolicy:'defer',minimumValueResponses:1,families,weeks,memberships:families.flatMap((f,i)=>Array.from({length:[1,2,5,8][i%4]},(_,j)=>({uid:`fiction-${i}-${j}`,familyId:f.id,from:weeks[0].start}))),metrics:{performance:[{id:'quality',label:'Qualité — note normalisée',weightBps:10000}],values:[{id:'cooperation',label:'Entraide',weightBps:5000},{id:'care',label:'Soin du travail',weightBps:5000}]}};
 let state=createEconomy(config);const checkpoints=[];
 for(const [i,w]of weeks.entries()){
  for(const [j,f]of families.entries()){
   const scope={tenantId:config.tenantId,seasonId:config.seasonId,familyId:f.id},score=String(2+(i+j)%4);state=recordPerformance(state,scope,w.id,{quality:score},w.start);
   for(const m of config.memberships.filter(m=>m.familyId===f.id))state=submitValues(state,scope,m.uid,w.id,{cooperation:score,care:score},w.start);
   state=closeFamilyWeek(state,scope,w.id,w.endExclusive).state;
  }
  if((i+1)%4===0)checkpoints.push({week:i+1,balances:{...state.balances},councilStatus:'not-implemented'});
 }
 return {company:config.name,status:'provisional-economic-simulation',familyCount,weeks:16,credits:state.audit.length,prices:Object.fromEntries(['small','standard','large'].map(k=>[k,buildingCost(k,familyCount)])),checkpoints};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href)console.log(JSON.stringify([1,2,5,10].map(simulateEconomy),null,2));
