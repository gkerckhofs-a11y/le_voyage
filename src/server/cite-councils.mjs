import {createCiteStore} from './cite-store.mjs';
import {createGovernance,openCouncil,castBallot,closeVote,pledge,closeFunding,councilPublicView,councilFamilyView,GAUGES} from '../cite/councils.ts';
const bad=()=>Object.assign(Error('Invalid Council command'),{status:400});
function body(value,keys){if(!value||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))throw bad();return value;}
export function createCiteCouncilService(adapter,options={}){
 const store=createCiteStore(adapter,options);
 const operate=(header,scope,permission,action)=>store(header,scope,permission,(record,uid,date)=>{if(!record.councils)throw Object.assign(Error('Councils not initialized'),{status:409});const game={economy:record.state,councils:record.councils,...(record.city?{city:record.city}:{})},result=action(game,uid,date);return {record:result.game===game?record:{...record,state:result.game.economy,councils:result.game.councils,...(result.game.city?{city:result.game.city}:{})},value:result.value};});
 function change(header,scope,permission,fn,id){return operate(header,scope,permission,(game,uid,date)=>{const next=fn(game,uid,date);return {game:next,value:councilPublicView(next,scope,id)};});}
 return {
  initialize:(header,scope,gauges,rules)=>store(header,scope,'manager',record=>{const proposed=createGovernance(record.state,gauges,rules);if(record.councils){if(!GAUGES.every(k=>record.councils.initialGauges[k]===proposed.councils.initialGauges[k]))throw Object.assign(Error('Council initialization cannot reset a city'),{status:409});return {record,value:{initialized:true}};}return {record:{...record,councils:proposed.councils},value:{initialized:true}};}),
  open:async(header,scope,input)=>{if(!input||typeof input!=='object')throw bad();return change(header,scope,'manager',(game,_uid,date)=>openCouncil(game,scope,input,date),input.id);},
  vote:async(header,scope,input)=>{const b=body(input,['councilId','round','choice']);return operate(header,scope,'member',(game,uid,date)=>{const next=castBallot(game,scope,uid,b.councilId,b.round,b.choice,date);return {game:next,value:councilFamilyView(next,scope,uid,b.councilId,date)};});},
  closeVote:async(header,scope,input)=>{const b=body(input,['councilId','round']);return change(header,scope,'manager',(game,_uid,date)=>closeVote(game,scope,b.councilId,b.round,date),b.councilId);},
  pledge:async(header,scope,input)=>{const b=body(input,['councilId','amount','revision','mutationId']);return operate(header,scope,'funding',(game,uid,date)=>{const next=pledge(game,scope,uid,b.councilId,b.amount,b.revision,b.mutationId,date);return {game:next,value:councilFamilyView(next,scope,uid,b.councilId,date)};});},
  closeFunding:async(header,scope,input)=>{const b=body(input,['councilId']);return change(header,scope,'manager',(game,_uid,date)=>closeFunding(game,scope,b.councilId,date),b.councilId);},
  read:(header,scope,id)=>operate(header,scope,'member',(game,uid,date)=>({game,value:councilFamilyView(game,scope,uid,id,date)})),
  public:(header,scope,id)=>operate(header,scope,'viewer',game=>({game,value:councilPublicView(game,scope,id)}))
 };
}
