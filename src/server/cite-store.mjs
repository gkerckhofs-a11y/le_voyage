import {assertTestAdapter} from './test-environment.mjs';
import {identifier} from '../cite/economy.ts';
const denied=()=>Object.assign(Error('City access denied'),{status:403});
/** All personal scores, votes, purses and funding share one private transactional boundary. */
export function createCiteStore(adapter,{today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels'}).format(new Date())}={}){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 return async function operate(header,scope,permission,action){
  if(!scope||![scope.tenantId,scope.seasonId,scope.familyId].every(identifier)||typeof header!=='string'||!/^Bearer \S{1,8192}$/.test(header))throw denied();
  let actor;try{actor=await auth.verifyIdToken(header.slice(7),true);}catch{throw denied();}if(!identifier(actor?.uid))throw denied();
  return db.runTransaction(async tx=>{
   const member=(await tx.get(db.doc(`tenants/${scope.tenantId}/members/${actor.uid}`))).data();
   if(member?.active!==true||member.uid!==actor.uid||member.tenantId!==scope.tenantId)throw denied();
   const assigned=Array.isArray(member.citeAssignments)&&member.citeAssignments.some(a=>a.seasonId===scope.seasonId&&a.familyId===scope.familyId);
   const manages=Array.isArray(member.citeSeasonManagement)&&member.citeSeasonManagement.includes(scope.seasonId);
   const funding=assigned&&Array.isArray(member.citeFundingAssignments)&&member.citeFundingAssignments.some(a=>a.seasonId===scope.seasonId&&a.familyId===scope.familyId);
   const rewardPlan=Array.isArray(member.citeRewardPlanManagement)&&member.citeRewardPlanManagement.includes(scope.seasonId);
   const rewardOperations=Array.isArray(member.citeRewardOperations)&&member.citeRewardOperations.includes(scope.seasonId);
   const granted={member:assigned,manager:manages,funding,rewardPlan,rewardOperations,viewer:assigned||manages};if(!Object.hasOwn(granted,permission)||!granted[permission])throw denied();
   const ref=db.doc(`tenants/${scope.tenantId}/citeSeasons/${scope.seasonId}/privateEconomy/main`),snapshot=await tx.get(ref);if(!snapshot.exists)throw denied();
   const record=snapshot.data();if(record.state?.config?.tenantId!==scope.tenantId||record.state.config.seasonId!==scope.seasonId)throw denied();
   const result=await action(record,actor.uid,today(scope),{tx,db,capabilities:{funding}});if(result.record!==record){if(Buffer.byteLength(JSON.stringify(result.record))>800000)throw Object.assign(Error('City prototype capacity exceeded'),{status:409});tx.set(ref,result.record);}return result.value;
  });
 };
}
