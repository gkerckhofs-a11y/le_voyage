import {prepareCouncilDefinition} from '../cite/councils.ts';
import {GAUGES} from '../cite/city-state.ts';
import {buildingCost} from '../cite/economy.ts';
import {addDays} from '../domain/calendar.ts';
const fail=status=>Object.assign(Error('Cité Council planning refused'),{status});
/** Deterministic next slot; no client cost, secret event or ad-hoc calendar override. */
export function nextCouncilTemplate(game){
 const ordinal=game.councils.order.length+1,w=game.economy.config.weeks[ordinal*4-1];if(ordinal>13||!w?.active)return null;
 const project=suffix=>({id:`project-${ordinal}-${suffix}`,name:'',category:'small',effects:Object.fromEntries(GAUGES.map(k=>[k,0])),narrative:''});
 return {id:'council-'+ordinal,weekId:w.id,title:'',mode:'choice',projects:[project('a'),project('b')],voteOpensOn:w.start,firstVoteClosesOn:addDays(w.start,1),secondVoteClosesOn:addDays(w.start,3),fundingClosesOn:addDays(w.start,6),failure:{narrative:'',effects:Object.fromEntries(GAUGES.map(k=>[k,0]))}};
}
export function validateCouncilDraft(game,scope,input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='failure,firstVoteClosesOn,fundingClosesOn,id,mode,projects,secondVoteClosesOn,title,voteOpensOn,weekId'||!input.failure||Object.keys(input.failure).sort().join(',')!=='effects,narrative')throw fail(400);
 const template=nextCouncilTemplate(game);if(!template||input.id!==template.id||input.weekId!==template.weekId||Object.hasOwn(game.councils.records,input.id))throw fail(409);
 let preview;try{preview=prepareCouncilDefinition(game,scope,input);}catch{throw fail(400);}
 if(preview.mode==='choice'){const [a,b]=preview.projects,dominates=(x,y)=>x.cost<=y.cost&&GAUGES.every(k=>(x.effects[k]??0)>=(y.effects[k]??0))&&(x.cost<y.cost||GAUGES.some(k=>(x.effects[k]??0)>(y.effects[k]??0)));if(a.protection===b.protection&&a.repairs===b.repairs&&(dominates(a,b)||dominates(b,a)))throw fail(400);}
 return {definition:{...preview,projects:preview.projects.map(({cost,...p})=>p)},preview};
}
export function councilPlanningView(game,scope,date,drafts={}){
 const template=nextCouncilTemplate(game),ordinal=game.councils.order.length+1,draft=template?drafts[String(ordinal)]??null:null,last=game.councils.records[game.councils.order.at(-1)];
 const preview=draft?prepareCouncilDefinition(game,scope,draft.definition):null;
 const canPublish=!!draft&&draft.status==='draft'&&(!last||last.phase==='resolved')&&date>=draft.definition.voteOpensOn&&date<draft.definition.firstVoteClosesOn&&draft.definition.projects.every(p=>!game.councils.buildings[p.id]&&(!p.repairs||(game.councils.buildings[p.repairs]&&game.city?.buildingConditions[p.repairs]==='damaged')));
 return {ordinal,template,draft:draft?{revision:draft.revision,status:draft.status,definition:structuredClone(draft.definition),preview}:null,canPublish,prices:Object.fromEntries(['small','standard','large'].map(k=>[k,buildingCost(k,game.economy.config.families.length)]))};
}
