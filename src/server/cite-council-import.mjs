import {createHash} from 'node:crypto';
import {canonicalJSON} from '../cite/canonical.ts';
import {validateCouncilDraft} from './cite-council-planning.mjs';
const fail=status=>Object.assign(Error('Cité Council import refused'),{status});
export const COUNCIL_IMPORT_MAX_BYTES=262144;
/** Validate the whole batch before any write; costs and scope are always server-derived. */
export function reviewCouncilImport(game,scope,drafts,councils){
 if(!Array.isArray(councils)||!councils.length||councils.length>13||Buffer.byteLength(JSON.stringify(councils))>COUNCIL_IMPORT_MAX_BYTES)throw fail(400);
 const seen=new Set(),entries=councils.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join(',')!=='definition,revision'||!Number.isSafeInteger(row.revision)||row.revision<0)throw fail(400);
  const match=/^council-([1-9]|1[0-3])$/.exec(row.definition?.id);if(!match||seen.has(match[1]))throw fail(400);seen.add(match[1]);
  const ordinal=Number(match[1]),{definition,preview}=validateCouncilDraft(game,scope,row.definition,ordinal),old=drafts[String(ordinal)],revision=old?.revision??0,same=!!old&&canonicalJSON(old.definition)===canonicalJSON(definition);
  if(old?.status==='published'||row.revision>revision||(!same&&(row.revision!==revision||revision>=1000)))throw fail(409);
  return {ordinal,revision:row.revision,definition,preview};
 }).sort((a,b)=>a.ordinal-b.ordinal);
 const fingerprint=createHash('sha256').update(canonicalJSON({tenantId:scope.tenantId,seasonId:scope.seasonId,opened:game.councils.order,entries})).digest('hex');
 return {entries,fingerprint};
}
export function applyCouncilImport(drafts,review,date){
 let next=drafts;const changed=[];
 for(const entry of review.entries){const key=String(entry.ordinal),old=drafts[key];if(old&&canonicalJSON(old.definition)===canonicalJSON(entry.definition))continue;
  if(next===drafts)next={...drafts};next[key]={ordinal:entry.ordinal,status:'draft',revision:(old?.revision??0)+1,definition:entry.definition,updatedOn:date};changed.push({councilId:entry.definition.id,revision:next[key].revision});
 }
 return {drafts:next,changed};
}
