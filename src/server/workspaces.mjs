import {assertTestAdapter} from './test-environment.mjs';
const denied=()=>Object.assign(new Error('Workspace access denied'),{status:403});
const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
export const workspaceDestinations=Object.freeze({organizer:'/organisateur.html',director:'/entreprise.html'});
/** Directory entries are references, never grants. Each selection rechecks the underlying service. */
export function createWorkspaces(adapter,{organizer,director}){
 assertTestAdapter(adapter);
 async function directory(header){
  if(typeof header!=='string'||!/^Bearer [^\s]{1,8192}$/.test(header))throw denied();
  let identity;try{identity=await adapter.auth.verifyIdToken(header.slice(7),true);}catch{throw denied();}
  if(!identifier(identity?.uid))throw denied();
  const d=(await adapter.db.doc(`workspaceDirectories/${identity.uid}`).get()).data();
  if(d?.uid!==identity.uid||d.active!==true||!Array.isArray(d.entries)||d.entries.length>20)throw denied();
  const ids=new Set();
  for(const e of d.entries){if(!e||![e.id,e.tenantId,e.campaignId,e.teamId].every(identifier)||!Object.hasOwn(workspaceDestinations,e.space)||typeof e.label!=='string'||!e.label.trim()||e.label.length>160||ids.has(e.id))throw denied();ids.add(e.id);}
  return d.entries;
 }
 async function check(header,e){
  const scope={tenantId:e.tenantId,campaignId:e.campaignId,teamId:e.teamId};
  await (e.space==='organizer'?organizer:director).read(header,scope);
  return {id:e.id,space:e.space,label:e.label,scope,destination:workspaceDestinations[e.space]};
 }
 return {
  async list(header){const result=[];for(const e of await directory(header)){try{const v=await check(header,e);result.push({id:v.id,space:v.space,label:v.label});}catch(error){if(error.status!==403)throw error;}}return result;},
  async select(header,id){if(!identifier(id))throw denied();const entry=(await directory(header)).find(e=>e.id===id);if(!entry)throw denied();return check(header,entry);}
 };
}
