/** Entirely fictional, local-only accelerated pilot. It is not a replacement for Firebase authorization. */
import {createEconomy,ECONOMY_VERSION,submitValues,recordPerformance,closeFamilyWeek} from './economy.ts';
import {createGovernance,COUNCIL_RULES,openCouncil,castBallot,closeVote,pledge,closeFunding,councilPublicView,councilFamilyView} from './councils.ts';
import type {Game,CouncilInput,Project} from './councils.ts';
import {initializeCity,cityPublicView,cityFamilyView} from './city.ts';
import {createRewards,syncRewards,personalRewards,rewardOperations} from './rewards.ts';
import type {Rewards} from './rewards.ts';
import {pilotRewardPlan,PILOT_REWARD_MODES} from './pilot-rewards.ts';
import type {PilotRewardMode} from './pilot-rewards.ts';
import {planWeeks,addDays} from '../domain/calendar.ts';
export type Pilot={game:Game;completedWeeks:number;stage:'weeks'|'vote'|'funding'|'finished';date:string;councilId:string|null;rewardMode:PilotRewardMode;rewards:Rewards};
export type PilotAction={type:'advance-week'|'close-vote'|'close-funding'}|{type:'vote';choice:string;round:1|2}|{type:'pledge';amount:number;revision:number;mutationId:string};
const check=(ok:unknown,message:string):void=>{if(!ok)throw Object.assign(Error(message),{status:409});};
export function createPilot(rewardMode:PilotRewardMode='all'):Pilot{
 const families=['Les Bâtisseurs','Les Marchands','Les Érudits'].map((name,i)=>({id:'family-'+i,name})),weeks=planWeeks('2026-11-09',16);
 const economy=createEconomy({tenantId:'fiction-cite',seasonId:'prototype-2026',name:'La Cité des Ateliers',rulesVersion:ECONOMY_VERSION,missingDataPolicy:'defer',minimumValueResponses:1,families,weeks,memberships:families.flatMap((f,i)=>Array.from({length:2},(_,j)=>({uid:`person-${i}-${j}`,familyId:f.id,from:weeks[0].start}))),metrics:{performance:[{id:'quality',label:'Qualité normalisée',weightBps:10000}],values:[{id:'cooperation',label:'Entraide',weightBps:10000}]}});
 const scope={tenantId:economy.config.tenantId,seasonId:economy.config.seasonId,familyId:families[0].id};
 const game=initializeCity(createGovernance(economy,{economy:40,wellbeing:40,culture:40,infrastructure:40,environment:40},COUNCIL_RULES),scope,'cite-full-pilot-seed-0000');
 return {game,completedWeeks:0,stage:'weeks',date:weeks[0].start,councilId:null,rewardMode,rewards:createRewards(game,scope,pilotRewardPlan(rewardMode),'operator',weeks[0].start)};
}
export function pilotRoles(p:Pilot){return [{id:'operator',label:'Opérateur de démonstration'},...p.game.economy.config.memberships.map((m,i)=>({id:m.uid,label:p.game.economy.config.families.find(f=>f.id===m.familyId)!.name+' · membre '+(i%2+1)}))];}
function scope(p:Pilot,role='operator'){const config=p.game.economy.config,member=config.memberships.find(m=>m.uid===role);check(role==='operator'||!!member,'Unknown fictitious role');return {tenantId:config.tenantId,seasonId:config.seasonId,familyId:member?.familyId??config.families[0].id};}
function definition(p:Pilot):CouncilInput{
 const n=p.game.councils.order.length+1,w=p.game.economy.config.weeks[p.completedWeeks];
 const project=(id:string,name:string,category:Project['category'],effects:Project['effects'],extra:Partial<Project>={}):Project=>({id,name,category,effects,narrative:name+' prend place dans la cité.',...extra});
 const projects=n===1?[project('library','Bibliothèque','small',{culture:15,economy:-3}),project('hospital','Hôpital','small',{wellbeing:15,economy:-3},{protection:'epidemic'})]:n===2?[project('firehouse','Caserne','small',{infrastructure:10,wellbeing:4,environment:-3},{protection:'fire'})]:n===3?[project('recovery-garden','Jardin de reconstruction','small',{wellbeing:8,environment:6})]:[project('workshops','Ateliers','standard',{economy:12,environment:-5})];
 return {id:'council-'+n,weekId:w.id,title:['Bibliothèque ou hôpital ?','Construire une caserne ?','Se relever après l’incendie ?','Financer les ateliers ?'][n-1],mode:n===1?'choice':'yes-no',projects,voteOpensOn:w.start,firstVoteClosesOn:addDays(w.start,1),secondVoteClosesOn:addDays(w.start,3),fundingClosesOn:addDays(w.start,6),failure:{narrative:'Le projet est abandonné. Une occasion de développement est perdue.',effects:{economy:-5,infrastructure:-3}}};
}
function finishWeek(p:Pilot){const w=p.game.economy.config.weeks[p.completedWeeks];for(const f of p.game.economy.config.families)p.game.economy=closeFamilyWeek(p.game.economy,{...scope(p),familyId:f.id},w.id,w.endExclusive).state;p.completedWeeks++;p.date=w.endExclusive;p.stage=p.completedWeeks===16?'finished':'weeks';p.rewards=syncRewards(p.game,scope(p),p.rewards,p.date);return p;}
export function pilotAction(current:Pilot,role:string,action:PilotAction):Pilot{
 const p=structuredClone(current),s=scope(p,role),c=p.councilId?p.game.councils.records[p.councilId]:null;
 const operator=role==='operator';
 if(action.type==='advance-week'){
  check(operator&&p.stage==='weeks','Only the operator can advance this stage');const w=p.game.economy.config.weeks[p.completedWeeks];p.date=w.start;
  for(const f of p.game.economy.config.families){const fs={...s,familyId:f.id};p.game.economy=recordPerformance(p.game.economy,fs,w.id,{quality:'4'},w.start);for(const m of p.game.economy.config.memberships.filter(m=>m.familyId===f.id))p.game.economy=submitValues(p.game.economy,fs,m.uid,w.id,{cooperation:'4'},w.start);}
  if((p.completedWeeks+1)%4===0){const d=definition(p);p.game=openCouncil(p.game,s,d,p.date);p.councilId=d.id;p.stage='vote';return p;}return finishWeek(p);
 }
 check(!!c&&p.councilId,'No active Council');
 if(action.type==='vote'){check(!operator&&p.stage==='vote','Voting is closed');p.game=castBallot(p.game,s,role,p.councilId!,action.round,action.choice,p.date);return p;}
 if(action.type==='pledge'){check(!operator&&role.endsWith('-0')&&p.stage==='funding','Only the fictitious funding delegate can pledge');p.game=pledge(p.game,s,role,p.councilId!,action.amount,action.revision,action.mutationId,p.date);return p;}
 check(operator,'Operator action required');
 if(action.type==='close-vote'){check(p.stage==='vote','Voting is closed');p.date=c!.round===1?c!.definition.firstVoteClosesOn:c!.definition.secondVoteClosesOn;p.game=closeVote(p.game,s,p.councilId!,c!.round,p.date);const result=p.game.councils.records[p.councilId!];if(result.phase==='resolved')return finishWeek(p);p.stage=result.phase==='funding'?'funding':'vote';return p;}
 if(action.type==='close-funding'){check(p.stage==='funding','Funding is closed');p.date=c!.definition.fundingClosesOn;p.game=closeFunding(p.game,s,p.councilId!,p.date);return finishWeek(p);}
 throw Object.assign(Error('Unknown prototype action'),{status:400});
}
export function pilotView(p:Pilot,role:string){const s=scope(p,role),operator=role==='operator';return {prototype:true,rewardMode:p.rewardMode,rewardModes:PILOT_REWARD_MODES,rewards:operator?rewardOperations(p.rewards):personalRewards(p.rewards,role),roles:pilotRoles(p),role,stage:p.stage,date:p.date,completedWeeks:p.completedWeeks,currentWeek:Math.min(16,p.completedWeeks+(p.stage==='finished'?0:1)),city:operator?cityPublicView(p.game,s):cityFamilyView(p.game,s),myFamily:operator?null:{name:p.game.economy.config.families.find(f=>f.id===s.familyId)!.name,ecus:p.game.economy.balances[s.familyId],credits:Object.values(p.game.economy.credits).filter(c=>c.familyId===s.familyId).map(c=>({...c})),canFund:role.endsWith('-0')},council:p.councilId?(operator?councilPublicView(p.game,s,p.councilId):councilFamilyView(p.game,s,role,p.councilId,p.date)):null};}
export function runPilot(mode:PilotRewardMode='all'){let p=createPilot(mode);while(p.stage!=='finished'){
 if(p.stage==='weeks'){p=pilotAction(p,'operator',{type:'advance-week'});continue;}
 const c=p.game.councils.records[p.councilId!];
 if(p.stage==='vote'){for(const f of p.game.economy.config.families)if(!c.suspended.includes(f.id))for(const uid of c.roster[f.id])p=pilotAction(p,uid,{type:'vote',round:c.round,choice:c.definition.mode==='choice'?c.definition.projects[0].id:'yes'});p=pilotAction(p,'operator',{type:'close-vote'});continue;}
 const amounts=c.ordinal===1?[51,51,51]:c.ordinal===2?[89,64,0]:c.ordinal===3?[60,50,43]:[1,1,1];for(const [i,f]of p.game.economy.config.families.entries())p=pilotAction(p,`person-${i}-0`,{type:'pledge',amount:amounts[i],revision:0,mutationId:`pilot-pledge-${c.ordinal}-${i}`});p=pilotAction(p,'operator',{type:'close-funding'});
 }return p;}
