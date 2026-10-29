import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {body} from './http.mjs';
const fail=status=>Object.assign(new Error('Test access refused'),{status});
const opaque=()=>randomBytes(32).toString('hex');
const cookie=(value,age)=>`__session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const context=Symbol('test-access');
export async function createGoogleTestGate({auth,config,now=Date.now,identityLogin,identityLogout,sessionStore}){
 const provisioned=config.authenticationMode==='provisioned';
 if(provisioned&&(typeof identityLogin!=='function'||typeof identityLogout!=='function'||!sessionStore||!['get','issue','update','revoke'].every(k=>typeof sessionStore[k]==='function')))throw Error('Explicit identity session bridge required');
 const canonical=`https://${config.projectId}.web.app`,allowed=new Set(config.testerEmails),sessions=new Map(),ttl=provisioned?3300000:8*60*60*1000;
 const get=async token=>{const s=sessionStore?await sessionStore.get(token):sessions.get(token);return sessionStore&&s&&!['google-gate','google-gate-pending'].includes(s.kind)?null:s;};
 const remove=async(token,s)=>{if(sessionStore){if(s)await sessionStore.revoke(token,s._version);}else sessions.delete(token);};
 const put=async(previous,next,value,s)=>{if(sessionStore)await sessionStore.issue(previous,next,value,s?{expectedVersion:s._version}:{});else{sessions.delete(previous);sessions.set(next,value);}};
 const assets=new Map(await Promise.all(['html','js','css'].map(async ext=>['/test-access'+(ext==='html'?'':'.'+ext),{type:ext==='html'?'text/html':ext==='js'?'text/javascript':'text/css',data:await readFile(new URL(`./test-access/access.${ext}`,import.meta.url))}])));
 if(provisioned){const page=assets.get('/test-access');page.data=Buffer.from(page.data.toString().replace('découvrir la démonstration.','ouvrir vos espaces autorisés.').replace('Les entreprises, les équipes et les cadeaux présentés sont fictifs.','Votre compte doit être autorisé pour le test et affecté à un espace du Voyage.'));}
 const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',Vary:'Cookie','Content-Security-Policy':`default-src 'self'; script-src 'self' https://www.gstatic.com https://apis.google.com; style-src 'self'; img-src 'self' data: https://www.gstatic.com; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com; frame-src ${canonical} https://${config.projectId}.firebaseapp.com https://accounts.google.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`};
 const allowedClaims=c=>c?.firebase?.sign_in_provider==='google.com'&&c.email_verified===true&&typeof c.email==='string'&&allowed.has(c.email.toLowerCase());
 const tokenOf=req=>req.headers.cookie?.match(/(?:^|;\s*)__session=([a-f0-9]{64})(?:;|$)/)?.[1];
 async function fresh(){for(const [key,s] of sessions)if(s.expires<=now())sessions.delete(key);if(!sessionStore&&sessions.size>=1000)throw fail(503);const token=opaque(),s={kind:'google-gate-pending',csrf:opaque(),expires:now()+600000};await put(null,token,s);return {token,s:await get(token)};}
 function sameOrigin(req){if(req.headers.origin!==canonical||req.headers['sec-fetch-site']==='cross-site')throw fail(403);}
 return {
 async gate(req,res){
  const send=(status,value,extra={})=>{res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8',...extra});res.end(JSON.stringify(value));};
  try{
   const url=new URL(req.url,canonical),path=url.pathname;for(const [key,s] of sessions)if(s.expires<=now())sessions.delete(key);
   if(!config.origins.some(o=>new URL(o).host===req.headers.host))throw fail(403);
   const token=tokenOf(req),s=await get(token);
   if(assets.has(path)&&['GET','HEAD'].includes(req.method)){
    const asset=assets.get(path);res.writeHead(200,{...headers,'Content-Type':asset.type+'; charset=utf-8'});res.end(req.method==='HEAD'?undefined:asset.data);return false;
   }
   if(path==='/test-access/config'&&req.method==='GET'&&!url.search){
    const pending=s&&!s.credential?{token,s}:await fresh();send(200,{canonical,apiKey:config.apiKey,authDomain:new URL(canonical).host,projectId:config.projectId,csrf:pending.s.csrf},{'Set-Cookie':cookie(pending.token,600)});return false;
   }
   if(path==='/test-access/session'&&req.method==='POST'&&!url.search){
    sameOrigin(req);if(!s||s.credential||!equal(req.headers['x-test-csrf'],s.csrf))throw fail(403);
    const {idToken}=await body(req,['idToken']);if(typeof idToken!=='string'||idToken.length>3800)throw fail(400);
    let claims;try{claims=await auth.verifyIdToken(idToken,true);}catch{throw fail(401);}
    if(!allowedClaims(claims))throw fail(403);
    if(!Number.isFinite(claims.auth_time)||claims.auth_time*1000>now()+60000||now()-claims.auth_time*1000>300000)throw fail(401);
    const identity=provisioned?await identityLogin(idToken):null;
    if(provisioned&&(!identity||!/^[a-f0-9]{64}$/.test(identity.token)||!Number.isSafeInteger(identity.expires)||identity.expires<=now()||identity.expires>now()+ttl))throw fail(503);
    const credential=await auth.createSessionCookie(idToken,{expiresIn:ttl}),expires=identity?.expires??now()+ttl,next=opaque();try{await put(token,next,{kind:'google-gate',credential,uid:claims.uid,expires,demoToken:identity?.token??null},s);}catch(error){if(provisioned)await identityLogout(identity.token).catch(()=>{});throw error;}send(200,{connected:true,destination:provisioned?'/espaces.html':'/connexion.html'},{'Set-Cookie':cookie(next,Math.max(0,Math.floor((expires-now())/1000)))});return false;
   }
   if(path==='/test-access/logout'&&req.method==='POST'&&!url.search){sameOrigin(req);if(provisioned&&s?.demoToken)await identityLogout(s.demoToken);await remove(token,s);send(200,{disconnected:true},{'Set-Cookie':cookie('',0)});return false;}
   if(path.startsWith('/test-access'))throw fail(404);
   if(!s?.credential){if(req.method==='GET'&&!path.startsWith('/api/')){res.writeHead(303,{...headers,Location:canonical+'/test-access'});res.end();return false;}throw fail(401);}
   try{const claims=await auth.verifySessionCookie(s.credential,true);if(!allowedClaims(claims)||(provisioned&&claims.uid!==s.uid))throw fail(403);}catch{await remove(token,s);throw fail(401);}
   if(provisioned&&path==='/connexion.html'&&req.method==='GET'){res.writeHead(303,{...headers,Location:canonical+'/espaces.html'});res.end();return false;}
   req[context]={token,s};res.setHeader('X-Robots-Tag','noindex, nofollow');return true;
  }catch(e){send(e.status??503,{error:e.status===403?'Ce compte ou cette demande ne permet pas d’accéder au test.':'Connexion au serveur de test nécessaire ou momentanément indisponible.'});return false;}
 },
 apiHandler(handler){return async(req,json,path)=>{
  const entry=req[context];if(!entry)throw fail(401);
  if(provisioned&&['/api/auth/login','/api/auth/password','/api/auth/identity'].includes(path))throw fail(403);
  // Hosting forwards only __session. Keep the real Google gate cookie in the browser;
  // the fictitious profile token stays server-side and cannot unlock the gate by itself.
  req.headers.cookie=entry.s.demoToken?`__session=${entry.s.demoToken}`:'';
  let response;
  await handler(req,(status,value,extra={})=>{if(response)throw fail(500);response={status,value,extra};},path);
  if(!response)throw fail(500);
  const {status,value,extra}=response,outgoing={...extra},set=outgoing['Set-Cookie'];
  if(path==='/api/auth/logout'&&[200,401].includes(status)){await remove(entry.token,entry.s);outgoing['Set-Cookie']=cookie('',0);}
  else if(set){
   const next=set.match(/^__session=([a-f0-9]{64})?;/);if(!next)throw fail(500);
   if(sessionStore)await sessionStore.update(entry.token,{...entry.s,demoToken:next[1]??null});else entry.s.demoToken=next[1]??null;
   delete outgoing['Set-Cookie'];
  }
  json(status,value,outgoing);
 };}
 };
}
