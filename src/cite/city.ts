import {civilDate} from '../domain/calendar.ts';
import type {Scope} from './economy.ts';
import type {Game} from './councils.ts';
import {GAUGES,CITY_RULES,CRISIS_CATALOG,createCityState,observeAmbitions,development,digest} from './city-state.ts';
import type {CrisisRecord,Effects} from './city-state.ts';
const check=(ok:unknown,message:string,status=409):void=>{if(!ok)throw Object.assign(Error(message),{status});};
function scopeCheck(game:Game,scope:Scope){check(game.economy.config.tenantId===scope.tenantId&&game.economy.config.seasonId===scope.seasonId&&Object.hasOwn(game.economy.balances,scope.familyId),'City scope denied',403);}
export function initializeCity(game:Game,scope:Scope,seed:string):Game{
 scopeCheck(game,scope);if(game.city)return game;
 check(game.councils.order.length===0,'City must be initialized before its first Council');
 return {...structuredClone(game),city:createCityState(game.economy.config,game.councils.gauges,seed)};
}
/** Only the precommitted event for this Council can fire, automatically before any ballot. */
export function crisisAtOpening(game:Game,scope:Scope,councilId:string,onDate:string):Game{
 scopeCheck(game,scope);if(!game.city)return game;
 const c=game.councils.records[councilId];check(!!c,'Unknown Council',404);const kind=game.city.crisisPlan[String(c.ordinal)];if(!kind)return game;
 const id='crisis-'+c.ordinal;if(game.city.crises[id])return game;
 check(civilDate(onDate)>=c.definition.voteOpensOn&&onDate<c.definition.firstVoteClosesOn&&c.phase==='voting'&&c.round===1&&Object.values(c.ballots).every(v=>Object.keys(v).length===0),'Crisis must precede every ballot');
 const definition=CRISIS_CATALOG[kind],buildings=Object.values(game.councils.buildings);
 const intact=buildings.filter(b=>game.city!.buildingConditions[b.project.id]!=='damaged');
 const protectors=intact.filter(b=>b.project.protection===kind).map(b=>b.project.id).sort();
 const protectedCity=protectors.length>0;
 const applied=Object.fromEntries(Object.entries(definition.effects).map(([k,v])=>[k,protectedCity?-Math.floor(Math.abs(v!)/2):v])) as Effects;
 const damagedBuilding=!protectedCity&&definition.damagesBuilding?intact.map(b=>b.project.id).sort((a,b)=>digest(game.city!.seed+id+a).localeCompare(digest(game.city!.seed+id+b)))[0]??null:null;
 const event:CrisisRecord={id,councilId,kind,name:definition.name,protected:protectedCity,protectors,effects:applied,damagedBuilding,occurredOn:onDate,rulesVersion:CITY_RULES.version};
 const next=structuredClone(game);for(const k of GAUGES)next.councils.gauges[k]=Math.max(0,Math.min(100,next.councils.gauges[k]+(applied[k]??0)));
 if(damagedBuilding)next.city!.buildingConditions[damagedBuilding]='damaged';
 next.city!.crises[id]=event;next.city=observeAmbitions(next.city!,next.councils.gauges,id);return next;
}
export function cityPublicView(game:Game,scope:Scope){
 scopeCheck(game,scope);check(!!game.city,'City not initialized');
 return {name:game.economy.config.name,gauges:structuredClone(game.councils.gauges),development:development(game.councils.gauges),buildings:Object.values(game.councils.buildings).map(b=>({id:b.project.id,name:b.project.name,condition:game.city!.buildingConditions[b.project.id]??'intact',protection:b.project.protection??null})),crises:Object.values(game.city!.crises).map(c=>structuredClone(c)),resolutions:structuredClone(game.councils.resolutions),commitment:game.city!.commitment,rules:structuredClone(CITY_RULES)};
}
export function cityFamilyView(game:Game,scope:Scope){scopeCheck(game,scope);check(!!game.city,'City not initialized');return {...cityPublicView(game,scope),myAmbition:structuredClone(game.city!.ambitions[scope.familyId])};}
