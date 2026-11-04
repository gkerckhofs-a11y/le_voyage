import {createCiteStore} from './cite-store.mjs';
import {createRewards,syncRewards,rewardSummary,personalRewards,rewardOperations} from '../cite/rewards.ts';
const denied=()=>Object.assign(Error('Reward state unavailable'),{status:409});
/** Shares the private ledger transaction; no public route or fulfillment order is registered. */
export function createCiteRewardsService(adapter,options={}){
 const store=createCiteStore(adapter,options);
 const operate=(header,scope,permission,fn)=>store(header,scope,permission,(record,uid,date)=>{
  if(!record.councils)throw denied();
  const game={economy:record.state,councils:record.councils,...(record.city?{city:record.city}:{})};
  return fn(record,game,uid,date);
 });
 return {
  initialize:(header,scope,plan)=>operate(header,scope,'rewardPlan',(record,game,uid,date)=>{
   if(record.rewards){if(JSON.stringify(record.rewards.plan)!==JSON.stringify(plan))throw denied();return {record,value:rewardSummary(record.rewards)};}
   const rewards=createRewards(game,scope,plan,uid,date);return {record:{...record,rewards},value:rewardSummary(rewards)};
  }),
  settle:(header,scope)=>operate(header,scope,'manager',(record,game,_uid,date)=>{
   if(!record.rewards)throw denied();const rewards=syncRewards(game,scope,record.rewards,date);
   return {record:rewards===record.rewards?record:{...record,rewards},value:rewardSummary(rewards)};
  }),
  personal:(header,scope)=>operate(header,scope,'member',(record,_game,uid)=>{if(!record.rewards)throw denied();return {record,value:personalRewards(record.rewards,uid)};}),
  summary:(header,scope)=>operate(header,scope,'viewer',(record)=>{if(!record.rewards)throw denied();return {record,value:rewardSummary(record.rewards)};}),
  operations:(header,scope)=>operate(header,scope,'rewardOperations',record=>{if(!record.rewards)throw denied();return {record,value:rewardOperations(record.rewards)};})
 };
}
