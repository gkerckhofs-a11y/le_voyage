import {createCiteStore} from './cite-store.mjs';
import {castBallot,councilFamilyView} from '../cite/councils.ts';
import {cityFamilyView} from '../cite/city.ts';
const fail=status=>Object.assign(Error('Cité family unavailable'),{status});
/** One private transaction; no caller-selected actor, raw ballot collection or individual scores. */
export function createCiteFamilyService(adapter,options={}){
 const store=createCiteStore(adapter,options);
 const operate=(header,scope,action)=>store(header,scope,'member',(record,uid,date)=>{
  const config=record.state.config,family=config.families.find(f=>f.id===scope.familyId);
  if(!family||!config.memberships.some(m=>m.uid===uid&&m.familyId===scope.familyId&&m.from<=date&&(!m.toExclusive||date<m.toExclusive)))throw fail(403);
  if(!record.councils||!record.city)throw fail(409);
  const game={economy:record.state,councils:record.councils,city:record.city},next=action(game,uid,date),id=next.councils.order.at(-1);
  const value={date,family:{name:family.name,ecus:next.economy.balances[scope.familyId],credits:Object.values(next.economy.credits).filter(c=>c.familyId===scope.familyId).map(c=>({weekId:c.weekId,ecus:c.ecus}))},city:cityFamilyView(next,scope),council:id?councilFamilyView(next,scope,uid,id,date):null};
  return {record:next===game?record:{...record,state:next.economy,councils:next.councils,city:next.city},value};
 });
 return {
  read:(header,scope)=>operate(header,scope,game=>game),
  vote:async(header,scope,input)=>{
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='choice,councilId,round')throw fail(400);
   return operate(header,scope,(game,uid,date)=>castBallot(game,scope,uid,input.councilId,input.round,input.choice,date));
  }
 };
}
