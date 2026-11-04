import {identifier,normalizedScore} from './economy.ts';
import type {Scope} from './economy.ts';
import type {Game} from './councils.ts';
import {development} from './city-state.ts';
import {civilDate} from '../domain/calendar.ts';
import {exact,mean,bounded,compare} from '../domain/exact.ts';

export const REWARDS_VERSION='cite-rewards-prototype-v1' as const;
type Condition={kind:'ambition';threshold:50|80}|{kind:'performance';minimum:string;weeks:number};
type GiftTier={id:string;label:string;unitCents:number;match:'any'|'all';conditions:Condition[]};
type PartyTier={id:string;label:string;costCents:number;minimumDevelopment:number};
export type RewardPlan={
 version:typeof REWARDS_VERSION;status:'provisional';currency:'EUR';moneyBasis:'simulation-only';budgetCents:number;
 participation:null|{budgetCents:number;unitCents:number;numerator:number;denominator:number};
 family:null|{budgetCents:number;maxGiftsPerPerson:number;tiers:GiftTier[]};
 party:null|{budgetCents:number;basis:'final';base:Omit<PartyTier,'minimumDevelopment'>;tiers:PartyTier[]};
};
export type Unlock={id:string;program:'participation'|'family'|'party';tierId:string;label:string;uid:string|null;familyId:string|null;allocatedCents:number;earnedOn:string};
export type Rewards={tenantId:string;seasonId:string;plan:RewardPlan;unlocks:Record<string,Unlock>;provisionedCents:number;initializedBy:string;initializedOn:string;finalizedOn:string|null};
const check=(ok:unknown,message:string,status=409):void=>{if(!ok)throw Object.assign(Error(message),{status});};
const money=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=100000000;
function keys(v:unknown,wanted:string[]){check(!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...wanted].sort().join(','),'Explicit reward fields required',400);}
function identity(t:{id:string;label:string}){check(identifier(t.id)&&typeof t.label==='string'&&!!t.label.trim()&&t.label.length<=160,'Invalid reward tier',400);}
function scopeCheck(game:Game,scope:Scope,rewards?:Rewards){
 const c=game.economy.config;
 check(c.tenantId===scope.tenantId&&c.seasonId===scope.seasonId&&identifier(scope.familyId)&&c.families.some(f=>f.id===scope.familyId),'Reward scope denied',403);
 if(rewards)check(rewards.tenantId===c.tenantId&&rewards.seasonId===c.seasonId,'Foreign reward state',403);
}
/** Freeze explicit rules and provision the worst case, independent of achieved game scores. */
export function createRewards(game:Game,scope:Scope,input:RewardPlan,actor:string,onDate:string):Rewards{
 scopeCheck(game,scope);check(identifier(actor)&&game.councils.order.length===0,'Reward plan must precede the first Council');civilDate(onDate);
 const plan=structuredClone(input);keys(plan,['version','status','currency','moneyBasis','budgetCents','participation','family','party']);
 check(plan.version===REWARDS_VERSION&&plan.status==='provisional'&&plan.currency==='EUR'&&plan.moneyBasis==='simulation-only'&&money(plan.budgetCents),'Explicit prototype reward plan required',400);
 const people=new Set(game.economy.config.memberships.map(m=>m.uid)).size;
 let provisioned=0;
 if(plan.participation){const p=plan.participation;keys(p,['budgetCents','unitCents','numerator','denominator']);
  check(money(p.budgetCents)&&money(p.unitCents)&&p.unitCents>0&&Number.isInteger(p.numerator)&&Number.isInteger(p.denominator)&&p.numerator>0&&p.numerator<=p.denominator&&p.denominator<=53,'Invalid participation plan',400);
  check(p.budgetCents>=people*p.unitCents,'Insufficient participation provision');provisioned+=p.budgetCents;
 }else check(plan.participation===null,'Explicit disabled participation required',400);
 if(plan.family){const p=plan.family;keys(p,['budgetCents','maxGiftsPerPerson','tiers']);
  check(money(p.budgetCents)&&Array.isArray(p.tiers)&&p.tiers.length>0&&p.tiers.length<=10&&Number.isInteger(p.maxGiftsPerPerson)&&p.maxGiftsPerPerson>0&&p.maxGiftsPerPerson<=p.tiers.length,'Invalid family plan',400);
  const ids=new Set();for(const t of p.tiers){keys(t,['id','label','unitCents','match','conditions']);identity(t);check(!ids.has(t.id)&&money(t.unitCents)&&t.unitCents>0&&['any','all'].includes(t.match)&&Array.isArray(t.conditions)&&t.conditions.length>0&&t.conditions.length<=5,'Explicit family conditions required',400);ids.add(t.id);
   for(const condition of t.conditions){if(condition.kind==='ambition'){keys(condition,['kind','threshold']);check([50,80].includes(condition.threshold)&&!!game.city,'City ambition required',400);}else{keys(condition,['kind','minimum','weeks']);check(condition.kind==='performance'&&typeof condition.minimum==='string'&&Number.isInteger(condition.weeks)&&condition.weeks>0&&condition.weeks<=game.economy.config.weeks.length,'Invalid performance condition',400);bounded(exact(condition.minimum),'1','5');}}
  }
  const highest=p.tiers.map(t=>t.unitCents).sort((a,b)=>b-a).slice(0,p.maxGiftsPerPerson).reduce((a,b)=>a+b,0);
  check(p.budgetCents>=people*highest,'Insufficient family provision');provisioned+=p.budgetCents;
 }else check(plan.family===null,'Explicit disabled family programme required',400);
 if(plan.party){const p=plan.party;keys(p,['budgetCents','basis','base','tiers']);keys(p.base,['id','label','costCents']);identity(p.base);
  check(p.basis==='final'&&money(p.budgetCents)&&money(p.base.costCents)&&Array.isArray(p.tiers)&&p.tiers.length<=10,'Explicit final-score party plan required',400);
  let threshold=-1,cost=p.base.costCents;const ids=new Set([p.base.id]);for(const t of p.tiers){keys(t,['id','label','costCents','minimumDevelopment']);identity(t);check(!ids.has(t.id)&&Number.isInteger(t.minimumDevelopment)&&t.minimumDevelopment>=0&&t.minimumDevelopment<=100&&t.minimumDevelopment>threshold&&money(t.costCents)&&t.costCents>=cost,'Party tiers must increase explicitly',400);ids.add(t.id);threshold=t.minimumDevelopment;cost=t.costCents;}
  check(p.budgetCents>=cost,'Insufficient party provision');provisioned+=p.budgetCents;
 }else check(plan.party===null,'Explicit disabled party required',400);
 check(plan.budgetCents>=provisioned,'Insufficient total reward budget');
 return {tenantId:scope.tenantId,seasonId:scope.seasonId,plan,unlocks:{},provisionedCents:provisioned,initializedBy:actor,initializedOn:onDate,finalizedOn:null};
}
function eventDate(game:Game,id:string){
 if(id==='city-initialized')return game.economy.config.weeks[0].start;
 return game.councils.resolutions.find(r=>'council-'+r.councilId===id)?.resolvedOn??Object.values(game.city?.crises??{}).find(c=>c.id===id)?.occurredOn;
}
function matches(game:Game,familyId:string,condition:Condition,onDate:string):boolean{
 if(condition.kind==='ambition')return game.city?.ambitions[familyId]?.milestones.some(m=>{const date=eventDate(game,m.eventId);return m.threshold===condition.threshold&&!!date&&date<=onDate;})??false;
 const credits=Object.values(game.economy.credits).filter(c=>c.familyId===familyId&&c.basis==='scored'&&c.postedOn<=onDate);
 if(credits.length<condition.weeks)return false;
 const scores=credits.map(c=>normalizedScore(game.economy.config.metrics.performance,game.economy.performance[c.weekId][familyId]));
 return compare(mean(scores),exact(condition.minimum))>=0;
}
function complete(game:Game,onDate:string){
 const c=game.economy.config,last=c.weeks.at(-1)!;
 return onDate>=last.endExclusive&&game.councils.order.length===Math.floor(c.weeks.length/4)&&game.councils.order.every(id=>game.councils.records[id].phase==='resolved')&&c.weeks.filter(w=>w.active).every(w=>c.families.every(f=>{
  const members=c.memberships.some(m=>m.familyId===f.id&&m.from<=w.start&&(!m.toExclusive||w.start<m.toExclusive));
  return !members||Object.values(game.economy.credits).some(e=>e.familyId===f.id&&e.weekId===w.id&&e.postedOn<=onDate);
 }));
}
/** Trusted state only: callers never supply votes, achievement dates or final scores. */
export function syncRewards(game:Game,scope:Scope,current:Rewards,onDate:string):Rewards{
 scopeCheck(game,scope,current);civilDate(onDate);check(onDate>=current.initializedOn,'Reward clock moved backwards');
 if(current.finalizedOn)return current;
 const next=structuredClone(current),plan=next.plan,c=game.economy.config;
 const grant=(program:Unlock['program'],tierId:string,label:string,uid:string|null,familyId:string|null,allocatedCents:number,earnedOn:string)=>{
  const id=JSON.stringify([program,tierId,uid]);if(next.unlocks[id])return;
  const used=Object.values(next.unlocks).filter(u=>u.program===program).reduce((n,u)=>n+u.allocatedCents,0);
  check(used+allocatedCents<=plan[program]!.budgetCents,'Reward envelope exceeded');
  next.unlocks[id]={id,program,tierId,label,uid,familyId,allocatedCents,earnedOn};
 };
 if(plan.family){
  const dates=[...new Set([c.weeks[0].start,...Object.values(game.economy.credits).map(e=>e.postedOn),...game.councils.resolutions.map(r=>r.resolvedOn),...Object.values(game.city?.crises??{}).map(e=>e.occurredOn)])].filter(d=>d>=next.initializedOn&&d<=onDate).sort();
  const observed=new Set<string>();
  // Stable chronology and explicit tier order govern the per-person cap. Never disclose the matching ambition.
  for(const date of dates)for(const tier of plan.family.tiers)for(const family of c.families){
   const key=JSON.stringify([tier.id,family.id]);if(observed.has(key))continue;
   const conditions=tier.conditions.map(condition=>matches(game,family.id,condition,date));if(!(tier.match==='all'?conditions.every(Boolean):conditions.some(Boolean)))continue;
   // Freeze recipients at the first matching event, including during delayed reconciliation.
   observed.add(key);
   const recipients=c.memberships.filter(m=>m.familyId===family.id&&m.from<=date&&(!m.toExclusive||date<m.toExclusive));
   for(const m of recipients){const count=Object.values(next.unlocks).filter(u=>u.program==='family'&&u.uid===m.uid).length;if(count<plan.family.maxGiftsPerPerson)grant('family',tier.id,tier.label,m.uid,family.id,tier.unitCents,date);}
  }
 }
 if(complete(game,onDate)){
  const earnedOn=c.weeks.at(-1)!.endExclusive;
  if(plan.participation)for(const uid of new Set(c.memberships.map(m=>m.uid))){
   const eligible=Object.values(game.councils.records).filter(r=>Object.entries(r.roster).some(([f,people])=>people.includes(uid)&&!r.suspended.includes(f)));
   const participated=eligible.filter(r=>Object.values(r.ballots).some(round=>Object.hasOwn(round,uid))).length;
   const required=Math.ceil(eligible.length*plan.participation.numerator/plan.participation.denominator);
   if(eligible.length>0&&participated>=required)grant('participation','participation','Participation aux Conseils',uid,null,plan.participation.unitCents,earnedOn);
  }
  if(plan.party){const score=development(game.councils.gauges),tier=[...plan.party.tiers].reverse().find(t=>score>=t.minimumDevelopment)??plan.party.base;grant('party',tier.id,tier.label,null,null,tier.costCents,earnedOn);}
  next.finalizedOn=onDate;
 }
 return JSON.stringify(next)===JSON.stringify(current)?current:next;
}
export function rewardSummary(state:Rewards){
 return {status:'provisional',programmes:{participation:!!state.plan.participation,family:!!state.plan.family,party:!!state.plan.party},finalized:!!state.finalizedOn,party:structuredClone(Object.values(state.unlocks).find(u=>u.program==='party')??null)};
}
export function personalRewards(state:Rewards,uid:string){check(identifier(uid),'Invalid recipient',403);return {...rewardSummary(state),myUnlocks:Object.values(state.unlocks).filter(u=>u.uid===uid).map(u=>({...u}))};}
/** Explicit capability required by the server: no secret trigger, ballot or performance score is projected. */
export function rewardOperations(state:Rewards){return {...rewardSummary(state),budgetCents:state.plan.budgetCents,provisionedCents:state.provisionedCents,allocatedCents:Object.values(state.unlocks).reduce((n,u)=>n+u.allocatedCents,0),unlocks:Object.values(state.unlocks).map(u=>({...u}))};}
