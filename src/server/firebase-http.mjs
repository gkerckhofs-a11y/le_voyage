import {randomBytes} from 'node:crypto';
import {createFirebaseEmulatorAdapter,assertEmulators} from './firebase-emulator.mjs';
import {newDemo} from './demo-service.mjs';
import {body,authorized} from './http.mjs';
const profiles={lex:{uid:'demo-lex-user',tenantId:'fiction-lex-ekho',email:'lex@example.test'},atelier:{uid:'demo-atelier-user',tenantId:'fiction-atelier',email:'atelier@example.test'}};
const password='Fictitious-Emulator-Only-42!';
const failure=status=>Object.assign(new Error('Request refused'),{status});
export async function createFirebaseHttp(){
 assertEmulators();const adapter=createFirebaseEmulatorAdapter(),sessions=new Map();
 try{
  for(const profile of Object.values(profiles)){
   try{await adapter.auth.getUser(profile.uid);}catch(e){if(e.code!=='auth/user-not-found')throw e;await adapter.auth.createUser({uid:profile.uid,email:profile.email,password});}
   const record=newDemo();record.ledger.state.config.tenantId=profile.tenantId;
   profile.scope={tenantId:profile.tenantId,campaignId:record.ledger.state.config.campaignId,teamId:'explorateurs'};
   const campaign=adapter.db.doc(`tenants/${profile.tenantId}/campaigns/${profile.scope.campaignId}`),member=adapter.db.doc(`tenants/${profile.tenantId}/members/${profile.uid}`);
   await adapter.db.runTransaction(async tx=>{const c=await tx.get(campaign),m=await tx.get(member);if(!c.exists)tx.set(campaign,{payload:JSON.stringify(record)});if(!m.exists)tx.set(member,{uid:profile.uid,tenantId:profile.tenantId,active:true,assignments:[{campaignId:profile.scope.campaignId,teamId:profile.scope.teamId}]});});
  }
 }catch(e){await adapter.close();throw e;}
 const cookie=(value,req,age=3300)=>`rc_auth=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${req.headers.origin?.startsWith('https:')?'; Secure':''}`;
 async function handler(req,json,path){
  const now=Date.now();for(const [key,s] of sessions)if(s.expires<=now)sessions.delete(key);
  const token=req.headers.cookie?.match(/(?:^|;\s*)rc_auth=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(path==='/api/auth/login'&&req.method==='POST'){
   const {profile:id}=await body(req,['profile']);if(!Object.hasOwn(profiles,id))throw failure(400);
   const profile=profiles[id];
   const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:profile.email,password,returnSecureToken:true})});
   if(!response.ok)throw failure(401);const result=await response.json(),header='Bearer '+result.idToken;
   await adapter.read(header,profile.scope);
   const next=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
   if(token)sessions.delete(token);sessions.set(next,{header,scope:{...profile.scope},csrf,expires:now+3300000});
   json(200,{connected:true},{'Set-Cookie':cookie(next,req)});return;
  }
  const session=sessions.get(token);if(!session)throw failure(401);
  if(req.method==='POST'){
   if(path==='/api/demo/session'){await body(req,[]);await adapter.read(session.header,session.scope);json(200,{csrf:session.csrf,authenticated:true});return;}
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
  if(req.method==='GET'&&path==='/api/demo/team'){json(200,await adapter.read(session.header,session.scope));return;}
  if(req.method==='GET'&&path==='/api/demo/collective'){json(200,await adapter.collective(session.header,session.scope));return;}
  throw failure(404);
 }
 return {handler,close:()=>{sessions.clear();return adapter.close();}};
}
