import {canonicalJSON} from './canonical.ts';
import {exact,add,multiply,divide,mean,bounded,rounded} from '../domain/exact.ts';
import type {Exact} from '../domain/exact.ts';
import {civilDate,addDays} from '../domain/calendar.ts';
export const ECONOMY_VERSION='cite-economy-prototype-v1' as const;
export type Metric={id:string;label:string;weightBps:number};
export type Scope={tenantId:string;seasonId:string;familyId:string};
export type Week={id:string;start:string;endExclusive:string;active:boolean};
export type Membership={uid:string;familyId:string;from:string;toExclusive?:string};
export type Config={tenantId:string;seasonId:string;name:string;rulesVersion:typeof ECONOMY_VERSION;families:{id:string;name:string}[];memberships:Membership[];weeks:Week[];metrics:{performance:Metric[];values:Metric[]};missingDataPolicy:'defer'|'base-five';minimumValueResponses:number};
export type Credit={id:string;familyId:string;weekId:string;ecus:number;basis:'scored'|'base-five';ruleVersion:typeof ECONOMY_VERSION;postedOn:string};
export type State={schemaVersion:1;config:Config;balances:Record<string,number>;values:Record<string,Record<string,{familyId:string;scores:Record<string,string>}>>;performance:Record<string,Record<string,Record<string,string>>>;credits:Record<string,Credit>;audit:Credit[]};
export const identifier=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v)&&!Object.hasOwn(Object.prototype,v)&&v!=='prototype';
const check=(ok:unknown,message:string):void=>{if(!ok)throw new Error(message);};
const key=(familyId:string,weekId:string)=>JSON.stringify([familyId,weekId]);
function metrics(definitions:Metric[]){check(Array.isArray(definitions)&&definitions.length>0&&definitions.length<=20,'Choose 1–20 criteria per category');const ids=new Set();let total=0;for(const m of definitions){check(identifier(m.id)&&!ids.has(m.id)&&typeof m.label==='string'&&m.label.trim().length>0&&m.label.length<=160&&Number.isSafeInteger(m.weightBps)&&m.weightBps>0,'Invalid criterion');ids.add(m.id);total+=m.weightBps;}check(total===10000,'Criterion weights must total 10000 basis points');}
export function normalizedScore(definitions:Metric[],scores:Record<string,string>):Exact{
 metrics(definitions);check(!!scores&&typeof scores==='object'&&!Array.isArray(scores)&&Object.keys(scores).length===definitions.length,'All normalized criteria required');
 return definitions.reduce((sum,m)=>{check(Object.hasOwn(scores,m.id),'Unknown or missing criterion');return add(sum,multiply(bounded(exact(scores[m.id]),'1','5'),divide(exact(String(m.weightBps)),exact('10000'))));},exact('0'));
}
export function income(performance:Exact,values:Exact):number{
 bounded(performance,'1','5');bounded(values,'1','5');return Number(rounded(add(multiply(exact('2'),performance),multiply(exact('3'),values))));
}
/** Proposed reference prices. Inputs never include actual balances or earned income. */
export function buildingCost(category:'small'|'standard'|'large',referenceFamilies:number):number{
 check(Number.isSafeInteger(referenceFamilies)&&referenceFamilies>=1&&referenceFamilies<=100,'Invalid reference family count');check(['small','standard','large'].includes(category),'Unknown project category');return ({small:51,standard:81,large:111})[category]*referenceFamilies;
}
export function createEconomy(input:Config):State{
 const config=structuredClone(input);check(config.rulesVersion===ECONOMY_VERSION&&identifier(config.tenantId)&&identifier(config.seasonId)&&typeof config.name==='string'&&config.name.trim().length>0&&config.name.length<=160,'Invalid city season');
 check(['defer','base-five'].includes(config.missingDataPolicy)&&Number.isSafeInteger(config.minimumValueResponses)&&config.minimumValueResponses>=1&&config.minimumValueResponses<=10000,'Explicit missing-data policy required');metrics(config.metrics.performance);metrics(config.metrics.values);
 check(Array.isArray(config.families)&&config.families.length>0&&config.families.length<=100,'Choose 1–100 families');const families=new Set<string>();for(const f of config.families){check(identifier(f.id)&&!families.has(f.id)&&typeof f.name==='string'&&f.name.trim().length>0&&f.name.length<=160,'Invalid family');families.add(f.id);}
 check(Array.isArray(config.weeks)&&config.weeks.length>0&&config.weeks.length<=53,'Choose 1–53 weeks');const weeks=new Set();let end='';for(const w of config.weeks){check(identifier(w.id)&&!weeks.has(w.id)&&typeof w.active==='boolean'&&civilDate(w.start)>=end&&w.endExclusive===addDays(w.start,7),'Invalid or overlapping week');weeks.add(w.id);end=w.endExclusive;}
 check(Array.isArray(config.memberships)&&config.memberships.length<=10000,'Invalid membership roster');for(const [i,m]of config.memberships.entries()){check(identifier(m.uid)&&families.has(m.familyId)&&civilDate(m.from)<(m.toExclusive!==undefined?civilDate(m.toExclusive):'9999-12-31'),'Invalid dated membership');for(const other of config.memberships.slice(0,i))if(other.uid===m.uid)check((other.toExclusive??'9999-12-31')<=m.from||(m.toExclusive??'9999-12-31')<=other.from,'Overlapping member assignments');}
 return {schemaVersion:1,config,balances:Object.fromEntries(config.families.map(f=>[f.id,0])),values:{},performance:{},credits:{},audit:[]};
}
function context(state:State,scope:Scope,weekId:string){check(state.config.tenantId===scope.tenantId&&state.config.seasonId===scope.seasonId&&identifier(scope.familyId)&&Object.hasOwn(state.balances,scope.familyId),'City scope denied');const week=state.config.weeks.find(w=>w.id===weekId);check(week?.active,'Inactive or unknown week');return week!;}
export function eligibleMembers(state:State,familyId:string,week:Week){return state.config.memberships.filter(m=>m.familyId===familyId&&m.from<=week.start&&(!m.toExclusive||week.start<m.toExclusive)).map(m=>m.uid);}
function open(week:Week,onDate:string){check(civilDate(onDate)>=week.start&&onDate<week.endExclusive,'Submission window closed');}
function canonical(definitions:Metric[],scores:Record<string,string>){normalizedScore(definitions,scores);return Object.fromEntries(definitions.map(m=>[m.id,scores[m.id]]));}
export function submitValues(state:State,scope:Scope,uid:string,weekId:string,scores:Record<string,string>,onDate:string):State{
 const week=context(state,scope,weekId);check(eligibleMembers(state,scope.familyId,week).includes(uid),'Member not eligible for this week');const value=canonical(state.config.metrics.values,scores),old=state.values[weekId]?.[uid];
 if(old){check(old.familyId===scope.familyId&&canonicalJSON(old.scores)===canonicalJSON(value),'Correction requires an audited workflow');return state;}
 open(week,onDate);check(!state.credits[key(scope.familyId,weekId)],'Week already credited');const next=structuredClone(state);next.values[weekId]??={};next.values[weekId][uid]={familyId:scope.familyId,scores:value};return next;
}
export function recordPerformance(state:State,scope:Scope,weekId:string,scores:Record<string,string>,onDate:string):State{
 const week=context(state,scope,weekId),value=canonical(state.config.metrics.performance,scores),old=state.performance[weekId]?.[scope.familyId];
 if(old){check(canonicalJSON(old)===canonicalJSON(value),'Correction requires an audited workflow');return state;}
 open(week,onDate);check(!state.credits[key(scope.familyId,weekId)],'Week already credited');const next=structuredClone(state);next.performance[weekId]??={};next.performance[weekId][scope.familyId]=value;return next;
}
/** Server-authorized correction only: no retroactive change to a posted credit. */
export function correctUncreditedPerformance(state:State,scope:Scope,weekId:string,expected:Record<string,string>|null,scores:Record<string,string>,onDate:string):State{
 const week=context(state,scope,weekId),date=civilDate(onDate),value=canonical(state.config.metrics.performance,scores),old=state.performance[weekId]?.[scope.familyId]??null;
 check(date>=week.start&&!state.credits[key(scope.familyId,weekId)],'Uncredited started week required');
 check(old!==null||date>=week.endExclusive,'Use normal recording during the first submission window');
 if(expected!==null)canonical(state.config.metrics.performance,expected);
 check(canonicalJSON(old)===canonicalJSON(expected),'Performance changed since review');
 check(canonicalJSON(old)!==canonicalJSON(value),'Correction must change the performance');
 const next=structuredClone(state);next.performance[weekId]??={};next.performance[weekId][scope.familyId]=value;return next;
}
export function closeFamilyWeek(state:State,scope:Scope,weekId:string,onDate:string):{state:State;credit?:Credit;deferred?:true}{
 const week=context(state,scope,weekId);check(civilDate(onDate)>=week.endExclusive,'Cannot close a future week');const id=key(scope.familyId,weekId);if(state.credits[id])return {state,credit:state.credits[id]};
 const professional=state.performance[weekId]?.[scope.familyId],members=eligibleMembers(state,scope.familyId,week),responses=members.flatMap(uid=>{const r=state.values[weekId]?.[uid];return r?.familyId===scope.familyId?[r.scores]:[];});
 check(members.length>0,'No eligible members for this week');
 const complete=!!professional&&responses.length>=state.config.minimumValueResponses;
 if(!complete&&state.config.missingDataPolicy==='defer')return {state,deferred:true};
 const ecus=complete?income(normalizedScore(state.config.metrics.performance,professional!),mean(responses.map(r=>normalizedScore(state.config.metrics.values,r)))):5;
 const credit:Credit={id,familyId:scope.familyId,weekId,ecus,basis:complete?'scored':'base-five',ruleVersion:ECONOMY_VERSION,postedOn:onDate};const next=structuredClone(state);check(Number.isSafeInteger(next.balances[scope.familyId])&&next.balances[scope.familyId]>=0,'Invalid purse');check(Number.isSafeInteger(next.balances[scope.familyId]+ecus),'Purse overflow');next.balances[scope.familyId]+=ecus;next.credits[id]=credit;next.audit.push(credit);return {state:next,credit};
}
/** No individual evaluation, category score, roster or other-family purse is projected. */
export function familyEconomyView(state:State,scope:Scope){check(state.config.tenantId===scope.tenantId&&state.config.seasonId===scope.seasonId&&Object.hasOwn(state.balances,scope.familyId),'City scope denied');return {schemaVersion:1,city:state.config.name,family:structuredClone(state.config.families.find(f=>f.id===scope.familyId)!),ecus:state.balances[scope.familyId],credits:Object.values(state.credits).filter(c=>c.familyId===scope.familyId).map(c=>({...c})),rules:{version:ECONOMY_VERSION,status:'provisional',referenceFamilyCount:state.config.families.length}};}
