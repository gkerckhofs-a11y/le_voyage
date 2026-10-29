import {createKioskProgress} from './kiosk-progress.mjs';
import {createWorkspaces} from './workspaces.mjs';
import {createOrganizerDashboard} from './organizer-dashboard.mjs';
import {createDirectorProgress} from './director-progress.mjs';
import {createKpiPeriods} from './kpi-periods.mjs';
import {createKpiAccess} from './kpi-access.mjs';
import {createKpiCollection} from './kpi-collection.mjs';
import {createAnnualPlanning} from './annual-planning.mjs';
import {beneficiaryDemo,seedBeneficiaryDemo} from './beneficiary-demo.mjs';
import {createGiftBeneficiaries} from './gift-beneficiaries.mjs';
import {createSupplierCatalog,demoSupplierCatalog} from './supplier-catalog.mjs';
import {randomBytes} from 'node:crypto';
import {createFirebaseEmulatorAdapter,assertEmulators} from './firebase-emulator.mjs';
import {createWeekCoordination} from './week-coordination.mjs';
import {createWeeklyQuestionnaire} from './weekly-questionnaire.mjs';
import {createGiftPreferences} from './gift-preferences.mjs';
import {createTeamVote} from './team-vote.mjs';
import {createInvitations} from './invitations.mjs';
import {createGiftOperations} from './gift-operations.mjs';
import {newDemo,newAutonomousTpeDemo,newOperationsDemo} from './demo-service.mjs';
import {body,authorized} from './http.mjs';
const profiles={lex:{uid:'demo-lex-user',tenantId:'fiction-lex-ekho',email:'lex@example.test'},atelier:{uid:'demo-atelier-user',tenantId:'fiction-atelier',email:'atelier@example.test'}};
const invitedProfile={uid:'demo-invited-user',email:'camille@example.test'};
profiles.limited={uid:'demo-limited-user',tenantId:'fiction-limited-modes',email:'limited@example.test',workspaces:true};
profiles.fourspaces={uid:'demo-fourspaces-user',tenantId:'fiction-four-spaces',email:'fourspaces@example.test',workspaces:true};
profiles.multispace={uid:'demo-multispace-user',tenantId:'fiction-workspaces-a',email:'multispace@example.test',workspaces:true};
profiles.organizer={uid:'demo-organizer-user',tenantId:'fiction-lex-ekho',email:'organizer@example.test'};
profiles.director={uid:'demo-director-user',tenantId:'fiction-lex-ekho',email:'director@example.test'};
profiles.clem={uid:'demo-rc-admin',tenantId:'fiction-lex-ekho',email:'clem@example.test'};
for(let i=1;i<=3;i++)profiles['team'+i]={uid:'demo-team-'+i,tenantId:'fiction-lex-ekho',email:'team'+i+'@example.test',teamId:'private-collective-team-'+i};
profiles.operations={uid:'demo-operations-user',tenantId:'fiction-operations-demo',email:'operations@example.test'};
for(const p of beneficiaryDemo.filter(p=>p.profile))profiles[p.profile]={uid:p.uid,tenantId:'fiction-operations-demo',email:p.uid+'@example.test',teamId:p.teamId};
profiles.kpiadmin={uid:'demo-kpi-admin',tenantId:'fiction-kpi-demo',email:'admin-kpi@example.test'};
profiles.kpi={uid:'demo-kpi-referent',tenantId:'fiction-kpi-demo',email:'referent-kpi@example.test'};
profiles.tpe={uid:'demo-tpe-user',tenantId:'fiction-tpe-auto',email:'tpe@example.test'};
profiles.tpeadmin={uid:'demo-tpe-admin',tenantId:'fiction-tpe-auto',email:'tpe-admin@example.test'};

async function ensureFixtureUser(auth,profile,password){
 let user;try{user=await auth.getUser(profile.uid);}catch(error){
  if(error.code!=='auth/user-not-found')throw error;
  try{user=await auth.createUser({uid:profile.uid,email:profile.email,password});}catch(conflict){
   if(conflict.code!=='auth/uid-already-exists')throw conflict;
   user=await auth.getUser(profile.uid);
  }
 }
 if(user.uid!==profile.uid||user.email!==profile.email)throw Error('Fictitious account identity mismatch');
}
const failure=status=>Object.assign(new Error('Request refused'),{status});
export async function createFirebaseHttp(options){
 if(!options)assertEmulators();
 const clock=options?.now??Date.now;
 const cookieName=options?.cookieName??'rc_auth';
 if(!['rc_auth','__session'].includes(cookieName))throw new Error('Unsupported session cookie');
 const password=options?.password??'Fictitious-Emulator-Only-42!';
 const loginEndpoint=options?.loginEndpoint??'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key';
 const adapter=options?.adapter??createFirebaseEmulatorAdapter(),sessions=new Map(),kioskProgress=createKioskProgress(adapter),organizerDashboard=createOrganizerDashboard(adapter),directorProgress=createDirectorProgress(adapter),kpiPeriods=createKpiPeriods(adapter),kpiAccess=createKpiAccess(adapter),kpiCollection=createKpiCollection(adapter),annualPlanning=createAnnualPlanning(adapter),invitations=createInvitations(adapter),teamVote=createTeamVote(adapter),giftPreferences=createGiftPreferences(adapter),questionnaire=createWeeklyQuestionnaire(adapter),coordination=createWeekCoordination(adapter),giftOperations=createGiftOperations(adapter),supplierCatalog=createSupplierCatalog(adapter,{sheetsSource:options?.sheetsSource??null}),giftBeneficiaries=createGiftBeneficiaries(adapter);
 const workspaces=createWorkspaces(adapter,{organizer:organizerDashboard,director:directorProgress,kiosk:kioskProgress});
 try{
  for(const profile of Object.values(profiles)){
   await ensureFixtureUser(adapter.auth,profile,password);
   const record=['fiction-operations-demo','fiction-four-spaces'].includes(profile.tenantId)?newOperationsDemo():profile.tenantId==='fiction-tpe-auto'?newAutonomousTpeDemo():newDemo();record.ledger.state.config.tenantId=profile.tenantId;
   profile.scope={tenantId:profile.tenantId,campaignId:record.ledger.state.config.campaignId,teamId:profile.teamId??'explorateurs'};
   const campaign=adapter.db.doc(`tenants/${profile.tenantId}/campaigns/${profile.scope.campaignId}`),member=adapter.db.doc(`tenants/${profile.tenantId}/members/${profile.uid}`);
   await adapter.db.runTransaction(async tx=>{const c=await tx.get(campaign),m=await tx.get(member);if(!c.exists)tx.set(campaign,{payload:JSON.stringify(record),...(['fiction-tpe-auto','fiction-kpi-demo'].includes(profile.tenantId)?{collectionMode:'weekly-questionnaire'}:{})});if(m.exists&&profile.uid==='demo-rc-admin'&&m.data().canPlanCampaign===undefined)tx.update(member,{canPlanCampaign:true});if(!m.exists&&!profile.workspaces)tx.set(member,{uid:profile.uid,tenantId:profile.tenantId,active:true,...(profile.uid==='demo-kpi-admin'?{participationEnabled:false,kpiPeriodManagementAssignments:[{campaignId:profile.scope.campaignId,teamId:profile.scope.teamId}],kpiManagementAssignments:[{campaignId:profile.scope.campaignId,teamId:profile.scope.teamId}]}:{}),...(profile.uid==='demo-kpi-referent'?{participationEnabled:false,kpiAssignments:[{campaignId:profile.scope.campaignId,teamId:profile.scope.teamId}]}:{}),...(profile.uid==='demo-operations-user'?{participationEnabled:false}:{}),...(profile.uid==='demo-tpe-admin'?{participationEnabled:false,canManageTeam:true,canCloseWeeks:true,canCoordinateWeeks:true,coordinatedAssignments:record.ledger.state.config.teams.map(t=>({campaignId:profile.scope.campaignId,teamId:t.id}))}:{}),...(profile.uid==='demo-rc-admin'?{canPlanCampaign:true,canInvite:true,canManageTeam:true,canCloseWeeks:true,canCoordinateWeeks:true,coordinatedAssignments:record.ledger.state.config.teams.map(t=>({campaignId:profile.scope.campaignId,teamId:t.id}))}:{}),...(profile.uid==='demo-organizer-user'?{participationEnabled:false,organizerCampaigns:[profile.scope.campaignId],canPlanCampaign:true,canInvite:true,canManageTeam:true,canCloseWeeks:true,canCoordinateWeeks:true,coordinatedAssignments:record.ledger.state.config.teams.map(t=>({campaignId:profile.scope.campaignId,teamId:t.id}))}:{}),...(profile.uid==='demo-multispace-user'?{participationEnabled:false}:{}),...(profile.uid==='demo-director-user'?{participationEnabled:false,directorCampaigns:[profile.scope.campaignId],assignments:[]}:{assignments:[{campaignId:profile.scope.campaignId,teamId:profile.scope.teamId}]})});});
  }
  // Isolated fictitious multi-role account. No rights added to existing client profiles.
  const multi=profiles.multispace,entries=[];
  for(const [suffix,label] of [['a','Entreprise A'],['b','Entreprise B']]){
   const tenantId='fiction-workspaces-'+suffix,record=newDemo();record.ledger.state.config.tenantId=tenantId;
   const campaignId=record.ledger.state.config.campaignId,teamId='explorateurs',campaign=adapter.db.doc(`tenants/${tenantId}/campaigns/${campaignId}`),member=adapter.db.doc(`tenants/${tenantId}/members/${multi.uid}`);
   await adapter.db.runTransaction(async tx=>{const c=await tx.get(campaign),m=await tx.get(member);if(!c.exists)tx.set(campaign,{payload:JSON.stringify(record)});if(!m.exists)tx.set(member,{uid:multi.uid,tenantId,active:true,participationEnabled:false,assignments:[{campaignId,teamId}],organizerCampaigns:[campaignId],directorCampaigns:[campaignId],canPlanCampaign:true});});
   for(const space of ['organizer','director'])entries.push({id:suffix+'-'+space,space,tenantId,campaignId,teamId,label:label+' · '+campaignId});
  }
  const directory=adapter.db.doc(`workspaceDirectories/${multi.uid}`);await adapter.db.runTransaction(async tx=>{if(!(await tx.get(directory)).exists)tx.set(directory,{uid:multi.uid,active:true,entries});});
  // New explicit four-space fixture; existing demo memberships and grants are untouched.
  const four=profiles.fourspaces,scope=four.scope,member=adapter.db.doc(`tenants/${scope.tenantId}/members/${four.uid}`),grant=adapter.db.doc(`giftOperators/${four.uid}`),fourDirectory=adapter.db.doc(`workspaceDirectories/${four.uid}`);
  await adapter.db.runTransaction(async tx=>{const m=await tx.get(member),g=await tx.get(grant),d=await tx.get(fourDirectory);
   if(!m.exists)tx.set(member,{uid:four.uid,tenantId:scope.tenantId,active:true,participationEnabled:true,assignments:[{campaignId:scope.campaignId,teamId:scope.teamId}],organizerCampaigns:[scope.campaignId],directorCampaigns:[scope.campaignId],canPlanCampaign:true,canManageTeam:true,canCloseWeeks:true});
   if(!g.exists)tx.set(grant,{uid:four.uid,active:true,campaigns:[{tenantId:scope.tenantId,campaignId:scope.campaignId}]});
   if(!d.exists)tx.set(fourDirectory,{uid:four.uid,active:true,entries:[...['organizer','director','team'].map(space=>({id:space,space,...scope,label:'Entreprise des quatre espaces · '+scope.campaignId})),{id:'gifts',space:'gifts',label:'Cadeaux · toutes mes campagnes autorisées'}]});
  });
  const limited=profiles.limited,limitedScope=limited.scope,limitedMember=adapter.db.doc(`tenants/${limitedScope.tenantId}/members/${limited.uid}`),limitedDirectory=adapter.db.doc(`workspaceDirectories/${limited.uid}`),period=adapter.db.doc(`tenants/${limitedScope.tenantId}/campaigns/${limitedScope.campaignId}/kpiPeriods/limited-month`);
  await adapter.db.runTransaction(async tx=>{const m=await tx.get(limitedMember),d=await tx.get(limitedDirectory),p=await tx.get(period);
   if(!m.exists)tx.set(limitedMember,{uid:limited.uid,tenantId:limitedScope.tenantId,active:true,participationEnabled:false,assignments:[{campaignId:limitedScope.campaignId,teamId:limitedScope.teamId}],kpiAssignments:[{campaignId:limitedScope.campaignId,teamId:limitedScope.teamId}],kioskCampaigns:[limitedScope.campaignId],directorCampaigns:[limitedScope.campaignId]});
   if(!d.exists)tx.set(limitedDirectory,{uid:limited.uid,active:true,entries:['director','kpi','kiosk'].map(space=>({id:space,space,...limitedScope,label:'Entreprise des modes limités · '+limitedScope.campaignId}))});
   if(!p.exists)tx.set(period,{teamId:limitedScope.teamId,start:'2026-10-01',endExclusive:'2026-11-01',state:'open',definitionVersion:'fiction-v1',definitions:[{id:'quantity',label:'Livraisons fictives',unit:'unités'},{id:'delay',label:'Délai moyen fictif',unit:'jours'}]});
  });
  for(const [id,start,endExclusive,state] of [['october-test','2026-10-01','2026-11-01','open'],['september-test','2026-09-01','2026-10-01','frozen']]){
   const ref=adapter.db.doc(`tenants/${profiles.kpi.scope.tenantId}/campaigns/${profiles.kpi.scope.campaignId}/kpiPeriods/${id}`);
   await adapter.db.runTransaction(async tx=>{if(!(await tx.get(ref)).exists)tx.set(ref,{teamId:profiles.kpi.scope.teamId,start,endExclusive,state,definitionVersion:'fiction-v1',definitions:[{id:'quantity',label:'Livraisons fictives',unit:'unités'},{id:'delay',label:'Délai moyen fictif',unit:'jours'}]});});
  }
  await seedBeneficiaryDemo(adapter.db,profiles.operations.scope.campaignId);
  const operationsRef=adapter.db.doc('giftOperators/demo-operations-user');await adapter.db.runTransaction(async tx=>{if(!(await tx.get(operationsRef)).exists)tx.set(operationsRef,{uid:'demo-operations-user',active:true,campaigns:['lex','atelier','tpe','operations'].map(id=>({tenantId:profiles[id].scope.tenantId,campaignId:profiles[id].scope.campaignId}))});});
  const catalogRef=adapter.db.doc('supplierCatalog/main');await adapter.db.runTransaction(async tx=>{if(!(await tx.get(catalogRef)).exists)tx.set(catalogRef,demoSupplierCatalog());});
  await ensureFixtureUser(adapter.auth,invitedProfile,password);
 }catch(e){await adapter.close();throw e;}
 const cookie=(value,req,age=3300)=>`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${req.headers.origin?.startsWith('https:')?'; Secure':''}`;
 async function handler(req,json,path){
  const now=clock();for(const [key,s] of sessions)if(s.expires<=now)sessions.delete(key);
  const token=req.headers.cookie?.match(new RegExp('(?:^|;\\s*)'+cookieName+'=([a-f0-9]{64})(?:;|$)'))?.[1];
  if(path==='/api/auth/login'&&req.method==='POST'){
   const {profile:id}=await body(req,['profile']);if(id!=='camille'&&!Object.hasOwn(profiles,id))throw failure(400);
   const profile=id==='camille'?invitedProfile:profiles[id];
   const response=await fetch(loginEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:profile.email,password,returnSecureToken:true})});
   if(!response.ok)throw failure(401);const result=await response.json(),header='Bearer '+result.idToken;
   let scope=profile.workspaces?null:profile.scope??null;
   if(profile.workspaces)await workspaces.list(header);
   if(id==='camille'){const m=(await adapter.db.doc(`tenants/fiction-lex-ekho/members/${profile.uid}`).get()).data();if(m?.active&&m.assignments?.length)scope={tenantId:'fiction-lex-ekho',...m.assignments[0]};}
   if(scope){if(id==='kpi')await kpiCollection.list(header,scope);else if(id==='director')await directorProgress.read(header,scope);else if(id==='organizer')await organizerDashboard.read(header,scope);else await adapter.read(header,scope);}
   const next=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
   if(token)sessions.delete(token);sessions.set(next,{header,scope,csrf,workspaceEnabled:profile.workspaces===true,...(id==='kpi'?{workspaceSpace:'kpi'}:{}),directorOnly:id==='director',organizerOnly:id==='organizer',expires:now+3300000});
   json(200,{connected:true,...(profile.workspaces?{destination:'/espaces.html'}:id==='organizer'?{destination:'/organisateur.html'}:id==='director'?{destination:'/entreprise.html'}:['bocage1','bocage2'].includes(id)?{destination:'/preferences.html'}:id==='kpiadmin'?{destination:'/kpi-access.html'}:id==='kpi'?{destination:'/kpi.html'}:id==='operations'?{destination:'/cockpit.html'}:id==='clem'?{destination:'/invitations.html'}:id==='tpeadmin'?{destination:'/coordination.html'}:{})},{'Set-Cookie':cookie(next,req)});return;
  }
  const session=sessions.get(token);if(!session)throw failure(401);
  // Once handed to a shared display, this session cannot reopen the role selector.
  if(session.workspaceSpace==='kiosk'&&!((req.method==='GET'&&path==='/api/kiosk/progress')||(req.method==='POST'&&['/api/demo/session','/api/auth/logout'].includes(path))))throw failure(403);
  if(session.workspaceSpace==='kpi'&&!((req.method==='GET'&&path==='/api/workspaces')||(req.method==='POST'&&['/api/workspaces/select','/api/demo/session','/api/auth/logout','/api/kpi/list','/api/kpi/read','/api/kpi/submit'].includes(path))))throw failure(403);
  if(path==='/api/workspaces'&&req.method==='GET'){
   if(!session.workspaceEnabled)throw failure(403);
   json(200,{entries:await workspaces.list(session.header),selected:session.workspaceId??null,csrf:session.csrf});return;
  }
  if(path==='/api/workspaces/select'&&req.method==='POST'){
   if(!session.workspaceEnabled)throw failure(403);authorized(req,session);const {id}=await body(req,['id']);
   const chosen=await workspaces.select(session.header,id);
   // Compare after the async check: two concurrent selections cannot both succeed.
   if(sessions.get(token)!==session)throw failure(409);
   const next=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');sessions.delete(token);
   sessions.set(next,{...session,scope:chosen.scope,workspaceId:chosen.id,workspaceSpace:chosen.space,csrf,directorOnly:chosen.space==='director',organizerOnly:chosen.space==='organizer'});
   json(200,{destination:chosen.destination},{'Set-Cookie':cookie(next,req)});return;
  }
  if(session.workspaceEnabled&&path!=='/api/auth/logout'){
   if(!session.workspaceId)throw failure(403);
   const current=await workspaces.select(session.header,session.workspaceId);
   // Directory edits must not retarget an already open session.
   if(JSON.stringify(current.scope)!==JSON.stringify(session.scope)||current.space!==session.workspaceSpace)throw failure(403);
  }
  if(['team','gifts'].includes(session.workspaceSpace)&&path!=='/api/auth/logout'){
   const routes=session.workspaceSpace==='team'?{
    GET:['/api/demo/team','/api/demo/collective','/api/my-week','/api/my-gift-preferences','/api/team-vote'],
    POST:['/api/demo/session','/api/demo/claim','/api/my-week/answer','/api/my-week/absence','/api/my-gift-preferences','/api/team-vote/cast']
   }:{
    GET:['/api/gifts/reservations','/api/gifts/ops','/api/gifts/forecasts','/api/gifts/catalog'],
    POST:['/api/gifts/reservations/resolve-cancellation','/api/gifts/reservations/request-cancellation','/api/gifts/reservations/withdraw-cancellation','/api/gifts/catalog/stock/preview','/api/gifts/catalog/stock/confirm','/api/gifts/reservations/consume','/api/gifts/ops/attach','/api/gifts/reservations/confirm','/api/gifts/reservations/authorize','/api/gifts/reservations/revoke','/api/gifts/reservations/reserve','/api/gifts/reservations/release','/api/demo/session','/api/gifts/anticipate','/api/gifts/proposals/read','/api/gifts/proposals/save','/api/gifts/proposals/review','/api/gifts/ops/detail','/api/gifts/ops/amend','/api/gifts/ops/save','/api/gifts/catalog/save','/api/gifts/catalog/import/preview','/api/gifts/catalog/import/xlsx-preview','/api/gifts/catalog/import/sheets-preview','/api/gifts/catalog/import/history','/api/gifts/catalog/import/restore-preview','/api/gifts/catalog/import/read','/api/gifts/catalog/import/confirm','/api/gifts/catalog/suggest','/api/gifts/beneficiaries/read','/api/gifts/beneficiaries/freeze','/api/gifts/beneficiaries/review']
   };
   if(!routes[req.method]?.includes(path))throw failure(403);
  }
  if(path==='/api/kiosk/progress'&&req.method==='GET'){if(session.workspaceSpace!=='kiosk')throw failure(403);json(200,await kioskProgress.read(session.header,session.scope));return;}
  if(session.workspaceSpace==='kpi'&&!session.workspaceEnabled&&path!=='/api/auth/logout')await kpiCollection.list(session.header,session.scope);
  // Strip administrative controls from team responses even for explicitly multi-role accounts.
  const teamView=value=>session.workspaceSpace==='team'?{...value,canOpen:false,canClose:false,...(Object.hasOwn(value,'leaders')?{leaders:null}:{})}:value;
  if(session.organizerOnly&&path!=='/api/auth/logout'){
   const routes={GET:['/api/organizer/overview','/api/annual-plan','/api/coordination'],POST:['/api/demo/session','/api/invitation/session','/api/annual-plan/preview','/api/annual-plan/save','/api/invitation/create','/api/invitation/revoke','/api/coordination/open','/api/coordination/close','/api/coordination/postpone']};
   if(!routes[req.method]?.includes(path))throw failure(403);
   await organizerDashboard.read(session.header,session.scope);
  }
  if(session.directorOnly&&!['/api/director/progress','/api/demo/session','/api/auth/logout'].includes(path))throw failure(403);
  if(path==='/api/organizer/overview'&&req.method==='GET'){json(200,await organizerDashboard.read(session.header,session.scope));return;}
  if(path==='/api/director/progress'&&req.method==='GET'){json(200,await directorProgress.read(session.header,session.scope));return;}
  if(path.startsWith('/api/kpi-periods/')&&req.method==='POST'){
   if(!session.scope)throw failure(403);authorized(req,session);
   if(path==='/api/kpi-periods/list'){await body(req,[]);json(200,await kpiPeriods.list(session.header,session.scope));return;}
   if(path==='/api/kpi-periods/create'){const i=await body(req,['mutationId','start','endExclusive','definitionVersion','definitions','reason']);json(200,await kpiPeriods.create(session.header,session.scope,i));return;}
   if(path==='/api/kpi-periods/freeze'){const i=await body(req,['periodId','revision','mutationId','reason']);json(200,await kpiPeriods.freeze(session.header,session.scope,i));return;}
   throw failure(404);
  }
  if(path.startsWith('/api/kpi-access/')&&req.method==='POST'){
   if(!session.scope)throw failure(403);authorized(req,session);
   if(path==='/api/kpi-access/read'){await body(req,[]);json(200,await kpiAccess.read(session.header,session.scope));return;}
   if(path==='/api/kpi-access/save'){const i=await body(req,['uid','enabled','revision','mutationId','reason']);json(200,await kpiAccess.save(session.header,session.scope,i));return;}
   throw failure(404);
  }
  if(path.startsWith('/api/kpi/')&&req.method==='POST'){
   if(!session.scope)throw failure(403);authorized(req,session);
   if(path==='/api/kpi/list'){await body(req,[]);json(200,await kpiCollection.list(session.header,session.scope));return;}
   if(path==='/api/kpi/read'){const i=await body(req,['periodId']);json(200,await kpiCollection.read(session.header,session.scope,i.periodId));return;}
   if(path==='/api/kpi/submit'){const i=await body(req,['periodId','revision','mutationId','values','source','reason']);json(200,await kpiCollection.submit(session.header,session.scope,i));return;}
   throw failure(404);
  }
  if(path==='/api/annual-plan'&&req.method==='GET'){json(200,await annualPlanning.read(session.header,session.scope));return;}
  if(path.startsWith('/api/annual-plan/')&&req.method==='POST'){
   authorized(req,session);
   if(path==='/api/annual-plan/preview'){const i=await body(req,['input'],131072);json(200,await annualPlanning.preview(session.header,session.scope,i.input));return;}
   if(path==='/api/annual-plan/save'){const i=await body(req,['input','revision','mutationId'],131072);json(200,await annualPlanning.save(session.header,session.scope,i));return;}
   throw failure(404);
  }
  if(path.startsWith('/api/gifts/beneficiaries/')&&req.method==='POST'){authorized(req,session);if(path==='/api/gifts/beneficiaries/read'){const i=await body(req,['tenantId','campaignId','id']);json(200,await giftBeneficiaries.read(session.header,i,i.id));return;}if(path==='/api/gifts/beneficiaries/freeze'){const i=await body(req,['tenantId','campaignId','id','people','confirmed','reason','mutationId']);json(200,await giftBeneficiaries.freeze(session.header,i));return;}if(path==='/api/gifts/beneficiaries/review'){const i=await body(req,['tenantId','campaignId','id','digest','revision','contactConfirmed','reason','mutationId']);json(200,await giftBeneficiaries.review(session.header,i));return;}throw failure(404);}
  if(path==='/api/gifts/catalog'&&req.method==='GET'){json(200,await supplierCatalog.read(session.header));return;}
  if(path.startsWith('/api/gifts/catalog/')&&req.method==='POST'){authorized(req,session);if(path==='/api/gifts/catalog/import/sheets-preview'){json(200,await supplierCatalog.previewSheets(session.header,await body(req,[])));return;}if(path==='/api/gifts/catalog/import/xlsx-preview'){json(200,await supplierCatalog.previewXlsx(session.header,await body(req,['base64','sourceName'],700000)));return;}if(path==='/api/gifts/catalog/import/restore-preview'){json(200,await supplierCatalog.previewRestore(session.header,await body(req,['importId'])));return;}if(path==='/api/gifts/catalog/import/history'){json(200,await supplierCatalog.listImports(session.header,await body(req,['beforeRevision'])));return;}if(path==='/api/gifts/catalog/import/read'){json(200,await supplierCatalog.readImport(session.header,await body(req,['importId'])));return;}if(path==='/api/gifts/catalog/import/preview'){json(200,await supplierCatalog.previewImport(session.header,await body(req,['csv','delimiter','sourceName'],131072)));return;}if(path==='/api/gifts/catalog/import/confirm'){json(200,await supplierCatalog.confirmImport(session.header,await body(req,['draftId','reason'])));return;}if(path==='/api/gifts/catalog/stock/preview'){json(200,await supplierCatalog.previewStockReconciliation(session.header,await body(req,['sku'])));return;}if(path==='/api/gifts/catalog/stock/confirm'){json(200,await supplierCatalog.confirmStockReconciliation(session.header,await body(req,['sku','fingerprint','mutationId','reason','inventoryReference','inventoryConfirmed'])));return;}if(path==='/api/gifts/catalog/save'){const input=await body(req,['revision','mutationId','reason','product']);json(200,await supplierCatalog.save(session.header,input));return;}if(path==='/api/gifts/catalog/suggest'){const input=await body(req,['tenantId','campaignId','id','categories','dueDate','packagingCents','transportCents']);json(200,await supplierCatalog.suggest(session.header,input,giftOperations));return;}throw failure(404);}
  if(path.startsWith('/api/gifts/proposals/')&&req.method==='POST'){authorized(req,session);const common=['tenantId','campaignId','teamId','milestoneNumber'];if(path==='/api/gifts/proposals/read'){json(200,await giftOperations.readProposal(session.header,await body(req,common)));return;}if(path==='/api/gifts/proposals/save'){json(200,await giftOperations.saveProposal(session.header,await body(req,[...common,'revision','mutationId','reason','fingerprint','packagingCents','transportCents'])));return;}if(path==='/api/gifts/proposals/review'){json(200,await giftOperations.reviewProposal(session.header,await body(req,[...common,'revision','mutationId','reason'])));return;}throw failure(404);}
  if(path==='/api/gifts/anticipate'&&req.method==='POST'){authorized(req,session);json(200,await giftOperations.anticipate(session.header,await body(req,['tenantId','campaignId','teamId','milestoneNumber','packagingCents','transportCents'])));return;}
  if(path==='/api/gifts/reservations'&&req.method==='GET'){json(200,await giftOperations.reservations(session.header));return;}
  if(path.startsWith('/api/gifts/reservations/')&&req.method==='POST'){authorized(req,session);const common=['tenantId','campaignId','teamId','milestoneNumber','mutationId','reason'];if(path==='/api/gifts/reservations/resolve-cancellation'){json(200,await giftOperations.resolveOrderCancellation(session.header,await body(req,[...common,'revision','reference','outcome','responseAcknowledged'])));return;}if(path==='/api/gifts/reservations/request-cancellation'){json(200,await giftOperations.requestOrderCancellation(session.header,await body(req,[...common,'revision','reference','requestAcknowledged'])));return;}if(path==='/api/gifts/reservations/withdraw-cancellation'){json(200,await giftOperations.withdrawOrderCancellation(session.header,await body(req,[...common,'revision'])));return;}if(path==='/api/gifts/reservations/consume'){json(200,await giftOperations.consumeAnticipatedOrder(session.header,await body(req,[...common,'revision','consumptionAccepted'])));return;}if(path==='/api/gifts/reservations/reserve'){json(200,await giftOperations.reserveProposal(session.header,await body(req,[...common,'proposalRevision','conditions'])));return;}if(path==='/api/gifts/reservations/confirm'){json(200,await giftOperations.confirmAnticipatedOrder(session.header,await body(req,[...common,'revision','reference','confirmationAccepted'])));return;}if(path==='/api/gifts/reservations/authorize'){json(200,await giftOperations.authorizePurchase(session.header,await body(req,[...common,'revision','reference','riskAccepted'])));return;}if(path==='/api/gifts/reservations/revoke'){json(200,await giftOperations.revokePurchaseAuthorization(session.header,await body(req,[...common,'revision'])));return;}if(path==='/api/gifts/reservations/release'){json(200,await giftOperations.releaseReservation(session.header,await body(req,[...common,'revision'])));return;}throw failure(404);}
  if(path==='/api/gifts/ops/attach'&&req.method==='POST'){authorized(req,session);json(200,await giftOperations.attachAnticipatedOrder(session.header,await body(req,['tenantId','campaignId','id','revision','reservationRevision','mutationId','reason','owner','dueDate','compositionAccepted'])));return;}
  if(path==='/api/gifts/forecasts'&&req.method==='GET'){json(200,await giftOperations.forecasts(session.header));return;}
  if(path==='/api/gifts/ops'&&req.method==='GET'){json(200,await giftOperations.list(session.header));return;}
  if(path.startsWith('/api/gifts/ops/')&&req.method==='POST'){
   authorized(req,session);
   if(path==='/api/gifts/ops/detail'){const input=await body(req,['tenantId','campaignId','id']);json(200,await giftOperations.detail(session.header,input,input.id));return;}
   if(path==='/api/gifts/ops/amend'){json(200,await giftOperations.amend(session.header,await body(req,['tenantId','campaignId','id','revision','mutationId','reference','reason','purchaseCents','packagingCents','transportCents'])));return;}
   if(path==='/api/gifts/ops/save'){const input=await body(req,['tenantId','campaignId','id','revision','mutationId','reason','dueDate','owner','composition','supplier','orderReference','deliveryReference','purchaseCents','packagingCents','transportCents','alcoholFreeConfirmed','status'],4096,['catalogSelection']);json(200,await giftOperations.save(session.header,input));return;}
   throw failure(404);
  }
  if(path.startsWith('/api/coordination')){
   if(!session.scope)throw failure(403);
   if(req.method==='GET'&&path==='/api/coordination'){json(200,await coordination.read(session.header,session.scope));return;}
   if(req.method==='POST'&&['/api/coordination/open','/api/coordination/close','/api/coordination/postpone'].includes(path)){
    authorized(req,session);const action=path.split('/').at(-1),input=await body(req,action==='close'?['teamId','weekId','decision']:['teamId','weekId']);
    json(200,await coordination.act(session.header,{...session.scope,teamId:input.teamId},action,input));return;
   }throw failure(404);
  }
  if(path.startsWith('/api/my-week')){
   if(!session.scope)throw failure(403);
   if(req.method==='GET'&&path==='/api/my-week'){json(200,teamView(await questionnaire.read(session.header,session.scope)));return;}
   if(req.method==='POST'){authorized(req,session);
    if(path==='/api/my-week/open'){await body(req,[]);json(200,await questionnaire.open(session.header,session.scope));return;}
    if(path==='/api/my-week/close'){const input=await body(req,['weekId','decision']);json(200,await questionnaire.close(session.header,session.scope,input));return;}
    if(path==='/api/my-week/postpone'){const input=await body(req,['weekId']);json(200,await questionnaire.postpone(session.header,session.scope,input));return;}
    if(path==='/api/my-week/answer'){const input=await body(req,['weekId','answers']);json(200,teamView(await questionnaire.answer(session.header,session.scope,input)));return;}
    if(path==='/api/my-week/absence'){const input=await body(req,['weekId','absent']);json(200,teamView(await questionnaire.absence(session.header,session.scope,input)));return;}
   }throw failure(404);
  }
  if(path==='/api/my-gift-preferences'){
   if(!session.scope)throw failure(403);
   if(req.method==='GET'){json(200,await giftPreferences.read(session.header,session.scope));return;}
   if(req.method==='POST'){authorized(req,session);const input=await body(req,['choices','alcoholFree','surprise','birthday','privateContactRequested','revision']);json(200,await giftPreferences.save(session.header,session.scope,input));return;}
   throw failure(404);
  }
  if(path.startsWith('/api/team-vote')){
   if(!session.scope)throw failure(403);
   if(req.method==='GET'&&path==='/api/team-vote'){json(200,teamView(await teamVote.read(session.header,session.scope)));return;}
   if(req.method==='POST'){authorized(req,session);
    if(path==='/api/team-vote/cast'){const input=await body(req,['name','color']);json(200,teamView(await teamVote.cast(session.header,session.scope,input)));return;}
    if(path==='/api/team-vote/close'){const input=await body(req,['name','color','reason']);json(200,await teamVote.close(session.header,session.scope,input));return;}
   }throw failure(404);
  }
  if(req.method==='POST'){
   if(path==='/api/invitation/session'){await body(req,[]);await adapter.auth.verifyIdToken(session.header.slice(7),true);json(200,{csrf:session.csrf});return;}
   if(path.startsWith('/api/invitation/')){
    authorized(req,session);
    if(path==='/api/invitation/create'){await body(req,[]);if(!session.scope)throw failure(403);const invite=await invitations.issue(session.header,session.scope,invitedProfile.uid);json(200,{id:invite.id,url:'/invitation.html#'+invite.token,expiresAt:invite.expiresAt});return;}
    if(path==='/api/invitation/revoke'){const {id}=await body(req,['id']);if(!session.scope)throw failure(403);json(200,await invitations.revoke(session.header,session.scope,id));return;}
    if(path==='/api/invitation/preview'){const {token}=await body(req,['token']);json(200,await invitations.preview(session.header,token));return;}
    if(path==='/api/invitation/accept'){const {token,displayName,preferences}=await body(req,['token','displayName'],4096,['preferences']);const result=await invitations.accept(session.header,token,displayName,preferences);session.scope=result.scope;json(200,{accepted:true,alreadyAccepted:result.alreadyAccepted});return;}
    throw failure(404);
   }
   if(path==='/api/demo/session'&&session.workspaceSpace){await body(req,[]);json(200,{csrf:session.csrf,authenticated:true,canSimulate:false,workspace:session.workspaceSpace,workspaceEnabled:session.workspaceEnabled===true&&session.workspaceSpace!=='kiosk'});return;}
   if(!session.scope&&path!=='/api/auth/logout')throw failure(403);
   if(path==='/api/demo/session'){await body(req,[]);if(session.organizerOnly){json(200,{csrf:session.csrf,authenticated:true,canSimulate:false,workspace:'organizer',workspaceEnabled:session.workspaceEnabled===true});return;}if(session.directorOnly){await directorProgress.read(session.header,session.scope);json(200,{csrf:session.csrf,authenticated:true,canSimulate:false,workspace:'director',workspaceEnabled:session.workspaceEnabled===true});return;}await adapter.read(session.header,session.scope);const campaign=await adapter.db.doc(`tenants/${session.scope.tenantId}/campaigns/${session.scope.campaignId}`).get();json(200,{csrf:session.csrf,authenticated:true,canSimulate:campaign.data()?.collectionMode!=='weekly-questionnaire'});return;}
   authorized(req,session);
   if(path==='/api/auth/logout'){await body(req,[]);sessions.delete(token);json(200,{disconnected:true},{'Set-Cookie':cookie('',req,0)});return;}
   if(path==='/api/demo/advance'){
    const input=await body(req,['revision']);if(!Number.isSafeInteger(input.revision)||input.revision<0)throw failure(400);
    json(200,await adapter.simulate(session.header,session.scope,input.revision));return;
   }
   if(path==='/api/demo/claim'){
    const {eventIds}=await body(req,['eventIds']);if(!Array.isArray(eventIds)||eventIds.length>100||eventIds.some(id=>typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)))throw failure(400);
    json(200,await adapter.claim(session.header,session.scope,eventIds));return;
   }
  }
  if(!session.scope)throw failure(403);
  if(req.method==='GET'&&path==='/api/demo/team'){json(200,await adapter.read(session.header,session.scope));return;}
  if(req.method==='GET'&&path==='/api/demo/collective'){json(200,await adapter.collective(session.header,session.scope));return;}
  throw failure(404);
 }
 return {handler,close:()=>{sessions.clear();return adapter.close();}};
}
