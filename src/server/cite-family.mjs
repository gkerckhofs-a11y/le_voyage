import {createCiteStore} from './cite-store.mjs';
import {castBallot,councilFamilyView,pledge} from '../cite/councils.ts';
import {eligibleMembers,identifier,normalizedScore,submitValues} from '../cite/economy.ts';
import {cityFamilyView} from '../cite/city.ts';
const fail=status=>Object.assign(Error('Cité family unavailable'),{status});
/** One private transaction; no caller-selected actor, raw ballot collection or individual scores. */
export function createCiteFamilyService(adapter,options={}){
 const store=createCiteStore(adapter,options);
 const operate=(header,scope,action,permission='member')=>store(header,scope,permission,(record,uid,date,{capabilities})=>{
  const config=record.state.config,family=config.families.find(f=>f.id===scope.familyId);
  if(!family||!config.memberships.some(m=>m.uid===uid&&m.familyId===scope.familyId&&m.from<=date&&(!m.toExclusive||date<m.toExclusive)))throw fail(403);
  if(!record.councils||!record.city)throw fail(409);
  const game={economy:record.state,councils:record.councils,city:record.city},next=action(game,uid,date),id=next.councils.order.at(-1);
  const week=config.weeks.find(w=>w.active&&w.start<=date&&date<w.endExclusive),own=week?next.economy.values[week.id]?.[uid]:null;
  if(own&&own.familyId!==scope.familyId)throw fail(409);
  const weekly=week?{id:week.id,start:week.start,endExclusive:week.endExclusive,metrics:config.metrics.values.map(m=>({id:m.id,label:m.label})),scores:own?structuredClone(own.scores):null,canSubmit:!own&&eligibleMembers(next.economy,scope.familyId,week).includes(uid)&&!Object.values(next.economy.credits).some(c=>c.familyId===scope.familyId&&c.weekId===week.id)}:null;
  const council=id?councilFamilyView(next,scope,uid,id,date):null;
  if(council)council.myFamily={...council.myFamily,canFund:capabilities.funding&&council.phase==='funding'&&date>=(council.round===1?council.definition.firstVoteClosesOn:council.definition.secondVoteClosesOn)&&date<council.definition.fundingClosesOn,maxPledge:council.phase==='funding'?Math.min(next.economy.balances[scope.familyId],council.funding.remaining+council.myFamily.pledge.amount):0};
  const value={date,weekly,family:{name:family.name,ecus:next.economy.balances[scope.familyId],credits:Object.values(next.economy.credits).filter(c=>c.familyId===scope.familyId).map(c=>({weekId:c.weekId,ecus:c.ecus}))},city:cityFamilyView(next,scope),council};
  return {record:next===game?record:{...record,state:next.economy,councils:next.councils,city:next.city},value};
 });
 return {
  read:(header,scope)=>operate(header,scope,game=>game),
  submit:async(header,scope,input)=>{
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='scores,weekId'||!identifier(input.weekId))throw fail(400);
   return operate(header,scope,(game,uid,date)=>{
    const week=game.economy.config.weeks.find(w=>w.id===input.weekId&&w.active);if(!week)throw fail(409);
    if(!eligibleMembers(game.economy,scope.familyId,week).includes(uid))throw fail(403);
    try{normalizedScore(game.economy.config.metrics.values,input.scores);}catch{throw fail(400);}
    let state;try{state=submitValues(game.economy,scope,uid,input.weekId,input.scores,date);}catch{throw fail(409);}
    return state===game.economy?game:{...game,economy:state};
   });
  },
  contribute:async(header,scope,input)=>{
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='amount,councilId,mutationId,revision')throw fail(400);
   return operate(header,scope,(game,uid,date)=>pledge(game,scope,uid,input.councilId,input.amount,input.revision,input.mutationId,date),'funding');
  },
  vote:async(header,scope,input)=>{
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='choice,councilId,round')throw fail(400);
   return operate(header,scope,(game,uid,date)=>castBallot(game,scope,uid,input.councilId,input.round,input.choice,date));
  }
 };
}
