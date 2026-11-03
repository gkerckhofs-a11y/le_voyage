import {REWARDS_VERSION} from './rewards.ts';
import type {RewardPlan} from './rewards.ts';
export const PILOT_REWARD_MODES=['none','participation','family','party','participation-family','participation-party','family-party','all'] as const;
export type PilotRewardMode=typeof PILOT_REWARD_MODES[number];
/** Fictional EUR-cent allowances. They never authorize a purchase or a real gift. */
export function pilotRewardPlan(mode:PilotRewardMode):RewardPlan{
 if(!PILOT_REWARD_MODES.includes(mode))throw Object.assign(Error('Unknown reward demonstration'),{status:400});
 const participation=mode==='all'||mode.split('-').includes('participation')?{budgetCents:6000,unitCents:1000,numerator:10,denominator:13}:null;
 const family=mode==='all'||mode.split('-').includes('family')?{budgetCents:27000,maxGiftsPerPerson:2,tiers:[
  {id:'performance',label:'Attention de performance',unitCents:2000,match:'all' as const,conditions:[{kind:'performance' as const,minimum:'4',weeks:4}]},
  {id:'ambition-50',label:'Première découverte',unitCents:1500,match:'all' as const,conditions:[{kind:'ambition' as const,threshold:50 as const}]},
  {id:'ambition-80',label:'Seconde découverte',unitCents:2500,match:'all' as const,conditions:[{kind:'ambition' as const,threshold:80 as const}]}
 ]}:null;
 const party=mode==='all'||mode.split('-').includes('party')?{budgetCents:100000,basis:'final' as const,base:{id:'base',label:'Réception de base',costCents:30000},tiers:[{id:'convivial',label:'Fête conviviale',costCents:50000,minimumDevelopment:40},{id:'festive',label:'Fête enrichie',costCents:75000,minimumDevelopment:60},{id:'grand',label:'Grande Fête des Fondateurs',costCents:100000,minimumDevelopment:80}]}:null;
 return {version:REWARDS_VERSION,status:'provisional',currency:'EUR',moneyBasis:'simulation-only',budgetCents:(participation?.budgetCents??0)+(family?.budgetCents??0)+(party?.budgetCents??0),participation,family,party};
}
