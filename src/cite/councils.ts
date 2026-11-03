import {canonicalJSON} from './canonical.ts';
import {identifier,buildingCost} from './economy.ts';
import type {State as Economy,Scope} from './economy.ts';
import {civilDate} from '../domain/calendar.ts';
import {GAUGES,CRISIS_KINDS,observeAmbitions} from './city-state.ts';
import type {Gauges,Effects,CityState,CrisisKind} from './city-state.ts';
import {crisisAtOpening} from './city.ts';
export {GAUGES} from './city-state.ts';
export type {Gauge,Gauges,Effects} from './city-state.ts';
export const COUNCIL_RULES={version:'cite-councils-prototype-v1',quorum:'alert-only',surplus:'reject-overfunding',runoff:'one',suspendedBallots:'disabled'} as const;
export type Project={id:string;name:string;category:'small'|'standard'|'large';effects:Effects;narrative:string;protection?:CrisisKind;repairs?:string};
export type CouncilInput={id:string;weekId:string;title:string;mode:'choice'|'yes-no';projects:Project[];voteOpensOn:string;firstVoteClosesOn:string;secondVoteClosesOn:string;fundingClosesOn:string;failure:{narrative:string;effects:Effects}};
type Definition=Omit<CouncilInput,'projects'>&{projects:(Project&{cost:number})[]};
type RoundResult={round:1|2;familyVotes:Record<string,{choice:string;status:'expressed'|'abstained'|'suspended';lowParticipation:boolean}>;tally:Record<string,number>;outcome:'selected'|'tie'|'rejected'|'no-votes';selected?:string};
export type Resolution={councilId:string;ordinal:number;status:'built'|'failed';reason:string;projectId?:string;repairedBuilding?:string;cost:number;effects:Effects;narrative:string;resolvedOn:string};
export type Council={definition:Definition;ordinal:number;phase:'voting'|'funding'|'resolved';round:1|2;roster:Record<string,string[]>;suspended:string[];ballots:Record<string,Record<string,{familyId:string;choice:string}>>;rounds:RoundResult[];selected?:string;pledges:Record<string,{amount:number;revision:number}>;resolution?:Resolution};
export type Governance={rules:typeof COUNCIL_RULES;initialGauges:Gauges;gauges:Gauges;order:string[];records:Record<string,Council>;suspendedFor:Record<string,number>;buildings:Record<string,{project:Project&{cost:number};councilId:string}>;spending:{councilId:string;familyId:string;ecus:number;postedOn:string}[];resolutions:Resolution[];mutations:Record<string,string>};
export type Game={economy:Economy;councils:Governance;city?:CityState};
const requireThat=(ok:unknown,message:string,status=409):void=>{if(!ok)throw Object.assign(Error(message),{status});};
const text=(s:unknown,max=1000):s is string=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
function effects(input:Effects):Effects{
 requireThat(!!input&&typeof input==='object'&&!Array.isArray(input),'Invalid effects',400);
 requireThat(Object.entries(input).every(([k,v])=>(GAUGES as readonly string[]).includes(k)&&typeof v==='number'&&Number.isSafeInteger(v)&&v>=-100&&v<=100),'Invalid gauge delta',400);
 return Object.fromEntries(GAUGES.filter(k=>Object.hasOwn(input,k)).map(k=>[k,input[k]]));
}
export function createGovernance(economy:Economy,initialGauges:Gauges,rules:typeof COUNCIL_RULES):Game{
 requireThat(!!rules&&Object.keys(rules).length===Object.keys(COUNCIL_RULES).length&&Object.entries(COUNCIL_RULES).every(([k,v])=>rules[k as keyof typeof COUNCIL_RULES]===v),'Explicit prototype Council rules required',400);
 requireThat(!!initialGauges&&Object.keys(initialGauges).length===5&&GAUGES.every(k=>Number.isInteger(initialGauges[k])&&initialGauges[k]>=0&&initialGauges[k]<=100),'Five initial gauges required',400);
 return {economy:structuredClone(economy),councils:{rules:structuredClone(rules),initialGauges:structuredClone(initialGauges),gauges:structuredClone(initialGauges),order:[],records:{},suspendedFor:{},buildings:{},spending:[],resolutions:[],mutations:{}}};
}
function scopeCheck(game:Game,scope:Scope){requireThat(game.economy.config.tenantId===scope.tenantId&&game.economy.config.seasonId===scope.seasonId&&identifier(scope.familyId)&&Object.hasOwn(game.economy.balances,scope.familyId),'City scope denied',403);}
function council(game:Game,scope:Scope,id:string){scopeCheck(game,scope);requireThat(identifier(id)&&Object.hasOwn(game.councils.records,id),'Unknown Council',404);return game.councils.records[id];}
function choices(c:Council){return c.definition.mode==='choice'?c.definition.projects.map(p=>p.id):['yes','no'];}
function normalize(game:Game,input:CouncilInput,ordinal:number):Definition{
 requireThat(!!input&&identifier(input.id)&&text(input.title,200)&&['choice','yes-no'].includes(input.mode),'Invalid Council',400);
 const week=game.economy.config.weeks[ordinal*4-1];requireThat(ordinal<=13&&week?.active&&week.id===input.weekId,'Council must use its fourth week',400);
 const dates=[input.voteOpensOn,input.firstVoteClosesOn,input.secondVoteClosesOn,input.fundingClosesOn].map(civilDate);
 requireThat(week.start<=dates[0]&&dates[0]<dates[1]&&dates[1]<dates[2]&&dates[2]<dates[3]&&dates[3]<=week.endExclusive,'Invalid Council windows',400);
 requireThat(Array.isArray(input.projects)&&input.projects.length===(input.mode==='choice'?2:1),'Choose one or two projects',400);
 const seen=new Set();const projects=input.projects.map(p=>{requireThat(!!p&&Object.keys(p).filter(k=>!['protection','repairs'].includes(k)).sort().join(',')==='category,effects,id,name,narrative'&&(!Object.hasOwn(p,'protection')||CRISIS_KINDS.includes(p.protection!))&&(!Object.hasOwn(p,'repairs')||identifier(p.repairs))&&!(p.repairs&&p.protection)&&identifier(p.id)&&!['abstain','yes','no'].includes(p.id)&&!seen.has(p.id)&&text(p.name,160)&&text(p.narrative),'Invalid project',400);seen.add(p.id);return {id:p.id,name:p.name,category:p.category,effects:effects(p.effects),narrative:p.narrative,...(p.protection?{protection:p.protection}:{}),...(p.repairs?{repairs:p.repairs}:{}),cost:buildingCost(p.category,game.economy.config.families.length)};});
 requireThat(input.failure&&text(input.failure.narrative),'Failure consequence required',400);
 return {id:input.id,weekId:input.weekId,title:input.title,mode:input.mode,projects,voteOpensOn:dates[0],firstVoteClosesOn:dates[1],secondVoteClosesOn:dates[2],fundingClosesOn:dates[3],failure:{narrative:input.failure.narrative,effects:effects(input.failure.effects)}};
}
export function prepareCouncilDefinition(game:Game,scope:Scope,input:CouncilInput):Definition{
 scopeCheck(game,scope);return normalize(game,input,game.councils.records[input?.id]?.ordinal??game.councils.order.length+1);
}
export function openCouncil(game:Game,scope:Scope,input:CouncilInput,onDate:string):Game{
 scopeCheck(game,scope);requireThat(!!input&&identifier(input.id),'Invalid Council',400);const existing=game.councils.records[input.id];const ordinal=existing?.ordinal??game.councils.order.length+1;const definition=normalize(game,input,ordinal);
 if(existing){requireThat(canonicalJSON(existing.definition)===canonicalJSON(definition),'Council identifier already used');return game;}
 const last=game.councils.records[game.councils.order.at(-1)??''];requireThat(!last||last.phase==='resolved','Resolve previous Council first');
 requireThat(civilDate(onDate)>=definition.voteOpensOn&&onDate<definition.firstVoteClosesOn,'Council not in opening window');
 requireThat(definition.projects.every(p=>!game.councils.buildings[p.id]),'Project already built');
 requireThat(definition.projects.every(p=>!p.repairs||(game.councils.buildings[p.repairs]&&game.city?.buildingConditions[p.repairs]==='damaged')),'Repair requires a damaged building');
 const roster=Object.fromEntries(game.economy.config.families.map(f=>[f.id,game.economy.config.memberships.filter(m=>m.familyId===f.id&&m.from<=definition.voteOpensOn&&(!m.toExclusive||definition.voteOpensOn<m.toExclusive)).map(m=>m.uid)]));
 const suspended=game.economy.config.families.length===1?[]:game.economy.config.families.filter(f=>game.councils.suspendedFor[f.id]===ordinal).map(f=>f.id);
 const next=structuredClone(game);next.councils.order.push(definition.id);next.councils.records[definition.id]={definition,ordinal,phase:'voting',round:1,roster,suspended,ballots:{'1':{},'2':{}},rounds:[],pledges:{}};return crisisAtOpening(next,scope,definition.id,onDate);
}
export function castBallot(game:Game,scope:Scope,uid:string,id:string,round:1|2,choice:string,onDate:string):Game{
 const c=council(game,scope,id);requireThat(identifier(uid)&&c.roster[scope.familyId].includes(uid)&&!c.suspended.includes(scope.familyId),'Member cannot vote',403);requireThat((round===1||round===2)&&[...choices(c),'abstain'].includes(choice),'Invalid ballot',400);
 const old=c.ballots[String(round)][uid];if(old){requireThat(old.familyId===scope.familyId&&old.choice===choice,'One immutable ballot per round');return game;}
 const from=round===1?c.definition.voteOpensOn:c.definition.firstVoteClosesOn,to=round===1?c.definition.firstVoteClosesOn:c.definition.secondVoteClosesOn;
 requireThat(c.phase==='voting'&&c.round===round&&civilDate(onDate)>=from&&onDate<to,'Ballot window closed');const next=structuredClone(game);next.councils.records[id].ballots[String(round)][uid]={familyId:scope.familyId,choice};return next;
}
function tally(c:Council):RoundResult{
 const options=choices(c),familyVotes:RoundResult['familyVotes']={},result=Object.fromEntries(options.map(p=>[p,0]));
 for(const [familyId,roster]of Object.entries(c.roster)){
  const ballots=Object.values(c.ballots[String(c.round)]).filter(b=>b.familyId===familyId),counts=options.map(o=>ballots.filter(b=>b.choice===o).length);
  const suspended=c.suspended.includes(familyId),choice=suspended||counts[0]===counts[1]?'abstain':options[counts[0]>counts[1]?0:1];
  familyVotes[familyId]={choice,status:suspended?'suspended':choice==='abstain'?'abstained':'expressed',lowParticipation:ballots.length<roster.length};if(choice!=='abstain')result[choice]++;
 }
 const [a,b]=options,selected=result[a]>result[b]?a:b;const outcome=result[a]+result[b]===0?'no-votes':result[a]===result[b]?'tie':c.definition.mode==='yes-no'&&selected==='no'?'rejected':'selected';
 return {round:c.round,familyVotes,tally:result,outcome,...(outcome==='selected'?{selected:c.definition.mode==='yes-no'?c.definition.projects[0].id:selected}:{})};
}
function resolve(game:Game,id:string,status:'built'|'failed',reason:string,onDate:string):Game{
 const next=structuredClone(game),c=next.councils.records[id],project=c.definition.projects.find(p=>p.id===c.selected);
 const delta=status==='built'?project!.effects:c.definition.failure.effects;
 const resolution:Resolution={councilId:id,ordinal:c.ordinal,status,reason,...(status==='built'?{projectId:project!.id,...(project!.repairs?{repairedBuilding:project!.repairs}:{})}:{}),cost:status==='built'?project!.cost:0,effects:structuredClone(delta),narrative:status==='built'?project!.narrative:c.definition.failure.narrative,resolvedOn:onDate};
 if(status==='built'){
  requireThat(!!project&&!next.councils.buildings[project.id],'Project unavailable');
  for(const f of next.economy.config.families){const amount=c.pledges[f.id]?.amount??0,balance=next.economy.balances[f.id];requireThat(Number.isSafeInteger(balance)&&balance>=amount&&Number.isSafeInteger(amount)&&amount>=0,'Invalid funding balance');if(amount>0){next.economy.balances[f.id]-=amount;next.councils.spending.push({councilId:id,familyId:f.id,ecus:amount,postedOn:onDate});}else if(balance>0&&next.economy.config.families.length>1)next.councils.suspendedFor[f.id]=c.ordinal+1;}
  if(project!.repairs){requireThat(next.city?.buildingConditions[project!.repairs]==='damaged','Repair target unavailable');next.city!.buildingConditions[project!.repairs]='intact';}else next.councils.buildings[project!.id]={project:structuredClone(project!),councilId:id};
 }
 for(const k of GAUGES)next.councils.gauges[k]=Math.min(100,Math.max(0,next.councils.gauges[k]+(delta[k]??0)));
 if(next.city)next.city=observeAmbitions(next.city,next.councils.gauges,'council-'+id);
 c.phase='resolved';c.resolution=resolution;next.councils.resolutions.push(resolution);return next;
}
export function closeVote(game:Game,scope:Scope,id:string,round:1|2,onDate:string):Game{
 const c=council(game,scope,id);requireThat(round===1||round===2,'Invalid round',400);if(c.rounds.some(r=>r.round===round))return game;
 requireThat(c.phase==='voting'&&c.round===round&&civilDate(onDate)>=(round===1?c.definition.firstVoteClosesOn:c.definition.secondVoteClosesOn),'Vote cannot close yet');
 const result=tally(c),next=structuredClone(game),changed=next.councils.records[id];changed.rounds.push(result);
 if(result.outcome==='selected'){changed.selected=result.selected;changed.phase='funding';return next;}
 if(result.outcome==='tie'&&round===1&&onDate<c.definition.secondVoteClosesOn){changed.round=2;return next;}
 return resolve(next,id,'failed',result.outcome==='tie'?(round===1?'runoff-window-missed':'persistent-tie'):result.outcome,onDate);
}
export function pledge(game:Game,scope:Scope,uid:string,id:string,amount:number,revision:number,mutationId:string,onDate:string):Game{
 const c=council(game,scope,id);requireThat(identifier(uid)&&game.economy.config.memberships.some(m=>m.uid===uid&&m.familyId===scope.familyId&&m.from<=civilDate(onDate)&&(!m.toExclusive||onDate<m.toExclusive)),'Funding delegate not in family',403);
 requireThat(Number.isSafeInteger(amount)&&amount>=0&&Number.isSafeInteger(revision)&&revision>=0&&identifier(mutationId)&&mutationId.length>=8,'Invalid pledge',400);
 const fingerprint=JSON.stringify([scope.tenantId,scope.seasonId,scope.familyId,uid,id,amount,revision]);const previous=game.councils.mutations[mutationId];if(previous){requireThat(previous===fingerprint,'Mutation identifier already used');return game;}
 requireThat(c.phase==='funding'&&onDate>=(c.round===1?c.definition.firstVoteClosesOn:c.definition.secondVoteClosesOn)&&onDate<c.definition.fundingClosesOn,'Funding window closed');requireThat((c.pledges[scope.familyId]?.revision??0)===revision,'Stale family pledge');
 const project=c.definition.projects.find(p=>p.id===c.selected)!;requireThat(amount<=game.economy.balances[scope.familyId],'Insufficient purse');const others=Object.entries(c.pledges).filter(([f])=>f!==scope.familyId).reduce((n,[,p])=>n+p.amount,0);requireThat(others+amount<=project.cost,'Pledge exceeds remaining cost');
 const next=structuredClone(game);next.councils.records[id].pledges[scope.familyId]={amount,revision:revision+1};next.councils.mutations[mutationId]=fingerprint;return next;
}
export function closeFunding(game:Game,scope:Scope,id:string,onDate:string):Game{
 const c=council(game,scope,id);if(c.phase==='resolved')return game;requireThat(c.phase==='funding'&&civilDate(onDate)>=c.definition.fundingClosesOn,'Funding cannot close yet');
 requireThat(Object.entries(c.pledges).every(([f,p])=>Object.hasOwn(game.economy.balances,f)&&Number.isSafeInteger(p.amount)&&p.amount>=0),'Invalid stored pledge');const project=c.definition.projects.find(p=>p.id===c.selected)!,total=Object.values(c.pledges).reduce((n,p)=>n+p.amount,0);requireThat(total<=project.cost,'Invalid overfunding');return resolve(game,id,total===project.cost?'built':'failed',total===project.cost?'funded':'underfunded',onDate);
}
export function councilPublicView(game:Game,scope:Scope,id:string){const c=council(game,scope,id),project=c.definition.projects.find(p=>p.id===c.selected),pledged=Object.values(c.pledges).reduce((n,p)=>n+p.amount,0);return {id,ordinal:c.ordinal,definition:structuredClone(c.definition),phase:c.phase,round:c.round,rounds:structuredClone(c.rounds),selected:c.selected??null,funding:{cost:project?.cost??null,pledged,remaining:project?project.cost-pledged:null},resolution:structuredClone(c.resolution??null),gauges:structuredClone(game.councils.gauges),buildings:Object.values(game.councils.buildings).map(b=>({id:b.project.id,name:b.project.name,councilId:b.councilId})),rules:structuredClone(game.councils.rules)};}
export function councilFamilyView(game:Game,scope:Scope,uid:string,id:string,onDate:string){const c=council(game,scope,id),from=c.round===1?c.definition.voteOpensOn:c.definition.firstVoteClosesOn,to=c.round===1?c.definition.firstVoteClosesOn:c.definition.secondVoteClosesOn;return {...councilPublicView(game,scope,id),myFamily:{id:scope.familyId,ecus:game.economy.balances[scope.familyId],suspended:c.suspended.includes(scope.familyId),canVote:c.phase==='voting'&&from<=onDate&&onDate<to&&c.roster[scope.familyId].includes(uid)&&!c.suspended.includes(scope.familyId)&&!c.ballots[String(c.round)][uid],ballot:c.ballots[String(c.round)][uid]?.choice??null,spending:game.councils.spending.filter(e=>e.familyId===scope.familyId).map(e=>({...e})),pledge:structuredClone(c.pledges[scope.familyId]??{amount:0,revision:0})}};}
