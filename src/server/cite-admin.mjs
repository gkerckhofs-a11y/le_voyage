import {compileStory,followingNode,storyDraft} from './cite-story.mjs';
import {canLoadPilotScenario,pilotScenarioDrafts,PILOT_SCENARIO} from './cite-pilot-scenario.mjs';
import {pilotRosterEditable} from './cite-pilot-roster.mjs';
import {preparePerformanceCorrection,performanceCorrectionView} from './cite-performance-correction.mjs';
import {canonicalJSON} from '../cite/canonical.ts';
import {validateCouncilDraft,councilPlanningView} from './cite-council-planning.mjs';
import {reviewCouncilImport,applyCouncilImport} from './cite-council-import.mjs';
import {createCiteStore} from './cite-store.mjs';
import {identifier,normalizedScore,recordPerformance,closeFamilyWeek} from '../cite/economy.ts';
import {closeVote,closeFunding,openCouncil,councilPublicView} from '../cite/councils.ts';
import {cityPublicView} from '../cite/city.ts';
import {syncRewards} from '../cite/rewards.ts';
const fail=status=>Object.assign(Error('Cité administration refused'),{status});
function keys(input,wanted){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==wanted.sort().join(','))throw fail(400);}
function projection(game,scope,date,drafts,corrections=[]){
 const config=game.economy.config,id=game.councils.order.at(-1),council=id?councilPublicView(game,scope,id):null;
 if(council){council.canCloseVote=council.phase==='voting'&&date>=(council.round===1?council.definition.firstVoteClosesOn:council.definition.secondVoteClosesOn);council.canCloseFunding=council.phase==='funding'&&date>=council.definition.fundingClosesOn;}
 return {date,planning:councilPlanningView(game,scope,date,drafts),city:cityPublicView(game,scope),metrics:config.metrics.performance.map(m=>({id:m.id,label:m.label})),weeks:config.weeks.filter(w=>w.active&&w.start<=date).map(w=>({id:w.id,start:w.start,endExclusive:w.endExclusive,families:config.families.map(f=>{const performance=game.economy.performance[w.id]?.[f.id]??null,credit=Object.values(game.economy.credits).find(c=>c.familyId===f.id&&c.weekId===w.id);return {id:f.id,name:f.name,ecus:game.economy.balances[f.id],performance:performance?structuredClone(performance):null,credit:credit?{ecus:credit.ecus,basis:credit.basis}:null,...performanceCorrectionView(corrections,f.id,w.id),canCorrect:!credit&&(!!performance||date>=w.endExclusive),canRecord:date<w.endExclusive&&!performance&&!credit,canClose:date>=w.endExclusive&&!credit};})})),council};
}
/** Authenticated season management, no personal evaluations, ballots or ambitions in projections. */
export function createCiteAdminService(adapter,options={}){
 const store=createCiteStore(adapter,options);
 const operate=(header,scope,action)=>store(header,scope,'manager',(record,uid,date,{capabilities})=>{
  if(!record.state.config.families.some(f=>f.id===scope.familyId))throw fail(403);if(!record.councils||!record.city)throw fail(409);
  const game={economy:record.state,councils:record.councils,city:record.city},result=action(game,date,record,uid),next=result.game;let updated=record;
  const id=next.councils.order.at(-1),resolved=next.councils.records[id];
  if(record.story&&resolved?.phase==='resolved'&&game.councils.records[id]?.phase!=='resolved'){
   const node=followingNode(record.story,record.councilDrafts[resolved.ordinal],resolved);
   if(node)result.drafts={...record.councilDrafts,[node.ordinal]:storyDraft(node,date)};
  }
  if(next!==game||result.drafts){const audit=record.managementAudit??[];if(audit.length>=2000)throw fail(409);updated={...record,...(result.story?{story:result.story}:{}),...(result.correction?{performanceCorrections:[...(record.performanceCorrections??[]),result.correction]}:{}),state:next.economy,councils:next.councils,city:next.city,...(result.drafts?{councilDrafts:result.drafts}:{}),managementAudit:[...audit,{...result.event,actorUid:uid,date}]};if(next!==game&&record.rewards)updated.rewards=syncRewards(next,scope,record.rewards,date);}
  return {record:updated,value:{...(result.storyReview?{storyReview:result.storyReview}:{}),storyActive:!!updated.story,canLoadPilotScenario:canLoadPilotScenario(updated,date),canManagePilotRoster:capabilities.pilotCreation&&pilotRosterEditable(updated,date),canCreatePilot:capabilities.pilotCreation,...projection(next,scope,date,updated.councilDrafts,updated.performanceCorrections),...(result.importReview?{importReview:result.importReview}:{}),outcome:result.outcome??null}};
 });
 const familyScope=(game,scope,id)=>{if(!identifier(id))throw fail(400);if(!game.economy.config.families.some(f=>f.id===id))throw fail(403);return {...scope,familyId:id};};
 return {
  access:(header,scope)=>operate(header,scope,game=>({game})),
  read:(header,scope)=>operate(header,scope,game=>({game})),
  previewStory:(header,scope,input)=>operate(header,scope,(game,date,record)=>{
   if(!canLoadPilotScenario(record,date))throw fail(409);
   compileStory(game,scope,input.rows);
   return {game,storyReview:{rows:input.rows},outcome:'import-preview'};
  }),
  installStory:(header,scope,input)=>operate(header,scope,(game,date,record)=>{
   if(record.story||!canLoadPilotScenario(record,date))throw fail(409);
   const story=compileStory(game,scope,input.rows);
   return {game,story,drafts:{1:storyDraft(story.nodes[story.root],date)},event:{type:'install-story'},outcome:'drafts-imported'};
  }),
  previewStarter:async(header,scope,input)=>{keys(input,[]);return operate(header,scope,(game,date,record)=>{if(!canLoadPilotScenario(record,date))throw fail(409);const review=reviewCouncilImport(game,scope,record.councilDrafts??{},pilotScenarioDrafts(game));return {game,importReview:{...review,source:PILOT_SCENARIO},outcome:'import-preview'};});},
  previewImport:async(header,scope,input)=>{keys(input,['councils']);return operate(header,scope,(game,date,record)=>({game,importReview:reviewCouncilImport(game,scope,record.councilDrafts??{},input.councils),outcome:'import-preview'}));},
  importDrafts:async(header,scope,input)=>{keys(input,['councils','fingerprint']);if(typeof input.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(input.fingerprint))throw fail(400);return operate(header,scope,(game,date,record)=>{
   if(record.story)throw fail(409);const review=reviewCouncilImport(game,scope,record.councilDrafts??{},input.councils);if(review.fingerprint!==input.fingerprint)throw fail(409);
   const result=applyCouncilImport(record.councilDrafts??{},review,date);return {game,...(result.changed.length?{drafts:result.drafts,event:{type:'import-council-drafts',councils:result.changed}}:{}),outcome:'drafts-imported'};
  });},
  saveDraft:async(header,scope,input)=>{keys(input,['definition','revision']);if(!Number.isSafeInteger(input.revision)||input.revision<0)throw fail(400);return operate(header,scope,(game,date,record)=>{
   if(record.story)throw fail(409);const match=/^council-([1-9]|1[0-3])$/.exec(input.definition?.id);if(!match)throw fail(400);const ordinal=Number(match[1]),{definition}=validateCouncilDraft(game,scope,input.definition,ordinal),old=record.councilDrafts?.[String(ordinal)],revision=old?.revision??0;
   if(input.revision>revision)throw fail(409);if(old&&canonicalJSON(old.definition)===canonicalJSON(definition))return {game,outcome:'draft-saved'};
   if(input.revision!==revision||revision>=1000||old?.status==='published')throw fail(409);
   return {game,drafts:{...record.councilDrafts,[String(ordinal)]:{ordinal,status:'draft',revision:revision+1,definition,updatedOn:date}},event:{type:'save-council-draft',councilId:definition.id,revision:revision+1},outcome:'draft-saved'};
  });},
  publishDraft:async(header,scope,input)=>{keys(input,['councilId','revision']);if(!identifier(input.councilId)||!Number.isSafeInteger(input.revision)||input.revision<1)throw fail(400);return operate(header,scope,(game,date,record)=>{
   const entry=Object.entries(record.councilDrafts??{}).find(([,d])=>d.definition.id===input.councilId);if(!entry)throw fail(409);const [slot,draft]=entry;if(draft.revision!==input.revision)throw fail(409);
   if(draft.status==='published'){if(!game.councils.records[input.councilId])throw fail(409);return {game,outcome:'council-published'};}
   validateCouncilDraft(game,scope,draft.definition);const next=openCouncil(game,scope,draft.definition,date);
   return {game:next,drafts:{...record.councilDrafts,[slot]:{...draft,status:'published',publishedOn:date}},event:{type:'publish-council',councilId:input.councilId,revision:input.revision},outcome:'council-published'};
  });},
  performance:async(header,scope,input)=>{keys(input,['familyId','weekId','scores']);if(!identifier(input.weekId))throw fail(400);return operate(header,scope,(game,date)=>{
   const target=familyScope(game,scope,input.familyId);try{normalizedScore(game.economy.config.metrics.performance,input.scores);}catch{throw fail(400);}
   let state;try{state=recordPerformance(game.economy,target,input.weekId,input.scores,date);}catch{throw fail(409);}
   return {game:state===game.economy?game:{...game,economy:state},event:{type:'performance',familyId:input.familyId,weekId:input.weekId},outcome:'performance-saved'};
  });},
  correctPerformance:async(header,scope,input)=>{keys(input,['familyId','weekId','scores','expectedScores','revision','reason','mutationId']);if(!identifier(input.weekId))throw fail(400);return operate(header,scope,(game,date,record,uid)=>{
   const target=familyScope(game,scope,input.familyId),result=preparePerformanceCorrection(game,target,record.performanceCorrections??[],input,uid,date);
   return {game:result.state===game.economy?game:{...game,economy:result.state},correction:result.correction,event:{type:'correct-performance',familyId:input.familyId,weekId:input.weekId,correctionId:input.mutationId,revision:result.correction?.revision},outcome:'performance-corrected'};
  });},
  closeWeek:async(header,scope,input)=>{keys(input,['familyId','weekId']);if(!identifier(input.weekId))throw fail(400);return operate(header,scope,(game,date)=>{
   const target=familyScope(game,scope,input.familyId);let result;try{result=closeFamilyWeek(game.economy,target,input.weekId,date);}catch{throw fail(409);}
   return {game:result.state===game.economy?game:{...game,economy:result.state},event:{type:'close-week',familyId:input.familyId,weekId:input.weekId},outcome:result.deferred?'deferred':'credited'};
  });},
  closeVote:async(header,scope,input)=>{keys(input,['councilId','round']);return operate(header,scope,(game,date)=>({game:closeVote(game,scope,input.councilId,input.round,date),event:{type:'close-vote',councilId:input.councilId,round:input.round},outcome:'vote-closed'}));},
  closeFunding:async(header,scope,input)=>{keys(input,['councilId']);return operate(header,scope,(game,date)=>({game:closeFunding(game,scope,input.councilId,date),event:{type:'close-funding',councilId:input.councilId},outcome:'funding-closed'}));}
 };
}
