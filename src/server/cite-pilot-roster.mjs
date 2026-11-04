import {createHash} from 'node:crypto';
import {createCiteStore} from './cite-store.mjs';
import {canonicalJSON} from '../cite/canonical.ts';
import {createEconomy,identifier} from '../cite/economy.ts';
import {body,authorized} from './http.mjs';
const fail=status=>Object.assign(Error('Cité pilot roster refused'),{status});
const digest=value=>createHash('sha256').update(canonicalJSON(value)).digest('hex');
const exact=(v,fields)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==[...fields].sort().join(','))throw fail(400);};
const compact=rows=>rows.map(({uid,familyId,fundingDelegate})=>({uid,familyId,fundingDelegate})).sort((a,b)=>a.uid.localeCompare(b.uid));
export function pilotRosterEditable(record,date){const s=record.state;return record.pilotSetup?.kind==='four-council-pilot'&&date<s.config.weeks[0].start&&!record.rewards&&Object.keys(s.credits).length===0&&Object.keys(s.values).length===0&&Object.keys(s.performance).length===0&&Object.values(s.balances).every(n=>n===0)&&record.councils?.order.length===0&&Object.keys(record.councils?.buildings??{}).length===0&&Object.keys(record.city?.crises??{}).length===0;}
function view(record,date){return {name:record.state.config.name,startsOn:record.state.config.weeks[0].start,editable:pilotRosterEditable(record,date),families:record.state.config.families.map(f=>({...f})),revision:record.pilotRoster?.revision??0,rows:structuredClone(record.pilotRoster?.rows??[])};}
export function createCitePilotRosterService(adapter,options={}){
 const store=createCiteStore(adapter,options),{auth,db}=adapter;
 const operate=(header,scope,action)=>store(header,scope,'manager',async(record,uid,date,context)=>{if(!context.capabilities.pilotCreation||record.pilotSetup?.kind!=='four-council-pilot'||!record.state.config.families.some(f=>f.id===scope.familyId))throw fail(403);return action(record,uid,date,context);});
 const account=async uid=>{let user;try{user=await auth.getUser(uid);}catch(e){if(e.code==='auth/user-not-found')throw fail(400);throw e;}if(user.disabled||!user.emailVerified||typeof user.email!=='string'||!identifier(user.uid)||user.uid!==uid)throw fail(400);return user;};
 return {
  read:(header,scope)=>operate(header,scope,(record,_uid,date)=>({record,value:view(record,date)})),
  lookup:async(header,scope,input)=>{exact(input,['email']);if(typeof input.email!=='string'||input.email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email))throw fail(400);return operate(header,scope,async(record,_uid,date,{tx})=>{if(!pilotRosterEditable(record,date))throw fail(409);let user;try{user=await auth.getUserByEmail(input.email);}catch(e){if(e.code==='auth/user-not-found')throw fail(400);throw e;}user=await account(user.uid);const m=(await tx.get(db.doc(`tenants/${scope.tenantId}/members/${user.uid}`))).data();if(m?.uid!==user.uid||m.tenantId!==scope.tenantId||m.active!==true||user.email.toLowerCase()!==input.email.toLowerCase())throw fail(400);return {record,value:{uid:user.uid,email:user.email,label:user.displayName?.slice(0,160)||user.email}};});},
  save:async(header,scope,input)=>{exact(input,['rows','revision','mutationId']);if(!Array.isArray(input.rows)||input.rows.length>100||!Number.isSafeInteger(input.revision)||input.revision<0||!identifier(input.mutationId)||input.mutationId.length<8)throw fail(400);const ids=new Set();for(const r of input.rows){exact(r,['uid','familyId','fundingDelegate']);if(!identifier(r.uid)||!identifier(r.familyId)||typeof r.fundingDelegate!=='boolean'||ids.has(r.uid))throw fail(400);ids.add(r.uid);}const rows=compact(input.rows);return operate(header,scope,async(record,actorUid,date,{tx})=>{
   const previous=record.pilotRoster??{revision:0,rows:[],mutations:{}},fingerprint=digest({scope,actorUid,rows,revision:input.revision}),old=previous.mutations[input.mutationId];if(old){if(old!==fingerprint)throw fail(409);return {record,value:view(record,date)};}
   if(!pilotRosterEditable(record,date)||previous.revision!==input.revision||previous.revision>=100||(record.managementAudit??[]).length>=2000)throw fail(409);
   if(rows.some(r=>!record.state.config.families.some(f=>f.id===r.familyId)))throw fail(400);
   if(canonicalJSON(rows)===canonicalJSON(compact(previous.rows)))return {record,value:view(record,date)};
   const users=await Promise.all(rows.map(r=>account(r.uid))),all=[...new Set([...previous.rows.map(r=>r.uid),...rows.map(r=>r.uid)])];
   const docs=await Promise.all(all.map(async uid=>{const memberRef=db.doc(`tenants/${scope.tenantId}/members/${uid}`),directoryRef=db.doc('workspaceDirectories/'+uid),[m,d]=await Promise.all([tx.get(memberRef),tx.get(directoryRef)]);return {uid,memberRef,directoryRef,member:m.data(),directory:d.data()};}));
   const writes=[];
   for(const d of docs){const assigned=rows.find(r=>r.uid===d.uid),m=d.member;if(!m||m.uid!==d.uid||m.tenantId!==scope.tenantId||(assigned&&m.active!==true))throw fail(400);
    const grants=field=>{const a=m[field]??[];if(!Array.isArray(a)||a.length>100||a.some(x=>!x||typeof x!=='object'))throw fail(409);return a.filter(x=>x.seasonId!==scope.seasonId);},assignments=grants('citeAssignments'),funding=grants('citeFundingAssignments');
    const dir=d.directory??{uid:d.uid,active:true,entries:[]};if(dir.uid!==d.uid||!Array.isArray(dir.entries)||dir.entries.length>20||dir.entries.some(e=>!e||typeof e!=='object')||(assigned&&dir.active!==true))throw fail(409);
    const entries=dir.entries.filter(e=>!(e.space==='cite-member'&&e.tenantId===scope.tenantId&&e.seasonId===scope.seasonId));
    if(assigned){if(entries.length>=20||assignments.length>=100||funding.length>=100)throw fail(409);assignments.push({seasonId:scope.seasonId,familyId:assigned.familyId});if(assigned.fundingDelegate)funding.push({seasonId:scope.seasonId,familyId:assigned.familyId});const id='member-'+digest({tenantId:scope.tenantId,seasonId:scope.seasonId,uid:d.uid}).slice(0,24);if(entries.some(e=>e.id===id))throw fail(409);entries.push({id,space:'cite-member',tenantId:scope.tenantId,seasonId:scope.seasonId,familyId:assigned.familyId,label:record.state.config.name});}
    writes.push([d.memberRef,{...m,citeAssignments:assignments,citeFundingAssignments:funding}]);if(d.directory||assigned)writes.push([d.directoryRef,{...dir,entries}]);
   }
   const config={...record.state.config,memberships:rows.map(r=>({uid:r.uid,familyId:r.familyId,from:record.state.config.weeks[0].start}))};try{createEconomy(config);}catch{throw fail(400);}
   const roster={revision:previous.revision+1,rows:rows.map(r=>{const u=users.find(u=>u.uid===r.uid);return {...r,email:u.email,label:u.displayName?.slice(0,160)||u.email};}),mutations:{...previous.mutations,[input.mutationId]:fingerprint}};
   const updated={...record,state:{...record.state,config},pilotRoster:roster,managementAudit:[...(record.managementAudit??[]),{type:'set-pilot-roster',actorUid,date,revision:roster.revision,before:compact(previous.rows),after:rows}]};
   for(const [ref,value]of writes)tx.set(ref,value);return {record:updated,value:view(updated,date)};
  });}
 };
}
export function createCitePilotRosterHttp(adapter,options={}){const service=createCitePilotRosterService(adapter,options);return {async handle(req,json,path,session){if(!session.workspaceEnabled||session.workspaceSpace!=='cite-admin'||!session.scope)throw fail(403);if(path==='/api/cite/pilot-roster'&&req.method==='GET'){json(200,{...await service.read(session.header,session.scope),csrf:session.csrf});return;}if(req.method!=='POST'||!['/api/cite/pilot-roster/lookup','/api/cite/pilot-roster/save'].includes(path))throw fail(404);authorized(req,session);const lookup=path.endsWith('/lookup'),input=await body(req,lookup?['email']:['rows','revision','mutationId'],32768);json(200,{...await service[lookup?'lookup':'save'](session.header,session.scope,input),csrf:session.csrf});}};}
