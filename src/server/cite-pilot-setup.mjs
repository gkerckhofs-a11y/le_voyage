import {createHash,randomBytes} from 'node:crypto';
import {assertTestAdapter} from './test-environment.mjs';
import {canonicalJSON} from '../cite/canonical.ts';
import {createEconomy,ECONOMY_VERSION,identifier} from '../cite/economy.ts';
import {createGovernance,COUNCIL_RULES} from '../cite/councils.ts';
import {initializeCity} from '../cite/city.ts';
import {GAUGES,CITY_RULES} from '../cite/city-state.ts';
import {planWeeks} from '../domain/calendar.ts';
import {body,authorized} from './http.mjs';
const fail=status=>Object.assign(Error('Cité pilot setup refused'),{status});
function keys(value,wanted){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...wanted].sort().join(','))throw fail(400);}
export function normalizePilotSetup(input){
 keys(input,['name','firstMonday','families','performanceMetrics','valueMetrics','initialGauges','missingDataPolicy','acknowledgePrototype']);
 if(input.acknowledgePrototype!==true||typeof input.name!=='string'||!input.name.trim()||input.name.length>160||!Array.isArray(input.families)||input.families.length<1||input.families.length>10||input.families.some(n=>typeof n!=='string'||!n.trim()||n.length>160)||new Set(input.families.map(n=>n.trim().toLocaleLowerCase('fr'))).size!==input.families.length)throw fail(400);
 const metricRows=(rows,prefix)=>{if(!Array.isArray(rows)||!rows.length||rows.length>20)throw fail(400);return rows.map((m,i)=>{keys(m,['label','weightBps']);return {id:prefix+i,label:typeof m.label==='string'?m.label.trim():m.label,weightBps:m.weightBps};});};
 keys(input.initialGauges,GAUGES);if(GAUGES.some(k=>!Number.isInteger(input.initialGauges[k])||input.initialGauges[k]<0||input.initialGauges[k]>100))throw fail(400);
 let config;try{config={tenantId:'preview-tenant',seasonId:'preview-season',name:input.name.trim(),rulesVersion:ECONOMY_VERSION,families:input.families.map((name,i)=>({id:'family-'+i,name:name.trim()})),memberships:[],weeks:planWeeks(input.firstMonday,16),metrics:{performance:metricRows(input.performanceMetrics,'performance-'),values:metricRows(input.valueMetrics,'value-')},missingDataPolicy:input.missingDataPolicy,minimumValueResponses:1};createEconomy(config);}catch{throw fail(400);}
 const setup={name:config.name,firstMonday:input.firstMonday,families:config.families.map(f=>f.name),performanceMetrics:config.metrics.performance.map(({label,weightBps})=>({label,weightBps})),valueMetrics:config.metrics.values.map(({label,weightBps})=>({label,weightBps})),initialGauges:structuredClone(input.initialGauges),missingDataPolicy:config.missingDataPolicy,acknowledgePrototype:true};
 return {setup,config};
}
const digest=value=>createHash('sha256').update(canonicalJSON(value)).digest('hex');
export function createCitePilotSetupService(adapter,{today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels'}).format(new Date())}={}){
 assertTestAdapter(adapter);const {db,auth}=adapter;
 const operate=async(header,scope,action)=>{
  if(!scope||![scope.tenantId,scope.seasonId,scope.familyId].every(identifier)||typeof header!=='string'||!/^Bearer \S{1,8192}$/.test(header))throw fail(403);
  let actor;try{actor=await auth.verifyIdToken(header.slice(7),true);}catch{throw fail(403);}if(!identifier(actor?.uid))throw fail(403);
  return db.runTransaction(async tx=>{const memberRef=db.doc(`tenants/${scope.tenantId}/members/${actor.uid}`),member=(await tx.get(memberRef)).data(),source=(await tx.get(db.doc(`tenants/${scope.tenantId}/citeSeasons/${scope.seasonId}/privateEconomy/main`))).data();
   if(member?.active!==true||member.uid!==actor.uid||member.tenantId!==scope.tenantId||member.citePilotCreation!==true||!Array.isArray(member.citeSeasonManagement)||!member.citeSeasonManagement.includes(scope.seasonId)||source?.state?.config?.tenantId!==scope.tenantId||source.state.config.seasonId!==scope.seasonId||!source.state.config.families.some(f=>f.id===scope.familyId))throw fail(403);
   return action({tx,uid:actor.uid,member,memberRef,date:today(scope)});
  });
 };
 const review=(scope,uid,input,date)=>{const {setup,config}=normalizePilotSetup(input);if(setup.firstMonday<date)throw fail(409);return {setup,config,fingerprint:digest({tenantId:scope.tenantId,uid,setup,economy:ECONOMY_VERSION,councils:COUNCIL_RULES,city:CITY_RULES}),summary:{...setup,weeks:16,councils:4,lastWeekEndsOn:config.weeks.at(-1).endExclusive,members:0,rewardsEnabled:false}};};
 return {
  access:(header,scope)=>operate(header,scope,({date})=>({date})),
  preview:(header,scope,input)=>{keys(input,['setup']);return operate(header,scope,({uid,date})=>{const r=review(scope,uid,input.setup,date);return {setup:r.setup,fingerprint:r.fingerprint,summary:r.summary};});},
  create:(header,scope,input)=>{keys(input,['setup','fingerprint','mutationId']);if(!identifier(input.mutationId)||input.mutationId.length<8||typeof input.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(input.fingerprint))throw fail(400);const seed=randomBytes(32).toString('hex');return operate(header,scope,async({tx,uid,member,memberRef,date})=>{
   const {setup,config}=normalizePilotSetup(input.setup),expected=digest({tenantId:scope.tenantId,uid,setup,economy:ECONOMY_VERSION,councils:COUNCIL_RULES,city:CITY_RULES});if(input.fingerprint!==expected)throw fail(409);
   const key=digest({tenantId:scope.tenantId,uid,mutationId:input.mutationId}),seasonId='pilot-'+key.slice(0,24),workspaceId='cite-'+key.slice(0,24),newScope={tenantId:scope.tenantId,seasonId,familyId:'family-0'},registryRef=db.doc(`tenants/${scope.tenantId}/citePilotCreations/${key}`),seasonRef=db.doc(`tenants/${scope.tenantId}/citeSeasons/${seasonId}/privateEconomy/main`),directoryRef=db.doc('workspaceDirectories/'+uid);
   const [registrySnapshot,seasonSnapshot,directorySnapshot]=await Promise.all([tx.get(registryRef),tx.get(seasonRef),tx.get(directoryRef)]),old=registrySnapshot.data(),directory=directorySnapshot.data();
   if(old){if(old.fingerprint!==expected||old.actorUid!==uid||!seasonSnapshot.exists)throw fail(409);return {created:true,workspaceId,seasonId,name:setup.name};}
   if(setup.firstMonday<date||seasonSnapshot.exists||member.citeSeasonManagement.length>=20||!directory||directory.uid!==uid||directory.active!==true||!Array.isArray(directory.entries)||directory.entries.length>=20||directory.entries.some(e=>e.id===workspaceId))throw fail(409);
   config.tenantId=scope.tenantId;config.seasonId=seasonId;const game=initializeCity(createGovernance(createEconomy(config),setup.initialGauges,COUNCIL_RULES),newScope,seed);
   tx.set(seasonRef,{state:game.economy,councils:game.councils,city:game.city,pilotSetup:{version:1,createdOn:date,actorUid:uid,fingerprint:expected,kind:'four-council-pilot'},managementAudit:[{type:'create-pilot',actorUid:uid,date}]});
   tx.set(registryRef,{fingerprint:expected,actorUid:uid,seasonId,workspaceId,createdOn:date});
   tx.set(memberRef,{...member,citeSeasonManagement:[...member.citeSeasonManagement,seasonId]});
   tx.set(directoryRef,{...directory,entries:[...directory.entries,{id:workspaceId,space:'cite-admin',...newScope,label:setup.name}]});
   return {created:true,workspaceId,seasonId,name:setup.name};
  });}
 };
}
export function createCitePilotSetupHttp(adapter,options={}){
 const service=createCitePilotSetupService(adapter,options);
 return {async handle(req,json,path,session){if(session.workspaceSpace!=='cite-admin'||!session.workspaceEnabled||!session.scope)throw fail(403);
  if(path==='/api/cite/pilot-setup'&&req.method==='GET'){json(200,{...await service.access(session.header,session.scope),csrf:session.csrf});return;}
  if(req.method!=='POST'||!['/api/cite/pilot-setup/preview','/api/cite/pilot-setup/create'].includes(path))throw fail(404);authorized(req,session);const preview=path.endsWith('/preview'),input=await body(req,preview?['setup']:['setup','fingerprint','mutationId'],65536);json(200,{...await service[preview?'preview':'create'](session.header,session.scope,input),csrf:session.csrf});
 }};
}
