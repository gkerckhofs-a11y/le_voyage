import {randomBytes} from 'node:crypto';
import {createFirebaseEmulatorAdapter,assertEmulators} from './firebase-emulator.mjs';
import {createWeeklyQuestionnaire} from './weekly-questionnaire.mjs';
import {createGiftPreferences} from './gift-preferences.mjs';
import {createTeamVote} from './team-vote.mjs';
import {createInvitations} from './invitations.mjs';
import {newDemo} from './demo-service.mjs';
import {body,authorized} from './http.mjs';
const profiles={lex:{uid:'demo-lex-user',tenantId:'fiction-lex-ekho',email:'lex@example.test'},atelier:{uid:'demo-atelier-user',tenantId:'fiction-atelier',email:'atelier@example.test'}};
const invitedProfile={uid:'demo-invited-user',email:'camille@example.test'};
profiles.clem={uid:'demo-rc-admin',tenantId:'fiction-lex-ekho',email:'clem@example.test'};
const password='Fictitious-Emulator-Only-42!';
const failure=status=>Object.assign(new Error('Request refused'),{status});
export async function createFirebaseHttp(){
 assertEmulators();const adapter=createFirebaseEmulatorAdapter(),sessions=new Map(),invitations=createInvitations(adapter),teamVote=createTeamVote(adapter),giftPreferences=createGiftPreferences(adapter),questionnaire=createWeeklyQuestionnaire(adapter);
 try{
  for(const profile of Object.values(profiles)){
   try{await adapter.auth.getUser(profile.uid);}catch(e){if(e.code!=='auth/user-not-found')throw e;await adapter.auth.createUser({uid:profile.uid,email:profile.email,password});}
   const record=newDemo();record.ledger.state.config.tenantId=profile.tenantId;
   profile.scope={tenantId:profile.tenantId,campaignId:record.ledger.state.config.campaignId,teamId:'explorateurs'};
   const campaign=adapter.db.doc(`tenants/${profile.tenantId}/campaigns/${profile.scope.campaignId}`),member=adapter.db.doc(`tenants/${profile.tenantId}/members/${profile.uid}`);
   await adapter.db.runTransaction(async tx=>{const c=await tx.get(campaign),m=await tx.get(member);if(!c.exists)tx.set(campaign,{payload:JSON.stringify(record)});if(!m.exists)tx.set(member,{uid:profile.uid,tenantId:profile.tenantId,active:true,...(profile.uid==='demo-rc-admin'?{canInvite:true,canManageTeam:true}:{}),assignments:[{campaignId:profile.scope.campaignId,teamId:profile.scope.teamId}]});});
  }
  try{await adapter.auth.getUser(invitedProfile.uid);}catch(e){if(e.code!=='auth/user-not-found')throw e;await adapter.auth.createUser({...invitedProfile,password});}
 }catch(e){await adapter.close();throw e;}
 const cookie=(value,req,age=3300)=>`rc_auth=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${req.headers.origin?.startsWith('https:')?'; Secure':''}`;
 async function handler(req,json,path){
  const now=Date.now();for(const [key,s] of sessions)if(s.expires<=now)sessions.delete(key);
  const token=req.headers.cookie?.match(/(?:^|;\s*)rc_auth=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(path==='/api/auth/login'&&req.method==='POST'){
   const {profile:id}=await body(req,['profile']);if(id!=='camille'&&!Object.hasOwn(profiles,id))throw failure(400);
   const profile=id==='camille'?invitedProfile:profiles[id];
   const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:profile.email,password,returnSecureToken:true})});
   if(!response.ok)throw failure(401);const result=await response.json(),header='Bearer '+result.idToken;
   let scope=profile.scope??null;
   if(id==='camille'){const m=(await adapter.db.doc(`tenants/fiction-lex-ekho/members/${profile.uid}`).get()).data();if(m?.active&&m.assignments?.length)scope={tenantId:'fiction-lex-ekho',...m.assignments[0]};}
   if(scope)await adapter.read(header,scope);
   const next=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
   if(token)sessions.delete(token);sessions.set(next,{header,scope,csrf,expires:now+3300000});
   json(200,{connected:true,...(id==='clem'?{destination:'/invitations.html'}:{})},{'Set-Cookie':cookie(next,req)});return;
  }
  const session=sessions.get(token);if(!session)throw failure(401);
  if(path.startsWith('/api/my-week')){
   if(!session.scope)throw failure(403);
   if(req.method==='GET'&&path==='/api/my-week'){json(200,await questionnaire.read(session.header,session.scope));return;}
   if(req.method==='POST'){authorized(req,session);
    if(path==='/api/my-week/open'){await body(req,[]);json(200,await questionnaire.open(session.header,session.scope));return;}
    if(path==='/api/my-week/answer'){const input=await body(req,['weekId','answers']);json(200,await questionnaire.answer(session.header,session.scope,input));return;}
    if(path==='/api/my-week/absence'){const input=await body(req,['weekId','absent']);json(200,await questionnaire.absence(session.header,session.scope,input));return;}
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
   if(req.method==='GET'&&path==='/api/team-vote'){json(200,await teamVote.read(session.header,session.scope));return;}
   if(req.method==='POST'){authorized(req,session);
    if(path==='/api/team-vote/cast'){const input=await body(req,['name','color']);json(200,await teamVote.cast(session.header,session.scope,input));return;}
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
    if(path==='/api/invitation/accept'){const {token,displayName}=await body(req,['token','displayName']);const result=await invitations.accept(session.header,token,displayName);session.scope=result.scope;json(200,{accepted:true,alreadyAccepted:result.alreadyAccepted});return;}
    throw failure(404);
   }
   if(!session.scope&&path!=='/api/auth/logout')throw failure(403);
   if(path==='/api/demo/session'){await body(req,[]);await adapter.read(session.header,session.scope);const campaign=await adapter.db.doc(`tenants/${session.scope.tenantId}/campaigns/${session.scope.campaignId}`).get();json(200,{csrf:session.csrf,authenticated:true,canSimulate:campaign.data()?.collectionMode!=='weekly-questionnaire'});return;}
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
