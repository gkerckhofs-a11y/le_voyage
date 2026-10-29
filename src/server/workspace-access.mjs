import {assertTestAdapter} from './test-environment.mjs';
const fail=s=>Object.assign(Error('Access administration refused'),{status:s});
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
/** Separate tenant-scoped grant. Only read-only director and display roles in this increment. */
export function createWorkspaceAccess(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 return {async save(header,input){
  if(!input||Object.keys(input).sort().join(',')!=='campaignId,enabled,mutationId,reason,revision,space,tenantId,uid'||![input.uid,input.tenantId,input.campaignId,input.mutationId].every(id)||!['director','kiosk'].includes(input.space)||typeof input.enabled!=='boolean'||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>1000)throw fail(400);
  if(typeof header!=='string'||!/^Bearer \S{1,8192}$/.test(header))throw fail(401);
  let actor;try{actor=await auth.verifyIdToken(header.slice(7),true);}catch{throw fail(401);}if(!id(actor.uid))throw fail(403);
  const grant=db.doc('accessAdministrators/'+actor.uid);
  const permitted=g=>g?.uid===actor.uid&&g.active===true&&Array.isArray(g.tenants)&&g.tenants.includes(input.tenantId);
  if(!permitted((await grant.get()).data()))throw fail(403);
  let target;try{target=await auth.getUser(input.uid);}catch{throw fail(403);}if(input.enabled&&(target.disabled||!target.emailVerified))throw fail(403);
  const directory=db.doc('workspaceDirectories/'+input.uid),member=db.doc(`tenants/${input.tenantId}/members/${input.uid}`),campaign=db.doc(`tenants/${input.tenantId}/campaigns/${input.campaignId}`);
  const event=db.doc(`workspaceAccessAudit/${input.uid}/mutations/${input.mutationId}`),fingerprint=JSON.stringify({...input,reason:input.reason.trim()});
  return db.runTransaction(async tx=>{
   const [g,d,m,c,e]=await Promise.all([tx.get(grant),tx.get(directory),tx.get(member),tx.get(campaign),tx.get(event)]);
   if(!permitted(g.data()))throw fail(403);
   if(e.exists){if(e.data().author!==actor.uid||e.data().fingerprint!==fingerprint)throw fail(409);return {applied:false,revision:e.data().revision};}
   const config=c.exists?JSON.parse(c.data().payload).ledger.state.config:null;if(config?.tenantId!==input.tenantId||config.campaignId!==input.campaignId||!config.teams?.length)throw fail(403);
   const previous=d.data()??{uid:input.uid,active:true,entries:[],revision:0};
   if(previous.uid!==input.uid||previous.active!==true||!Array.isArray(previous.entries)||(previous.revision??0)!==input.revision)throw fail(409);
   const membership=m.data()??{uid:input.uid,tenantId:input.tenantId,active:true,participationEnabled:false,assignments:[]};
   if(membership.uid!==input.uid||membership.tenantId!==input.tenantId||membership.active!==true)throw fail(403);
   const field=input.space==='director'?'directorCampaigns':'kioskCampaigns',assigned=membership[field]??[];if(!Array.isArray(assigned))throw fail(409);
   const entries=previous.entries.filter(x=>!(x.space===input.space&&x.tenantId===input.tenantId&&x.campaignId===input.campaignId));
   if(input.enabled){const entryId='access-'+input.mutationId;if(entries.some(x=>x.id===entryId))throw fail(409);entries.push({id:entryId,space:input.space,tenantId:input.tenantId,campaignId:input.campaignId,teamId:config.teams[0].id,label:input.space==='director'?'Espace entreprise':'Écran collectif'});}
   if(entries.length>20)throw fail(409);
   const revision=input.revision+1;
   tx.set(member,{...membership,[field]:[...assigned.filter(x=>x!==input.campaignId),...(input.enabled?[input.campaignId]:[])]});
   tx.set(directory,{...previous,entries,revision});
   tx.create(event,{author:actor.uid,fingerprint,revision,recordedAt:new Date().toISOString()});return {applied:true,revision};
  });
 }};
}
