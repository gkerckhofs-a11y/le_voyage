import {createHash} from 'node:crypto';
import {canonicalJSON} from '../cite/canonical.ts';
import {identifier,normalizedScore,correctUncreditedPerformance} from '../cite/economy.ts';
const fail=status=>Object.assign(Error('Cité performance correction refused'),{status});
/** Private audit retains professional before/after scores; never personal evaluations. */
export function preparePerformanceCorrection(game,scope,history,input,actorUid,date){
 if(!identifier(input.mutationId)||input.mutationId.length<8||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.reason!=='string'||input.reason.length>500||input.reason.trim().length<8)throw fail(400);
 const definitions=game.economy.config.metrics.performance;
 try{normalizedScore(definitions,input.scores);if(input.expectedScores!==null)normalizedScore(definitions,input.expectedScores);}catch{throw fail(400);}
 const reason=input.reason.trim(),fingerprint=createHash('sha256').update(canonicalJSON({scope,actorUid,...input,reason})).digest('hex'),old=history.find(c=>c.mutationId===input.mutationId);
 if(old){if(old.fingerprint!==fingerprint)throw fail(409);return {state:game.economy,correction:null};}
 const revisions=history.filter(c=>c.familyId===scope.familyId&&c.weekId===input.weekId);
 if(input.revision!==revisions.length||history.length>=500)throw fail(409);
 let state;try{state=correctUncreditedPerformance(game.economy,scope,input.weekId,input.expectedScores,input.scores,date);}catch{throw fail(409);}
 return {state,correction:{mutationId:input.mutationId,fingerprint,familyId:scope.familyId,weekId:input.weekId,revision:revisions.length+1,actorUid,date,reason,previous:structuredClone(game.economy.performance[input.weekId]?.[scope.familyId]??null),scores:structuredClone(state.performance[input.weekId][scope.familyId])}};
}
export function performanceCorrectionView(history,familyId,weekId){
 const rows=history.filter(c=>c.familyId===familyId&&c.weekId===weekId);
 return {performanceRevision:rows.length,corrections:rows.slice(-20).map(({revision,date,reason,previous,scores})=>({revision,date,reason,previous:structuredClone(previous),scores:structuredClone(scores)}))};
}
