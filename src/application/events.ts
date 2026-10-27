import { createHash } from 'node:crypto';
import { closeWeek, teamDistance, convoyDistance } from '../domain/engine.ts';
import type { State, Scope, Command } from '../domain/engine.ts';
import type { Exact } from '../domain/exact.ts';
import { teamJourneyView } from '../presentation/journey-view.ts';

export type Viewer = Scope & { teamId:string; viewerId:string };
export type Catalog = Readonly<Record<string, Readonly<{title:string; description:string}>>>;
type Progress = {id:string;kind:'progress';teamId:string;date:string;km:Exact;cumulative:Exact};
type Convoy = {id:string;kind:'convoy';date:string;km:Exact;cumulative:Exact};
type Attention = {id:string;kind:'attention';teamId:string;date:string;title:string;description:string;status:'to-compose'|'ready'|'delivered'|'incident'};
export type JourneyEvent = Progress | Convoy | Attention;
export type Ledger = {state:State;revision:number;events:readonly JourneyEvent[];presented:Readonly<Record<string,true>>};
export function eventId(scope:Scope,kind:string,key:string){return createHash('sha256').update(JSON.stringify([scope.tenantId,scope.campaignId,kind,key])).digest('hex');}
function access(ledger:Ledger,viewer:Viewer){
  if(viewer.tenantId!==ledger.state.config.tenantId||viewer.campaignId!==ledger.state.config.campaignId||!viewer.viewerId||!ledger.state.config.teams.some(t=>t.id===viewer.teamId))throw new Error('Scope denied');
}
const claimKey=(viewer:Viewer,id:string)=>JSON.stringify([viewer.viewerId,viewer.teamId,id]);
/** Pure transition: persist state, events and tasks together in one campaign transaction. */
export function closeWithEvents(ledger:Ledger,command:Command,decision:Parameters<typeof closeWeek>[2],catalog:Catalog):Ledger{
  const before=ledger.state,state=closeWeek(before,command,decision);
  if(state===before)return ledger;
  const key=JSON.stringify([command.teamId,command.weekId]),outcome=state.outcomes[key];
  const added:JourneyEvent[]=[{id:eventId(command,'progress',key),kind:'progress',teamId:command.teamId,date:outcome.closedOn,km:{...outcome.km},cumulative:{...teamDistance(state,command.teamId)}}];
  if(!before.convoys[command.weekId]&&state.convoys[command.weekId]){
    const convoy=state.convoys[command.weekId];
    added.push({id:eventId(command,'convoy',command.weekId),kind:'convoy',date:convoy.closedOn,km:{...convoy.km},cumulative:{...convoyDistance(state)}});
  }
  for(const [id,entitlement] of Object.entries(state.entitlements)){
    if(before.entitlements[id])continue;
    const content=catalog[entitlement.milestoneId];
    if(!content?.title.trim()||!content.description.trim())throw new Error('Missing reveal content');
    added.push({id:eventId(command,'attention',id),kind:'attention',teamId:entitlement.teamId,date:entitlement.earnedOn,title:content.title,description:content.description,status:'to-compose'});
  }
  return {...ledger,state,events:[...ledger.events,...added]};
}
function publicEvent(event:Progress|Attention){
  return event.kind==='progress'?{id:event.id,kind:event.kind,date:event.date,km:{...event.km},cumulative:{...event.cumulative}}
    :{id:event.id,kind:event.kind,date:event.date,title:event.title,description:event.description,status:event.status};
}
/** Atomic claim gives at-most-once automatic presentation per viewer; history remains readable. */
export function claimEvents(ledger:Ledger,viewer:Viewer,ids:readonly string[]){
  access(ledger,viewer);
  if(!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string'))throw new Error('Invalid event ids');
  const owned=ledger.events.filter((e):e is Progress|Attention=>e.kind!=='convoy'&&e.teamId===viewer.teamId);
  if(ids.some(id=>!owned.some(e=>e.id===id)))throw new Error('Event denied');
  const selected=owned.filter(e=>ids.includes(e.id)&&!ledger.presented[claimKey(viewer,e.id)]),presented={...ledger.presented};
  for(const event of selected)presented[claimKey(viewer,event.id)]=true;
  return {ledger:selected.length?{...ledger,presented}:ledger,events:selected.map(publicEvent)};
}
export function teamFeed(ledger:Ledger,viewer:Viewer,identity:Parameters<typeof teamJourneyView>[2]){
  access(ledger,viewer);
  const owned=ledger.events.filter((e):e is Progress|Attention=>e.kind!=='convoy'&&e.teamId===viewer.teamId);
  return {revision:ledger.revision,journey:teamJourneyView(ledger.state,viewer,identity),
    attentions:owned.filter((e):e is Attention=>e.kind==='attention').map(e=>({...publicEvent(e),unread:!ledger.presented[claimKey(viewer,e.id)]})),
    unseenEventIds:owned.filter(e=>!ledger.presented[claimKey(viewer,e.id)]).map(e=>e.id),
    canAdvance:ledger.state.config.weeks.some(w=>!ledger.state.outcomes[JSON.stringify([viewer.teamId,w.id])]),
  };
}
export type TeamFeed = ReturnType<typeof teamFeed>;
export type PublicEvent = ReturnType<typeof publicEvent>;
