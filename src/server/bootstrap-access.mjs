import {createHash} from 'node:crypto';
import {assertTestAdapter} from './test-environment.mjs';
const fail=s=>Object.assign(Error('Initial access preparation refused'),{status:s});
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Operator-only initial setup; not exposed through HTTP. Never creates an Auth user. */
export function createAccessBootstrap(adapter){
 assertTestAdapter(adapter);const {auth,db}=adapter;
 async function prepare(input){
  if(!input||Object.keys(input).sort().join(',')!=='campaignId,email,reason,reference,teamId,tenantId,uid'||![input.uid,input.tenantId,input.campaignId,input.teamId,input.reference].every(id)||typeof input.email!=='string'||input.email.length>254||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>1000)throw fail(400);
  let user;try{user=await auth.getUser(input.uid);}catch{throw fail(403);}if(user.disabled||!user.emailVerified||user.email!==input.email)throw fail(403);
  const campaign=db.doc(`tenants/${input.tenantId}/campaigns/${input.campaignId}`),snapshot=await campaign.get();if(!snapshot.exists)throw fail(403);
  const config=JSON.parse(snapshot.data().payload).ledger.state.config;
  if(config.tenantId!==input.tenantId||config.campaignId!==input.campaignId||!config.teams.some(t=>t.id===input.teamId))throw fail(403);
  const plan={schemaVersion:1,projectId:db.projectId,uid:input.uid,email:input.email,tenantId:input.tenantId,campaignId:input.campaignId,teamId:input.teamId,reference:input.reference,reason:input.reason.trim(),campaignHash:hash(snapshot.data().payload),rights:['organizer','tenant-access-administrator']};
  return {plan,digest:hash(plan),campaign};
 }
 const refs=i=>({marker:db.doc('accessBootstraps/'+i.tenantId),member:db.doc(`tenants/${i.tenantId}/members/${i.uid}`),directory:db.doc('workspaceDirectories/'+i.uid),grant:db.doc('accessAdministrators/'+i.uid)});
 return {
  async preview(input){const {plan,digest}=await prepare(input),r=refs(input);const snapshots=await Promise.all(Object.values(r).map(ref=>ref.get()));return {plan,digest,canApply:snapshots.every(s=>!s.exists)};},
  async apply(input,expectedDigest){
   if(typeof expectedDigest!=='string'||!/^[a-f0-9]{64}$/.test(expectedDigest))throw fail(400);
   const {plan,digest,campaign}=await prepare(input);if(digest!==expectedDigest)throw fail(409);const r=refs(input);
   return db.runTransaction(async tx=>{
    const [marker,member,directory,grant,c]=await Promise.all([tx.get(r.marker),tx.get(r.member),tx.get(r.directory),tx.get(r.grant),tx.get(campaign)]);
    if(marker.exists){if(marker.data().digest!==digest)throw fail(409);return {applied:false,digest};}
    if(member.exists||directory.exists||grant.exists||!c.exists||hash(c.data().payload)!==plan.campaignHash)throw fail(409);
    tx.create(r.member,{uid:input.uid,tenantId:input.tenantId,active:true,participationEnabled:false,assignments:[{campaignId:input.campaignId,teamId:input.teamId}],organizerCampaigns:[input.campaignId]});
    tx.create(r.directory,{uid:input.uid,active:true,revision:0,entries:[{id:'initial-organizer',space:'organizer',tenantId:input.tenantId,campaignId:input.campaignId,teamId:input.teamId,label:'Organisation du voyage'}]});
    tx.create(r.grant,{uid:input.uid,active:true,tenants:[input.tenantId]});
    tx.create(r.marker,{digest,plan,recordedAt:new Date().toISOString()});return {applied:true,digest};
   });
  }
 };
}
