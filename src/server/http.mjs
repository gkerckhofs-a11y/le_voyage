import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { FileSessionStore } from './file-store.mjs';
import { newDemo, readTeam, readCollective, advance, claim } from './demo-service.mjs';

const failure=(status)=>Object.assign(new Error('Demo request refused'),{status});
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'"};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
const sessionToken=req=>req.headers.cookie?.match(/(?:^|;\s*)rc_demo=([a-f0-9]{64})(?:;|$)/)?.[1];
function checkOrigin(req){
  const host=req.headers.host;
  if(!host||!['localhost','127.0.0.1','[::1]','terminal.local'].includes(new URL('http://'+host).hostname))throw failure(403);
  if(!req.headers.origin||!['http://'+host,'https://'+host].includes(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site')throw failure(403);
}
export async function body(req,keys){
  if(req.headers['content-type']!=='application/json')throw failure(415);
  let size=0,text='';for await(const chunk of req){size+=chunk.length;if(size<=4096)text+=chunk;}
  if(size>4096)throw failure(413);
  let data;try{data=JSON.parse(text);}catch{throw failure(400);}
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!keys.includes(k))||keys.some(k=>!(k in data)))throw failure(400);
  return data;
}
export function authorized(req,record){
  if(!record)throw failure(401);
  const csrf=req.headers['x-demo-csrf'];
  if(typeof csrf!=='string'||!/^[a-f0-9]{64}$/.test(csrf)||!timingSafeEqual(Buffer.from(csrf),Buffer.from(record.csrf)))throw failure(403);
}
export function createDemoServer({root,directory,apiHandler}){
  if(process.env.NODE_ENV==='production')throw new Error('Local demo server must not run in production');
  root=resolve(root);directory=resolve(directory);
  if(directory===root||directory.startsWith(root+sep))throw new Error('Private store must be outside public output');
  const store=new FileSessionStore(directory);
  const server=createServer(async(req,res)=>{
    const json=(status,value,extra={})=>{res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8',Vary:'Cookie',...extra});res.end(JSON.stringify(value));};
    try{
      const url=new URL(req.url,'http://localhost'),path=url.pathname;
      if(path.startsWith('/api/')){
        if(url.search)throw failure(400);
        if(req.method==='POST')checkOrigin(req);
        if(apiHandler){await apiHandler(req,json,path);return;}
        if(path==='/api/demo/session'&&req.method==='POST'){
          await body(req,[]);let token=sessionToken(req),record=token?await store.read(token):null;
          if(!record){record=newDemo();token=await store.create(record);}
          const secure=req.headers.origin?.startsWith('https:')?'; Secure':'';
          json(200,{csrf:record.csrf},{'Set-Cookie':`rc_demo=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${secure}`});return;
        }
        const token=sessionToken(req);if(!token)throw failure(401);
        if(req.method==='GET'&&['/api/demo/team','/api/demo/collective'].includes(path)){
          const record=await store.read(token);if(!record)throw failure(401);
          json(200,path.endsWith('/team')?readTeam(record):readCollective(record));return;
        }
        if(req.method==='POST'&&path==='/api/demo/advance'){
          const input=await body(req,['revision']);
          if(!Number.isSafeInteger(input.revision)||input.revision<0)throw failure(400);
          const result=await store.transact(token,record=>{
            authorized(req,record);if(input.revision>record.ledger.revision)throw failure(409);
            const next=advance(record,input.revision);return {record:next.record,value:{applied:next.applied,feed:readTeam(next.record)}};
          });json(200,result);return;
        }
        if(req.method==='POST'&&path==='/api/demo/claim'){
          const input=await body(req,['eventIds']);
          if(!Array.isArray(input.eventIds)||input.eventIds.length>100||input.eventIds.some(id=>typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)))throw failure(400);
          const result=await store.transact(token,record=>{
            authorized(req,record);let next;try{next=claim(record,input.eventIds);}catch{throw failure(404);}
            return {record:next.record,value:{events:next.events,feed:readTeam(next.record)}};
          });json(200,result);return;
        }
        throw failure(404);
      }
      if(!['GET','HEAD'].includes(req.method))throw failure(405);
      const decoded=decodeURIComponent(path),file=resolve(root,'.'+(decoded==='/'?'/index.html':decoded));
      if(!file.startsWith(root+sep))throw failure(403);
      let content;try{content=await readFile(file);}catch(e){if(e.code==='ENOENT'||e.code==='EISDIR')throw failure(404);throw e;}
      res.writeHead(200,{...headers,'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:content);
    }catch(error){if(!res.headersSent)json(error.status??500,{error:error.status===401?'Session de démonstration à rouvrir.':'La demande ne peut pas être traitée.'});else res.end();}
  });
  server.requestTimeout=15000;return server;
}
