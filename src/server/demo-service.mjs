// Isolated fictitious campaign per browser session. Not a production authorization system.
import { randomBytes } from 'node:crypto';
import { collectiveState, collectiveIdentity } from '../../scripts/demo-collective.mjs';
import { closeWithEvents, claimEvents, teamFeed } from '../application/events.ts';
import { collectiveJourneyView } from '../presentation/collective-view.ts';
import { exact } from '../domain/exact.ts';
import { freezeReception } from '../domain/engine.ts';
import { addDays } from '../domain/calendar.ts';

// NEVER copied to public output. All contents are fictitious and deliberately without alcohol.
const titles=['Une pause gourmande','Le panier des artisans','Un moment à savourer','La table des découvertes','Le souvenir du voyage'];
const catalog=Object.fromEntries(titles.map((title,i)=>[`private-gift-${i}`,{title,description:'Une attention à partager, composée de douceurs et de découvertes du terroir. La composition sera confirmée par Rouge Clémence.'}]));
export const identity={organizationName:'Lex EKHO',teamName:'Les Explorateurs',color:'#bf4a32'};
export function newDemo(){return {schemaVersion:1,csrf:randomBytes(32).toString('hex'),ledger:{state:collectiveState(),revision:0,events:[],presented:{}}};}
export function viewer(record){return {...record.ledger.state.config,teamId:'explorateurs',viewerId:'fictitious-viewer'};}
export function readTeam(record){return teamFeed(record.ledger,viewer(record),identity);}
export function readCollective(record){return collectiveJourneyView(record.ledger.state,record.ledger.state.config,collectiveIdentity(record.ledger.state));}
export function advance(record,revision){
  if(!Number.isSafeInteger(revision)||revision<0||revision>record.ledger.revision)throw new Error('Invalid revision');
  if(revision<record.ledger.revision)return {record,applied:false};
  let ledger=record.ledger;
  const week=ledger.state.config.weeks.find(w=>!ledger.state.outcomes[JSON.stringify(['explorateurs',w.id])]);
  if(!week)return {record,applied:false};
  if(week.endExclusive>ledger.state.config.reception.cutoffDate&&!ledger.state.freeze)
    ledger={...ledger,state:freezeReception(ledger.state,ledger.state.config,addDays(ledger.state.config.reception.cutoffDate,1))};
  for(const team of ledger.state.config.teams){
    // Synthetic week at 5/5, matching V3-B's deterministic future-week scenarios.
    const roster=Array.from({length:6},(_,i)=>({id:`fiction-person-${i}`,eligible:true,absent:false}));
    ledger=closeWithEvents(ledger,{...ledger.state.config,teamId:team.id,weekId:week.id,today:week.endExclusive},{kind:'evaluate',input:{mode:'kpi',roster,responses:roster.map(p=>({participantId:p.id,answers:['5','5','5']})),kpis:[exact('5'),exact('5')]}},catalog);
  }
  return {record:{...record,ledger:{...ledger,revision:ledger.revision+1}},applied:true};
}
export function claim(record,ids){const result=claimEvents(record.ledger,viewer(record),ids);return {record:{...record,ledger:result.ledger},events:result.events};}
