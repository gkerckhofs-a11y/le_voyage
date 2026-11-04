import {createCiteStore} from './cite-store.mjs';
import {createCiteGiftPreparationService} from './cite-gift-preparation.mjs';
import {createCiteGiftStockService} from './cite-gift-stock.mjs';
import {body,authorized} from './http.mjs';
import {addDays} from '../domain/calendar.ts';
const fail=status=>Object.assign(Error('Cité cockpit access refused'),{status});
/** Uses the existing authenticated session and selected workspace, never a client-provided scope. */
export function createCiteCockpitHttp(adapter,options={}){
 const today=options.today??(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels'}).format(new Date()));
 const store=createCiteStore(adapter,{today}),gifts=createCiteGiftPreparationService(adapter,{...options,today}),stock=createCiteGiftStockService(adapter,{...options,today});
 const access=(header,scope)=>store(header,scope,'rewardOperations',record=>{
  if(!record.state.config.families.some(f=>f.id===scope.familyId))throw fail(403);
  return {record,value:{cityName:record.state.config.name}};
 });
 return {access,async handle(req,json,path,session){
  if(session.workspaceSpace!=='cite-gifts'||!session.workspaceEnabled||!session.scope)throw fail(403);
  if(req.method==='GET'&&path==='/api/cite/cockpit'){
   const [identity,giftPreparation]=await Promise.all([access(session.header,session.scope),gifts.list(session.header,session.scope)]);
   json(200,{...identity,csrf:session.csrf,scope:session.scope,giftPreparation:{...giftPreparation,suggestedDueDate:addDays(today(),14)}});return;
  }
  const action=path.slice('/api/cite/cockpit/'.length),actions={prepare:gifts.prepare,review:gifts.review,reopen:gifts.reopen,reserve:stock.reserve,release:stock.release};
  if(req.method!=='POST'||!Object.hasOwn(actions,action)||path!=='/api/cite/cockpit/'+action)throw fail(404);
  authorized(req,session);const {command}=await body(req,['command'],8192);await actions[action](session.header,session.scope,command);json(200,{saved:true});
 }};
}
