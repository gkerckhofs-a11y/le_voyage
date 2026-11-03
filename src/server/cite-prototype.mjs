import {createServer} from 'node:http';import {randomBytes} from 'node:crypto';import {readFile} from 'node:fs/promises';
import {createPilot,pilotAction,pilotView,pilotRoles,runPilot} from '../cite/pilot.ts';
const token=()=>randomBytes(32).toString('hex'),fail=status=>Object.assign(Error('Prototype request refused'),{status});
const files=new Map([['/',new URL('../../prototypes/la-cite/index.html',import.meta.url)],['/app.js',new URL('../../prototypes/la-cite/app.js',import.meta.url)],['/style.css',new URL('../../prototypes/la-cite/style.css',import.meta.url)],['/brand.png',new URL('../../web/assets/brand/rouge-clemence.png',import.meta.url)]]);
/** Local, synthetic role-play only: deliberately refuses production/Cloud Run execution. */
export function createCitePrototypeServer(){
 if(process.env.NODE_ENV==='production'||process.env.K_SERVICE||process.env.RC_STAGE)throw Error('Local fictional prototype only');
 let pilot=createPilot(),revision=0;const sessions=new Map();
 const server=createServer(async(req,res)=>{
  const host='127.0.0.1:'+server.address().port;
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
  const json=(status,value,extra={})=>{res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8',...extra});res.end(JSON.stringify(value));};
  try{
   if(req.headers.host!==host||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))throw fail(403);
   const url=new URL(req.url,'http://'+host);if(url.search)throw fail(404);
   if(req.method==='GET'&&url.pathname==='/favicon.ico'){res.writeHead(204,headers);res.end();return;}
   if(req.method==='GET'&&files.has(url.pathname)){const path=files.get(url.pathname),data=await readFile(path);res.writeHead(200,{...headers,'Content-Type':url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.png')?'image/png':'text/html; charset=utf-8'});res.end(data);return;}
   const cookie=req.headers.cookie?.match(/(?:^|;\s*)cite_demo=([a-f0-9]{64})(?:;|$)/)?.[1];let session=sessions.get(cookie),setCookie={};
   if(!session){if(req.method!=='GET'||url.pathname!=='/api/state')throw fail(401);if(sessions.size>=32)throw fail(503);const id=token();session={csrf:token(),role:'operator'};sessions.set(id,session);setCookie={'Set-Cookie':`cite_demo=${id}; Path=/; HttpOnly; SameSite=Strict`};}
   const view=()=>({...pilotView(pilot,session.role),revision,csrf:session.csrf});
   if(req.method==='GET'&&url.pathname==='/api/state'){json(200,view(),setCookie);return;}
   if(req.method!=='POST'||!['/api/role','/api/action'].includes(url.pathname))throw fail(404);
   if(req.headers.origin!=='http://'+host||req.headers['x-prototype-csrf']!==session.csrf)throw fail(403);
   if(!req.headers['content-type']?.startsWith('application/json'))throw fail(400);
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>8192)throw fail(413);chunks.push(chunk);}let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail(400);}if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400);
   if(url.pathname==='/api/role'){if(Object.keys(input).join(',')!=='role'||!pilotRoles(pilot).some(r=>r.id===input.role))throw fail(400);session.role=input.role;session.csrf=token();json(200,view());return;}
   const keys={vote:['type','choice','round','revision'],pledge:['type','amount','pledgeRevision','mutationId','revision']};const allowed=keys[input.type]??(['advance-week','close-vote','close-funding','automatic','reset'].includes(input.type)?['type','revision']:input.type==='reward-mode'?['type','mode','revision']:[]);
   if(!allowed.length||Object.keys(input).sort().join(',')!==allowed.sort().join(','))throw fail(400);
   if((['reward-mode','reset','automatic','advance-week','close-vote','close-funding'].includes(input.type)&&session.role!=='operator')||(['vote','pledge'].includes(input.type)&&session.role==='operator')||(input.type==='pledge'&&!session.role.endsWith('-0')))throw fail(403);
   if(!Number.isSafeInteger(input.revision)||input.revision!==revision)throw fail(409);
   if(input.type==='reward-mode'){if(pilot.completedWeeks!==0||pilot.stage!=='weeks')throw fail(409);pilot=createPilot(input.mode);}
   else if(['reset','automatic'].includes(input.type)){if(session.role!=='operator')throw fail(403);if(input.type==='automatic'&&(pilot.completedWeeks!==0||pilot.stage!=='weeks'))throw fail(409);pilot=input.type==='automatic'?runPilot(pilot.rewardMode):createPilot(pilot.rewardMode);}
   else{const {revision:_revision,pledgeRevision,...action}=input;pilot=pilotAction(pilot,session.role,input.type==='pledge'?{type:'pledge',amount:input.amount,revision:pledgeRevision,mutationId:input.mutationId}:action);}
   revision++;json(200,view());
  }catch(error){json([400,401,403,404,409,413,503].includes(error.status)?error.status:400,{error:error.status===409?'État modifié ou action indisponible. Actualisez puis réessayez.':'Action refusée pour ce rôle ou ces données.'});}
 });return server;
}
