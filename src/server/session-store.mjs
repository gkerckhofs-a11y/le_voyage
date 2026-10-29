import {createHash,createCipheriv,createDecipheriv,randomBytes,randomUUID} from 'node:crypto';
import {assertTestAdapter} from './test-environment.mjs';
const validToken=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
const conflict=()=>Object.assign(Error('Session changed'),{status:409});
// This key is intentionally public and permitted only with the verified local emulator adapter.
const emulatorKey='b6'.repeat(32);
export function createSessionStore(adapter,{key=process.env.RC_SESSION_ENCRYPTION_KEY,now=Date.now}={}){
 assertTestAdapter(adapter);
 if(!key&&adapter.db.projectId==='demo-rc-voyage')key=emulatorKey;
 if(typeof key!=='string'||!/^[a-f0-9]{64}$/i.test(key))throw Error('A 256-bit session encryption key is required');
 const secret=Buffer.from(key,'hex'),db=adapter.db;
 const ref=t=>{if(!validToken(t))throw Error('Invalid session token');return db.collection('serverSessions').doc(createHash('sha256').update(t).digest('hex'));};
 function encode(token,session){
  const {_version,...value}=session;if(!Number.isSafeInteger(value.expires)||value.expires<=now()||value.expires>now()+3300000)throw Error('Invalid session lifetime');
  const plain=Buffer.from(JSON.stringify(value));if(plain.length>20000)throw Error('Session too large');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret,iv);cipher.setAAD(Buffer.from(ref(token).id));
  const encrypted=Buffer.concat([cipher.update(plain),cipher.final()]);return {version:randomUUID(),expires:value.expires,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),encrypted:encrypted.toString('base64')};
 }
 function decode(token,data){
  if(!data||!Number.isSafeInteger(data.expires)||data.expires<=now()||typeof data.version!=='string')return null;
  try{const decipher=createDecipheriv('aes-256-gcm',secret,Buffer.from(data.iv,'base64'));decipher.setAAD(Buffer.from(ref(token).id));decipher.setAuthTag(Buffer.from(data.tag,'base64'));const value=JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.encrypted,'base64')),decipher.final()]).toString('utf8'));if(value.expires!==data.expires)return null;return {...value,_version:data.version};}catch{return null;}
 }
 return {
  async get(token){if(!validToken(token))return null;return decode(token,(await ref(token).get()).data());},
  async issue(previous,next,session){const record=encode(next,session);await db.runTransaction(async tx=>{if(validToken(previous))tx.delete(ref(previous));tx.create(ref(next),record);});},
  async rotate(previous,next,session){const record=encode(next,session);await db.runTransaction(async tx=>{const old=decode(previous,(await tx.get(ref(previous))).data());if(!old||old._version!==session._version||old.expires!==session.expires)throw conflict();tx.delete(ref(previous));tx.create(ref(next),record);});},
  async revoke(token,version){await db.runTransaction(async tx=>{const old=decode(token,(await tx.get(ref(token))).data());if(!old||old._version!==version)throw conflict();tx.delete(ref(token));});},
 };
}
