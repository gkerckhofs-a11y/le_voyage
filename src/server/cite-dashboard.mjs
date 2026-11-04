import {createCiteStore} from './cite-store.mjs';
import {cityPublicView} from '../cite/city.ts';
import {councilPublicView} from '../cite/councils.ts';
const fail=status=>Object.assign(Error('Cité dashboard unavailable'),{status});
/** Company-only read model. Never return a private record or a family projection. */
export function createCiteDashboardService(adapter,options={}){
 const store=createCiteStore(adapter,options);
 return {read:(header,scope)=>store(header,scope,'viewer',(record,uid,date,{capabilities})=>{
  const config=record.state.config;
  if(!config.families.some(f=>f.id===scope.familyId)||(!capabilities.management&&!config.memberships.some(m=>m.uid===uid&&m.familyId===scope.familyId&&m.from<=date&&(!m.toExclusive||date<m.toExclusive))))throw fail(403);
  if(!record.councils||!record.city)throw fail(409);
  const game={economy:record.state,councils:record.councils,city:record.city},city=cityPublicView(game,scope),lastId=game.councils.order.at(-1),c=lastId?councilPublicView(game,scope,lastId):null;
  const buildings=city.buildings.map(({id,name,image,condition,protection})=>({id,name,...(image?{image}:{}),condition,protection})),buildingName=id=>buildings.find(b=>b.id===id)?.name??id;
  const current=c?{ordinal:c.ordinal,title:c.definition.title,phase:c.phase,round:c.round,mode:c.definition.mode,selectedProject:c.definition.projects.find(p=>p.id===c.selected)?.name??null,failure:structuredClone(c.definition.failure),dates:{voteOpensOn:c.definition.voteOpensOn,firstVoteClosesOn:c.definition.firstVoteClosesOn,secondVoteClosesOn:c.definition.secondVoteClosesOn,fundingClosesOn:c.definition.fundingClosesOn},projects:c.definition.projects.map(({name,cost,effects,protection,repairs})=>({name,cost,effects,...(protection?{protection}:{}),...(repairs?{repairs:buildingName(repairs)}:{})})),funding:structuredClone(c.funding),rounds:c.rounds.map(r=>{const label=id=>c.definition.projects.find(p=>p.id===id)?.name??({yes:'Oui',no:'Non',abstain:'Abstention'}[id]??id);return {round:r.round,outcome:r.outcome,tally:Object.entries(r.tally).map(([id,votes])=>({label:label(id),votes})),families:config.families.map(f=>({name:f.name,choice:label(r.familyVotes[f.id]?.choice??'abstain'),status:r.familyVotes[f.id]?.status??'abstained'}))};}),resolution:c.resolution?{status:c.resolution.status,narrative:c.resolution.narrative}:null}:null;
  const history=[...city.resolutions.map(r=>({id:'resolution-'+r.councilId,type:'council',ordinal:r.ordinal,sequence:1,date:r.resolvedOn,title:game.councils.records[r.councilId].definition.title,status:r.status,narrative:r.narrative,effects:r.effects,cost:r.cost})),...city.crises.map(e=>({id:e.id,type:'crisis',ordinal:game.councils.records[e.councilId].ordinal,sequence:0,date:e.occurredOn,title:e.name,protected:e.protected,protectors:e.protectors.map(buildingName),damagedBuilding:e.damagedBuilding?buildingName(e.damagedBuilding):null,effects:e.effects}))].sort((a,b)=>b.date.localeCompare(a.date)||b.ordinal-a.ordinal||b.sequence-a.sequence).map(({sequence,...entry})=>entry);
  return {record,value:{date,city:{name:city.name,gauges:city.gauges,development:city.development,buildings},progress:{published:game.councils.order.length,resolved:city.resolutions.length,total:config.weeks.filter((w,index)=>(index+1)%4===0&&w.active).length},current,history}};
 })};
}
export function createCiteDashboardHttp(adapter,options={}){
 const service=createCiteDashboardService(adapter,options);
 return {async handle(req,json,path,session){
  if(!session.workspaceEnabled||!['cite-member','cite-admin'].includes(session.workspaceSpace)||!session.scope)throw fail(403);
  if(path!=='/api/cite/city'||req.method!=='GET')throw fail(404);
  json(200,{...await service.read(session.header,session.scope),returnDestination:session.workspaceSpace==='cite-admin'?'/cite-admin.html':'/cite-family.html',csrf:session.csrf});
 }};
}
