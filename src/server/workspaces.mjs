import {createAccessBoundary} from './access.mjs';
import {authorizedGrant} from './gift-operations.mjs';
import {assertTestAdapter} from './test-environment.mjs';
const denied=()=>Object.assign(new Error('Workspace access denied'),{status:403});
const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
export const workspaceDestinations=Object.freeze({organizer:'/organisateur.html',director:'/entreprise.html',team:'/index.html',gifts:'/cockpit.html',kpi:'/kpi.html',kiosk:'/kiosque.html'});
/** Directory entries are references, never grants. Each selection rechecks the underlying service. */
export function createWorkspaces(adapter,{organizer,director,kiosk}){
 assertTestAdapter(adapter);
 async function directory(header){
  if(typeof header!=='string'||!/^Bearer [^\s]{1,8192}$/.test(header))throw denied();
  let identity;try{identity=await adapter.auth.verifyIdToken(header.slice(7),true);}catch{throw denied();}
  if(!identifier(identity?.uid))throw denied();
  const d=(await adapter.db.doc(`workspaceDirectories/${identity.uid}`).get()).data();
  if(d?.uid!==identity.uid||d.active!==true||!Array.isArray(d.entries)||d.entries.length>20)throw denied();
  const ids=new Set();
  for(const e of d.entries){if(!e||!(e.space==='gifts'?[e.id]:[e.id,e.tenantId,e.campaignId,e.teamId]).every(identifier)||!Object.hasOwn(workspaceDestinations,e.space)||typeof e.label!=='string'||!e.label.trim()||e.label.length>160||ids.has(e.id)||(e.space==='gifts'&&Object.keys(e).sort().join(',')!=='id,label,space'))throw denied();ids.add(e.id);}
  return {entries:d.entries,uid:identity.uid};
 }
 async function check(header,e,uid){
  const scope=e.space==='gifts'?null:{tenantId:e.tenantId,campaignId:e.campaignId,teamId:e.teamId};
  if(e.space==='gifts'){
   // The gift cockpit is global over its independent, explicit client grants.
   await adapter.db.runTransaction(async tx=>authorizedGrant((await tx.get(adapter.db.doc(`giftOperators/${uid}`))).data(),uid));
  }else if(e.space==='kiosk'){await kiosk.read(header,scope);
  }else if(['team','kpi'].includes(e.space)){
   await adapter.db.runTransaction(async tx=>{
    const authorize=createAccessBoundary({verifyIdToken:async()=>({uid}),readMembership:async()=>{const m=(await tx.get(adapter.db.doc(`tenants/${scope.tenantId}/members/${uid}`))).data();if(e.space==='team'&&m?.participationEnabled!==true)throw denied();if(e.space==='kpi'&&(!Array.isArray(m?.kpiAssignments)||!m.kpiAssignments.some(a=>a.campaignId===scope.campaignId&&a.teamId===scope.teamId)))throw denied();return m;}});
    await authorize('Bearer verified',scope);
    const c=(await tx.get(adapter.db.doc(`tenants/${scope.tenantId}/campaigns/${scope.campaignId}`))).data();if(!c)throw denied();const config=JSON.parse(c.payload).ledger.state.config;
    if(config.tenantId!==scope.tenantId||config.campaignId!==scope.campaignId||!config.teams.some(t=>t.id===scope.teamId)||(e.space==='kpi'&&config.mode!=='kpi'))throw denied();
   });
  }else await (e.space==='organizer'?organizer:director).read(header,scope);
  return {id:e.id,space:e.space,label:e.label,scope,destination:workspaceDestinations[e.space]};
 }
 return {
  async list(header){const {entries,uid}=await directory(header),result=[];for(const e of entries){try{const v=await check(header,e,uid);result.push({id:v.id,space:v.space,label:v.label});}catch(error){if(error.status!==403)throw error;}}return result;},
  async select(header,id){if(!identifier(id))throw denied();const {entries,uid}=await directory(header),entry=entries.find(e=>e.id===id);if(!entry)throw denied();return check(header,entry,uid);}
 };
}
