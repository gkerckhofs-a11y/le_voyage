import {createCiteStore} from './cite-store.mjs';
import {identifier,normalizedScore,recordPerformance,closeFamilyWeek} from '../cite/economy.ts';
import {closeVote,closeFunding,councilPublicView} from '../cite/councils.ts';
import {cityPublicView} from '../cite/city.ts';
import {syncRewards} from '../cite/rewards.ts';
const fail=status=>Object.assign(Error('Cité administration refused'),{status});
function keys(input,wanted){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==wanted.sort().join(','))throw fail(400);}
function projection(game,scope,date){
 const config=game.economy.config,id=game.councils.order.at(-1),council=id?councilPublicView(game,scope,id):null;
 if(council){council.canCloseVote=council.phase==='voting'&&date>=(council.round===1?council.definition.firstVoteClosesOn:council.definition.secondVoteClosesOn);council.canCloseFunding=council.phase==='funding'&&date>=council.definition.fundingClosesOn;}
 return {date,city:cityPublicView(game,scope),metrics:config.metrics.performance.map(m=>({id:m.id,label:m.label})),weeks:config.weeks.filter(w=>w.active&&w.start<=date).map(w=>({id:w.id,start:w.start,endExclusive:w.endExclusive,families:config.families.map(f=>{const performance=game.economy.performance[w.id]?.[f.id]??null,credit=Object.values(game.economy.credits).find(c=>c.familyId===f.id&&c.weekId===w.id);return {id:f.id,name:f.name,ecus:game.economy.balances[f.id],performance:performance?structuredClone(performance):null,credit:credit?{ecus:credit.ecus,basis:credit.basis}:null,canRecord:date<w.endExclusive&&!performance&&!credit,canClose:date>=w.endExclusive&&!credit};})})),council};
}
/** Authenticated season management, no personal evaluations, ballots or ambitions in projections. */
export function createCiteAdminService(adapter,options={}){
 const store=createCiteStore(adapter,options);
 const operate=(header,scope,action)=>store(header,scope,'manager',(record,uid,date)=>{
  if(!record.state.config.families.some(f=>f.id===scope.familyId))throw fail(403);if(!record.councils||!record.city)throw fail(409);
  const game={economy:record.state,councils:record.councils,city:record.city},result=action(game,date),next=result.game;let updated=record;
  if(next!==game){const audit=record.managementAudit??[];if(audit.length>=2000)throw fail(409);updated={...record,state:next.economy,councils:next.councils,city:next.city,managementAudit:[...audit,{...result.event,actorUid:uid,date}]};if(record.rewards)updated.rewards=syncRewards(next,scope,record.rewards,date);}
  return {record:updated,value:{...projection(next,scope,date),outcome:result.outcome??null}};
 });
 const familyScope=(game,scope,id)=>{if(!identifier(id))throw fail(400);if(!game.economy.config.families.some(f=>f.id===id))throw fail(403);return {...scope,familyId:id};};
 return {
  access:(header,scope)=>operate(header,scope,game=>({game})),
  read:(header,scope)=>operate(header,scope,game=>({game})),
  performance:async(header,scope,input)=>{keys(input,['familyId','weekId','scores']);if(!identifier(input.weekId))throw fail(400);return operate(header,scope,(game,date)=>{
   const target=familyScope(game,scope,input.familyId);try{normalizedScore(game.economy.config.metrics.performance,input.scores);}catch{throw fail(400);}
   let state;try{state=recordPerformance(game.economy,target,input.weekId,input.scores,date);}catch{throw fail(409);}
   return {game:state===game.economy?game:{...game,economy:state},event:{type:'performance',familyId:input.familyId,weekId:input.weekId},outcome:'performance-saved'};
  });},
  closeWeek:async(header,scope,input)=>{keys(input,['familyId','weekId']);if(!identifier(input.weekId))throw fail(400);return operate(header,scope,(game,date)=>{
   const target=familyScope(game,scope,input.familyId);let result;try{result=closeFamilyWeek(game.economy,target,input.weekId,date);}catch{throw fail(409);}
   return {game:result.state===game.economy?game:{...game,economy:result.state},event:{type:'close-week',familyId:input.familyId,weekId:input.weekId},outcome:result.deferred?'deferred':'credited'};
  });},
  closeVote:async(header,scope,input)=>{keys(input,['councilId','round']);return operate(header,scope,(game,date)=>({game:closeVote(game,scope,input.councilId,input.round,date),event:{type:'close-vote',councilId:input.councilId,round:input.round},outcome:'vote-closed'}));},
  closeFunding:async(header,scope,input)=>{keys(input,['councilId']);return operate(header,scope,(game,date)=>({game:closeFunding(game,scope,input.councilId,date),event:{type:'close-funding',councilId:input.councilId},outcome:'funding-closed'}));}
 };
}
