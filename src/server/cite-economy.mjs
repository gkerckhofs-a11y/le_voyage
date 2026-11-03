import {assertTestAdapter} from './test-environment.mjs';
import {identifier,submitValues,recordPerformance,closeFamilyWeek,familyEconomyView} from '../cite/economy.ts';
const denied=()=>Object.assign(Error('City access denied'),{status:403});
/** New, explicit season capabilities. No route is registered in the legacy application. */
export function createCiteEconomyService(adapter,{today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels'}).format(new Date())}={}){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 async function operate(header,scope,permission,action){
  if(!scope||![scope.tenantId,scope.seasonId,scope.familyId].every(identifier)||typeof header!=='string'||!/^Bearer \S{1,8192}$/.test(header))throw denied();
  let actor;try{actor=await auth.verifyIdToken(header.slice(7),true);}catch{throw denied();}if(!identifier(actor?.uid))throw denied();
  return db.runTransaction(async tx=>{
   const member=(await tx.get(db.doc(`tenants/${scope.tenantId}/members/${actor.uid}`))).data();
   if(member?.active!==true||member.uid!==actor.uid||member.tenantId!==scope.tenantId)throw denied();
   const assigned=Array.isArray(member.citeAssignments)&&member.citeAssignments.some(a=>a.seasonId===scope.seasonId&&a.familyId===scope.familyId);
   const manages=Array.isArray(member.citeSeasonManagement)&&member.citeSeasonManagement.includes(scope.seasonId);
   if(permission==='member'?!assigned:!manages)throw denied();
   const ref=db.doc(`tenants/${scope.tenantId}/citeSeasons/${scope.seasonId}/privateEconomy/main`),snapshot=await tx.get(ref);if(!snapshot.exists)throw denied();
   const state=snapshot.data().state;if(state?.config?.tenantId!==scope.tenantId||state.config.seasonId!==scope.seasonId)throw denied();
   const result=action(state,actor.uid,today());if(result.state!==state){if(Buffer.byteLength(JSON.stringify(result.state))>800000)throw Object.assign(Error('City prototype capacity exceeded'),{status:409});tx.set(ref,{...snapshot.data(),state:result.state});}return result.value;
  });
 }
 function command(value){if(!value||Object.keys(value).sort().join(',')!=='scores,weekId'||!identifier(value.weekId))throw Object.assign(Error('Invalid city command'),{status:400});return value;}
 return {
  read:(header,scope)=>operate(header,scope,'member',state=>({state,value:familyEconomyView(state,scope)})),
  submit:async(header,scope,input)=>{const {weekId,scores}=command(input);return operate(header,scope,'member',(state,uid,date)=>{const next=submitValues(state,scope,uid,weekId,scores,date);return {state:next,value:{accepted:true,weekId}};});},
  performance:async(header,scope,input)=>{const {weekId,scores}=command(input);return operate(header,scope,'manager',(state,_uid,date)=>{const next=recordPerformance(state,scope,weekId,scores,date);return {state:next,value:{accepted:true,weekId}};});},
  close:(header,scope,weekId)=>operate(header,scope,'manager',(state,_uid,date)=>{const result=closeFamilyWeek(state,scope,weekId,date);return {state:result.state,value:result.deferred?{status:'deferred'}:{status:'credited',credit:structuredClone(result.credit)}};})
 };
}
